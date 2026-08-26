import { describe, expect, test } from 'bun:test';
import { parseCards } from '../../src/engine/card';
import { getAvailableSmartVariants, getSmartHandGroups, sortCardsSmart } from '../../src/engine/hand-sorter';

describe('Hand Sorter (Xếp Bài Thông Minh Đa Phương Án)', () => {
  test('Thế bài ví dụ của người dùng: 3 4 5 5 5 6 6 7 7 sinh ra nhiều phương án xếp bộ', () => {
    // 3S 4D 5S 5D 5C 6S 6D 7S 7D
    const hand = parseCards('3S 4D 5S 5D 5C 6S 6D 7S 7D');
    const variants = getAvailableSmartVariants(hand);

    // Phải tìm được ít nhất 2 phương án xếp bộ khác nhau:
    // - Phương án Sảnh tối đa sạch rác (3 sảnh 3-4-5, 5-6-7, 5-6-7 hoặc sảnh 5 lá 3-4-5-6-7 + sảnh 3 lá 5-6-7)
    // - Phương án 3 Đôi Thông (5-5-6-6-7-7)
    expect(variants.length).toBeGreaterThanOrEqual(2);

    const hasStraightVariant = variants.some(groups => groups.some(g => g.type === 'STRAIGHT'));
    const hasSeqPairsVariant = variants.some(groups => groups.some(g => g.type === 'THREE_PAIRS_SEQUENTIAL'));

    expect(hasStraightVariant).toBe(true);
    expect(hasSeqPairsVariant).toBe(true);
  });

  test('Gom nhóm Sảnh, Đôi, Sám, Tứ quý theo đúng thứ tự sức mạnh', () => {
    // Sảnh 3-4-5, Đôi 7, Sám 9, Tứ Quý J, Rác K, Heo 2
    const hand = parseCards('3S 4D 5C 7S 7D 9S 9D 9C JS JC JD JH KS 2H');
    const groups = getSmartHandGroups(hand, 0);

    // Thứ tự mong đợi: Sảnh -> Tứ Quý -> Sám -> Đôi -> Rác
    expect(groups.length).toBe(5);
    expect(groups[0].type).toBe('STRAIGHT');
    expect(groups[0].cards.map(c => c.code).join(' ')).toBe('3S 4D 5C');

    expect(groups[1].type).toBe('FOUR_OF_A_KIND');
    expect(groups[1].cards.map(c => c.code).join(' ')).toBe('JS JC JD JH');

    expect(groups[2].type).toBe('TRIPLE');
    expect(groups[2].cards.map(c => c.code).join(' ')).toBe('9S 9C 9D');

    expect(groups[3].type).toBe('PAIR');
    expect(groups[3].cards.map(c => c.code).join(' ')).toBe('7S 7D');

    expect(groups[4].type).toBe('SINGLE');
    expect(groups[4].cards.map(c => c.code).join(' ')).toBe('KS 2H');
  });

  test('sortCardsSmart trả về danh sách phẳng theo đúng thứ tự nhóm của variant', () => {
    const hand = parseCards('3S 4D 5C 8S 8D KS');
    const sorted = sortCardsSmart(hand, 0);

    expect(sorted.map(c => c.code).join(' ')).toBe('3S 4D 5C 8S 8D KS');
  });

  test('Xử lý mảng rỗng và mảng 1 lá bài an toàn', () => {
    expect(getAvailableSmartVariants([])).toEqual([]);
    expect(getSmartHandGroups([])).toEqual([]);
    expect(sortCardsSmart([])).toEqual([]);

    const singleCard = parseCards('3S');
    const groups = getSmartHandGroups(singleCard);
    expect(groups.length).toBe(1);
    expect(groups[0].type).toBe('SINGLE');
    expect(groups[0].cards[0].code).toBe('3S');
  });
});
