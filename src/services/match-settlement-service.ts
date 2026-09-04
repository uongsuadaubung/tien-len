import { GameEngine } from '../engine/game';
import { CampaignChapter, CAMPAIGN_CHAPTERS } from '../engine/campaign';
import { resolveStrategyForMatch } from '../engine/strategies/game-mode-strategy';
import { type MatchCompletedEvent, GameEventBus } from '../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../engine/evaluators/progress-evaluators';
import { Quest, Achievement } from '../engine/quests';
import { PlayerProfile, getActiveMatchSession, clearActiveMatchSession, savePlayerProfile } from '../engine/storage';
import { MatchLogger } from '../engine/match-logger';
import { useGameStore, CampaignResultMeta } from '../stores/useGameStore';
import { useUserStore } from '../stores/useUserStore';
import { useViewStore } from '../stores/useViewStore';
import { useEcosystemStore } from '../stores/useEcosystemStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { forceUploadToCloud } from '../engine/sync/sync-service';
import { CustomBotConfigTuple } from '../engine/types';
import { assertEconomicBalance } from '../engine/invariants/match-invariants';
import type { BotConfig } from '../ai/types';

export type { CampaignResultMeta };

function triggerQuestToastIfNewlyCompleted(
  oldQuests: Quest[],
  newQuests: Quest[],
  oldAchs: Achievement[],
  newAchs: Achievement[]
) {
  const newlyCompletedQuest = newQuests.find((q, idx) => q.isCompleted && !oldQuests[idx]?.isCompleted);
  const newlyCompletedAch = newAchs.find((a, idx) => a.isCompleted && !oldAchs[idx]?.isCompleted);
  const completedItem = newlyCompletedQuest || newlyCompletedAch;
  if (completedItem) {
    useGameStore.getState().setQuestToast({
      title: completedItem.title,
      rewardCoins: completedItem.rewardCoins,
      icon: completedItem.icon
    });
    setTimeout(() => {
      useGameStore.getState().setQuestToast(null);
    }, 3500);
  }
}

/**
 * Service kết toán trận đấu trực tiếp (Direct Domain Service)
 * Hoàn toàn không qua Event Bus hay React Hook lifecycle
 */
export function settleCompletedMatch(engine: GameEngine): void {
  const gameStore = useGameStore.getState();
  const userStore = useUserStore.getState();
  const viewStore = useViewStore.getState();

  gameStore.setIsGameOver(true);

  const resolvedInstantWinType = engine.instantWinner?.instantWinType || null;
  gameStore.setInstantWinType(resolvedInstantWinType || undefined);

  const winner = engine.winners[0];
  if (!winner) {
    throw new Error('[MatchSettlementService] Không thể kết toán khi engine.winners rỗng!');
  }
  const isPlayerWin = winner.id === 'p0';

  const currentProfile = userStore.profile;
  const currentCoins = currentProfile.coins;
  const isBankLoanActive = currentProfile.loans > 0;
  const currentElo = currentProfile.elo;
  const activeGameType = gameStore.activeGameType;
  const currentCampaignChapter = gameStore.currentCampaignChapter;
  const effectiveMode = engine.settings.mode;
  const strategy = resolveStrategyForMatch(activeGameType, effectiveMode);

  const settlement = strategy.settleMatch({
    players: engine.players,
    winners: engine.winners,
    betAmount: engine.settings.betAmount,
    playerElo: currentElo,
    isBankLoanActive,
    campaignReward: currentCampaignChapter?.rewardCoins || null,
    penaltyMultiplier: engine.rules.chopping.multiplier || engine.rules.cong.multiplier || 1,
    isThreeSpadesWin: engine.isThreeSpadesWin
  });

  // Chốt chặn bất biến kinh tế: Tổng tiền thắng + thua = 0
  assertEconomicBalance(settlement.payouts);

  gameStore.setIsThreeSpadesWin(engine.isThreeSpadesWin);
  gameStore.setMatchPayouts(settlement.payouts);
  gameStore.setLoanDeductionAmount(settlement.loanDeduction);
  gameStore.setLastEloDelta(settlement.eloDelta);

  const session = getActiveMatchSession();
  const heldDeposit = session ? session.depositAmount : 0;
  clearActiveMatchSession();

  const humanNetEarned = settlement.payouts['p0'] || 0;
  const nextCoins = Math.max(0, currentCoins + heldDeposit + humanNetEarned);
  const nextLoans = Math.max(0, currentProfile.loans - settlement.loanDeduction);
  const nextElo = settlement.isVictoryModalRanked
    ? Math.max(0, currentElo + settlement.eloDelta)
    : currentElo;

  const nextWins = isPlayerWin ? currentProfile.stats.wins + 1 : currentProfile.stats.wins;
  const nextCurrentStreak = isPlayerWin ? currentProfile.stats.currentStreak + 1 : 0;
  const nextHighestStreak = Math.max(currentProfile.stats.highestStreak, nextCurrentStreak);
  const nextTotalEarned = humanNetEarned > 0 ? currentProfile.stats.totalEarned + humanNetEarned : currentProfile.stats.totalEarned;

  let updatedUnlockedChapter = currentProfile.campaignUnlockedChapter;
  const updatedChapterWins = { ...currentProfile.campaignChapterWins };
  let unlockedNext = false;
  let allCompleted = false;
  let nextChapObj: CampaignChapter | null = null;
  let currentWinsInChapter = 0;

  if (activeGameType === 'CAMPAIGN' && currentCampaignChapter) {
    const chapNumber = currentCampaignChapter.id;
    const prevWins = currentProfile.campaignChapterWins[chapNumber] || 0;
    currentWinsInChapter = isPlayerWin ? prevWins + 1 : prevWins;
    updatedChapterWins[chapNumber] = currentWinsInChapter;

    if (currentWinsInChapter >= currentCampaignChapter.requiredWins) {
      if (chapNumber >= currentProfile.campaignUnlockedChapter && chapNumber < CAMPAIGN_CHAPTERS.length) {
        updatedUnlockedChapter = chapNumber + 1;
        nextChapObj = CAMPAIGN_CHAPTERS[chapNumber];
        unlockedNext = true;
      } else if (chapNumber >= CAMPAIGN_CHAPTERS.length) {
        allCompleted = true;
      }
    }

    gameStore.setCampaignResultMeta({
      isUnlockedNext: unlockedNext,
      isAllCompleted: allCompleted,
      nextChapter: nextChapObj,
      currentWins: currentWinsInChapter
    });
  } else {
    gameStore.setCampaignResultMeta(null);
  }

  const updatedProfile: PlayerProfile = {
    ...currentProfile,
    coins: nextCoins,
    loans: nextLoans,
    elo: nextElo,
    campaignUnlockedChapter: updatedUnlockedChapter,
    campaignChapterWins: updatedChapterWins,
    stats: {
      ...currentProfile.stats,
      gamesPlayed: currentProfile.stats.gamesPlayed + 1,
      wins: nextWins,
      currentStreak: nextCurrentStreak,
      highestStreak: nextHighestStreak,
      totalEarned: nextTotalEarned
    }
  };

  const congsGivenCount = isPlayerWin ? engine.players.filter(p => p.id !== 'p0' && p.hand.length === 13).length : 0;
  const matchCompletedEvent: MatchCompletedEvent = {
    type: 'MATCH_COMPLETED',
    activeGameType,
    winnerPlayerId: winner.id,
    isHumanWinner: isPlayerWin,
    winners: engine.winners,
    allPlayers: engine.players,
    payouts: settlement.payouts,
    humanNetCoins: humanNetEarned,
    totalHumanCoins: nextCoins,
    betAmount: engine.rules.table.betAmount,
    isThreeSpadesWin: engine.isThreeSpadesWin,
    playerCount: engine.players.length,
    congsGivenCount,
    cascadeChopCount: 0,
    loanDeduction: settlement.loanDeduction,
    instantWinType: resolvedInstantWinType
  };

  // Phát sự kiện MATCH_COMPLETED tới Observer âm thanh và toàn bộ hệ thống
  GameEventBus.getInstance().emit(matchCompletedEvent);

  // Hệ thống ngoài rìa (Quests & Achievements) chỉ nhận event DTO để đánh giá tiến độ
  const finalQuests = evaluateDailyQuests([matchCompletedEvent], updatedProfile.dailyQuests, updatedProfile);
  const finalAchievements = evaluateAchievements([matchCompletedEvent], updatedProfile.achievements, updatedProfile);

  triggerQuestToastIfNewlyCompleted(currentProfile.dailyQuests, finalQuests, currentProfile.achievements, finalAchievements);

  updatedProfile.dailyQuests = finalQuests;
  updatedProfile.achievements = finalAchievements;

  userStore.setProfile(updatedProfile);
  savePlayerProfile(updatedProfile);

  const matchReport = MatchLogger.getInstance().finalizeMatch({
    players: engine.players,
    winners: engine.winners,
    payouts: settlement.payouts,
    isThreeSpadesWin: engine.isThreeSpadesWin,
    instantWinType: resolvedInstantWinType,
    loanDeduction: settlement.loanDeduction || 0,
    eloDelta: settlement.eloDelta || 0
  });
  gameStore.setMatchLogReport(matchReport);

  // Cập nhật hệ sinh thái 200 Bot nếu không phải Campaign
  if (activeGameType !== 'CAMPAIGN') {
    const totalPlayers = engine.players.length;
    const humanRank = isPlayerWin ? 1 : (engine.winners.findIndex(w => w.id === 'p0') + 1 || totalPlayers);
    const botResults = engine.players
      .filter(p => p.id !== 'p0')
      .map(p => {
        const rank = engine.winners.findIndex(w => w.id === p.id) + 1 || totalPlayers;
        const deltaCoins = settlement.payouts[p.id] || 0;
        let deltaElo = 0;
        if (totalPlayers === 2) {
          if (rank === 1) deltaElo = Math.floor(Math.random() * 9) + 24;
          else deltaElo = -(Math.floor(Math.random() * 9) + 24);
        } else if (totalPlayers === 3) {
          if (rank === 1) deltaElo = Math.floor(Math.random() * 9) + 24;
          else if (rank === 2) deltaElo = Math.floor(Math.random() * 5) - 2;
          else deltaElo = -(Math.floor(Math.random() * 9) + 24);
        } else {
          if (rank === 1) deltaElo = Math.floor(Math.random() * 9) + 24;
          else if (rank === 2) deltaElo = Math.floor(Math.random() * 5) + 8;
          else if (rank === 3) deltaElo = -(Math.floor(Math.random() * 5) + 8);
          else deltaElo = -(Math.floor(Math.random() * 9) + 24);
        }

        const chopsDone = matchReport?.turns.filter(t => t.isChop && t.playerId === p.id).length || 0;
        const congsGiven = (engine.winners[0]?.id === p.id)
          ? engine.players.filter(pl => pl.id !== p.id && pl.hand.length === 13).length
          : 0;

        return {
          botId: p.botPersonaId || p.id,
          rank,
          deltaCoins,
          deltaElo,
          chopsDone,
          congsGiven
        };
      });

    const eloDeltasMap: Record<string, number> = {
      p0: settlement.eloDelta
    };
    botResults.forEach(b => {
      eloDeltasMap[b.botId] = b.deltaElo;
    });
    gameStore.setAllEloDeltas(eloDeltasMap);

    // Đồng bộ ELO biến động trực tiếp vào cấu hình CustomBotConfigs
    if (activeGameType === 'QUICK') {
      const currentConfigs = gameStore.customBotConfigs;
      const updateForIdx = (cfg: Partial<BotConfig> | undefined, idx: number): Partial<BotConfig> => {
        if (!cfg) return {};
        const playerAtIdx = engine.players[idx + 1];
        if (!playerAtIdx) return cfg;
        const res = botResults.find(b => b.botId === playerAtIdx.botPersonaId || b.botId === playerAtIdx.id || b.botId === playerAtIdx.name);
        if (res) {
          const currentElo = cfg.elo ?? 1000;
          return {
            ...cfg,
            elo: Math.max(800, Math.min(2600, currentElo + res.deltaElo))
          };
        }
        return cfg;
      };

      const updated: CustomBotConfigTuple = [
        updateForIdx(currentConfigs[0], 0),
        updateForIdx(currentConfigs[1], 1),
        updateForIdx(currentConfigs[2], 2)
      ];
      gameStore.setCustomBotConfigs(updated);
    }

    useEcosystemStore.getState().settleMatchEcosystem({
      humanRank,
      betAmount: engine.settings.betAmount,
      botResults
    });
  } else {
    gameStore.setAllEloDeltas({});
  }

  // Tự động sao lưu lên GitHub Gist nếu đủ điều kiện
  const settings = useSettingsStore.getState();
  const backupInterval = Math.max(1, settings.autoBackupInterval || 5);
  const shouldAutoBackup = updatedProfile.stats.gamesPlayed > 0 && updatedProfile.stats.gamesPlayed % backupInterval === 0;

  if (settings.githubToken && settings.autoBackupOnMatchEnd && shouldAutoBackup) {
    forceUploadToCloud().catch((err: unknown) => {
      console.warn('[AutoBackup] Tự động sao lưu gặp lỗi:', err);
    });
  }

  viewStore.openModal('VICTORY');
}
