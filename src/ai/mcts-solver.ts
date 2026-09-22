import { Card, Combination } from '../engine/types';
import { CardTracker } from './card-tracker';
import { MctsEvaluation } from './types';
import { wasmEvaluateCandidateMovesMcts } from '../engine/wasm-bridge';

/**
 * Information Set Monte Carlo Rollout Engine (ISMCTS)
 * Ước lượng tỷ lệ thắng của các nước đi ứng viên bằng mô phỏng ngẫu nhiên qua Rust WASM Native
 */
export class MctsSolver {
  /**
   * Chạy mô phỏng Monte Carlo đa thế bài cho danh sách nước đi ứng viên (Rust Native WASM Rollout)
   */
  public static evaluateCandidateMoves(
    botId: string,
    botHand: Card[],
    candidateMoves: { cards: Card[]; combination: Combination; isChop: boolean }[],
    tracker: CardTracker,
    remainingPlayerCards: Record<string, number>,
    simulationsCount: number = 30
  ): MctsEvaluation[] {
    if (candidateMoves.length === 0 || simulationsCount <= 0) {
      return [];
    }

    const playedCardIds = tracker.getPlayedCardIds();
    return wasmEvaluateCandidateMovesMcts(
      botId,
      botHand,
      candidateMoves,
      playedCardIds,
      remainingPlayerCards,
      simulationsCount,
      Date.now()
    );
  }
}
