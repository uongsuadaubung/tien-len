import React, { useMemo, useCallback } from 'react';
import { GameEngine } from '../../engine/game';
import { isValidMove } from '../../engine/validator';
import { evaluateSelectionFeedback, MoveHint } from '../../ai/hint-engine';
import { CardTracker } from '../../ai/card-tracker';
import { 
  getSortedQuickSelectCandidates, 
  getNextQuickSelectCards, 
  QuickSelectCandidate 
} from '../../engine/quick-response-finder';
import { soundManager } from '../audio/sound-manager';
import { Player, Card } from '../../engine/types';
import { BotConfig } from '../../ai/types';

// Stores
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { useOnlineStore } from '../../stores/useOnlineStore';

export interface UseGameTableScreenLogicProps {
  engineRef: React.RefObject<GameEngine | null>;
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
}

export interface GameTableScreenLogicResult {
  isOnlineMatch: boolean;
  myPlayerIndex: number;
  p0: Player | null;
  isMyTurn: boolean;
  selectedCards: Card[];
  isValidPlaySelection: boolean;
  canP0Pass: boolean;
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
}

export function useGameTableScreenLogic({
  engineRef,
  onPlaySelectedCards,
  onPassTurn
}: UseGameTableScreenLogicProps): GameTableScreenLogicResult {
  const {
    aiHintEnabled
  } = useSettingsStore();

  const {
    activeGameType,
    myPlayerId,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    isDealing,
    players,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    selectedCardIds,
    currentHint,
    setSelectedCardIds,
    clearCardSelection
  } = useGameStore();

  const isOnlineMatch = activeGameType === 'ONLINE';

  // Xác định người chơi cục bộ theo perspective
  const myPlayerIndex = Math.max(0, players.findIndex(p => p.id === myPlayerId));
  const p0 = players[myPlayerIndex] || (players.length > 0 ? players[0] : null);

  const isMyTurn = currentTurnPlayerId === myPlayerId;
  const selectedCards = p0 !== null ? p0.hand.filter(c => selectedCardIds.has(c.id)) : [];

  const isValidPlaySelection =
    isMyTurn &&
    selectedCards.length > 0 &&
    isValidMove({
      cards: selectedCards,
      target: currentMove !== null ? currentMove.combination : null,
      isFirstMoveOfGame: isOnlineMatch ? false : (engineRef.current !== null ? engineRef.current.isFirstMoveOfGame : false),
      isLeadMove: isOnlineMatch ? (currentMove === null || leadPlayerId === myPlayerId) : (engineRef.current !== null ? engineRef.current.isRoundLeadMove() : true),
      hasPassedRound: p0 !== null ? p0.isPassedCurrentRound : false,
      allowFourPairsCutAnytime: engineRef.current !== null ? engineRef.current.rules.chopping.allowFourPairsCutAnytime : true,
      isFinishingMove: selectedCards.length === (p0 !== null ? p0.hand.length : 0),
      prohibitEndingWithTwo: engineRef.current !== null ? engineRef.current.rules.gameFlow.prohibitEndingWithTwo : true
    }).valid;

  const canP0Pass =
    isMyTurn &&
    !isDealing &&
    currentMove !== null &&
    currentMove.playerId !== myPlayerId;

  // Tính toán danh sách các phương án Chọn Nhanh
  const quickSelectCandidates = useMemo(() => {
    if (engineRef.current === null || !isMyTurn || p0 === null || p0.hand.length === 0) return [];
    const engine = engineRef.current;
    return getSortedQuickSelectCandidates({
      hand: p0.hand,
      leadingMove: engine.getLeadingMove(),
      isLeadMove: engine.isRoundLeadMove(),
      isFirstMoveOfGame: engine.isFirstMoveOfGame,
      allowFourPairsCutAnytime: engine.rules.chopping.allowFourPairsCutAnytime,
      prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
    });
  }, [isMyTurn, p0, currentMove]);

  // Phản hồi nhận xét chiến thuật thời gian thực của Quân Sư
  const activeAiHint = useMemo(() => {
    if (!aiHintEnabled || !isMyTurn || p0 === null || engineRef.current === null) return currentHint;
    if (selectedCards.length === 0) return currentHint;

    const engine = engineRef.current;
    const tracker = new CardTracker(p0.hand, 1.0);

    const feedback = evaluateSelectionFeedback({
      selectedCards,
      hand: p0.hand,
      leadingMove: engine.getLeadingMove(),
      isFirstMoveOfGame: engine.isFirstMoveOfGame,
      isLeadMove: engine.isRoundLeadMove(),
      tracker,
      optimalHint: currentHint,
      prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
    });

    return feedback !== null ? feedback : currentHint;
  }, [aiHintEnabled, isMyTurn, p0, selectedCards, currentHint]);

  const canQuickSelect = isMyTurn && !isDealing && quickSelectCandidates.length > 0;

  const handleQuickSelect = useCallback(() => {
    if (engineRef.current === null || !isMyTurn || p0 === null || p0.hand.length === 0) return;
    const engine = engineRef.current;

    const nextCards = getNextQuickSelectCards(
      {
        hand: p0.hand,
        leadingMove: engine.getLeadingMove(),
        isLeadMove: engine.isRoundLeadMove(),
        isFirstMoveOfGame: engine.isFirstMoveOfGame,
        allowFourPairsCutAnytime: engine.rules.chopping.allowFourPairsCutAnytime,
        prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
      },
      selectedCardIds
    );

    if (nextCards !== null && nextCards.length > 0) {
      setSelectedCardIds(new Set(nextCards.map(c => c.id)));
      soundManager.playCardDeal();
    }
  }, [isMyTurn, p0, selectedCardIds, setSelectedCardIds]);

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
    if (isOnlineMatch) {
      useOnlineStore.getState().sendMoveAction(Array.from(selectedCardIds));
      clearCardSelection();
    } else {
      onPlaySelectedCards();
    }
  }, [isOnlineMatch, selectedCardIds, clearCardSelection, onPlaySelectedCards]);

  const handlePassTurnAction = useCallback(() => {
    if (isOnlineMatch) {
      useOnlineStore.getState().sendPassAction();
      clearCardSelection();
    } else {
      onPassTurn();
    }
  }, [isOnlineMatch, clearCardSelection, onPassTurn]);

  return {
    isOnlineMatch,
    myPlayerIndex,
    p0,
    isMyTurn,
    selectedCards,
    isValidPlaySelection,
    canP0Pass,
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
    handlePassTurnAction
  };
}
