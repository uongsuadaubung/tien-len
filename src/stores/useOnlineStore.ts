import { create } from 'zustand';
import { 
  type OnlineRoomState, 
  type OnlinePlayer, 
  type TableStateSyncPacket, 
  type GameEndPacket, 
  type ChatPacket,
  type DealHandPacket
} from '../engine/network/network.schema';
import { globalP2PClient } from '../engine/network/p2p-client';
import { HostEngineDriver } from '../engine/network/host-engine-driver';
import type { PlayerProfile } from '../engine/storage';
import { type GameSettlementRule, type Card, type Player } from '../engine/types';
import { useGameStore } from './useGameStore';
import { createCard } from '../engine/card';
import { createPlayer, createBotPlayer } from '../engine/player-factory';

export interface CreateRoomOptions {
  betAmount: number;
  playerCount: 2 | 3 | 4;
  settlementRule: GameSettlementRule;
  choppingMultiplier?: number;
  congEnabled?: boolean;
  prohibitEndingWithTwo?: boolean;
}

export interface OnlineStoreState {
  isOnlineMatch: boolean;
  isHost: boolean;
  roomCode: string | null;
  roomState: OnlineRoomState | null;
  myPlayerId: string;
  connectionStatus: 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  chatMessages: ChatPacket[];
  lastTableSync: TableStateSyncPacket | null;
  gameEndSummary: GameEndPacket | null;
  hostDriver: HostEngineDriver | null;

  // Actions
  createRoom: (profile: PlayerProfile, options: CreateRoomOptions) => void;
  joinRoom: (profile: PlayerProfile, roomCode: string) => void;
  addBotToSlot: (slotIdx: number) => void;
  removeSlot: (slotIdx: number) => void;
  startMatch: () => void;
  sendMoveAction: (cardIds: string[]) => void;
  sendPassAction: () => void;
  sendChatMessage: (message: string, profile: PlayerProfile) => void;
  leaveRoom: () => void;
}

function generateRoomPin(): string {
  const chars = '0123456789';
  let pin = '';
  for (let i = 0; i < 4; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TL-${pin}`;
}

export const useOnlineStore = create<OnlineStoreState>((set, get) => ({
  isOnlineMatch: false,
  isHost: false,
  roomCode: null,
  roomState: null,
  myPlayerId: 'p0',
  connectionStatus: 'IDLE',
  chatMessages: [],
  lastTableSync: null,
  gameEndSummary: null,
  hostDriver: null,

  createRoom: (profile, options) => {
    const roomCode = generateRoomPin();
    const selfPeerId = globalP2PClient.selfPeerId;

    const hostPlayer: OnlinePlayer = {
      peerId: selfPeerId,
      playerId: 'p0',
      name: profile.name || 'Chủ Bàn',
      avatar: profile.avatar || '🤠',
      elo: profile.elo || 1000,
      coins: profile.coins || 50000,
      isHost: true,
      isReady: true,
      isBot: false
    };

    const initialRoomState: OnlineRoomState = {
      roomCode,
      hostPeerId: selfPeerId,
      playerCount: options.playerCount,
      betAmount: options.betAmount,
      settlementRule: options.settlementRule,
      choppingMultiplier: options.choppingMultiplier ?? 1,
      congEnabled: options.congEnabled ?? true,
      prohibitEndingWithTwo: options.prohibitEndingWithTwo ?? true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      players: [hostPlayer],
      status: 'WAITING',
      updatedAt: Date.now()
    };

    globalP2PClient.join(roomCode);

    // Host listens for join requests
    globalP2PClient.onJoinRequest((incomingPlayer, peerId) => {
      const current = get().roomState;
      if (!current || current.status !== 'WAITING') return;

      if (current.players.length >= current.playerCount) {
        return; // Room full
      }

      const assignedPlayerId = `p${current.players.length}`;
      const newPlayer: OnlinePlayer = {
        ...incomingPlayer,
        peerId,
        playerId: assignedPlayerId,
        isHost: false,
        isReady: true
      };

      const updatedPlayers = [...current.players, newPlayer];
      const updatedState: OnlineRoomState = {
        ...current,
        players: updatedPlayers,
        updatedAt: Date.now()
      };

      set({ roomState: updatedState });
      void globalP2PClient.broadcastRoomState(updatedState);
    });

    // Host listens to chat
    globalP2PClient.onChat((chat) => {
      set(s => ({ chatMessages: [...s.chatMessages.slice(-50), chat] }));
    });

    set({
      isOnlineMatch: true,
      isHost: true,
      roomCode,
      roomState: initialRoomState,
      myPlayerId: 'p0',
      connectionStatus: 'CONNECTED',
      chatMessages: [],
      lastTableSync: null,
      gameEndSummary: null
    });
  },

  joinRoom: (profile, roomCode) => {
    const formattedCode = roomCode.toUpperCase().trim();
    globalP2PClient.join(formattedCode);

    set({
      isOnlineMatch: true,
      isHost: false,
      roomCode: formattedCode,
      connectionStatus: 'CONNECTING',
      chatMessages: [],
      lastTableSync: null,
      gameEndSummary: null
    });

    const candidatePlayer: OnlinePlayer = {
      peerId: globalP2PClient.selfPeerId,
      playerId: '',
      name: profile.name || 'Đấu Thủ',
      avatar: profile.avatar || '🤠',
      elo: profile.elo || 1000,
      coins: profile.coins || 50000,
      isHost: false,
      isReady: true,
      isBot: false
    };

    // Client listens for Room State updates from Host
    globalP2PClient.onRoomState((roomState) => {
      const me = roomState.players.find(p => p.peerId === globalP2PClient.selfPeerId);
      set({
        roomState,
        connectionStatus: 'CONNECTED',
        myPlayerId: me ? me.playerId : 'p1'
      });
    });

    // Client listens for private card dealing
    globalP2PClient.onDealHand((dealPacket: DealHandPacket) => {
      const cards: Card[] = dealPacket.cards.map(c => createCard(c.rank, c.suit));
      const gameStore = useGameStore.getState();
      const currentPlayers = gameStore.players.map((p, idx) => {
        if (idx === 0) {
          return { ...p, hand: cards };
        }
        return p;
      });
      gameStore.setPlayers(currentPlayers);
      gameStore.setCurrentTurnPlayerId(dealPacket.firstTurnPlayerId);
      gameStore.setWinners([]);
    });

    // Client listens for Table Sync
    globalP2PClient.onTableSync((sync: TableStateSyncPacket) => {
      const gameStore = useGameStore.getState();
      set({ lastTableSync: sync });
      gameStore.setCurrentTurnPlayerId(sync.currentTurnPlayerId);
      if (sync.isGameOver && sync.winners.length > 0) {
        const winningPlayers = gameStore.players.filter(p => sync.winners.includes(p.id));
        gameStore.setWinners(winningPlayers);
      }
    });

    // Client listens for Game End
    globalP2PClient.onGameEnd((endPacket: GameEndPacket) => {
      set({ gameEndSummary: endPacket });
    });

    // Client listens for Chat
    globalP2PClient.onChat((chat) => {
      set(s => ({ chatMessages: [...s.chatMessages.slice(-50), chat] }));
    });

    // Peer Join trigger to send Handshake
    globalP2PClient.onPeerJoin(() => {
      void globalP2PClient.sendJoinRequest(candidatePlayer);
    });

    // Initial join packet
    setTimeout(() => {
      void globalP2PClient.sendJoinRequest(candidatePlayer);
    }, 500);
  },

  addBotToSlot: (slotIdx: number) => {
    const current = get().roomState;
    if (!current || !get().isHost || current.status !== 'WAITING') return;

    if (current.players.length >= current.playerCount) return;

    const botId = `p${slotIdx}`;
    const botPlayer: OnlinePlayer = {
      peerId: `bot_${Date.now()}_${slotIdx}`,
      playerId: botId,
      name: `Bot Cao Thủ ${slotIdx}`,
      avatar: '🤖',
      elo: 1150,
      coins: 50000,
      isHost: false,
      isReady: true,
      isBot: true
    };

    const updatedPlayers = [...current.players, botPlayer];
    const updatedState: OnlineRoomState = {
      ...current,
      players: updatedPlayers,
      updatedAt: Date.now()
    };

    set({ roomState: updatedState });
    void globalP2PClient.broadcastRoomState(updatedState);
  },

  removeSlot: (slotIdx: number) => {
    const current = get().roomState;
    if (!current || !get().isHost || current.status !== 'WAITING') return;

    const updatedPlayers = current.players.filter((_, idx) => idx !== slotIdx);
    const updatedState: OnlineRoomState = {
      ...current,
      players: updatedPlayers,
      updatedAt: Date.now()
    };

    set({ roomState: updatedState });
    void globalP2PClient.broadcastRoomState(updatedState);
  },

  startMatch: () => {
    const { roomState, isHost } = get();
    if (!roomState || !isHost) return;

    // Fill any missing player slots with bots if needed
    const filledPlayers = [...roomState.players];
    while (filledPlayers.length < roomState.playerCount) {
      const idx = filledPlayers.length;
      filledPlayers.push({
        peerId: `bot_${Date.now()}_${idx}`,
        playerId: `p${idx}`,
        name: `Bot Tập Luyện ${idx}`,
        avatar: '🤖',
        elo: 1150,
        coins: 50000,
        isHost: false,
        isReady: true,
        isBot: true
      });
    }

    const updatedRoomState: OnlineRoomState = {
      ...roomState,
      players: filledPlayers,
      status: 'PLAYING',
      updatedAt: Date.now()
    };

    set({ roomState: updatedRoomState });
    void globalP2PClient.broadcastRoomState(updatedRoomState);

    const driver = new HostEngineDriver(globalP2PClient, updatedRoomState);
    set({ hostDriver: driver });

    const gameStore = useGameStore.getState();
    const initialPlayers: Player[] = filledPlayers.map(p => {
      if (p.isBot) {
        return createBotPlayer(p.playerId, 'BOT_ELO_1150', { name: p.name, avatar: p.avatar, score: p.coins });
      }
      return createPlayer({ id: p.playerId, name: p.name, avatar: p.avatar, score: p.coins });
    });
    gameStore.setPlayers(initialPlayers);

    driver.startMatch((hostCards) => {
      const currentPlayers = gameStore.players.map((p, idx) => {
        if (idx === 0) {
          return { ...p, hand: hostCards };
        }
        return p;
      });
      gameStore.setPlayers(currentPlayers);
      gameStore.setCurrentTurnPlayerId(driver.engine?.currentRound.currentTurnPlayerId || 'p0');
      gameStore.setWinners([]);
    });
  },

  sendMoveAction: (cardIds: string[]) => {
    const { isHost, hostDriver, myPlayerId } = get();
    if (isHost && hostDriver) {
      hostDriver.handlePlayerAction({
        type: 'PLAY',
        playerId: myPlayerId,
        cardIds,
        timestamp: Date.now()
      });
    } else {
      void globalP2PClient.sendPlayerAction({
        type: 'PLAY',
        playerId: myPlayerId,
        cardIds,
        timestamp: Date.now()
      });
    }
  },

  sendPassAction: () => {
    const { isHost, hostDriver, myPlayerId } = get();
    if (isHost && hostDriver) {
      hostDriver.handlePlayerAction({
        type: 'PASS',
        playerId: myPlayerId,
        timestamp: Date.now()
      });
    } else {
      void globalP2PClient.sendPlayerAction({
        type: 'PASS',
        playerId: myPlayerId,
        timestamp: Date.now()
      });
    }
  },

  sendChatMessage: (message: string, profile: PlayerProfile) => {
    const packet: ChatPacket = {
      id: `chat_${Date.now()}`,
      senderId: get().myPlayerId,
      senderName: profile.name || 'Đấu Thủ',
      senderAvatar: profile.avatar || '🤠',
      message: message.trim(),
      timestamp: Date.now()
    };

    set(s => ({ chatMessages: [...s.chatMessages.slice(-50), packet] }));
    void globalP2PClient.broadcastChat(packet);
  },

  leaveRoom: () => {
    const { hostDriver } = get();
    if (hostDriver) {
      hostDriver.cleanup();
    }
    globalP2PClient.leave();

    set({
      isOnlineMatch: false,
      isHost: false,
      roomCode: null,
      roomState: null,
      myPlayerId: 'p0',
      connectionStatus: 'IDLE',
      chatMessages: [],
      lastTableSync: null,
      gameEndSummary: null,
      hostDriver: null
    });
  }
}));
