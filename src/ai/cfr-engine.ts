import { Card, PlayedMove } from '../engine/types';
import { isTwo } from '../engine/card';
import { BotConfig } from './types';
import { OpponentBehaviorProfile } from './opponent-profiler';

export interface ActionProbabilities {
  readonly [actionKey: string]: number;
}

export interface CfrInfoSetData {
  regretSum: Record<string, number>;
  strategySum: Record<string, number>;
}

/**
 * Counterfactual Regret Minimization (CFR) & Regret-Matching Policy Engine
 * Ứng dụng lý thuyết trò chơi không hoàn hảo (Game Theory) để tính toán cân bằng Nash và Bluffing
 */
export class CfrEngine {
  private static instance: CfrEngine | null = null;
  private infoSets = new Map<string, CfrInfoSetData>();

  public static getInstance(): CfrEngine {
    if (!CfrEngine.instance) {
      CfrEngine.instance = new CfrEngine();
    }
    return CfrEngine.instance;
  }

  /**
   * Tính toán phân phối xác suất hành động theo thuật toán Regret Matching
   */
  public getStrategy(infoSetKey: string, legalActions: readonly string[]): ActionProbabilities {
    if (legalActions.length === 0) {
      return {};
    }
    if (legalActions.length === 1) {
      return { [legalActions[0]]: 1.0 };
    }

    let infoSet = this.infoSets.get(infoSetKey);
    if (!infoSet) {
      infoSet = { regretSum: {}, strategySum: {} };
      for (const act of legalActions) {
        infoSet.regretSum[act] = 0;
        infoSet.strategySum[act] = 0;
      }
      this.infoSets.set(infoSetKey, infoSet);
    }

    let normalizingSum = 0;
    const strategy: Record<string, number> = {};

    for (const act of legalActions) {
      const positiveRegret = Math.max(0, infoSet.regretSum[act] ?? 0);
      strategy[act] = positiveRegret;
      normalizingSum += positiveRegret;
    }

    // Nếu tổng regret <= 0, chia đều xác suất (Uniform Strategy)
    if (normalizingSum > 0) {
      for (const act of legalActions) {
        strategy[act] = (strategy[act] ?? 0) / normalizingSum;
      }
    } else {
      const uniformProb = 1.0 / legalActions.length;
      for (const act of legalActions) {
        strategy[act] = uniformProb;
      }
    }

    // Tích lũy strategySum
    for (const act of legalActions) {
      infoSet.strategySum[act] = (infoSet.strategySum[act] ?? 0) + (strategy[act] ?? 0);
    }

    return strategy;
  }

  /**
   * Cập nhật Regret sau khi quan sát kết quả ván đấu
   */
  public updateRegret(infoSetKey: string, action: string, counterfactualRegret: number): void {
    let infoSet = this.infoSets.get(infoSetKey);
    if (!infoSet) {
      infoSet = { regretSum: {}, strategySum: {} };
      this.infoSets.set(infoSetKey, infoSet);
    }
    infoSet.regretSum[action] = (infoSet.regretSum[action] ?? 0) + counterfactualRegret;
  }

  /**
   * Lấy mẫu hành động (Action Sampling) ngẫu nhiên theo phân phối xác suất
   */
  public sampleAction(strategy: ActionProbabilities, randomRoll: number = Math.random()): string {
    const actions = Object.keys(strategy);
    if (actions.length === 0) return 'PASS';
    if (actions.length === 1) return actions[0];

    let cumulative = 0;
    for (const act of actions) {
      cumulative += strategy[act] ?? 0;
      if (randomRoll <= cumulative) {
        return act;
      }
    }

    return actions[actions.length - 1];
  }

  /**
   * Đánh giá chiến thuật Nhịn Bài Tung Hỏa Mù (Bluff Pass)
   * Khi Bot đang cầm Hàng (Tứ Quý / 3 Đôi Thông) hoặc Heo To, chủ động Bỏ Lượt để lừa đối thủ xả Heo
   */
  public evaluateBluffPass(
    hand: Card[],
    leadingMove: PlayedMove | null,
    targetPlayerId: string,
    opponentProfile: OpponentBehaviorProfile | null,
    botConfig: BotConfig,
    remainingPlayerCardsCount: number
  ): { shouldBluffPass: boolean; reason: string } {
    // Chỉ các Bot bậc cao (Tier 4 / Tier 5 Elo >= 1600) mới có khả năng Bluff Pass
    if (botConfig.elo < 1600 || !leadingMove) {
      return { shouldBluffPass: false, reason: '' };
    }

    // Không bluff khi đối thủ sắp hết bài (<= 2 lá)
    if (remainingPlayerCardsCount <= 2) {
      return { shouldBluffPass: false, reason: '' };
    }

    // 1. Kiểm tra nếu đối thủ là người thích giữ Heo và nhát tay (heoGreedRate cao)
    const isGreedyTarget = (opponentProfile?.heoGreedRate ?? 0.5) > 0.6;
    const hasBigTwosOrChopHang = hand.some(c => isTwo(c) && (c.suit === 'HEARTS' || c.suit === 'DIAMONDS'));

    // 2. Nếu đối thủ ra lá bài trung bình (9, 10, J) mà bot cầm Át/Heo, có 20-35% xác suất nhịn để bẫy Heo
    if (hasBigTwosOrChopHang && leadingMove.combination.highestCard.rank <= 11) {
      const bluffThreshold = (botConfig.trapTendency * 0.4) + (isGreedyTarget ? 0.2 : 0.0);
      const roll = Math.random();

      if (roll < bluffThreshold) {
        return {
          shouldBluffPass: true,
          reason: `[CFR Bluff] Chủ động nhịn bài đối thủ ${targetPlayerId} để gài bẫy nhử Heo lớn.`
        };
      }
    }

    return { shouldBluffPass: false, reason: '' };
  }

  public reset(): void {
    this.infoSets.clear();
  }
}
