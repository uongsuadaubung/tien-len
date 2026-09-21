import type {
  IClientTransport,
  IHostPeerTransport,
  ClientToHostPacket,
  HostToClientPacket,
  MessageHandler
} from './transport.interface';
import type { P2PClient } from '../network/p2p-client';

/**
 * P2PHostPeerTransport
 * Cầu nối Supabase Realtime cho Host liên lạc với một Guest từ xa (Remote Peer).
 */
export class P2PHostPeerTransport implements IHostPeerTransport {
  public readonly peerId: string;
  public readonly targetPlayerId: string;
  public isConnected: boolean = true;

  private readonly p2pClient: P2PClient;
  private readonly listeners: Set<MessageHandler<ClientToHostPacket>> = new Set();
  private unsubs: Array<() => void> = [];

  constructor(p2pClient: P2PClient, peerId: string, targetPlayerId: string = peerId) {
    this.p2pClient = p2pClient;
    this.peerId = peerId;
    this.targetPlayerId = targetPlayerId;

    const unsubAction = this.p2pClient.onPlayerAction((data, fromPeer) => {
      if (!this.isConnected) return;
      const match = (fromPeer === this.peerId || data.playerId === this.targetPlayerId);
      if (match) {
        const packet: ClientToHostPacket = {
          type: 'PLAYER_ACTION',
          packet: data
        };
        for (const listener of this.listeners) {
          listener(packet);
        }
      }
    });
    this.unsubs.push(unsubAction);

    if (typeof this.p2pClient.onRematchVote === 'function') {
      const unsubRematch = this.p2pClient.onRematchVote((data, fromPeer) => {
        if (!this.isConnected) return;
        const match = (fromPeer === this.peerId || data.playerId === this.targetPlayerId);
        if (match) {
          const packet: ClientToHostPacket = {
            type: 'REMATCH_VOTE',
            packet: data
          };
          for (const listener of this.listeners) {
            listener(packet);
          }
        }
      });
      this.unsubs.push(unsubRematch);
    }

    const unsubLeave = this.p2pClient.onPeerLeave(leftPeerId => {
      if (leftPeerId === this.peerId) {
        this.disconnect();
      }
    });
    this.unsubs.push(unsubLeave);
  }

  public send(packet: HostToClientPacket): void {
    if (!this.isConnected) return;

    if (packet.type === 'DEAL_HAND') {
      void this.p2pClient.sendPrivateDealHand(packet.packet, this.peerId);
    } else if (packet.type === 'TABLE_SYNC') {
      void this.p2pClient.broadcastTableSync(packet.packet);
    } else if (packet.type === 'GAME_END') {
      void this.p2pClient.broadcastGameEnd(packet.packet);
    }
  }

  public onMessage(handler: MessageHandler<ClientToHostPacket>): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public disconnect(): void {
    this.isConnected = false;
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
    this.listeners.clear();
  }
}

/**
 * P2PClientTransport
 * Cầu nối Supabase Realtime cho Guest liên lạc với Host từ xa.
 */
export class P2PClientTransport implements IClientTransport {
  public isConnected: boolean = true;

  private readonly p2pClient: P2PClient;
  private readonly hostPeerId: string;
  private readonly listeners: Set<MessageHandler<HostToClientPacket>> = new Set();
  private unsubs: Array<() => void> = [];

  constructor(p2pClient: P2PClient, hostPeerId: string) {
    this.p2pClient = p2pClient;
    this.hostPeerId = hostPeerId;

    const unsubDeal = this.p2pClient.onDealHand(data => {
      if (!this.isConnected) return;
      this.emitToListeners({ type: 'DEAL_HAND', packet: data });
    });
    this.unsubs.push(unsubDeal);

    const unsubSync = this.p2pClient.onTableSync(data => {
      if (!this.isConnected) return;
      this.emitToListeners({ type: 'TABLE_SYNC', packet: data });
    });
    this.unsubs.push(unsubSync);

    const unsubEnd = this.p2pClient.onGameEnd(data => {
      if (!this.isConnected) return;
      this.emitToListeners({ type: 'GAME_END', packet: data });
    });
    this.unsubs.push(unsubEnd);

    const unsubLeave = this.p2pClient.onPeerLeave(leftPeerId => {
      if (leftPeerId === this.hostPeerId) {
        this.disconnect();
      }
    });
    this.unsubs.push(unsubLeave);
  }

  private emitToListeners(packet: HostToClientPacket): void {
    for (const listener of this.listeners) {
      listener(packet, this.hostPeerId);
    }
  }

  public send(packet: ClientToHostPacket): void {
    if (!this.isConnected) return;
    if (packet.type === 'PLAYER_ACTION') {
      void this.p2pClient.sendPlayerAction(packet.packet);
    } else if (packet.type === 'REMATCH_VOTE') {
      void this.p2pClient.sendRematchVote(packet.packet);
    }
  }

  public onMessage(handler: MessageHandler<HostToClientPacket>): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public disconnect(): void {
    this.isConnected = false;
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
    this.listeners.clear();
  }
}
