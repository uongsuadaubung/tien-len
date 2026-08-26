import { describe, test, expect, beforeEach } from 'bun:test';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { createCard } from '../../src/engine/card';
import { Card, createDefaultGameRules } from '../../src/engine/types';
import { resolveAIModePolicy, CountCardsAIModePolicy, TraditionalAIModePolicy, WinnerTakesAllAIModePolicy } from '../../src/ai/mode-policies';

import { OpponentProfiler } from '../../src/ai/opponent-profiler';

describe('Chiến Thuật AI Thích Ứng Theo Từng Chế Độ Chơi (Mode-Specific AI Strategies)', () => {
  let tracker: CardTracker;

  beforeEach(() => {
    tracker = new CardTracker();
    OpponentProfiler.getInstance().reset();
  });

  test('1. Strategy Resolver: Định vị chính xác Strategy cho từng chế độ game', () => {
    expect(resolveAIModePolicy('COUNT_CARDS')).toBeInstanceOf(CountCardsAIModePolicy);
    expect(resolveAIModePolicy('TRADITIONAL')).toBeInstanceOf(TraditionalAIModePolicy);
    expect(resolveAIModePolicy('RANKED')).toBeInstanceOf(TraditionalAIModePolicy);
    expect(resolveAIModePolicy('WINNER_TAKES_ALL')).toBeInstanceOf(WinnerTakesAllAIModePolicy);
  });

  test('2. Chế độ Đếm Lá (COUNT_CARDS): Cầm Sảnh 5 lá và Rác lẻ, Bot ưu tiên xả Sảnh 5 lá trước để giảm số lá tồn cấp tốc', () => {
    const localTracker = new CardTracker();
    // Bot có Sảnh 5 lá [3-4-5-6-7] và các lá rác lẻ [9, 10, K]
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(4, 'DIAMONDS'),
      createCard(5, 'HEARTS'),
      createCard(6, 'SPADES'),
      createCard(7, 'DIAMONDS'),
      createCard(9, 'CLUBS'),
      createCard(10, 'SPADES'),
      createCard(13, 'HEARTS')
    ];

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker: localTracker,
      config: { ...BOT_PERSONAS.BOT_ELO_1750, mctsSimulations: 0 },
      remainingPlayerCards: { p0: 8, p1: 8, p2: 8, p3: 8 },
      nextPlayerId: 'p1',
      rules: createDefaultGameRules({ settlementRule: 'CARD_COUNT' }),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: true,
      gameMode: 'COUNT_CARDS', // Chế độ Đếm Lá
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    });

    expect(decision.type).toBe('PLAY');
    // Trong chế độ Đếm Lá: Phải xả Sảnh 5 lá trước (cards.length === 5)
    expect(decision.combination?.type).toBe('STRAIGHT');
    expect(decision.cards?.length).toBe(5);
  });

  test('3. Chế độ Truyền Thống / Đấu Hạng (TRADITIONAL / RANKED): Cùng bộ bài trên, Bot tẩu rác nhỏ (9♣) trước để thăm dò và giữ Sảnh bọc lót', () => {
    const localTracker = new CardTracker();
    // Cùng một bài: Sảnh 5 lá [3-4-5-6-7] và các lá rác lẻ [9, 10, K]
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(4, 'DIAMONDS'),
      createCard(5, 'HEARTS'),
      createCard(6, 'SPADES'),
      createCard(7, 'DIAMONDS'),
      createCard(9, 'CLUBS'),
      createCard(10, 'SPADES'),
      createCard(13, 'HEARTS')
    ];

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker: localTracker,
      config: { ...BOT_PERSONAS.BOT_ELO_1750, mctsSimulations: 0 },
      remainingPlayerCards: { p0: 8, p1: 8, p2: 8, p3: 8 },
      nextPlayerId: 'p1',
      rules: createDefaultGameRules({ settlementRule: 'TRADITIONAL_RANK_BASED' }),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: true,
      gameMode: 'TRADITIONAL', // Chế độ Truyền Thống
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    });

    expect(decision.type).toBe('PLAY');
    // Trong chế độ Truyền Thống: Phải tẩu lá rác nhỏ nhất trước (9♣)
    expect(decision.combination?.type).toBe('SINGLE');
    expect(decision.cards?.[0].rank).toBe(9);
  });

  test('4. Chế độ Đếm Lá Sát Phạt: Bot xả Sảnh dài trước để tránh bị phạt và tránh Cóng', () => {
    const hand: Card[] = [
      createCard(4, 'SPADES'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'HEARTS'),
      createCard(7, 'CLUBS'),
      createCard(9, 'SPADES'),
      createCard(11, 'DIAMONDS')
    ];

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config: { ...BOT_PERSONAS.BOT_ELO_1750, mctsSimulations: 0 },
      remainingPlayerCards: { p0: 6, p1: 6, p2: 6, p3: 6 },
      nextPlayerId: 'p1',
      rules: createDefaultGameRules({ settlementRule: 'CARD_COUNT' }),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: true,
      gameMode: 'COUNT_CARDS',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.combination?.type).toBe('STRAIGHT');
    expect(decision.cards?.length).toBe(4);
  });
});
