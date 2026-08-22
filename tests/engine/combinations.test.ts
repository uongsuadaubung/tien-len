import { describe, expect, test } from 'bun:test';
import { parseCards } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';

describe('Combinations Recognition & Validation', () => {
  test('nhận diện chính xác lá Rác (SINGLE)', () => {
    const single1 = identifyCombination(parseCards('3S'));
    expect(single1).not.toBeNull();
    expect(single1?.type).toBe('SINGLE');
    expect(single1?.highestCard.code).toBe('3S');

    const single2 = identifyCombination(parseCards('2H'));
    expect(single2?.type).toBe('SINGLE');
    expect(single2?.highestCard.code).toBe('2H');
  });

  test('nhận diện chính xác Đôi (PAIR)', () => {
    const pair = identifyCombination(parseCards('7S 7H'));
    expect(pair).not.toBeNull();
    expect(pair?.type).toBe('PAIR');
    expect(pair?.highestCard.code).toBe('7H');

    // 2 lá khác số không phải là đôi
    const invalidPair = identifyCombination(parseCards('7S 8S'));
    expect(invalidPair).toBeNull();
  });

  test('nhận diện chính xác Sám cô (TRIPLE)', () => {
    const triple = identifyCombination(parseCards('10S 10C 10H'));
    expect(triple).not.toBeNull();
    expect(triple?.type).toBe('TRIPLE');
    expect(triple?.highestCard.code).toBe('10H');

    const invalidTriple = identifyCombination(parseCards('10S 10C JH'));
    expect(invalidTriple).toBeNull();
  });

  test('nhận diện chính xác Sảnh (STRAIGHT) từ 3 lá trở lên', () => {
    const straight3 = identifyCombination(parseCards('3S 4D 5C'));
    expect(straight3).not.toBeNull();
    expect(straight3?.type).toBe('STRAIGHT');
    expect(straight3?.length).toBe(3);
    expect(straight3?.highestCard.code).toBe('5C');

    const straight5 = identifyCombination(parseCards('10S JD QC KH AS'));
    expect(straight5?.type).toBe('STRAIGHT');
    expect(straight5?.length).toBe(5);
    expect(straight5?.highestCard.code).toBe('AS');
  });

  test('sảnh KHÔNG ĐƯỢC CHỨA lá 2 (Heo)', () => {
    const straightWithTwo1 = identifyCombination(parseCards('QS KD AH 2S'));
    expect(straightWithTwo1).toBeNull();

    const straightWithTwo2 = identifyCombination(parseCards('AS 2S 3S'));
    expect(straightWithTwo2).toBeNull();
  });

  test('sảnh không hợp lệ nếu bị đứt đoạn hoặc trùng số', () => {
    const brokenStraight = identifyCombination(parseCards('3S 4D 6C'));
    expect(brokenStraight).toBeNull();

    const duplicateRank = identifyCombination(parseCards('3S 3D 4C 5H'));
    expect(duplicateRank).toBeNull();
  });

  test('nhận diện chính xác 3 Đôi Thông (THREE_PAIRS_SEQUENTIAL)', () => {
    const threePairs = identifyCombination(parseCards('4S 4D 5C 5H 6S 6D'));
    expect(threePairs).not.toBeNull();
    expect(threePairs?.type).toBe('THREE_PAIRS_SEQUENTIAL');
    expect(threePairs?.length).toBe(6);
    expect(threePairs?.highestCard.code).toBe('6D');

    // 3 đôi không liên tiếp -> không hợp lệ
    const nonSequential = identifyCombination(parseCards('4S 4D 5C 5H 7S 7D'));
    expect(nonSequential).toBeNull();

    // 3 đôi thông không được chứa 2
    const withTwo = identifyCombination(parseCards('KS KD AS AH 2S 2D'));
    expect(withTwo).toBeNull();
  });

  test('nhận diện chính xác Tứ Quý (FOUR_OF_A_KIND)', () => {
    const fourOfAKind = identifyCombination(parseCards('9S 9C 9D 9H'));
    expect(fourOfAKind).not.toBeNull();
    expect(fourOfAKind?.type).toBe('FOUR_OF_A_KIND');
    expect(fourOfAKind?.length).toBe(4);
    expect(fourOfAKind?.highestCard.code).toBe('9H');

    const fourTwos = identifyCombination(parseCards('2S 2C 2D 2H'));
    expect(fourTwos?.type).toBe('FOUR_OF_A_KIND');
  });

  test('nhận diện chính xác 4 Đôi Thông (FOUR_PAIRS_SEQUENTIAL)', () => {
    const fourPairs = identifyCombination(parseCards('7S 7D 8C 8H 9S 9D 10C 10H'));
    expect(fourPairs).not.toBeNull();
    expect(fourPairs?.type).toBe('FOUR_PAIRS_SEQUENTIAL');
    expect(fourPairs?.length).toBe(8);
    expect(fourPairs?.highestCard.code).toBe('10H');
  });

  test('nhận diện chính xác 5 Đôi Thông (FIVE_PAIRS_SEQUENTIAL)', () => {
    const fivePairs = identifyCombination(parseCards('3S 3D 4S 4D 5S 5D 6S 6D 7S 7D'));
    expect(fivePairs).not.toBeNull();
    expect(fivePairs?.type).toBe('FIVE_PAIRS_SEQUENTIAL');
    expect(fivePairs?.length).toBe(10);
  });
});
