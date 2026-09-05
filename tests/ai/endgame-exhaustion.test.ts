import { describe, test, expect, beforeEach } from 'bun:test';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision, DecisionContext, createDecisionContext } from '../../src/ai/decision-maker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { parseCards } from '../../src/engine/card';
import { PlayedMove, createDefaultGameRules } from '../../src/engine/types';

describe('AI Endgame Trash Exhaustion Prevention (Chống cạn kiệt lực cờ tàn)', () => {
  let tracker: CardTracker;

  beforeEach(() => {
    tracker = new CardTracker();
  });

  const createMockContext = (partial: Partial<DecisionContext> & { hand: any[]; currentRoundLeadingMove: PlayedMove }): DecisionContext => createDecisionContext({
    hand: partial.hand,
    currentRoundLeadingMove: partial.currentRoundLeadingMove,
    isFirstMoveOfGame: false,
    isLeadMove: false,
    tracker: partial.tracker ?? tracker,
    config: partial.config ?? BOT_PERSONAS.BOT_ELO_950,
    remainingPlayerCards: partial.remainingPlayerCards ?? { p0: 6 },
    nextPlayerId: 'p0',
    rules: createDefaultGameRules(),
    hasPlayedFirstCard: true,
    isNextPlayerOneCard: false,
    prohibitEndingWithTwo: true,
    gameMode: 'COUNT_CARDS',
    mctsMap: null,
    compositeRuleStrategy: null,
    opponentProfiles: null
  });

  test('Bot không đốt lá to vừa phải (JS) để đè rác nhỡ (8D) khi bài còn lại toàn rác nhỏ (4H 5H) trong solo', () => {
    const hand = parseCards('4H 5H JS');
    const leadingMove: PlayedMove = {
      playerId: 'p0',
      combination: {
        type: 'SINGLE',
        cards: parseCards('8D'),
        highestCard: parseCards('8D')[0],
        length: 1
      },
      timestamp: Date.now(),
      isChop: false
    };

    const ctx = createMockContext({
      hand,
      currentRoundLeadingMove: leadingMove,
      remainingPlayerCards: { p0: 6 }
    });

    const decision = makeBotDecision(ctx);

    // Kỳ vọng: Quyết định phải là PASS để bảo toàn JS chờ mở vòng mới thay vì tự sát để lại 4H 5H
    expect(decision.type).toBe('PASS');
    expect(decision.strategyUsed).toBe('HEURISTIC_EVALUATION_PASS');
  });

  test('Nếu lá bài là lá to nhất tuyệt đối (Strongest Single) hoặc Heo thì bot vẫn có thể đánh', () => {
    // Nếu Bot cầm [4H 5H 2H] hoặc lá bài là 2H, việc đánh 2 để cướp cái dứt điểm hoặc kiểm soát bàn vẫn được xem xét
    const hand = parseCards('4H 5H 2H');
    const leadingMove: PlayedMove = {
      playerId: 'p0',
      combination: {
        type: 'SINGLE',
        cards: parseCards('AD'),
        highestCard: parseCards('AD')[0],
        length: 1
      },
      timestamp: Date.now(),
      isChop: false
    };

    const ctx = createMockContext({
      hand,
      currentRoundLeadingMove: leadingMove,
      remainingPlayerCards: { p0: 2 }
    });

    const decision = makeBotDecision(ctx);
    // Có Heo 2H thì không bị coi là cạn kiệt rác nhỏ helpless
    expect(decision.type).toBe('PLAY');
  });

  test('Bot cầm 2 lá [ 6H KH ] trong Solo 1v1 khi đối thủ đánh 7H: Bắt buộc đánh KH để dứt điểm lá cuối (Match Point)', () => {
    // Tái hiện chính xác tình huống lượt #11 từ match log thực tế
    const hand = parseCards('6H KH');
    const leadingMove: PlayedMove = {
      playerId: 'p0',
      combination: {
        type: 'SINGLE',
        cards: parseCards('7H'),
        highestCard: parseCards('7H')[0],
        length: 1
      },
      timestamp: Date.now(),
      isChop: false
    };

    const ctx = createMockContext({
      hand,
      currentRoundLeadingMove: leadingMove,
      remainingPlayerCards: { p0: 10 }
    });

    const decision = makeBotDecision(ctx);

    // Kỳ vọng: Quyết định phải là PLAY [ KH ] để cướp cái về nhất lá 6H, KHÔNG ĐƯỢC PASS
    expect(decision.type).toBe('PLAY');
    expect(decision.cards).toBeDefined();
    expect(decision.cards![0].code).toBe('KH');
    expect(decision.strategyUsed).toBe('HEURISTIC_EVALUATION');
  });

  test('Bàn Solo 1v1 cờ tàn còn <= 2 lá không được bỏ lượt tự sát khi có nước đi hợp lệ', () => {
    const hand = parseCards('3D AD');
    const leadingMove: PlayedMove = {
      playerId: 'p0',
      combination: {
        type: 'SINGLE',
        cards: parseCards('QD'),
        highestCard: parseCards('QD')[0],
        length: 1
      },
      timestamp: Date.now(),
      isChop: false
    };

    const ctx = createMockContext({
      hand,
      currentRoundLeadingMove: leadingMove,
      remainingPlayerCards: { p0: 5 }
    });

    const decision = makeBotDecision(ctx);

    // Đánh AD để còn 1 lá 3D về bài, không được bỏ lượt
    expect(decision.type).toBe('PLAY');
    expect(decision.cards![0].code).toBe('AD');
  });
});

