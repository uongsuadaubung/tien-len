import { useEffect, useRef, useCallback } from 'react';
import { sortCards, isTwo } from '../../engine/card';
import { calculateDynamicBotDelay } from '../../engine/game-speed';
import { GameEngine } from '../../engine/game';
import { getBotConfig, generateRealisticBotBankroll } from '../../ai/bot-factory';
import { CardTracker } from '../../ai/card-tracker';
import { soundManager } from '../audio/sound-manager';
import { resolveStrategyForMatch, MatchSetupContext } from '../../engine/strategies/game-mode-strategy';
import { GameEventBus, ChopExecutedEvent, CardPlayedEvent } from '../../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../../engine/evaluators/progress-evaluators';
import { 
  PlayerProfile, 
  saveActiveMatchSession, 
  getActiveMatchSession, 
  clearActiveMatchSession, 
  savePlayerProfile 
} from '../../engine/storage';
import { UI_TIMINGS } from '../constants/ui-timings';
import { ECONOMY_CONSTANTS, calculateRequiredDeposit } from '../../engine/constants/economy';
import { useSmartHandSorting } from './useSmartHandSorting';
import { useMatchSettlement, CampaignResultMeta } from './useMatchSettlement';
import { useMatchAIHints } from './useMatchAIHints';
import { OpponentProfiler } from '../../ai/opponent-profiler';

// Stores
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useOnlineStore } from '../../stores/useOnlineStore';

export type { CampaignResultMeta };

/**
 * Main Turn Loop Orchestrator Hook
 * Điều phối vòng đời trận đấu, lượt đi của Bot và thao tác của Người Chơi
 */
export function useGameMatchLoop() {
  const { openModal, closeModal, closeAllModals, setForfeitData } = useModalStore();
  const { profile, setProfile } = useUserStore();
  const {
    autoSortEnabled,
    aiHintEnabled,
    gameSpeed
  } = useSettingsStore();

  const {
    activeGameType,
    setActiveGameType,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    currentCampaignChapter,
    setCurrentCampaignChapter,
    gameSettings,
    isDealing,
    currentTurnPlayerId,
    isGameOver,
    selectedCardIds,
    setPlayerCount,
    setBotPersonaIds,
    updateBotPersonaAt,
    setCustomBotConfigs,
    updateCustomBotConfigAt,
    setGameNumber,
    setGameRules,
    setGameSettings,
    setIsDealing,
    setDealtCounts,
    setDealBanner,
    setChopNotification,
    setPlayers,
    setCurrentTurnPlayerId,
    setCurrentMove,
    setWinners,
    setIsGameOver,
    setInstantWinType,
    setBotThinkingThought,
    clearCardSelection,
    setCurrentHint,
    setCurrentScreen,
    resetMatchState
  } = useGameStore();

  // Engine & Trackers Refs
  const engineRef = useRef<GameEngine | null>(null);
  const trackersRef = useRef<Record<string, CardTracker>>({});
  const lastWinnerIdRef = useRef<string | null>(null);

  // Ref wrappers để tránh stale closures trong Timer Loop
  const syncGameStateRef = useRef<() => void>(() => {});
  const handleGameCompletionRef = useRef<(engine: GameEngine) => void>(() => {});
  const triggerChopAlertRef = useRef<
    (chopper: string, victim: string, amount: number, cascade?: boolean, count?: number) => void
  >(() => {});

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
      syncGameStateRef.current();
    }
  }, [clearCardSelection]);

  // Hook Quản lý Gợi Ý AI (AI Hints Engine)
  const { updatePlayerAiHint, handleApplyAiHint } = useMatchAIHints(
    engineRef,
    trackersRef,
    handlePassTurn
  );

  // Đồng bộ trạng thái từ Engine sang UI Store
  const syncGameState = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;

    setGameNumber(engine.gameNumber);
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
    setGameNumber,
    setIsGameOver,
    setPlayers,
    setWinners,
    updatePlayerAiHint
  ]);

  // Hook Quản lý Kết Toán Ván Đấu & Hệ Sinh Thái (Settlement & Ecosystem)
  const {
    campaignResultMeta,
    triggerQuestToastIfNewlyCompleted,
    handleGameCompletion
  } = useMatchSettlement(lastWinnerIdRef, syncGameState);

  // Cập nhật refs
  syncGameStateRef.current = syncGameState;
  handleGameCompletionRef.current = handleGameCompletion;
  triggerChopAlertRef.current = triggerChopAlert;

  // Hook Quản lý Xếp Bài Thông Minh (Smart Hand Sorting)
  const { handleAutoSort } = useSmartHandSorting(engineRef);

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
      OpponentProfiler.getInstance().reset();
      resetMatchState();
    }

    // 1. Phân giải Strategy tương ứng theo chế độ đấu
    const effectiveGameType = setupContext?.campaignChapter ? 'CAMPAIGN' : activeGameType;
    const effectiveMode = setupContext?.customSettings?.mode || gameSettings.mode;
    const strategy = resolveStrategyForMatch(effectiveGameType, effectiveMode);

    const isCampaign = effectiveGameType === 'CAMPAIGN' || Boolean(setupContext?.campaignChapter);
    const chapter = setupContext?.campaignChapter || (isCampaign ? currentCampaignChapter : null) || undefined;

    // 2. Strategy tự động thiết lập toàn bộ cấu hình ván đấu
    const setup = strategy.setupMatch({
      profile,
      customRules: setupContext?.customRules ?? null,
      customSettings: { ...gameSettings, ...setupContext?.customSettings },
      customBotPersonaIds: isCampaign
        ? (chapter ? [chapter.bots[0].id, chapter.bots[1].id, chapter.bots[2].id] : null)
        : (setupContext?.customBotPersonaIds ?? (effectiveGameNumber > 1 ? botPersonaIds : null)),
      customBotConfigs: isCampaign
        ? (chapter ? [chapter.bots[0], chapter.bots[1], chapter.bots[2]] : null)
        : (setupContext?.customBotConfigs ?? (effectiveGameNumber > 1 ? customBotConfigs : null)),
      campaignChapter: chapter || null,
      playerCount: isCampaign ? 4 : (playerCount ?? null),
      ...setupContext
    });

    // 3. Đồng bộ lại cấu hình chuẩn vào Stores
    if (isCampaign && chapter) {
      setCurrentCampaignChapter(chapter);
      setActiveGameType('CAMPAIGN');
    }
    setGameRules(setup.rules);
    setGameSettings(setup.settings);
    setBotPersonaIds(setup.botPersonaIds);
    setCustomBotConfigs(setup.customBotConfigs);
    setPlayerCount(setup.playerCount);

    // 3.1. Tính toán và Tạm giữ tiền cọc an toàn (Buy-in Deposit)
    const currentProfile = useUserStore.getState().profile;
    const penaltyMultiplier = setup.rules.chopping.multiplier || setup.rules.cong.multiplier || 1;
    const tableBetAmount = setup.rules.table.betAmount || 0;
    const targetDeposit = calculateRequiredDeposit(tableBetAmount, penaltyMultiplier);

    let actualDeposit = 0;
    if (tableBetAmount > 0) {
      // Chỉ chặn nếu người chơi thực sự không đủ tiền đặt cược tối thiểu
      if (currentProfile.coins < tableBetAmount) {
        openModal('BANK');
        return;
      }

      actualDeposit = Math.min(currentProfile.coins, targetDeposit);
      const postDepositCoins = currentProfile.coins - actualDeposit;
      const updatedProfile = {
        ...currentProfile,
        coins: postDepositCoins
      };
      setProfile(updatedProfile);
      savePlayerProfile(updatedProfile);
    }

    // Lưu Active Session vào IndexedDB phòng trường hợp F5 / Thoát đột ngột
    saveActiveMatchSession({
      gameId: `match_${Date.now()}`,
      gameType: activeGameType,
      mode: setup.settings.mode,
      gameNumber: effectiveGameNumber,
      depositAmount: actualDeposit,
      betAmount: tableBetAmount,
      penaltyMultiplier: penaltyMultiplier !== undefined ? penaltyMultiplier : null,
      activeGameType: activeGameType,
      playerCount: setup.playerCount,
      isRanked: activeGameType === 'QUICK',
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    // Kích hoạt mô phỏng ngầm song song cho các bot rảnh rỗi (tự động phân bổ ngẫu nhiên bot thi đấu và bot nghỉ ngơi)
    if (effectiveGameNumber > 1 && activeGameType !== 'CAMPAIGN' && tableBetAmount > 0) {
      try {
        useEcosystemStore.getState().prepareMatchEcosystem(currentProfile.elo, tableBetAmount);
      } catch {}
    }

    // 4. Giữ lại người chơi và số tiền nếu là ván tiếp theo trong cùng bàn
    let initialPlayers = setup.initialPlayers;

    if (effectiveGameNumber > 1 && engineRef.current) {
      const prevEngine = engineRef.current;
      const betAmount = setup.settings.betAmount || 100;

      initialPlayers = initialPlayers.map((p, idx) => {
        const prevPlayer = prevEngine.getPlayer(p.id);
        let prevScore = prevPlayer ? prevPlayer.score : p.score;

        // Đối với người chơi (p0): Luôn đồng bộ chuẩn xác với tổng số dư thực tế
        if (p.id === 'p0') {
          prevScore = currentProfile.coins;
        } else if (isCampaign && p.isBot && prevScore < betAmount) {
          const botIdx = idx - 1;
          const chapterBot = chapter?.bots[botIdx] || setup.customBotConfigs[botIdx];
          prevScore = generateRealisticBotBankroll(chapterBot || {}, betAmount);
        }

        const resolvedPlayer = prevPlayer || p;
        return {
          ...resolvedPlayer,
          hand: [],
          playedCards: [],
          isPassedCurrentRound: false,
          hasPlayedFirstCard: false,
          rankPosition: null,
          instantWinType: null,
          score: prevScore
        };
      });
    }

    // 5. Khởi tạo GameEngine mới
    const engine = new GameEngine(initialPlayers, setup.rules);
    engineRef.current = engine;

    // 6. Khởi tạo CardTracker cho từng Bot
    const newTrackers: Record<string, CardTracker> = {};
    for (const player of engine.players) {
      if (player.isBot) {
        const botConfig = getBotConfig(player.botPersonaId || 'BOT_ELO_1150');
        newTrackers[player.id] = new CardTracker(player.hand, botConfig.memoryDepth);
      }
    }
    trackersRef.current = newTrackers;

    // 7. Bắt đầu ván bài
    const winnerToPreserve = preserveWinnerId || (effectiveGameNumber > 1 ? lastWinnerIdRef.current || undefined : undefined);
    const startResult = engine.startNewGame(effectiveGameNumber, winnerToPreserve);

    const initialDealtCounts: Record<string, number> = {};
    for (const p of engine.players) {
      initialDealtCounts[p.id] = 0;
    }
    setIsDealing(true);
    setDealtCounts(initialDealtCounts);
    setDealBanner(null);

    syncGameState();

    // 8. Xử lý Tới Trắng (Instant Win)
    if (startResult.instantWin && startResult.instantWinType) {
      setInstantWinType(startResult.instantWinType);
      soundManager.playVictory();
      setTimeout(() => {
        handleGameCompletion(engine);
      }, UI_TIMINGS.BANNER_DISPLAY_DURATION_MS);
    }
  }, [
    activeGameType,
    botPersonaIds,
    clearCardSelection,
    currentCampaignChapter,
    customBotConfigs,
    gameSettings,
    handleGameCompletion,
    openModal,
    playerCount,
    profile,
    resetMatchState,
    setActiveGameType,
    setBotPersonaIds,
    setCurrentCampaignChapter,
    setCustomBotConfigs,
    setDealBanner,
    setDealtCounts,
    setGameNumber,
    setGameRules,
    setGameSettings,
    setInstantWinType,
    setIsDealing,
    setIsGameOver,
    setPlayerCount,
    setProfile,
    setWinners,
    syncGameState,
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

  // Vòng Lặp Lượt Đi Của Bot (Bot Turn Loop)
  useEffect(() => {
    if (!engineRef.current || isDealing || isGameOver) return;
    const engine = engineRef.current;

    if (engine.isGameOver) {
      handleGameCompletionRef.current(engine);
      return;
    }

    const currentPlayer = engine.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isBot || currentPlayer.hand.length === 0) {
      setBotThinkingThought(null);
      return;
    }

    const isLead = engine.isRoundLeadMove();
    const leading = engine.getLeadingMove();
    const isFacingHeoOrChop = leading ? (
      leading.combination.type === 'FOUR_OF_A_KIND' ||
      leading.combination.type === 'THREE_PAIRS_SEQUENTIAL' ||
      leading.combination.type === 'FOUR_PAIRS_SEQUENTIAL' ||
      (leading.combination.type === 'SINGLE' && isTwo(leading.combination.highestCard)) ||
      (leading.combination.type === 'PAIR' && isTwo(leading.combination.highestCard))
    ) : false;

    const nextPlayerId = engine.getNextActivePlayerId(currentPlayer.id);
    const nextPlayer = engine.getPlayer(nextPlayerId);
    const isNextOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;

    // Tính toán thời gian suy nghĩ động và biểu cảm tâm lý
    const { delayMs, thoughtText } = calculateDynamicBotDelay(
      {
        isLead,
        leadingMove: leading,
        botHandLength: currentPlayer.hand.length,
        isNextOneCard,
        hasValidMoves: true,
        isFacingHeoOrChop
      },
      gameSpeed
    );

    setBotThinkingThought({ botId: currentPlayer.id, text: thoughtText });

    const timer = setTimeout(() => {
      setBotThinkingThought(null);
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
            result.isCascadeChop || false,
            result.chopChainCount || 1
          );
        }
      } else {
        soundManager.playPass();
        const leadingMove = engine.getLeadingMove();
        if (leadingMove) {
          for (const t of Object.values(trackersRef.current)) {
            t.recordPassWithDetails(currentPlayer.id, leadingMove.combination);
          }
        }
      }

      syncGameStateRef.current();
      if (engine.isGameOver) {
        handleGameCompletionRef.current(engine);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [currentTurnPlayerId, isDealing, isGameOver, gameSpeed, setBotThinkingThought]);

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
          chopped?.name || 'Đối thủ', 
          penalty,
          moveRes.isCascadeChop || false,
          moveRes.chopChainCount || 1
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
    triggerChopAlert,
    triggerQuestToastIfNewlyCompleted
  ]);

  // Xử lý khi người chơi xác nhận bỏ cuộc (Forfeit)
  const handleForfeitMatch = useCallback(() => {
    if (activeGameType === 'ONLINE' || useGameStore.getState().activeGameType === 'ONLINE') {
      useOnlineStore.getState().leaveRoom();
    }

    const session = getActiveMatchSession();
    clearActiveMatchSession();

    if (session) {
      let updatedProfile = { ...profile };
      if (session.isRanked) {
        const nextElo = Math.max(0, profile.elo - ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY);
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
    OpponentProfiler.getInstance().reset();
    resetMatchState();
    closeAllModals();
    setCurrentScreen('LOBBY');
  }, [profile, setProfile, setCurrentScreen, closeAllModals, resetMatchState, activeGameType]);

  // Người chơi bấm nút "Về Sảnh" trên HeaderBar
  const handleRequestReturnToLobby = useCallback(() => {
    if (activeGameType === 'ONLINE' || useGameStore.getState().activeGameType === 'ONLINE') {
      useOnlineStore.getState().leaveRoom();
      clearActiveMatchSession();
      engineRef.current = null;
      trackersRef.current = {};
      lastWinnerIdRef.current = null;
      OpponentProfiler.getInstance().reset();
      resetMatchState();
      closeAllModals();
      setCurrentScreen('LOBBY');
      return;
    }

    if (engineRef.current && !engineRef.current.isGameOver) {
      const session = getActiveMatchSession();
      setForfeitData({
        depositAmount: session?.depositAmount || 0,
        eloPenalty: ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY,
        isRanked: activeGameType === 'QUICK'
      });
      openModal('CONFIRM_FORFEIT');
    } else {
      clearActiveMatchSession();
      engineRef.current = null;
      trackersRef.current = {};
      lastWinnerIdRef.current = null;
      OpponentProfiler.getInstance().reset();
      resetMatchState();
      closeAllModals();
      setCurrentScreen('LOBBY');
    }
  }, [activeGameType, openModal, setForfeitData, setCurrentScreen, resetMatchState, closeAllModals]);

  // Bắt đầu ván tiếp theo (Next Game / Rematch)
  const handleNextGame = useCallback(() => {
    closeModal('VICTORY');
    const betAmount = gameSettings.betAmount || 0;
    const liveCoins = useUserStore.getState().profile.coins;
    const currentGameType = useGameStore.getState().activeGameType;

    if (currentGameType !== 'CAMPAIGN' && currentGameType !== 'ONLINE' && betAmount > 0 && liveCoins < betAmount) {
      openModal('BANK');
      return;
    }

    if (currentGameType === 'ONLINE') {
      if (useOnlineStore.getState().isHost) {
        useOnlineStore.getState().startMatch();
      }
      return;
    }

    const currentNumber = useGameStore.getState().gameNumber;
    if (currentGameType === 'CAMPAIGN') {
      if (campaignResultMeta?.isUnlockedNext && campaignResultMeta.nextChapter) {
        startNewGame(1, { campaignChapter: campaignResultMeta.nextChapter });
      } else {
        startNewGame(currentNumber + 1);
      }
    } else {
      // Ván tiếp theo trong bàn, người về Nhất ván trước được quyền đi trước
      startNewGame(currentNumber + 1);
    }
  }, [closeModal, gameSettings.betAmount, openModal, campaignResultMeta, startNewGame]);

  return {
    engineRef,
    trackersRef,
    campaignResultMeta,
    startNewGame,
    handleNextGame,
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
