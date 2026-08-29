import { globalP2PClient } from '../../engine/network/p2p-client';
import { type ChatPacket } from '../../engine/network/network.schema';
import { type PlayerProfile } from '../../engine/storage';
import { type ChatSlice, type OnlineSliceCreator } from './types';

export const createChatSlice: OnlineSliceCreator<ChatSlice> = (set, get) => ({
  chatMessages: [],

  sendChatMessage: (message: string, profile: PlayerProfile) => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;

    const packet: ChatPacket = {
      id: `chat_${Date.now()}`,
      senderId: get().myPlayerId,
      senderName: profile.name || 'Đấu Thủ',
      senderAvatar: profile.avatar || '🤠',
      message: trimmed,
      timestamp: Date.now()
    };

    set(s => ({ chatMessages: [...s.chatMessages.slice(-50), packet] }));
    void globalP2PClient.broadcastChat(packet);
  }
});
