import { describe, test, expect } from 'bun:test';
import { BayesianCardInferenceEngine } from '../../src/ai/solvers/bayesian-card-tracker';
import { CardTracker } from '../../src/ai/card-tracker';
import { createCard } from '../../src/engine/card';
import { PlayedMove } from '../../src/engine/types';

describe('Bayesian Card Inference Engine Unit Tests', () => {
  test('1. P(Card | Pass History): Bỏ lượt Đôi làm giảm trọng số xác suất giữ Đôi', () => {
    const tracker = new CardTracker();
    const unseenCards = [
      createCard(5, 'SPADES'),
      createCard(5, 'DIAMONDS'),
      createCard(10, 'HEARTS'),
      createCard(14, 'CLUBS')
    ];

    // Đối thủ p1 bỏ lượt khi người khác đánh Đôi
    const pairMove: PlayedMove = {
      playerId: 'p0',
      combination: {
        type: 'PAIR',
        cards: [createCard(7, 'SPADES'), createCard(7, 'CLUBS')],
        length: 2,
        highestCard: createCard(7, 'CLUBS')
      },
      timestamp: Date.now(),
      isChop: false,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null
    };

    tracker.recordMove(pairMove);
    tracker.recordPass('p1', 'PAIR');

    const weights = BayesianCardInferenceEngine.calculatePlayerCardWeights('p1', unseenCards, tracker);

    expect(weights.get('5_SPADES')).toBeDefined();
    // Trọng số các lá bài bị giảm xuống do đối thủ từng bỏ lượt Đôi
    expect(weights.get('5_SPADES')!).toBeLessThan(1.0);
  });

  test('2. Bỏ lượt Lá Đơn nhỏ làm giảm xác suất giữ bài Đơn lớn (J, Q, K, A)', () => {
    const tracker = new CardTracker();
    const unseenCards = [
      createCard(3, 'HEARTS'),
      createCard(12, 'SPADES'), // Q
      createCard(14, 'HEARTS')  // A
    ];

    tracker.recordPass('p2', 'SINGLE');

    const weights = BayesianCardInferenceEngine.calculatePlayerCardWeights('p2', unseenCards, tracker);

    // Lá 3 không bị giảm mạnh như lá lớn Q hay A
    const weight3 = weights.get('3_HEARTS') || 1.0;
    const weightA = weights.get('14_HEARTS') || 1.0;

    expect(weightA).toBeLessThan(weight3);
    expect(weightA).toBeLessThan(0.7);
  });

  test('3. Weighted PIMC Determinization: Lấy mẫu phân phối bài chuẩn xác về số lượng', () => {
    const tracker = new CardTracker();
    const unseenCards = [
      createCard(3, 'SPADES'),
      createCard(4, 'CLUBS'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'HEARTS'),
      createCard(7, 'SPADES'),
      createCard(8, 'CLUBS')
    ];

    const remainingCounts = { p1: 3, p2: 2, p3: 1 };
    const activePlayerIds = ['p1', 'p2', 'p3'];

    const sampledHands = BayesianCardInferenceEngine.sampleWeightedHands(
      unseenCards,
      remainingCounts,
      tracker,
      activePlayerIds
    );

    expect(sampledHands.p1.length).toBe(3);
    expect(sampledHands.p2.length).toBe(2);
    expect(sampledHands.p3.length).toBe(1);

    // Không trùng lặp lá bài giữa các người chơi
    const allSampledIds = [
      ...sampledHands.p1.map(c => c.id),
      ...sampledHands.p2.map(c => c.id),
      ...sampledHands.p3.map(c => c.id)
    ];
    const uniqueIds = new Set(allSampledIds);
    expect(uniqueIds.size).toBe(6);
  });
});
