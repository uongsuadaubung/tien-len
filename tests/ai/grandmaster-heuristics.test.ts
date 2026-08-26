import { describe, test, expect, beforeEach } from 'bun:test';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision, DecisionContext, calculateTurnsToClearHand } from '../../src/ai/decision-maker';
import { partitionHand } from '../../src/ai/hand-partitioner';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { createCard } from '../../src/engine/card';
import { Card, PlayedMove, createDefaultGameRules, Rank } from '../../src/engine/types';

describe('5 Cơ Chế Ra Quyết Định Cấp Đại Kiện Tướng Cho AI Bot (AI Grandmaster Upgrade)', () => {
  let tracker: CardTracker;

  beforeEach(() => {
    tracker = new CardTracker();
  });

  const createMockContext = (partial: Partial<DecisionContext> & { hand: Card[] }): DecisionContext => ({
    hand: partial.hand,
    currentRoundLeadingMove: partial.currentRoundLeadingMove ?? null,
    isFirstMoveOfGame: partial.isFirstMoveOfGame ?? false,
    isLeadMove: partial.isLeadMove ?? false,
    tracker: partial.tracker ?? tracker,
    config: partial.config ?? BOT_PERSONAS.BOT_ELO_1900,
    remainingPlayerCards: partial.remainingPlayerCards ?? { p0: 10, p1: 10, p2: 10, p3: 10 },
    nextPlayerId: partial.nextPlayerId ?? 'p1',
    rules: partial.rules ?? createDefaultGameRules(),
    hasPlayedFirstCard: partial.hasPlayedFirstCard ?? true,
    isNextPlayerOneCard: partial.isNextPlayerOneCard ?? false,
    prohibitEndingWithTwo: partial.prohibitEndingWithTwo ?? false,
    gameMode: partial.gameMode ?? 'TRADITIONAL',
    mctsMap: partial.mctsMap ?? null,
    compositeRuleStrategy: partial.compositeRuleStrategy ?? null,
    opponentProfiles: partial.opponentProfiles ?? null
  });

  test('1. Bẻ Bài Sinh Tử (Dynamic Hand Sacrifice): Bot Tier 4 xé Đôi Át khi đỡ bài để chặn người 1 lá chống đền bài', () => {
    // Đối thủ trước đánh 10♠. Người kế tiếp sau Bot (p1) chỉ còn 1 lá!
    const leadingMove: PlayedMove = {
      playerId: 'p0',
      combination: {
        type: 'SINGLE',
        cards: [createCard(10, 'SPADES')],
        highestCard: createCard(10, 'SPADES'),
        length: 1
      },
      timestamp: Date.now()
    };

    // Bot có [Đôi Át (A♠, A♥) + rác nhỏ 3♠, 4♦]. Để đỡ 10♠, Bot phải xé Đôi Át!
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(4, 'DIAMONDS'),
      createCard(14, 'SPADES'),
      createCard(14, 'HEARTS')
    ];

    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: false,
      currentRoundLeadingMove: leadingMove,
      isNextPlayerOneCard: true,
      config: BOT_PERSONAS.BOT_ELO_1900, // Tier 4 Master (dynamicHandSacrifice = 0.9)
      remainingPlayerCards: { p0: 10, p1: 1, p2: 8, p3: 7 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Phải xé Đôi Át để đánh lá Át đè 10♠, chặn không cho người 1 lá về bài
    expect(decision.combination?.type).toBe('SINGLE');
    expect(decision.cards?.[0].rank).toBe(14);
  });

  test('2. Chặn Đầu Người 1 Lá Khi Cầm Cái: Bot đánh lá bài to nhất khi không có bộ', () => {
    // Toàn bộ bài là rác đơn lẻ [3♠, 5♦, 7♣, 9♥, A♥]
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(5, 'DIAMONDS'),
      createCard(7, 'CLUBS'),
      createCard(9, 'HEARTS'),
      createCard(14, 'HEARTS')
    ];

    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: true,
      isNextPlayerOneCard: true,
      config: BOT_PERSONAS.BOT_ELO_1900,
      remainingPlayerCards: { p0: 10, p1: 1, p2: 8, p3: 7 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Bắt buộc phải đánh lá to nhất (A♥ - rank 14)
    expect(decision.combination?.type).toBe('SINGLE');
    expect(decision.cards?.[0].rank).toBe(14);
    expect(decision.cards?.[0].suit).toBe('HEARTS');
  });

  test('3. Bẫy Nhử Mồi Chặt Heo (Baiting Trap): Bot ôm Tứ Quý thả Át mồi để câu Heo đối thủ', () => {
    // Bot có Tứ Quý 8 + Át Bích + vài bài khác
    const hand: Card[] = [
      createCard(8, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(8, 'DIAMONDS'),
      createCard(8, 'HEARTS'), // Tứ Quý 8
      createCard(10, 'SPADES'),
      createCard(14, 'SPADES')  // Át Bích làm mồi
    ];

    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: true,
      isNextPlayerOneCard: false,
      config: BOT_PERSONAS.BOT_ELO_1950, // Tier 4 Master (baitingTendency = 0.8)
      remainingPlayerCards: { p0: 9, p1: 9, p2: 9, p3: 9 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Phải đánh lá Át mồi ra giữa bàn
    expect(decision.combination?.type).toBe('SINGLE');
    expect(decision.cards?.[0].rank).toBe(14);
    expect(decision.reason).toContain('Baiting Trap');
  });

  test('4. Đếm Nhịp Về Bài (Turns-to-Win): calculateTurnsToClearHand tính toán chính xác số nhịp', () => {
    // Hand 1: Sảnh 5 lá [5-6-7-8-9] + Đôi 10 [10♠, 10♥] -> Đúng 2 nhịp!
    const hand1: Card[] = [
      createCard(5, 'SPADES'),
      createCard(6, 'CLUBS'),
      createCard(7, 'DIAMONDS'),
      createCard(8, 'HEARTS'),
      createCard(9, 'SPADES'),
      createCard(10, 'SPADES'),
      createCard(10, 'HEARTS')
    ];
    const partition1 = partitionHand(hand1, 1.0);
    const turns1 = calculateTurnsToClearHand(hand1, partition1);
    expect(turns1).toBe(2);

    // Hand 2: 3 rác nhỏ (3, 5, 7) + 1 Heo Cơ -> Đúng 4 nhịp!
    const hand2: Card[] = [
      createCard(3, 'SPADES'),
      createCard(5, 'CLUBS'),
      createCard(7, 'DIAMONDS'),
      createCard(15, 'HEARTS')
    ];
    const partition2 = partitionHand(hand2, 1.0);
    const turns2 = calculateTurnsToClearHand(hand2, partition2);
    expect(turns2).toBe(4);
  });

  test('5. Suy Luận Hàng Chặt Ẩn (Bomb Probability Inference): CardTracker tính toán xác suất Tứ Quý khi rank chưa ra lá nào', () => {
    const customTracker = new CardTracker();
    // Chưa có lá nào chơi -> nguy cơ ban đầu
    expect(customTracker.getBombProbability()).toBeGreaterThan(0);

    // Giả lập 24 lá đã chơi trên bàn nhưng rank 10 chưa hề xuất hiện
    for (let r = 3; r <= 8; r++) {
      for (const suit of ['SPADES', 'CLUBS', 'DIAMONDS', 'HEARTS'] as const) {
        customTracker.recordPlayedCardId(createCard(r as Rank, suit).id);
      }
    }

    const probAfter24Cards = customTracker.getBombProbability();
    expect(probAfter24Cards).toBeGreaterThan(0.5);
  });

  test('6. Liên Minh Tạm Thời Dìm Người Dẫn Đầu (Semi-Cooperative Passing): Bot nhường lượt khi đồng minh đã chặn người 1 lá', () => {
    // Bàn 4 người, Player p1 còn 1 lá.
    // Player p2 (đồng minh) vừa đánh con 2 Bích (2♠) cực to để chặn p1.
    const allyMove: PlayedMove = {
      playerId: 'p2',
      combination: {
        type: 'SINGLE',
        cards: [createCard(15, 'SPADES')],
        highestCard: createCard(15, 'SPADES'),
        length: 1
      },
      timestamp: Date.now()
    };

    // Bot có [2♥ Heo Cơ + rác 3♠, 4♦]
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(4, 'DIAMONDS'),
      createCard(15, 'HEARTS')
    ];

    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: false,
      currentRoundLeadingMove: allyMove,
      config: BOT_PERSONAS.BOT_ELO_2050, // Tier 5 (semiCooperativeCooperation = 1.0)
      remainingPlayerCards: { p0: 8, p1: 1, p2: 6, p3: 7 }, // p1 còn 1 lá
      nextPlayerId: 'p3',
      gameMode: 'TRADITIONAL'
    }));

    // Bot chủ động BỎ LƯỢT (PASS) để đồng minh p2 tiếp tục nắm quyền đi bài dìm p1
    expect(decision.type).toBe('PASS');
  });
});
