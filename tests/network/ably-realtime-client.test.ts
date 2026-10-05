import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { P2PClient } from '../../src/engine/network/p2p-client';
import {
  type OnlineRoomState,
  type OnlinePlayer,
  type DealHandPacket,
  type TableStateSyncPacket,
  type GameEndPacket,
  createTableSyncPacket,
  createGameEndPacket
} from '../../src/engine/network/network.schema';

describe('Ably Realtime Network Client Unit Tests (P2PClient Adapter)', () => {
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
    expect(client.channel?.name).toBe('tl_room_tl_9999');
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

    const mockSync: TableStateSyncPacket = createTableSyncPacket({
      seq: 1,
      currentTurnPlayerId: 'p0',
      leadPlayerId: 'p0',
      remainingCardCounts: { p0: 13, p1: 13 },
      isFirstMoveOfGame: true,
      isLeadMove: true
    });

    client.emitTableSyncForTest(mockSync, 'host_peer');

    expect(receivedSync).toBeDefined();
    expect(receivedSync?.remainingCardCounts.p0).toBe(13);
  });

  it('8. Lắng nghe và điều phối emitGameEndForTest', () => {
    let receivedEnd: GameEndPacket | undefined;

    client.onGameEnd((end) => {
      receivedEnd = end;
    });

    const mockEnd: GameEndPacket = createGameEndPacket({
      winners: ['p0'],
      payouts: { p0: 10000, p1: -10000 },
      playerScores: { p0: 60000, p1: 40000 },
      eloDeltas: { p0: 25, p1: -25 }
    });

    client.emitGameEndForTest(mockEnd, 'host_peer');

    expect(receivedEnd).toBeDefined();
    expect(receivedEnd?.winners[0]).toBe('p0');
    expect(receivedEnd?.payouts.p0).toBe(10000);
  });

  it('9. Tự động kích hoạt cơ chế Auto-Reconnect khi gặp CHANNEL_ERROR hoặc TIMED_OUT', async () => {
    client.join('TL-RECON');
    expect(client.getReconnectAttemptsForTest()).toBe(0);
    expect(client.getIsReconnectingForTest()).toBe(false);

    // Kích hoạt CHANNEL_ERROR
    await client.handleStatusChangeForTest('CHANNEL_ERROR');
    expect(client.getReconnectAttemptsForTest()).toBe(1);
    expect(client.getIsReconnectingForTest()).toBe(true);

    // Thành công kết nối lại SUBSCRIBED -> reset số lần retry
    await client.handleStatusChangeForTest('SUBSCRIBED');
    expect(client.getReconnectAttemptsForTest()).toBe(0);
    expect(client.getIsReconnectingForTest()).toBe(false);
  });

  it('10. leave() hủy hoàn toàn timer reconnect và reset trạng thái an toàn', async () => {
    client.join('TL-LEAVE');
    await client.handleStatusChangeForTest('TIMED_OUT');
    expect(client.getIsReconnectingForTest()).toBe(true);

    client.leave();
    expect(client.getIsReconnectingForTest()).toBe(false);
    expect(client.getReconnectAttemptsForTest()).toBe(0);
  });

  it('11. pingPeer(): Trả về WebSocket RTT chuẩn hoặc fallback an toàn 30ms', async () => {
    const { getAblyClient } = await import('../../src/config/ably');
    const ably = getAblyClient();

    // 1. Khi chưa kết nối / offline -> fallback 30ms
    const originalState = ably.connection.state;
    Object.defineProperty(ably.connection, 'state', { value: 'initialized', configurable: true });
    const fallbackPing = await client.pingPeer();
    expect(fallbackPing).toBe(30);

    // 2. Khi đang kết nối -> đo RTT qua ably.connection.ping()
    Object.defineProperty(ably.connection, 'state', { value: 'connected', configurable: true });
    const originalPing = ably.connection.ping;
    ably.connection.ping = async () => 42.6;

    const realPing = await client.pingPeer();
    expect(realPing).toBe(43);

    // 3. Khi ping() ném ngoại lệ -> an toàn fallback 30ms
    ably.connection.ping = async () => {
      throw new Error('Timeout');
    };
    const errorPing = await client.pingPeer();
    expect(errorPing).toBe(30);

    // Dọn dẹp
    ably.connection.ping = originalPing;
    Object.defineProperty(ably.connection, 'state', { value: originalState, configurable: true });
  });

  it('12. Kênh đã ở trạng thái attached: Kích hoạt ngay lập tức onAttached', () => {
    const { getAblyClient } = require('../../src/config/ably');
    const ably = getAblyClient();
    const channel = ably.channels.get('tl_room_tl_attached_test');
    channel.presence.get = async () => [];
    Object.defineProperty(channel, 'state', { value: 'attached', configurable: true });

    client.join('TL-ATTACHED-TEST');
    expect(client['isSubscribed']).toBe(true);

    Object.defineProperty(channel, 'state', { value: 'initialized', configurable: true });
  });

  it('13. Boundary Validation & Filtering trong listen(): Lọc đúng targetPeerId và schema Zod', () => {
    client.join('TL-LISTEN-FILTER');
    const channel = client.channel;
    expect(channel).not.toBeNull();
    if (!channel) return;

    let receivedCount = 0;
    let lastReceivedMessage = '';

    client.onChat((chat) => {
      receivedCount++;
      lastReceivedMessage = chat.message;
    });

    const validChat = {
      id: 'msg_1',
      senderId: 'user_1',
      senderName: 'Player 1',
      senderAvatar: '🤠',
      message: 'Xin chào',
      timestamp: Date.now()
    };

    const subscriptions = (channel as unknown as { subscriptions: { emit: (event: string, msg: unknown) => void } }).subscriptions;

    // 1. Gói tin target đích danh cho peer khác -> Phải bị bỏ qua
    subscriptions.emit('chat', {
      data: {
        event: 'chat',
        senderPeerId: 'peer_other',
        targetPeerId: 'peer_someone_else',
        data: validChat
      }
    });
    expect(receivedCount).toBe(0);

    // 2. Gói tin sai schema Zod (thiếu message và timestamp) -> Bỏ qua an toàn không crash
    subscriptions.emit('chat', {
      data: {
        event: 'chat',
        senderPeerId: 'peer_other',
        data: { id: 'invalid_msg' }
      }
    });
    expect(receivedCount).toBe(0);

    // 3. Gói tin hợp lệ gửi đích danh cho mình -> Tiếp nhận thành công
    subscriptions.emit('chat', {
      data: {
        event: 'chat',
        senderPeerId: 'peer_other',
        targetPeerId: client.selfPeerId,
        data: validChat
      }
    });
    expect(receivedCount).toBe(1);
    expect(lastReceivedMessage).toBe('Xin chào');

    // 4. Gói tin hợp lệ broadcast (không có targetPeerId) -> Tiếp nhận thành công
    subscriptions.emit('chat', {
      data: {
        event: 'chat',
        senderPeerId: 'peer_other',
        data: { ...validChat, message: 'Broadcast tới phòng' }
      }
    });
    expect(receivedCount).toBe(2);
    expect(lastReceivedMessage).toBe('Broadcast tới phòng');
  });

  it('14. Handlers Set snapshot iteration: Cho phép callback tự unregister an toàn trong lúc dispatch', () => {
    let unregisterSecond: (() => void) | null = null;
    const executionOrder: string[] = [];

    client.onChat(() => {
      executionOrder.push('first');
      if (unregisterSecond) {
        unregisterSecond();
      }
    });

    unregisterSecond = client.onChat(() => {
      executionOrder.push('second');
    });

    client.onChat(() => {
      executionOrder.push('third');
    });

    const validChat = {
      id: 'msg_snap',
      senderId: 'user_1',
      senderName: 'Player 1',
      senderAvatar: '🤠',
      message: 'Snapshot test',
      timestamp: Date.now()
    };

    client.join('TL-SNAP');
    const channel = client.channel;
    const subscriptions = (channel as unknown as { subscriptions: { emit: (event: string, msg: unknown) => void } }).subscriptions;

    // Lần 1: Kích hoạt, unregisterSecond được gọi nhưng vòng lặp snapshot [...set] vẫn an toàn
    subscriptions.emit('chat', {
      data: {
        event: 'chat',
        senderPeerId: 'peer_test',
        data: validChat
      }
    });

    expect(executionOrder).toContain('first');
    expect(executionOrder).toContain('third');

    // Lần 2: Callback 2 đã bị unregister hoàn toàn, chỉ còn 1 và 3 chạy
    executionOrder.length = 0;
    subscriptions.emit('chat', {
      data: {
        event: 'chat',
        senderPeerId: 'peer_test',
        data: validChat
      }
    });

    expect(executionOrder).toEqual(['first', 'third']);
  });

  it('15. Cấu hình Ably Realtime: Tắt echoMessages để tránh tự nhận lại tin broadcast của chính mình', () => {
    const { getAblyClient } = require('../../src/config/ably');
    const ably = getAblyClient();
    expect(ably).toBeDefined();
    expect(ably.options.echoMessages).toBe(false);
  });
});
