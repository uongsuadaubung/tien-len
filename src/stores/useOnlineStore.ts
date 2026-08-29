import { create } from 'zustand';
import { 
  type OnlineStoreState, 
  type CreateRoomOptions, 
  type OnlineDisbandNotice,
  type RoomSlice,
  type MatchSlice,
  type ChatSlice
} from './online/types';
import { createRoomSlice } from './online/roomSlice';
import { createMatchSlice } from './online/matchSlice';
import { createChatSlice } from './online/chatSlice';

export type { 
  OnlineStoreState, 
  CreateRoomOptions, 
  OnlineDisbandNotice,
  RoomSlice,
  MatchSlice,
  ChatSlice
};

export const useOnlineStore = create<OnlineStoreState>()((...a) => ({
  ...createRoomSlice(...a),
  ...createMatchSlice(...a),
  ...createChatSlice(...a)
}));
