import { describe, expect, it } from 'bun:test';
import {
  assertValidMatchStartup,
  assertValidSnapshot,
  assertEconomicBalance,
  InvariantViolationError
} from '../../src/engine/invariants/match-invariants';
import type { MatchSnapshot } from '../../src/engine/offline-match-driver';

describe('State Invariants & Runtime Assertions (Kiểm Thử Chốt Chặn Toàn Vẹn)', () => {
  describe('1. Chốt chặn 1: assertValidMatchStartup', () => {
    it('Phải ném InvariantViolationError khi mức cược <= 0', () => {
      expect(() => {
        assertValidMatchStartup({
          gameNumber: 1,
          betAmount: 0,
          playerCoins: 50000,
          playerCount: 4,
          activeGameType: null
        });
      }).toThrow(InvariantViolationError);

      expect(() => {
        assertValidMatchStartup({
          gameNumber: 1,
          betAmount: -100,
          playerCoins: 50000,
          playerCount: 4,
          activeGameType: null
        });
      }).toThrow(InvariantViolationError);
    });

    it('Phải ném InvariantViolationError khi số dư không đủ mức cược (chế độ thường)', () => {
      expect(() => {
        assertValidMatchStartup({
          gameNumber: 1,
          betAmount: 1000,
          playerCoins: 500,
          playerCount: 4,
          activeGameType: 'QUICK'
        });
      }).toThrow(InvariantViolationError);
    });

    it('Cho phép số dư nhỏ hơn mức cược nếu là chế độ CAMPAIGN (chơi theo cốt truyện miễn phí)', () => {
      expect(() => {
        assertValidMatchStartup({
          gameNumber: 1,
          betAmount: 1000,
          playerCoins: 0,
          playerCount: 4,
          activeGameType: 'CAMPAIGN'
        });
      }).not.toThrow();
    });

    it('Phải ném InvariantViolationError khi số người chơi ngoài khoảng [2, 4]', () => {
      expect(() => {
        assertValidMatchStartup({
          gameNumber: 1,
          betAmount: 100,
          playerCoins: 50000,
          playerCount: 1,
          activeGameType: null
        });
      }).toThrow(InvariantViolationError);

      expect(() => {
        assertValidMatchStartup({
          gameNumber: 1,
          betAmount: 100,
          playerCoins: 50000,
          playerCount: 5,
          activeGameType: null
        });
      }).toThrow(InvariantViolationError);
    });

    it('Vượt qua kiểm tra an toàn khi các tham số hợp lệ', () => {
      expect(() => {
        assertValidMatchStartup({
          gameNumber: 1,
          betAmount: 1000,
          playerCoins: 50000,
          playerCount: 4,
          activeGameType: 'QUICK'
        });
      }).not.toThrow();
    });
  });

  describe('2. Chốt chặn 2: assertValidSnapshot', () => {
    const createBaseSnapshot = (): MatchSnapshot => ({
      gameNumber: 1,
      players: [
        { id: 'p0', name: 'User', avatar: '😎', hand: [], playedCards: [], isPassedCurrentRound: false, hasPlayedFirstCard: false, score: 0, isBot: false, rankPosition: null, instantWinType: null },
        { id: 'p1', name: 'Bot 1', avatar: '🤖', hand: [], playedCards: [], isPassedCurrentRound: false, hasPlayedFirstCard: false, score: 0, isBot: true, botPersonaId: 'BOT_ELO_850', rankPosition: null, instantWinType: null },
        { id: 'p2', name: 'Bot 2', avatar: '🦊', hand: [], playedCards: [], isPassedCurrentRound: false, hasPlayedFirstCard: false, score: 0, isBot: true, botPersonaId: 'BOT_ELO_1150', rankPosition: null, instantWinType: null },
        { id: 'p3', name: 'Bot 3', avatar: '🦁', hand: [], playedCards: [], isPassedCurrentRound: false, hasPlayedFirstCard: false, score: 0, isBot: true, botPersonaId: 'BOT_ELO_1450', rankPosition: null, instantWinType: null }
      ],
      currentTurnPlayerId: 'p0',
      leadPlayerId: 'p0',
      currentMove: null,
      winners: [],
      isGameOver: false,
      instantWinType: null,
      isDealing: false,
      dealtCounts: { p0: 13, p1: 13, p2: 13, p3: 13 },
      dealBanner: null,
      chopNotification: null,
      botThinkingThought: null,
      isFirstMoveOfGame: true,
      isLeadMove: true
    });

    it('Phải ném lỗi khi Snapshot có instantWinType nhưng isGameOver=false hoặc winners rỗng', () => {
      const snap = createBaseSnapshot();
      snap.instantWinType = 'DRAGON_STRAIGHT';
      snap.isGameOver = false; // Lỗi: có tới trắng mà chưa kết thúc ván
      snap.winners = [];

      expect(() => assertValidSnapshot(snap)).toThrow(InvariantViolationError);
    });

    it('Phải ném lỗi khi isGameOver=true nhưng không có người chiến thắng (winners rỗng)', () => {
      const snap = createBaseSnapshot();
      snap.isGameOver = true;
      snap.winners = []; // Lỗi: hết ván mà không ai thắng

      expect(() => assertValidSnapshot(snap)).toThrow(InvariantViolationError);
    });

    it('Phải ném lỗi khi người chơi có số lá bài > 13', () => {
      const snap = createBaseSnapshot();
      snap.players[0].hand = new Array(14).fill({ id: 'c1', rank: 3, suit: 'SPADES', weight: 3 });

      expect(() => assertValidSnapshot(snap)).toThrow(InvariantViolationError);
    });

    it('Vượt qua kiểm tra an toàn khi Snapshot hợp lệ', () => {
      const snap = createBaseSnapshot();
      expect(() => assertValidSnapshot(snap)).not.toThrow();
    });
  });

  describe('3. Chốt chặn 3: assertEconomicBalance', () => {
    it('Phải ném lỗi khi dòng tiền không cân bằng (tổng chênh lệch > 1 Xu)', () => {
      const unbalancedPayouts = {
        p0: 10000,
        p1: -3000,
        p2: -2000,
        p3: -1000 // Tổng = +4000 Xu (tiền tự sinh ra vô căn cứ)
      };

      expect(() => assertEconomicBalance(unbalancedPayouts)).toThrow(InvariantViolationError);
    });

    it('Vượt qua kiểm tra an toàn khi tổng tiền thắng bằng tổng tiền thua (tổng = 0)', () => {
      const balancedPayouts = {
        p0: 6000,
        p1: -3000,
        p2: -2000,
        p3: -1000
      };

      expect(() => assertEconomicBalance(balancedPayouts)).not.toThrow();
    });
  });
});
