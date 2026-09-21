import { describe, it, expect } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { ClientSession } from '../../src/engine/presentation/client-session';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { P2PHostPeerTransport, P2PClientTransport } from '../../src/engine/transport/p2p-transport';
import { createDefaultGameRules } from '../../src/engine/types';
import type { MatchPlayer } from '../../src/engine/types';
import type { DealHandPacket, PlayerActionPacket, TableStateSyncPacket, GameEndPacket } from '../../src/engine/network/network.schema';

class MockP2PNetwork {
  private hostHandlers = {
    playerAction: [] as Array<(p: PlayerActionPacket, fromPeer: string) => void>,
    peerLeave: [] as Array<(peerId: string) => void>
  };

  private guestHandlers = {
    dealHand: [] as Array<(p: DealHandPacket, fromPeer: string) => void>,
    tableSync: [] as Array<(p: TableStateSyncPacket, fromPeer: string) => void>,
    gameEnd: [] as Array<(p: GameEndPacket, fromPeer: string) => void>,
    peerLeave: [] as Array<(peerId: string) => void>
  };

  public createHostP2PClient() {
    return {
      selfPeerId: 'PEER_HOST',
      onPlayerAction: (cb: any) => {
        this.hostHandlers.playerAction.push(cb);
        return () => { this.hostHandlers.playerAction = this.hostHandlers.playerAction.filter(c => c !== cb); };
      },
      onPeerLeave: (cb: any) => {
        this.hostHandlers.peerLeave.push(cb);
        return () => { this.hostHandlers.peerLeave = this.hostHandlers.peerLeave.filter(c => c !== cb); };
      },
      sendPrivateDealHand: async (packet: DealHandPacket, targetPeerId: string) => {
        if (targetPeerId === 'PEER_GUEST') {
          this.guestHandlers.dealHand.forEach(cb => cb(packet, 'PEER_HOST'));
        }
      },
      broadcastTableSync: async (packet: TableStateSyncPacket) => {
        this.guestHandlers.tableSync.forEach(cb => cb(packet, 'PEER_HOST'));
      },
      broadcastGameEnd: async (packet: GameEndPacket) => {
        this.guestHandlers.gameEnd.forEach(cb => cb(packet, 'PEER_HOST'));
      }
    };
  }

  public createGuestP2PClient() {
    return {
      selfPeerId: 'PEER_GUEST',
      onDealHand: (cb: any) => {
        this.guestHandlers.dealHand.push(cb);
        return () => { this.guestHandlers.dealHand = this.guestHandlers.dealHand.filter(c => c !== cb); };
      },
      onTableSync: (cb: any) => {
        this.guestHandlers.tableSync.push(cb);
        return () => { this.guestHandlers.tableSync = this.guestHandlers.tableSync.filter(c => c !== cb); };
      },
      onGameEnd: (cb: any) => {
        this.guestHandlers.gameEnd.push(cb);
        return () => { this.guestHandlers.gameEnd = this.guestHandlers.gameEnd.filter(c => c !== cb); };
      },
      onPeerLeave: (cb: any) => {
        this.guestHandlers.peerLeave.push(cb);
        return () => { this.guestHandlers.peerLeave = this.guestHandlers.peerLeave.filter(c => c !== cb); };
      },
      sendPlayerAction: async (packet: PlayerActionPacket) => {
        this.hostHandlers.playerAction.forEach(cb => cb(packet, 'PEER_GUEST'));
      }
    };
  }
}

describe('Online Match via Unified Listen Server Architecture', () => {
  it('should run a 1v1 Online match between Host (Local Memory Transport) and Guest (Remote P2P Transport)', async () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 2000, soundEnabled: true }
    });

    const hostPlayerId = 'PLAYER_HOST';
    const guestPlayerId = 'PLAYER_GUEST';

    const players: MatchPlayer[] = [
      {
        id: hostPlayerId,
        name: 'Chủ Phòng Host',
        avatar: 'host.png',
        hand: [],
        cardCount: 0,
        playedCards: [],
        score: 50000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        isBot: false
      },
      {
        id: guestPlayerId,
        name: 'Khách Online',
        avatar: 'guest.png',
        hand: [],
        cardCount: 0,
        playedCards: [],
        score: 50000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        isBot: false
      }
    ];

    // 1. Khởi tạo mạng P2P giả lập
    const network = new MockP2PNetwork();
    const hostP2P = network.createHostP2PClient() as any;
    const guestP2P = network.createGuestP2PClient() as any;

    // 2. Khởi tạo AuthoritativeMatchHost trên máy Host
    const host = new AuthoritativeMatchHost({
      rules,
      players,
      hostPlayerId,
      instantDelay: true,
      enableDealingAnimation: false
    });

    // 3. Nối Host Local Client qua MemoryDuplexTransport
    const hostTransports = createMemoryDuplexTransport('HOST', hostPlayerId);
    host.registerClient(hostPlayerId, hostTransports.hostTransport);

    const hostSession = new ClientSession({
      localPlayerId: hostPlayerId,
      transport: hostTransports.clientTransport,
      gameRules: rules,
      initialPlayers: players,
      activeGameType: 'ONLINE'
    });

    // 4. Nối Remote Guest qua P2PHostPeerTransport (Host bên) và P2PClientTransport (Guest bên)
    const guestPeerTransport = new P2PHostPeerTransport(hostP2P, 'PEER_GUEST', guestPlayerId);
    host.registerClient(guestPlayerId, guestPeerTransport);

    const guestClientTransport = new P2PClientTransport(guestP2P, 'PEER_HOST');
    const guestSession = new ClientSession({
      localPlayerId: guestPlayerId,
      transport: guestClientTransport,
      gameRules: rules,
      initialPlayers: players,
      activeGameType: 'ONLINE'
    });

    // 5. Host bắt đầu trận đấu
    host.startMatch(1);

    // Kiểm tra Fog of War: Host và Guest đều nhận được đúng 13 lá bài của riêng mình
    expect(hostSession.getMyHand()).toHaveLength(13);
    expect(guestSession.getMyHand()).toHaveLength(13);

    // Xác định người có lượt đi đầu
    const initialSync = host.engine.currentRound;
    const firstTurnPlayerId = initialSync.currentTurnPlayerId;
    expect(firstTurnPlayerId).toBeDefined();

    const activeSession = firstTurnPlayerId === hostPlayerId ? hostSession : guestSession;
    const waitingSession = firstTurnPlayerId === hostPlayerId ? guestSession : hostSession;

    // Người có lượt chọn 1 lá bài hợp lệ và đánh
    const firstCard = activeSession.getMyHand()[0];
    activeSession.sendIntent({
      type: 'SET_SELECTED_CARDS',
      cardIds: [firstCard.id]
    });
    activeSession.sendIntent({ type: 'SUBMIT_PLAY' });

    // Host xử lý và broadcast TableSync -> Cả 2 session đều được cập nhật
    expect(host.engine.currentRound.moves).toHaveLength(1);
    expect(host.engine.currentRound.currentTurnPlayerId).toBe(waitingSession.localPlayerId);
    expect(activeSession.getMyHand()).toHaveLength(12);
    expect(waitingSession.getMyHand()).toHaveLength(13);

    // Kiểm tra TableRenderFrame của người đợi: Đã chuyển lượt sang họ và thấy bài vừa đánh ở trung tâm bàn
    const waitingFrame = waitingSession.getLatestFrame();
    expect(waitingFrame.controls.isMyTurn).toBe(true);
    expect(waitingFrame.discardPile?.cards[0].id).toBe(firstCard.id);
    expect(waitingFrame.discardPile?.playedByPlayerId).toBe(activeSession.localPlayerId);

    // Dọn dẹp
    guestSession.dispose();
    hostSession.dispose();
    guestPeerTransport.disconnect();
    guestClientTransport.disconnect();
    host.dispose();
  });
});
