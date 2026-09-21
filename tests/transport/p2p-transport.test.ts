import { describe, it, expect } from 'bun:test';
import { P2PHostPeerTransport, P2PClientTransport } from '../../src/engine/transport/p2p-transport';
import type { DealHandPacket, PlayerActionPacket, TableStateSyncPacket } from '../../src/engine/network/network.schema';
import type { ClientToHostPacket, HostToClientPacket } from '../../src/engine/transport/transport.interface';

class MockP2PClient {
  public dealHandCbs: Array<(data: DealHandPacket, fromPeer: string) => void> = [];
  public playerActionCbs: Array<(data: PlayerActionPacket, fromPeer: string) => void> = [];
  public tableSyncCbs: Array<(data: TableStateSyncPacket, fromPeer: string) => void> = [];
  public gameEndCbs: Array<(data: any, fromPeer: string) => void> = [];
  public peerLeaveCbs: Array<(peerId: string) => void> = [];

  public sentDealHands: Array<{ packet: DealHandPacket; target: string }> = [];
  public sentPlayerActions: Array<PlayerActionPacket> = [];
  public sentTableSyncs: Array<TableStateSyncPacket> = [];

  async sendPrivateDealHand(packet: DealHandPacket, target: string) {
    this.sentDealHands.push({ packet, target });
    this.dealHandCbs.forEach(cb => cb(packet, 'HOST_PEER'));
  }

  async sendPlayerAction(packet: PlayerActionPacket) {
    this.sentPlayerActions.push(packet);
    this.playerActionCbs.forEach(cb => cb(packet, 'GUEST_PEER'));
  }

  async broadcastTableSync(packet: TableStateSyncPacket) {
    this.sentTableSyncs.push(packet);
    this.tableSyncCbs.forEach(cb => cb(packet, 'HOST_PEER'));
  }

  async broadcastGameEnd(packet: any) {
    this.gameEndCbs.forEach(cb => cb(packet, 'HOST_PEER'));
  }

  onDealHand(cb: any) {
    this.dealHandCbs.push(cb);
    return () => { this.dealHandCbs = this.dealHandCbs.filter(c => c !== cb); };
  }

  onPlayerAction(cb: any) {
    this.playerActionCbs.push(cb);
    return () => { this.playerActionCbs = this.playerActionCbs.filter(c => c !== cb); };
  }

  onTableSync(cb: any) {
    this.tableSyncCbs.push(cb);
    return () => { this.tableSyncCbs = this.tableSyncCbs.filter(c => c !== cb); };
  }

  onGameEnd(cb: any) {
    this.gameEndCbs.push(cb);
    return () => { this.gameEndCbs = this.gameEndCbs.filter(c => c !== cb); };
  }

  onPeerLeave(cb: any) {
    this.peerLeaveCbs.push(cb);
    return () => { this.peerLeaveCbs = this.peerLeaveCbs.filter(c => c !== cb); };
  }
}

describe('P2PTransport (WebRTC DataChannel Transport)', () => {
  it('should deliver packets from Host to Client and Client to Host', () => {
    const mockClient = new MockP2PClient() as any;
    const hostPeerTransport = new P2PHostPeerTransport(mockClient, 'GUEST_PEER', 'PLAYER_GUEST');
    const clientTransport = new P2PClientTransport(mockClient, 'HOST_PEER');

    const clientReceived: HostToClientPacket[] = [];
    clientTransport.onMessage(p => clientReceived.push(p));

    const hostReceived: ClientToHostPacket[] = [];
    hostPeerTransport.onMessage(p => hostReceived.push(p));

    // Host sends DealHand
    hostPeerTransport.send({
      type: 'DEAL_HAND',
      packet: {
        playerId: 'PLAYER_GUEST',
        cards: [],
        leadPlayerId: 'PLAYER_GUEST',
        firstTurnPlayerId: 'PLAYER_GUEST',
        gameNumber: 1
      }
    });

    expect(clientReceived).toHaveLength(1);
    expect(clientReceived[0].type).toBe('DEAL_HAND');

    // Client sends PlayerAction
    clientTransport.send({
      type: 'PLAYER_ACTION',
      packet: {
        playerId: 'PLAYER_GUEST',
        type: 'PASS',
        timestamp: Date.now()
      }
    });

    expect(hostReceived).toHaveLength(1);
    expect(hostReceived[0].type).toBe('PLAYER_ACTION');

    hostPeerTransport.disconnect();
    clientTransport.disconnect();
  });
});
