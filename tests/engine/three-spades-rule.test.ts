import { describe, test, expect } from 'bun:test';
import { createCard } from '../../src/engine/card';
import { GameEngine } from '../../src/engine/game';
import { calculateCountCardsSettlement, calculateWinnerTakesAllSettlement, calculateTraditionalSettlement } from '../../src/engine/economy';
import { Player, createDefaultGameRules, GameRulesBuilder } from '../../src/engine/types';
import { GameFlowRuleStrategyBuilder, RuleDecisionContext } from '../../src/ai/rule-strategies';
import { CardTracker } from '../../src/ai/card-tracker';

describe('Luật Về 3 Bích Cuối Cùng (3♠ Last Card Win / Ăn Ba Bích)', () => {
  const card3S = createCard(3, 'SPADES');
  const card3C = createCard(3, 'CLUBS');
  const card4D = createCard(4, 'DIAMONDS');
  const card5H = createCard(5, 'HEARTS');
  const card2H = createCard(15, 'HEARTS');

  function createTestPlayers(): Player[] {
    return [
      {
        id: 'p0',
        name: 'Người Chơi',
        avatar: '🤠',
        isBot: false,
        botPersonaId: null,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: true,
        rankPosition: null,
        instantWinType: null
      },
      {
        id: 'p1',
        name: 'Bot 1',
        avatar: '🤖',
        isBot: true,
        botPersonaId: null,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: true,
        rankPosition: null,
        instantWinType: null
      },
      {
        id: 'p2',
        name: 'Bot 2',
        avatar: '🤖',
        isBot: true,
        botPersonaId: null,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: true,
        rankPosition: null,
        instantWinType: null
      },
      {
        id: 'p3',
        name: 'Bot 3',
        avatar: '🤖',
        isBot: true,
        botPersonaId: null,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: true,
        rankPosition: null,
        instantWinType: null
      }
    ];
  }

  describe('1. GameEngine Nhận Diện Về 3 Bích Cuối Cùng', () => {
    test('Kích hoạt isThreeSpadesWin khi đánh lá đơn 3♠ về Nhất ở ván thứ 2+', () => {
      const players = createTestPlayers();
      const rules = new GameRulesBuilder()
        .withInstantWin(w => w.enabled(false))
        .withGameFlow(f => f
          .firstGameRequireThreeOfSpades(true)
          .winnerLeadsNextGame(true)
          .prohibitEndingWithTwo(true)
          .threeSpadesEndingBonus(true)
        )
        .build();

      const game = new GameEngine(players, rules);
      game.startNewGame(2, 'p0'); // Ván thứ 2, p0 đi trước

      // Gán bài cho p0: chỉ còn duy nhất lá 3 Bích
      game.getPlayer('p0')!.hand = [card3S];
      game.currentRound.leadPlayerId = 'p0';
      game.currentRound.currentTurnPlayerId = 'p0';
      game.currentRound.moves = [];

      const res = game.playMove('p0', [card3S]);
      expect(res.success).toBe(true);
      expect(game.isThreeSpadesWin).toBe(true);
    });

    test('Không kích hoạt isThreeSpadesWin ở ván đầu tiên (gameNumber = 1)', () => {
      const players = createTestPlayers();
      const rules = new GameRulesBuilder()
        .withInstantWin(w => w.enabled(false))
        .withGameFlow(f => f
          .firstGameRequireThreeOfSpades(true)
          .winnerLeadsNextGame(true)
          .prohibitEndingWithTwo(true)
          .threeSpadesEndingBonus(true)
        )
        .build();

      const game = new GameEngine(players, rules);
      game.startNewGame(1); // Ván 1

      game.getPlayer('p0')!.hand = [card3S];
      game.currentRound.leadPlayerId = 'p0';
      game.currentRound.currentTurnPlayerId = 'p0';
      game.currentRound.moves = [];

      const res = game.playMove('p0', [card3S]);
      expect(res.success).toBe(true);
      // Ván 1 không kích hoạt thưởng về 3 bích
      expect(game.isThreeSpadesWin).toBe(false);
    });

    test('Không kích hoạt isThreeSpadesWin nếu kết thúc bằng Đôi 3 chứa 3♠ (phải là lá đơn)', () => {
      const players = createTestPlayers();
      const rules = new GameRulesBuilder()
        .withInstantWin(w => w.enabled(false))
        .withGameFlow(f => f
          .firstGameRequireThreeOfSpades(true)
          .winnerLeadsNextGame(true)
          .prohibitEndingWithTwo(true)
          .threeSpadesEndingBonus(true)
        )
        .build();

      const game = new GameEngine(players, rules);
      game.startNewGame(2, 'p0');

      // Gán đôi 3 (3S và 3C)
      game.getPlayer('p0')!.hand = [card3S, card3C];
      game.currentRound.leadPlayerId = 'p0';
      game.currentRound.currentTurnPlayerId = 'p0';
      game.currentRound.moves = [];

      const res = game.playMove('p0', [card3S, card3C]);
      expect(res.success).toBe(true);
      // Đôi 3 không phải là lá đơn 3♠
      expect(game.isThreeSpadesWin).toBe(false);
    });

    test('Không kích hoạt isThreeSpadesWin nếu luật threeSpadesEndingBonus bị tắt', () => {
      const players = createTestPlayers();
      const rules = new GameRulesBuilder()
        .withInstantWin(w => w.enabled(false))
        .withGameFlow(f => f
          .firstGameRequireThreeOfSpades(true)
          .winnerLeadsNextGame(true)
          .prohibitEndingWithTwo(true)
          .threeSpadesEndingBonus(false)
        )
        .build();

      const game = new GameEngine(players, rules);
      game.startNewGame(2, 'p0');

      game.getPlayer('p0')!.hand = [card3S];
      game.currentRound.leadPlayerId = 'p0';
      game.currentRound.currentTurnPlayerId = 'p0';
      game.currentRound.moves = [];

      const res = game.playMove('p0', [card3S]);
      expect(res.success).toBe(true);
      expect(game.isThreeSpadesWin).toBe(false);
    });
  });

  describe('2. Tính Toán Tiền Thưởng (Economy Settlements)', () => {
    test('Chế độ Đếm Lá: Nhân 2 toàn bộ số lá bị phạt từ người thua', () => {
      const players = createTestPlayers();
      players[0].hand = []; // Winner
      players[1].hand = [card4D, card5H]; // 2 lá
      players[2].hand = [card4D, card5H, card2H]; // 3 lá (1 heo đỏ = +2 lá phạt)
      players[3].hand = [card4D]; // 1 lá

      const betAmount = 100;
      // Normal settlement
      const normalPayouts = calculateCountCardsSettlement(players, 'p0', betAmount, false, false);
      // 3 of Spades settlement
      const threeSpadesPayouts = calculateCountCardsSettlement(players, 'p0', betAmount, false, true);

      expect(threeSpadesPayouts['p1']).toBe(normalPayouts['p1'] * 2);
      expect(threeSpadesPayouts['p2']).toBe(normalPayouts['p2'] * 2);
      expect(threeSpadesPayouts['p3']).toBe(normalPayouts['p3'] * 2);
      expect(threeSpadesPayouts['p0']).toBe(normalPayouts['p0'] * 2);
    });

    test('Chế độ Nhất Ăn Tất: Mỗi người thua mất gấp đôi tiền cược', () => {
      const players = createTestPlayers();
      players[0].hand = [];
      players[1].hand = [card4D];
      players[2].hand = [card4D];
      players[3].hand = [card4D];

      const betAmount = 500;
      const normalPayouts = calculateWinnerTakesAllSettlement(players, 'p0', betAmount, false, false);
      const threeSpadesPayouts = calculateWinnerTakesAllSettlement(players, 'p0', betAmount, false, true);

      expect(normalPayouts['p1']).toBe(-500);
      expect(threeSpadesPayouts['p1']).toBe(-1000);
      expect(threeSpadesPayouts['p0']).toBe(3000);
    });

    test('Chế độ Truyền Thống: Nhân đôi tiền thắng Nhất từ các người thua', () => {
      const players = createTestPlayers();
      players[0].hand = [];
      players[1].hand = [];
      players[2].hand = [];
      players[3].hand = [];

      const betAmount = 1000;
      const winners = [players[0], players[1], players[2], players[3]];

      const normalPayouts = calculateTraditionalSettlement(players, winners, betAmount, false, false);
      const threeSpadesPayouts = calculateTraditionalSettlement(players, winners, betAmount, false, true);

      expect(normalPayouts['p0']).toBe(3000);
      expect(threeSpadesPayouts['p0']).toBe(6000);
    });
  });

  describe('3. AI Bot Heuristics & Quyết Định Chiến Thuật', () => {
    test('GameFlowRuleStrategy thưởng điểm cực đại (+500) khi lá đơn 3♠ là lá kết liễu', () => {
      const strategy = new GameFlowRuleStrategyBuilder()
        .prohibitEndingWithTwo(true)
        .firstGameRequireThreeOfSpades(true)
        .threeSpadesEndingBonus(true)
        .build();
      const tracker = new CardTracker();
      const rules = new GameRulesBuilder()
        .withGameFlow(f => f.prohibitEndingWithTwo(true).threeSpadesEndingBonus(true))
        .build();

      const move = {
        cards: [card3S],
        combination: { type: 'SINGLE' as const, cards: [card3S], highestCard: card3S, length: 1 },
        isChop: false
      };

      const context: RuleDecisionContext = {
        hand: [card3S],
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { p1: 5, p2: 6, p3: 7 },
        nextPlayerId: 'p1',
        hasPlayedFirstCard: true,
        isNextPlayerOneCard: false,
        prohibitEndingWithTwo: true,
        rules,
        handPartitioningOptimality: 0.8,
        antiLeaderAggression: 0.8,
        tempoControl: 0.5,
        trapTendency: 0.5,
        riskAppetite: 0.5
      };

      // handSize = 1
      const scoreMod = strategy.getLeadScoreModifier(move, 1, context);
      expect(scoreMod).toBe(500);
    });

    test('GameFlowRuleStrategy giữ lại lá 3♠ khi bài có Heo Cơ và thế thắng áp đảo', () => {
      const strategy = new GameFlowRuleStrategyBuilder()
        .prohibitEndingWithTwo(true)
        .firstGameRequireThreeOfSpades(true)
        .threeSpadesEndingBonus(true)
        .build();
      const tracker = new CardTracker();
      const rules = new GameRulesBuilder()
        .withGameFlow(f => f.prohibitEndingWithTwo(true).threeSpadesEndingBonus(true))
        .build();

      const move = {
        cards: [card3S],
        combination: { type: 'SINGLE' as const, cards: [card3S], highestCard: card3S, length: 1 },
        isChop: false
      };

      const context: RuleDecisionContext = {
        hand: [card3S, card2H, card4D], // Có Heo Cơ và bài ít lá
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        tracker,
        remainingPlayerCards: { p1: 5, p2: 6, p3: 7 },
        nextPlayerId: 'p1',
        hasPlayedFirstCard: true,
        isNextPlayerOneCard: false,
        prohibitEndingWithTwo: true,
        rules,
        handPartitioningOptimality: 0.8,
        antiLeaderAggression: 0.8,
        tempoControl: 0.5,
        trapTendency: 0.5,
        riskAppetite: 0.5
      };

      // handSize = 3 (chưa phải kết liễu) -> chiến lược giảm điểm để om 3♠
      const scoreMod = strategy.getLeadScoreModifier(move, 3, context);
      expect(scoreMod).toBe(-120);
    });
  });
});
