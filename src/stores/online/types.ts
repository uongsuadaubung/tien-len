import { StateCreator } from 'zustand';
import { 
  type OnlineRoomState, 
  type TableStateSyncPacket, 
  type GameEndPacket, 
  type ChatPacket 
} from '../../engine/network/network.schema';
import { HostEngineDriver } from '../../engine/network/host-engine-driver';
import { type GameSettlementRule } from '../../engine/types';
import { type PlayerProfile } from '../../engine/storage';

export interface CreateRoomOptions {
  betAmount: number;
  playerCount: 2 | 3 | 4;
  settlementRule: GameSettlementRule;
  choppingMultiplier: number | null;
  congEnabled: boolean | null;
  prohibitEndingWithTwo: boolean | null;
  allowFourPairsCutAnytime: boolean | null;
  threeSpadesEndingBonus: boolean | null;
  cascadeChopEnabled: boolean | null;
}

export interface OnlineDisbandNotice {
  title: string;
  message: string;
}

export interface RoomSliceState {
  isOnlineMatch: boolean;
  isHost: boolean;
  roomCode: string | null;
  roomState: OnlineRoomState | null;
  myPlayerId: string;
  connectionStatus: 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  disbandNotice: OnlineDisbandNotice | null;
}

export interface RoomSliceActions {
  createRoom: (profile: PlayerProfile, options: CreateRoomOptions) => void;
  joinRoom: (profile: PlayerProfile, roomCode: string) => void;
  addBotToSlot: (slotIdx: number) => void;
  removeSlot: (slotIdx: number) => void;
  clearDisbandNotice: () => void;
  leaveRoom: () => void;
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
