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
    const config = BOT_PERSONAS.BOT_ELO_1750;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: true,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p1: 13, p2: 13, p3: 13 },
      nextPlayerId: 'p1'
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.cards?.some(c => c.rank === 3 && c.suit === 'SPADES')).toBe(true);
  });

  test('Bot quyết định Chặt Heo khi đối thủ ra Heo Cơ 2♥', () => {
    const hand = parseCards('4S 4D 5S 5D 6S 6D 9H'); // 3 đôi thông
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_1450;

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
      remainingPlayerCards: { p1: 5, p2: 10, p3: 10 },
      nextPlayerId: 'p2'
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.cards?.length).toBe(6); // đánh 3 đôi thông
  });

  test('Bot biết Bỏ Lượt khi không có bài đè hoặc không muốn phá bộ quý vô ích', () => {
    const hand = parseCards('3S 4D 5C 6H 7S'); // sảnh 5 đẹp
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_1450;

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
      remainingPlayerCards: { p1: 10, p2: 10, p3: 10 },
      nextPlayerId: 'p2'
    });

    expect(decision.type).toBe('PASS');
  });

  test('Bot Felix (Kẻ Gài Bẫy) khi cầm 3 đôi thông cố tình đánh mồi Át để câu Heo', () => {
    // 3 đôi thông (4-5-6) + lá rác Át (AH)
    const hand = parseCards('4S 4D 5S 5D 6S 6D AH');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_1550;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p1: 10, p2: 10, p3: 10 },
      nextPlayerId: 'p1'
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
    const config = BOT_PERSONAS.BOT_ELO_1850;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p1: 5, p2: 5, p3: 5 },
      nextPlayerId: 'p1'
    });

    expect(decision.type).toBe('PLAY');
    // Đánh sảnh 3-4-5 trước, để lại 2H chắc chắn về Nhất
    expect(decision.cards?.length).toBe(3);
    expect(decision.combination?.type).toBe('STRAIGHT');
  });

  test('Anti-Leader Intercept: Bot cướp cái quyết liệt khi đối thủ chỉ còn 1 lá', () => {
    const hand = parseCards('QS KD 2H');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_1750;

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
      remainingPlayerCards: { p1: 1, p2: 8, p3: 8 }, // p1 chỉ còn 1 lá sắp về!
      nextPlayerId: 'p3'
    });

    expect(decision.type).toBe('PLAY');
    // Bot đè bài ngay lập tức để không cho p1 giành lượt
    expect(decision.cards?.length).toBe(1);
  });

  test('Two Preservation: Bot Rookie (Tier 1) bảo toàn Heo (2♥) khi bài còn nhiều (10 lá) và đối thủ đánh rác nhỏ (7♠)', () => {
    const hand = parseCards('3S 4D 5C 6H 7D 8S 9C 10D KD 2H');
    const tracker = new CardTracker(hand, 0.1);
    const config = BOT_PERSONAS.BOT_ELO_850; // Rookie bot

    // Đối thủ đánh lá 7S bình thường
    const targetMove = {
      playerId: 'p2',
      combination: identifyCombination(parseCards('7S'))!,
      timestamp: Date.now()
    };

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: targetMove,
      isFirstMoveOfGame: false,
      isLeadMove: false,
      tracker,
      config,
      remainingPlayerCards: { p0: 10, p2: 10, p3: 10 },
      nextPlayerId: 'p3'
    });

    // Bot có thể đánh 8S/9C/10D/KD đè hoặc PASS, nhưng TUYỆT ĐỐI KHÔNG được xả 2H
    if (decision.type === 'PLAY') {
      expect(decision.cards?.some(c => c.rank === 15)).toBe(false);
    }
  });

  test('Lead Move Two Preservation: Bot Rookie khi dẫn vòng có [3♠, 4♦, 5♣, 2♥] không tự ý đánh 2♥ ra mở màn', () => {
    const hand = parseCards('3S 4D 5C 2H');
    const tracker = new CardTracker(hand, 0.1);
    const config = BOT_PERSONAS.BOT_ELO_850;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p0: 8, p2: 8, p3: 8 },
      nextPlayerId: 'p2'
    });

    expect(decision.type).toBe('PLAY');
    // Đánh Sảnh 3-4-5 hoặc rác 3S, TUYỆT ĐỐI không đánh 2H khi còn bài khác
    expect(decision.cards?.some(c => c.rank === 15)).toBe(false);
  });

  test('Endgame Solver 3 lá: Cầm [đôi 4 + 2 Cơ] khi dẫn vòng tự động đánh đôi 4 trước để 2 Cơ chốt hạ', () => {
    const hand = parseCards('4S 4D 2H');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_1850;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p0: 5, p2: 5, p3: 5 },
      nextPlayerId: 'p2'
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.combination?.type).toBe('PAIR');
    expect(decision.cards?.length).toBe(2);
  });

  test('Endgame Solver 4 lá: Cầm [sảnh 3-4-5 + 2 Cơ] khi dẫn vòng tự động đánh sảnh 3-4-5 trước', () => {
    const hand = parseCards('3S 4D 5C 2H');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_1950;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p0: 5, p2: 5, p3: 5 },
      nextPlayerId: 'p2'
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.combination?.type).toBe('STRAIGHT');
    expect(decision.cards?.length).toBe(3);
  });

  test('Opponent Weakness Exploitation: Bot Cao Thủ khi đi đầu phát hiện đối thủ kế tiếp từng bỏ lượt Đôi thì tự động xả Đôi', () => {
    // Bot có đôi 8 và sảnh 3-4-5
    const hand = parseCards('3S 4D 5C 8S 8D');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_1850;

    // Đối thủ p1 (người kế tiếp) từng bỏ lượt khi đánh Đôi
    tracker.recordPass('p1', 'PAIR');

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p0: 8, p1: 2, p3: 8 },
      nextPlayerId: 'p1' // Người kế tiếp là p1
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.combination?.type).toBe('PAIR');
  });

  test('Minimum Sufficient Beat: Khi đối thủ đánh 5 Bích và bot có [6 Bích, King Cơ], bot chọn 6 Bích để đè', () => {
    const hand = parseCards('6S KH');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_1850;

    const targetMove = {
      playerId: 'p2',
      combination: identifyCombination(parseCards('5S'))!,
      timestamp: Date.now()
    };

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: targetMove,
      isFirstMoveOfGame: false,
      isLeadMove: false,
      tracker,
      config,
      remainingPlayerCards: { p0: 8, p2: 8, p3: 8 },
      nextPlayerId: 'p3'
    });

    expect(decision.type).toBe('PLAY');
    // Bot chọn 6S thay vì lãng phí KH
    expect(decision.cards?.[0].rank).toBe(6);
  });

  test('Anti-Leader Direct Intercept: Khi người chơi kế tiếp báo 1 lá và bot chỉ có rác, bot xả lá to nhất (Át) để chặn đầu chống đền báo', () => {
    const hand = parseCards('5S 8D AS');
    const tracker = new CardTracker(hand, 0.5);
    const config = BOT_PERSONAS.BOT_ELO_850; // Kể cả Rookie bot

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p0: 8, p1: 1, p2: 8 },
      nextPlayerId: 'p1' // Người kế tiếp chính là người báo 1 lá!
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.cards?.length).toBe(1);
    expect(decision.cards?.[0].rank).toBe(14); // Xả Át (AS) để chặn đầu
  });

  test('Anti-Leader Non-Direct: Khi người báo 1 lá KHÔNG PHẢI người kế tiếp, bot xả rác nhỏ để tẩu thoát bài', () => {
    const hand = parseCards('5S 8D AS');
    const tracker = new CardTracker(hand, 0.5);
    const config = BOT_PERSONAS.BOT_ELO_850;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p0: 8, p1: 6, p2: 1 }, // Người báo 1 lá là p2 (không phải người kế tiếp p1)
      nextPlayerId: 'p1' // Người kế tiếp p1 có 6 lá
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.cards?.length).toBe(1);
    expect(decision.cards?.[0].rank).toBe(5); // Xả 5S để tẩu thoát rác nhỏ
  });
});
