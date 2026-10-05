import type { RealtimeChannel, InboundMessage } from 'ably';
import type { ZodType } from 'zod';
import { getAblyClient } from '../../config/ably';
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

function isEnvelope(value: unknown): value is BroadcastEnvelope<unknown> {
  return typeof value === 'object' && value !== null && 'data' in value && Boolean(value.data) &&
    'senderPeerId' in value && typeof value.senderPeerId === 'string';
}

function addListener<T>(set: Set<T>, cb: T): () => void {
  set.add(cb);
  return () => {
    set.delete(cb);
  };
}

function emitTo<T>(set: Set<MessageHandler<T>>): MessageHandler<T> {
  // Duyệt trên bản chụp: listener thêm/bớt hoặc leave() trong lúc dispatch không ảnh hưởng vòng hiện tại
  return (data, senderPeerId) => [...set].forEach(cb => cb(data, senderPeerId));
}

function notifyPeer(set: Set<(peerId: string) => void>, peerId: string, label: string): void {
  [...set].forEach(cb => {
    try {
      cb(peerId);
    } catch (err) {
      console.error(`[AblyRealtime] ${label} error:`, err);
    }
  });
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
  private readonly handlers = {
    peerJoin: new Set<(peerId: string) => void>(),
    peerLeave: new Set<(peerId: string) => void>(),
    roomState: new Set<MessageHandler<OnlineRoomState>>(),
    dealHand: new Set<MessageHandler<DealHandPacket>>(),
    playerAction: new Set<MessageHandler<PlayerActionPacket>>(),
    tableSync: new Set<MessageHandler<TableStateSyncPacket>>(),
    gameEnd: new Set<MessageHandler<GameEndPacket>>(),
    chat: new Set<MessageHandler<ChatPacket>>(),
    joinRequest: new Set<MessageHandler<OnlinePlayer>>(),
    rematchVote: new Set<MessageHandler<RematchVotePacket>>()
  };
  private isSubscribed: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isLeaving: boolean = false;
  private readonly maxReconnectAttempts: number = 5;
  private readonly baseReconnectDelayMs: number = 1000;
  private readonly maxReconnectDelayMs: number = 15000;

  /** Bài chia có thể đến qua cả kênh riêng lẫn kênh chính (dự phòng) → chống xử lý trùng. */
  private readonly dispatchDealHand: MessageHandler<DealHandPacket> = (packet, senderPeerId) => {
    const key = `${packet.gameNumber}_${packet.playerId}_${packet.cards.map(c => c.id).join(',')}`;
    if (this.lastHandledDealHandKey === key) return;
    this.lastHandledDealHandKey = key;
    emitTo(this.handlers.dealHand)(packet, senderPeerId);
  };

  public join(roomCode: string): void {
    if (this.channel) {
      this.leave();
    }
    this.isLeaving = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.isSubscribed = false;

    this.currentRoomCode = roomCode.toUpperCase().trim();
    const cleanCode = this.currentRoomCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const topic = `tl_room_${cleanCode}`;
    const privateTopic = `tl_room_${cleanCode}_p_${this.selfPeerId}`;

    const ably = getAblyClient();
    const channel = ably.channels.get(topic);
    this.channel = channel;

    // Option B: Kênh riêng tư (Private Sub-Topic) chuyên nhận bài chia riêng (Fog of War)
    this.privateChannel = ably.channels.get(privateTopic);
    this.listen(this.privateChannel, 'deal_hand', DealHandPacketSchema, this.dispatchDealHand);

    // 1. Quản lý Hiện diện Người chơi (Presence: Peer Join & Leave)
    channel.presence.subscribe(() => {
      void this.syncPeers(channel);
    }).catch(() => {});

    // 2. Lắng nghe các kênh Broadcast với Zod Boundary Validation
    const h = this.handlers;
    this.listen(channel, 'join_req', OnlinePlayerSchema, emitTo(h.joinRequest));
    this.listen(channel, 'room_state', OnlineRoomStateSchema, emitTo(h.roomState));
    this.listen(channel, 'deal_hand', DealHandPacketSchema, this.dispatchDealHand);
    this.listen(channel, 'player_act', PlayerActionPacketSchema, emitTo(h.playerAction));
    this.listen(channel, 'table_sync', TableStateSyncPacketSchema, emitTo(h.tableSync));
    this.listen(channel, 'game_end', GameEndPacketSchema, emitTo(h.gameEnd));
    this.listen(channel, 'chat', ChatPacketSchema, emitTo(h.chat));
    this.listen(channel, 'rematch_vote', RematchVotePacketSchema, emitTo(h.rematchVote));

    // 3. Theo dõi trạng thái kênh (Ably tự attach khi subscribe)
    const onAttached = () => {
      void this.handleChannelStatusChange('SUBSCRIBED');
      void this.syncPeers(channel);
    };
    channel.on('attached', onAttached);
    channel.on(['suspended', 'failed'], () => void this.handleChannelStatusChange('CHANNEL_ERROR'));
    channel.on('detached', () => void this.handleChannelStatusChange('CLOSED'));

    // Tối ưu hóa: nếu kênh đã ở trạng thái attached sẵn (tái sử dụng), kích hoạt ngay tức thì
    if (channel.state === 'attached') {
      onAttached();
    }
  }

  /** Đăng ký listener cho một event: lọc gói tin gửi cho peer khác, validate bằng Zod rồi dispatch. */
  private listen<T>(
    channel: RealtimeChannel,
    event: string,
    schema: ZodType<T>,
    dispatch: MessageHandler<T>
  ): void {
    channel.subscribe(event, (msg: InboundMessage) => {
      const payload: unknown = msg.data;
      if (!isEnvelope(payload)) return;
      if (payload.targetPeerId && payload.targetPeerId !== this.selfPeerId) return;
      const parsed = schema.safeParse(payload.data);
      if (!parsed.success) return;
      dispatch(parsed.data, payload.senderPeerId);
    }).catch(() => {});
  }

  /** Đồng bộ danh sách peer từ Ably Presence, phát hiện peer mới vào / rời phòng. */
  private async syncPeers(channel: RealtimeChannel): Promise<void> {
    let members;
    try {
      members = await channel.presence.get();
    } catch {
      return;
    }
    if (channel !== this.channel) return;

    const currentPeers = new Set<string>();
    for (const m of members) {
      if (m.clientId && m.clientId !== this.selfPeerId) {
        currentPeers.add(m.clientId);
      }
    }

    // Phát hiện Peer mới gia nhập
    currentPeers.forEach(peerId => {
      if (!this.activePeers.has(peerId)) {
        this.activePeers.add(peerId);
        this.ensurePeerChannel(peerId);
        notifyPeer(this.handlers.peerJoin, peerId, 'onPeerJoin');
      }
    });

    // Phát hiện Peer đã rời phòng / mất kết nối
    this.activePeers.forEach(peerId => {
      if (!currentPeers.has(peerId)) {
        this.activePeers.delete(peerId);
        this.removePeerChannel(peerId);
        notifyPeer(this.handlers.peerLeave, peerId, 'onPeerLeave');
      }
    });
  }

  private async handleChannelStatusChange(status: string): Promise<void> {
    if (status === 'SUBSCRIBED' && this.channel) {
      this.isSubscribed = true;
      this.reconnectAttempts = 0;
      if (this.reconnectTimeoutId) {
        clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = null;
      }
      // Ably tự re-enter presence khi kênh re-attach, nên chỉ cần enter một lần mỗi lần attached
      this.channel.presence.enterClient(this.selfPeerId, { online_at: Date.now() }).catch(err => {
        console.error('[AblyRealtime] enter presence error:', err);
      });
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      this.isSubscribed = false;
      if (!this.isLeaving && this.currentRoomCode && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
        this.scheduleAutoReconnect();
      }
    }
  }

  private scheduleAutoReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`[AblyRealtime] Max reconnect attempts (${this.maxReconnectAttempts}) reached.`);
      return;
    }

    const backoff = Math.min(
      this.maxReconnectDelayMs,
      this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts)
    );
    const jitter = Math.floor(Math.random() * 500);
    const delay = backoff + jitter;
    this.reconnectAttempts++;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = setTimeout(() => {
      if (!this.isLeaving && this.currentRoomCode && !this.isSubscribed && this.channel) {
        this.channel.attach().catch(err => {
          console.error('[AblyRealtime] Reconnection error:', err);
        });
      }
    }, delay);
  }

  /** Gỡ toàn bộ listener và detach kênh (không release để tránh race khi join lại cùng phòng). */
  private disposeChannel(channel: RealtimeChannel): void {
    try {
      channel.unsubscribe();
      channel.presence.unsubscribe();
      channel.off();
      if (channel.state === 'attached') {
        channel.detach().catch(() => {});
      }
    } catch {}
  }

  public leave(): void {
    this.isLeaving = true;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.reconnectAttempts = 0;
    if (this.channel) {
      if (this.isSubscribed) {
        this.channel.presence.leaveClient(this.selfPeerId).catch(() => {});
      }
      this.disposeChannel(this.channel);
      this.channel = null;
    }
    if (this.privateChannel) {
      this.disposeChannel(this.privateChannel);
      this.privateChannel = null;
    }
    // Peer channels chỉ dùng để publish (không attach) nên chỉ cần bỏ tham chiếu
    this.peerChannels.clear();
    this.isSubscribed = false;
    this.currentRoomCode = null;
    this.activePeers.clear();
    this.lastBroadcastTableSync = null;
    this.lastBroadcastGameEnd = null;
    this.lastHandledDealHandKey = null;
    Object.values(this.handlers).forEach(set => set.clear());
  }

  /**
   * Publish qua Ably. Khi kênh chưa attached, Ably tự xếp hàng tin nhắn đến khi kết nối xong,
   * nên không chờ ACK để tránh treo caller (tương đương hàng đợi pendingBroadcasts cũ).
   */
  private async publish(channel: RealtimeChannel, event: string, envelope: BroadcastEnvelope<unknown>): Promise<boolean> {
    const sending = channel.publish(event, envelope);
    if (!this.isSubscribed) {
      sending.catch(err => console.error(`[P2P:SEND_EXCEPTION] Publish "${event}" error:`, err));
      return true;
    }
    try {
      await sending;
      return true;
    } catch (err) {
      console.error(`[P2P:SEND_EXCEPTION] Publish "${event}" error:`, err);
      return false;
    }
  }

  private async sendBroadcast<T>(event: string, data: T, targetPeerId?: string): Promise<void> {
    if (!this.channel) return;
    await this.publish(this.channel, event, {
      data,
      senderPeerId: this.selfPeerId,
      targetPeerId
    });
  }

  public ensurePeerChannel(peerId: string): RealtimeChannel | null {
    if (!this.currentRoomCode || !peerId || peerId === this.selfPeerId) return null;
    const cleanCode = this.currentRoomCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const privateTopic = `tl_room_${cleanCode}_p_${peerId}`;
    let peerChan = this.peerChannels.get(privateTopic);
    if (!peerChan) {
      try {
        // Ably cho phép publish mà không cần attach kênh
        peerChan = getAblyClient().channels.get(privateTopic);
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
    this.peerChannels.delete(`tl_room_${cleanCode}_p_${peerId}`);
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
      const ok = await this.publish(peerChan, 'deal_hand', {
        data: packet,
        senderPeerId: this.selfPeerId,
        targetPeerId
      });
      if (ok) {
        return;
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

  /** Đo độ trễ mạng thực tế (RTT) tới máy chủ Ably bằng WebSocket ping */
  public async pingPeer(peerId?: string): Promise<number | null> {
    void peerId;
    try {
      const ably = getAblyClient();
      if (ably.connection.state === 'connected') {
        const rtt = await ably.connection.ping();
        if (typeof rtt === 'number') return Math.round(rtt);
      }
    } catch {
      // Bỏ qua khi offline / mock test
    }
    return 30; // Tiêu chuẩn dự phòng
  }

  // Listener subscriptions
  public onPeerJoin(cb: (peerId: string) => void): () => void {
    const off = addListener(this.handlers.peerJoin, cb);
    // Replay các peer đã có mặt cho listener đăng ký muộn
    this.activePeers.forEach(peerId => notifyPeer(new Set([cb]), peerId, 'onPeerJoin replay'));
    return off;
  }

  public onPeerLeave(cb: (peerId: string) => void): () => void {
    return addListener(this.handlers.peerLeave, cb);
  }

  public onJoinRequest(cb: MessageHandler<OnlinePlayer>): () => void {
    return addListener(this.handlers.joinRequest, cb);
  }

  public onRoomState(cb: MessageHandler<OnlineRoomState>): () => void {
    return addListener(this.handlers.roomState, cb);
  }

  public onDealHand(cb: MessageHandler<DealHandPacket>): () => void {
    return addListener(this.handlers.dealHand, cb);
  }

  public onPlayerAction(cb: MessageHandler<PlayerActionPacket>): () => void {
    return addListener(this.handlers.playerAction, cb);
  }

  public onTableSync(cb: MessageHandler<TableStateSyncPacket>): () => void {
    return addListener(this.handlers.tableSync, cb);
  }

  public onGameEnd(cb: MessageHandler<GameEndPacket>): () => void {
    return addListener(this.handlers.gameEnd, cb);
  }

  public onChat(cb: MessageHandler<ChatPacket>): () => void {
    return addListener(this.handlers.chat, cb);
  }

  public onRematchVote(cb: MessageHandler<RematchVotePacket>): () => void {
    return addListener(this.handlers.rematchVote, cb);
  }

  // Type-safe test dispatch helpers (loại bỏ as any trong unit/integration tests)
  public emitRoomStateForTest(state: OnlineRoomState, senderPeerId: string): void {
    emitTo(this.handlers.roomState)(state, senderPeerId);
  }

  public emitJoinRequestForTest(player: OnlinePlayer, senderPeerId: string): void {
    emitTo(this.handlers.joinRequest)(player, senderPeerId);
  }

  public emitDealHandForTest(packet: DealHandPacket, senderPeerId: string): void {
    emitTo(this.handlers.dealHand)(packet, senderPeerId);
  }

  public emitTableSyncForTest(packet: TableStateSyncPacket, senderPeerId: string): void {
    emitTo(this.handlers.tableSync)(packet, senderPeerId);
  }

  public emitGameEndForTest(packet: GameEndPacket, senderPeerId: string): void {
    emitTo(this.handlers.gameEnd)(packet, senderPeerId);
  }

  public emitRematchVoteForTest(packet: RematchVotePacket, senderPeerId: string): void {
    emitTo(this.handlers.rematchVote)(packet, senderPeerId);
  }

  public getReconnectAttemptsForTest(): number {
    return this.reconnectAttempts;
  }

  public getIsReconnectingForTest(): boolean {
    return this.reconnectTimeoutId !== null;
  }

  public handleStatusChangeForTest(status: string): Promise<void> {
    return this.handleChannelStatusChange(status);
  }
}

export const globalP2PClient = new P2PClient();
