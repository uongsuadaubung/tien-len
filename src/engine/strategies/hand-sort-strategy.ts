import type { Card, Suit } from '../types';
import { sortCards, isTwo, compareCards } from '../card';
import { partitionHand } from '../../ai/hand-partitioner';
import { t } from '../../locales';

export type HandSortMode = 'NATURAL' | 'BY_SUIT' | 'SMART_GROUP' | 'TWO_PRESERVE';

/**
 * Giao diện Strategy Pattern cho các thuật toán sắp xếp bài của người chơi
 */
export interface IHandSortStrategy {
  readonly id: HandSortMode;
  readonly label: string;
  readonly description: string;
  sort(cards: readonly Card[]): Card[];
}

/**
 * 1. Chiến lược Xếp Tự Nhiên: Sắp xếp theo giá trị tăng dần từ 3 Bích đến 2 Cơ
 */
export class NaturalHandSortStrategy implements IHandSortStrategy {
  public readonly id: HandSortMode = 'NATURAL';
  public get label(): string { return t('sort.naturalLabel'); }
  public get description(): string { return t('sort.naturalDesc'); }

  public sort(cards: readonly Card[]): Card[] {
    return sortCards([...cards]);
  }
}

const SUIT_ORDER: Record<Suit, number> = {
  SPADES: 0,
  CLUBS: 1,
  DIAMONDS: 2,
  HEARTS: 3
};

/**
 * 2. Chiến lược Xếp Theo Chất: Gom các lá bài cùng chất lại gần nhau (Bích -> Chuồn -> Rô -> Cơ)
 */
export class SuitHandSortStrategy implements IHandSortStrategy {
  public readonly id: HandSortMode = 'BY_SUIT';
  public get label(): string { return t('sort.bySuitLabel'); }
  public get description(): string { return t('sort.bySuitDesc'); }

  public sort(cards: readonly Card[]): Card[] {
    return [...cards].sort((a, b) => {
      const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
      if (suitDiff !== 0) return suitDiff;
      return a.rank - b.rank;
    });
  }
}

/**
 * 3. Chiến lược Xếp Thông Minh: Tự động gom Sảnh dài, Tứ quý, Đôi và tách bài rác lẻ loi
 */
export class SmartGroupHandSortStrategy implements IHandSortStrategy {
  public readonly id: HandSortMode = 'SMART_GROUP';
  public get label(): string { return t('sort.smartGroupLabel'); }
  public get description(): string { return t('sort.smartGroupDesc'); }

  public sort(cards: readonly Card[]): Card[] {
    if (cards.length <= 1) return [...cards];

    const partition = partitionHand([...cards], 1.0);
    const groupedCards: Card[] = [];
    const usedIds = new Set<string>();

    // Ưu tiên đưa các tổ hợp sảnh, tứ quý, đôi trước
    for (const combo of partition.combinations) {
      for (const c of sortCards(combo.cards)) {
        if (!usedIds.has(c.id)) {
          groupedCards.push(c);
          usedIds.add(c.id);
        }
      }
    }

    // Đưa các lá bài rác lẻ loi ra sau cùng (xếp theo thứ tự tăng dần)
    const sortedTrash = sortCards(partition.trashCards);
    for (const c of sortedTrash) {
      if (!usedIds.has(c.id)) {
        groupedCards.push(c);
        usedIds.add(c.id);
      }
    }

    return groupedCards;
  }
}

/**
 * 4. Chiến lược Bảo Toàn Heo: Đẩy toàn bộ các lá 2 (Heo) về cuối tay bài để tránh đánh nhầm
 */
export class TwoPreserveHandSortStrategy implements IHandSortStrategy {
  public readonly id: HandSortMode = 'TWO_PRESERVE';
  public get label(): string { return t('sort.twoPreserveLabel'); }
  public get description(): string { return t('sort.twoPreserveDesc'); }

  public sort(cards: readonly Card[]): Card[] {
    const nonTwos = cards.filter(c => !isTwo(c));
    const twos = cards.filter(isTwo);

    return [...sortCards(nonTwos), ...sortCards(twos)];
  }
}

const STRATEGY_INSTANCES: Record<HandSortMode, IHandSortStrategy> = {
  NATURAL: new NaturalHandSortStrategy(),
  BY_SUIT: new SuitHandSortStrategy(),
  SMART_GROUP: new SmartGroupHandSortStrategy(),
  TWO_PRESERVE: new TwoPreserveHandSortStrategy()
};

export const HAND_SORT_STRATEGIES: readonly IHandSortStrategy[] = Object.freeze([
  STRATEGY_INSTANCES.NATURAL,
  STRATEGY_INSTANCES.BY_SUIT,
  STRATEGY_INSTANCES.SMART_GROUP,
  STRATEGY_INSTANCES.TWO_PRESERVE
]);

/**
 * Resolver trích xuất Strategy tương ứng theo HandSortMode
 */
export function resolveHandSortStrategy(mode: HandSortMode): IHandSortStrategy {
  return STRATEGY_INSTANCES[mode] || STRATEGY_INSTANCES.NATURAL;
}
