/**
 * Transport Message Types
 * Các thông điệp giao tiếp chuẩn mực giữa MatchHost và các Client (Local Human, Remote Human, Bot)
 */
import type { 
  PlayerActionPacket, 
  DealHandPacket, 
  TableStateSyncPacket, 
  GameEndPacket,
  RematchVotePacket
} from '../network/network.schema';

export type HostToClientPacket =
  | { type: 'DEAL_HAND'; packet: DealHandPacket }
  | { type: 'TABLE_SYNC'; packet: TableStateSyncPacket }
  | { type: 'GAME_END'; packet: GameEndPacket };

export type ClientToHostPacket =
  | { type: 'PLAYER_ACTION'; packet: PlayerActionPacket }
  | { type: 'REMATCH_VOTE'; packet: RematchVotePacket };

export type MessageHandler<T> = (message: T, senderId?: string) => void;

/**
 * ITransport
 * Giao diện trừu tượng hóa kênh truyền tin (In-Memory cho Offline/Local Host, Supabase Realtime cho Online)
 */
export interface ITransport<TOutgoing, TIncoming> {
  send(message: TOutgoing): void;
  onMessage(handler: MessageHandler<TIncoming>): () => void;
  disconnect(): void;
  readonly isConnected: boolean;
  readonly peerId?: string;
}

export type IClientTransport = ITransport<ClientToHostPacket, HostToClientPacket>;
export type IHostPeerTransport = ITransport<HostToClientPacket, ClientToHostPacket>;
