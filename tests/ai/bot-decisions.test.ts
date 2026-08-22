import { describe, expect, test } from 'bun:test';
import { parseCard, parseCards } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision } from '../../src/ai/decision-maker';

describe('AI Bot Decision Maker', () => {
  test('Ván 1: Bot tự động chọn nước đi hợp lệ có chứa quân 3♠', () => {
    const hand = parseCards('3S 4S 5S 9S 9D 2H');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.CO_BA;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: true,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p1: 13, p2: 13, p3: 13 }
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.cards?.some(c => c.rank === 3 && c.suit === 'SPADES')).toBe(true);
  });

  test('Bot quyết định Chặt Heo khi đối thủ ra Heo Cơ 2♥', () => {
    const hand = parseCards('4S 4D 5S 5D 6S 6D 9H'); // 3 đôi thông
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BAC_TU;

    const targetMove = {
      playerId: 'p1',
      combination: identifyCombination(parseCards('2H'))!,
      timestamp: Date.now()
    };

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: targetMove,
      isFirstMoveOfGame: false,
      isLeadMove: false,
      tracker,
      config,
      remainingPlayerCards: { p1: 5, p2: 10, p3: 10 }
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.cards?.length).toBe(6); // đánh 3 đôi thông
  });

  test('Bot biết Bỏ Lượt khi không có bài đè hoặc không muốn phá bộ quý vô ích', () => {
    const hand = parseCards('3S 4D 5C 6H 7S'); // sảnh 5 đẹp
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BAC_TU;

    // Đối thủ đánh đôi K (KD KH)
    const targetMove = {
      playerId: 'p1',
      combination: identifyCombination(parseCards('KD KH'))!,
      timestamp: Date.now()
    };

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: targetMove,
      isFirstMoveOfGame: false,
      isLeadMove: false,
      tracker,
      config,
      remainingPlayerCards: { p1: 10, p2: 10, p3: 10 }
    });

    expect(decision.type).toBe('PASS');
  });

  test('Bot Cậu Út (Kẻ Gài Bẫy) khi cầm 3 đôi thông cố tình đánh mồi Át để câu Heo', () => {
    // 3 đôi thông (4-5-6) + lá rác Át (AH)
    const hand = parseCards('4S 4D 5S 5D 6S 6D AH');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.CAU_UT;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p1: 10, p2: 10, p3: 10 }
    });

    expect(decision.type).toBe('PLAY');
    // Bot chọn đánh lá Át (AH) làm mồi nhử Heo
    expect(decision.cards?.length).toBe(1);
    expect(decision.cards?.[0].rank).toBe(14);
  });

  test('Endgame Solver: Bot giải thế cờ tàn khi còn <= 4 lá bài', () => {
    // Sảnh 3 lá (3-4-5) + 2 Cơ (2H)
    const hand = parseCards('3S 4D 5C 2H');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.ANH_HAI;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p1: 5, p2: 5, p3: 5 }
    });

    expect(decision.type).toBe('PLAY');
    // Đánh sảnh 3-4-5 trước, để lại 2H chắc chắn về Nhất
    expect(decision.cards?.length).toBe(3);
    expect(decision.combination?.type).toBe('STRAIGHT');
  });

  test('Anti-Leader Intercept: Bot cướp cái quyết liệt khi đối thủ chỉ còn 1 lá', () => {
    const hand = parseCards('QS KD 2H');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.CO_BA;

    // Đối thủ đánh lá 10S, nhưng đối thủ p1 chỉ còn 1 lá duy nhất
    const targetMove = {
      playerId: 'p2',
      combination: identifyCombination(parseCards('10S'))!,
      timestamp: Date.now()
    };

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: targetMove,
      isFirstMoveOfGame: false,
      isLeadMove: false,
      tracker,
      config,
      remainingPlayerCards: { p1: 1, p2: 8, p3: 8 } // p1 chỉ còn 1 lá sắp về!
    });

    expect(decision.type).toBe('PLAY');
    // Bot đè bài ngay lập tức để không cho p1 giành lượt
    expect(decision.cards?.length).toBe(1);
  });
});
