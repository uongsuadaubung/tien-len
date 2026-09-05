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

export type PartitionStrategy = 'OPTIMAL_TURNS' | 'BIG_HANDS' | 'MAX_STRAIGHTS' | 'MAX_PAIRS';

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
          const sampleCards1: Card[] = [];
          for (const r of consecutive) {
            const list = rankMap.get(r) || [];
            if (list.length > 0) sampleCards1.push(list[0]);
          }
          if (sampleCards1.length === consecutive.length) {
            const combo1 = identifyCombination(sampleCards1);
            if (combo1) candidates.push(combo1);
          }

          const sampleCards2: Card[] = [];
          for (const r of consecutive) {
            const list = rankMap.get(r) || [];
            if (list.length > 0) sampleCards2.push(list[list.length - 1]);
          }
          if (sampleCards2.length === consecutive.length && sampleCards2.some((c, i) => c.id !== sampleCards1[i]?.id)) {
            const combo2 = identifyCombination(sampleCards2);
            if (combo2) candidates.push(combo2);
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

interface StrategyScoreConfig {
  readonly weights: Partial<Record<CombinationType, number>>;
  readonly straightBonus: (length: number) => number;
}

const STRATEGY_SCORE_CONFIGS: Record<PartitionStrategy, StrategyScoreConfig> = {
  BIG_HANDS: {
    weights: {
      FIVE_PAIRS_SEQUENTIAL: 1000,
      FOUR_PAIRS_SEQUENTIAL: 800,
      FOUR_OF_A_KIND: 600,
      THREE_PAIRS_SEQUENTIAL: 500,
      TRIPLE: 25,
      PAIR: 15
    },
    straightBonus: (len) => 10 + len * 4
  },
  MAX_STRAIGHTS: {
    weights: {
      FIVE_PAIRS_SEQUENTIAL: 300,
      FOUR_PAIRS_SEQUENTIAL: 200,
      FOUR_OF_A_KIND: 150,
      THREE_PAIRS_SEQUENTIAL: 50,
      TRIPLE: 20,
      PAIR: 10
    },
    straightBonus: (len) => 60 + len * 35
  },
  MAX_PAIRS: {
    weights: {
      FIVE_PAIRS_SEQUENTIAL: 500,
      FOUR_PAIRS_SEQUENTIAL: 400,
      FOUR_OF_A_KIND: 350,
      THREE_PAIRS_SEQUENTIAL: 250,
      TRIPLE: 70,
      PAIR: 45
    },
    straightBonus: (len) => 10 + len * 6
  },
  OPTIMAL_TURNS: {
    weights: {
      FIVE_PAIRS_SEQUENTIAL: 800,
      FOUR_PAIRS_SEQUENTIAL: 600,
      FOUR_OF_A_KIND: 400,
      THREE_PAIRS_SEQUENTIAL: 300,
      TRIPLE: 40,
      PAIR: 22
    },
    straightBonus: (len) => 25 + len * 12
  }
};

/**
 * Đánh giá điểm của tổ hợp theo chiến thuật cụ thể (O(1) Polymorphic Lookup)
 */
function evaluateCombinationScoreByStrategy(combo: Combination, strategy: PartitionStrategy): number {
  const cfg = STRATEGY_SCORE_CONFIGS[strategy] || STRATEGY_SCORE_CONFIGS.OPTIMAL_TURNS;
  if (combo.type === 'STRAIGHT') {
    return cfg.straightBonus(combo.length);
  }
  return cfg.weights[combo.type] ?? 0;
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

const COMBO_GROUP_NAME_MAP: Record<CombinationType, string> = {
  SINGLE: 'Bài Rác',
  PAIR: 'Đôi',
  TRIPLE: 'Sám Cô',
  STRAIGHT: 'Sảnh',
  THREE_PAIRS_SEQUENTIAL: '3 Đôi Thông',
  FOUR_OF_A_KIND: 'Tứ Quý',
  FOUR_PAIRS_SEQUENTIAL: '4 Đôi Thông',
  FIVE_PAIRS_SEQUENTIAL: '5 Đôi Thông',
  SIX_PAIRS: '6 Đôi',
  DRAGON_STRAIGHT: 'Sảnh Rồng',
  SAME_COLOR_13: 'Đồng Màu 13 Lá',
  FOUR_TWOS: 'Tứ Quý 2',
  FIRST_ROUND_FOUR_THREES: 'Tứ Quý 3'
};

  for (const combo of straightsAndSeqs) {
    groups.push({
      id: `combo-${groupCounter++}-${combo.type}`,
      type: combo.type,
      name: COMBO_GROUP_NAME_MAP[combo.type] || 'Sảnh',
      cards: sortCards(combo.cards)
    });
  }

  for (const combo of fourOfAKinds) {
    groups.push({
      id: `combo-${groupCounter++}-quad`,
      type: 'FOUR_OF_A_KIND',
      name: COMBO_GROUP_NAME_MAP.FOUR_OF_A_KIND,
      cards: sortCards(combo.cards)
    });
  }

  for (const combo of triples) {
    groups.push({
      id: `combo-${groupCounter++}-triple`,
      type: 'TRIPLE',
      name: COMBO_GROUP_NAME_MAP.TRIPLE,
      cards: sortCards(combo.cards)
    });
  }

  for (const combo of pairs) {
    groups.push({
      id: `combo-${groupCounter++}-pair`,
      type: 'PAIR',
      name: COMBO_GROUP_NAME_MAP.PAIR,
      cards: sortCards(combo.cards)
    });
  }

  if (partition.trashCards.length > 0) {
    groups.push({
      id: `combo-${groupCounter++}-trash`,
      type: 'SINGLE',
      name: COMBO_GROUP_NAME_MAP.SINGLE,
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

  const strategies: PartitionStrategy[] = ['OPTIMAL_TURNS', 'BIG_HANDS', 'MAX_STRAIGHTS', 'MAX_PAIRS'];
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
