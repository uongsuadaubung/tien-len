import { MctsSolver } from '../mcts-solver';
import { CardTracker } from '../card-tracker';
import {
  MctsWorkerRequestSchema,
  type MctsWorkerResponse
} from '../../engine/schemas/worker.schema';

// Lắng nghe yêu cầu tính toán từ Main Thread
self.onmessage = (event: MessageEvent<unknown>) => {
  const parseResult = MctsWorkerRequestSchema.safeParse(event.data);
  if (!parseResult.success) {
    return;
  }

  const { id, botId, botHand, candidateMoves, playedCardIds, remainingPlayerCards, simulationsCount } = parseResult.data;

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
