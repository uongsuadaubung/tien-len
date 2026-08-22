import { describe, expect, test } from 'bun:test';
import { parseCards } from '../../src/engine/card';
import { checkInstantWin } from '../../src/engine/deck';

describe('Luật Tới Trắng (Instant Win)', () => {
  test('Sảnh Rồng (3 tới A hoặc 3 tới 2)', () => {
    const dragon12 = parseCards('3S 4D 5C 6H 7S 8D 9C 10H JS QD KC AH 2S');
    expect(checkInstantWin(dragon12, false)).toBe('DRAGON_STRAIGHT');

    const dragon13 = parseCards('3S 4S 5S 6S 7S 8S 9S 10S JS QS KS AS 2H');
    expect(checkInstantWin(dragon13, false)).toBe('DRAGON_STRAIGHT');
  });

  test('Tứ Quý 2 (4 con heo)', () => {
    const fourTwos = parseCards('2S 2C 2D 2H 3S 4S 5S 6S 7S 8S 9S 10S JS');
    expect(checkInstantWin(fourTwos, false)).toBe('FOUR_TWOS');
  });

  test('5 Đôi Thông', () => {
    const fivePairsSeq = parseCards('3S 3D 4S 4D 5S 5D 6S 6D 7S 7D 9S 10S JS');
    expect(checkInstantWin(fivePairsSeq, false)).toBe('FIVE_PAIRS_SEQUENTIAL');
  });

  test('6 Đôi Bất Kỳ', () => {
    const sixPairs = parseCards('3S 3D 5S 5D 7S 7D 9S 9D JS JD KS KD 2S');
    expect(checkInstantWin(sixPairs, false)).toBe('SIX_PAIRS');
  });

  test('13 Lá Đồng Màu (Toàn Đỏ hoặc Toàn Đen)', () => {
    const allRed = parseCards('3D 3H 4D 4H 5D 6H 7D 8H 9D 10H JD QH KD');
    expect(checkInstantWin(allRed, false)).toBe('SAME_COLOR_13');

    const allBlack = parseCards('3S 3C 4S 4C 5S 6C 7S 8C 9S 10C JS QC KS');
    expect(checkInstantWin(allBlack, false)).toBe('SAME_COLOR_13');
  });

  test('Tứ Quý 3 ở Ván Đầu Tiên', () => {
    const fourThrees = parseCards('3S 3C 3D 3H 4S 5S 6S 7S 8S 9S 10S JS QS');
    expect(checkInstantWin(fourThrees, true)).toBe('FIRST_ROUND_FOUR_THREES');
    // Nếu không phải ván đầu thì không tới trắng vì tứ quý 3
    expect(checkInstantWin(fourThrees, false)).toBeNull();
  });
});
