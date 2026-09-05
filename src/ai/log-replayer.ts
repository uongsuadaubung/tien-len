import { Card, PlayedMove, createDefaultGameRules } from '../engine/types';
import { CardTracker } from './card-tracker';
import { getBotConfig } from './bot-factory';
import { DecisionContext, BotDecision, makeBotDecision, createDecisionContext } from './decision-maker';
import { MatchLogReport } from '../engine/match-logger';

export interface TurnReplayResult {
  turnNumber: number;
  playerId: string;
  loggedAction: 'PLAY' | 'PASS';
  loggedCards?: Card[];
  loggedReason: string | null;
  loggedStrategy: string | null;
  reproducedDecision: BotDecision;
  isActionMatched: boolean;
  context: DecisionContext;
}

/**
 * Tái hiện lại bối cảnh và chạy lại quyết định của Bot AI tại một lượt đấu bất kỳ từ file Log JSON.
 */
export function replayTurnDecisionFromLog(
  report: MatchLogReport,
  turnNumber: number
): TurnReplayResult {
  const turnIndex = report.turns.findIndex(t => t.turnNumber === turnNumber);
  if (turnIndex === -1) {
    throw new Error(`[LogReplayer] Không tìm thấy lượt đánh #${turnNumber} trong báo cáo trận đấu.`);
  }

  const turnEntry = report.turns[turnIndex];
  const config = getBotConfig(turnEntry.botPersonaId || 'BOT_ELO_1150');

  // 1. Dựng lại bộ nhớ bài (CardTracker) từ đầu trận đến trước lượt hiện tại
  const tracker = new CardTracker(turnEntry.handBeforeTurn, config.memoryDepth);
  for (let i = 0; i < turnIndex; i++) {
    const prevTurn = report.turns[i];
    if (prevTurn.action === 'PLAY' && prevTurn.cardsPlayed && prevTurn.combination) {
      if (prevTurn.playerId !== turnEntry.playerId) {
        const move: PlayedMove = prevTurn.isChop && prevTurn.choppedPlayerId
          ? {
              playerId: prevTurn.playerId,
              combination: prevTurn.combination,
              timestamp: prevTurn.timestamp,
              isChop: true,
              choppedPlayerId: prevTurn.choppedPlayerId,
              penaltyAmount: prevTurn.penaltyAmount ?? 0,
              isCascadeChop: false,
              chopChainCount: 1,
              chopChainTotalAmount: prevTurn.penaltyAmount ?? 0
            }
          : {
              playerId: prevTurn.playerId,
              combination: prevTurn.combination,
              timestamp: prevTurn.timestamp,
              isChop: false
            };
        tracker.recordMove(move);
      }
    }
  }

  // 2. Tính số lượng bài còn lại của các đối thủ tại thời điểm này
  const remainingPlayerCards: Record<string, number> = {};
  for (const p of report.players) {
    remainingPlayerCards[p.id] = p.initialHand.length;
  }
  for (let i = 0; i < turnIndex; i++) {
    const prevTurn = report.turns[i];
    if (prevTurn.action === 'PLAY' && prevTurn.cardsPlayed) {
      remainingPlayerCards[prevTurn.playerId] -= prevTurn.cardsPlayed.length;
    }
  }
  delete remainingPlayerCards[turnEntry.playerId];

  // 3. Dựng lại ngữ cảnh ra quyết định (DecisionContext)
  const isFirstMove = turnNumber === 1;
  const isLeadMove = turnEntry.isLeadMove;

  const playerIds = report.players.map(p => p.id);
  const currentIdx = playerIds.indexOf(turnEntry.playerId);
  const nextPlayerId = playerIds[(currentIdx + 1) % playerIds.length] || playerIds[0] || '';
  const isNextPlayerOneCard = (remainingPlayerCards[nextPlayerId] ?? 13) === 1;

  const context: DecisionContext = createDecisionContext({
    hand: [...turnEntry.handBeforeTurn],
    currentRoundLeadingMove: turnEntry.leadingMoveBeforeTurn,
    isFirstMoveOfGame: isFirstMove,
    isLeadMove,
    tracker,
    config,
    remainingPlayerCards,
    nextPlayerId,
    rules: report.rules || createDefaultGameRules(),
    hasPlayedFirstCard: turnEntry.handBeforeTurn.length < 13,
    isNextPlayerOneCard,
    prohibitEndingWithTwo: report.rules?.gameFlow?.prohibitEndingWithTwo ?? true,
    gameMode: report.gameMode || 'COUNT_CARDS',
    mctsMap: null,
    compositeRuleStrategy: null,
    opponentProfiles: null
  });

  // 4. Thực thi lại quyết định
  const reproducedDecision = makeBotDecision(context);

  // 5. So sánh kết quả
  const isActionMatched = (
    reproducedDecision.type === turnEntry.action &&
    (
      turnEntry.action === 'PASS' ||
      (
        turnEntry.action === 'PLAY' &&
        reproducedDecision.type === 'PLAY' &&
        reproducedDecision.cards.length === turnEntry.cardsPlayed.length &&
        reproducedDecision.cards.every(c => turnEntry.cardsPlayed!.some(tc => tc.id === c.id))
      )
    )
  );

  return {
    turnNumber,
    playerId: turnEntry.playerId,
    loggedAction: turnEntry.action,
    loggedCards: turnEntry.action === 'PLAY' ? turnEntry.cardsPlayed : undefined,
    loggedReason: turnEntry.botDecision?.chosenReason || null,
    loggedStrategy: turnEntry.botDecision?.strategyUsed || null,
    reproducedDecision,
    isActionMatched,
    context
  };
}
