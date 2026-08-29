import { describe, expect, it } from 'bun:test';
import {
  OnlinePlayerSchema,
  OnlineRoomStateSchema,
  PlayerActionPacketSchema,
  DealHandPacketSchema,
  TableStateSyncPacketSchema,
  GameEndPacketSchema,
  ChatPacketSchema,
  RematchVotePacketSchema
} from '../../src/engine/network/network.schema';

describe('WebRTC P2P Multiplayer Protocol & Zod Validation Tests', () => {
  it('1. OnlinePlayerSchema: parse và gán default values cho người chơi hợp lệ', () => {
    const player = OnlinePlayerSchema.parse({
      peerId: 'peer_123',
      playerId: 'p0',
      name: 'Cao Thủ Sài Gòn'
    });

    expect(player.peerId).toBe('peer_123');
    expect(player.playerId).toBe('p0');
    expect(player.name).toBe('Cao Thủ Sài Gòn');
    expect(player.avatar).toBe('🤠');
    expect(player.elo).toBe(1000);
    expect(player.coins).toBe(50000);
    expect(player.isHost).toBe(false);
    expect(player.isBot).toBe(false);
  });

  it('2. OnlineRoomStateSchema: parse cấu hình phòng đầy đủ', () => {
    const room = OnlineRoomStateSchema.parse({
      roomCode: 'TL-8899',
      hostPeerId: 'host_peer_001',
      playerCount: 4,
      betAmount: 2000,
      settlementRule: 'COUNT_CARDS',
      players: [
        {
          peerId: 'host_peer_001',
          playerId: 'p0',
          name: 'Chủ Phòng',
          isHost: true
        }
      ],
      updatedAt: Date.now()
    });

    expect(room.roomCode).toBe('TL-8899');
    expect(room.playerCount).toBe(4);
    expect(room.betAmount).toBe(2000);
    expect(room.settlementRule).toBe('COUNT_CARDS');
    expect(room.status).toBe('WAITING');
    expect(room.players.length).toBe(1);
  });

  it('3. PlayerActionPacketSchema: validate hành động Đánh bài & Bỏ lượt', () => {
    const playAct = PlayerActionPacketSchema.safeParse({
      type: 'PLAY',
      playerId: 'p0',
      cardIds: ['c_3_SPADES', 'c_4_DIAMONDS'],
      timestamp: Date.now()
    });
    expect(playAct.success).toBe(true);

    const passAct = PlayerActionPacketSchema.safeParse({
      type: 'PASS',
      playerId: 'p1',
      timestamp: Date.now()
    });
    expect(passAct.success).toBe(true);
  });

  it('4. DealHandPacketSchema: validate gói tin chia 13 lá riêng tư từ Host', () => {
    const cards = Array.from({ length: 13 }, (_, i) => ({
      rank: (i % 13) + 3,
      suit: 'SPADES' as const,
      id: `card_${i}`
    }));

    const deal = DealHandPacketSchema.safeParse({
      cards,
      leadPlayerId: 'p0',
      firstTurnPlayerId: 'p0',
      gameNumber: 1
    });

    expect(deal.success).toBe(true);
    if (deal.success) {
      expect(deal.data.cards.length).toBe(13);
      expect(deal.data.leadPlayerId).toBe('p0');
    }
  });

  it('5. TableStateSyncPacketSchema: validate đồng bộ trạng thái bàn công khai', () => {
    const sync = TableStateSyncPacketSchema.safeParse({
      currentTurnPlayerId: 'p1',
      leadPlayerId: 'p0',
      currentMoveCards: [{ rank: 9, suit: 'HEARTS', id: 'c_9_HEARTS' }],
      currentMovePlayerId: 'p0',
      remainingCardCounts: { p0: 12, p1: 13, p2: 13, p3: 13 },
      winners: [],
      isGameOver: false,
      lastActionMessage: 'Player 0 đã đánh 9♥'
    });

    expect(sync.success).toBe(true);
  });

  it('6. ChatPacketSchema: validate tin nhắn chat & biểu cảm P2P', () => {
    const chat = ChatPacketSchema.safeParse({
      id: 'chat_123',
      senderId: 'p0',
      senderName: 'Vua Bài',
      senderAvatar: '🤠',
      message: 'Coi chừng chặt Heo nhé các bạn!',
      timestamp: Date.now()
    });

    expect(chat.success).toBe(true);
  });

  it('7. RematchVotePacketSchema: validate gói tin bỏ phiếu sẵn sàng / chơi lại ván mới', () => {
    const vote = RematchVotePacketSchema.safeParse({
      playerId: 'p1',
      isReady: true,
      timestamp: Date.now()
    });

    expect(vote.success).toBe(true);
    if (vote.success) {
      expect(vote.data.playerId).toBe('p1');
      expect(vote.data.isReady).toBe(true);
    }
  });
});
