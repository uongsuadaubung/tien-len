import { useEffect, useRef, useCallback, useState } from 'react';
import { Card } from '../../engine/types';
import { sortCards } from '../../engine/card';
import { GameEngine } from '../../engine/game';
import { getBotConfig } from '../../ai/bot-factory';
import { CardTracker } from '../../ai/card-tracker';
import { getOptimalMoveHint } from '../../ai/hint-engine';
import { soundManager } from '../audio/sound-manager';
import { CampaignChapter, CAMPAIGN_CHAPTERS } from '../../engine/campaign';
import { resolveStrategyForMatch, MatchSetupContext } from '../../engine/strategies/game-mode-strategy';
import { GameEventBus, MatchCompletedEvent, ChopExecutedEvent, CardPlayedEvent } from '../../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../../engine/evaluators/progress-evaluators';
import { PlayerProfile } from '../../engine/storage';
import { UI_TIMINGS } from '../constants/ui-timings';

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
  const { openModal } = useModalStore();
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
    selectedCardIds,
    currentHint,
    setPlayerCount,
    setBotPersonaIds,
    setCustomBotConfigs,
    setGameNumber,
    setGameRules,
    setGameSettings,
    setIsDealing,
    setDealtCounts,
    setDealBanner,
    setChopNotification,
    setPlayers,
    setCurrentTurnPlayerId,
    setLeadPlayerId,
    setCurrentMove,
    setWinners,
    setIsGameOver,
    setInstantWinType,
    setSelectedCardIds,
    clearCardSelection,
    setCurrentHint,
    setMatchPayouts,
    setLoanDeductionAmount,
    setLastEloDelta
  } = useGameStore();

  const [campaignResultMeta, setCampaignResultMeta] = useState<CampaignResultMeta | null>(null);

  // Engine & Trackers
  const engineRef = useRef<GameEngine | null>(null);
  const trackersRef = useRef<Record<string, CardTracker>>({});

  // Kích hoạt thông báo Chặt Heo/Hàng
  const triggerChopAlert = useCallback((chopperName: string, targetName: string, amount: number) => {
    soundManager.playChop();
    setChopNotification({ visible: true, chopperName, targetName, amount });
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
      isNextPlayerOneCard
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
      campaignReward: currentCampaignChapter?.rewardCoins
    });

    setMatchPayouts(settlement.payouts);
    setLoanDeductionAmount(settlement.loanDeduction);
    setLastEloDelta(settlement.eloDelta);

    const humanNetEarned = settlement.payouts['p0'] || 0;
    const nextCoins = Math.max(0, currentCoins + humanNetEarned);
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

    const matchCompletedEvent: MatchCompletedEvent = {
      type: 'MATCH_COMPLETED',
      activeGameType,
      winnerPlayerId: winner?.id || 'p0',
      isHumanWinner: isPlayerWin,
      winners: engine.winners,
      allPlayers: engine.players,
      payouts: settlement.payouts,
      humanNetCoins: humanNetEarned,
      totalHumanCoins: nextCoins
    };

    const finalQuests = evaluateDailyQuests([matchCompletedEvent], updatedProfile.dailyQuests, updatedProfile);
    const finalAchievements = evaluateAchievements([matchCompletedEvent], updatedProfile.achievements, updatedProfile);

    updatedProfile.dailyQuests = finalQuests;
    updatedProfile.achievements = finalAchievements;

    setProfile(updatedProfile);
    GameEventBus.getInstance().publish(matchCompletedEvent);

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
    setProfile,
    syncGameState
  ]);

  // Khởi tạo ván bài mới
  const startNewGame = useCallback((
    nextGameNumber = 1,
    setupContext?: Partial<MatchSetupContext>
  ) => {
    clearCardSelection();
    setWinners([]);
    setIsGameOver(false);
    setInstantWinType(undefined);
    setGameNumber(nextGameNumber);

    // 1. Phân giải Strategy tương ứng theo chế độ đấu
    const effectiveMode = setupContext?.customSettings?.mode || gameSettings.mode;
    const strategy = resolveStrategyForMatch(activeGameType, effectiveMode);

    // 2. Strategy tự động thiết lập toàn bộ cấu hình ván đấu
    const setup = strategy.setupMatch({
      profile,
      customSettings: { ...gameSettings, ...setupContext?.customSettings },
      customBotPersonaIds: botPersonaIds,
      customBotConfigs,
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

    // 4. Khởi tạo Engine với cấu hình chuẩn xác từ Strategy
    const engine = new GameEngine(
      setup.initialPlayers,
      setup.rules
    );
    engine.startNewGame(nextGameNumber);
    engineRef.current = engine;

    const bConfigs = [
      getBotConfig(setup.botPersonaIds[0], setup.customBotConfigs[0]),
      getBotConfig(setup.botPersonaIds[1], setup.customBotConfigs[1]),
      getBotConfig(setup.botPersonaIds[2], setup.customBotConfigs[2])
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
    setWinners
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
    const leadText = leadPlayer?.isBot
      ? `${leadPlayer.name} (${leadPlayer.avatar}) giành quyền mở màn!`
      : 'Bạn (Người Chơi) giành quyền mở màn ván bài!';

    setDealBanner(leadText);
    setTimeout(() => {
      setDealBanner(null);
    }, UI_TIMINGS.BANNER_DISPLAY_DURATION_MS);

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
          triggerChopAlertRef.current(currentPlayer.name, chopped?.name || 'Đối thủ', penalty);
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
        triggerChopAlert(profile.name, chopped?.name || 'Bot', penalty);

        const chopEvent: ChopExecutedEvent = {
          type: 'CHOP_EXECUTED',
          chopperPlayerId: 'p0',
          victimPlayerId: moveRes.choppedPlayerId,
          penaltyAmount: penalty,
          choppingCards: cardsToPlay
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

  // Người Chơi Tự Động Xếp Bài
  const handleAutoSort = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const p0 = engine.getPlayer('p0');
    if (p0) {
      p0.hand = sortCards(p0.hand);
      setPlayers([...engine.players]);
    }
  }, [setPlayers]);

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
    syncGameState
  };
}
