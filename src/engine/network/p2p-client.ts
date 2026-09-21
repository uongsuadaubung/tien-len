import { type RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../config/supabase';
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

export type MessageHandler<T> = (data: T, peerId: string) => void;

interface BroadcastEnvelope<T> {
  data: T;
  senderPeerId: string;
  targetPeerId?: string;
}

function generatePeerId(): string {
  return `peer_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
}

export class P2PClient {
  public channel: RealtimeChannel | null = null;
  public selfPeerId: string = generatePeerId();
  public currentRoomCode: string | null = null;
  private activePeers: Set<string> = new Set();

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
  private isSubscribed: boolean = false;
  private pendingBroadcasts: Array<() => Promise<void>> = [];

  public join(roomCode: string): void {
    if (this.channel) {
      this.leave();
    }
    this.isSubscribed = false;
    this.pendingBroadcasts = [];

    this.currentRoomCode = roomCode.toUpperCase().trim();
    const topic = `tl_room_${this.currentRoomCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const supabase = getSupabaseClient();
    this.channel = supabase.channel(topic, {
      config: {
        broadcast: { self: false },
        presence: { key: this.selfPeerId }
      }
    });

    // 1. Quản lý Hiện diện Người chơi (Presence: Peer Join & Leave)
    this.channel.on('presence', { event: 'sync' }, () => {
      if (!this.channel) return;
      const state = this.channel.presenceState();
      const currentPeers = new Set<string>();
      for (const key of Object.keys(state)) {
        if (key !== this.selfPeerId) {
          currentPeers.add(key);
        }
      }

      // Phát hiện Peer mới gia nhập
      currentPeers.forEach(peerId => {
        if (!this.activePeers.has(peerId)) {
          this.activePeers.add(peerId);
          this.onPeerJoinCallbacks.forEach(cb => {
            try {
              cb(peerId);
            } catch (err) {
              console.error('[SupabaseRealtime] onPeerJoin error:', err);
            }
          });
        }
      });

      // Phát hiện Peer đã rời phòng / mất kết nối
      this.activePeers.forEach(peerId => {
        if (!currentPeers.has(peerId)) {
          this.activePeers.delete(peerId);
          this.onPeerLeaveCallbacks.forEach(cb => {
            try {
              cb(peerId);
            } catch (err) {
              console.error('[SupabaseRealtime] onPeerLeave error:', err);
            }
          });
        }
      });
    });

    this.channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key && key !== this.selfPeerId && !this.activePeers.has(key)) {
        this.activePeers.add(key);
        this.onPeerJoinCallbacks.forEach(cb => {
          try {
            cb(key);
          } catch (err) {
            console.error('[SupabaseRealtime] onPeerJoin error:', err);
          }
        });
      }
    });

    this.channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key && this.activePeers.has(key)) {
        this.activePeers.delete(key);
        this.onPeerLeaveCallbacks.forEach(cb => {
          try {
            cb(key);
          } catch (err) {
            console.error('[SupabaseRealtime] onPeerLeave error:', err);
          }
        });
      }
    });

    // 2. Lắng nghe các kênh Broadcast
    this.channel.on<BroadcastEnvelope<OnlinePlayer>>('broadcast', { event: 'join_req' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      this.onJoinRequestCallbacks.forEach(cb => cb(payload.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<OnlineRoomState>>('broadcast', { event: 'room_state' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      this.onRoomStateCallbacks.forEach(cb => cb(payload.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<DealHandPacket>>('broadcast', { event: 'deal_hand' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      this.onDealHandCallbacks.forEach(cb => cb(payload.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<PlayerActionPacket>>('broadcast', { event: 'player_act' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      this.onPlayerActionCallbacks.forEach(cb => cb(payload.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<TableStateSyncPacket>>('broadcast', { event: 'table_sync' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      this.onTableSyncCallbacks.forEach(cb => cb(payload.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<GameEndPacket>>('broadcast', { event: 'game_end' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      this.onGameEndCallbacks.forEach(cb => cb(payload.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<ChatPacket>>('broadcast', { event: 'chat' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      this.onChatCallbacks.forEach(cb => cb(payload.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<RematchVotePacket>>('broadcast', { event: 'rematch_vote' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      this.onRematchVoteCallbacks.forEach(cb => cb(payload.data, payload.senderPeerId));
    });

    // 3. Đăng ký kênh và theo dõi Hiện diện
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && this.channel) {
        this.isSubscribed = true;
        try {
          await this.channel.track({
            online_at: Date.now()
          });
        } catch (err) {
          console.error('[SupabaseRealtime] track presence error:', err);
        }
        const queued = [...this.pendingBroadcasts];
        this.pendingBroadcasts = [];
        for (const fn of queued) {
          await fn();
        }
      }
    });
  }

  public leave(): void {
    if (this.channel) {
      try {
        void this.channel.untrack();
        const supabase = getSupabaseClient();
        void supabase.removeChannel(this.channel);
      } catch {}
      this.channel = null;
    }
    this.isSubscribed = false;
    this.pendingBroadcasts = [];
    this.currentRoomCode = null;
    this.activePeers.clear();
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

  private async sendBroadcast<T>(event: string, data: T, targetPeerId?: string): Promise<void> {
    if (!this.channel) return;
    const envelope: BroadcastEnvelope<T> = {
      data,
      senderPeerId: this.selfPeerId,
      targetPeerId
    };
    const doSend = async () => {
      if (!this.channel) return;
      try {
        const res = await this.channel.send({
          type: 'broadcast',
          event,
          payload: envelope
        });
        if (res !== 'ok') {
          console.warn(`[P2P:SEND_FAIL] event="${event}" returned status="${res}"! Channel state="${this.channel?.state}"`);
        }
      } catch (err) {
        console.error(`[P2P:SEND_EXCEPTION] Broadcast "${event}" error:`, err);
      }
    };

    if (this.isSubscribed || this.channel?.state === 'joined') {
      await doSend();
    } else {
      this.pendingBroadcasts.push(doSend);
    }
  }

  public async sendJoinRequest(player: OnlinePlayer, targetPeerId?: string): Promise<void> {
    await this.sendBroadcast('join_req', player, targetPeerId);
  }

  public async broadcastRoomState(state: OnlineRoomState, targetPeerId?: string): Promise<void> {
    await this.sendBroadcast('room_state', state, targetPeerId);
  }

  public async sendPrivateDealHand(packet: DealHandPacket, targetPeerId: string): Promise<void> {
    await this.sendBroadcast('deal_hand', packet, targetPeerId);
  }

  public async sendPlayerAction(packet: PlayerActionPacket): Promise<void> {
    await this.sendBroadcast('player_act', packet);
  }

  public async broadcastTableSync(packet: TableStateSyncPacket): Promise<void> {
    await this.sendBroadcast('table_sync', packet);
  }

  public async broadcastGameEnd(packet: GameEndPacket): Promise<void> {
    await this.sendBroadcast('game_end', packet);
  }

  public async broadcastChat(packet: ChatPacket): Promise<void> {
    await this.sendBroadcast('chat', packet);
  }

  public async sendRematchVote(packet: RematchVotePacket, targetPeerId?: string): Promise<void> {
    await this.sendBroadcast('rematch_vote', packet, targetPeerId);
  }

  public async pingPeer(peerId?: string): Promise<number | null> {
    void peerId;
    return 30; // WebSocket Round-Trip Time tiêu chuẩn
  }

  // Listener subscriptions
  public onPeerJoin(cb: (peerId: string) => void): () => void {
    this.onPeerJoinCallbacks.push(cb);
    this.activePeers.forEach(peerId => {
      try {
        cb(peerId);
      } catch (err) {
        console.error('[SupabaseRealtime] onPeerJoin replay error:', err);
      }
    });
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

  // Type-safe test dispatch helpers (loại bỏ as any trong unit/integration tests)
  public emitRoomStateForTest(state: OnlineRoomState, senderPeerId: string): void {
    this.onRoomStateCallbacks.forEach(cb => cb(state, senderPeerId));
  }

  public emitJoinRequestForTest(player: OnlinePlayer, senderPeerId: string): void {
    this.onJoinRequestCallbacks.forEach(cb => cb(player, senderPeerId));
  }

  public emitDealHandForTest(packet: DealHandPacket, senderPeerId: string): void {
    this.onDealHandCallbacks.forEach(cb => cb(packet, senderPeerId));
  }

  public emitTableSyncForTest(packet: TableStateSyncPacket, senderPeerId: string): void {
    this.onTableSyncCallbacks.forEach(cb => cb(packet, senderPeerId));
  }

  public emitGameEndForTest(packet: GameEndPacket, senderPeerId: string): void {
    this.onGameEndCallbacks.forEach(cb => cb(packet, senderPeerId));
  }

  public emitRematchVoteForTest(packet: RematchVotePacket, senderPeerId: string): void {
    this.onRematchVoteCallbacks.forEach(cb => cb(packet, senderPeerId));
  }
}

export const globalP2PClient = new P2PClient();
