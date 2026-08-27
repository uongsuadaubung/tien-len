import { Card, CombinationType } from '../../engine/types';
import { isTwo } from '../../engine/card';
import { CardTracker } from '../card-tracker';

export interface OpponentActionObservation {
  playerId: string;
  type: 'PLAY' | 'PASS';
  combinationType?: CombinationType;
  highestRank?: number;
  straightLength?: number;
  cardsCount?: number;
}

/**
 * ============================================================================
 * BAYESIAN CARD INFERENCE ENGINE (MẠNG SUY LUẬN XÁC SUẤT BAYES ĐOÁN BÀI ẨN)
 * Tính toán phân phối xác suất có điều kiện P(Lá bài c thuộc tay Đối thủ i | Lịch sử đánh/bỏ lượt)
 * ============================================================================
 */
export class BayesianCardInferenceEngine {
  /**
   * Tính toán trọng số xác suất cho từng lá bài chưa lộ thuộc về một đối thủ
   */
  public static calculatePlayerCardWeights(
    playerId: string,
    unseenCards: Card[],
    tracker: CardTracker
  ): Map<string, number> {
    const weights = new Map<string, number>();
    const passedTypes = tracker.getOpponentWeaknessCombos(playerId);

    for (const card of unseenCards) {
      let w = 1.0;

      // 1. Phân tích lá Heo (2)
      if (isTwo(card)) {
        const twoSafety = tracker.getTwoSafetyReport();
        // Nếu đối thủ từng bỏ lượt khi người khác đánh lá đơn nhỏ hoặc trung bình:
        // Khả năng đối thủ không muốn xả Heo sớm hoặc không có Heo
        if (twoSafety.unseenTwosCount > 0) {
          w *= 1.2;
        }
      }

      // 2. Phân tích dựa trên các lần bỏ lượt lá đơn (Single Pass History)
      if (passedTypes.has('SINGLE')) {
        // Nếu đối thủ từng bỏ lượt khi bài đánh ra là lá nhỏ (< 10)
        // Xác suất đối thủ có các lá bài đơn mạnh hơn bị giảm
        if (card.rank >= 11 && !isTwo(card)) {
          w *= 0.65;
        }
      }

      // 3. Phân tích dựa trên các lần bỏ lượt Đôi (Pair Pass History)
      if (passedTypes.has('PAIR')) {
        // Khả năng lá bài này nằm trong một Đôi trên tay đối thủ bị giảm
        w *= 0.8;
      }

      // 4. Phân tích dựa trên các lần bỏ lượt Sảnh (Straight Pass History)
      if (passedTypes.has('STRAIGHT')) {
        if (card.rank >= 5 && card.rank <= 12) {
          w *= 0.85;
        }
      }

      // Trọng số tối thiểu để tránh xác suất bằng 0
      weights.set(card.id, Math.max(0.1, Number(w.toFixed(3))));
    }

    return weights;
  }

  /**
   * Lấy mẫu phân phối bài ẩn có trọng số Bayes (Weighted PIMC Determinization)
   * Thay thế việc chia bài ngẫu nhiên đồng đều trong MCTS
   */
  public static sampleWeightedHands(
    unseenCards: Card[],
    remainingCounts: Record<string, number>,
    tracker: CardTracker,
    activePlayerIds: string[]
  ): Record<string, Card[]> {
    const sampledHands: Record<string, Card[]> = {};
    const availablePool = [...unseenCards];

    for (const pid of activePlayerIds) {
      sampledHands[pid] = [];
    }

    // Tính ma trận trọng số xác suất cho từng người chơi
    const playerWeightsMap: Record<string, Map<string, number>> = {};
    for (const pid of activePlayerIds) {
      playerWeightsMap[pid] = this.calculatePlayerCardWeights(pid, availablePool, tracker);
    }

    // Chia bài theo phân phối trọng số Bayes cho đến khi đủ số lá của từng người
    for (const pid of activePlayerIds) {
      const neededCount = remainingCounts[pid] || 0;
      const playerWeight = playerWeightsMap[pid];

      while (sampledHands[pid].length < neededCount && availablePool.length > 0) {
        // Tính tổng trọng số của các lá bài còn lại trong Pool
        let totalWeight = 0;
        for (const c of availablePool) {
          totalWeight += playerWeight.get(c.id) || 1.0;
        }

        // Quay số xác suất Roulette Wheel Selection
        let randomVal = Math.random() * totalWeight;
        let selectedIndex = 0;

        for (let i = 0; i < availablePool.length; i++) {
          const cardWeight = playerWeight.get(availablePool[i].id) || 1.0;
          randomVal -= cardWeight;
          if (randomVal <= 0) {
            selectedIndex = i;
            break;
          }
        }

        const pickedCard = availablePool.splice(selectedIndex, 1)[0];
        sampledHands[pid].push(pickedCard);
      }
    }

    return sampledHands;
  }
}
