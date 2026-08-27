import { useState, useCallback } from 'react';
import { GameEngine } from '../../engine/game';
import { CampaignChapter, CAMPAIGN_CHAPTERS } from '../../engine/campaign';
import { resolveStrategyForMatch } from '../../engine/strategies/game-mode-strategy';
import { GameEventBus, MatchCompletedEvent } from '../../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../../engine/evaluators/progress-evaluators';
import { Quest, Achievement } from '../../engine/quests';
import { PlayerProfile, getActiveMatchSession, clearActiveMatchSession, savePlayerProfile } from '../../engine/storage';
import { MatchLogger } from '../../engine/match-logger';
import { soundManager } from '../audio/sound-manager';
import { useGameStore } from '../../stores/useGameStore';
import { useUserStore } from '../../stores/useUserStore';
import { useModalStore } from '../../stores/useModalStore';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { forceUploadToCloud } from '../../engine/sync/sync-service';
import { BotConfig } from '../../ai/types';
import { CustomBotConfigTuple } from '../../engine/types';

export interface CampaignResultMeta {
  isUnlockedNext: boolean;
  isAllCompleted: boolean;
  nextChapter: CampaignChapter | null;
  currentWins: number;
}

/**
 * Hook quản lý kết toán ván đấu, tính Xu/Elo, kiểm tra Quest/Thành tựu và cập nhật Hệ Sinh Thái
 */
export function useMatchSettlement(
  lastWinnerIdRef: React.MutableRefObject<string | null>,
  syncGameState: () => void
) {
  const {
    activeGameType,
    currentCampaignChapter,
    instantWinType,
    setIsGameOver,
    setIsThreeSpadesWin,
    setMatchPayouts,
    setLoanDeductionAmount,
    setLastEloDelta,
    setAllEloDeltas,
    setMatchLogReport,
    setQuestToast
  } = useGameStore();

  const { profile, setProfile } = useUserStore();
  const { openModal } = useModalStore();
  const [campaignResultMeta, setCampaignResultMeta] = useState<CampaignResultMeta | null>(null);

  // Helper thông báo hoàn thành nhiệm vụ ngay trong trận
  const triggerQuestToastIfNewlyCompleted = useCallback((
    oldQuests: Quest[],
    newQuests: Quest[],
    oldAchs: Achievement[],
    newAchs: Achievement[]
  ) => {
    const newlyCompletedQuest = newQuests.find((q, idx) => q.isCompleted && !oldQuests[idx]?.isCompleted);
    const newlyCompletedAch = newAchs.find((a, idx) => a.isCompleted && !oldAchs[idx]?.isCompleted);
    const completedItem = newlyCompletedQuest || newlyCompletedAch;
    if (completedItem) {
      soundManager.playVictory();
      setQuestToast({
        title: completedItem.title,
        rewardCoins: completedItem.rewardCoins,
        icon: completedItem.icon
      });
      setTimeout(() => {
        setQuestToast(null);
      }, 3500);
    }
  }, [setQuestToast]);

  // Kết toán ván đấu khi có người thắng hoặc hết ván
  const handleGameCompletion = useCallback((engine: GameEngine) => {
    setIsGameOver(true);
    syncGameState();

    const winner = engine.winners[0];
    const isPlayerWin = winner?.id === 'p0';
    lastWinnerIdRef.current = winner?.id || null;

    if (isPlayerWin) {
      soundManager.playVictory();
    }

    const currentProfile = useUserStore.getState().profile;
    const currentCoins = currentProfile.coins;
    const isBankLoanActive = currentProfile.loans > 0;
    const currentElo = currentProfile.elo;
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

    setIsThreeSpadesWin(engine.isThreeSpadesWin);
    setMatchPayouts(settlement.payouts);
    setLoanDeductionAmount(settlement.loanDeduction);
    setLastEloDelta(settlement.eloDelta);

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
      const prevWins = profile.campaignChapterWins[chapNumber] || 0;
      currentWinsInChapter = isPlayerWin ? prevWins + 1 : prevWins;
      updatedChapterWins[chapNumber] = currentWinsInChapter;

      if (currentWinsInChapter >= currentCampaignChapter.requiredWins) {
        if (chapNumber >= profile.campaignUnlockedChapter && chapNumber < CAMPAIGN_CHAPTERS.length) {
          updatedUnlockedChapter = chapNumber + 1;
          nextChapObj = CAMPAIGN_CHAPTERS[chapNumber]; // Chương tiếp theo
          unlockedNext = true;
        } else if (chapNumber >= CAMPAIGN_CHAPTERS.length) {
          allCompleted = true;
        }
      }

      setCampaignResultMeta({
        isUnlockedNext: unlockedNext,
        isAllCompleted: allCompleted,
        nextChapter: nextChapObj,
        currentWins: currentWinsInChapter
      });
    } else {
      setCampaignResultMeta(null);
    }

    const updatedProfile: PlayerProfile = {
      ...profile,
      coins: nextCoins,
      loans: nextLoans,
      elo: nextElo,
      campaignUnlockedChapter: updatedUnlockedChapter,
      campaignChapterWins: updatedChapterWins,
      stats: {
        ...profile.stats,
        gamesPlayed: profile.stats.gamesPlayed + 1,
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
      winnerPlayerId: winner?.id || 'p0',
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
      instantWinType: instantWinType || null
    };

    const finalQuests = evaluateDailyQuests([matchCompletedEvent], updatedProfile.dailyQuests, updatedProfile);
    const finalAchievements = evaluateAchievements([matchCompletedEvent], updatedProfile.achievements, updatedProfile);

    triggerQuestToastIfNewlyCompleted(profile.dailyQuests, finalQuests, profile.achievements, finalAchievements);

    updatedProfile.dailyQuests = finalQuests;
    updatedProfile.achievements = finalAchievements;

    setProfile(updatedProfile);
    savePlayerProfile(updatedProfile);
    GameEventBus.getInstance().publish(matchCompletedEvent);

    const matchReport = MatchLogger.getInstance().finalizeMatch({
      players: engine.players,
      winners: engine.winners,
      payouts: settlement.payouts,
      isThreeSpadesWin: engine.isThreeSpadesWin,
      instantWinType: instantWinType || null,
      loanDeduction: settlement.loanDeduction || 0,
      eloDelta: settlement.eloDelta || 0
    });
    setMatchLogReport(matchReport);

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

          // Trích xuất thống kê Chặt Heo và Bắt Cóng thực tế trong trận
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

      // Lưu biến động Elo của tất cả người chơi vào State để hiển thị trên VictoryModal
      const allDeltas: Record<string, number> = {
        p0: settlement.eloDelta || 0
      };
      botResults.forEach(b => {
        const playerAtIdx = engine.players.find(p => p.botPersonaId === b.botId || p.id === b.botId || p.name === b.botId);
        if (playerAtIdx) {
          allDeltas[playerAtIdx.id] = b.deltaElo;
        }
        allDeltas[b.botId] = b.deltaElo;
      });
      setAllEloDeltas(allDeltas);

      // Cập nhật customBotConfigs để bảo lưu Elo mới của Bot ngay trong State bàn đấu
      const currentConfigs = useGameStore.getState().customBotConfigs;
      if (currentConfigs) {
        const updateForIdx = (cfg: Partial<BotConfig>, idx: number): Partial<BotConfig> => {
          const playerAtIdx = engine.players[idx + 1];
          if (!playerAtIdx) return cfg;
          const res = botResults.find(b => b.botId === playerAtIdx.botPersonaId || b.botId === playerAtIdx.id || b.botId === playerAtIdx.name);
          if (res) {
            const currentElo = cfg.elo || 1000;
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
        useGameStore.getState().setCustomBotConfigs(updated);
      }

      useEcosystemStore.getState().settleMatchEcosystem({
        humanRank,
        betAmount: engine.settings.betAmount,
        botResults
      });
    } else {
      setAllEloDeltas({});
    }

    // Tự động sao lưu lên GitHub Gist nếu đã kết nối token và bật tự động sao lưu
    const settings = useSettingsStore.getState();
    if (settings.githubToken && settings.autoBackupOnMatchEnd) {
      forceUploadToCloud().catch((err: unknown) => {
        console.warn('[AutoBackup] Tự động sao lưu gặp lỗi:', err);
      });
    }

    openModal('VICTORY');
  }, [
    activeGameType,
    currentCampaignChapter,
    instantWinType,
    lastWinnerIdRef,
    openModal,
    profile,
    setIsGameOver,
    setIsThreeSpadesWin,
    setLastEloDelta,
    setLoanDeductionAmount,
    setMatchLogReport,
    setMatchPayouts,
    setProfile,
    syncGameState,
    triggerQuestToastIfNewlyCompleted
  ]);

  return {
    campaignResultMeta,
    triggerQuestToastIfNewlyCompleted,
    handleGameCompletion
  };
}
