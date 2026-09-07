import { describe, test, expect, beforeEach } from 'bun:test';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision, DecisionContext } from '../../src/ai/decision-maker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { parseCards } from '../../src/engine/card';
import { Card, createDefaultGameRules } from '../../src/engine/types';

describe('Kiểm chứng Tái Cấu Trúc Độ Ưu Tiên & Sửa Lỗi Ra Bài Bot AI', () => {
  let tracker: CardTracker;

  beforeEach(() => {
    tracker = new CardTracker();
  });

  const createMockDecisionContext = (partial: Partial<DecisionContext> & { hand: Card[] }): DecisionContext => ({
    hand: partial.hand,
    currentRoundLeadingMove: partial.currentRoundLeadingMove ?? null,
    isFirstMoveOfGame: partial.isFirstMoveOfGame ?? false,
    isLeadMove: partial.isLeadMove ?? false,
    tracker: partial.tracker ?? tracker,
    config: partial.config ?? BOT_PERSONAS.BOT_ELO_2050,
    remainingPlayerCards: partial.remainingPlayerCards ?? { p0: 13, p1: 13 },
    nextPlayerId: partial.nextPlayerId ?? 'p0',
    rules: partial.rules ?? createDefaultGameRules({ settlementRule: 'COUNT_CARDS' }),
    hasPlayedFirstCard: partial.hasPlayedFirstCard ?? true,
    isNextPlayerOneCard: partial.isNextPlayerOneCard ?? false,
    prohibitEndingWithTwo: partial.prohibitEndingWithTwo ?? true,
    gameMode: partial.gameMode ?? 'COUNT_CARDS',
    mctsMap: partial.mctsMap ?? null,
    compositeRuleStrategy: partial.compositeRuleStrategy ?? null,
    opponentProfiles: partial.opponentProfiles ?? null
  });

  test('1. Tái hiện tình huống Turn 1 ván log thực tế: Bot KHÔNG ĐƯỢC vứt AC đi nhử khi còn rác nhỏ 3S, 4C, 6C', () => {
    // Bài của Bot Kasper trong file log: 13 lá
    // 3S 4C 6C 10S JD JH QS QD QH KS KD KH AC
    const hand = parseCards('3S 4C 6C 10S JD JH QS QD QH KS KD KH AC');

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_2050,
      remainingPlayerCards: { p0: 13, p1: 13 },
      nextPlayerId: 'p0',
      gameMode: 'COUNT_CARDS'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối không được kích hoạt BAITING_TRAP để đánh lẻ AC!
    expect(decision.strategyUsed).not.toBe('BAITING_TRAP');
    
    // Nếu đánh bài lẻ (SINGLE), tuyệt đối không được đánh bài lẻ to (AC), mà phải là rác nhỏ (3S)
    if (decision.combination?.type === 'SINGLE') {
      expect(decision.cards?.[0].rank).toBeLessThanOrEqual(6);
    } else {
      // Nếu đánh bộ theo luật Đếm lá, phải là tổ hợp sảnh/bộ từ 3 lá trở lên (ví dụ Sảnh Q-K-A hoặc J-Q-K)
      expect(decision.cards!.length).toBeGreaterThanOrEqual(3);
    }

    // Bot phải xả sảnh dài hợp lệ trong COUNT_CARDS hoặc tẩu rác nhỏ 3S
    const playedCodes = decision.cards?.map(c => c.code).join(' ');
    console.log(`✅ Quyết định mới của Bot tại Turn 1: [ ${playedCodes} ] (${decision.strategyUsed}) - Lý do: ${decision.reason}`);
    expect(['RULE_DRIVEN_LONGEST_COMBO', 'SMALLEST_TRASH_DISPOSAL', 'SMALLEST_COMBO_LEAD']).toContain(decision.strategyUsed || '');
  });

  test('2. Gài bẫy nhử Heo (BAITING_TRAP): Chỉ cho phép nhử khi là Át Cơ (AH) và bài đã sạch rác nhỏ', () => {
    // 3 đôi thông (4-5-6) + 1 lá Át Cơ (AH) duy nhất (bài sạch rác)
    const hand = parseCards('4S 4D 5S 5D 6S 6D AH');

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_2050,
      remainingPlayerCards: { p0: 10, p1: 7 },
      nextPlayerId: 'p0'
    }));

    expect(decision.type).toBe('PLAY');
    // Được phép nhử Át Cơ AH vì AH là quân Át to nhất không thể bị đè bằng Át khác
    expect(decision.strategyUsed).toBe('BAITING_TRAP');
    expect(decision.cards?.[0].rank).toBe(14);
    expect(decision.cards?.[0].suit).toBe('HEARTS');
  });

  test('3. Gài bẫy nhử Heo: KHÔNG cho phép nhử bằng Át tép (AC) khi đối thủ còn giữ Át to hơn (AD, AH)', () => {
    // 3 đôi thông (4-5-6) + 1 lá Át tép (AC), tracker chưa thấy AD, AH xuất hiện
    const hand = parseCards('4S 4D 5S 5D 6S 6D AC');

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_2050,
      remainingPlayerCards: { p0: 10, p1: 7 },
      nextPlayerId: 'p0'
    }));

    expect(decision.type).toBe('PLAY');
    // Tuyệt đối không dùng AC làm mồi câu khi AD, AH vẫn chưa xuất hiện!
    expect(decision.strategyUsed).not.toBe('BAITING_TRAP');
  });

  test('4. Cờ tàn 2 lá khi Cấm 2 cuối (prohibitEndingWithTwo = true): Bot có [3S rác + AH Át Cơ] phải đánh 3S trước để giữ AH chốt hạ', () => {
    const hand = parseCards('3S AH');

    const decision = makeBotDecision(createMockDecisionContext({
      hand,
      currentRoundLeadingMove: null,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_2050,
      remainingPlayerCards: { p0: 2, p1: 2 },
      nextPlayerId: 'p0',
      prohibitEndingWithTwo: true // Bật luật cấm 2 cuối
    }));

    expect(decision.type).toBe('PLAY');
    // Vì AH không phải là Heo 2, Bot được phép đánh 3S trước để giữ AH chốt hạ về nhất
    expect(decision.strategyUsed).toBe('ENDGAME_SMALL_LEAD');
    expect(decision.cards?.[0].rank).toBe(3);
    expect(decision.cards?.[0].suit).toBe('SPADES');
  });
});
