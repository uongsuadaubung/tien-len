import { Card, Combination, Rank } from './types';
import { compareCards, sortCards } from './card';

/**
 * Lớp trừu tượng định nghĩa Bộ Nhận Diện Tổ Hợp (Chain of Responsibility Pattern)
 */
export abstract class CombinationRecognizer {
  protected nextRecognizer: CombinationRecognizer | null = null;

  public setNext(recognizer: CombinationRecognizer): CombinationRecognizer {
    this.nextRecognizer = recognizer;
    return recognizer;
  }

  public abstract recognize(sorted: Card[]): Combination | null;

  protected passToNext(sorted: Card[]): Combination | null {
    if (this.nextRecognizer) {
      return this.nextRecognizer.recognize(sorted);
    }
    return null;
  }
}

// 1. Nhận diện Lá Rác (Single)
export class SingleRecognizer extends CombinationRecognizer {
  public recognize(sorted: Card[]): Combination | null {
    if (sorted.length === 1) {
      return {
        type: 'SINGLE',
        cards: sorted,
        highestCard: sorted[0],
        length: 1
      };
    }
    return this.passToNext(sorted);
  }
}

// 2. Nhận diện Đôi (Pair)
export class PairRecognizer extends CombinationRecognizer {
  public recognize(sorted: Card[]): Combination | null {
    if (sorted.length === 2) {
      if (sorted[0].rank === sorted[1].rank) {
        return {
          type: 'PAIR',
          cards: sorted,
          highestCard: sorted[1],
          length: 2
        };
      }
      return null;
    }
    return this.passToNext(sorted);
  }
}

// 3. Nhận diện Sám Cô (Triple)
export class TripleRecognizer extends CombinationRecognizer {
  public recognize(sorted: Card[]): Combination | null {
    if (sorted.length === 3) {
      if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
        return {
          type: 'TRIPLE',
          cards: sorted,
          highestCard: sorted[2],
          length: 3
        };
      }
    }
    return this.passToNext(sorted);
  }
}

// 4. Nhận diện Tứ Quý (Four of a Kind)
export class FourOfAKindRecognizer extends CombinationRecognizer {
  public recognize(sorted: Card[]): Combination | null {
    if (sorted.length === 4) {
      if (
        sorted[0].rank === sorted[1].rank &&
        sorted[1].rank === sorted[2].rank &&
        sorted[2].rank === sorted[3].rank
      ) {
        return {
          type: 'FOUR_OF_A_KIND',
          cards: sorted,
          highestCard: sorted[3],
          length: 4
        };
      }
    }
    return this.passToNext(sorted);
  }
}

// 5. Nhận diện Đôi Thông (Sequential Pairs: 3, 4, 5 Đôi Thông)
export class SequentialPairsRecognizer extends CombinationRecognizer {
  public recognize(sorted: Card[]): Combination | null {
    const len = sorted.length;
    if (len >= 6 && len % 2 === 0) {
      const pairCount = len / 2;
      let isSequentialPairs = true;
      const pairRanks: Rank[] = [];

      for (let i = 0; i < len; i += 2) {
        if (sorted[i].rank !== sorted[i + 1].rank) {
          isSequentialPairs = false;
          break;
        }
        pairRanks.push(sorted[i].rank);
      }

      if (isSequentialPairs) {
        // Đôi thông không được chứa quân 2 (rank 15)
        if (pairRanks[pairRanks.length - 1] === 15) {
          isSequentialPairs = false;
        } else {
          // Kiểm tra tính liên tiếp của các đôi
          for (let i = 0; i < pairRanks.length - 1; i++) {
            if (pairRanks[i + 1] !== pairRanks[i] + 1) {
              isSequentialPairs = false;
              break;
            }
          }
        }

        if (isSequentialPairs) {
          const highestCard = sorted[sorted.length - 1];
          if (pairCount === 3) {
            return {
              type: 'THREE_PAIRS_SEQUENTIAL',
              cards: sorted,
              highestCard,
              length: 6
            };
          } else if (pairCount === 4) {
            return {
              type: 'FOUR_PAIRS_SEQUENTIAL',
              cards: sorted,
              highestCard,
              length: 8
            };
          } else if (pairCount === 5) {
            return {
              type: 'FIVE_PAIRS_SEQUENTIAL',
              cards: sorted,
              highestCard,
              length: 10
            };
          }
        }
      }
    }
    return this.passToNext(sorted);
  }
}

// 6. Nhận diện Sảnh (Straight >= 3 lá)
export class StraightRecognizer extends CombinationRecognizer {
  public recognize(sorted: Card[]): Combination | null {
    const len = sorted.length;
    if (len >= 3) {
      // Sảnh không được chứa 2 (Heo)
      if (sorted[len - 1].rank === 15) {
        return this.passToNext(sorted);
      }

      let isStraight = true;
      for (let i = 0; i < len - 1; i++) {
        if (sorted[i + 1].rank !== sorted[i].rank + 1) {
          isStraight = false;
          break;
        }
      }

      if (isStraight) {
        return {
          type: 'STRAIGHT',
          cards: sorted,
          highestCard: sorted[len - 1],
          length: len
        };
      }
    }
    return this.passToNext(sorted);
  }
}

/**
 * Xây dựng chuỗi nhận diện tổ hợp bài hoàn chỉnh
 */
export function buildCombinationRecognitionChain(): CombinationRecognizer {
  const single = new SingleRecognizer();
  const pair = new PairRecognizer();
  const triple = new TripleRecognizer();
  const fourOfAKind = new FourOfAKindRecognizer();
  const seqPairs = new SequentialPairsRecognizer();
  const straight = new StraightRecognizer();

  single
    .setNext(pair)
    .setNext(triple)
    .setNext(fourOfAKind)
    .setNext(seqPairs)
    .setNext(straight);

  return single;
}

const DEFAULT_RECOGNITION_CHAIN = buildCombinationRecognitionChain();

/**
 * Phân tích và nhận diện danh sách các lá bài thuộc kiểu tổ hợp nào trong Tiến Lên Miền Nam
 */
export function identifyCombination(cards: Card[]): Combination | null {
  if (!cards || cards.length === 0) return null;
  const sorted = sortCards(cards);
  return DEFAULT_RECOGNITION_CHAIN.recognize(sorted);
}

/**
 * So sánh 2 lá bài bất kỳ theo luật Tiến Lên Miền Nam
 */
export function isBeating(candidate: Combination, target: Combination): boolean {
  // 1. Cùng kiểu tổ hợp thông thường
  if (candidate.type === target.type) {
    if (candidate.type === 'STRAIGHT') {
      if (candidate.length !== target.length) return false;
      return compareCards(candidate.highestCard, target.highestCard) > 0;
    }
    return compareCards(candidate.highestCard, target.highestCard) > 0;
  }

  // 2. Chặt Heo đơn (1 lá 2)
  if (target.type === 'SINGLE' && target.highestCard.rank === 15) {
    if (candidate.type === 'THREE_PAIRS_SEQUENTIAL') return true;
    if (candidate.type === 'FOUR_OF_A_KIND') return true;
    if (candidate.type === 'FOUR_PAIRS_SEQUENTIAL') return true;
    return false;
  }

  // 3. Chặt Đôi Heo (2 lá 2)
  if (target.type === 'PAIR' && target.highestCard.rank === 15) {
    if (candidate.type === 'FOUR_OF_A_KIND') return true;
    if (candidate.type === 'FOUR_PAIRS_SEQUENTIAL') return true;
    return false;
  }

  // 4. Chặt 3 Đôi Thông
  if (target.type === 'THREE_PAIRS_SEQUENTIAL') {
    if (candidate.type === 'FOUR_OF_A_KIND') return true;
    if (candidate.type === 'FOUR_PAIRS_SEQUENTIAL') return true;
    return false;
  }

  // 5. Chặt Tứ Quý
  if (target.type === 'FOUR_OF_A_KIND') {
    if (candidate.type === 'FOUR_PAIRS_SEQUENTIAL') return true;
    return false;
  }

  return false;
}
