import { describe, test, expect, beforeEach } from 'bun:test';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision, DecisionContext, createDecisionContext } from '../../src/ai/decision-maker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { createCard } from '../../src/engine/card';
import { Card, PlayedMove, createDefaultGameRules } from '../../src/engine/types';

describe('Chiến Thuật Ra Bài Cầm Cái & Mở Màn 3 Bích Chuẩn Tiến Lên Miền Nam', () => {
  let tracker: CardTracker;

  beforeEach(() => {
    tracker = new CardTracker();
  });

  const createMockDecisionContext = (partial: Partial<DecisionContext> & { hand: Card[]; currentRoundLeadingMove?: PlayedMove | null; isLeadMove?: boolean }): DecisionContext => createDecisionContext({
    hand: partial.hand,
    currentRoundLeadingMove: partial.currentRoundLeadingMove ?? null,
    isFirstMoveOfGame: partial.isFirstMoveOfGame ?? false,
    isLeadMove: partial.isLeadMove ?? (partial.currentRoundLeadingMove ? false : true),
    tracker: partial.tracker ?? tracker,
    config: partial.config ?? BOT_PERSONAS.BOT_ELO_1750,
    remainingPlayerCards: partial.remainingPlayerCards ?? { p0: 9, p1: 9, p2: 9, p3: 9 },
    nextPlayerId: partial.nextPlayerId ?? 'p1',
    rules: partial.rules ?? createDefaultGameRules(),
    hasPlayedFirstCard: partial.hasPlayedFirstCard ?? true,
    isNextPlayerOneCard: partial.isNextPlayerOneCard ?? false,
    prohibitEndingWithTwo: partial.prohibitEndingWithTwo ?? true,
    gameMode: partial.gameMode ?? 'TRADITIONAL',
    mctsMap: partial.mctsMap ?? null,
    compositeRuleStrategy: partial.compositeRuleStrategy ?? null,
    opponentProfiles: partial.opponentProfiles ?? null
  });

  test('1. Mở màn 3 Bích: Bot có 3 Bích nằm trong 3 Đôi Thông (334455) KHÔNG ĐƯỢC xả cả 3 Đôi Thông', () => {
    // Bot có 3 Đôi Thông [334455] chứa 3♠, kèm theo một số bài khác
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(3, 'HEARTS'),
      createCard(4, 'SPADES'),
      createCard(4, 'HEARTS'),
      createCard(5, 'SPADES'),
      createCard(5, 'HEARTS'),
      createCard(8, 'CLUBS'),
      createCard(9, 'DIAMONDS'),
      createCard(10, 'SPADES'),
      createCard(11, 'HEARTS'),
      createCard(12, 'DIAMONDS'),
      createCard(13, 'SPADES'),
      createCard(15, 'HEARTS')
    ];

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: true, // Lượt đầu tiên bắt buộc chứa 3 Bích
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_1750,
      remainingPlayerCards: { p0: 13, p1: 13, p2: 13, p3: 13 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối không đánh 3 Đôi Thông (6 lá)
    expect(decision.combination?.type).not.toBe('THREE_PAIRS_SEQUENTIAL');
    expect(decision.cards?.length).toBeLessThanOrEqual(3);
    // Bắt buộc phải chứa 3 Bích
    expect(decision.cards?.some(c => c.rank === 3 && c.suit === 'SPADES')).toBe(true);
  });

  test('2. Cầm cái đầu vòng: Bot có rác nhỏ (3♠, 4♦) và Đôi Heo (2♠, 2♥) phải tẩu rác nhỏ trước, KHÔNG đánh Đôi Heo trước', () => {
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(4, 'DIAMONDS'),
      createCard(7, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(9, 'HEARTS'),
      createCard(10, 'DIAMONDS'),
      createCard(11, 'SPADES'),
      createCard(15, 'SPADES'),
      createCard(15, 'HEARTS')
    ];

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_1750,
      remainingPlayerCards: { p0: 9, p1: 9, p2: 9, p3: 9 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Không được xả Heo / Đôi Heo
    expect(decision.cards?.some(c => c.rank === 15)).toBe(false);
    // Phải đánh rác nhỏ (ví dụ 3 hoặc 4)
    expect(decision.combination?.type).toBe('SINGLE');
    expect(decision.cards?.[0].rank).toBeLessThanOrEqual(7);
  });

  test('3. Giữ Hàng Chặt phục kích: Bot có Tứ Quý 8 và các bài rác khác khi Cầm Cái phải tẩu rác, KHÔNG xả Tứ Quý bừa bãi', () => {
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(5, 'DIAMONDS'),
      createCard(8, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(8, 'DIAMONDS'),
      createCard(8, 'HEARTS'), // Tứ Quý 8
      createCard(10, 'SPADES'),
      createCard(12, 'HEARTS'),
      createCard(15, 'DIAMONDS')
    ];

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_1750,
      remainingPlayerCards: { p0: 9, p1: 9, p2: 9, p3: 9 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối không đánh Tứ Quý 8 khi cầm cái đầu vòng có rác
    expect(decision.combination?.type).not.toBe('FOUR_OF_A_KIND');
    expect(decision.cards?.length).toBe(1);
    expect(decision.cards?.[0].rank).toBe(3); // Tẩu lá 3 nhỏ nhất
  });

  test('4. Luật Cấm 2 Cuối: Bot có [3♠ rác + 2♥ Heo] khi cầm cái cờ tàn đánh 2♥ trước để về 3♠ (tránh thối 2)', () => {
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(15, 'HEARTS')
    ];

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_1750,
      remainingPlayerCards: { p0: 2, p1: 2, p2: 2, p3: 2 },
      nextPlayerId: 'p1',
      prohibitEndingWithTwo: true
    }));

    expect(decision.type).toBe('PLAY');
    // Với luật cấm 2 cuối, khi chỉ còn 2 lá [3♠, 2♥], bắt buộc đánh 2♥ trước để về 3♠ (nếu đánh 3 trước sẽ thối 2)
    expect(decision.cards?.[0].rank).toBe(15);
  });

  test('5. Luật Thông Thường (Không Cấm 2): Bot có [3♠ rác + 2♥ Heo] khi Cầm Cái đánh 3♠ trước, giữ 2♥ chốt hạ', () => {
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(15, 'HEARTS')
    ];

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_1750,
      remainingPlayerCards: { p0: 2, p1: 2, p2: 2, p3: 2 },
      nextPlayerId: 'p1',
      prohibitEndingWithTwo: false // Luật truyền thống
    }));

    expect(decision.type).toBe('PLAY');
    // Không cấm 2 cuối -> Đánh 3♠ trước, giữ 2♥ chốt hạ về nhất
    expect(decision.cards?.[0].rank).toBe(3);
  });

  test('6. Đếm Lá (COUNT_CARDS): Bot có 3 con 2, nhiều đôi và rác nhỏ -> Bắt buộc tẩu rác nhỏ trước, KHÔNG được xả 3 con 2', () => {
    // Bài cực mạnh: Sám 2 [2♠ 2♣ 2♦], Đôi 4 [4♠ 4♥], Đôi 7 [7♣ 7♦], rác 3♠, 6♦, 9♣
    const hand: Card[] = [
      createCard(3, 'SPADES'),  // Rác nhỏ
      createCard(4, 'SPADES'),  // Đôi 4
      createCard(4, 'HEARTS'),
      createCard(6, 'DIAMONDS'),// Rác nhỏ
      createCard(7, 'CLUBS'),   // Đôi 7
      createCard(7, 'DIAMONDS'),
      createCard(9, 'CLUBS'),   // Rác
      createCard(15, 'SPADES'), // 3 con 2 (Sám Heo)
      createCard(15, 'CLUBS'),
      createCard(15, 'DIAMONDS')
    ];

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_1750,
      remainingPlayerCards: { p0: 10, p1: 10, p2: 10, p3: 10 },
      nextPlayerId: 'p1',
      gameMode: 'COUNT_CARDS'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối không xả 3 con 2 (Sám 2) ngay từ đầu!
    expect(decision.combination?.type).not.toBe('TRIPLE');
    expect(decision.cards?.some(c => c.rank === 15)).toBe(false);
    // Phải đánh rác nhỏ (3♠) để thăm dò và tẩu rác dưới sự bảo kê của 3 con 2
    expect(decision.combination?.type).toBe('SINGLE');
    expect(decision.cards?.[0].rank).toBe(3);
  });

  test('7. Tái hiện Match Log (Đếm Lá Solo 1v1): Bot có Đôi K, Đôi A và rác nhỏ (3♦, 4♦, 6♦, 9♠, Q♥) -> Phải tẩu rác nhỏ 3♦, TUYỆT ĐỐI KHÔNG xả Đôi K hay Đôi A', () => {
    // Tái hiện chính xác tình huống Lượt 4 trong match log 1788610867844
    // Bot còn 9 lá: 3♦, 4♦, 6♦, 9♠, Q♥, Đôi K (K♠ K♣), Đôi A (A♠ A♦)
    const hand: Card[] = [
      createCard(3, 'DIAMONDS'),
      createCard(4, 'DIAMONDS'),
      createCard(6, 'DIAMONDS'),
      createCard(9, 'SPADES'),
      createCard(12, 'HEARTS'), // Q♥
      createCard(13, 'SPADES'), // K♠
      createCard(13, 'CLUBS'),  // K♣
      createCard(14, 'SPADES'), // A♠
      createCard(14, 'DIAMONDS')// A♦
    ];

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_1150, // Nicholas / Fighter tầm ELO 1200
      remainingPlayerCards: { p0: 9, p1: 9 }, // Solo 1v1
      nextPlayerId: 'p0',
      gameMode: 'COUNT_CARDS'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối KHÔNG ĐƯỢC xả Đôi K hay Đôi A khi còn rác nhỏ!
    expect(decision.combination?.type).not.toBe('PAIR');
    expect(decision.cards?.some(c => c.rank >= 13)).toBe(false);

    // Bắt buộc phải tẩu rác nhỏ nhất (3♦) trước
    expect(decision.combination?.type).toBe('SINGLE');
    expect(decision.cards?.[0].rank).toBe(3);
  });

  test('8. Đếm Lá có Sảnh dài (>= 3 lá): Bot có Sảnh 3-4-5-6 + Đôi K + rác -> Vẫn ưu tiên xả Sảnh dài 4 lá trước', () => {
    // Sảnh 3-4-5-6 (4 lá), Đôi K (K♠ K♣), rác 9♠, Q♥
    const hand: Card[] = [
      createCard(3, 'DIAMONDS'),
      createCard(4, 'DIAMONDS'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'DIAMONDS'), // Sảnh 4 lá
      createCard(9, 'SPADES'),   // Rác
      createCard(12, 'HEARTS'),  // Rác Q
      createCard(13, 'SPADES'),  // Đôi K
      createCard(13, 'CLUBS')
    ];

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_1150,
      remainingPlayerCards: { p0: 8, p1: 8 },
      nextPlayerId: 'p0',
      gameMode: 'COUNT_CARDS'
    }));

    expect(decision.type).toBe('PLAY');
    // Với Sảnh dài 4 lá, ưu tiên xả Sảnh trước để giảm 4 lá tồn trong Đếm Lá
    expect(decision.combination?.type).toBe('STRAIGHT');
    expect(decision.cards?.length).toBe(4);
    expect(decision.cards?.[0].rank).toBe(3);
  });
});
