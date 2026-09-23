import { StateCreator } from 'zustand';
import { 
  type OnlineRoomState, 
  type TableStateSyncPacket, 
  type GameEndPacket, 
  type ChatPacket,
  type PublicRoomSummary,
  type ReconnectNotice
} from '../../engine/network/network.schema';
import type { AuthoritativeMatchHost } from '../../engine/server/match-host';
import { type PlayerProfile } from '../../engine/storage';
import { GameSettlementRuleSchema, PlayerCountSchema } from '../../engine/schemas/settings.schema';

export type { PublicRoomSummary };

import { z } from 'zod';

export const CreateRoomOptionsSchema = z.object({
  betAmount: z.number().default(1000),
  playerCount: PlayerCountSchema.default(4),
  settlementRule: GameSettlementRuleSchema.default('COUNT_CARDS'),
  choppingMultiplier: z.number().default(1),
  congMultiplier: z.number().default(1),
  congEnabled: z.boolean().default(true),
  prohibitEndingWithTwo: z.boolean().default(true),
  allowFourPairsCutAnytime: z.boolean().default(true),
  threeSpadesEndingBonus: z.boolean().default(true),
  cascadeChopEnabled: z.boolean().default(true),
  isPublic: z.boolean().default(true)
});

export type CreateRoomOptions = z.infer<typeof CreateRoomOptionsSchema>;
export type CreateRoomInput = z.input<typeof CreateRoomOptionsSchema>;


export interface OnlineDisbandNotice {
  readonly title: string;
  readonly message: string;
}

/**
 * Các trạng thái phiên phòng P2P Online theo chuẩn State Pattern (Discriminated Unions)
 */
export interface IdleOnlineState {
  readonly status: 'IDLE';
  readonly publicRooms: readonly PublicRoomSummary[];
}

export interface BrowsingLobbyOnlineState {
  readonly status: 'BROWSING_LOBBY';
  readonly publicRooms: readonly PublicRoomSummary[];
  readonly isLoading: boolean;
}

export interface ConnectingOnlineState {
  readonly status: 'CONNECTING';
  readonly targetRoomCode: string;
  readonly attemptCount: number;
}

export interface InRoomWaitingOnlineState {
  readonly status: 'IN_ROOM_WAITING';
  readonly roomCode: string;             // ✅ Bảo đảm luôn tồn tại
  readonly roomState: OnlineRoomState;   // ✅ Bảo đảm luôn tồn tại
  readonly isHost: boolean;
  readonly myPlayerId: string;
}

export interface InRoomPlayingOnlineState {
  readonly status: 'IN_ROOM_PLAYING';
  readonly roomCode: string;             // ✅ Bảo đảm luôn tồn tại
  readonly roomState: OnlineRoomState;   // ✅ Bảo đảm luôn tồn tại
  readonly isHost: boolean;
  readonly myPlayerId: string;
  readonly hostInstance?: AuthoritativeMatchHost | null;
}

export interface DisbandedOnlineState {
  readonly status: 'DISBANDED';
  readonly notice: OnlineDisbandNotice;  // ✅ Bảo đảm luôn có thông báo lý do
}

export interface DisconnectedOnlineState {
  readonly status: 'DISCONNECTED';
  readonly reason: string;
  readonly canReconnect: boolean;
}

export type OnlineSessionState =
  | IdleOnlineState
  | BrowsingLobbyOnlineState
  | ConnectingOnlineState
  | InRoomWaitingOnlineState
  | InRoomPlayingOnlineState
  | DisbandedOnlineState
  | DisconnectedOnlineState;

export interface RoomSliceState {
  readonly sessionState: OnlineSessionState;
  readonly isOnlineMatch: boolean;
  readonly isHost: boolean;
  readonly roomCode: string | null;
  readonly roomState: OnlineRoomState | null;
  readonly myPlayerId: string;
  readonly connectionStatus: 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  readonly disbandNotice: OnlineDisbandNotice | null;
  readonly reconnectNotice: ReconnectNotice | null;
  readonly publicRooms: readonly PublicRoomSummary[];
  readonly isBrowsingLobby: boolean;
  readonly isLobbyLoading: boolean;
}

export interface RoomSliceActions {
  setSessionState: (session: OnlineSessionState) => void;
  createRoom: (profile: PlayerProfile, options: CreateRoomInput) => void;
  joinRoom: (profile: PlayerProfile, roomCode: string) => void;
  joinPublicRoom: (profile: PlayerProfile, room: PublicRoomSummary) => void;
  removeSlot: (slotIdx: number) => void;
  clearDisbandNotice: () => void;
  clearReconnectNotice: () => void;
  leaveRoom: () => void;
  startBrowsingLobby: () => void;
  stopBrowsingLobby: () => void;
  refreshLobbyRooms: () => void;
}

export interface MatchSliceState {
  hostInstance: AuthoritativeMatchHost | null;
  guestDriver?: unknown;
  lastTableSync: TableStateSyncPacket | null;
  gameEndSummary: GameEndPacket | null;
}

export interface MatchSliceActions {
  startMatch: () => void;
  startRematchOnHost: () => void;
  sendMoveAction: (cardIds: string[]) => void;
  sendPassAction: () => void;
  voteRematch: (isReady: boolean) => void;
}

export interface ChatSliceState {
  chatMessages: ChatPacket[];
}

export interface ChatSliceActions {
  sendChatMessage: (message: string, profile: PlayerProfile) => void;
}

export type RoomSlice = RoomSliceState & RoomSliceActions;
export type MatchSlice = MatchSliceState & MatchSliceActions;
export type ChatSlice = ChatSliceState & ChatSliceActions;

export type OnlineStoreState = RoomSlice & MatchSlice & ChatSlice;

export type OnlineSliceCreator<T> = StateCreator<
  OnlineStoreState,
  [],
  [],
  T
>;
