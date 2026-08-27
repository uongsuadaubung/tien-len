import { Card, Combination, Rank } from '../engine/types';
import { isTwo, sortCards } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { HandPartition } from './types';

/**
 * Tìm tất cả các tổ hợp tiềm năng (Sảnh, Hàng, Tứ quý, Sám, Đôi) có thể tạo được từ tập bài
 */
function findAllCandidateCombinations(cards: Card[], optimality: number = 1.0): Combination[] {
  const candidates: Combination[] = [];
  const sorted = sortCards(cards);

  // 1. Tìm Tứ Quý & Sám Cô & Đôi
  const rankMap = new Map<Rank, Card[]>();
  for (const card of sorted) {
    if (!rankMap.has(card.rank)) rankMap.set(card.rank, []);
    rankMap.get(card.rank)!.push(card);
  }

  for (const [, group] of rankMap.entries()) {
    if (group.length === 4 && optimality >= 0.6) {
      const combo = identifyCombination(group);
      if (combo) candidates.push(combo);
    }
    if (group.length >= 3 && optimality >= 0.5) {
      // 3 lá
      for (let i = 0; i < group.length - 2; i++) {
        for (let j = i + 1; j < group.length - 1; j++) {
          for (let k = j + 1; k < group.length; k++) {
            const combo = identifyCombination([group[i], group[j], group[k]]);
            if (combo) candidates.push(combo);
          }
        }
      }
    }
    if (group.length >= 2) {
      // 2 lá (Mọi bot đều nhận diện được đôi)
      for (let i = 0; i < group.length - 1; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const combo = identifyCombination([group[i], group[j]]);
          if (combo) candidates.push(combo);
        }
      }
    }
  }

  // Nếu trình độ thấp (< 0.6), bot không nhìn thấy sảnh phức tạp hay đôi thông
  if (optimality < 0.6) {
    return candidates;
  }

  // 2. Tìm Sảnh (Độ dài từ 3 đến 12, không chứa 2)
  const nonTwos = sorted.filter(c => !isTwo(c));
  const distinctRanks = Array.from(new Set(nonTwos.map(c => c.rank))).sort((a, b) => a - b);

  for (let startIdx = 0; startIdx < distinctRanks.length; startIdx++) {
    const consecutive: Rank[] = [distinctRanks[startIdx]];
    for (let nextIdx = startIdx + 1; nextIdx < distinctRanks.length; nextIdx++) {
      if (distinctRanks[nextIdx] === consecutive[consecutive.length - 1] + 1) {
        consecutive.push(distinctRanks[nextIdx]);
        if (consecutive.length >= 3) {
          const sampleCards: Card[] = [];
          let validStraight = true;
          for (const r of consecutive) {
            const cardOfRank = nonTwos.find(c => c.rank === r);
            if (cardOfRank) sampleCards.push(cardOfRank);
            else { validStraight = false; break; }
          }
          if (validStraight) {
            const straightCombo = identifyCombination(sampleCards);
            if (straightCombo) candidates.push(straightCombo);
          }
        }
      } else {
        break;
      }
    }
  }

  // 3. Tìm Đôi Thông (Chỉ bot trình độ cao >= 0.75 mới nhận diện và gom đôi thông)
  if (optimality >= 0.75) {
    const pairsByRank = new Map<Rank, Card[]>();
    for (const [rank, group] of rankMap.entries()) {
      if (group.length >= 2 && rank !== 15) {
        pairsByRank.set(rank, [group[0], group[1]]);
      }
    }

    const pairRanks = Array.from(pairsByRank.keys()).sort((a, b) => a - b);
    for (let startIdx = 0; startIdx < pairRanks.length; startIdx++) {
      const consecutivePairs: Card[] = [...pairsByRank.get(pairRanks[startIdx])!];
      let lastRank = pairRanks[startIdx];

      for (let nextIdx = startIdx + 1; nextIdx < pairRanks.length; nextIdx++) {
        const curRank = pairRanks[nextIdx];
        if (curRank === lastRank + 1) {
          consecutivePairs.push(...pairsByRank.get(curRank)!);
          lastRank = curRank;

          if (consecutivePairs.length === 6 || consecutivePairs.length === 8 || consecutivePairs.length === 10) {
            const seqCombo = identifyCombination(consecutivePairs);
            if (seqCombo) candidates.push(seqCombo);
          }
        } else {
          break;
        }
      }
    }
  }

  return candidates;
}

/**
 * Đánh giá điểm số của tổ hợp (Càng nhiều lá, càng quý thì điểm càng cao)
 */
function evaluateCombinationScore(combo: Combination): number {
  switch (combo.type) {
    case 'FIVE_PAIRS_SEQUENTIAL':
      return 800;
    case 'FOUR_PAIRS_SEQUENTIAL':
      return 600;
    case 'FOUR_OF_A_KIND':
      return 400;
    case 'THREE_PAIRS_SEQUENTIAL':
      return 300;
    case 'STRAIGHT':
      return 15 + combo.length * 8;
    case 'TRIPLE':
      return 40;
    case 'PAIR':
      return 22;
    default:
      return 0;
  }
}

/**
 * Phân rã bài tối ưu bằng tìm kiếm vét cạn thông minh
 */
export function partitionHand(hand: Card[], optimality: number = 1.0): HandPartition {
  const sorted = sortCards(hand);
  if (sorted.length === 0) {
    return { combinations: [], trashCards: [], totalScore: 0 };
  }

  let bestPartition: HandPartition = {
    combinations: [],
    trashCards: sorted,
    totalScore: -sorted.length * 15
  };

  function search(
    remainingCards: Card[],
    currentCombos: Combination[],
    currentScore: number
  ) {
    const trashScore = remainingCards.reduce((acc, c) => {
      return acc + (isTwo(c) ? 10 : -15);
    }, 0);

    // Turns-to-Finish Metric: Cực tiểu hóa số lượt đánh cần thiết để xả sạch bài
    const numberOfTurns = currentCombos.length + remainingCards.length;
    const turnsEfficiencyBonus = (hand.length - numberOfTurns) * 12 * optimality;

    const totalScore = currentScore + trashScore + turnsEfficiencyBonus;

    if (totalScore > bestPartition.totalScore) {
      bestPartition = {
        combinations: [...currentCombos],
        trashCards: remainingCards,
        totalScore
      };
    }

    const availableCandidates = findAllCandidateCombinations(remainingCards, optimality);

    for (const candidate of availableCandidates) {
      const candidateCardIds = new Set(candidate.cards.map(c => c.id));
      const nextRemaining = remainingCards.filter(c => !candidateCardIds.has(c.id));
      const comboScore = evaluateCombinationScore(candidate);

      search(nextRemaining, [...currentCombos, candidate], currentScore + comboScore);
    }
  }

  search(sorted, [], 0);

  return bestPartition;
}
