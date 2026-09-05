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

export interface BluffPassOptions {
  activeOpponentsCount?: number;
  gameMode?: string;
  hasFreeTrashBeat?: boolean;
  minOpponentCards?: number;
}

/**
 * Kiểm tra xem người chơi có Hàng chặt Heo hay không (Tứ Quý, 3 Đôi Thông, 4 Đôi Thông)
 */
function checkBombsInHand(hand: Card[]): { hasFourOfAKind: boolean; hasThreePairsSeq: boolean; hasFourPairsSeq: boolean } {
  const rankCount = new Map<number, number>();
  for (const c of hand) {
    if (!isTwo(c)) {
      rankCount.set(c.rank, (rankCount.get(c.rank) ?? 0) + 1);
    }
  }
  let hasFourOfAKind = false;
  const pairRanks: number[] = [];
  for (const [rank, count] of rankCount.entries()) {
    if (count === 4) hasFourOfAKind = true;
    if (count >= 2) pairRanks.push(rank);
  }
  pairRanks.sort((a, b) => a - b);

  let maxConsecutivePairs = 1;
  let currentConsecutive = 1;
  for (let i = 1; i < pairRanks.length; i++) {
    if (pairRanks[i] === pairRanks[i - 1] + 1) {
      currentConsecutive++;
      if (currentConsecutive > maxConsecutivePairs) {
        maxConsecutivePairs = currentConsecutive;
      }
    } else {
      currentConsecutive = 1;
    }
  }
  const hasThreePairsSeq = maxConsecutivePairs >= 3;
  const hasFourPairsSeq = maxConsecutivePairs >= 4;

  return { hasFourOfAKind, hasThreePairsSeq, hasFourPairsSeq };
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
    remainingPlayerCardsCount: number,
    options?: BluffPassOptions
  ): { shouldBluffPass: boolean; reason: string } {
    // Chỉ các Bot bậc cao (Tier 4 / Tier 5 Elo >= 1600) mới có khả năng Bluff Pass
    if (botConfig.elo < 1600 || !leadingMove) {
      return { shouldBluffPass: false, reason: '' };
    }

    const leadType = leadingMove.combination.type;
    // 1. CHỈ bluff pass đối với bài LẺ (SINGLE) hoặc ĐÔI (PAIR).
    // Tuyệt đối không bluff pass với Sám cô (TRIPLE), Sảnh (STRAIGHT), v.v. vì Heo/Hàng không thể chặt các bộ này.
    if (leadType !== 'SINGLE' && leadType !== 'PAIR') {
      return { shouldBluffPass: false, reason: '' };
    }

    const activeOpponents = options?.activeOpponentsCount ?? 3;
    const isSolo = activeOpponents === 1;

    // 2. Không bluff khi bất kỳ đối thủ nào trên bàn sắp hết bài:
    // - Bàn đông người: <= 4 lá là có nguy cơ đối thủ xả 1 nhát hết bài (Sảnh, Sám, Đôi).
    // - Solo 1v1: <= 5 lá là cực kỳ nguy hiểm, đối thủ cầm cái sẽ xả sạch về Nhất.
    const dangerThreshold = isSolo ? 5 : 4;
    const effectiveOpponentCards = options?.minOpponentCards !== undefined
      ? Math.min(remainingPlayerCardsCount, options.minOpponentCards)
      : remainingPlayerCardsCount;

    if (effectiveOpponentCards <= dangerThreshold) {
      return { shouldBluffPass: false, reason: '' };
    }

    // 3. Trong chế độ ĐẾM LÁ (COUNT_CARDS):
    // Phạt tiền theo số lá tồn, thối Heo nhân hệ số cao. Cấm bluff pass nếu bot còn nhiều bài (>= 6 lá)
    // hoặc đối thủ còn ít bài (<= 6 lá).
    const isCountCards = options?.gameMode === 'COUNT_CARDS';
    if (isCountCards && (hand.length >= 6 || effectiveOpponentCards <= 6)) {
      return { shouldBluffPass: false, reason: '' };
    }

    // 4. Nếu Bot có lá rác đơn lẻ (free trash) đè vừa khít (khoảng cách rank nhỏ) mà không phá bộ:
    // Tẩu rác và ép đối thủ phải tung bài to tốt hơn nhiều so với việc nhịn bài thụ động.
    if (options?.hasFreeTrashBeat) {
      return { shouldBluffPass: false, reason: '' };
    }

    const bombs = checkBombsInHand(hand);
    const hasAnyBomb = bombs.hasFourOfAKind || bombs.hasThreePairsSeq || bombs.hasFourPairsSeq;
    const hasPairOfTwos = hand.filter(isTwo).length >= 2;
    const hasBigTwos = hand.some(c => isTwo(c) && (c.suit === 'HEARTS' || c.suit === 'DIAMONDS'));

    // 5. Điều kiện giữ Hàng / Heo tương ứng với loại bài:
    if (leadType === 'SINGLE') {
      // Đơn: Phải có Heo to (Đỏ) hoặc có Hàng chặt đơn
      if (!hasBigTwos && !hasAnyBomb) {
        return { shouldBluffPass: false, reason: '' };
      }
    } else if (leadType === 'PAIR') {
      // Đôi: Phải có Đôi Heo hoặc Tứ Quý / 4 Đôi Thông (những tổ hợp chặt được Đôi Heo)
      const canChopPairOfTwos = bombs.hasFourOfAKind || bombs.hasFourPairsSeq;
      if (!hasPairOfTwos && !canChopPairOfTwos) {
        return { shouldBluffPass: false, reason: '' };
      }
    }

    // 6. Trong Solo 1v1: Bỏ lượt là 100% trao quyền cầm cái cho đối thủ.
    // Chỉ cho phép bluff pass trong Solo khi Bot đang giấu Hàng chặt Heo thực sự (Tứ Quý / Đôi Thông),
    // không bluff pass khi chỉ cầm Heo đơn lẻ.
    if (isSolo && !hasAnyBomb) {
      return { shouldBluffPass: false, reason: '' };
    }

    // 7. Tính toán xác suất Bluff Pass theo tính cách đối thủ & Trap Tendency
    // Chỉ bluff khi quân bài của đối thủ là bài trung bình (rank <= 11: 3..J)
    if (leadingMove.combination.highestCard.rank <= 11) {
      const isGreedyTarget = (opponentProfile?.heoGreedRate ?? 0.5) > 0.6;
      let bluffThreshold = (botConfig.trapTendency * 0.35) + (isGreedyTarget ? 0.15 : 0.0);

      // Trong COUNT_CARDS, giảm xác suất bluff 60% vì rủi ro đếm lá
      if (isCountCards) {
        bluffThreshold *= 0.4;
      }

      // Trong Solo 1v1, giảm xác suất bluff 50%
      if (isSolo) {
        bluffThreshold *= 0.5;
      }

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
