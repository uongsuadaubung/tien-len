import { describe, expect, it } from 'bun:test';
import { Card, Combination, createDefaultGameRules, GameRulesBuilder } from '../../src/engine/types';
import { createCard } from '../../src/engine/card';
import { CardTracker } from '../../src/ai/card-tracker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { 
  ChoppingRuleStrategy, 
  ChoppingRuleStrategyBuilder,
  CompositeRuleStrategy, 
  CompositeRuleStrategyBuilder,
  CongRuleStrategy, 
  CongRuleStrategyBuilder,
  CountCardsSettlementStrategy, 
  GameFlowRuleStrategy, 
  GameFlowRuleStrategyBuilder,
  RuleDecisionContext, 
  TableScaleRuleStrategy, 
  TableScaleRuleStrategyBuilder,
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

  function createMockRuleDecisionContext(partial?: Partial<RuleDecisionContext>): RuleDecisionContext {
    return {
      hand: partial?.hand || [],
      currentRoundLeadingMove: partial?.currentRoundLeadingMove ?? null,
      isFirstMoveOfGame: partial?.isFirstMoveOfGame ?? false,
      isLeadMove: partial?.isLeadMove ?? false,
      tracker: partial?.tracker || new CardTracker(),
      remainingPlayerCards: partial?.remainingPlayerCards || { p0: 5, p1: 5 },
      nextPlayerId: partial?.nextPlayerId || 'p1',
      hasPlayedFirstCard: partial?.hasPlayedFirstCard ?? true,
      isNextPlayerOneCard: partial?.isNextPlayerOneCard ?? false,
      prohibitEndingWithTwo: partial?.prohibitEndingWithTwo ?? true,
      rules: partial?.rules || createDefaultGameRules(),
      handPartitioningOptimality: partial?.handPartitioningOptimality ?? 0.8,
      antiLeaderAggression: partial?.antiLeaderAggression ?? 0.8,
      tempoControl: partial?.tempoControl ?? 0.5,
      trapTendency: partial?.trapTendency ?? 0.5,
      riskAppetite: partial?.riskAppetite ?? 0.5
    };
  }

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
      const congStrategy = new CongRuleStrategyBuilder()
        .enabled(true)
        .penaltyCards(26)
        .multiplier(1)
        .build();
      const tracker = new CardTracker();

      const defaultRules = createDefaultGameRules();
      const context = createMockRuleDecisionContext({
        hand: [c3S, c3D, c4S, c7S, cAS],
        currentRoundLeadingMove: {
          playerId: 'p1',
          combination: { type: 'SINGLE', cards: [c4C], highestCard: c4C, length: 1 },
          timestamp: Date.now()
        },
        remainingPlayerCards: { p0: 5, p1: 2, p2: 8, p3: 9 }, // p1 còn 2 lá!
        hasPlayedFirstCard: false, // CHƯA RA ĐƯỢC LÁ NÀO
        rules: defaultRules
      });

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
      const congStrategy = new CongRuleStrategyBuilder()
        .enabled(true)
        .penaltyCards(26)
        .multiplier(1)
        .build();
      const tracker = new CardTracker();

      const defaultRules = createDefaultGameRules();
      const context = createMockRuleDecisionContext({
        hand: [c7S, cAS],
        remainingPlayerCards: { p0: 2, p1: 1 },
        hasPlayedFirstCard: true, // ĐÃ RA BÀI RỒI
        rules: defaultRules
      });

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
      const choppingNormal = new ChoppingRuleStrategyBuilder()
        .allowFourPairsCutAnytime(false)
        .multiplier(1)
        .cascadeMultiplier(false)
        .build();
      expect(choppingNormal.getChoppingRiskFactor()).toBe(1.0);

      const choppingUnderground = new ChoppingRuleStrategyBuilder()
        .allowFourPairsCutAnytime(true)
        .multiplier(2)
        .cascadeMultiplier(false)
        .build();
      // multiplier = 2 * 1.25 (allowFourPairsCutAnytime) = 2.5
      expect(choppingUnderground.getChoppingRiskFactor()).toBe(2.5);
      expect(choppingUnderground.getTrapScoreModifier()).toBe(40);

      const choppingCascade = new ChoppingRuleStrategyBuilder()
        .allowFourPairsCutAnytime(true)
        .multiplier(2)
        .cascadeMultiplier(true)
        .build();
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
      const gameFlowStrategy = new GameFlowRuleStrategyBuilder()
        .prohibitEndingWithTwo(true)
        .firstGameRequireThreeOfSpades(true)
        .build();
      const tracker = new CardTracker();

      const defaultRules = createDefaultGameRules();
      // Tay cầm [3S, 2H]: còn 1 rác + 1 heo
      const context = createMockRuleDecisionContext({
        hand: [c3S, c2H],
        isLeadMove: true,
        remainingPlayerCards: { p0: 2, p1: 4, p2: 5, p3: 6 },
        hasPlayedFirstCard: true,
        prohibitEndingWithTwo: true,
        rules: defaultRules
      });

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
      const gameFlowStrategy = new GameFlowRuleStrategyBuilder()
        .prohibitEndingWithTwo(true)
        .firstGameRequireThreeOfSpades(true)
        .build();
      const tracker = new CardTracker();

      const defaultRules = createDefaultGameRules();
      const context = createMockRuleDecisionContext({
        hand: [c4S, c7S, cAS],
        isLeadMove: true,
        remainingPlayerCards: { p0: 3, p1: 1, p2: 5, p3: 6 }, // p1 (kế tiếp) còn 1 lá
        hasPlayedFirstCard: true,
        rules: defaultRules
      });

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
      const table1v1 = new TableScaleRuleStrategyBuilder()
        .playerCount(2)
        .build();
      const leadPolicy = table1v1.contributeLeadPolicy({});
      expect(leadPolicy.aggressiveFinisherPush).toBe(true);

      const moveAS: ValidMoveInfo = {
        cards: [cAS],
        combination: { type: 'SINGLE', cards: [cAS], highestCard: cAS, length: 1 },
        isChop: false
      };

      const context = createMockRuleDecisionContext({
        hand: [cAS],
        remainingPlayerCards: { p0: 5, p1: 5 },
        rules: createDefaultGameRules({ table: { playerCount: 2, betAmount: 500, botThinkDelayMs: 650, soundEnabled: true } }),
        antiLeaderAggression: 1.0
      });

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
        hasPlayedFirstCard: true,
        isNextPlayerOneCard: false,
        prohibitEndingWithTwo: true,
        gameMode: 'COUNT_CARDS',
        mctsMap: null,
        compositeRuleStrategy: null,
        opponentProfiles: null
      });

      expect(decision.type).toBe('PLAY');
      // Phải chọn xả Sảnh dài trước theo luật Đếm Lá
      expect(decision.combination?.type).toBe('STRAIGHT');
      expect(decision.cards?.length).toBe(4);
    });
  });

  // ==========================================================================
  // 7. BUILDER PATTERN TESTS FOR RULE STRATEGIES & GAMERULES
  // ==========================================================================
  describe('7. Builder Pattern For Rule Strategies & GameRules', () => {
    it('ChoppingRuleStrategyBuilder khởi tạo chiến lược chặt tường minh', () => {
      const strategy = new ChoppingRuleStrategyBuilder()
        .allowFourPairsCutAnytime(true)
        .multiplier(2)
        .cascadeMultiplier(true)
        .build();

      expect(strategy.getChoppingRiskFactor()).toBe(3.0);
      expect(strategy.getTrapScoreModifier()).toBe(65);
    });

    it('CongRuleStrategyBuilder khởi tạo chiến lược cóng tường minh', () => {
      const strategy = new CongRuleStrategyBuilder()
        .enabled(true)
        .penaltyCards(26)
        .multiplier(2)
        .build();

      expect(strategy.ruleName).toContain('Cong');
    });

    it('GameFlowRuleStrategyBuilder khởi tạo chiến lược vòng chơi tường minh', () => {
      const strategy = new GameFlowRuleStrategyBuilder()
        .prohibitEndingWithTwo(true)
        .firstGameRequireThreeOfSpades(true)
        .threeSpadesEndingBonus(true)
        .build();

      expect(strategy.ruleName).toContain('GameFlow');
    });

    it('TableScaleRuleStrategyBuilder khởi tạo quy mô bàn chơi tường minh', () => {
      const strategy = new TableScaleRuleStrategyBuilder()
        .playerCount(2)
        .build();

      expect(strategy.ruleName).toContain('Table Scale');
    });

    it('GameRulesBuilder xây dựng cấu hình GameRules hoàn chỉnh không có trường undefined', () => {
      const rules = new GameRulesBuilder()
        .withSettlement('CARD_COUNT')
        .withTable(t => t.playerCount(4).betAmount(1000))
        .withChopping(c => c.cascadeMultiplier(true))
        .withGameFlow(f => f.prohibitEndingWithTwo(true).threeSpadesEndingBonus(true))
        .withCong(cg => cg.multiplier(2))
        .build();

      expect(rules.settlementRule).toBe('CARD_COUNT');
      expect(rules.table.playerCount).toBe(4);
      expect(rules.table.betAmount).toBe(1000);
      expect(rules.chopping.cascadeMultiplier).toBe(true);
      expect(rules.gameFlow.prohibitEndingWithTwo).toBe(true);
      expect(rules.gameFlow.threeSpadesEndingBonus).toBe(true);
      expect(rules.cong.multiplier).toBe(2);

      const composite = new CompositeRuleStrategyBuilder(rules).build();
      expect(composite.rules.settlementRule).toBe('CARD_COUNT');
    });

    it('GameRulesBuilder hỗ trợ Nested Domain Sub-Builders theo từng nhóm nghiệp vụ', () => {
      const customRules = new GameRulesBuilder()
        .withSettlement('CARD_COUNT')
        .withChopping(c => c
          .allowFourPairsCutAnytime(true)
          .multiplier(2)
          .cascadeMultiplier(true)
        )
        .withCong(cg => cg
          .enabled(true)
          .penaltyCards(26)
          .multiplier(2)
        )
        .withGameFlow(f => f
          .prohibitEndingWithTwo(true)
          .threeSpadesEndingBonus(true)
          .firstGameRequireThreeOfSpades(true)
        )
        .withInstantWin(w => w
          .enabled(true)
          .payoutMultiplier(26)
        )
        .withTable(t => t
          .playerCount(4)
          .betAmount(2000)
          .botThinkDelayMs(600)
        )
        .build();

      expect(customRules.settlementRule).toBe('CARD_COUNT');
      expect(customRules.chopping.multiplier).toBe(2);
      expect(customRules.chopping.cascadeMultiplier).toBe(true);
      expect(customRules.cong.multiplier).toBe(2);
      expect(customRules.gameFlow.threeSpadesEndingBonus).toBe(true);
      expect(customRules.table.betAmount).toBe(2000);
      expect(customRules.table.botThinkDelayMs).toBe(600);
    });

    it('GameRulesBuilder hỗ trợ Preset Profiles kế thừa và ghi đè linh hoạt', () => {
      const undergroundCustom = GameRulesBuilder.underground()
        .withTable(t => t.betAmount(5000))
        .withGameFlow(f => f.threeSpadesEndingBonus(true))
        .build();

      expect(undergroundCustom.settlementRule).toBe('CARD_COUNT');
      expect(undergroundCustom.chopping.multiplier).toBe(2);
      expect(undergroundCustom.table.betAmount).toBe(5000);
      expect(undergroundCustom.gameFlow.threeSpadesEndingBonus).toBe(true);

      const soloRules = GameRulesBuilder.fromPreset('SOLO_1V1').build();
      expect(soloRules.table.playerCount).toBe(2);
    });
  });
});
