import { describe, test, expect, beforeEach } from 'bun:test';
import { CardTracker } from '../../src/ai/card-tracker';
import { LeadMoveHeuristicHandler, RespondingMoveHeuristicHandler, DecisionContext } from '../../src/ai/decision-maker';
import { createCard } from '../../src/engine/card';
import { getBotConfig } from '../../src/ai/bot-factory';
import { createDefaultGameRules, PlayedMove } from '../../src/engine/types';
import { identifyCombination } from '../../src/engine/combinations';
import { OpponentProfiler, createDefaultOpponentProfile } from '../../src/ai/opponent-profiler';

describe('Positional Awareness & In-Match Fast Adaptation AI Verification', () => {
  let tracker: CardTracker;

  beforeEach(() => {
    tracker = new CardTracker();
    OpponentProfiler.getInstance().reset?.();
  });

  test('1. Positional Awareness (Tie-Breaker): Bot Cao Thủ đánh rác tầm trung 9♠ đì nhà dưới thay vì 3♠', () => {
    // Hand: Sảnh 5-6-7 + 2 lá rác độc lập: 3♠ và 9♠
    const hand = [
      createCard(3, 'SPADES'),
      createCard(9, 'SPADES'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'CLUBS'),
      createCard(7, 'HEARTS')
    ];

    const grandmasterConfig = getBotConfig('BOT_ELO_2500'); // positionalAwareness = 1.0
    const rookieConfig = getBotConfig('BOT_ELO_850');       // positionalAwareness = 0.0

    const handler = new LeadMoveHeuristicHandler();

    // Đối thủ tiếp theo (p1) đang còn ít bài (4 lá)
    const contextGM: DecisionContext = {
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config: grandmasterConfig,
      remainingPlayerCards: { p0: 5, p1: 4, p2: 8, p3: 8 },
      nextPlayerId: 'p1',
      rules: createDefaultGameRules(),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: false,
      gameMode: 'TRADITIONAL',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    };

    const validMoves = [
      { cards: [hand[0]], combination: identifyCombination([hand[0]])!, isChop: false },
      { cards: [hand[1]], combination: identifyCombination([hand[1]])!, isChop: false },
      { cards: [hand[2], hand[3], hand[4]], combination: identifyCombination([hand[2], hand[3], hand[4]])!, isChop: false }
    ];

    const decisionGM = handler.handle(contextGM, validMoves);
    expect(decisionGM).not.toBeNull();
    expect(decisionGM?.type).toBe('PLAY');
    // Bot Cao Thủ với positionalAwareness cao sẽ chọn lá rác 9♠ để đì nhà dưới
    expect(decisionGM?.cards?.[0].rank).toBe(9);
    expect(decisionGM?.reason).toContain('Positional Awareness');

    // Trong khi đó Bot Rookie đánh lá rác nhỏ nhất 3♠
    const contextRookie: DecisionContext = {
      ...contextGM,
      config: rookieConfig
    };
    const decisionRookie = handler.handle(contextRookie, validMoves);
    expect(decisionRookie?.type).toBe('PLAY');
    expect(decisionRookie?.cards?.[0].rank).toBe(3);
  });

  test('2. Positional Awareness Màng Lọc An Toàn: Tuyệt đối không xé sảnh để đì nhà dưới', () => {
    // Hand: Sảnh 4-5-6-7-8 và 1 lá rác 3♠
    const hand = [
      createCard(3, 'SPADES'),
      createCard(4, 'DIAMONDS'),
      createCard(5, 'CLUBS'),
      createCard(6, 'HEARTS'),
      createCard(7, 'SPADES'),
      createCard(8, 'DIAMONDS')
    ];

    const grandmasterConfig = getBotConfig('BOT_ELO_2500');
    const handler = new LeadMoveHeuristicHandler();

    const context: DecisionContext = {
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config: grandmasterConfig,
      remainingPlayerCards: { p0: 6, p1: 3, p2: 8, p3: 8 },
      nextPlayerId: 'p1',
      rules: createDefaultGameRules(),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: false,
      gameMode: 'TRADITIONAL',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    };

    const validMoves = [
      { cards: [hand[0]], combination: identifyCombination([hand[0]])!, isChop: false },
      { cards: hand.slice(1), combination: identifyCombination(hand.slice(1))!, isChop: false }
    ];

    const decision = handler.handle(context, validMoves);
    expect(decision).not.toBeNull();
    // Bot tuyệt đối không xé sảnh ra đánh lẻ 7 hay 8
    expect(decision?.cards?.length).toBeOneOf([1, 5]);
    if (decision?.cards?.length === 1) {
      expect(decision.cards[0].rank).toBe(3); // Tẩu rác đơn lẻ độc lập 3♠
    }
  });

  test('3. In-Match Adaptation: Khai thác điểm yếu khi hồ sơ đối thủ có tỉ lệ bỏ lượt Đôi cao', () => {
    // Hand: Đôi 5 (5♠, 5♦) và Sảnh 7-8-9
    const hand = [
      createCard(5, 'SPADES'),
      createCard(5, 'DIAMONDS'),
      createCard(7, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(9, 'HEARTS')
    ];

    const grandmasterConfig = getBotConfig('BOT_ELO_2500'); // inMatchAdaptationRate = 1.0
    const handler = new LeadMoveHeuristicHandler();

    // Tạo hồ sơ đối thủ p1 có điểm mù bỏ lượt Đôi cực cao (passRate PAIR = 0.8)
    const opponentProfile = {
      ...createDefaultOpponentProfile('p1'),
      passRateByType: {
        ...createDefaultOpponentProfile('p1').passRateByType,
        PAIR: 0.8
      }
    };

    const context: DecisionContext = {
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config: grandmasterConfig,
      remainingPlayerCards: { p0: 5, p1: 6, p2: 8, p3: 8 },
      nextPlayerId: 'p1',
      rules: createDefaultGameRules(),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: false,
      gameMode: 'TRADITIONAL',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: { p1: opponentProfile }
    };

    const validMoves = [
      { cards: [hand[0], hand[1]], combination: identifyCombination([hand[0], hand[1]])!, isChop: false },
      { cards: [hand[2], hand[3], hand[4]], combination: identifyCombination([hand[2], hand[3], hand[4]])!, isChop: false }
    ];

    const decision = handler.handle(context, validMoves);
    expect(decision).not.toBeNull();
    expect(decision?.type).toBe('PLAY');
    // Bot bắt bài đối thủ sợ Đôi -> xả ngay Đôi 5
    expect(decision?.combination?.type).toBe('PAIR');
    expect(decision?.reason).toContain('In-Match Adaptation');
  });

  test('4. In-Match Adaptation: Nhịn Heo Đen đầu ván để phục kích Heo Đỏ ở cờ tàn của đối thủ Găm Heo', () => {
    // Hand: Tứ Quý 8 + 3 lá rác khác, tổng cộng 7 lá (chưa vào giai đoạn cờ tàn)
    const hand = [
      createCard(8, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(8, 'DIAMONDS'),
      createCard(8, 'HEARTS'),
      createCard(9, 'SPADES'),
      createCard(10, 'CLUBS'),
      createCard(11, 'DIAMONDS')
    ];

    const grandmasterConfig = getBotConfig('BOT_ELO_2500'); // inMatchAdaptationRate = 1.0
    const handler = new RespondingMoveHeuristicHandler();

    const blackTwoMove: PlayedMove = {
      playerId: 'p1',
      combination: identifyCombination([createCard(15, 'SPADES')])!,
      timestamp: Date.now(),
      isChop: false
    };

    // Hồ sơ đối thủ p1 là người cực kỳ ham găm Heo (heoGreedRate = 0.9)
    const opponentProfile = {
      ...createDefaultOpponentProfile('p1'),
      heoGreedRate: 0.9
    };

    const context: DecisionContext = {
      hand,
      currentRoundLeadingMove: blackTwoMove,
      isFirstMoveOfGame: false,
      isLeadMove: false,
      tracker,
      config: grandmasterConfig,
      remainingPlayerCards: { p0: 6, p1: 8, p2: 8, p3: 8 },
      nextPlayerId: 'p2',
      rules: createDefaultGameRules(),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: false,
      gameMode: 'TRADITIONAL',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: { p1: opponentProfile }
    };

    const fourOfAKindMove = {
      cards: hand.slice(0, 4),
      combination: identifyCombination(hand.slice(0, 4))!,
      isChop: true
    };

    const decision = handler.handle(context, [fourOfAKindMove]);
    expect(decision).not.toBeNull();
    // Bot nhịn không chặt Heo Đen sớm vì biết đối thủ còn ém Heo Đỏ ở cờ tàn
    expect(decision?.type).toBe('PASS');
  });

  test('5. Bomb Protection in 1v1: Tuyệt đối không xé 1 lá từ Tứ Quý để đè rác trong 1v1', () => {
    // Hand: Tứ Quý 8 (4 lá) + 3 lá rác 9♠, 10♣, J♦ (tổng 7 lá)
    const hand = [
      createCard(8, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(8, 'DIAMONDS'),
      createCard(8, 'HEARTS'),
      createCard(9, 'SPADES'),
      createCard(10, 'CLUBS'),
      createCard(11, 'DIAMONDS')
    ];

    const grandmasterConfig = getBotConfig('BOT_ELO_2500');
    const handler = new RespondingMoveHeuristicHandler();

    const leadMove: PlayedMove = {
      playerId: 'p1',
      combination: identifyCombination([createCard(3, 'SPADES')])!,
      timestamp: Date.now(),
      isChop: false
    };

    const context: DecisionContext = {
      hand,
      currentRoundLeadingMove: leadMove,
      isFirstMoveOfGame: false,
      isLeadMove: false,
      tracker,
      config: grandmasterConfig,
      remainingPlayerCards: { BOT_ELO_2500: 7, p1: 7 },
      nextPlayerId: 'p1',
      rules: createDefaultGameRules(),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: false,
      gameMode: 'TRADITIONAL',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    };

    // Candidate single moves: 8♠ (xé Tứ quý), 9♠ (rác), 10♣ (rác), J♦ (rác)
    const validMoves = [
      { cards: [hand[0]], combination: identifyCombination([hand[0]])!, isChop: false },
      { cards: [hand[4]], combination: identifyCombination([hand[4]])!, isChop: false },
      { cards: [hand[5]], combination: identifyCombination([hand[5]])!, isChop: false },
      { cards: [hand[6]], combination: identifyCombination([hand[6]])!, isChop: false }
    ];

    const decision = handler.handle(context, validMoves);
    expect(decision).not.toBeNull();
    expect(decision?.type).toBe('PLAY');
    // Bot tuyệt đối KHÔNG chọn lá 8 (xé Tứ Quý) mà phải chọn lá rác 9♠
    expect(decision?.cards?.[0].rank).toBe(9);
  });
});

