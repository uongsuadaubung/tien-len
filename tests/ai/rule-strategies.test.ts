import { describe, expect, it } from 'bun:test';
import { Card, Combination, createDefaultGameRules } from '../../src/engine/types';
import { createCard } from '../../src/engine/card';
import { CardTracker } from '../../src/ai/card-tracker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { 
  ChoppingRuleStrategy, 
  CompositeRuleStrategy, 
  CongRuleStrategy, 
  CountCardsSettlementStrategy, 
  GameFlowRuleStrategy, 
  RuleDecisionContext, 
  TableScaleRuleStrategy, 
  TraditionalSettlementStrategy, 
  type ValidMoveInfo, 
  WinnerTakesAllSettlementStrategy, 
  resolveCompositeRuleStrategy 
} from '../../src/ai/rule-strategies';

describe('RULE-FIRST AI STRATEGY SYSTEM TESTS', () => {
  // Helper tạo bài nhanh
  const c3S = createCard(3, 'SPADES');
  const c3D = createCard(3, 'DIAMONDS');
  const c4S = createCard(4, 'SPADES');
  const c4C = createCard(4, 'CLUBS');
  const c5H = createCard(5, 'HEARTS');
  const c6D = createCard(6, 'DIAMONDS');
  const c7S = createCard(7, 'SPADES');
  const cAS = createCard(14, 'SPADES');
  const c2S = createCard(15, 'SPADES');
  const c2H = createCard(15, 'HEARTS');

  // ==========================================================================
  // 1. SETTLEMENT RULE STRATEGIES
  // ==========================================================================
  describe('1. Settlement Rule Strategies (Quy Tắc Tính Tiền & Kết Toán)', () => {
    it('TraditionalSettlementStrategy: Ưu tiên tẩu rác nhỏ trước và phạt xả Heo đè rác đầu ván', () => {
      const strategy = new TraditionalSettlementStrategy();
      const leadPolicy = strategy.contributeLeadPolicy({});
      expect(leadPolicy.dumpSmallTrashFirst).toBe(true);
      expect(leadPolicy.preferLongestComboFirst).toBe(false);

      const moveTwo: ValidMoveInfo = {
        cards: [c2H],
        combination: { type: 'SINGLE', cards: [c2H], highestCard: c2H, length: 1 },
        isChop: false
      };

      const targetThree = {
        playerId: 'p1',
        combination: { type: 'SINGLE' as const, cards: [c3S], highestCard: c3S, length: 1 },
        timestamp: Date.now()
      };

      // Đè Heo lên lá 3 khi còn nhiều bài (handSize = 8) -> bị phạt nặng -100
      const modifier = strategy.getRespondingScoreModifier(moveTwo, 8, targetThree);
      expect(modifier).toBe(-100);
    });

    it('CountCardsSettlementStrategy: Ưu tiên xả Sảnh dài & thưởng lớn khi xả được nhiều lá', () => {
      const strategy = new CountCardsSettlementStrategy();
      const leadPolicy = strategy.contributeLeadPolicy({});
      expect(leadPolicy.preferLongestComboFirst).toBe(true);
      expect(leadPolicy.dumpSmallTrashFirst).toBe(false);

      const straight4: ValidMoveInfo = {
        cards: [c3S, c4S, c5H, c6D],
        combination: { type: 'STRAIGHT', cards: [c3S, c4S, c5H, c6D], highestCard: c6D, length: 4 },
        isChop: false
      };

      const bonus = strategy.getRespondingScoreModifier(straight4, 8);
      expect(bonus).toBe(120); // Thưởng cực lớn khi xả được 4 lá một lúc
    });

    it('WinnerTakesAllSettlementStrategy: Chiến thuật bạo lực tranh Nhất, thưởng dùng bài to cướp cái', () => {
      const strategy = new WinnerTakesAllSettlementStrategy();
      const leadPolicy = strategy.contributeLeadPolicy({});
      expect(leadPolicy.aggressiveFinisherPush).toBe(true);

      const moveTwo: ValidMoveInfo = {
        cards: [c2H],
        combination: { type: 'SINGLE', cards: [c2H], highestCard: c2H, length: 1 },
        isChop: false
      };

      const bonus = strategy.getRespondingScoreModifier(moveTwo);
      expect(bonus).toBeGreaterThanOrEqual(110);
    });
  });

  // ==========================================================================
  // 2. CONG & ANTI-FREEZE STRATEGY
  // ==========================================================================
  describe('2. Cong & Anti-Freeze Strategy (Thoát Cóng Khẩn Cấp)', () => {
    it('Kích hoạt EMERGENCY_UNFREEZE khi Bot chưa ra được lá nào và có đối thủ sắp về (<= 3 lá)', () => {
      const congStrategy = new CongRuleStrategy(true, 26, 1);
      const tracker = new CardTracker();

      const defaultRules = createDefaultGameRules();
      const context: RuleDecisionContext = {
        hand: [c3S, c3D, c4S, c7S, cAS],
        currentRoundLeadingMove: {
          playerId: 'p1',
          combination: { type: 'SINGLE', cards: [c4C], highestCard: c4C, length: 1 },
          timestamp: Date.now()
        },
        isFirstMoveOfGame: false,
        isLeadMove: false,
        tracker,
        remainingPlayerCards: { p0: 5, p1: 2, p2: 8, p3: 9 }, // p1 còn 2 lá!
        nextPlayerId: 'p1',
        hasPlayedFirstCard: false, // CHƯA RA ĐƯỢC LÁ NÀO
        rules: defaultRules
      };

      const validMoves: ValidMoveInfo[] = [
        { cards: [c7S], combination: { type: 'SINGLE', cards: [c7S], highestCard: c7S, length: 1 }, isChop: false },
        { cards: [cAS], combination: { type: 'SINGLE', cards: [cAS], highestCard: cAS, length: 1 }, isChop: false }
      ];

      const emergency = congStrategy.evaluateEmergency(context, validMoves);
      expect(emergency).not.toBeNull();
      expect(emergency?.type).toBe('PLAY');
      expect(emergency?.reason).toContain('Thoát Cóng');
      expect(emergency?.cards?.[0].id).toBe(c7S.id); // Chọn lá nhỏ nhất để thoát cóng
    });

    it('KHÔNG kích hoạt Thoát Cóng nếu Bot đã từng ra bài thành công (hasPlayedFirstCard === true)', () => {
      const congStrategy = new CongRuleStrategy(true, 26, 1);
      const tracker = new CardTracker();

      const defaultRules = createDefaultGameRules();
      const context: RuleDecisionContext = {
        hand: [c7S, cAS],
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: false,
        tracker,
        remainingPlayerCards: { p0: 2, p1: 1 },
        nextPlayerId: 'p1',
        hasPlayedFirstCard: true, // ĐÃ RA BÀI RỒI
        rules: defaultRules
      };

      const validMoves: ValidMoveInfo[] = [
        { cards: [cAS], combination: { type: 'SINGLE', cards: [cAS], highestCard: cAS, length: 1 }, isChop: false }
      ];

      const emergency = congStrategy.evaluateEmergency(context, validMoves);
      expect(emergency).toBeNull();
    });
  });

  // ==========================================================================
  // 3. CHOPPING & TRAP STRATEGY
  // ==========================================================================
  describe('3. Chopping & Trap Strategy (Chặt Heo & Gài Bẫy)', () => {
    it('Tăng hệ số rủi ro Chặt khi multiplier = 2 và 4 đôi thông chặt tự do bật', () => {
      const choppingNormal = new ChoppingRuleStrategy(false, 1, false);
      expect(choppingNormal.getChoppingRiskFactor()).toBe(1.0);

      const choppingUnderground = new ChoppingRuleStrategy(true, 2, false);
      // multiplier = 2 * 1.25 (allowFourPairsCutAnytime) = 2.5
      expect(choppingUnderground.getChoppingRiskFactor()).toBe(2.5);
      expect(choppingUnderground.getTrapScoreModifier()).toBe(40);

      const choppingCascade = new ChoppingRuleStrategy(true, 2, true);
      // 2 * 1.25 * 1.2 = 3.0
      expect(choppingCascade.getChoppingRiskFactor()).toBe(3.0);
      expect(choppingCascade.getTrapScoreModifier()).toBe(65);
    });
  });

  // ==========================================================================
  // 4. GAME FLOW & ENDGAME STRATEGY
  // ==========================================================================
  describe('4. GameFlow & Endgame Strategy (Cờ Tàn & Vòng Đấu)', () => {
    it('Luật Cấm 2 Cuối: Xả Heo trước khi còn 1 lượt bài thường để tránh thối Heo', () => {
      const gameFlowStrategy = new GameFlowRuleStrategy(true, true);
      const tracker = new CardTracker();

      const defaultRules = createDefaultGameRules();
      // Tay cầm [3S, 2H]: còn 1 rác + 1 heo
      const context: RuleDecisionContext = {
        hand: [c3S, c2H],
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { p0: 2, p1: 4, p2: 5, p3: 6 },
        nextPlayerId: 'p1',
        hasPlayedFirstCard: true,
        prohibitEndingWithTwo: true,
        rules: defaultRules
      };

      const validMoves: ValidMoveInfo[] = [
        { cards: [c3S], combination: { type: 'SINGLE', cards: [c3S], highestCard: c3S, length: 1 }, isChop: false },
        { cards: [c2H], combination: { type: 'SINGLE', cards: [c2H], highestCard: c2H, length: 1 }, isChop: false }
      ];

      const emergency = gameFlowStrategy.evaluateEmergency(context, validMoves);
      expect(emergency).not.toBeNull();
      expect(emergency?.cards?.[0].id).toBe(c2H.id);
      expect(emergency?.reason).toContain('Cấm 2 cuối');
    });

    it('Luật Chống Đền Bài: Khi người kế tiếp báo 1 lá, bắt buộc đánh bài to nhất để chặn đầu', () => {
      const gameFlowStrategy = new GameFlowRuleStrategy(true, true);
      const tracker = new CardTracker();

      const defaultRules = createDefaultGameRules();
      const context: RuleDecisionContext = {
        hand: [c4S, c7S, cAS],
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { p0: 3, p1: 1, p2: 5, p3: 6 }, // p1 (kế tiếp) còn 1 lá
        nextPlayerId: 'p1',
        hasPlayedFirstCard: true,
        rules: defaultRules
      };

      const validMoves: ValidMoveInfo[] = [
        { cards: [c4S], combination: { type: 'SINGLE', cards: [c4S], highestCard: c4S, length: 1 }, isChop: false },
        { cards: [c7S], combination: { type: 'SINGLE', cards: [c7S], highestCard: c7S, length: 1 }, isChop: false },
        { cards: [cAS], combination: { type: 'SINGLE', cards: [cAS], highestCard: cAS, length: 1 }, isChop: false }
      ];

      const emergency = gameFlowStrategy.evaluateEmergency(context, validMoves);
      expect(emergency).not.toBeNull();
      expect(emergency?.cards?.[0].id).toBe(cAS.id); // Đánh Át để chặn đầu
      expect(emergency?.reason).toContain('chống đền bài');
    });
  });

  // ==========================================================================
  // 5. TABLE SCALE STRATEGY
  // ==========================================================================
  describe('5. Table Scale Strategy (Quy Mô Bàn 1v1 vs Bàn 4 Người)', () => {
    it('Solo 1v1 (playerCount === 2): Tăng mạnh điểm thưởng cướp cái do chắc chắn giữ lượt đi', () => {
      const table1v1 = new TableScaleRuleStrategy(2);
      const leadPolicy = table1v1.contributeLeadPolicy({});
      expect(leadPolicy.aggressiveFinisherPush).toBe(true);

      const moveAS: ValidMoveInfo = {
        cards: [cAS],
        combination: { type: 'SINGLE', cards: [cAS], highestCard: cAS, length: 1 },
        isChop: false
      };

      const context: RuleDecisionContext = {
        hand: [cAS],
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: false,
        tracker: new CardTracker(),
        remainingPlayerCards: { p0: 5, p1: 5 },
        nextPlayerId: 'p1',
        rules: createDefaultGameRules({ table: { playerCount: 2, betAmount: 500, botThinkDelayMs: 650, soundEnabled: true } }),
        antiLeaderAggression: 1.0
      };

      const bonus = table1v1.getRespondingScoreModifier(moveAS, 5, null, context);
      expect(bonus).toBe(90); // Thưởng lớn cho 1v1
    });
  });

  // ==========================================================================
  // 6. COMPOSITE RULE STRATEGY & MAKE BOT DECISION INTEGRATION
  // ==========================================================================
  describe('6. Composite Rule Strategy & Decision Integration (Hợp Thành Luật Tự Động)', () => {
    it('Tự động nhận diện cấu hình tùy biến (Custom Sandbox: Đếm lá + Cóng x2 + Chặt x2 + 1v1)', () => {
      const customRules = createDefaultGameRules({
        settlementRule: 'CARD_COUNT',
        cong: { enabled: true, penaltyCards: 26, multiplier: 2 },
        chopping: { 
          allowFourPairsCutAnytime: true, 
          allowThreePairsCutTwo: true, 
          allowFourOfAKindCutPairsOfTwos: true, 
          multiplier: 2,
          cascadeMultiplier: true
        },
        table: { playerCount: 2, betAmount: 1000, botThinkDelayMs: 700, soundEnabled: true }
      });

      const composite = resolveCompositeRuleStrategy(customRules);
      const leadPolicy = composite.getCompositeLeadPolicy();
      
      // Hợp nhất đồng thời cả Card Count (preferLongestComboFirst) lẫn 1v1 (aggressiveFinisherPush)
      expect(leadPolicy.preferLongestComboFirst).toBe(true);
      expect(leadPolicy.aggressiveFinisherPush).toBe(true);

      // Chopping risk factor được nhân theo hệ số x2, 4 đôi thông và chặt chồng tích lũy
      expect(composite.getChoppingRiskFactor()).toBe(3.0);
      expect(composite.getTrapTendencyBonus()).toBe(65);
    });

    it('Bot Decision Maker sử dụng Rule Strategy để đưa ra quyết định chính xác', () => {
      const tracker = new CardTracker();

      const customRules = createDefaultGameRules({
        settlementRule: 'CARD_COUNT',
        table: { playerCount: 4, betAmount: 500, botThinkDelayMs: 700, soundEnabled: true }
      });

      const c9S = createCard(9, 'SPADES');
      // Bot có sảnh 4 lá [3S, 4S, 5H, 6D] và 1 rác [9S] trong luật Đếm Lá khi Cầm Cái
      const decision = makeBotDecision({
        hand: [c3S, c4S, c5H, c6D, c9S],
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        tracker,
        config: BOT_PERSONAS.BOT_ELO_1750,
        remainingPlayerCards: { p0: 5, p1: 6, p2: 7, p3: 8 },
        nextPlayerId: 'p1',
        rules: customRules,
        hasPlayedFirstCard: true
      });

      expect(decision.type).toBe('PLAY');
      // Phải chọn xả Sảnh dài trước theo luật Đếm Lá
      expect(decision.combination?.type).toBe('STRAIGHT');
      expect(decision.cards?.length).toBe(4);
    });
  });
});
