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

    const currentCoins = profile.coins;
    const isBankLoanActive = profile.loans > 0;
    const currentElo = profile.elo;
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
    const nextLoans = Math.max(0, profile.loans - settlement.loanDeduction);
    const nextElo = settlement.isVictoryModalRanked
      ? Math.max(0, currentElo + settlement.eloDelta)
      : currentElo;

    const nextWins = isPlayerWin ? profile.stats.wins + 1 : profile.stats.wins;
    const nextCurrentStreak = isPlayerWin ? profile.stats.currentStreak + 1 : 0;
    const nextHighestStreak = Math.max(profile.stats.highestStreak, nextCurrentStreak);
    const nextTotalEarned = humanNetEarned > 0 ? profile.stats.totalEarned + humanNetEarned : profile.stats.totalEarned;

    let updatedUnlockedChapter = profile.campaignUnlockedChapter;
    const updatedChapterWins = { ...profile.campaignChapterWins };
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
      const humanRank = isPlayerWin ? 1 : (engine.winners.findIndex(w => w.id === 'p0') + 1 || 4);
      const botResults = engine.players
        .filter(p => p.id !== 'p0')
        .map(p => {
          const rank = engine.winners.findIndex(w => w.id === p.id) + 1 || 4;
          const deltaCoins = settlement.payouts[p.id] || 0;
          let deltaElo = 0;
          if (rank === 1) deltaElo = Math.floor(Math.random() * 9) + 24;
          else if (rank === 2) deltaElo = Math.floor(Math.random() * 5) + 8;
          else if (rank === 3) deltaElo = -(Math.floor(Math.random() * 5) + 8);
          else deltaElo = -(Math.floor(Math.random() * 9) + 24);

          return {
            botId: p.botPersonaId || p.id,
            rank,
            deltaCoins,
            deltaElo,
            chopsDone: 0,
            congsGiven: 0
          };
        });

      useEcosystemStore.getState().settleMatchEcosystem({
        humanRank,
        betAmount: engine.settings.betAmount,
        botResults
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
