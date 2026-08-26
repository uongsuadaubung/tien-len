import { Card, GameRules, createDefaultGameRules } from '../engine/types';
import { CardTracker } from './card-tracker';
import { BotConfig } from './types';
import { getBotConfig } from './bot-factory';
import { DecisionContext, BotDecision, makeBotDecision } from './decision-maker';
import { MatchLogReport } from '../engine/match-logger';

export interface TurnReplayResult {
  turnNumber: number;
  playerId: string;
  loggedAction: 'PLAY' | 'PASS';
  loggedCards: Card[] | null;
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
    throw new Error(`Không tìm thấy lượt đấu số ${turnNumber} trong MatchLogReport.`);
  }

  const turnEntry = report.turns[turnIndex];
  const player = report.players.find(p => p.id === turnEntry.playerId);
  const botPersonaId = turnEntry.botPersonaId || player?.botPersonaId || 'BOT_ELO_1750';
  const config: BotConfig = getBotConfig(botPersonaId as any);

  // 1. Tái thiết lập CardTracker theo lịch sử các lá bài đã xuất hiện trước lượt này
  const tracker = new CardTracker(turnEntry.handBeforeTurn, config.memoryDepth);
  for (let i = 0; i < turnIndex; i++) {
    const prevTurn = report.turns[i];
    if (prevTurn.action === 'PLAY' && prevTurn.cardsPlayed && prevTurn.combination) {
      if (prevTurn.playerId !== turnEntry.playerId) {
        tracker.recordMove({
          playerId: prevTurn.playerId,
          combination: prevTurn.combination,
          timestamp: prevTurn.timestamp
        });
      }
    }
  }

  // 2. Tính toán số lá còn lại của từng người chơi tại thời điểm của lượt này
  const remainingPlayerCards: Record<string, number> = {};
  if (turnEntry.botDecision?.remainingOpponentCards) {
    Object.assign(remainingPlayerCards, turnEntry.botDecision.remainingOpponentCards);
    remainingPlayerCards[turnEntry.playerId] = turnEntry.handBeforeTurn.length;
  } else {
    // Dự phòng: Tính dựa trên bài ban đầu và các lá đã đánh
    report.players.forEach(p => {
      let count = p.initialHand.length;
      for (let i = 0; i < turnIndex; i++) {
        const prevTurn = report.turns[i];
        if (prevTurn.playerId === p.id && prevTurn.action === 'PLAY' && prevTurn.cardsPlayed) {
          count -= prevTurn.cardsPlayed.length;
        }
      }
      remainingPlayerCards[p.id] = count;
    });
  }

  // 3. Xác định người kế tiếp
  const activePlayerIds = report.players
    .filter(p => remainingPlayerCards[p.id] > 0)
    .map(p => p.id);
  const currentIdx = activePlayerIds.indexOf(turnEntry.playerId);
  const nextPlayerId = activePlayerIds[(currentIdx + 1) % activePlayerIds.length] || 'p1';
  const isNextPlayerOneCard = remainingPlayerCards[nextPlayerId] === 1;

  // 4. Khởi dựng DecisionContext chính xác tuyệt đối
  const context: DecisionContext = {
    hand: [...turnEntry.handBeforeTurn],
    currentRoundLeadingMove: turnEntry.leadingMoveBeforeTurn,
    isFirstMoveOfGame: turnIndex === 0,
    isLeadMove: turnEntry.isLeadMove,
    tracker,
    config,
    remainingPlayerCards,
    nextPlayerId,
    rules: report.rules || createDefaultGameRules(),
    hasPlayedFirstCard: true,
    isNextPlayerOneCard,
    prohibitEndingWithTwo: report.rules?.gameFlow?.prohibitEndingWithTwo ?? true,
    gameMode: report.gameMode || 'TRADITIONAL',
    mctsMap: null,
    compositeRuleStrategy: null,
    opponentProfiles: null
  };

  // 5. Chạy lại quyết định của AI
  const reproducedDecision = makeBotDecision(context);

  const isActionMatched = (
    reproducedDecision.type === turnEntry.action &&
    (
      (reproducedDecision.cards === null && turnEntry.cardsPlayed === null) ||
      (
        reproducedDecision.cards !== null &&
        turnEntry.cardsPlayed !== null &&
        reproducedDecision.cards.length === turnEntry.cardsPlayed.length &&
        reproducedDecision.cards.every(c => turnEntry.cardsPlayed!.some(tc => tc.id === c.id))
      )
    )
  );

  return {
    turnNumber,
    playerId: turnEntry.playerId,
    loggedAction: turnEntry.action,
    loggedCards: turnEntry.cardsPlayed,
    loggedReason: turnEntry.botDecision?.chosenReason || null,
    loggedStrategy: turnEntry.botDecision?.strategyUsed || null,
    reproducedDecision,
    isActionMatched,
    context
  };
}
