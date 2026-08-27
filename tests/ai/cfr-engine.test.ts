import { describe, expect, it, beforeEach } from 'bun:test';
import { CfrEngine } from '../../src/ai/cfr-engine';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import { BotConfig } from '../../src/ai/types';
import { createDefaultOpponentProfile } from '../../src/ai/opponent-profiler';
import { PlayedMove } from '../../src/engine/types';

describe('CFR & Regret Matching Engine (Lý Thuyết Trò Chơi & Cân Bằng Nash)', () => {
  let cfr: CfrEngine;

  const grandmasterBot: BotConfig = {
    id: 'bot_alpha',
    name: 'Alpha-TL',
    avatar: null,
    description: 'Thần bài CFR',
    elo: 2500,
    memoryDepth: 1.0,
    riskAppetite: 0.8,
    trapTendency: 0.9,
    baitingTendency: 0.8,
    antiLeaderAggression: 1.0,
    tempoControl: 1.0,
    damageControl: 0.8,
    turnsToWinLookahead: 1.0,
    dynamicHandSacrifice: 1.0,
    bombInferenceRate: 1.0,
    semiCooperativeCooperation: 1.0,
    positionalAwareness: 1.0,
    inMatchAdaptationRate: 1.0,
    mctsSimulations: 80,
    handPartitioningOptimality: 0.9,
    simulationLookahead: 4,
    useMinimaxEndgame: true,
    useBayesianInference: true,
    useNashEquilibrium: true,
    useDynamicRepartitioning: true
  };

  const rookieBot: BotConfig = {
    id: 'bot_rookie',
    name: 'Bé Tập Sự',
    avatar: null,
    description: 'Rookie',
    elo: 850,
    memoryDepth: 0.2,
    riskAppetite: 0.3,
    trapTendency: 0.2,
    baitingTendency: 0.1,
    antiLeaderAggression: 0.4,
    tempoControl: 0.2,
    damageControl: 0.3,
    turnsToWinLookahead: 0.0,
    dynamicHandSacrifice: 0.0,
    bombInferenceRate: 0.0,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.0,
    inMatchAdaptationRate: 0.0,
    mctsSimulations: 0,
    handPartitioningOptimality: 0.2,
    simulationLookahead: 0,
    useMinimaxEndgame: false,
    useBayesianInference: false,
    useNashEquilibrium: false,
    useDynamicRepartitioning: false
  };

  beforeEach(() => {
    cfr = CfrEngine.getInstance();
    cfr.reset();
  });

  it('1. Tính toán phân phối xác suất đồng đều khi chưa có Regret', () => {
    const strategy = cfr.getStrategy('INFO_SET_ROUND_1', ['PLAY_PAIR', 'PLAY_SINGLE', 'PASS']);
    expect(strategy['PLAY_PAIR']).toBeCloseTo(1 / 3, 2);
    expect(strategy['PLAY_SINGLE']).toBeCloseTo(1 / 3, 2);
    expect(strategy['PASS']).toBeCloseTo(1 / 3, 2);
  });

  it('2. Cập nhật Regret và điều chỉnh Mixed Strategy theo Nash Approximation', () => {
    // Hành động PLAY_PAIR đem lại kết quả tốt (+10 regret)
    cfr.updateRegret('INFO_SET_MIDGAME', 'PLAY_PAIR', 10);
    cfr.updateRegret('INFO_SET_MIDGAME', 'PASS', 0);

    const updatedStrategy = cfr.getStrategy('INFO_SET_MIDGAME', ['PLAY_PAIR', 'PASS']);
    expect(updatedStrategy['PLAY_PAIR']).toBe(1.0);
    expect(updatedStrategy['PASS']).toBe(0.0);
  });

  it('3. Lấy mẫu hành động (Action Sampling) ngẫu nhiên theo phân phối', () => {
    const strategy = { ACTION_A: 0.8, ACTION_B: 0.2 };
    expect(cfr.sampleAction(strategy, 0.5)).toBe('ACTION_A');
    expect(cfr.sampleAction(strategy, 0.9)).toBe('ACTION_B');
  });

  it('4. Đánh giá Bluff Pass: Rookie không bao giờ Bluff Pass', () => {
    const hand = [createCard(15, 'HEARTS'), createCard(14, 'CLUBS')];
    const nineSpades = createCard(9, 'SPADES');
    const leadingMove: PlayedMove = {
      playerId: 'player_1',
      combination: identifyCombination([nineSpades])!,
      timestamp: Date.now(),
      isChop: null,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null
    };
    const targetProfile = createDefaultOpponentProfile('player_1');

    const result = cfr.evaluateBluffPass(hand, leadingMove, 'player_1', targetProfile, rookieBot, 8);
    expect(result.shouldBluffPass).toBe(false);
  });

  it('5. Đánh giá Bluff Pass: Thần Bài có thể chủ động Nhịn Bài khi cầm Heo Cơ để bẫy', () => {
    const hand = [createCard(15, 'HEARTS'), createCard(14, 'CLUBS')];
    const tenSpades = createCard(10, 'SPADES');
    const leadingMove: PlayedMove = {
      playerId: 'player_greedy',
      combination: identifyCombination([tenSpades])!,
      timestamp: Date.now(),
      isChop: null,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null
    };
    const greedyProfile = {
      ...createDefaultOpponentProfile('player_greedy'),
      heoGreedRate: 0.85
    };

    // Đánh giá nhiều lần để kiểm tra xác suất
    let bluffCount = 0;
    for (let i = 0; i < 50; i++) {
      const res = cfr.evaluateBluffPass(hand, leadingMove, 'player_greedy', greedyProfile, grandmasterBot, 7);
      if (res.shouldBluffPass) bluffCount++;
    }

    expect(bluffCount).toBeGreaterThan(0);
  });
});
