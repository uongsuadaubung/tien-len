import { Card, Combination } from '../../engine/types';
import { MctsEvaluation } from '../types';
import { MctsSolver } from '../mcts-solver';
import { CardTracker } from '../card-tracker';

export interface MctsWorkerRequest {
  readonly id: string;
  readonly botId: string;
  readonly botHand: Card[];
  readonly candidateMoves: { cards: Card[]; combination: Combination; isChop: boolean }[];
  readonly playedCardIds: string[];
  readonly remainingPlayerCards: Record<string, number>;
  readonly simulationsCount: number;
}

export interface MctsWorkerResponse {
  readonly id: string;
  readonly evaluations: MctsEvaluation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMctsWorkerRequest(data: unknown): data is MctsWorkerRequest {
  if (!isRecord(data)) return false;
  return (
    typeof data.id === 'string' &&
    typeof data.botId === 'string' &&
    Array.isArray(data.botHand) &&
    Array.isArray(data.candidateMoves) &&
    Array.isArray(data.playedCardIds) &&
    isRecord(data.remainingPlayerCards) &&
    typeof data.simulationsCount === 'number'
  );
}

// Lắng nghe yêu cầu tính toán từ Main Thread
self.onmessage = (event: MessageEvent<unknown>) => {
  if (!isMctsWorkerRequest(event.data)) {
    return;
  }

  const { id, botId, botHand, candidateMoves, playedCardIds, remainingPlayerCards, simulationsCount } = event.data;

  // Tái tạo CardTracker trong Worker context
  const tracker = new CardTracker(botHand, 1.0);
  for (const cardId of playedCardIds) {
    tracker.recordPlayedCardId(cardId);
  }

  const evaluations = MctsSolver.evaluateCandidateMoves(
    botId,
    botHand,
    candidateMoves,
    tracker,
    remainingPlayerCards,
    simulationsCount
  );

  const response: MctsWorkerResponse = {
    id,
    evaluations
  };

  self.postMessage(response);
};
