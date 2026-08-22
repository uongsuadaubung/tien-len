import { describe, expect, test } from 'bun:test';
import { parseCards } from '../../src/engine/card';
import { partitionHand } from '../../src/ai/hand-partitioner';

describe('AI Hand Partitioner (Phân Rã Bộ Bài Tối Ưu)', () => {
  test('Tự động gom nhóm thành các bộ hoàn hảo, không để rác', () => {
    // 3S 4S 5S (sảnh 3) + 7S 7D 7C (sám 7) + 8H 9H 10H (sảnh 3)
    const hand = parseCards('3S 4S 5S 7S 7D 7C 8H 9H 10H');
    const partition = partitionHand(hand);

    expect(partition.trashCards.length).toBe(0);
    expect(partition.combinations.length).toBe(3);
  });

  test('Ưu tiên phát hiện Hàng quý (3 đôi thông, Tứ quý)', () => {
    // 4S 4D 5S 5D 6S 6D + 9H
    const hand = parseCards('4S 4D 5S 5D 6S 6D 9H');
    const partition = partitionHand(hand);

    const has3Pairs = partition.combinations.some(c => c.type === 'THREE_PAIRS_SEQUENTIAL');
    expect(has3Pairs).toBe(true);
    expect(partition.trashCards.length).toBe(1);
    expect(partition.trashCards[0].code).toBe('9H');
  });

  test('Phát hiện Tứ quý chuẩn xác', () => {
    const hand = parseCards('8S 8C 8D 8H 10S JS QS');
    const partition = partitionHand(hand);

    const hasFourOfAKind = partition.combinations.some(c => c.type === 'FOUR_OF_A_KIND');
    expect(hasFourOfAKind).toBe(true);
    const hasStraight = partition.combinations.some(c => c.type === 'STRAIGHT');
    expect(hasStraight).toBe(true);
    expect(partition.trashCards.length).toBe(0);
  });

  test('Giữ lá Heo (2) thành lá rác kiểm soát đặc biệt thay vì ghép lung tung', () => {
    const hand = parseCards('3S 4D 5C 2H');
    const partition = partitionHand(hand);

    expect(partition.combinations.some(c => c.type === 'STRAIGHT')).toBe(true);
    expect(partition.trashCards.length).toBe(1);
    expect(partition.trashCards[0].code).toBe('2H');
  });
});
