import { describe, it, expect } from 'bun:test';
import {
  createTableStateSyncPacket,
  createTableSyncPacket,
  createGameEndPacket,
  createDealHandPacket,
  createPlayerActionPacket
} from '../../src/engine/network/packet-factory';
import {
  TableStateSyncPacketSchema,
  GameEndPacketSchema,
  DealHandPacketSchema,
  PlayerActionPacketSchema
} from '../../src/engine/network/network.schema';
import { createCard } from '../../src/engine/card';

describe('Network Packet Factory Tests', () => {
  describe('createTableStateSyncPacket & createTableSyncPacket', () => {
    it('1. Khởi tạo TableStateSyncPacket với giá trị mặc định chuẩn xác', () => {
      const packet = createTableStateSyncPacket();

      expect(packet.seq).toBe(0);
      expect(typeof packet.timestamp).toBe('number');
      expect(packet.gameNumber).toBe(1);
      expect(packet.roundNumber).toBe(1);
      expect(packet.isGameOver).toBe(false);
      expect(packet.currentTurnPlayerId).toBeNull();
      expect(packet.leadPlayerId).toBeNull();
      expect(packet.remainingCardCounts).toEqual({});
      expect(packet.passedPlayerIds).toEqual([]);
      expect(packet.winners).toEqual([]);
      expect(packet.isChop).toBe(false);
      expect(packet.isCascadeChop).toBe(false);
      expect(packet.lastWinnerId).toBeNull();
      expect(packet.isFirstMoveOfGame).toBe(false);
      expect(packet.isLeadMove).toBe(true);
      expect(packet.firstMoveRequiredCard).toBeNull();
      expect(packet.isDealing).toBe(false);
      expect(packet.dealBanner).toBeNull();
      expect(packet.dealtCounts).toEqual({});
      expect(packet.turnDeadline).toBeNull();
      expect(packet.openingReason).toBeNull();
      expect(packet.lastAction).toBeNull();
      expect(packet.currentMoveCombinationName).toBeNull();
      expect(packet.seats).toEqual([]);

      // Schema Zod parse phải hợp lệ không ném lỗi
      expect(() => TableStateSyncPacketSchema.parse(packet)).not.toThrow();
    });

    it('2. Override chính xác các trường đặc thù của ván bài', () => {
      const card3S = createCard(3, 'SPADES');
      const packet = createTableSyncPacket({
        seq: 5,
        currentTurnPlayerId: 'BOT_1',
        leadPlayerId: 'BOT_1',
        remainingCardCounts: { BOT_1: 2, HUMAN: 2 },
        isFirstMoveOfGame: true,
        firstMoveRequiredCard: card3S,
        isDealing: false
      });

      expect(packet.seq).toBe(5);
      expect(packet.currentTurnPlayerId).toBe('BOT_1');
      expect(packet.leadPlayerId).toBe('BOT_1');
      expect(packet.isFirstMoveOfGame).toBe(true);
      expect(packet.firstMoveRequiredCard?.id).toBe(card3S.id);
      expect(() => TableStateSyncPacketSchema.parse(packet)).not.toThrow();
    });

    it('5. Override chính xác 5 trường mở rộng (turnDeadline, openingReason, lastAction, combinationName, seats)', () => {
      const deadline = Date.now() + 15000;
      const packet = createTableSyncPacket({
        turnDeadline: deadline,
        openingReason: 'THREE_SPADES',
        lastAction: {
          playerId: 'BOT_1',
          type: 'PLAY',
          summary: 'BOT_1 đánh Sảnh (3 lá)'
        },
        currentMoveCombinationName: 'Sảnh (3 lá)',
        seats: [
          {
            playerId: 'BOT_1',
            name: 'Bé Năm',
            avatar: 'bot1',
            cardCount: 10,
            score: 50000,
            isPassed: false,
            isCurrentTurn: true,
            isBot: true
          }
        ]
      });

      expect(packet.turnDeadline).toBe(deadline);
      expect(packet.openingReason).toBe('THREE_SPADES');
      expect(packet.lastAction?.type).toBe('PLAY');
      expect(packet.lastAction?.summary).toBe('BOT_1 đánh Sảnh (3 lá)');
      expect(packet.currentMoveCombinationName).toBe('Sảnh (3 lá)');
      expect(packet.seats).toHaveLength(1);
      expect(packet.seats?.[0]?.name).toBe('Bé Năm');
      expect(() => TableStateSyncPacketSchema.parse(packet)).not.toThrow();
    });
  });

  describe('createGameEndPacket', () => {
    it('1. Khởi tạo GameEndPacket mặc định và pass Zod Schema', () => {
      const packet = createGameEndPacket();

      expect(packet.winners).toEqual([]);
      expect(packet.payouts).toEqual({});
      expect(packet.eloDeltas).toEqual({});
      expect(packet.playerScores).toEqual({});
      expect(packet.allPlayerHands).toEqual({});
      expect(packet.isThreeSpadesWin).toBe(false);
      expect(packet.instantWinType).toBeNull();
      expect(packet.loanDeduction).toBe(0);

      expect(() => GameEndPacketSchema.parse(packet)).not.toThrow();
    });

    it('2. Tự động suy diễn playerScores từ winners và payouts nếu không truyền', () => {
      const packet = createGameEndPacket({
        winners: ['p0'],
        payouts: { p0: 30000, p1: -10000, p2: -20000 }
      });

      expect(packet.playerScores).toEqual({
        p0: 50000,
        p1: 50000,
        p2: 50000
      });
      expect(() => GameEndPacketSchema.parse(packet)).not.toThrow();
    });

    it('3. Ưu tiên playerScores truyền tường minh', () => {
      const packet = createGameEndPacket({
        winners: ['p0'],
        payouts: { p0: 30000, p1: -30000 },
        playerScores: { p0: 80000, p1: 20000 }
      });

      expect(packet.playerScores).toEqual({ p0: 80000, p1: 20000 });
      expect(() => GameEndPacketSchema.parse(packet)).not.toThrow();
    });
  });

  describe('createDealHandPacket & createPlayerActionPacket', () => {
    it('1. createDealHandPacket trả về gói tin chia bài hợp lệ', () => {
      const cards = [createCard(3, 'SPADES'), createCard(4, 'HEARTS')];
      const packet = createDealHandPacket({
        leadPlayerId: 'p0',
        firstTurnPlayerId: 'p0',
        cards
      });

      expect(packet.cards).toHaveLength(2);
      expect(packet.leadPlayerId).toBe('p0');
      expect(packet.firstTurnPlayerId).toBe('p0');
      expect(packet.lastWinnerId).toBeNull();
      expect(packet.isFirstMoveOfGame).toBe(true);
      expect(packet.isLeadMove).toBe(true);
      expect(() => DealHandPacketSchema.parse(packet)).not.toThrow();
    });

    it('2. createPlayerActionPacket trả về gói tin hành động hợp lệ', () => {
      const packet = createPlayerActionPacket({
        type: 'PLAY',
        playerId: 'p0',
        cardIds: ['3_SPADES']
      });

      expect(packet.type).toBe('PLAY');
      expect(packet.playerId).toBe('p0');
      expect(packet.cardIds).toEqual(['3_SPADES']);
      expect(() => PlayerActionPacketSchema.parse(packet)).not.toThrow();
    });
  });
});
