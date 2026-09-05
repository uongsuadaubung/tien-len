import { describe, test, expect } from 'bun:test';
import { createCard } from '../../src/engine/card';
import { isValidMove } from '../../src/engine/validator';
import { GameEngine } from '../../src/engine/game';
import { makeBotDecision, DecisionContext, createDecisionContext } from '../../src/ai/decision-maker';
import { CardTracker } from '../../src/ai/card-tracker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { Player, createDefaultGameRules, Card, PlayedMove } from '../../src/engine/types';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';

describe('Luật Cấm Đánh 2 Cuối Cùng & Thối Heo (Prohibit Ending on 2 & Rotten 2 Rules)', () => {
  describe('1. Validator Thẩm Định Nước Đi Hợp Lệ', () => {
    const card2H = createCard(15, 'HEARTS');
    const card2S = createCard(15, 'SPADES');
    const card3S = createCard(3, 'SPADES');
    const card4D = createCard(4, 'DIAMONDS');

    test('Không cho phép đánh 1 lá Heo khi là lá bài cuối cùng (isFinishingMove = true & prohibitEndingWithTwo = true)', () => {
      const result = isValidMove({
        cards: [card2H],
        target: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: true,
        prohibitEndingWithTwo: true
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Luật cấm về bằng lá Heo (2) cuối cùng');
    });

    test('Không cho phép đánh Đôi Heo khi là 2 lá bài cuối cùng', () => {
      const result = isValidMove({
        cards: [card2S, card2H],
        target: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: true,
        prohibitEndingWithTwo: true
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Luật cấm về bằng lá Heo (2) cuối cùng');
    });

    test('Cho phép đánh lá Heo khi chưa phải là lá cuối cùng (isFinishingMove = false)', () => {
      const result = isValidMove({
        cards: [card2H],
        target: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: false,
        prohibitEndingWithTwo: true
      });

      expect(result.valid).toBe(true);
    });

    test('Cho phép đánh bài thường (3..A) để kết thúc ván khi cấm 2 cuối', () => {
      const result = isValidMove({
        cards: [card3S],
        target: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: true,
        prohibitEndingWithTwo: true
      });

      expect(result.valid).toBe(true);
    });

    test('Cho phép về bằng Heo nếu luật cấm 2 cuối bị tắt (prohibitEndingWithTwo = false)', () => {
      const result = isValidMove({
        cards: [card2H],
        target: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: true,
        prohibitEndingWithTwo: false
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('2. GameEngine Thực Thi Luật & Phạt Thối Heo', () => {
    function createTestPlayers(): Player[] {
      return [
        createPlayer({ id: 'p0', name: 'Player', avatar: '', score: 1000 }),
        createBotPlayer('bot1', null, { name: 'Bot 1', avatar: '', score: 1000 }),
        createBotPlayer('bot2', null, { name: 'Bot 2', avatar: '', score: 1000 }),
        createBotPlayer('bot3', null, { name: 'Bot 3', avatar: '', score: 1000 })
      ];
    }

    test('GameEngine chặn người chơi đánh lá Heo cuối cùng để về bài', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        gameFlow: { firstGameRequireThreeOfSpades: false, winnerLeadsNextGame: true, prohibitEndingWithTwo: true }
      });
      const engine = new GameEngine(players, rules);
      engine.startCustomGame(2);

      players[0].hand = [createCard(15, 'HEARTS')];
      engine.currentRound.leadPlayerId = 'p0';
      engine.currentRound.currentTurnPlayerId = 'p0';

      const moveRes = engine.playMove('p0', [players[0].hand[0]]);
      expect(moveRes.success).toBe(false);
      if (moveRes.success) return;
      expect(moveRes.error).toContain('Luật cấm về bằng lá Heo (2) cuối cùng');
      expect(players[0].hand.length).toBe(1);
    });

    test('Người chơi có thể đánh Heo trước khi còn 2 lá, rồi dứt điểm bằng lá rác nhỏ', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        gameFlow: { firstGameRequireThreeOfSpades: false, winnerLeadsNextGame: true, prohibitEndingWithTwo: true }
      });
      const engine = new GameEngine(players, rules);
      engine.startCustomGame(2);

      players[0].hand = [createCard(3, 'SPADES'), createCard(15, 'HEARTS')];
      players[1].hand = [createCard(7, 'CLUBS'), createCard(8, 'CLUBS')];
      players[2].hand = [createCard(9, 'CLUBS'), createCard(10, 'CLUBS')];
      players[3].hand = [createCard(11, 'CLUBS'), createCard(12, 'CLUBS')];

      engine.currentRound.leadPlayerId = 'p0';
      engine.currentRound.currentTurnPlayerId = 'p0';

      // 1. Đánh 2 Cơ trước (còn 1 lá 3 Bích)
      const res1 = engine.playMove('p0', [players[0].hand[1]]);
      expect(res1.success).toBe(true);
      expect(players[0].hand.length).toBe(1);

      // Các bot bỏ lượt
      engine.passTurn('bot1');
      engine.passTurn('bot2');
      engine.passTurn('bot3');

      // 2. Vòng mới, p0 cầm cái đánh lá 3 Bích dứt điểm về Nhất!
      expect(engine.currentRound.currentTurnPlayerId).toBe('p0');
      const res2 = engine.playMove('p0', [players[0].hand[0]]);
      expect(res2.success).toBe(true);
      expect(players[0].hand.length).toBe(0);
      expect(players[0].rankPosition).toBe(1);
    });

    test('Phạt Thối Heo: Khi đối thủ về Nhất, người bị kẹt Heo bị phạt tiền và chuyển cho người về Nhất', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        settlementRule: 'COUNT_CARDS',
        gameFlow: { firstGameRequireThreeOfSpades: false, winnerLeadsNextGame: true, prohibitEndingWithTwo: true },
        table: { betAmount: 100, playerCount: 4, soundEnabled: false }
      });
      const engine = new GameEngine(players, rules);
      engine.startCustomGame(2);

      // p0 có 1 lá 5Bích để về Nhất
      players[0].hand = [createCard(5, 'SPADES')];
      players[0].hasPlayedFirstCard = true;

      // bot1 kẹt 1 Heo Đen (2♠) -> thối 1x bet = 100 + 1 lá = 100 -> tổng 200
      players[1].hand = [createCard(15, 'SPADES')];
      players[1].hasPlayedFirstCard = true;

      // bot2 kẹt 1 Heo Đỏ (2♥) -> thối 2x bet = 200 + 1 lá = 100 -> tổng 300
      players[2].hand = [createCard(15, 'HEARTS')];
      players[2].hasPlayedFirstCard = true;

      // bot3 có 2 lá thường -> 2 lá x 100 = 200
      players[3].hand = [createCard(6, 'DIAMONDS'), createCard(7, 'DIAMONDS')];
      players[3].hasPlayedFirstCard = true;

      engine.currentRound.leadPlayerId = 'p0';
      engine.currentRound.currentTurnPlayerId = 'p0';

      // p0 đánh 5 Bích về Nhất -> Game Over
      const playRes = engine.playMove('p0', [players[0].hand[0]]);
      expect(playRes.success).toBe(true);
      if (!playRes.success) return;
      expect(playRes.isGameOver).toBe(true);
      expect(engine.isGameOver).toBe(true);

      // bot1 bị phạt 200 (100 đếm lá + 100 thối Heo đen)
      expect(players[1].score).toBe(1000 - 200);
      // bot2 bị phạt 300 (100 đếm lá + 200 thối Heo đỏ)
      expect(players[2].score).toBe(1000 - 300);
      // bot3 bị phạt 200 (200 đếm lá)
      expect(players[3].score).toBe(1000 - 200);
      // p0 nhận trọn 200 + 300 + 200 = 700
      expect(players[0].score).toBe(1000 + 700);
    });
  });

  describe('3. Trí Tuệ Bot AI Thích Ứng Với Luật Cấm 2 Cuối', () => {
    const createMockDecisionContext = (partial: Partial<DecisionContext> & { hand: Card[]; currentRoundLeadingMove?: PlayedMove | null; isLeadMove?: boolean }): DecisionContext => createDecisionContext({
      hand: partial.hand,
      currentRoundLeadingMove: partial.currentRoundLeadingMove ?? null,
      isFirstMoveOfGame: partial.isFirstMoveOfGame ?? false,
      isLeadMove: partial.isLeadMove ?? (partial.currentRoundLeadingMove ? false : true),
      tracker: partial.tracker ?? new CardTracker(),
      config: partial.config ?? BOT_PERSONAS.BOT_ELO_1850,
      remainingPlayerCards: partial.remainingPlayerCards ?? { bot1: 2, p0: 5, bot2: 6, bot3: 7 },
      nextPlayerId: partial.nextPlayerId ?? 'p0',
      rules: partial.rules ?? createDefaultGameRules(),
      hasPlayedFirstCard: partial.hasPlayedFirstCard ?? true,
      isNextPlayerOneCard: partial.isNextPlayerOneCard ?? false,
      prohibitEndingWithTwo: partial.prohibitEndingWithTwo ?? true,
      gameMode: partial.gameMode ?? 'TRADITIONAL',
      mctsMap: partial.mctsMap ?? null,
      compositeRuleStrategy: partial.compositeRuleStrategy ?? null,
      opponentProfiles: partial.opponentProfiles ?? null
    });

    test('Bot có 2 lá [3♠, 2♥] chủ động đánh 2♥ trước khi đang cầm cái để về bằng 3♠', () => {
      const card3S = createCard(3, 'SPADES');
      const card2H = createCard(15, 'HEARTS');
      const botHand = [card3S, card2H];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 2, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards).toBeDefined();
      expect(decision.cards!.length).toBe(1);
      // Phải đánh lá 2 Cơ trước
      expect(decision.cards![0].rank).toBe(15);
      expect(decision.cards![0].suit).toBe('HEARTS');
    });

    test('Bot chỉ còn 1 lá Heo [2♥] tự động chọn Bỏ Lượt (PASS), không vi phạm luật', () => {
      const card2H = createCard(15, 'HEARTS');
      const botHand = [card2H];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 1, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PASS');
    });

    test('Bot có 3 lá [Đôi 4 + 1 Heo] đánh Heo trước để chốt hạ bằng Đôi 4', () => {
      const card4S = createCard(4, 'SPADES');
      const card4H = createCard(4, 'HEARTS');
      const card2D = createCard(15, 'DIAMONDS');
      const botHand = [card4S, card4H, card2D];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 3, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards).toBeDefined();
      expect(decision.cards!.length).toBe(1);
      expect(decision.cards![0].rank).toBe(15);
    });

    test('Bot có 2 lá [3♠, 2♥], khi đối phương đánh Át (A), Bot đè bằng Heo để cướp cái về bằng 3♠', () => {
      const card3S = createCard(3, 'SPADES');
      const card2H = createCard(15, 'HEARTS');
      const botHand = [card3S, card2H];
      const tracker = new CardTracker();

      const aceCard = createCard(14, 'SPADES');
      const leadingMove: PlayedMove = {
        playerId: 'p0',
        combination: { type: 'SINGLE' as const, cards: [aceCard], highestCard: aceCard, length: 1 },
        timestamp: Date.now(),
        isChop: false
      };

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: leadingMove,
        isLeadMove: false,
        tracker,
        remainingPlayerCards: { bot1: 2, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards).toBeDefined();
      expect(decision.cards!.length).toBe(1);
      expect(decision.cards![0].rank).toBe(15);
    });

    test('Bot có 5 lá [1 Rác 3♠ + Tứ Quý 2]: Phải đánh Tứ Quý 2 trước khi Cầm Cái để dứt điểm bằng 3♠', () => {
      const card3S = createCard(3, 'SPADES');
      const card2S = createCard(15, 'SPADES');
      const card2C = createCard(15, 'CLUBS');
      const card2D = createCard(15, 'DIAMONDS');
      const card2H = createCard(15, 'HEARTS');
      const botHand = [card3S, card2S, card2C, card2D, card2H];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 5, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards).toBeDefined();
      expect(decision.cards!.length).toBe(4);
      expect(decision.combination!.type).toBe('FOUR_OF_A_KIND');
      expect(decision.combination!.highestCard.rank).toBe(15);
    });

    test('1 con 2 + 1 Tam/Sám: Bot có [Sám 5 + 1 Heo] đánh Heo trước để dứt điểm bằng Sám 5', () => {
      const botHand = [createCard(5, 'SPADES'), createCard(5, 'CLUBS'), createCard(5, 'HEARTS'), createCard(15, 'DIAMONDS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 4, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(1);
      expect(decision.cards![0].rank).toBe(15);
    });

    test('1 con 2 + 1 Sảnh/Dây: Bot có [Sảnh 3-4-5-6 + 1 Heo] đánh Heo trước để dứt điểm bằng Sảnh', () => {
      const botHand = [createCard(3, 'SPADES'), createCard(4, 'CLUBS'), createCard(5, 'HEARTS'), createCard(6, 'DIAMONDS'), createCard(15, 'HEARTS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 5, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(1);
      expect(decision.cards![0].rank).toBe(15);
    });

    test('1 con 2 + 1 Tứ Quý: Bot có [Tứ Quý 7 + 1 Heo] đánh Heo trước để dứt điểm bằng Tứ Quý 7', () => {
      const botHand = [createCard(7, 'SPADES'), createCard(7, 'CLUBS'), createCard(7, 'DIAMONDS'), createCard(7, 'HEARTS'), createCard(15, 'HEARTS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 5, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(1);
      expect(decision.cards![0].rank).toBe(15);
    });

    test('2 con 2 (Đôi Heo) + 1 Rác: Bot có [3♠ + Đôi Heo] đánh Đôi Heo trước để dứt điểm bằng 3♠', () => {
      const botHand = [createCard(3, 'SPADES'), createCard(15, 'SPADES'), createCard(15, 'HEARTS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 3, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(2);
      expect(decision.combination!.type).toBe('PAIR');
      expect(decision.combination!.highestCard.rank).toBe(15);
    });

    test('2 con 2 (Đôi Heo) + 1 Đôi: Bot có [Đôi 4 + Đôi Heo] đánh Đôi Heo trước để dứt điểm bằng Đôi 4', () => {
      const botHand = [createCard(4, 'SPADES'), createCard(4, 'HEARTS'), createCard(15, 'SPADES'), createCard(15, 'HEARTS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 4, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(2);
      expect(decision.combination!.type).toBe('PAIR');
      expect(decision.combination!.highestCard.rank).toBe(15);
    });

    test('2 con 2 (Đôi Heo) + 1 Sảnh: Bot có [Sảnh 3-4-5 + Đôi Heo] đánh Đôi Heo trước để dứt điểm bằng Sảnh', () => {
      const botHand = [createCard(3, 'SPADES'), createCard(4, 'CLUBS'), createCard(5, 'HEARTS'), createCard(15, 'SPADES'), createCard(15, 'HEARTS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 5, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(2);
      expect(decision.combination!.type).toBe('PAIR');
      expect(decision.combination!.highestCard.rank).toBe(15);
    });

    test('3 con 2 (Sám Heo) + 1 Rác: Bot có [3♠ + Sám Heo] đánh Sám Heo trước để dứt điểm bằng 3♠', () => {
      const botHand = [createCard(3, 'SPADES'), createCard(15, 'SPADES'), createCard(15, 'CLUBS'), createCard(15, 'HEARTS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 4, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(3);
      expect(decision.combination!.type).toBe('TRIPLE');
      expect(decision.combination!.highestCard.rank).toBe(15);
    });

    test('3 con 2 (Sám Heo) + 1 Đôi: Bot có [Đôi 4 + Sám Heo] đánh Sám Heo trước để dứt điểm bằng Đôi 4', () => {
      const botHand = [createCard(4, 'SPADES'), createCard(4, 'HEARTS'), createCard(15, 'SPADES'), createCard(15, 'CLUBS'), createCard(15, 'HEARTS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 5, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(3);
      expect(decision.combination!.type).toBe('TRIPLE');
      expect(decision.combination!.highestCard.rank).toBe(15);
    });

    test('4 con 2 (Tứ Quý Heo) + 1 Đôi: Bot có [Đôi 4 + Tứ Quý 2] đánh Tứ Quý 2 trước để dứt điểm bằng Đôi 4', () => {
      const botHand = [createCard(4, 'SPADES'), createCard(4, 'HEARTS'), createCard(15, 'SPADES'), createCard(15, 'CLUBS'), createCard(15, 'DIAMONDS'), createCard(15, 'HEARTS')];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 6, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(4);
      expect(decision.combination!.type).toBe('FOUR_OF_A_KIND');
      expect(decision.combination!.highestCard.rank).toBe(15);
    });

    test('4 con 2 (Tứ Quý Heo) + 1 Sảnh: Bot có [Sảnh 3-4-5-6 + Tứ Quý 2] đánh Tứ Quý 2 trước để dứt điểm bằng Sảnh', () => {
      const botHand = [
        createCard(3, 'SPADES'), createCard(4, 'CLUBS'), createCard(5, 'HEARTS'), createCard(6, 'DIAMONDS'),
        createCard(15, 'SPADES'), createCard(15, 'CLUBS'), createCard(15, 'DIAMONDS'), createCard(15, 'HEARTS')
      ];
      const tracker = new CardTracker();

      const decision = makeBotDecision(createMockDecisionContext({
        hand: botHand,
        currentRoundLeadingMove: null,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { bot1: 8, p0: 5, bot2: 6, bot3: 7 }
      }));

      expect(decision.type).toBe('PLAY');
      expect(decision.cards!.length).toBe(4);
      expect(decision.combination!.type).toBe('FOUR_OF_A_KIND');
      expect(decision.combination!.highestCard.rank).toBe(15);
    });
  });

  describe('4. GameEngine Gameplay: Xử lý 1 Rác + Tứ Quý 2', () => {
    function createTestPlayers(): Player[] {
      return [
        createPlayer({ id: 'p0', name: 'Player', avatar: '', score: 1000 }),
        createBotPlayer('bot1', null, { name: 'Bot 1', avatar: '', score: 1000 }),
        createBotPlayer('bot2', null, { name: 'Bot 2', avatar: '', score: 1000 }),
        createBotPlayer('bot3', null, { name: 'Bot 3', avatar: '', score: 1000 })
      ];
    }

    test('Người chơi cầm [3♠ + Tứ Quý 2] đánh Tứ Quý 2 trước, sau đó đánh 3♠ về Nhất', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        gameFlow: { firstGameRequireThreeOfSpades: false, winnerLeadsNextGame: true, prohibitEndingWithTwo: true }
      });
      const engine = new GameEngine(players, rules);
      engine.startCustomGame(2);

      const card3S = createCard(3, 'SPADES');
      const card2S = createCard(15, 'SPADES');
      const card2C = createCard(15, 'CLUBS');
      const card2D = createCard(15, 'DIAMONDS');
      const card2H = createCard(15, 'HEARTS');

      players[0].hand = [card3S, card2S, card2C, card2D, card2H];
      players[1].hand = [createCard(7, 'CLUBS'), createCard(8, 'CLUBS')];
      players[2].hand = [createCard(9, 'CLUBS'), createCard(10, 'CLUBS')];
      players[3].hand = [createCard(11, 'CLUBS'), createCard(12, 'CLUBS')];

      engine.currentRound.leadPlayerId = 'p0';
      engine.currentRound.currentTurnPlayerId = 'p0';

      // 1. Đánh Tứ Quý 2 trước (hợp lệ vì còn lá 3♠, không phải nước kết thúc)
      const res1 = engine.playMove('p0', [card2S, card2C, card2D, card2H]);
      expect(res1.success).toBe(true);
      expect(players[0].hand.length).toBe(1);

      // Các người chơi khác bỏ lượt
      engine.passTurn('bot1');
      engine.passTurn('bot2');
      engine.passTurn('bot3');

      // 2. Vòng mới, p0 cầm cái đánh lá 3♠ dứt điểm về Nhất!
      expect(engine.currentRound.currentTurnPlayerId).toBe('p0');
      const res2 = engine.playMove('p0', [card3S]);
      expect(res2.success).toBe(true);
      expect(players[0].hand.length).toBe(0);
      expect(players[0].rankPosition).toBe(1);
    });

    test('Nếu người chơi đánh 3♠ trước, bị kẹt lại Tứ Quý 2 sẽ KHÔNG ĐƯỢC PHÉP đánh Tứ Quý 2 để về bài', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        gameFlow: { firstGameRequireThreeOfSpades: false, winnerLeadsNextGame: true, prohibitEndingWithTwo: true }
      });
      const engine = new GameEngine(players, rules);
      engine.startCustomGame(2);

      const card3S = createCard(3, 'SPADES');
      const card2S = createCard(15, 'SPADES');
      const card2C = createCard(15, 'CLUBS');
      const card2D = createCard(15, 'DIAMONDS');
      const card2H = createCard(15, 'HEARTS');

      players[0].hand = [card3S, card2S, card2C, card2D, card2H];
      players[1].hand = [createCard(7, 'CLUBS'), createCard(8, 'CLUBS')];
      players[2].hand = [createCard(9, 'CLUBS'), createCard(10, 'CLUBS')];
      players[3].hand = [createCard(11, 'CLUBS'), createCard(12, 'CLUBS')];

      engine.currentRound.leadPlayerId = 'p0';
      engine.currentRound.currentTurnPlayerId = 'p0';

      // 1. Đánh lá 3♠ trước
      const res1 = engine.playMove('p0', [card3S]);
      expect(res1.success).toBe(true);
      expect(players[0].hand.length).toBe(4);

      // Các người chơi khác bỏ lượt -> p0 lại cầm cái
      engine.passTurn('bot1');
      engine.passTurn('bot2');
      engine.passTurn('bot3');

      // 2. Lúc này p0 chỉ còn Tứ Quý 2: Cố tình đánh Tứ Quý 2 để về ván -> BỊ CHẶN do cấm 2 cuối!
      expect(engine.currentRound.currentTurnPlayerId).toBe('p0');
      const res2 = engine.playMove('p0', [card2S, card2C, card2D, card2H]);
      expect(res2.success).toBe(false);
      if (res2.success) return;
      expect(res2.error).toContain('Luật cấm về bằng lá Heo (2) cuối cùng');
      // Bài vẫn còn nguyên 4 lá Heo trên tay
      expect(players[0].hand.length).toBe(4);
    });
  });

  describe('5. Cơ Chế Bỏ Lượt Khi Cầm Cái (Lead Turn Pass) & Chống Deadlock', () => {
    function createTestPlayers(): Player[] {
      return [
        createPlayer({ id: 'p0', name: 'Player', avatar: '', score: 1000 }),
        createBotPlayer('bot1', null, { name: 'Bot 1', avatar: '', score: 1000 }),
        createBotPlayer('bot2', null, { name: 'Bot 2', avatar: '', score: 1000 }),
        createBotPlayer('bot3', null, { name: 'Bot 3', avatar: '', score: 1000 })
      ];
    }

    test('Lượt mở màn ván đầu tiên (isFirstMoveOfGame = true) BẮT BUỘC phải đánh, không được bỏ lượt', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        gameFlow: { firstGameRequireThreeOfSpades: true, winnerLeadsNextGame: true, prohibitEndingWithTwo: true }
      });
      const engine = new GameEngine(players, rules);
      engine.startCustomGame(1);

      // Cho p0 giữ 3 Bích và đến lượt mở màn ván 1
      players[0].hand = [createCard(3, 'SPADES'), createCard(5, 'HEARTS')];
      engine.isFirstMoveOfGame = true;
      engine.currentRound.leadPlayerId = 'p0';
      engine.currentRound.currentTurnPlayerId = 'p0';

      const passRes = engine.passTurn('p0');
      expect(passRes.success).toBe(false);
      if (passRes.success) return;
      expect(passRes.error).toContain('Lượt mở màn ván đầu tiên bắt buộc phải ra bài');
    });

    test('Khi đang cầm cái (Lead move) ở các lượt khác, người chơi có thể BỎ LƯỢT để nhường quyền mở vòng cho người kế tiếp', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        gameFlow: { firstGameRequireThreeOfSpades: false, winnerLeadsNextGame: true, prohibitEndingWithTwo: true }
      });
      const engine = new GameEngine(players, rules);
      engine.startCustomGame(2);

      players[0].hand = [createCard(15, 'HEARTS')]; // p0 chỉ còn Heo cơ
      players[1].hand = [createCard(8, 'CLUBS')];
      players[2].hand = [createCard(9, 'CLUBS')];
      players[3].hand = [createCard(10, 'CLUBS')];

      engine.currentRound.leadPlayerId = 'p0';
      engine.currentRound.currentTurnPlayerId = 'p0';
      expect(engine.isRoundLeadMove()).toBe(true);

      // p0 đang cầm cái nhưng chọn BỎ LƯỢT
      const passRes = engine.passTurn('p0');
      expect(passRes.success).toBe(true);
      expect(players[0].isPassedCurrentRound).toBe(true);

      // Quyền cầm cái và lượt đi được chuyển sang bot1 (người kế tiếp còn bài)
      expect(engine.currentRound.currentTurnPlayerId).toBe('bot1');
      expect(engine.currentRound.leadPlayerId).toBe('bot1');
      expect(engine.isRoundLeadMove()).toBe(true);

      // bot1 có thể mở bài bình thường
      const bot1Move = engine.playMove('bot1', [createCard(8, 'CLUBS')]);
      expect(bot1Move.success).toBe(true);
    });

    test('Chống Soft-lock/Deadlock: Toàn bộ người chơi còn lại đều chỉ còn Heo và cùng Bỏ Lượt khi cầm cái -> Ván đấu kết thúc ngay và phạt Thối Heo', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        table: { betAmount: 100 },
        gameFlow: { firstGameRequireThreeOfSpades: false, winnerLeadsNextGame: true, prohibitEndingWithTwo: true }
      });
      const engine = new GameEngine(players, rules);
      engine.startCustomGame(2);

      // bot3 đã hết bài về Nhất trước đó
      players[3].hand = [];
      players[3].rankPosition = 1;
      engine.winners = [players[3]];

      // 3 người chơi còn lại (p0, bot1, bot2) mỗi người chỉ còn đúng 1 lá Heo (2)
      players[0].hand = [createCard(15, 'SPADES')];
      players[1].hand = [createCard(15, 'CLUBS')];
      players[2].hand = [createCard(15, 'DIAMONDS')];

      engine.currentRound.leadPlayerId = 'p0';
      engine.currentRound.currentTurnPlayerId = 'p0';

      // 1. p0 cầm cái bỏ lượt vì cấm về Heo
      const pass0 = engine.passTurn('p0');
      expect(pass0.success).toBe(true);
      expect(engine.currentRound.currentTurnPlayerId).toBe('bot1');

      // 2. bot1 cầm cái cũng bỏ lượt
      const pass1 = engine.passTurn('bot1');
      expect(pass1.success).toBe(true);
      expect(engine.currentRound.currentTurnPlayerId).toBe('bot2');

      // 3. bot2 cầm cái cũng bỏ lượt (người cuối cùng còn lại bỏ lượt mở vòng)
      const pass2 = engine.passTurn('bot2');
      expect(pass2.success).toBe(true);

      // Ván đấu PHẢI kết thúc ngay lập tức, không được treo/loop vô hạn
      expect(engine.isGameOver).toBe(true);

      // Kiểm tra tất cả người còn giữ Heo đều bị phạt Thối Heo
      expect(players[0].score).toBeLessThan(1000);
      expect(players[1].score).toBeLessThan(1000);
      expect(players[2].score).toBeLessThan(1000);
      // Người về Nhất (bot3) nhận tiền phạt
      expect(players[3].score).toBeGreaterThan(1000);
    });
  });
});

