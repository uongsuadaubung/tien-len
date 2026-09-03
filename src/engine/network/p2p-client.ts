import { joinRoom, selfId } from 'trystero';
import {
  type OnlineRoomState,
  type PlayerActionPacket,
  type DealHandPacket,
  type TableStateSyncPacket,
  type GameEndPacket,
  type ChatPacket,
  type OnlinePlayer,
  type RematchVotePacket
} from './network.schema';

export const APP_ID = 'tien-len-online-p2p-v1';

export const PUBLIC_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

export type MessageHandler<T> = (data: T, peerId: string) => void;

export class P2PClient {
  public room: ReturnType<typeof joinRoom> | null = null;
  public selfPeerId: string = selfId || `peer_${Date.now()}`;
  public currentRoomCode: string | null = null;

  // Action senders
  private sendRoomStateAction?: (data: OnlineRoomState, target?: string | string[]) => Promise<void>;
  private sendDealHandAction?: (data: DealHandPacket, target?: string | string[]) => Promise<void>;
  private sendPlayerActionAction?: (data: PlayerActionPacket, target?: string | string[]) => Promise<void>;
  private sendTableSyncAction?: (data: TableStateSyncPacket, target?: string | string[]) => Promise<void>;
  private sendGameEndAction?: (data: GameEndPacket, target?: string | string[]) => Promise<void>;
  private sendChatAction?: (data: ChatPacket, target?: string | string[]) => Promise<void>;
  private sendJoinRequestAction?: (data: OnlinePlayer, target?: string | string[]) => Promise<void>;
  private sendRematchVoteAction?: (data: RematchVotePacket, target?: string | string[]) => Promise<void>;

  // Callbacks
  private onPeerJoinCallbacks: Array<(peerId: string) => void> = [];
  private onPeerLeaveCallbacks: Array<(peerId: string) => void> = [];
  private onRoomStateCallbacks: Array<MessageHandler<OnlineRoomState>> = [];
  private onDealHandCallbacks: Array<MessageHandler<DealHandPacket>> = [];
  private onPlayerActionCallbacks: Array<MessageHandler<PlayerActionPacket>> = [];
  private onTableSyncCallbacks: Array<MessageHandler<TableStateSyncPacket>> = [];
  private onGameEndCallbacks: Array<MessageHandler<GameEndPacket>> = [];
  private onChatCallbacks: Array<MessageHandler<ChatPacket>> = [];
  private onJoinRequestCallbacks: Array<MessageHandler<OnlinePlayer>> = [];
  private onRematchVoteCallbacks: Array<MessageHandler<RematchVotePacket>> = [];

  public join(roomCode: string): void {
    if (this.room) {
      this.leave();
    }

    this.currentRoomCode = roomCode.toUpperCase().trim();

    if (typeof RTCPeerConnection === 'undefined') {
      return;
    }

    this.room = joinRoom(
      {
        appId: APP_ID,
        rtcConfig: {
          iceServers: PUBLIC_ICE_SERVERS
        }
      },
      this.currentRoomCode
    );

    // Bind Peer Lifecycle via properties
    this.room.onPeerJoin = (peerId: string) => {
      this.onPeerJoinCallbacks.forEach(cb => cb(peerId));
    };

    this.room.onPeerLeave = (peerId: string) => {
      this.onPeerLeaveCallbacks.forEach(cb => cb(peerId));
    };

    // Bind Action Channels
    const joinAction = this.room.makeAction<OnlinePlayer>('join_req');
    this.sendJoinRequestAction = (data, target) => joinAction.send(data, { target });
    joinAction.onMessage = (data, context) => {
      this.onJoinRequestCallbacks.forEach(cb => cb(data, context.peerId));
    };

    const roomStateAction = this.room.makeAction<OnlineRoomState>('room_state');
    this.sendRoomStateAction = (data, target) => roomStateAction.send(data, { target });
    roomStateAction.onMessage = (data, context) => {
      this.onRoomStateCallbacks.forEach(cb => cb(data, context.peerId));
    };

    const dealHandAction = this.room.makeAction<DealHandPacket>('deal_hand');
    this.sendDealHandAction = (data, target) => dealHandAction.send(data, { target });
    dealHandAction.onMessage = (data, context) => {
      this.onDealHandCallbacks.forEach(cb => cb(data, context.peerId));
    };

    const playerActAction = this.room.makeAction<PlayerActionPacket>('player_act');
    this.sendPlayerActionAction = (data, target) => playerActAction.send(data, { target });
    playerActAction.onMessage = (data, context) => {
      this.onPlayerActionCallbacks.forEach(cb => cb(data, context.peerId));
    };

    const tableSyncAction = this.room.makeAction<TableStateSyncPacket>('table_sync');
    this.sendTableSyncAction = (data, target) => tableSyncAction.send(data, { target });
    tableSyncAction.onMessage = (data, context) => {
      this.onTableSyncCallbacks.forEach(cb => cb(data, context.peerId));
    };

    const gameEndAction = this.room.makeAction<GameEndPacket>('game_end');
    this.sendGameEndAction = (data, target) => gameEndAction.send(data, { target });
    gameEndAction.onMessage = (data, context) => {
      this.onGameEndCallbacks.forEach(cb => cb(data, context.peerId));
    };

    const chatAction = this.room.makeAction<ChatPacket>('chat');
    this.sendChatAction = (data, target) => chatAction.send(data, { target });
    chatAction.onMessage = (data, context) => {
      this.onChatCallbacks.forEach(cb => cb(data, context.peerId));
    };

    const rematchVoteAction = this.room.makeAction<RematchVotePacket>('rematch_vote');
    this.sendRematchVoteAction = (data, target) => rematchVoteAction.send(data, { target });
    rematchVoteAction.onMessage = (data, context) => {
      this.onRematchVoteCallbacks.forEach(cb => cb(data, context.peerId));
    };
  }

  public leave(): void {
    if (this.room) {
      try {
        void this.room.leave();
      } catch {}
      this.room = null;
    }
    this.currentRoomCode = null;
    this.onPeerJoinCallbacks = [];
    this.onPeerLeaveCallbacks = [];
    this.onRoomStateCallbacks = [];
    this.onDealHandCallbacks = [];
    this.onPlayerActionCallbacks = [];
    this.onTableSyncCallbacks = [];
    this.onGameEndCallbacks = [];
    this.onChatCallbacks = [];
    this.onJoinRequestCallbacks = [];
    this.onRematchVoteCallbacks = [];
  }

  public async sendJoinRequest(player: OnlinePlayer, targetPeerId?: string): Promise<void> {
    if (this.sendJoinRequestAction) {
      await this.sendJoinRequestAction(player, targetPeerId);
    }
  }

  public async broadcastRoomState(state: OnlineRoomState, targetPeerId?: string): Promise<void> {
    if (this.sendRoomStateAction) {
      await this.sendRoomStateAction(state, targetPeerId);
    }
  }

  public async sendPrivateDealHand(packet: DealHandPacket, targetPeerId: string): Promise<void> {
    if (this.sendDealHandAction) {
      await this.sendDealHandAction(packet, targetPeerId);
    }
  }

  public async sendPlayerAction(packet: PlayerActionPacket): Promise<void> {
    if (this.sendPlayerActionAction) {
      await this.sendPlayerActionAction(packet);
    }
  }

  public async broadcastTableSync(packet: TableStateSyncPacket): Promise<void> {
    if (this.sendTableSyncAction) {
      await this.sendTableSyncAction(packet);
    }
  }

  public async broadcastGameEnd(packet: GameEndPacket): Promise<void> {
    if (this.sendGameEndAction) {
      await this.sendGameEndAction(packet);
    }
  }

  public async broadcastChat(packet: ChatPacket): Promise<void> {
    if (this.sendChatAction) {
      await this.sendChatAction(packet);
    }
  }

  public async sendRematchVote(packet: RematchVotePacket, targetPeerId?: string): Promise<void> {
    if (this.sendRematchVoteAction) {
      await this.sendRematchVoteAction(packet, targetPeerId);
    }
  }

  public async pingPeer(peerId: string): Promise<number | null> {
    if (this.room) {
      try {
        return await this.room.ping(peerId);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Listener subscriptions
  public onPeerJoin(cb: (peerId: string) => void): () => void {
    this.onPeerJoinCallbacks.push(cb);
    return () => {
      this.onPeerJoinCallbacks = this.onPeerJoinCallbacks.filter(c => c !== cb);
    };
  }

  public onPeerLeave(cb: (peerId: string) => void): () => void {
    this.onPeerLeaveCallbacks.push(cb);
    return () => {
      this.onPeerLeaveCallbacks = this.onPeerLeaveCallbacks.filter(c => c !== cb);
    };
  }

  public onJoinRequest(cb: MessageHandler<OnlinePlayer>): () => void {
    this.onJoinRequestCallbacks.push(cb);
    return () => {
      this.onJoinRequestCallbacks = this.onJoinRequestCallbacks.filter(c => c !== cb);
    };
  }

  public onRoomState(cb: MessageHandler<OnlineRoomState>): () => void {
    this.onRoomStateCallbacks.push(cb);
    return () => {
      this.onRoomStateCallbacks = this.onRoomStateCallbacks.filter(c => c !== cb);
    };
  }

  public onDealHand(cb: MessageHandler<DealHandPacket>): () => void {
    this.onDealHandCallbacks.push(cb);
    return () => {
      this.onDealHandCallbacks = this.onDealHandCallbacks.filter(c => c !== cb);
    };
  }

  public onPlayerAction(cb: MessageHandler<PlayerActionPacket>): () => void {
    this.onPlayerActionCallbacks.push(cb);
    return () => {
      this.onPlayerActionCallbacks = this.onPlayerActionCallbacks.filter(c => c !== cb);
    };
  }

  public onTableSync(cb: MessageHandler<TableStateSyncPacket>): () => void {
    this.onTableSyncCallbacks.push(cb);
    return () => {
      this.onTableSyncCallbacks = this.onTableSyncCallbacks.filter(c => c !== cb);
    };
  }

  public onGameEnd(cb: MessageHandler<GameEndPacket>): () => void {
    this.onGameEndCallbacks.push(cb);
    return () => {
      this.onGameEndCallbacks = this.onGameEndCallbacks.filter(c => c !== cb);
    };
  }

  public onChat(cb: MessageHandler<ChatPacket>): () => void {
    this.onChatCallbacks.push(cb);
    return () => {
      this.onChatCallbacks = this.onChatCallbacks.filter(c => c !== cb);
    };
  }

  public onRematchVote(cb: MessageHandler<RematchVotePacket>): () => void {
    this.onRematchVoteCallbacks.push(cb);
    return () => {
      this.onRematchVoteCallbacks = this.onRematchVoteCallbacks.filter(c => c !== cb);
    };
  }
}

export const globalP2PClient = new P2PClient();

