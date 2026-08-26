import { useEffect, useRef, useCallback, useState } from 'react';
import { Card } from '../../engine/types';
import { sortCards } from '../../engine/card';
import { sortCardsSmart, getAvailableSmartVariants } from '../../engine/hand-sorter';
import { GameEngine } from '../../engine/game';
import { getBotConfig, generateRandomBotConfig, generateRealisticBotBankroll } from '../../ai/bot-factory';
import { CardTracker } from '../../ai/card-tracker';
import { getOptimalMoveHint } from '../../ai/hint-engine';
import { soundManager } from '../audio/sound-manager';
import { CampaignChapter, CAMPAIGN_CHAPTERS } from '../../engine/campaign';
import { resolveStrategyForMatch, MatchSetupContext } from '../../engine/strategies/game-mode-strategy';
import { GameEventBus, MatchCompletedEvent, ChopExecutedEvent, CardPlayedEvent } from '../../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../../engine/evaluators/progress-evaluators';
import { Quest, Achievement } from '../../engine/quests';
import { 
  PlayerProfile, 
  saveActiveMatchSession, 
  getActiveMatchSession, 
  clearActiveMatchSession, 
  savePlayerProfile 
} from '../../engine/storage';
import { UI_TIMINGS } from '../constants/ui-timings';
import { MatchLogger } from '../../engine/match-logger';

import { OpponentProfiler } from '../../ai/opponent-profiler';

// Stores
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';

export interface CampaignResultMeta {
  isUnlockedNext: boolean;
  isAllCompleted: boolean;
  nextChapter: CampaignChapter | null;
  currentWins: number;
}

export function useGameMatchLoop() {
  const { openModal, closeAllModals, setForfeitData } = useModalStore();
  const { profile, setProfile } = useUserStore();
  const {
    autoSortEnabled,
    aiHintEnabled,
    botThinkDelayMs
  } = useSettingsStore();

  const {
    activeGameType,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    currentCampaignChapter,
    gameNumber,
    gameRules,
    gameSettings,
    isDealing,
    currentTurnPlayerId,
    isGameOver,
    instantWinType,
    selectedCardIds,
    currentHint,
    handSortMode,
    smartVariantIndex,
    setPlayerCount,
    setBotPersonaIds,
    updateBotPersonaAt,
    setCustomBotConfigs,
    updateCustomBotConfigAt,
    setGameNumber,
    setGameRules,
    setGameSettings,
    setHandSortMode,
    setSmartVariantIndex,
    setIsDealing,
    setDealtCounts,
    setDealBanner,
    setChopNotification,
    setQuestToast,
    setPlayers,
    setCurrentTurnPlayerId,
    setLeadPlayerId,
    setCurrentMove,
    setWinners,
    setIsGameOver,
    setInstantWinType,
    setIsThreeSpadesWin,
    setSelectedCardIds,
    clearCardSelection,
    setCurrentHint,
    setMatchPayouts,
    setLoanDeductionAmount,
    setLastEloDelta,
    setMatchLogReport,
    setCurrentScreen,
    resetMatchState
  } = useGameStore();

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

  // Engine & Trackers
  const engineRef = useRef<GameEngine | null>(null);
  const trackersRef = useRef<Record<string, CardTracker>>({});
  const lastWinnerIdRef = useRef<string | null>(null);
  const replacedBotBannersRef = useRef<string[]>([]);

  // Kích hoạt thông báo Chặt Heo/Hàng
  const triggerChopAlert = useCallback((
    chopperName: string, 
    targetName: string, 
    amount: number,
    isCascade?: boolean,
    chainCount?: number
  ) => {
    soundManager.playChop();
    setChopNotification({ 
      visible: true, 
      chopperName, 
      targetName, 
      amount,
      isCascade: isCascade || false,
      chainCount: chainCount || 1
    });
    setTimeout(() => {
      setChopNotification(null);
    }, UI_TIMINGS.CHOP_ALERT_DURATION_MS);
  }, [setChopNotification]);

  // Cập nhật gợi ý AI cho người chơi
  const updatePlayerAiHint = useCallback((engine: GameEngine) => {
    const p0 = engine.getPlayer('p0');
    if (!p0) return;
    const tracker = trackersRef.current['p0'] || new CardTracker(p0.hand, 1.0);
    const remainingCounts = engine.players.reduce((acc, p) => ({ ...acc, [p.id]: p.hand.length }), {});
    const nextPlayerId = engine.getNextActivePlayerId('p0');
    const nextPlayer = engine.getPlayer(nextPlayerId);
    const isNextPlayerOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;

    const hint = getOptimalMoveHint(
      p0.hand,
      engine.getLeadingMove(),
      engine.isFirstMoveOfGame,
      engine.isRoundLeadMove(),
      tracker,
      remainingCounts,
      nextPlayerId,
      isNextPlayerOneCard,
      engine.rules.gameFlow.prohibitEndingWithTwo
    );
    setCurrentHint(hint);
  }, [setCurrentHint]);

  // Đồng bộ trạng thái từ Engine sang UI Store
  const syncGameState = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;

    setPlayers([...engine.players]);
    const currentId = engine.getCurrentPlayer()?.id || engine.currentRound.currentTurnPlayerId;
    setCurrentTurnPlayerId(currentId);
    setCurrentMove(engine.getLeadingMove());
    setWinners([...engine.winners]);
    setIsGameOver(engine.isGameOver);

    if (aiHintEnabled && currentId === 'p0' && !engine.isGameOver) {
      updatePlayerAiHint(engine);
    } else {
      setCurrentHint(null);
    }
  }, [
    aiHintEnabled,
    setCurrentHint,
    setCurrentMove,
    setCurrentTurnPlayerId,
    setIsGameOver,
    setPlayers,
    setWinners,
    updatePlayerAiHint
  ]);

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
      campaignReward: currentCampaignChapter?.rewardCoins,
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
    let updatedChapterWins = { ...profile.campaignChapterWins };
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

    openModal('VICTORY');
  }, [
    activeGameType,
    currentCampaignChapter,
    openModal,
    profile,
    setIsGameOver,
    setLastEloDelta,
    setLoanDeductionAmount,
    setMatchPayouts,
    setMatchLogReport,
    setProfile,
    syncGameState,
    triggerQuestToastIfNewlyCompleted
  ]);

  // Khởi tạo ván bài mới
  const startNewGame = useCallback((
    nextGameNumber = 1,
    setupContext?: Partial<MatchSetupContext>,
    preserveWinnerId?: string
  ) => {
    clearCardSelection();
    setWinners([]);
    setIsGameOver(false);
    setInstantWinType(undefined);
    const effectiveGameNumber = nextGameNumber;
    setGameNumber(effectiveGameNumber);

    if (effectiveGameNumber === 1) {
      clearActiveMatchSession();
      lastWinnerIdRef.current = null;
      trackersRef.current = {};
      replacedBotBannersRef.current = [];
      OpponentProfiler.getInstance().reset();
      resetMatchState();
    }

    // 1. Phân giải Strategy tương ứng theo chế độ đấu
    const effectiveMode = setupContext?.customSettings?.mode || gameSettings.mode;
    const strategy = resolveStrategyForMatch(activeGameType, effectiveMode);

    // 2. Strategy tự động thiết lập toàn bộ cấu hình ván đấu
    const setup = strategy.setupMatch({
      profile,
      customSettings: { ...gameSettings, ...setupContext?.customSettings },
      customBotPersonaIds: botPersonaIds,
      customBotConfigs: customBotConfigs,
      campaignChapter: currentCampaignChapter || undefined,
      playerCount,
      ...setupContext
    });

    // 3. Đồng bộ lại cấu hình chuẩn vào Stores
    setGameRules(setup.rules);
    setGameSettings(setup.settings);
    setBotPersonaIds(setup.botPersonaIds);
    setCustomBotConfigs(setup.customBotConfigs);
    setPlayerCount(setup.playerCount);

    // 3.1. Tính toán và Tạm giữ tiền cọc an toàn (Buy-in Deposit)
    const penaltyMultiplier = setup.rules.chopping.multiplier || setup.rules.cong.multiplier || 1;
    const tableBetAmount = setup.rules.table.betAmount || 0;
    const requiredDeposit = 26 * tableBetAmount * penaltyMultiplier;

    if (requiredDeposit > 0) {
      if (profile.coins < requiredDeposit) {
        // Không đủ tiền cọc -> Kích hoạt Modal Vay Tiền Ngân Hàng
        openModal('BANK');
        return;
      }

      // Trừ tạm giữ tiền cọc vào tài khoản
      const postDepositCoins = profile.coins - requiredDeposit;
      const updatedProfile = {
        ...profile,
        coins: postDepositCoins
      };
      setProfile(updatedProfile);
      savePlayerProfile(updatedProfile);
    }

    // Lưu Active Session vào LocalStorage phòng trường hợp F5 / Thoát đột ngột
    saveActiveMatchSession({
      gameId: `match_${Date.now()}`,
      gameType: activeGameType,
      mode: setup.settings.mode,
      gameNumber: effectiveGameNumber,
      depositAmount: requiredDeposit,
      betAmount: tableBetAmount,
      penaltyMultiplier: penaltyMultiplier !== undefined ? penaltyMultiplier : null,
      activeGameType: activeGameType,
      playerCount: setup.playerCount,
      isRanked: activeGameType === 'QUICK',
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    // 4. Giữ lại số tiền của các người chơi nếu là ván tiếp theo trong cùng bàn VÀ thay thế Bot nếu Bot cháy túi
    let initialPlayers = setup.initialPlayers;
    const replacedBanners: string[] = [];
    const currentPersonaIds = botPersonaIds;
    const currentConfigs = customBotConfigs;

    if (effectiveGameNumber > 1 && engineRef.current) {
      const prevEngine = engineRef.current;
      const betAmount = setup.settings.betAmount || 100;
      const usedNames = [profile.name];
      const usedAvatars = [profile.avatar];

      initialPlayers = initialPlayers.map((p, idx) => {
        const prevPlayer = prevEngine.getPlayer(p.id);
        const prevScore = prevPlayer ? prevPlayer.score : p.score;

        if (p.isBot && prevScore < betAmount) {
          // Bot bị cháy túi -> Đứng dậy rời bàn và thay thế bằng Bot mới
          const botIdx = idx - 1; // p1 -> 0, p2 -> 1, p3 -> 2
          let tierNum = 2;
          const currentPersonaId = currentPersonaIds[botIdx] || 'BOT_ELO_1150';
          if (currentPersonaId.includes('850') || currentPersonaId.includes('900') || currentPersonaId.includes('950') || currentPersonaId.includes('1000')) tierNum = 1;
          else if (currentPersonaId.includes('1450') || currentPersonaId.includes('1550') || currentPersonaId.includes('1600') || currentPersonaId.includes('1650')) tierNum = 3;
          else if (currentPersonaId.includes('1750') || currentPersonaId.includes('1850') || currentPersonaId.includes('1900') || currentPersonaId.includes('1950')) tierNum = 4;
          else if (currentPersonaId.includes('2050') || currentPersonaId.includes('2150') || currentPersonaId.includes('2300') || currentPersonaId.includes('2500')) tierNum = 5;

          const newBotConfig = generateRandomBotConfig(tierNum, {
            excludeNames: usedNames,
            excludeAvatars: usedAvatars
          });

          usedNames.push(newBotConfig.name || '');
          usedAvatars.push(newBotConfig.avatar || '🤖');

          const newInitialScore = generateRealisticBotBankroll(newBotConfig, betAmount);
          replacedBanners.push(`💸 ${p.name} cháy túi rời sòng! ${newBotConfig.name} (${newBotConfig.avatar}) vào thế chỗ!`);

          if (botIdx >= 0 && botIdx < 3) {
            currentPersonaIds[botIdx] = newBotConfig.id;
            currentConfigs[botIdx] = newBotConfig;
            updateBotPersonaAt(botIdx, newBotConfig.id);
            updateCustomBotConfigAt(botIdx, newBotConfig);
          }

          return {
            ...p,
            name: newBotConfig.name || p.name,
            avatar: newBotConfig.avatar || p.avatar,
            botPersonaId: newBotConfig.id,
            score: newInitialScore
          };
        }

        usedNames.push(p.name);
        usedAvatars.push(p.avatar);
        return {
          ...p,
          score: prevScore
        };
      });
    }

    replacedBotBannersRef.current = replacedBanners;

    // 5. Khởi tạo Engine với cấu hình chuẩn xác từ Strategy
    const engine = new GameEngine(
      initialPlayers,
      setup.rules
    );

    const resolvedWinnerId = (effectiveGameNumber === 1)
      ? undefined
      : (preserveWinnerId || lastWinnerIdRef.current || undefined);
    engine.startNewGame(effectiveGameNumber, resolvedWinnerId);
    engineRef.current = engine;

    const bConfigs = [
      getBotConfig(currentPersonaIds[0], currentConfigs[0]),
      getBotConfig(currentPersonaIds[1], currentConfigs[1]),
      getBotConfig(currentPersonaIds[2], currentConfigs[2])
    ];

    const newTrackers: Record<string, CardTracker> = {
      p0: new CardTracker(engine.getPlayer('p0')?.hand || [], 1.0)
    };
    if (setup.playerCount >= 2) {
      newTrackers.p1 = new CardTracker(engine.getPlayer('p1')?.hand || [], bConfigs[0].memoryDepth);
    }
    if (setup.playerCount >= 3) {
      newTrackers.p2 = new CardTracker(engine.getPlayer('p2')?.hand || [], bConfigs[1].memoryDepth);
    }
    if (setup.playerCount >= 4) {
      newTrackers.p3 = new CardTracker(engine.getPlayer('p3')?.hand || [], bConfigs[2].memoryDepth);
    }
    trackersRef.current = newTrackers;

    setPlayers([...engine.players]);
    const leadId = engine.getCurrentPlayer()?.id || engine.currentRound.currentTurnPlayerId;
    setCurrentTurnPlayerId(leadId);
    setLeadPlayerId(leadId);
    setCurrentMove(null);

    // Kích hoạt hiệu ứng chia bài
    setIsDealing(true);
    const initialDealt: Record<string, number> = { p0: 0 };
    if (setup.playerCount >= 2) initialDealt.p1 = 0;
    if (setup.playerCount >= 3) initialDealt.p2 = 0;
    if (setup.playerCount >= 4) initialDealt.p3 = 0;
    setDealtCounts(initialDealt);
    setDealBanner(null);
  }, [
    activeGameType,
    botPersonaIds,
    clearCardSelection,
    currentCampaignChapter,
    customBotConfigs,
    gameSettings,
    playerCount,
    profile,
    setBotPersonaIds,
    setCustomBotConfigs,
    setCurrentMove,
    setCurrentTurnPlayerId,
    setDealBanner,
    setDealtCounts,
    setGameNumber,
    setGameSettings,
    setInstantWinType,
    setIsDealing,
    setIsGameOver,
    setLeadPlayerId,
    setPlayerCount,
    setPlayers,
    setWinners,
    updateBotPersonaAt,
    updateCustomBotConfigAt
  ]);

  // Hoàn tất hiệu ứng chia bài
  const handleDealComplete = useCallback(() => {
    setIsDealing(false);
    if (!engineRef.current) return;
    const engine = engineRef.current;

    if (autoSortEnabled) {
      const p0 = engine.getPlayer('p0');
      if (p0) {
        p0.hand = sortCards(p0.hand);
      }
    }

    const counts: Record<string, number> = {};
    for (const p of engine.players) {
      counts[p.id] = p.hand.length;
    }
    setDealtCounts(counts);

    const leadPlayer = engine.getCurrentPlayer();
    let leadText = '';
    if (engine.gameNumber > 1) {
      leadText = leadPlayer?.isBot
        ? `${leadPlayer.name} (${leadPlayer.avatar}) giành quyền mở màn (Thắng ván trước)!`
        : 'Bạn (Người Chơi) giành quyền mở màn (Thắng ván trước)!';
    } else {
      leadText = leadPlayer?.isBot
        ? `${leadPlayer.name} (${leadPlayer.avatar}) giành quyền mở màn (3 Bích)!`
        : 'Bạn (Người Chơi) giành quyền mở màn (3 Bích)!';
    }

    if (replacedBotBannersRef.current.length > 0) {
      const bannerText = replacedBotBannersRef.current.join(' | ');
      replacedBotBannersRef.current = [];
      setDealBanner(bannerText);
      setTimeout(() => {
        setDealBanner(leadText);
        setTimeout(() => {
          setDealBanner(null);
        }, UI_TIMINGS.BANNER_DISPLAY_DURATION_MS);
      }, UI_TIMINGS.BANNER_DISPLAY_DURATION_MS);
    } else {
      setDealBanner(leadText);
      setTimeout(() => {
        setDealBanner(null);
      }, UI_TIMINGS.BANNER_DISPLAY_DURATION_MS);
    }

    syncGameState();
  }, [autoSortEnabled, setDealBanner, setDealtCounts, setIsDealing, syncGameState]);

  const handleDealCard = useCallback((playerIndex: number, currentCardCount: number) => {
    const playerId = 'p' + playerIndex;
    setDealtCounts(prev => ({
      ...prev,
      [playerId]: currentCardCount
    }));
  }, [setDealtCounts]);

  // Ref Wrappers để giữ bot decision effect không bị hủy timer bởi re-render
  const syncGameStateRef = useRef(syncGameState);
  useEffect(() => {
    syncGameStateRef.current = syncGameState;
  }, [syncGameState]);

  const handleGameCompletionRef = useRef(handleGameCompletion);
  useEffect(() => {
    handleGameCompletionRef.current = handleGameCompletion;
  }, [handleGameCompletion]);

  const triggerChopAlertRef = useRef(triggerChopAlert);
  useEffect(() => {
    triggerChopAlertRef.current = triggerChopAlert;
  }, [triggerChopAlert]);

  // VÒNG LẶP AI CHO BOT (Tự động tính toán & đi bài)
  useEffect(() => {
    if (!engineRef.current || isDealing || isGameOver) return;
    const engine = engineRef.current;

    if (engine.isGameOver) {
      handleGameCompletionRef.current(engine);
      return;
    }

    const currentPlayer = engine.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isBot || currentPlayer.hand.length === 0) return;

    const thinkDelay = Math.max(UI_TIMINGS.MIN_BOT_THINK_DELAY_MS, gameSettings.botThinkDelayMs);

    const timer = setTimeout(() => {
      if (!engineRef.current || engineRef.current.isGameOver) return;

      const botConfig = getBotConfig(currentPlayer.botPersonaId || 'BOT_ELO_1150');
      const tracker = trackersRef.current[currentPlayer.id] || new CardTracker(currentPlayer.hand, botConfig.memoryDepth);

      const result = engine.executeBotTurn(botConfig, tracker);

      if (result.action === 'PLAY') {
        soundManager.playCardSlap();

        if (result.playedMove) {
          for (const t of Object.values(trackersRef.current)) {
            t.recordMove(result.playedMove);
          }
        }

        if (result.isChop && result.choppedPlayerId) {
          const chopped = engine.getPlayer(result.choppedPlayerId);
          const penalty = result.penaltyAmount || 0;
          triggerChopAlertRef.current(
            currentPlayer.name, 
            chopped?.name || 'Đối thủ', 
            penalty,
            result.isCascadeChop,
            result.chopChainCount
          );
        }
      } else {
        soundManager.playPass();
        const leading = engine.getLeadingMove();
        if (leading) {
          for (const t of Object.values(trackersRef.current)) {
            t.recordPassWithDetails(currentPlayer.id, leading.combination);
          }
        }
      }

      syncGameStateRef.current();
      if (engine.isGameOver) {
        handleGameCompletionRef.current(engine);
      }
    }, thinkDelay);

    return () => clearTimeout(timer);
  }, [currentTurnPlayerId, isDealing, isGameOver, gameSettings.botThinkDelayMs]);

  // Người Chơi Đánh Bài
  const handlePlaySelectedCards = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const p0 = engine.getPlayer('p0');
    if (!p0) return;

    const cardsToPlay = p0.hand.filter(c => selectedCardIds.has(c.id));
    if (cardsToPlay.length === 0) return;

    const moveRes = engine.playMove('p0', cardsToPlay);
    if (moveRes.success) {
      soundManager.playCardSlap();
      clearCardSelection();

      if (moveRes.isChop && moveRes.choppedPlayerId) {
        const chopped = engine.getPlayer(moveRes.choppedPlayerId);
        const penalty = moveRes.penaltyAmount || 0;
        triggerChopAlert(
          profile.name, 
          chopped?.name || 'Bot', 
          penalty,
          moveRes.isCascadeChop,
          moveRes.chopChainCount
        );

        const chopEvent: ChopExecutedEvent = {
          type: 'CHOP_EXECUTED',
          chopperPlayerId: 'p0',
          victimPlayerId: moveRes.choppedPlayerId,
          penaltyAmount: penalty,
          choppingCards: cardsToPlay,
          isCascadeChop: !!moveRes.isCascadeChop,
          chopChainCount: moveRes.chopChainCount || 1
        };

        const updatedProfile: PlayerProfile = {
          ...profile,
          stats: {
            ...profile.stats,
            chopsDone: profile.stats.chopsDone + 1
          }
        };

        const finalQuests = evaluateDailyQuests([chopEvent], updatedProfile.dailyQuests, updatedProfile);
        const finalAchievements = evaluateAchievements([chopEvent], updatedProfile.achievements, updatedProfile);

        triggerQuestToastIfNewlyCompleted(profile.dailyQuests, finalQuests, profile.achievements, finalAchievements);

        updatedProfile.dailyQuests = finalQuests;
        updatedProfile.achievements = finalAchievements;

        setProfile(updatedProfile);
        GameEventBus.getInstance().publish(chopEvent);
      }

      const lastMove = engine.getLeadingMove();
      if (lastMove) {
        const cardPlayedEvent: CardPlayedEvent = {
          type: 'CARD_PLAYED',
          playerId: 'p0',
          cards: cardsToPlay,
          combination: lastMove.combination,
          remainingCardsCount: p0.hand.length
        };

        const finalQuests = evaluateDailyQuests([cardPlayedEvent], profile.dailyQuests, profile);
        const finalAchievements = evaluateAchievements([cardPlayedEvent], profile.achievements, profile);

        triggerQuestToastIfNewlyCompleted(profile.dailyQuests, finalQuests, profile.achievements, finalAchievements);

        setProfile({
          ...profile,
          dailyQuests: finalQuests,
          achievements: finalAchievements
        });

        GameEventBus.getInstance().publish(cardPlayedEvent);

        for (const t of Object.values(trackersRef.current)) {
          t.recordMove(lastMove);
        }
      }

      syncGameState();

      if (engine.isGameOver) {
        handleGameCompletion(engine);
      }
    } else {
      alert(moveRes.error || 'Nước đi không hợp lệ');
    }
  }, [
    clearCardSelection,
    handleGameCompletion,
    profile,
    selectedCardIds,
    setProfile,
    syncGameState,
    triggerChopAlert
  ]);

  // Người Chơi Bỏ Lượt
  const handlePassTurn = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const passRes = engine.passTurn('p0');
    if (passRes.success) {
      soundManager.playPass();
      clearCardSelection();
      if (engine.getLeadingMove()) {
        for (const t of Object.values(trackersRef.current)) {
          t.recordPassWithDetails('p0', engine.getLeadingMove()!.combination);
        }
      }
      syncGameState();
    }
  }, [clearCardSelection, syncGameState]);

  // Người Chơi Tự Động Xếp Bài (Xoay vòng đa phương án Gom Nhóm Bộ -> Xếp Điểm 3->2)
  const handleAutoSort = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const p0 = engine.getPlayer('p0');
    if (p0) {
      const variants = getAvailableSmartVariants(p0.hand);

      if (handSortMode === 'NATURAL') {
        // Chuyển từ Điểm sang Bộ Phương Án 1 (index 0)
        setHandSortMode('SMART_GROUP');
        setSmartVariantIndex(0);
        p0.hand = sortCardsSmart(p0.hand, 0);
      } else {
        // Đang ở SMART_GROUP
        if (smartVariantIndex < variants.length - 1) {
          // Còn phương án bộ tiếp theo
          const nextIdx = smartVariantIndex + 1;
          setSmartVariantIndex(nextIdx);
          p0.hand = sortCardsSmart(p0.hand, nextIdx);
        } else {
          // Đã ở phương án bộ cuối -> Quay về Xếp Điểm (NATURAL)
          setHandSortMode('NATURAL');
          setSmartVariantIndex(0);
          p0.hand = sortCards(p0.hand);
        }
      }

      setPlayers([...engine.players]);
      soundManager.playCardDeal();
    }
  }, [handSortMode, smartVariantIndex, setHandSortMode, setSmartVariantIndex, setPlayers]);

  // Người Chơi Áp Dụng Gợi Ý AI
  const handleApplyAiHint = useCallback(() => {
    if (!currentHint || currentHint.action === 'PASS') {
      handlePassTurn();
      return;
    }
    if (currentHint.cards) {
      const ids = new Set<string>(currentHint.cards.map((c: Card) => c.id));
      setSelectedCardIds(ids);
    }
  }, [currentHint, handlePassTurn, setSelectedCardIds]);

  // Xử lý khi người chơi xác nhận bỏ cuộc (Forfeit)
  const handleForfeitMatch = useCallback(() => {
    const session = getActiveMatchSession();
    clearActiveMatchSession();

    if (session) {
      let updatedProfile = { ...profile };
      if (session.isRanked) {
        const nextElo = Math.max(0, profile.elo - 30);
        updatedProfile = {
          ...profile,
          elo: nextElo,
          stats: {
            ...profile.stats,
            gamesPlayed: profile.stats.gamesPlayed + 1,
            currentStreak: 0
          }
        };
      } else {
        // Tiền cọc đã bị trừ khi vào ván, nay bị mất vĩnh viễn
        updatedProfile = {
          ...profile,
          stats: {
            ...profile.stats,
            gamesPlayed: profile.stats.gamesPlayed + 1,
            currentStreak: 0
          }
        };
      }
      setProfile(updatedProfile);
      savePlayerProfile(updatedProfile);
    }

    engineRef.current = null;
    trackersRef.current = {};
    lastWinnerIdRef.current = null;
    replacedBotBannersRef.current = [];
    OpponentProfiler.getInstance().reset();
    resetMatchState();
    closeAllModals();
    setCurrentScreen('LOBBY');
  }, [profile, setProfile, setCurrentScreen, closeAllModals, resetMatchState]);

  // Người chơi bấm nút "Về Sảnh" trên HeaderBar
  const handleRequestReturnToLobby = useCallback(() => {
    if (engineRef.current && !engineRef.current.isGameOver) {
      const session = getActiveMatchSession();
      setForfeitData({
        depositAmount: session?.depositAmount || 0,
        eloPenalty: 30,
        isRanked: activeGameType === 'QUICK'
      });
      openModal('CONFIRM_FORFEIT');
    } else {
      clearActiveMatchSession();
      engineRef.current = null;
      trackersRef.current = {};
      lastWinnerIdRef.current = null;
      replacedBotBannersRef.current = [];
      OpponentProfiler.getInstance().reset();
      resetMatchState();
      closeAllModals();
      setCurrentScreen('LOBBY');
    }
  }, [activeGameType, openModal, setForfeitData, setCurrentScreen, resetMatchState, closeAllModals]);

  return {
    engineRef,
    trackersRef,
    campaignResultMeta,
    startNewGame,
    handlePlaySelectedCards,
    handlePassTurn,
    handleAutoSort,
    handleApplyAiHint,
    handleDealCard,
    handleDealComplete,
    syncGameState,
    handleForfeitMatch,
    handleRequestReturnToLobby
  };
}
