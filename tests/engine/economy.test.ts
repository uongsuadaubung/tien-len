import { describe, expect, test } from 'bun:test';
import { 
  calculateChopPenalty, 
  calculateRottenPenalty, 
  calculateCongPenalty
} from '../../src/engine/economy';
import { Combination } from '../../src/engine/types';
import { parseCard, parseCards } from '../../src/engine/card';
import { 
  ECONOMY_CONSTANTS, 
  LUCKY_WHEEL_SLICES, 
  determineWinningWheelSliceIndex 
} from '../../src/engine/constants/economy';

describe('Economy & Hardcore Penalties (Kinh Tế & Trừng Phạt Cược Lớn)', () => {
  const BET = 1000;

  test('Hằng số kinh tế toàn cục (ECONOMY_CONSTANTS) được định nghĩa chuẩn xác', () => {
    expect(ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS).toBe(50000);
    expect(ECONOMY_CONSTANTS.DEFAULT_STARTING_ELO).toBe(1000);
    expect(ECONOMY_CONSTANTS.LUCKY_WHEEL_SPIN_COST).toBe(10000);
    expect(ECONOMY_CONSTANTS.LUCKY_WHEEL_JACKPOT).toBe(100000);
    expect(ECONOMY_CONSTANTS.DAILY_RELIEF_AMOUNT).toBe(20000);
    expect(ECONOMY_CONSTANTS.BANKRUPTCY_RELIEF_THRESHOLD).toBe(10000);
    expect(ECONOMY_CONSTANTS.MAX_DAILY_RELIEF_COUNT).toBe(3);
    expect(ECONOMY_CONSTANTS.LOAN_PACKAGES.length).toBe(4);
  });

  test('Vòng Quay Thần Bài: Kiểm chứng xác suất & RTP toán học từ hằng số', () => {
    // 1. Tổng xác suất của các nan quạt phải đúng 100%
    const totalProb = LUCKY_WHEEL_SLICES.reduce((sum, s) => sum + s.probabilityPercent, 0);
    expect(Math.abs(totalProb - 100.0)).toBeLessThan(0.0001);

    // 2. Tính Expected Value (EV)
    const expectedValue = LUCKY_WHEEL_SLICES.reduce((sum, s) => sum + (s.probabilityPercent / 100) * s.value, 0);
    const rtp = expectedValue / ECONOMY_CONSTANTS.LUCKY_WHEEL_SPIN_COST;

    // EV phải rơi vào khoảng 9,000 - 9,300 Xu (RTP 90% - 93%)
    expect(expectedValue).toBeGreaterThanOrEqual(9000);
    expect(expectedValue).toBeLessThanOrEqual(9300);
    expect(rtp).toBeLessThan(1.0); // Không bị lạm phát vượt 100%
    expect(rtp).toBeGreaterThan(0.85); // Đảm bảo tính hấp dẫn (> 85%)
  });

  test('Vòng Quay Thần Bài: Mô phỏng Monte Carlo 100,000 lượt quay với determineWinningWheelSliceIndex', () => {
    const NUM_SPINS = 100000;
    let totalPrizes = 0;
    let jackpotCount = 0;
    let nonZeroPrizeCount = 0;
    let profitableCount = 0;

    for (let i = 0; i < NUM_SPINS; i++) {
      const rand = Math.random() * 100;
      const winningIdx = determineWinningWheelSliceIndex(rand);
      const wonSlice = LUCKY_WHEEL_SLICES[winningIdx];

      if (wonSlice.isJackpot) {
        jackpotCount++;
      }
      if (wonSlice.value > 0) {
        nonZeroPrizeCount++;
      }
      if (wonSlice.value >= ECONOMY_CONSTANTS.LUCKY_WHEEL_SPIN_COST) {
        profitableCount++;
      }

      totalPrizes += wonSlice.value;
    }

    const empiricalEV = totalPrizes / NUM_SPINS;
    const empiricalRTP = empiricalEV / ECONOMY_CONSTANTS.LUCKY_WHEEL_SPIN_COST;

    // Tỷ lệ thực nghiệm 100,000 lượt quay phải tiệm cận lý thuyết 91.5% (+/- 1.5%)
    expect(empiricalRTP).toBeGreaterThan(0.89);
    expect(empiricalRTP).toBeLessThan(0.94);

    // Tỷ lệ trúng giải Jackpot x10 tiệm cận 1.5% (+/- 0.5%)
    expect(jackpotCount / NUM_SPINS).toBeGreaterThan(0.01);
    expect(jackpotCount / NUM_SPINS).toBeLessThan(0.02);

    // Tỷ lệ nhận quà về ví (> 0 Xu) tiệm cận 60% (+/- 2%)
    const positiveRewardRate = nonZeroPrizeCount / NUM_SPINS;
    expect(positiveRewardRate).toBeGreaterThan(0.58);
    expect(positiveRewardRate).toBeLessThan(0.62);

    // Tỷ lệ hòa vốn hoặc có lãi (>= 10,000 Xu) tiệm cận 35% (+/- 2%)
    const profitableRate = profitableCount / NUM_SPINS;
    expect(profitableRate).toBeGreaterThan(0.33);
    expect(profitableRate).toBeLessThan(0.37);
  });

  test('Chặt 1 Heo Đen vs Heo Đỏ bình thường vs Hệ số nhân phạt x2', () => {
    const blackTwo = parseCard('2S')!;
    const redTwo = parseCard('2H')!;

    const comboBlackTwo: Combination = { type: 'SINGLE', length: 1, cards: [blackTwo], highestCard: blackTwo };
    const comboRedTwo: Combination = { type: 'SINGLE', length: 1, cards: [redTwo], highestCard: redTwo };
    const threePairs: Combination = { type: 'THREE_PAIRS_SEQUENTIAL', length: 6, cards: parseCards('3S 3D 4S 4D 5S 5D'), highestCard: parseCard('5D')! };

    // Heo đen bàn thường: 1x cược (1,000)
    const chopBlackNormal = calculateChopPenalty(comboBlackTwo, threePairs, BET, 1);
    expect(chopBlackNormal.amount).toBe(1000);

    // Heo đỏ bàn thường: 2x cược (2,000)
    const chopRedNormal = calculateChopPenalty(comboRedTwo, threePairs, BET, 1);
    expect(chopRedNormal.amount).toBe(2000);

    // Heo đỏ khi có hệ số nhân phạt x2: 4x cược (4,000)
    const chopRedMult2 = calculateChopPenalty(comboRedTwo, threePairs, BET, 2);
    expect(chopRedMult2.amount).toBe(4000);
  });

  test('Chặt Đôi Heo (2 Đen vs 1 Đỏ 1 Đen vs 2 Đỏ)', () => {
    const pairBlackTwos: Combination = { type: 'PAIR', length: 2, cards: parseCards('2S 2C'), highestCard: parseCard('2C')! };
    const pairMixedTwos: Combination = { type: 'PAIR', length: 2, cards: parseCards('2S 2H'), highestCard: parseCard('2H')! };
    const pairRedTwos: Combination = { type: 'PAIR', length: 2, cards: parseCards('2D 2H'), highestCard: parseCard('2H')! };
    const fourOfAKind: Combination = { type: 'FOUR_OF_A_KIND', length: 4, cards: parseCards('5S 5D 5C 5H'), highestCard: parseCard('5H')! };

    // 2 Heo đen: 2x cược (2,000)
    expect(calculateChopPenalty(pairBlackTwos, fourOfAKind, BET, 1).amount).toBe(2000);
    // 1 Đỏ 1 Đen: 3x cược (3,000)
    expect(calculateChopPenalty(pairMixedTwos, fourOfAKind, BET, 1).amount).toBe(3000);
    // 2 Heo đỏ: 4x cược (4,000)
    expect(calculateChopPenalty(pairRedTwos, fourOfAKind, BET, 1).amount).toBe(4000);
  });

  test('Tính tiền Thối Heo/Hàng cuối ván', () => {
    const handWithRotten = parseCards('3S 4S 2S 2H 7S 7D 7C 7H'); // 1 heo đen + 1 heo đỏ + Tứ quý 7
    // Heo đen (1x) + Heo đỏ (2x) + Tứ quý (4x) = 7x cược = 7,000 xu
    const penaltyNormal = calculateRottenPenalty(handWithRotten, BET, 1);
    expect(penaltyNormal).toBe(7000);

    // Hệ số nhân phạt x2: Nhân đôi = 14,000 xu
    const penaltyMult2 = calculateRottenPenalty(handWithRotten, BET, 2);
    expect(penaltyMult2).toBe(14000);
  });

  test('Tính tiền đền Cóng (Cháy bài)', () => {
    // Cóng đền cố định 26x cược = 26,000 xu (không bị nhân hệ số chặt)
    expect(calculateCongPenalty(BET)).toBe(26000);
  });
});
