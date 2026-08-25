import { describe, expect, it } from 'bun:test';
import { ScaledMctsEngine } from '../../src/ai/mcts-async-engine';
import { CardTracker } from '../../src/ai/card-tracker';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';

describe('Scaled MCTS Engine (Mô Phỏng Monte Carlo Mở Rộng 100-500+ Rollouts)', () => {
  it('1. Thực thi đồng bộ evaluateMovesSync với số lượng simulations mở rộng', () => {
    const botHand = [
      createCard(3, 'SPADES'),
      createCard(3, 'CLUBS'),
      createCard(15, 'HEARTS')
    ];

    const candPair = {
      cards: [createCard(3, 'SPADES'), createCard(3, 'CLUBS')],
      combination: identifyCombination([createCard(3, 'SPADES'), createCard(3, 'CLUBS')])!,
      isChop: false
    };

    const candTwo = {
      cards: [createCard(15, 'HEARTS')],
      combination: identifyCombination([createCard(15, 'HEARTS')])!,
      isChop: false
    };

    const tracker = new CardTracker([]);
    const remainingCards = { 'bot_1': 3, 'player_2': 3, 'player_3': 3 };

    const evals = ScaledMctsEngine.evaluateMovesSync(
      'bot_1',
      botHand,
      [candPair, candTwo],
      tracker,
      remainingCards,
      60
    );

    expect(evals.length).toBe(2);
    expect(evals[0].winRate).toBeGreaterThanOrEqual(0.0);
    expect(evals[0].winRate).toBeLessThanOrEqual(1.0);
  });

  it('2. Thực thi bất đồng bộ evaluateMovesAsync với batching và 100+ simulations', async () => {
    const botHand = [
      createCard(4, 'SPADES'),
      createCard(5, 'SPADES'),
      createCard(6, 'SPADES'),
      createCard(15, 'DIAMONDS')
    ];

    const candStraight = {
      cards: [createCard(4, 'SPADES'), createCard(5, 'SPADES'), createCard(6, 'SPADES')],
      combination: identifyCombination([createCard(4, 'SPADES'), createCard(5, 'SPADES'), createCard(6, 'SPADES')])!,
      isChop: false
    };

    const candTwo = {
      cards: [createCard(15, 'DIAMONDS')],
      combination: identifyCombination([createCard(15, 'DIAMONDS')])!,
      isChop: false
    };

    const tracker = new CardTracker([]);
    const remainingCards = { 'bot_mcts': 4, 'player_2': 4 };

    const startTime = Date.now();
    const evals = await ScaledMctsEngine.evaluateMovesAsync(
      'bot_mcts',
      botHand,
      [candStraight, candTwo],
      tracker,
      remainingCards,
      { simulationsCount: 100, maxCandidates: 5, batchSize: 50 }
    );
    const duration = Date.now() - startTime;

    expect(evals.length).toBe(2);
    expect(evals[0].simulationsCount).toBeGreaterThanOrEqual(50);
    // Phải hoàn thành cực nhanh
    expect(duration).toBeLessThan(1500);
  });

  it('3. Trả về mảng rỗng an toàn khi không có candidate moves', async () => {
    const tracker = new CardTracker([]);
    const evals = await ScaledMctsEngine.evaluateMovesAsync('bot_1', [], [], tracker, {});
    expect(evals).toEqual([]);
  });
});
