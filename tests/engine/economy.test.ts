import { describe, expect, test } from 'bun:test';
import { calculateChopPenalty, calculateRottenPenalty, calculateCongPenalty } from '../../src/engine/economy';
import { Combination } from '../../src/engine/types';
import { parseCard, parseCards } from '../../src/engine/card';

describe('Economy & Hardcore Penalties (Kinh Tế & Trừng Phạt Cược Lớn)', () => {
  const BET = 1000;

  test('Chặt 1 Heo Đen vs Heo Đỏ bình thường vs Thế Giới Ngầm', () => {
    const blackTwo = parseCard('2S')!;
    const redTwo = parseCard('2H')!;

    const comboBlackTwo: Combination = { type: 'SINGLE', length: 1, cards: [blackTwo], highestCard: blackTwo };
    const comboRedTwo: Combination = { type: 'SINGLE', length: 1, cards: [redTwo], highestCard: redTwo };
    const threePairs: Combination = { type: 'THREE_PAIRS_SEQUENTIAL', length: 6, cards: parseCards('3S 3D 4S 4D 5S 5D'), highestCard: parseCard('5D')! };

    // Heo đen bàn thường: 1x cược (1,000)
    const chopBlackNormal = calculateChopPenalty(comboBlackTwo, threePairs, BET, false);
    expect(chopBlackNormal.amount).toBe(1000);

    // Heo đỏ bàn thường: 2x cược (2,000)
    const chopRedNormal = calculateChopPenalty(comboRedTwo, threePairs, BET, false);
    expect(chopRedNormal.amount).toBe(2000);

    // Heo đỏ Thế Giới Ngầm: 4x cược (4,000)
    const chopRedUnderground = calculateChopPenalty(comboRedTwo, threePairs, BET, true);
    expect(chopRedUnderground.amount).toBe(4000);
  });

  test('Chặt Đôi Heo (2 Đen vs 1 Đỏ 1 Đen vs 2 Đỏ)', () => {
    const pairBlackTwos: Combination = { type: 'PAIR', length: 2, cards: parseCards('2S 2C'), highestCard: parseCard('2C')! };
    const pairMixedTwos: Combination = { type: 'PAIR', length: 2, cards: parseCards('2S 2H'), highestCard: parseCard('2H')! };
    const pairRedTwos: Combination = { type: 'PAIR', length: 2, cards: parseCards('2D 2H'), highestCard: parseCard('2H')! };
    const fourOfAKind: Combination = { type: 'FOUR_OF_A_KIND', length: 4, cards: parseCards('5S 5D 5C 5H'), highestCard: parseCard('5H')! };

    // 2 Heo đen: 2x cược (2,000)
    expect(calculateChopPenalty(pairBlackTwos, fourOfAKind, BET, false).amount).toBe(2000);
    // 1 Đỏ 1 Đen: 3x cược (3,000)
    expect(calculateChopPenalty(pairMixedTwos, fourOfAKind, BET, false).amount).toBe(3000);
    // 2 Heo đỏ: 4x cược (4,000)
    expect(calculateChopPenalty(pairRedTwos, fourOfAKind, BET, false).amount).toBe(4000);
  });

  test('Tính tiền Thối Heo/Hàng cuối ván', () => {
    const handWithRotten = parseCards('3S 4S 2S 2H 7S 7D 7C 7H'); // 1 heo đen + 1 heo đỏ + Tứ quý 7
    // Heo đen (1x) + Heo đỏ (2x) + Tứ quý (4x) = 7x cược = 7,000 xu
    const penaltyNormal = calculateRottenPenalty(handWithRotten, BET, false);
    expect(penaltyNormal).toBe(7000);

    // Thế Giới Ngầm: Nhân đôi = 14,000 xu
    const penaltyUnderground = calculateRottenPenalty(handWithRotten, BET, true);
    expect(penaltyUnderground).toBe(14000);
  });

  test('Tính tiền đền Cóng (Cháy bài)', () => {
    // Bàn thường: 26x cược = 26,000 xu
    expect(calculateCongPenalty(BET, false)).toBe(26000);
    // Thế giới ngầm: 52x cược = 52,000 xu
    expect(calculateCongPenalty(BET, true)).toBe(52000);
  });
});
