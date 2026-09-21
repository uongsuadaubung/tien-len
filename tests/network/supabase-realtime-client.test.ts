import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { P2PClient } from '../../src/engine/network/p2p-client';
import {
  type OnlineRoomState,
  type OnlinePlayer,
  type DealHandPacket,
  type TableStateSyncPacket,
  type GameEndPacket
} from '../../src/engine/network/network.schema';

describe('Supabase Realtime Network Client Unit Tests (P2PClient Adapter)', () => {
  let client: P2PClient;

  beforeEach(() => {
    client = new P2PClient();
  });

  afterEach(() => {
    client.leave();
  });

  it('1. Khởi tạo client: sinh selfPeerId duy nhất và trạng thái ban đầu sạch sẽ', () => {
    expect(client.selfPeerId).toBeDefined();
    expect(client.selfPeerId.startsWith('peer_')).toBe(true);
    expect(client.currentRoomCode).toBeNull();
    expect(client.channel).toBeNull();
  });

  it('2. join(roomCode): Chuẩn hóa mã phòng và khởi tạo Realtime Channel', () => {
    client.join('tl-9999');
    expect(client.currentRoomCode).toBe('TL-9999');
    expect(client.channel).not.toBeNull();
    expect(client.channel?.topic).toBe('realtime:tl_room_tl_9999');
  });

  it('3. leave(): Dọn dẹp an toàn channel, activePeers và toàn bộ callbacks', () => {
    client.join('TL-1234');
    let joinCount = 0;
    client.onPeerJoin(() => {
      joinCount++;
    });

    client.leave();
    expect(client.currentRoomCode).toBeNull();
    expect(client.channel).toBeNull();

    // Thử gọi join lại để kiểm tra callback cũ đã được xóa sạch
    client.join('TL-5678');
    expect(joinCount).toBe(0);
  });

  it('4. Lắng nghe và điều phối emitRoomStateForTest', () => {
    let receivedState: OnlineRoomState | undefined;
    let senderId: string | undefined;

    client.onRoomState((state, peerId) => {
      receivedState = state;
      senderId = peerId;
    });

    const mockState: OnlineRoomState = {
      roomCode: 'TL-1111',
      hostPeerId: 'host_peer',
      playerCount: 4,
      betAmount: 1000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: 1,
      congMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      players: [],
      status: 'WAITING',
      disbandReason: null,
      isPublic: true,
      updatedAt: Date.now()
    };

    client.emitRoomStateForTest(mockState, 'host_peer');

    expect(receivedState).toBeDefined();
    expect(receivedState?.roomCode).toBe('TL-1111');
    expect(senderId).toBe('host_peer');
  });

  it('5. Lắng nghe và điều phối emitJoinRequestForTest', () => {
    let receivedPlayer: OnlinePlayer | undefined;
    let senderId: string | undefined;

    client.onJoinRequest((player, peerId) => {
      receivedPlayer = player;
      senderId = peerId;
    });

    const mockPlayer: OnlinePlayer = {
      peerId: 'guest_peer_123',
      playerId: 'p1',
      name: 'Khách Đấu',
      avatar: '🤠',
      elo: 1200,
      coins: 60000,
      isHost: false,
      isReady: true,
      isBot: false
    };

    client.emitJoinRequestForTest(mockPlayer, 'guest_peer_123');

    expect(receivedPlayer).toBeDefined();
    expect(receivedPlayer?.playerId).toBe('p1');
    expect(senderId).toBe('guest_peer_123');
  });

  it('6. Lắng nghe và điều phối emitDealHandForTest', () => {
    let receivedPacket: DealHandPacket | undefined;

    client.onDealHand((packet) => {
      receivedPacket = packet;
    });

    const mockDeal: DealHandPacket = {
      playerId: 'p1',
      cards: [{ rank: 3, suit: 'SPADES', id: '3S' }],
      leadPlayerId: 'p1',
      firstTurnPlayerId: 'p1',
      gameNumber: 1,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: null,
      isLeadMove: true
    };

    client.emitDealHandForTest(mockDeal, 'host_peer');

    expect(receivedPacket).toBeDefined();
    expect(receivedPacket?.gameNumber).toBe(1);
    expect(receivedPacket?.cards.length).toBe(1);
  });

  it('7. Lắng nghe và điều phối emitTableSyncForTest', () => {
    let receivedSync: TableStateSyncPacket | undefined;

    client.onTableSync((sync) => {
      receivedSync = sync;
    });

    const mockSync: TableStateSyncPacket = {
      seq: 1,
      timestamp: Date.now(),
      gameNumber: 1,
      roundNumber: 1,
      currentTurnPlayerId: 'p0',
      leadPlayerId: 'p0',
      remainingCardCounts: { p0: 13, p1: 13 },
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: null,
      isLeadMove: true,
      isChop: false,
      isCascadeChop: false,
      passedPlayerIds: [],
      winners: [],
      isGameOver: false
    };

    client.emitTableSyncForTest(mockSync, 'host_peer');

    expect(receivedSync).toBeDefined();
    expect(receivedSync?.remainingCardCounts.p0).toBe(13);
  });

  it('8. Lắng nghe và điều phối emitGameEndForTest', () => {
    let receivedEnd: GameEndPacket | undefined;

    client.onGameEnd((end) => {
      receivedEnd = end;
    });

    const mockEnd: GameEndPacket = {
      winners: ['p0'],
      payouts: { p0: 10000, p1: -10000 },
      eloDeltas: { p0: 25, p1: -25 },
      allPlayerHands: {},
      isThreeSpadesWin: false,
      instantWinType: null,
      loanDeduction: 0
    };

    client.emitGameEndForTest(mockEnd, 'host_peer');

    expect(receivedEnd).toBeDefined();
    expect(receivedEnd?.winners[0]).toBe('p0');
    expect(receivedEnd?.payouts.p0).toBe(10000);
  });
});
