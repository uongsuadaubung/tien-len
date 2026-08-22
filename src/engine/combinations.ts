import { Card, Combination, CombinationType, Rank } from './types';
import { compareCards, sortCards } from './card';

/**
 * Phân tích và nhận diện danh sách các lá bài thuộc kiểu tổ hợp nào trong Tiến Lên Miền Nam
 */
export function identifyCombination(cards: Card[]): Combination | null {
  if (!cards || cards.length === 0) return null;

  const sorted = sortCards(cards);
  const len = sorted.length;
  const highestCard = sorted[sorted.length - 1];

  // 1. Lá Rác (Single)
  if (len === 1) {
    return {
      type: 'SINGLE',
      cards: sorted,
      highestCard,
      length: 1
    };
  }

  // 2. Đôi (Pair)
  if (len === 2) {
    if (sorted[0].rank === sorted[1].rank) {
      return {
        type: 'PAIR',
        cards: sorted,
        highestCard,
        length: 2
      };
    }
    return null;
  }

  // 3. Sám Cô (Triple)
  if (len === 3) {
    if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
      return {
        type: 'TRIPLE',
        cards: sorted,
        highestCard,
        length: 3
      };
    }
  }

  // 4. Tứ Quý (Four of a Kind)
  if (len === 4) {
    if (
      sorted[0].rank === sorted[1].rank &&
      sorted[1].rank === sorted[2].rank &&
      sorted[2].rank === sorted[3].rank
    ) {
      return {
        type: 'FOUR_OF_A_KIND',
        cards: sorted,
        highestCard,
        length: 4
      };
    }
  }

  // 5. Kiểm tra Đôi Thông (Sequential Pairs: 3 đôi thông = 6 lá, 4 đôi thông = 8 lá, 5 đôi thông = 10 lá)
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

  // 6. Kiểm tra Sảnh (Straight: độ dài >= 3)
  if (len >= 3) {
    let isStraight = true;
    for (let i = 0; i < len - 1; i++) {
      // Sảnh phải liên tiếp về rank và không được trùng rank
      if (sorted[i + 1].rank !== sorted[i].rank + 1) {
        isStraight = false;
        break;
      }
    }

    // Sảnh KHÔNG ĐƯỢC CHỨA quân 2 (rank 15)
    if (isStraight && sorted[len - 1].rank < 15) {
      return {
        type: 'STRAIGHT',
        cards: sorted,
        highestCard,
        length: len
      };
    }
  }

  return null;
}
