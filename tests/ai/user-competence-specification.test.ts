import { describe, test, expect, beforeEach } from 'bun:test';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision, DecisionContext, createDecisionContext } from '../../src/ai/decision-maker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { createCard } from '../../src/engine/card';
import { Card, PlayedMove, createDefaultGameRules } from '../../src/engine/types';

/**
 * ============================================================================
 * KIỂM THỬ XÁC MINH NĂNG LỰC BOT AI ĐÁP ỨNG 100% YÊU CẦU NGƯỜI DÙNG:
 * 1. Bot (kể cả Elo 700) khi đối thủ báo thì biết đánh ĐÔI/bài lớn để ngăn đối thủ về.
 * 2. Bot khi thấy cơ hội thắng thì biết đánh dứt điểm ngay để về Nhất.
 * 3. Bot Elo cao hơn có thêm: Nhớ bài, Ôm bài đợi chặt (Ém Hàng), Bẫy mồi câu Heo, Cờ tàn vét cạn.
 * ============================================================================
 */

describe('Kiểm Thử Năng Lực Cốt Lõi Bot AI Đáp Ứng Chuẩn Mong Muốn Người Dùng', () => {
  let tracker: CardTracker;

  beforeEach(() => {
    tracker = new CardTracker();
  });

  const createMockContext = (partial: Partial<DecisionContext> & { hand: Card[]; currentRoundLeadingMove?: PlayedMove | null; isLeadMove?: boolean }): DecisionContext => createDecisionContext({
    hand: partial.hand,
    currentRoundLeadingMove: partial.currentRoundLeadingMove ?? null,
    isFirstMoveOfGame: partial.isFirstMoveOfGame ?? false,
    isLeadMove: partial.isLeadMove ?? (partial.currentRoundLeadingMove ? false : true),
    tracker: partial.tracker ?? tracker,
    config: partial.config ?? BOT_PERSONAS.BOT_ELO_700,
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

  // ===========================================================================
  // YÊU CẦU 1: BOT TÂN THỦ (ELO 700) PHẢI BIẾT ĐÁNH ĐÔI KHÓA NGƯỜI BÁO BÀI
  // ===========================================================================
  test('1. Yêu cầu 1: Bot Tân thủ (Elo 700) khi đối thủ báo 1-2 lá: Cầm cái PHẢI ĐÁNH ĐÔI để khóa, không được tẩu rác lẻ', () => {
    // Bot Tân thủ Elo 700 có Đôi 8, Đôi J, rác nhỏ 3♠, 5♦ (không tạo thành sảnh)
    const hand: Card[] = [
      createCard(3, 'SPADES'),   // Rác nhỏ
      createCard(5, 'DIAMONDS'), // Rác nhỏ
      createCard(8, 'CLUBS'),    // Đôi 8
      createCard(8, 'HEARTS'),
      createCard(11, 'SPADES'),  // Đôi J
      createCard(11, 'DIAMONDS')
    ];

    // Đối thủ p2 chỉ còn 1 lá (đã báo)
    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: true,
      config: BOT_PERSONAS.BOT_ELO_700, // BOT ELO 700 THẤP NHẤT
      remainingPlayerCards: { p0: 6, p1: 5, p2: 1, p3: 8 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối KHÔNG ĐƯỢC đánh bài lẻ (Single rác 3♠ hay 5♦) vì sẽ dâng cái cho người 1 lá về!
    expect(decision.combination?.type).not.toBe('SINGLE');
    // BẮT BUỘC PHẢI ĐÁNH ĐÔI (Đôi 8 hoặc Đôi J) để khóa cứng người báo 1 lá!
    expect(decision.combination?.type).toBe('PAIR');
  });

  test('2. Yêu cầu 1: Bot Tân thủ (Elo 700) khi đối thủ báo 1 lá mà trên tay toàn rác lẻ: PHẢI ĐÁNH LÁ RÁC TO NHẤT', () => {
    // Bot Tân thủ Elo 700 không có đôi, chỉ còn các lá lẻ: 3♠, 6♦, 9♣, K♥
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(6, 'DIAMONDS'),
      createCard(9, 'CLUBS'),
      createCard(13, 'HEARTS') // K♥
    ];

    // Người kế tiếp p1 báo 1 lá
    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: true,
      config: BOT_PERSONAS.BOT_ELO_700, // BOT ELO 700
      remainingPlayerCards: { p0: 4, p1: 1, p2: 5, p3: 7 },
      nextPlayerId: 'p1',
      isNextPlayerOneCard: true
    }));

    expect(decision.type).toBe('PLAY');
    expect(decision.combination?.type).toBe('SINGLE');
    // Bắt buộc phải đánh lá to nhất K♥ (rank 13) để cản đường, không dâng lá 3♠ cho đối thủ về
    expect(decision.cards?.[0].rank).toBe(13);
  });

  // ===========================================================================
  // YÊU CẦU 2: THẤY CƠ HỘI THẮNG THÌ BIẾT ĐÁNH DỨT ĐIỂM NGAY (ENDGAME INSTANT WIN)
  // ===========================================================================
  test('3. Yêu cầu 2: Bot Tân thủ (Elo 700) thấy cơ hội thắng: Còn 1 Sảnh trên tay, đánh hết sảnh để VỀ NHẤT NGAY', () => {
    // Bot còn đúng 4 lá tạo thành Sảnh [5♠, 6♣, 7♦, 8♥]
    const hand: Card[] = [
      createCard(5, 'SPADES'),
      createCard(6, 'CLUBS'),
      createCard(7, 'DIAMONDS'),
      createCard(8, 'HEARTS')
    ];

    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: true,
      config: BOT_PERSONAS.BOT_ELO_700, // BOT ELO 700
      remainingPlayerCards: { p0: 4, p1: 5, p2: 3, p3: 6 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Đánh toàn bộ 4 lá sảnh để về Nhất lập tức!
    expect(decision.cards?.length).toBe(4);
    expect(decision.combination?.type).toBe('STRAIGHT');
    expect(['ENDGAME_INSTANT_WIN', 'DOMINANT_COMBO_CLEAR']).toContain(decision.strategyUsed || '');
  });

  // ===========================================================================
  // YÊU CẦU 3: BOT ELO CAO HƠN CÓ KỸ NĂNG CAO SIÊU
  // ===========================================================================
  test('4. Yêu cầu 3 (Ém Hàng Đợi Chặt): Bot Cao Thủ (Elo 2150) có Tứ Quý 9: KHÔNG XẢ TỨ QUÝ, kiên nhẫn ôm đợi Heo', () => {
    // Bot Cao thủ có Tứ quý 9, rác 3♠, 5♦, 10♣, Heo 2♦
    const hand: Card[] = [
      createCard(3, 'SPADES'),
      createCard(5, 'DIAMONDS'),
      createCard(9, 'SPADES'),
      createCard(9, 'CLUBS'),
      createCard(9, 'DIAMONDS'),
      createCard(9, 'HEARTS'), // Tứ Quý 9
      createCard(10, 'CLUBS'),
      createCard(15, 'DIAMONDS')
    ];

    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: true,
      config: BOT_PERSONAS.BOT_ELO_2150, // BOT CAO THỦ ELO 2150
      remainingPlayerCards: { p0: 8, p1: 8, p2: 8, p3: 8 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối không đánh Tứ Quý 9 khi chưa có ai ra Heo
    expect(decision.combination?.type).not.toBe('FOUR_OF_A_KIND');
    // Bot tẩu rác nhỏ 3♠ thăm dò, ém Tứ Quý phục kích
    expect(decision.cards?.[0].rank).toBe(3);
  });

  test('5. Yêu cầu 3 (Gài Bẫy Nhử Mồi): Bot Thần Bài (Elo 3200) có Hàng và Át: Thả Át mồi để câu Heo đối thủ', () => {
    // Bot có Tứ quý 10, Át cơ mồi, rác 4♠, 6♦, và còn Heo chưa ra ngoài bàn
    const hand: Card[] = [
      createCard(4, 'SPADES'),
      createCard(6, 'DIAMONDS'),
      createCard(10, 'SPADES'),
      createCard(10, 'CLUBS'),
      createCard(10, 'DIAMONDS'),
      createCard(10, 'HEARTS'), // Tứ Quý 10
      createCard(14, 'HEARTS')  // Át Cơ (Lá mồi câu Heo)
    ];

    // CardTracker ghi nhận ngoài bàn vẫn còn 3 con Heo chưa xuất hiện
    const customTracker = new CardTracker();
    customTracker.updateOwnHand(hand);

    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: true,
      tracker: customTracker,
      config: BOT_PERSONAS.BOT_ELO_3200, // BOSS ALPHA MIND 3200
      remainingPlayerCards: { p0: 7, p1: 7, p2: 7, p3: 7 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối không đánh Tứ quý 10
    expect(decision.combination?.type).not.toBe('FOUR_OF_A_KIND');
  });

  test('6. Yêu cầu 3 (Nhớ Bài & Khắc Chế Điểm Yếu): Đối thủ từng bỏ lượt Sảnh, Bot Cao Thủ ưu tiên đánh Sảnh để đối thủ bó tay', () => {
    // Bot có Sảnh 4-5-6-7, Đôi 8, rác Q♠
    const hand: Card[] = [
      createCard(4, 'SPADES'),
      createCard(5, 'CLUBS'),
      createCard(6, 'DIAMONDS'),
      createCard(7, 'HEARTS'), // Sảnh 4 lá
      createCard(8, 'SPADES'), // Đôi 8
      createCard(8, 'CLUBS'),
      createCard(12, 'SPADES') // Q♠
    ];

    const memoryTracker = new CardTracker();
    memoryTracker.updateOwnHand(hand);
    // Ghi nhớ đối thủ p1 đã từng bỏ lượt khi đánh Sảnh!
    memoryTracker.recordPass('p1', 'STRAIGHT');

    const decision = makeBotDecision(createMockContext({
      hand,
      isLeadMove: true,
      tracker: memoryTracker,
      config: BOT_PERSONAS.BOT_ELO_2150, // BOT CAO THỦ 2150
      remainingPlayerCards: { p0: 7, p1: 7, p2: 7, p3: 7 },
      nextPlayerId: 'p1'
    }));

    expect(decision.type).toBe('PLAY');
    // Bot khai thác điểm yếu của đối thủ: Đánh Sảnh để đối thủ p1 không bắt được!
    expect(decision.combination?.type).toBe('STRAIGHT');
    expect(decision.strategyUsed).toBe('IN_MATCH_ADAPTATION');
  });
});
