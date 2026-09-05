import { useMemo, useCallback, useEffect } from 'react';
import { isValidMove } from '../../engine/validator';
import { evaluateSelectionFeedback, MoveHint } from '../../ai/hint-engine';
import { CardTracker } from '../../ai/card-tracker';
import { 
  getSortedQuickSelectCandidates, 
  getNextQuickSelectCards, 
  QuickSelectCandidate 
} from '../../engine/quick-response-finder';
import { soundManager } from '../audio/sound-manager';
import { Player, Card, PlayedMove } from '../../engine/types';
import { BotConfig } from '../../ai/types';
import type { ChopNotificationInfo, BotThinkingInfo } from '../../engine/state-machine/types';

// Stores
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { useViewStore } from '../../stores/useViewStore';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';

export interface UseGameTableScreenLogicProps {
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
}

export interface GameTableScreenLogicResult {
  myPlayerIndex: number;
  localPlayer: Player;
  isMyTurn: boolean;
  selectedCards: Card[];
  isValidPlaySelection: boolean;
  canPassTurn: boolean;
  isSolo1v1: boolean;
  playerCount: number;
  botPersonaIds: [string, string, string];
  customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
  topBot: Player | null;
  leftBot: Player | null;
  rightBot: Player | null;
  topBotPersonaId: string;
  topBotCustomConfig: Partial<BotConfig> | null;
  quickSelectCandidates: QuickSelectCandidate[];
  canQuickSelect: boolean;
  currentHint: MoveHint | null;
  activeAiHint: MoveHint | null;
  handleQuickSelect: () => void;
  handlePlayCards: () => void;
  handlePassTurnAction: () => void;
  handleOpenXRay: () => void;
  // MatchState derived properties
  isDealing: boolean;
  isPlaying: boolean;
  dealtCounts: Readonly<Record<string, number>>;
  dealBanner: string | null;
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  currentMove: PlayedMove | null;
  chopNotification: ChopNotificationInfo | null;
  botThinkingThought: BotThinkingInfo | null;
  isLeadMove: boolean;
  isFirstMoveOfGame: boolean;
}

export function useGameTableScreenLogic({
  onPlaySelectedCards,
  onPassTurn
}: UseGameTableScreenLogicProps): GameTableScreenLogicResult {
  const {
    aiHintEnabled
  } = useSettingsStore();

  const {
    myPlayerId,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    players,
    matchState,
    selectedCardIds,
    currentHint,
    gameRules,
    setSelectedCardIds
  } = useGameStore();

  // Xác định người chơi cục bộ theo perspective - Invariant Bàn Đấu
  const myPlayerIndex = Math.max(0, players.findIndex(p => p.id === myPlayerId));
  const localPlayer = players[myPlayerIndex] ?? players[0];
  if (!localPlayer) {
    throw new Error('[useGameTableScreenLogic] Invariant Violated: Table must have at least 1 valid player');
  }

  // Tự động đồng bộ myPlayerId với ID thực tế của localPlayer nếu phát hiện lệch pha
  useEffect(() => {
    if (localPlayer && localPlayer.id && myPlayerId !== localPlayer.id) {
      useGameStore.getState().setMyPlayerId(localPlayer.id);
    }
  }, [localPlayer, myPlayerId]);

  // 1. Phân giải trạng thái theo Type State Pattern (Discriminated Unions)
  const isDealing = matchState.status === 'DEALING';
  const isPlaying = matchState.status === 'PLAYING';
  const dealtCounts = isDealing ? matchState.dealtCounts : {};
  const dealBanner = isDealing ? matchState.dealBanner : null;

  // 2. Khi đang ở trạng thái PLAYING: Lượt chơi và người cầm cái BẢO ĐẢM TỒN TẠI (non-nullable)
  const activeTurn = matchState.status === 'PLAYING' ? matchState : null;
  const currentTurnPlayerId = activeTurn ? activeTurn.currentTurnPlayerId : null;
  const leadPlayerId = activeTurn ? activeTurn.leadPlayerId : null;
  const isLeadMove = activeTurn ? activeTurn.isLeadMove : false;
  const isFirstMoveOfGame = activeTurn ? activeTurn.isFirstMoveOfGame : false;
  const currentMove = activeTurn ? activeTurn.leadingMove : null;
  const chopNotification = activeTurn ? activeTurn.chopNotification : null;
  const botThinkingThought = activeTurn ? activeTurn.botThinkingThought : null;

  // Lượt của tôi: chỉ có thể xảy ra khi trận đấu đang ở trạng thái PLAYING và người chơi trùng khớp
  const isMyTurn = activeTurn !== null && (activeTurn.currentTurnPlayerId === localPlayer.id || activeTurn.currentTurnPlayerId === myPlayerId);
  const selectedCards = localPlayer.hand.filter(c => selectedCardIds.has(c.id));

  const isValidPlaySelection =
    isMyTurn &&
    selectedCards.length > 0 &&
    isValidMove({
      cards: selectedCards,
      target: currentMove !== null ? currentMove.combination : null,
      isFirstMoveOfGame,
      isLeadMove,
      hasPassedRound: localPlayer.isPassedCurrentRound,
      allowFourPairsCutAnytime: gameRules.chopping.allowFourPairsCutAnytime,
      isFinishingMove: selectedCards.length === localPlayer.hand.length,
      prohibitEndingWithTwo: gameRules.gameFlow.prohibitEndingWithTwo
    }).valid;

  // Cho phép bỏ lượt tự do khi đến lượt của mình, trừ lượt mở màn ván đầu tiên bắt buộc phải ra bài
  const canPassTurn = isMyTurn && !isFirstMoveOfGame;

  // Tính toán danh sách các phương án Chọn Nhanh
  const quickSelectCandidates = useMemo(() => {
    if (!isMyTurn || !activeTurn || localPlayer.hand.length === 0) return [];
    return getSortedQuickSelectCandidates({
      hand: localPlayer.hand,
      leadingMove: activeTurn.leadingMove,
      isLeadMove: activeTurn.isLeadMove,
      isFirstMoveOfGame: activeTurn.isFirstMoveOfGame,
      allowFourPairsCutAnytime: gameRules.chopping.allowFourPairsCutAnytime,
      prohibitEndingWithTwo: gameRules.gameFlow.prohibitEndingWithTwo
    });
  }, [isMyTurn, activeTurn, localPlayer.hand, gameRules]);

  // Phản hồi nhận xét chiến thuật thời gian thực của Quân Sư
  const activeAiHint = useMemo(() => {
    if (!aiHintEnabled || !isMyTurn) return currentHint;
    if (selectedCards.length === 0) return currentHint;

    const tracker = appFlowCoordinator.getPlayerTracker(localPlayer.id) ?? new CardTracker(localPlayer.hand, 1.0);

    const feedback = evaluateSelectionFeedback({
      selectedCards,
      hand: localPlayer.hand,
      leadingMove: currentMove,
      isFirstMoveOfGame,
      isLeadMove,
      tracker,
      optimalHint: currentHint,
      prohibitEndingWithTwo: gameRules.gameFlow.prohibitEndingWithTwo
    });

    return feedback !== null ? feedback : currentHint;
  }, [aiHintEnabled, isMyTurn, localPlayer.id, localPlayer.hand, selectedCards, currentHint, currentMove, isFirstMoveOfGame, isLeadMove, gameRules]);

  const canQuickSelect = isMyTurn && quickSelectCandidates.length > 0;

  const handleQuickSelect = useCallback(() => {
    if (!isMyTurn || !activeTurn || localPlayer.hand.length === 0) return;

    const nextCards = getNextQuickSelectCards(
      {
        hand: localPlayer.hand,
        leadingMove: activeTurn.leadingMove,
        isLeadMove: activeTurn.isLeadMove,
        isFirstMoveOfGame: activeTurn.isFirstMoveOfGame,
        allowFourPairsCutAnytime: gameRules.chopping.allowFourPairsCutAnytime,
        prohibitEndingWithTwo: gameRules.gameFlow.prohibitEndingWithTwo
      },
      selectedCardIds
    );

    if (nextCards !== null && nextCards.length > 0) {
      setSelectedCardIds(new Set(nextCards.map(c => c.id)));
      soundManager.playCardDeal();
    }
  }, [isMyTurn, activeTurn, localPlayer.hand, gameRules, selectedCardIds, setSelectedCardIds]);

  const handleOpenXRay = useCallback(() => {
    const tracker = appFlowCoordinator.getPlayerTracker(localPlayer.id);
    if (!tracker) {
      throw new Error('[useGameTableScreenLogic] Invariant: Tracker must be initialized when at game table');
    }
    useViewStore.getState().openModal({
      type: 'XRAY',
      tracker,
      ownHand: localPlayer.hand
    });
  }, [localPlayer.id, localPlayer.hand]);

  // Phân bổ ghế tương đối theo chiều kim đồng hồ quanh bàn
  const isSolo1v1 = playerCount === 2;
  const numPlayers = players.length;
  const topBot = isSolo1v1
    ? (numPlayers >= 2 ? players[(myPlayerIndex + 1) % numPlayers] : null)
    : (numPlayers >= 3 ? players[(myPlayerIndex + 2) % numPlayers] : null);
  const leftBot = isSolo1v1 ? null : (numPlayers >= 2 ? players[(myPlayerIndex + 1) % numPlayers] : null);
  const rightBot = (!isSolo1v1 && numPlayers >= 4) ? players[(myPlayerIndex + 3) % numPlayers] : null;

  const topBotPersonaId = isSolo1v1 ? botPersonaIds[0] : botPersonaIds[1];
  const topBotCustomConfig = isSolo1v1 ? (customBotConfigs[0] || null) : (customBotConfigs[1] || null);

  const handlePlayCards = useCallback(() => {
    onPlaySelectedCards();
  }, [onPlaySelectedCards]);

  const handlePassTurnAction = useCallback(() => {
    onPassTurn();
  }, [onPassTurn]);

  return {
    myPlayerIndex,
    localPlayer,
    isMyTurn,
    selectedCards,
    isValidPlaySelection,
    canPassTurn,
    isSolo1v1,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    topBot,
    leftBot,
    rightBot,
    topBotPersonaId,
    topBotCustomConfig,
    quickSelectCandidates,
    canQuickSelect,
    currentHint,
    activeAiHint,
    handleQuickSelect,
    handlePlayCards,
    handlePassTurnAction,
    handleOpenXRay,
    isDealing,
    isPlaying,
    dealtCounts,
    dealBanner,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    chopNotification,
    botThinkingThought,
    isLeadMove,
    isFirstMoveOfGame
  };
}
