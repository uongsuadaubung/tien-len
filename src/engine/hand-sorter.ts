import { Card, Combination, CombinationType, Rank } from './types';
import { isTwo, sortCards } from './card';
import { identifyCombination } from './combinations';
import { HandPartition } from '../ai/types';

export interface SmartCardGroup {
  id: string;
  type: CombinationType | 'SINGLE';
  name: string;
  cards: Card[];
}

export type PartitionStrategy = 'OPTIMAL_TURNS' | 'BIG_HANDS' | 'MAX_STRAIGHTS';

/**
 * Tìm tất cả các tổ hợp tiềm năng có thể tạo được từ tập bài
 */
function findAllCandidateCombinations(cards: Card[]): Combination[] {
  const candidates: Combination[] = [];
  const sorted = sortCards(cards);

  // 1. Tìm Tứ Quý & Sám Cô & Đôi
  const rankMap = new Map<Rank, Card[]>();
  for (const card of sorted) {
    if (!rankMap.has(card.rank)) rankMap.set(card.rank, []);
    rankMap.get(card.rank)!.push(card);
  }

  for (const [, group] of rankMap.entries()) {
    if (group.length === 4) {
      const combo = identifyCombination(group);
      if (combo) candidates.push(combo);
    }
    if (group.length >= 3) {
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
      for (let i = 0; i < group.length - 1; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const combo = identifyCombination([group[i], group[j]]);
          if (combo) candidates.push(combo);
        }
      }
    }
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

  // 3. Tìm Đôi Thông
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

  return candidates;
}

/**
 * Đánh giá điểm của tổ hợp theo chiến thuật cụ thể
 */
function evaluateCombinationScoreByStrategy(combo: Combination, strategy: PartitionStrategy): number {
  if (strategy === 'BIG_HANDS') {
    switch (combo.type) {
      case 'FIVE_PAIRS_SEQUENTIAL': return 1000;
      case 'FOUR_PAIRS_SEQUENTIAL': return 800;
      case 'FOUR_OF_A_KIND': return 600;
      case 'THREE_PAIRS_SEQUENTIAL': return 500;
      case 'STRAIGHT': return 10 + combo.length * 4;
      case 'TRIPLE': return 25;
      case 'PAIR': return 15;
      default: return 0;
    }
  }

  if (strategy === 'MAX_STRAIGHTS') {
    switch (combo.type) {
      case 'FIVE_PAIRS_SEQUENTIAL': return 800;
      case 'FOUR_PAIRS_SEQUENTIAL': return 600;
      case 'FOUR_OF_A_KIND': return 400;
      case 'THREE_PAIRS_SEQUENTIAL': return 300;
      case 'STRAIGHT': return 30 + combo.length * 25; // Ưu tiên sảnh dài
      case 'TRIPLE': return 35;
      case 'PAIR': return 20;
      default: return 0;
    }
  }

  // Mặc định: OPTIMAL_TURNS (Sạch rác / Cực tiểu hóa số lượt)
  switch (combo.type) {
    case 'FIVE_PAIRS_SEQUENTIAL': return 800;
    case 'FOUR_PAIRS_SEQUENTIAL': return 600;
    case 'FOUR_OF_A_KIND': return 400;
    case 'THREE_PAIRS_SEQUENTIAL': return 300;
    case 'STRAIGHT': return 25 + combo.length * 12;
    case 'TRIPLE': return 40;
    case 'PAIR': return 22;
    default: return 0;
  }
}

/**
 * Tìm phân rã tối ưu theo chiến thuật
 */
function partitionHandByStrategy(hand: Card[], strategy: PartitionStrategy): HandPartition {
  const sorted = sortCards(hand);
  if (sorted.length === 0) {
    return { combinations: [], trashCards: [], totalScore: 0 };
  }

  let bestPartition: HandPartition = {
    combinations: [],
    trashCards: sorted,
    totalScore: -sorted.length * 20
  };

  function search(remainingCards: Card[], currentCombos: Combination[], currentScore: number) {
    const trashPenalty = strategy === 'BIG_HANDS' ? -8 : -20;
    const trashScore = remainingCards.reduce((acc, c) => acc + (isTwo(c) ? 10 : trashPenalty), 0);

    const numberOfTurns = currentCombos.length + remainingCards.length;
    const turnsBonus = (hand.length - numberOfTurns) * (strategy === 'BIG_HANDS' ? 8 : 18);

    const totalScore = currentScore + trashScore + turnsBonus;

    if (totalScore > bestPartition.totalScore) {
      bestPartition = {
        combinations: [...currentCombos],
        trashCards: remainingCards,
        totalScore
      };
    }

    const availableCandidates = findAllCandidateCombinations(remainingCards);

    for (const candidate of availableCandidates) {
      const candidateCardIds = new Set(candidate.cards.map(c => c.id));
      const nextRemaining = remainingCards.filter(c => !candidateCardIds.has(c.id));
      const comboScore = evaluateCombinationScoreByStrategy(candidate, strategy);

      search(nextRemaining, [...currentCombos, candidate], currentScore + comboScore);
    }
  }

  search(sorted, [], 0);
  return bestPartition;
}

/**
 * Chuyển đổi một HandPartition thành danh sách SmartCardGroup[] đã sắp xếp
 */
function convertPartitionToGroups(partition: HandPartition): SmartCardGroup[] {
  const groups: SmartCardGroup[] = [];

  const straightsAndSeqs: Combination[] = [];
  const fourOfAKinds: Combination[] = [];
  const triples: Combination[] = [];
  const pairs: Combination[] = [];

  for (const combo of partition.combinations) {
    switch (combo.type) {
      case 'DRAGON_STRAIGHT':
      case 'FIVE_PAIRS_SEQUENTIAL':
      case 'FOUR_PAIRS_SEQUENTIAL':
      case 'THREE_PAIRS_SEQUENTIAL':
      case 'STRAIGHT':
        straightsAndSeqs.push(combo);
        break;
      case 'FOUR_OF_A_KIND':
        fourOfAKinds.push(combo);
        break;
      case 'TRIPLE':
        triples.push(combo);
        break;
      case 'PAIR':
        pairs.push(combo);
        break;
      default:
        straightsAndSeqs.push(combo);
        break;
    }
  }

  // Sắp xếp nội bộ từng loại tổ hợp tăng dần theo giá trị
  straightsAndSeqs.sort((a, b) => {
    const aMin = Math.min(...a.cards.map(c => c.weight));
    const bMin = Math.min(...b.cards.map(c => c.weight));
    return aMin - bMin;
  });

  fourOfAKinds.sort((a, b) => a.highestCard.weight - b.highestCard.weight);
  triples.sort((a, b) => a.highestCard.weight - b.highestCard.weight);
  pairs.sort((a, b) => a.highestCard.weight - b.highestCard.weight);

  let groupCounter = 1;

  for (const combo of straightsAndSeqs) {
    let name = 'Sảnh';
    if (combo.type === 'THREE_PAIRS_SEQUENTIAL') name = '3 Đôi Thông';
    else if (combo.type === 'FOUR_PAIRS_SEQUENTIAL') name = '4 Đôi Thông';
    else if (combo.type === 'FIVE_PAIRS_SEQUENTIAL') name = '5 Đôi Thông';
    else if (combo.type === 'DRAGON_STRAIGHT') name = 'Sảnh Rồng';

    groups.push({
      id: `combo-${groupCounter++}-${combo.type}`,
      type: combo.type,
      name,
      cards: sortCards(combo.cards)
    });
  }

  for (const combo of fourOfAKinds) {
    groups.push({
      id: `combo-${groupCounter++}-quad`,
      type: 'FOUR_OF_A_KIND',
      name: 'Tứ Quý',
      cards: sortCards(combo.cards)
    });
  }

  for (const combo of triples) {
    groups.push({
      id: `combo-${groupCounter++}-triple`,
      type: 'TRIPLE',
      name: 'Sám Cô',
      cards: sortCards(combo.cards)
    });
  }

  for (const combo of pairs) {
    groups.push({
      id: `combo-${groupCounter++}-pair`,
      type: 'PAIR',
      name: 'Đôi',
      cards: sortCards(combo.cards)
    });
  }

  if (partition.trashCards.length > 0) {
    groups.push({
      id: `combo-${groupCounter++}-trash`,
      type: 'SINGLE',
      name: 'Bài Rác',
      cards: sortCards(partition.trashCards)
    });
  }

  return groups;
}

/**
 * Sinh chữ ký duy nhất của một nhóm phân rã để so khớp tính độc bản
 */
function getPartitionSignature(groups: SmartCardGroup[]): string {
  return groups
    .map(g => `${g.type}:[${g.cards.map(c => c.id).sort().join(',')}]`)
    .sort()
    .join('|');
}

/**
 * Lấy tất cả các phương án phân rã bộ thông minh khả thi (tối đa 2-3 phương án chiến thuật khác biệt)
 */
export function getAvailableSmartVariants(hand: Card[]): SmartCardGroup[][] {
  if (!hand || hand.length === 0) return [];

  const strategies: PartitionStrategy[] = ['OPTIMAL_TURNS', 'BIG_HANDS', 'MAX_STRAIGHTS'];
  const variants: SmartCardGroup[][] = [];
  const seenSignatures = new Set<string>();

  for (const strategy of strategies) {
    const partition = partitionHandByStrategy(hand, strategy);
    const groups = convertPartitionToGroups(partition);

    if (groups.length === 0) continue;

    const signature = getPartitionSignature(groups);
    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      variants.push(groups);
    }
  }

  // Nếu bài không có tổ hợp nào (toàn rác), trả về 1 phương án rác
  if (variants.length === 0) {
    variants.push([
      {
        id: 'combo-trash',
        type: 'SINGLE',
        name: 'Bài Rác',
        cards: sortCards(hand)
      }
    ]);
  }

  return variants;
}

/**
 * Lấy danh sách các nhóm bài thông minh theo chỉ số phương án (variantIndex)
 */
export function getSmartHandGroups(hand: Card[], variantIndex: number = 0): SmartCardGroup[] {
  const variants = getAvailableSmartVariants(hand);
  if (variants.length === 0) return [];
  const safeIdx = Math.max(0, Math.min(variantIndex, variants.length - 1));
  return variants[safeIdx];
}

/**
 * Trả về mảng Card[] đã được sắp xếp thông minh theo phương án (variantIndex)
 */
export function sortCardsSmart(hand: Card[], variantIndex: number = 0): Card[] {
  const groups = getSmartHandGroups(hand, variantIndex);
  const result: Card[] = [];
  for (const group of groups) {
    result.push(...group.cards);
  }
  return result;
}
