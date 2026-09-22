import { describe, it, expect } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createDefaultGameRules } from '../../src/engine/types';
import type { HostToClientPacket } from '../../src/engine/transport/transport.interface';
import { OnlinePlayerSchema, TableStateSyncPacketSchema } from '../../src/engine/network/network.schema';

describe('Online Multiplayer Grace Period & Reconnect Architecture', () => {
  const p1Id = 'HOST_PLAYER';
  const p2Id = 'GUEST_PLAYER';

  const mockPlayers = [
    {
      id: p1Id,
      name: 'Chủ Phòng',
      avatar: 'host.png',
      hand: [],
      cardCount: 0,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: false as const
    },
    {
      id: p2Id,
      name: 'Khách Chơi',
      avatar: 'guest.png',
      hand: [],
      cardCount: 0,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: false as const
    }
  ];

  it('validates OnlinePlayerSchema and TableStateSyncPacketSchema with reconnect fields', () => {
    const validOnlinePlayer = OnlinePlayerSchema.parse({
      peerId: 'peer-123',
      playerId: 'player-123',
      isDisconnected: true,
      disconnectDeadline: Date.now() + 25000
    });
    expect(validOnlinePlayer.isDisconnected).toBe(true);
    expect(validOnlinePlayer.disconnectDeadline).toBeGreaterThan(0);

    const validSyncPacket = TableStateSyncPacketSchema.parse({
      seq: 1,
      currentTurnPlayerId: p1Id,
      leadPlayerId: p1Id,
      remainingCardCounts: { [p1Id]: 13, [p2Id]: 13 },
      playerScores: { [p1Id]: 50000, [p2Id]: 50000 },
      winners: [],
      isGameOver: false,
      reconnectNotice: {
        playerId: p2Id,
        playerName: 'Khách Chơi',
        deadline: Date.now() + 25000
      }
    });
    expect(validSyncPacket.reconnectNotice?.playerId).toBe(p2Id);
    expect(validSyncPacket.reconnectNotice?.playerName).toBe('Khách Chơi');
  });

  it('triggers grace period on peer disconnect, broadcasts reconnectNotice and restores private hand upon reconnect', () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true },
      instantWin: {
        enabled: false
      }
    });

    const host = new AuthoritativeMatchHost({
      rules,
      players: mockPlayers,
      hostPlayerId: p1Id,
      instantDelay: true
    });

    const p1Transports = createMemoryDuplexTransport('HOST', p1Id);
    const p2Transports = createMemoryDuplexTransport('HOST', p2Id);

    host.registerClient(p1Id, p1Transports.hostTransport);
    host.registerClient(p2Id, p2Transports.hostTransport);

    const p1ReceivedPackets: HostToClientPacket[] = [];
    p1Transports.clientTransport.onMessage(msg => p1ReceivedPackets.push(msg));

    host.startMatch(1);

    // Người chơi P2 có bài trên tay
    const p2InEngine = host.engine.getPlayer(p2Id)!;
    expect(p2InEngine.hand.length).toBeGreaterThan(0);
    const originalP2HandIds = p2InEngine.hand.map(c => c.id);

    // 1. P2 bị mất kết nối (F5 / rớt mạng)
    let expiredCalled = false;
    host.handlePeerDisconnect(p2Id, 'p2-peer-old', 25000, () => {
      expiredCalled = true;
    });

    expect(host.isPlayerDisconnected(p2Id)).toBe(true);
    const notice = host.getDisconnectedPlayerNotice(p2Id);
    expect(notice?.name).toBe('Khách Chơi');
    expect(notice?.deadline).toBeGreaterThan(Date.now());

    // Host phát sóng TableStateSyncPacket có kèm reconnectNotice
    const latestSync = p1ReceivedPackets.filter(p => p.type === 'TABLE_SYNC').pop();
    expect(latestSync).toBeDefined();
    if (latestSync && latestSync.type === 'TABLE_SYNC') {
      expect(latestSync.packet.reconnectNotice?.playerId).toBe(p2Id);
      expect(latestSync.packet.reconnectNotice?.playerName).toBe('Khách Chơi');
    }

    // 2. P2 kết nối lại thành công trước khi hết hạn 25s
    const p2NewTransports = createMemoryDuplexTransport('HOST', p2Id);
    const p2NewPackets: HostToClientPacket[] = [];
    p2NewTransports.clientTransport.onMessage(msg => p2NewPackets.push(msg));

    const reconnectSuccess = host.handlePlayerReconnect(p2Id, p2NewTransports.hostTransport);
    expect(reconnectSuccess).toBe(true);
    expect(host.isPlayerDisconnected(p2Id)).toBe(false);

    // Khách nhận lại gói DEAL_HAND phục hồi nguyên vẹn bài riêng
    const restoredDealHand = p2NewPackets.find(p => p.type === 'DEAL_HAND');
    expect(restoredDealHand).toBeDefined();
    if (restoredDealHand && restoredDealHand.type === 'DEAL_HAND') {
      expect(restoredDealHand.packet.playerId).toBe(p2Id);
      expect(restoredDealHand.packet.cards.map(c => c.id)).toEqual(originalP2HandIds);
    }

    // Sau khi reconnect, reconnectNotice trong TableStateSync được gỡ bỏ
    const p1AfterReconnectSync = p1ReceivedPackets.filter(p => p.type === 'TABLE_SYNC').pop();
    if (p1AfterReconnectSync && p1AfterReconnectSync.type === 'TABLE_SYNC') {
      expect(p1AfterReconnectSync.packet.reconnectNotice).toBeNull();
    }

    expect(expiredCalled).toBe(false);
    host.dispose();
  });

  it('calls onExpired callback when grace period expires without reconnect', async () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true },
      instantWin: {
        enabled: false
      }
    });

    const host = new AuthoritativeMatchHost({
      rules,
      players: mockPlayers,
      hostPlayerId: p1Id,
      instantDelay: true
    });

    const p1Transports = createMemoryDuplexTransport('HOST', p1Id);
    host.registerClient(p1Id, p1Transports.hostTransport);
    host.startMatch(1);

    let expiredCalled = false;
    // Đặt grace period ngắn 50ms cho test
    host.handlePeerDisconnect(p2Id, 'p2-peer', 50, () => {
      expiredCalled = true;
    });

    expect(host.isPlayerDisconnected(p2Id)).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 80));

    expect(expiredCalled).toBe(true);
    expect(host.isPlayerDisconnected(p2Id)).toBe(false);

    host.dispose();
  });
});
