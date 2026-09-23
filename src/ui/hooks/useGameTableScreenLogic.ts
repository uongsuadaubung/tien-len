import { useMemo, useCallback } from 'react';
import { soundManager } from '../audio/sound-manager';
import { MatchPlayer, Card, PlayedMove } from '../../engine/types';
import { BotConfig } from '../../ai/types';
import type { ChopNotificationInfo, BotThinkingInfo } from '../../engine/state-machine/types';
import { computeRelativeTableSeats } from '../../engine/seating';
import { projectTableFrame } from '../../engine/presentation/table-frame-projector';
import type { TableRenderFrame } from '../../engine/presentation/frame-types';
import type { MoveHint } from '../../ai/hint-engine';
import { CardTracker } from '../../ai/card-tracker';
import type { QuickSelectCandidate } from '../../engine/quick-response-finder';
import type { OpeningReason, ReconnectNotice } from '../../engine/network/network.schema';

// Stores
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { useViewStore } from '../../stores/useViewStore';
import { useOnlineStore } from '../../stores/useOnlineStore';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';

export interface UseGameTableScreenLogicProps {
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
}

export interface GameTableScreenLogicResult {
  myPlayerIndex: number;
  localPlayer: MatchPlayer;
  isMyTurn: boolean;
  selectedCards: Card[];
  isValidPlaySelection: boolean;
  canPassTurn: boolean;
  isSolo1v1: boolean;
  playerCount: number;
  botPersonaIds: [string, string, string];
  customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
  topBot: MatchPlayer | null;
  leftBot: MatchPlayer | null;
  rightBot: MatchPlayer | null;
  quickSelectCandidates: QuickSelectCandidate[];
  quickSelectCandidatesCount: number;
  canQuickSelect: boolean;
  currentHint: MoveHint | null;
  activeAiHint: MoveHint | null;
  handleQuickSelect: () => void;
  handlePlayCards: () => void;
  handlePassTurnAction: () => void;
  handleOpenXRay: () => void;
  handleToggleCardSelect: (cardId: string) => void;
  handleClearCardSelection: () => void;
  // MatchState derived properties
  isDealing: boolean;
  isPlaying: boolean;
  dealtCounts: Readonly<Record<string, number>>;
  dealBanner: string | null;
  openingReason: OpeningReason | null;
  reconnectNotice: ReconnectNotice | null;
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  currentMove: PlayedMove | null;
  chopNotification: ChopNotificationInfo | null;
  botThinkingThought: BotThinkingInfo | null;
  isLeadMove: boolean;
  isFirstMoveOfGame: boolean;
  firstMoveRequiredCard: Card | null;
  isGameOver: boolean;
}

export function useGameTableScreenLogic({
  onPlaySelectedCards,
  onPassTurn
}: UseGameTableScreenLogicProps): GameTableScreenLogicResult {
  const {
    aiHintEnabled
  } = useSettingsStore();

  const gameStore = useGameStore();
  // Trong môi trường SSR/test (renderToString không có window), useSyncExternalStore trả về initial state
  const state = (typeof window === 'undefined' && useGameStore.getState().matchState.status !== 'WAITING')
    ? useGameStore.getState()
    : gameStore;

  const {
    myPlayerId: storeMyPlayerId,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    players,
    matchState,
    selectedCardIds,
    currentHint,
    gameRules,
    dealtCounts: storeDealtCounts,
    botThinkingThought: storeBotThinkingThought,
    isDealing: storeIsDealing,
    dealBanner: storeDealBanner
  } = state;

  const onlineMyPlayerId = useOnlineStore.getState().myPlayerId;
  const effectiveMyPlayerId = storeMyPlayerId || onlineMyPlayerId;

  // Xác định người chơi cục bộ theo perspective - Invariant Bàn Đấu
  let foundIndex = players.findIndex(p => p.id === effectiveMyPlayerId);
  if (foundIndex === -1 && state.activeGameType === 'ONLINE') {
    foundIndex = players.findIndex(p => p.id === onlineMyPlayerId);
  }
  if (foundIndex === -1) {
    const humanIndex = players.findIndex(p => !p.isBot);
    foundIndex = humanIndex !== -1 ? humanIndex : 0;
  }
  const myPlayerIndex = foundIndex;
  const localPlayer = players[myPlayerIndex];
  if (!localPlayer) {
    throw new Error('[useGameTableScreenLogic] Invariant Violated: Table must have at least 1 valid player');
  }

  // 1. Phân giải trạng thái hiển thị qua Engine Projector (Passive Dumb View)
  // Ưu tiên sử dụng frame tính toán sẵn từ Engine Session (0ms overhead).
  // Chỉ fallback gọi projectTableFrame trong môi trường SSR hoặc mock unit tests không có session.
  const frame: TableRenderFrame = useMemo(() => {
    if (state.currentFrame) {
      return state.currentFrame;
    }
    return projectTableFrame({
      matchState,
      localPlayerId: localPlayer.id,
      localHand: localPlayer.hand,
      selectedCardIds,
      gameRules,
      players,
      dealtCounts: storeDealtCounts,
      currentHint,
      botThinkingThought: storeBotThinkingThought,
      isDealing: storeIsDealing,
      dealBanner: storeDealBanner
    });
  }, [
    state.currentFrame,
    matchState,
    localPlayer.id,
    localPlayer.hand,
    selectedCardIds,
    gameRules,
    players,
    storeDealtCounts,
    currentHint,
    storeBotThinkingThought,
    storeIsDealing,
    storeDealBanner
  ]);

  // Các cờ điều khiển do Engine tính toán 100%, Web UI hoàn toàn không can thiệp logic
  const isMyTurn = frame.controls.isMyTurn;
  const isValidPlaySelection = frame.controls.canPlay;
  const canPassTurn = frame.controls.canPass;
  const canQuickSelect = frame.controls.canQuickSelect;

  const isDealing = frame.isDealing;
  const isPlaying = frame.status === 'PLAYING';
  const dealBanner = frame.dealBanner;
  const openingReason = frame.openingReason;
  const dealtCounts = frame.dealtCounts;
  const reconnectNotice = useOnlineStore(s => s.reconnectNotice);

  const activeTurn = matchState.status === 'PLAYING' ? matchState : null;
  const currentTurnPlayerId = activeTurn ? activeTurn.currentTurnPlayerId : null;
  const leadPlayerId = activeTurn ? activeTurn.leadPlayerId : null;
  const isLeadMove = activeTurn ? activeTurn.isLeadMove : false;
  const isFirstMoveOfGame = activeTurn ? activeTurn.isFirstMoveOfGame : false;
  const firstMoveRequiredCard = (activeTurn && activeTurn.isFirstMoveOfGame) ? activeTurn.firstMoveRequiredCard : null;
  const currentMove = useMemo(() => {
    if (matchState.status === 'PLAYING') {
      return matchState.leadingMove;
    }
    if (matchState.status === 'GAME_OVER') {
      return matchState.winningMove ?? matchState.leadingMove ?? state.currentMove ?? null;
    }
    if (matchState.status === 'ROUND_ENDED') {
      return matchState.lastRoundMoves[matchState.lastRoundMoves.length - 1] ?? null;
    }
    return null;
  }, [matchState, state.currentMove]);

  const isGameOver = matchState.status === 'GAME_OVER' || matchState.status === 'INSTANT_WIN';

  const chopNotification = activeTurn
    ? activeTurn.chopNotification
    : (matchState.status === 'GAME_OVER' ? (matchState.chopNotification ?? null) : null);
  const botThinkingThought = (activeTurn && activeTurn.botThinkingThought) || storeBotThinkingThought || null;

  const selectedCards = localPlayer.hand.filter(c => c && selectedCardIds.has(c.id));
  const quickSelectCandidatesCount = frame.controls.quickSelectCandidatesCount ?? (canQuickSelect ? 1 : 0);
  const quickSelectCandidates: QuickSelectCandidate[] = [];

  const activeAiHint = aiHintEnabled ? frame.aiHint : null;

  const handleQuickSelect = useCallback(() => {
    const session = appFlowCoordinator.getActiveSession();
    if (session) {
      session.sendIntent({ type: 'TRIGGER_QUICK_SELECT' });
    } else {
      appFlowCoordinator.quickSelect();
    }
    soundManager.playCardDeal();
  }, []);

  const handleOpenXRay = useCallback(() => {
    const tracker = appFlowCoordinator.getPlayerTracker(localPlayer.id) ?? new CardTracker(localPlayer.hand, 1.0);
    useViewStore.getState().openModal({
      type: 'XRAY',
      tracker,
      ownHand: localPlayer.hand
    });
  }, [localPlayer.id, localPlayer.hand]);

  // Phân bổ ghế tương đối theo góc nhìn (perspective) của localPlayer
  const relativeSeats = useMemo(() => computeRelativeTableSeats(localPlayer.id, players), [localPlayer.id, players]);
  const isSolo1v1 = relativeSeats.isSolo1v1;
  const topBot = relativeSeats.topPlayer;
  const leftBot = relativeSeats.leftPlayer;
  const rightBot = relativeSeats.rightPlayer;

  const handlePlayCards = useCallback(() => {
    onPlaySelectedCards();
  }, [onPlaySelectedCards]);

  const handlePassTurnAction = useCallback(() => {
    onPassTurn();
  }, [onPassTurn]);

  const handleToggleCardSelect = useCallback((cardId: string) => {
    useGameStore.getState().toggleCardSelect(cardId);
    const session = appFlowCoordinator.getActiveSession();
    if (session) {
      const nextIds = useGameStore.getState().selectedCardIds;
      session.sendIntent({ type: 'SET_SELECTED_CARDS', cardIds: Array.from(nextIds) });
    }
  }, []);

  const handleClearCardSelection = useCallback(() => {
    useGameStore.getState().clearCardSelection();
    const session = appFlowCoordinator.getActiveSession();
    if (session) {
      session.sendIntent({ type: 'CLEAR_SELECTION' });
    }
  }, []);

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
    quickSelectCandidates,
    quickSelectCandidatesCount,
    canQuickSelect,
    currentHint,
    activeAiHint,
    handleQuickSelect,
    handlePlayCards,
    handlePassTurnAction,
    handleOpenXRay,
    handleToggleCardSelect,
    handleClearCardSelection,
    isDealing,
    isPlaying,
    dealtCounts,
    dealBanner,
    openingReason,
    reconnectNotice,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    chopNotification,
    botThinkingThought,
    isLeadMove,
    isFirstMoveOfGame,
    firstMoveRequiredCard,
    isGameOver
  };
}
