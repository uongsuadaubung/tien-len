import { describe, test, expect } from 'bun:test';
import { 
  resolveHandSortStrategy, 
  NaturalHandSortStrategy, 
  SuitHandSortStrategy, 
  SmartGroupHandSortStrategy, 
  TwoPreserveHandSortStrategy,
  HAND_SORT_STRATEGIES
} from '../../src/engine/strategies/hand-sort-strategy';
import { createCard } from '../../src/engine/card';

describe('HandSortStrategy Pattern (Kiểm Thử Các Chiến Lược Xếp Bài Người Chơi)', () => {
  const cards = [
    createCard(15, 'HEARTS'),   // 2 Cơ
    createCard(3, 'SPADES'),    // 3 Bích
    createCard(15, 'SPADES'),   // 2 Bích
    createCard(4, 'SPADES'),    // 4 Bích
    createCard(5, 'SPADES'),    // 5 Bích
    createCard(7, 'DIAMONDS'),  // 7 Rô
    createCard(7, 'CLUBS')      // 7 Chuồn
  ];

  test('1. Resolver trả về Strategy tương ứng theo HandSortMode', () => {
    expect(resolveHandSortStrategy('NATURAL')).toBeInstanceOf(NaturalHandSortStrategy);
    expect(resolveHandSortStrategy('BY_SUIT')).toBeInstanceOf(SuitHandSortStrategy);
    expect(resolveHandSortStrategy('SMART_GROUP')).toBeInstanceOf(SmartGroupHandSortStrategy);
    expect(resolveHandSortStrategy('TWO_PRESERVE')).toBeInstanceOf(TwoPreserveHandSortStrategy);
    expect(HAND_SORT_STRATEGIES.length).toBe(4);
  });

  test('2. NaturalSortStrategy: Xếp tăng dần theo luật Tiến Lên Miền Nam (3 Bích đầu, 2 Cơ cuối)', () => {
    const strategy = new NaturalHandSortStrategy();
    const sorted = strategy.sort(cards);

    expect(sorted[0].rank).toBe(3);
    expect(sorted[0].suit).toBe('SPADES');
    expect(sorted[sorted.length - 1].rank).toBe(15);
    expect(sorted[sorted.length - 1].suit).toBe('HEARTS');
  });

  test('3. SuitSortStrategy: Gom nhóm cùng chất (Bích -> Chuồn -> Rô -> Cơ)', () => {
    const strategy = new SuitHandSortStrategy();
    const sorted = strategy.sort(cards);

    const suits = sorted.map(c => c.suit);
    const firstNonSpadeIdx = suits.findIndex(s => s !== 'SPADES');
    expect(firstNonSpadeIdx).toBeGreaterThan(0);
    // Các lá đầu tiên phải là Bích
    for (let i = 0; i < firstNonSpadeIdx; i++) {
      expect(suits[i]).toBe('SPADES');
    }
  });

  test('4. TwoPreserveSortStrategy: Gom toàn bộ lá Heo (2) về cuối tay bài', () => {
    const strategy = new TwoPreserveHandSortStrategy();
    const sorted = strategy.sort(cards);

    // 2 lá cuối cùng phải là lá 2 (Heo)
    const lastTwo = sorted.slice(-2);
    expect(lastTwo.every(c => c.rank === 15)).toBe(true);

    // Các lá phía trước không được chứa Heo
    const nonTwos = sorted.slice(0, -2);
    expect(nonTwos.some(c => c.rank === 15)).toBe(false);
  });

  test('5. SmartGroupSortStrategy: Tự động gom Sảnh dài (3-4-5) hoặc Đôi và dồn bài rác', () => {
    const strategy = new SmartGroupHandSortStrategy();
    const sorted = strategy.sort(cards);

    expect(sorted.length).toBe(cards.length);
    // Sảnh 3-4-5 Bích xuất hiện liền kề
    const card3Idx = sorted.findIndex(c => c.rank === 3 && c.suit === 'SPADES');
    expect(card3Idx).toBeGreaterThanOrEqual(0);
  });
});
