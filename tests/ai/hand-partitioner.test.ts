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

  test('Bot rank thấp (optimality = 0.4) nhận diện đúng Sám cô độc lập (TRIPLE) khi không bị kẹp Sảnh', () => {
    // 3 con 4 độc lập: 4S 4C 4H + rác 7S 8H JS + Đôi K: KS KC
    const hand = parseCards('7S 4S 4C 4H 8H JS KS KC');
    const partition = partitionHand(hand, 0.4);

    const hasTriple4 = partition.combinations.some(c => c.type === 'TRIPLE' && c.cards[0].rank === 4);
    expect(hasTriple4).toBe(true);

    const trashCodes = partition.trashCards.map(c => c.code);
    expect(trashCodes).not.toContain('4H');
    expect(trashCodes).not.toContain('4S');
    expect(trashCodes).not.toContain('4C');
  });

  test('Khi 3 con 4 đan xen với 3, 5 có thể tạo thành Sảnh 3-4-5 và Đôi 4, thuật toán chọn giải pháp giảm rác tối đa (chỉ còn 2 rác)', () => {
    // 3S 4S 4C 4H 5H 7H JS KS KC
    // Nếu chọn Sám 4 + Đôi K -> để lại 4 rác (3S, 5H, 7H, JS)
    // Nếu chọn Sảnh 3-4-5 + Đôi 4 + Đôi K -> chỉ để lại 2 rác (7H, JS)!
    const hand = parseCards('3S 4S 4C 4H 5H 7H JS KS KC');
    const partition = partitionHand(hand, 0.4);

    const hasStraight = partition.combinations.some(c => c.type === 'STRAIGHT' && c.length === 3);
    const hasPair4 = partition.combinations.some(c => c.type === 'PAIR' && c.cards[0].rank === 4);
    const hasPairK = partition.combinations.some(c => c.type === 'PAIR' && c.cards[0].rank === 13);

    expect(hasStraight).toBe(true);
    expect(hasPair4).toBe(true);
    expect(hasPairK).toBe(true);
    expect(partition.trashCards.length).toBe(2);
  });

  test('Bot rank thấp nhất (optimality = 0.3 như Elo 700) vẫn nhận diện được Tứ quý, Sảnh và Đôi thông tự nhiên', () => {
    // 1. Tứ quý 9 ở optimality = 0.3
    const handTuQuy = parseCards('9S 9C 9D 9H 3S 5D');
    const partitionTuQuy = partitionHand(handTuQuy, 0.3);
    expect(partitionTuQuy.combinations.some(c => c.type === 'FOUR_OF_A_KIND')).toBe(true);

    // 2. Sảnh 3-4-5-6 ở optimality = 0.3
    const handSanh = parseCards('3S 4D 5C 6H 9D JS');
    const partitionSanh = partitionHand(handSanh, 0.3);
    expect(partitionSanh.combinations.some(c => c.type === 'STRAIGHT' && c.length === 4)).toBe(true);

    // 3. 3 Đôi thông 77-88-99 ở optimality = 0.3
    const handDoiThong = parseCards('7S 7D 8S 8D 9S 9D AC');
    const partitionDoiThong = partitionHand(handDoiThong, 0.3);
    expect(partitionDoiThong.combinations.some(c => c.type === 'THREE_PAIRS_SEQUENTIAL')).toBe(true);
  });
});
