import { describe, test, expect } from 'bun:test';
import { NashEquilibriumSolver } from '../../src/ai/solvers/nash-equilibrium-solver';
import { CardTracker } from '../../src/ai/card-tracker';
import { getBotConfig } from '../../src/ai/bot-factory';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';

describe('Nash Equilibrium Mixed-Strategy Solver Unit Tests', () => {
  test('1. calculateNashProbability: Luôn nằm trong khoảng [0.1, 0.9] an toàn', () => {
    const p1 = NashEquilibriumSolver.calculateNashProbability(100, 100);
    expect(p1).toBe(0.5);

    const pExtremeHigh = NashEquilibriumSolver.calculateNashProbability(1000, 10);
    expect(pExtremeHigh).toBe(0.9);

    const pExtremeLow = NashEquilibriumSolver.calculateNashProbability(10, 1000);
    expect(pExtremeLow).toBe(0.1);
  });

  test('2. Cờ tàn <= 3 lá: Nash xác định dứt điểm chắc chắn 100% (probability = 1.0)', () => {
    const tracker = new CardTracker();
    const config = getBotConfig('BOT_ELO_2750');
    const move = {
      cards: [createCard(15, 'HEARTS')],
      combination: identifyCombination([createCard(15, 'HEARTS')])!,
      isChop: false
    };

    const res = NashEquilibriumSolver.evaluateNashChoppingAction(
      move,
      null,
      tracker,
      config,
      2 // remainingCardsCount = 2
    );

    expect(res.shouldTakeAction).toBe(true);
    expect(res.probability).toBe(1.0);
  });

  test('3. Chặt Heo Đỏ bằng Tứ Quý: Trả về kết quả đánh giá hợp lệ', () => {
    const tracker = new CardTracker();
    const config = getBotConfig('BOT_ELO_3200');
    const fourCards = [
      createCard(8, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(8, 'DIAMONDS'),
      createCard(8, 'HEARTS')
    ];
    const move = {
      cards: fourCards,
      combination: identifyCombination(fourCards)!,
      isChop: true
    };
    const targetTwo = identifyCombination([createCard(15, 'HEARTS')])!;

    const res = NashEquilibriumSolver.evaluateNashChoppingAction(
      move,
      targetTwo,
      tracker,
      config,
      8 // còn 8 lá
    );

    expect(res).toBeDefined();
    expect(typeof res.shouldTakeAction).toBe('boolean');
    expect(res.probability).toBeGreaterThan(0);
    expect(res.probability).toBeLessThanOrEqual(1.0);
  });
});
