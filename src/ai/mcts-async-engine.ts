import { Card, Combination } from '../engine/types';
import { CardTracker } from './card-tracker';
import { MctsEvaluation } from './types';
import { MctsSolver } from './mcts-solver';

export interface ScaledMctsOptions {
  simulationsCount: number;
  maxCandidates: number;
  batchSize?: number;
  useWorkerIfAvailable?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMctsWorkerResponse(data: unknown): data is { id: string; evaluations: MctsEvaluation[] } {
  if (!isRecord(data)) return false;
  return typeof data.id === 'string' && Array.isArray(data.evaluations);
}

/**
 * Scaled ISMCTS Engine - Động cơ mô phỏng Monte Carlo đa kịch bản chuyên sâu
 * Tối ưu hóa hiệu năng tính toán, hỗ trợ Web Worker đa luồng và Fallback Synchronous
 */
export class ScaledMctsEngine {
  private static workerInstance: Worker | null = null;
  private static pendingCallbacks = new Map<string, (evals: MctsEvaluation[]) => void>();

  private static getOrCreateWorker(): Worker | null {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }
    if (!ScaledMctsEngine.workerInstance) {
      try {
        ScaledMctsEngine.workerInstance = new Worker(
          new URL('./workers/mcts.worker.ts', import.meta.url),
          { type: 'module' }
        );
        ScaledMctsEngine.workerInstance.onmessage = (event: MessageEvent<unknown>) => {
          if (isMctsWorkerResponse(event.data)) {
            const callback = ScaledMctsEngine.pendingCallbacks.get(event.data.id);
            if (callback) {
              ScaledMctsEngine.pendingCallbacks.delete(event.data.id);
              callback(event.data.evaluations);
            }
          }
        };
      } catch {
        ScaledMctsEngine.workerInstance = null;
      }
    }
    return ScaledMctsEngine.workerInstance;
  }

  /**
   * Đánh giá danh sách nước đi ứng viên qua Web Worker (nếu có) hoặc bất đồng bộ nhường luồng
   */
  public static async evaluateMovesAsync(
    botId: string,
    botHand: Card[],
    candidateMoves: { cards: Card[]; combination: Combination; isChop: boolean }[],
    tracker: CardTracker,
    remainingPlayerCards: Record<string, number>,
    options: ScaledMctsOptions = { simulationsCount: 100, maxCandidates: 10, batchSize: 25, useWorkerIfAvailable: true }
  ): Promise<MctsEvaluation[]> {
    if (candidateMoves.length === 0 || options.simulationsCount <= 0) {
      return [];
    }

    const sims = Math.max(10, Math.min(1000, options.simulationsCount));
    const worker = (options.useWorkerIfAvailable !== false) ? ScaledMctsEngine.getOrCreateWorker() : null;

    if (worker) {
      const reqId = `mcts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const playedCardIds = tracker.getPlayedCardIds();

      return new Promise<MctsEvaluation[]>((resolve) => {
        ScaledMctsEngine.pendingCallbacks.set(reqId, resolve);
        worker.postMessage({
          id: reqId,
          botId,
          botHand,
          candidateMoves,
          playedCardIds,
          remainingPlayerCards,
          simulationsCount: sims
        });
      });
    }

    // Fallback: Chạy theo từng batch và nhường luồng (yielding) để UI luôn giữ 60 FPS
    const batchSize = options.batchSize ?? 25;
    const batches = Math.ceil(sims / batchSize);

    const candidateMap = new Map<string, {
      candidate: { cards: Card[]; combination: Combination; isChop: boolean };
      totalWins: number;
      totalSims: number;
    }>();

    for (const cand of candidateMoves) {
      const key = cand.cards.map(c => c.id).sort().join('_');
      candidateMap.set(key, { candidate: cand, totalWins: 0, totalSims: 0 });
    }

    for (let b = 0; b < batches; b++) {
      const currentSims = Math.min(batchSize, sims - b * batchSize);
      if (currentSims <= 0) break;

      const evaluations = MctsSolver.evaluateCandidateMoves(
        botId,
        botHand,
        candidateMoves,
        tracker,
        remainingPlayerCards,
        currentSims
      );

      for (const ev of evaluations) {
        const key = ev.moveCards.map(c => c.id).sort().join('_');
        const entry = candidateMap.get(key);
        if (entry) {
          entry.totalWins += Math.round(ev.winRate * ev.simulationsCount);
          entry.totalSims += ev.simulationsCount;
        }
      }

      if (typeof window !== 'undefined' && batches > 1) {
        await new Promise<void>(res => {
          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(() => res());
          } else {
            setTimeout(res, 0);
          }
        });
      }
    }

    const results: MctsEvaluation[] = [];
    for (const entry of candidateMap.values()) {
      results.push({
        moveCards: entry.candidate.cards,
        combination: entry.candidate.combination,
        winRate: entry.totalSims > 0 ? entry.totalWins / entry.totalSims : 0,
        simulationsCount: entry.totalSims
      });
    }

    return results.sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * Phiên bản thực thi đồng bộ tối ưu hóa cao
   */
  public static evaluateMovesSync(
    botId: string,
    botHand: Card[],
    candidateMoves: { cards: Card[]; combination: Combination; isChop: boolean }[],
    tracker: CardTracker,
    remainingPlayerCards: Record<string, number>,
    simulationsCount: number = 60
  ): MctsEvaluation[] {
    return MctsSolver.evaluateCandidateMoves(
      botId,
      botHand,
      candidateMoves,
      tracker,
      remainingPlayerCards,
      simulationsCount
    );
  }
}
