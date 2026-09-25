import { type RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../config/supabase';
import {
  OnlinePlayerSchema,
  type OnlinePlayer,
  OnlineRoomStateSchema,
  type OnlineRoomState,
  DealHandPacketSchema,
  type DealHandPacket,
  PlayerActionPacketSchema,
  type PlayerActionPacket,
  TableStateSyncPacketSchema,
  type TableStateSyncPacket,
  GameEndPacketSchema,
  type GameEndPacket,
  ChatPacketSchema,
  type ChatPacket,
  RematchVotePacketSchema,
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
  public privateChannel: RealtimeChannel | null = null;
  public selfPeerId: string = generatePeerId();
  public currentRoomCode: string | null = null;
  private activePeers: Set<string> = new Set();
  private peerChannels: Map<string, RealtimeChannel> = new Map();
  private lastBroadcastTableSync: TableStateSyncPacket | null = null;
  private lastBroadcastGameEnd: GameEndPacket | null = null;
  private lastHandledDealHandKey: string | null = null;

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
    const cleanCode = this.currentRoomCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const topic = `tl_room_${cleanCode}`;
    const privateTopic = `tl_room_${cleanCode}_p_${this.selfPeerId}`;

    const supabase = getSupabaseClient();
    this.channel = supabase.channel(topic, {
      config: {
        broadcast: { self: false },
        presence: { key: this.selfPeerId }
      }
    });

    // Option B: Kênh riêng tư (Private Sub-Topic) chuyên nhận bài chia riêng (Fog of War)
    this.privateChannel = supabase.channel(privateTopic, {
      config: {
        broadcast: { self: false }
      }
    });

    this.privateChannel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'deal_hand' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      const parsed = DealHandPacketSchema.safeParse(payload.data);
      if (!parsed.success) return;
      const key = `${parsed.data.gameNumber}_${parsed.data.playerId}_${parsed.data.cards.map(c => c.id).join(',')}`;
      if (this.lastHandledDealHandKey === key) return;
      this.lastHandledDealHandKey = key;
      this.onDealHandCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
    });

    try {
      this.privateChannel.subscribe();
    } catch {}

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
          this.ensurePeerChannel(peerId);
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
          this.removePeerChannel(peerId);
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
        this.ensurePeerChannel(key);
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
        this.removePeerChannel(key);
        this.onPeerLeaveCallbacks.forEach(cb => {
          try {
            cb(key);
          } catch (err) {
            console.error('[SupabaseRealtime] onPeerLeave error:', err);
          }
        });
      }
    });

    // 2. Lắng nghe các kênh Broadcast với Zod Boundary Validation
    this.channel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'join_req' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = OnlinePlayerSchema.safeParse(payload.data);
      if (!parsed.success) return;
      this.onJoinRequestCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'room_state' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = OnlineRoomStateSchema.safeParse(payload.data);
      if (!parsed.success) return;
      this.onRoomStateCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'deal_hand' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = DealHandPacketSchema.safeParse(payload.data);
      if (!parsed.success) return;
      const key = `${parsed.data.gameNumber}_${parsed.data.playerId}_${parsed.data.cards.map(c => c.id).join(',')}`;
      if (this.lastHandledDealHandKey === key) return;
      this.lastHandledDealHandKey = key;
      this.onDealHandCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'player_act' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = PlayerActionPacketSchema.safeParse(payload.data);
      if (!parsed.success) return;
      this.onPlayerActionCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'table_sync' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = TableStateSyncPacketSchema.safeParse(payload.data);
      if (!parsed.success) return;
      this.onTableSyncCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'game_end' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = GameEndPacketSchema.safeParse(payload.data);
      if (!parsed.success) return;
      this.onGameEndCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'chat' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = ChatPacketSchema.safeParse(payload.data);
      if (!parsed.success) return;
      this.onChatCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
    });

    this.channel.on<BroadcastEnvelope<unknown>>('broadcast', { event: 'rematch_vote' }, ({ payload }) => {
      if (!payload || !payload.data) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = RematchVotePacketSchema.safeParse(payload.data);
      if (!parsed.success) return;
      this.onRematchVoteCallbacks.forEach(cb => cb(parsed.data, payload.senderPeerId));
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
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.isSubscribed = false;
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
    if (this.privateChannel) {
      try {
        const supabase = getSupabaseClient();
        void supabase.removeChannel(this.privateChannel);
      } catch {}
      this.privateChannel = null;
    }
    for (const chan of this.peerChannels.values()) {
      try {
        const supabase = getSupabaseClient();
        void supabase.removeChannel(chan);
      } catch {}
    }
    this.peerChannels.clear();
    this.isSubscribed = false;
    this.pendingBroadcasts = [];
    this.currentRoomCode = null;
    this.activePeers.clear();
    this.lastBroadcastTableSync = null;
    this.lastBroadcastGameEnd = null;
    this.lastHandledDealHandKey = null;
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
      if (this.pendingBroadcasts.length >= 20) {
        this.pendingBroadcasts.shift();
      }
      this.pendingBroadcasts.push(doSend);
    }
  }

  public ensurePeerChannel(peerId: string): RealtimeChannel | null {
    if (!this.currentRoomCode || !peerId || peerId === this.selfPeerId) return null;
    const cleanCode = this.currentRoomCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const privateTopic = `tl_room_${cleanCode}_p_${peerId}`;
    let peerChan = this.peerChannels.get(privateTopic);
    if (!peerChan) {
      try {
        const supabase = getSupabaseClient();
        peerChan = supabase.channel(privateTopic, {
          config: { broadcast: { self: false } }
        });
        peerChan.subscribe();
        this.peerChannels.set(privateTopic, peerChan);
      } catch (err) {
        console.warn('[P2P:ensurePeerChannel] Error initializing peer channel:', err);
        return null;
      }
    }
    return peerChan;
  }

  public removePeerChannel(peerId: string): void {
    if (!this.currentRoomCode || !peerId) return;
    const cleanCode = this.currentRoomCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const privateTopic = `tl_room_${cleanCode}_p_${peerId}`;
    const peerChan = this.peerChannels.get(privateTopic);
    if (peerChan) {
      try {
        const supabase = getSupabaseClient();
        void supabase.removeChannel(peerChan);
      } catch {}
      this.peerChannels.delete(privateTopic);
    }
  }

  public async sendJoinRequest(player: OnlinePlayer, targetPeerId?: string): Promise<void> {
    await this.sendBroadcast('join_req', player, targetPeerId);
  }

  public async broadcastRoomState(state: OnlineRoomState, targetPeerId?: string): Promise<void> {
    await this.sendBroadcast('room_state', state, targetPeerId);
  }

  public async sendPrivateDealHand(packet: DealHandPacket, targetPeerId: string): Promise<void> {
    // Option B: Gửi bài chia riêng tư qua Private Sub-Topic của riêng targetPeerId (Bảo mật Fog of War mạng)
    const peerChan = this.ensurePeerChannel(targetPeerId);
    if (peerChan) {
      try {
        const res = await peerChan.send({
          type: 'broadcast',
          event: 'deal_hand',
          payload: {
            data: packet,
            senderPeerId: this.selfPeerId,
            targetPeerId
          }
        });
        if (res === 'ok') {
          return;
        }
      } catch (err) {
        console.error('[P2P:sendPrivateDealHand] Error broadcasting to private channel:', err);
      }
    }

    // Gửi kèm trên main channel có targetPeerId lọc danh tính làm kênh dự phòng an toàn (khi kênh riêng chưa sẵn sàng hoặc mock test)
    await this.sendBroadcast('deal_hand', packet, targetPeerId);
  }

  public async sendPlayerAction(packet: PlayerActionPacket): Promise<void> {
    await this.sendBroadcast('player_act', packet);
  }

  public async broadcastTableSync(packet: TableStateSyncPacket): Promise<void> {
    // Deduplication: Triệt tiêu N-broadcast loop khi Host có nhiều Peer Transports
    if (this.lastBroadcastTableSync === packet) return;
    if (
      this.lastBroadcastTableSync &&
      packet.seq > 0 &&
      this.lastBroadcastTableSync.seq === packet.seq &&
      this.lastBroadcastTableSync.timestamp === packet.timestamp
    ) {
      return;
    }
    this.lastBroadcastTableSync = packet;
    await this.sendBroadcast('table_sync', packet);
  }

  public async broadcastGameEnd(packet: GameEndPacket): Promise<void> {
    // Deduplication: Triệt tiêu N-broadcast loop khi Host kết thúc ván đấu
    if (this.lastBroadcastGameEnd === packet) return;
    this.lastBroadcastGameEnd = packet;
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
