import { describe, test, expect } from 'bun:test';
import { createCard } from '../../src/engine/card';
import { GameEngine } from '../../src/engine/game';
import { Player, createDefaultGameRules } from '../../src/engine/types';
import { ChoppingRuleStrategy } from '../../src/ai/rule-strategies';

describe('Luật Chặt Chồng Tích Lũy (Chop Cascade Multiplier / Sòng Bạc Chuẩn)', () => {
  const card2S = createCard(15, 'SPADES'); // Heo Đen (1x)
  const dummy1 = createCard(3, 'CLUBS');
  const dummy2 = createCard(4, 'CLUBS');
  const dummy3 = createCard(5, 'CLUBS');
  const dummy4 = createCard(6, 'CLUBS');

  // 3 Đôi thông (3-4-5)
  const threePairs = [
    createCard(3, 'SPADES'), createCard(3, 'HEARTS'),
    createCard(4, 'SPADES'), createCard(4, 'HEARTS'),
    createCard(5, 'SPADES'), createCard(5, 'HEARTS')
  ];

  // Tứ Quý 6
  const fourOfAKind = [
    createCard(6, 'SPADES'), createCard(6, 'CLUBS'),
    createCard(6, 'DIAMONDS'), createCard(6, 'HEARTS')
  ];

  // 4 Đôi thông (7-8-9-10)
  const fourPairs = [
    createCard(7, 'SPADES'), createCard(7, 'HEARTS'),
    createCard(8, 'SPADES'), createCard(8, 'HEARTS'),
    createCard(9, 'SPADES'), createCard(9, 'HEARTS'),
    createCard(10, 'SPADES'), createCard(10, 'HEARTS')
  ];

  function createTestPlayers(): Player[] {
    return [
      {
        id: 'p0',
        name: 'Người Chơi A',
        avatar: '🤠',
        isBot: false,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: true
      },
      {
        id: 'p1',
        name: 'Bot B',
        avatar: '🤖',
        isBot: true,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: true
      },
      {
        id: 'p2',
        name: 'Bot C',
        avatar: '🤖',
        isBot: true,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: true
      },
      {
        id: 'p3',
        name: 'Bot D',
        avatar: '🤖',
        isBot: true,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: true
      }
    ];
  }

  describe('1. Vòng Chặt Đơn Lẻ (Single Chop)', () => {
    test('A đánh Heo Đen (2♠), B chặt bằng 3 Đôi Thông: A đền B theo đúng biểu giá', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        chopping: {
          allowFourPairsCutAnytime: true,
          allowThreePairsCutTwo: true,
          allowFourOfAKindCutPairsOfTwos: true,
          multiplier: 1,
          cascadeMultiplier: true
        },
        table: { betAmount: 1000, playerCount: 4, botThinkDelayMs: 0, soundEnabled: false }
      });

      const game = new GameEngine(players, rules);
      game.startNewGame(2, 'p0');

      game.getPlayer('p0')!.hand = [card2S, dummy1];
      game.getPlayer('p1')!.hand = [...threePairs, dummy2];

      // A đánh Heo Đen
      const resA = game.playMove('p0', [card2S]);
      expect(resA.success).toBe(true);
      expect(game.getPlayer('p0')!.score).toBe(10000);

      // B chặt bằng 3 Đôi Thông (Heo Đen = 1000 * 1 = 1000)
      const resB = game.playMove('p1', [...threePairs]);
      expect(resB.success).toBe(true);
      expect(resB.isChop).toBe(true);
      expect(resB.isCascadeChop).toBe(false);
      expect(resB.chopChainCount).toBe(1);

      // A bị trừ 1000, B được cộng 1000
      expect(game.getPlayer('p0')!.score).toBe(9000);
      expect(game.getPlayer('p1')!.score).toBe(11000);
    });
  });

  describe('2. Chặt Chồng Liên Hoàn 2 Cấp (2-Step Cascade Chop)', () => {
    test('A đánh Heo (2♠) -> B chặt bằng 3 Đôi Thông -> C chặt đè bằng Tứ Quý: A được giải thoát, B đền toàn bộ cho C', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        chopping: {
          allowFourPairsCutAnytime: true,
          allowThreePairsCutTwo: true,
          allowFourOfAKindCutPairsOfTwos: true,
          multiplier: 1,
          cascadeMultiplier: true
        },
        table: { betAmount: 1000, playerCount: 4, botThinkDelayMs: 0, soundEnabled: false }
      });

      const game = new GameEngine(players, rules);
      game.startNewGame(2, 'p0');

      game.getPlayer('p0')!.hand = [card2S, dummy1];
      game.getPlayer('p1')!.hand = [...threePairs, dummy2];
      game.getPlayer('p2')!.hand = [...fourOfAKind, dummy3];

      // 1. A đánh Heo Đen
      game.playMove('p0', [card2S]);

      // 2. B chặt Heo (Phạt Heo Đen = 1000)
      game.playMove('p1', [...threePairs]);
      expect(game.getPlayer('p0')!.score).toBe(9000);
      expect(game.getPlayer('p1')!.score).toBe(11000);

      // 3. C chặt đè 3 Đôi Thông bằng Tứ Quý 6 (Phạt Tứ Quý chặt 3 đôi thông = 3000)
      // Tổng hũ tích lũy = 1000 (Heo) + 3000 (Tứ quý) = 4000
      const resC = game.playMove('p2', [...fourOfAKind]);
      expect(resC.success).toBe(true);
      expect(resC.isChop).toBe(true);
      expect(resC.isCascadeChop).toBe(true);
      expect(resC.chopChainCount).toBe(2);
      expect(resC.penaltyAmount).toBe(4000);

      // KẾT QUẢ SÒNG BẠC CHUẨN:
      // A được giải thoát hoàn toàn -> về lại 10000
      expect(game.getPlayer('p0')!.score).toBe(10000);
      // B gánh toàn bộ tổng phạt 4000 -> 10000 - 4000 = 6000
      expect(game.getPlayer('p1')!.score).toBe(6000);
      // C nhận trọn hũ 4000 -> 10000 + 4000 = 14000
      expect(game.getPlayer('p2')!.score).toBe(14000);
    });
  });

  describe('3. Chặt Chồng Liên Hoàn 3 Cấp (3-Step Cascade Chop - Nổ Hũ Khổng Lồ)', () => {
    test('A đánh 2♠ -> B chặt 3 Đôi Thông -> C chặt Tứ Quý -> D chặt 4 Đôi Thông: A & B giải thoát, C đền toàn bộ chuỗi cho D', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        chopping: {
          allowFourPairsCutAnytime: true,
          allowThreePairsCutTwo: true,
          allowFourOfAKindCutPairsOfTwos: true,
          multiplier: 1,
          cascadeMultiplier: true
        },
        table: { betAmount: 1000, playerCount: 4, botThinkDelayMs: 0, soundEnabled: false }
      });

      const game = new GameEngine(players, rules);
      game.startNewGame(2, 'p0');

      game.getPlayer('p0')!.hand = [card2S, dummy1];
      game.getPlayer('p1')!.hand = [...threePairs, dummy2];
      game.getPlayer('p2')!.hand = [...fourOfAKind, dummy3];
      game.getPlayer('p3')!.hand = [...fourPairs, dummy4];

      // 1. A đánh Heo (1000)
      game.playMove('p0', [card2S]);

      // 2. B chặt 3 Đôi Thông (1000)
      game.playMove('p1', [...threePairs]);

      // 3. C chặt Tứ Quý (3000) -> Tích lũy: 4000
      game.playMove('p2', [...fourOfAKind]);

      // 4. D nhảy vào chặt đè 4 Đôi Thông (Phạt 4 đôi thông chặt tứ quý = 4000)
      // Tổng hũ tích lũy = 4000 + 4000 = 8000
      const resD = game.playMove('p3', [...fourPairs]);
      expect(resD.success).toBe(true);
      expect(resD.isChop).toBe(true);
      expect(resD.isCascadeChop).toBe(true);
      expect(resD.chopChainCount).toBe(3);
      expect(resD.penaltyAmount).toBe(8000);

      // A và B đều được giải thoát!
      expect(game.getPlayer('p0')!.score).toBe(10000);
      expect(game.getPlayer('p1')!.score).toBe(10000);
      // C (người bị D đè cuối cùng) chịu toàn bộ 8000 -> 10000 - 8000 = 2000
      expect(game.getPlayer('p2')!.score).toBe(2000);
      // D ôm trọn hũ 8000 -> 10000 + 8000 = 18000
      expect(game.getPlayer('p3')!.score).toBe(18000);
    });
  });

  describe('4. Tắt Luật Chặt Chồng (cascadeMultiplier = false)', () => {
    test('Khi tắt luật chặt chồng, mỗi lần chặt phạt độc lập giữa 2 người, không giải thoát người trước', () => {
      const players = createTestPlayers();
      const rules = createDefaultGameRules({
        chopping: {
          allowFourPairsCutAnytime: true,
          allowThreePairsCutTwo: true,
          allowFourOfAKindCutPairsOfTwos: true,
          multiplier: 1,
          cascadeMultiplier: false // TẮT CHẶT CHỒNG
        },
        table: { betAmount: 1000, playerCount: 4, botThinkDelayMs: 0, soundEnabled: false }
      });

      const game = new GameEngine(players, rules);
      game.startNewGame(2, 'p0');

      game.getPlayer('p0')!.hand = [card2S, dummy1];
      game.getPlayer('p1')!.hand = [...threePairs, dummy2];
      game.getPlayer('p2')!.hand = [...fourOfAKind, dummy3];

      game.playMove('p0', [card2S]);
      game.playMove('p1', [...threePairs]); // A mất 1000, B được 1000
      game.playMove('p2', [...fourOfAKind]); // B mất 3000, C được 3000

      // A vẫn mất 1000 (không được hoàn tiền) -> 9000
      expect(game.getPlayer('p0')!.score).toBe(9000);
      // B được 1000 nhưng mất 3000 -> 10000 + 1000 - 3000 = 8000
      expect(game.getPlayer('p1')!.score).toBe(8000);
      // C được 3000 -> 10000 + 3000 = 13000
      expect(game.getPlayer('p2')!.score).toBe(13000);
    });
  });

  describe('5. Trí Tuệ Bot AI Phản Ứng Với Luật Chặt Chồng', () => {
    test('ChoppingRuleStrategy tăng điểm thưởng cực lớn khi chặt đè thành công (Counter-Chop)', () => {
      const strategy = new ChoppingRuleStrategy(true, 1, true);

      const move = {
        cards: fourOfAKind,
        combination: { type: 'FOUR_OF_A_KIND' as const, cards: fourOfAKind, highestCard: fourOfAKind[3], length: 4 },
        isChop: true
      };

      const targetMove = {
        playerId: 'p1',
        combination: { type: 'THREE_PAIRS_SEQUENTIAL' as const, cards: threePairs, highestCard: threePairs[5], length: 6 },
        timestamp: Date.now(),
        isChop: true
      };

      // targetMove.isChop = true -> Counter chop!
      const bonus = strategy.getRespondingScoreModifier(move, 4, targetMove);
      // 150 + 200 = 350
      expect(bonus).toBeGreaterThanOrEqual(350);
    });
  });
});
