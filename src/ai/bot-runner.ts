import { GameEngine } from '../engine/game';
import { BotDecisionTelemetry } from '../engine/match-logger';
import { PlayedMove } from '../engine/types';
import { makeBotDecision, createDecisionContext } from './decision-maker';
import { BotConfig } from './types';
import { CardTracker } from './card-tracker';

export type BotTurnResult =
  | {
      readonly action: 'PLAY';
      readonly playerId: string;
      readonly playedMove: PlayedMove;
      readonly isChop: boolean;
      readonly choppedPlayerId: string | null;
      readonly penaltyAmount: number;
      readonly isCascadeChop: boolean;
      readonly chopChainCount: number;
      readonly chopChainTotalAmount: number;
      readonly isGameOver: boolean;
      readonly botDecisionDetails: BotDecisionTelemetry | null;
    }
  | {
      readonly action: 'PASS';
      readonly playerId: string;
      readonly isGameOver: boolean;
      readonly botDecisionDetails: BotDecisionTelemetry | null;
    };

/**
 * Thực thi lượt đi của bot trên GameEngine:
 * 1. Thu thập context trận đấu từ GameEngine
 * 2. Yêu cầu AI đưa ra quyết định (makeBotDecision)
 * 3. Chuyển quyết định thành lệnh hợp lệ gửi tới GameEngine (playMove / passTurn)
 * Fail-fast ngay nếu bot đưa ra nước đi không hợp lệ, tuyệt đối không giấu lỗi bằng fallback giả tạo.
 */
export function executeBotTurn(
  game: GameEngine,
  botConfig: BotConfig,
  tracker: CardTracker
): BotTurnResult {
  const currentPlayer = game.getCurrentPlayer();
  if (!currentPlayer) {
    throw new Error('[executeBotTurn] Cannot execute bot turn: no current player found');
  }
  if (!currentPlayer.isBot || currentPlayer.hand.length === 0) {
    return {
      action: 'PASS',
      playerId: currentPlayer.id,
      isGameOver: game.isGameOver,
      botDecisionDetails: null
    };
  }

  const playerId = currentPlayer.id;
  const isLead = game.isRoundLeadMove();
  const leading = game.getLeadingMove();
  const remainingCardsMap = game.players.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.id]: p.hand.length }),
    {}
  );
  const nextPlayerId = game.getNextActivePlayerId(playerId);
  const nextPlayer = game.getPlayer(nextPlayerId);
  const isNextPlayerOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;
  const prohibitEndingWithTwo = game.rules.gameFlow.prohibitEndingWithTwo;

  const decision = makeBotDecision(
    createDecisionContext({
      hand: currentPlayer.hand,
      currentRoundLeadingMove: leading,
      isFirstMoveOfGame: game.isFirstMoveOfGame,
      firstMoveRequiredCard: game.firstMoveRequiredCard,
      isLeadMove: isLead,
      tracker,
      config: { ...botConfig, id: playerId },
      remainingPlayerCards: remainingCardsMap,
      isNextPlayerOneCard,
      nextPlayerId,
      rules: game.rules,
      hasPlayedFirstCard: currentPlayer.hasPlayedFirstCard,
      prohibitEndingWithTwo,
      gameMode: game.rules.settlementRule,
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    })
  );

  if (decision.type === 'PLAY' && decision.cards.length > 0) {
    const moveRes = game.playMove(playerId, [...decision.cards], decision.telemetry ?? null);
    if (!moveRes.success) {
      throw new Error(`[executeBotTurn] Bot ${playerId} played invalid move: ${moveRes.error}`);
    }
    return {
      action: 'PLAY',
      playerId,
      playedMove: moveRes.playedMove,
      isChop: moveRes.isChop,
      choppedPlayerId: moveRes.choppedPlayerId,
      penaltyAmount: moveRes.penaltyAmount,
      isCascadeChop: moveRes.isCascadeChop,
      chopChainCount: moveRes.chopChainCount,
      chopChainTotalAmount: moveRes.chopChainTotalAmount,
      isGameOver: game.isGameOver,
      botDecisionDetails: decision.telemetry ?? null
    };
  }

  const passRes = game.passTurn(playerId, decision.telemetry ?? null);
  if (!passRes.success) {
    throw new Error(`[executeBotTurn] Bot ${playerId} cannot pass turn: ${passRes.error}`);
  }
  return {
    action: 'PASS',
    playerId,
    isGameOver: game.isGameOver,
    botDecisionDetails: decision.telemetry ?? null
  };
}
