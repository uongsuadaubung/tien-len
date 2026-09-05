import { StateCreator } from 'zustand';
import { 
  type OnlineRoomState, 
  type TableStateSyncPacket, 
  type GameEndPacket, 
  type ChatPacket,
  type PublicRoomSummary 
} from '../../engine/network/network.schema';
import { HostEngineDriver } from '../../engine/network/host-engine-driver';
import { type GameSettlementRule } from '../../engine/types';
import { type PlayerProfile } from '../../engine/storage';

export type { PublicRoomSummary };

export interface CreateRoomOptions {
  betAmount: number;
  playerCount: 2 | 3 | 4;
  settlementRule: GameSettlementRule;
  choppingMultiplier?: number;
  congEnabled?: boolean;
  prohibitEndingWithTwo?: boolean;
  allowFourPairsCutAnytime?: boolean;
  threeSpadesEndingBonus?: boolean;
  cascadeChopEnabled?: boolean;
  isPublic?: boolean;
}


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
  readonly hostDriver: HostEngineDriver | null;
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
  readonly publicRooms: readonly PublicRoomSummary[];
  readonly isBrowsingLobby: boolean;
  readonly isLobbyLoading: boolean;
}

export interface RoomSliceActions {
  setSessionState: (session: OnlineSessionState) => void;
  createRoom: (profile: PlayerProfile, options: CreateRoomOptions) => void;
  joinRoom: (profile: PlayerProfile, roomCode: string) => void;
  joinPublicRoom: (profile: PlayerProfile, room: PublicRoomSummary) => void;
  addBotToSlot: (slotIdx: number) => void;
  removeSlot: (slotIdx: number) => void;
  clearDisbandNotice: () => void;
  leaveRoom: () => void;
  startBrowsingLobby: () => void;
  stopBrowsingLobby: () => void;
  refreshLobbyRooms: () => void;
}

export interface MatchSliceState {
  hostDriver: HostEngineDriver | null;
  lastTableSync: TableStateSyncPacket | null;
  gameEndSummary: GameEndPacket | null;
}

export interface MatchSliceActions {
  startMatch: () => void;
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
