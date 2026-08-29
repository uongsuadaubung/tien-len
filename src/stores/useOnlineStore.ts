import { create } from 'zustand';
import { globalP2PClient } from '../engine/network/p2p-client';
import { 
  type OnlineRoomState, 
  type TableStateSyncPacket, 
  type GameEndPacket, 
  type ChatPacket, 
  type OnlinePlayer,
  type DealHandPacket
} from '../engine/network/network.schema';
import { HostEngineDriver } from '../engine/network/host-engine-driver';
import { createCard } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { soundManager } from '../ui/audio/sound-manager';
import { useGameStore } from './useGameStore';
import { useModalStore } from './useModalStore';
import { 
  type GameSettlementRule, 
  type Player, 
  GameRulesBuilder,
  type ChoppingRulesBuilder,
  type CongRulesBuilder,
  type GameFlowRulesBuilder,
  type TableRulesBuilder 
} from '../engine/types';
import { type PlayerProfile } from '../engine/storage';
import { createPlayer, createBotPlayer } from '../engine/player-factory';

export interface CreateRoomOptions {
  betAmount: number;
  playerCount: 2 | 3 | 4;
  settlementRule: GameSettlementRule;
  choppingMultiplier: number | null;
  congEnabled: boolean | null;
  prohibitEndingWithTwo: boolean | null;
}

export interface OnlineDisbandNotice {
  title: string;
  message: string;
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
  disbandNotice: OnlineDisbandNotice | null;

  // Actions
  createRoom: (profile: PlayerProfile, options: CreateRoomOptions) => void;
  joinRoom: (profile: PlayerProfile, roomCode: string) => void;
  addBotToSlot: (slotIdx: number) => void;
  removeSlot: (slotIdx: number) => void;
  startMatch: () => void;
  voteRematch: (isReady: boolean) => void;
  sendMoveAction: (cardIds: string[]) => void;
  sendPassAction: () => void;
  sendChatMessage: (message: string, profile: PlayerProfile) => void;
  clearDisbandNotice: () => void;
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
  disbandNotice: null,

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
      disbandReason: null,
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

    // Host listens for Peer Leave (người chơi thoát phòng)
    globalP2PClient.onPeerLeave((peerId) => {
      const { hostDriver, roomState, isOnlineMatch } = get();
      if (!isOnlineMatch || !roomState) return;

      if (hostDriver) {
        hostDriver.handlePeerLeave(peerId);
      } else {
        const leaver = roomState.players.find(p => p.peerId === peerId);
        if (!leaver) return;

        const updatedPlayers = roomState.players.filter(p => p.peerId !== peerId);
        const updatedRoom: OnlineRoomState = {
          ...roomState,
          players: updatedPlayers,
          status: 'WAITING',
          disbandReason: null,
          updatedAt: Date.now()
        };
        set({ roomState: updatedRoom });
        void globalP2PClient.broadcastRoomState(updatedRoom);
      }
    });

    // Host listens to chat
    globalP2PClient.onChat((chat) => {
      set(s => ({ chatMessages: [...s.chatMessages.slice(-50), chat] }));
    });

    useGameStore.setState({
      activeGameType: 'ONLINE',
      myPlayerId: 'p0'
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
      gameEndSummary: null,
      disbandNotice: null
    });
  },

  joinRoom: (profile, roomCode) => {
    const formattedCode = roomCode.toUpperCase().trim();
    globalP2PClient.join(formattedCode);

    useGameStore.setState({
      activeGameType: 'ONLINE'
    });

    set({
      isOnlineMatch: true,
      isHost: false,
      roomCode: formattedCode,
      connectionStatus: 'CONNECTING',
      chatMessages: [],
      lastTableSync: null,
      gameEndSummary: null,
      disbandNotice: null
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
      // Nếu phòng bị giải tán (Host giải tán hoặc có người thoát giữa trận)
      if (roomState.status === 'DISBANDED') {
        const reason = roomState.disbandReason || 'Bàn chơi đã được giải tán do có người chơi thoát trận.';
        get().leaveRoom();
        set({
          disbandNotice: {
            title: 'BÀN CHƠI ĐÃ BỊ GIẢI TÁN',
            message: reason
          }
        });
        useModalStore.getState().closeModal('VICTORY');
        useModalStore.getState().closeModal('ONLINE_ROOM');
        useGameStore.getState().resetMatchState();
        return;
      }

      const me = roomState.players.find(p => p.peerId === globalP2PClient.selfPeerId);
      const myId = me ? me.playerId : get().myPlayerId;

      useGameStore.setState({
        myPlayerId: myId,
        activeGameType: 'ONLINE'
      });

      set({
        roomState,
        connectionStatus: 'CONNECTED',
        myPlayerId: myId
      });

      if (roomState.status === 'PLAYING') {
        const gameStore = useGameStore.getState();
        useModalStore.getState().closeModal('ONLINE_ROOM');
        useModalStore.getState().closeModal('VICTORY');

        // Giữ lại bài trên tay hiện tại nếu đã nhận dealPacket trước đó
        const currentPlayersMap = new Map(gameStore.players.map(p => [p.id, p]));

        const initialPlayers: Player[] = roomState.players.map(p => {
          const existing = currentPlayersMap.get(p.playerId);
          const hand = existing ? existing.hand : [];
          if (p.isBot) {
            return createBotPlayer(p.playerId, 'BOT_ELO_1150', { name: p.name, avatar: p.avatar, score: p.coins, hand });
          }
          return createPlayer({ id: p.playerId, name: p.name, avatar: p.avatar, score: p.coins, hand });
        });

        const customRules = new GameRulesBuilder()
          .withSettlement(roomState.settlementRule)
          .withChopping((c: ChoppingRulesBuilder) => c
            .multiplier(roomState.choppingMultiplier)
            .allowFourPairsCutAnytime(roomState.allowFourPairsCutAnytime)
            .cascadeMultiplier(roomState.cascadeChopEnabled)
          )
          .withCong((cg: CongRulesBuilder) => cg
            .enabled(roomState.congEnabled)
          )
          .withGameFlow((f: GameFlowRulesBuilder) => f
            .prohibitEndingWithTwo(roomState.prohibitEndingWithTwo)
            .threeSpadesEndingBonus(roomState.threeSpadesEndingBonus)
          )
          .withTable((t: TableRulesBuilder) => t
            .playerCount(roomState.playerCount)
            .betAmount(roomState.betAmount)
          )
          .build();

        gameStore.setPlayers(initialPlayers);
        gameStore.setPlayerCount(roomState.playerCount);
        gameStore.setGameRules(customRules);
        gameStore.setGameSettings(prev => ({
          ...prev,
          betAmount: roomState.betAmount,
          mode: roomState.settlementRule
        }));
        gameStore.setIsDealing(false);
        gameStore.setCurrentScreen('GAME_TABLE');
        gameStore.setActiveGameType('ONLINE');
      }
    });

    // Client listens for Peer Leave (đặc biệt khi Host mất kết nối)
    globalP2PClient.onPeerLeave((peerId) => {
      const { roomState, isOnlineMatch } = get();
      if (!isOnlineMatch || !roomState) return;

      // Nếu người rời phòng là Chủ Phòng (Host)
      if (peerId === roomState.hostPeerId) {
        get().leaveRoom();
        set({
          disbandNotice: {
            title: 'BÀN CHƠI ĐÃ BỊ GIẢI TÁN',
            message: 'Chủ phòng đã thoát khỏi trận đấu hoặc mất kết nối mạng. Bàn chơi đã tự động giải tán.'
          }
        });
        useModalStore.getState().closeModal('VICTORY');
        useModalStore.getState().closeModal('ONLINE_ROOM');
        useGameStore.getState().resetMatchState();
      }
    });

    // Client listens for private card dealing
    globalP2PClient.onDealHand((dealPacket: DealHandPacket) => {
      const gameStore = useGameStore.getState();
      const myId = get().myPlayerId;
      const room = get().roomState;

      const cards = dealPacket.cards.map(c => createCard(c.rank, c.suit));

      const basePlayers = room && room.players.length > 0
        ? room.players.map(p => {
            if (p.isBot) {
              return createBotPlayer(p.playerId, 'BOT_ELO_1150', { name: p.name, avatar: p.avatar, score: p.coins });
            }
            return createPlayer({ id: p.playerId, name: p.name, avatar: p.avatar, score: p.coins });
          })
        : (gameStore.players.length > 0 ? gameStore.players : [
            createPlayer({ id: 'p0', name: 'Chủ Bàn', avatar: '🤠', score: 50000 }),
            createPlayer({ id: 'p1', name: 'Đấu Thủ', avatar: '🤠', score: 50000 })
          ]);

      const currentPlayers = basePlayers.map((p) => {
        if (p.id === myId) {
          return { ...p, hand: cards };
        }
        return { ...p, hand: [] };
      });

      gameStore.setPlayers(currentPlayers);
      gameStore.setPlayerCount((room?.playerCount || currentPlayers.length) as 2 | 3 | 4);
      if (dealPacket.gameNumber) {
        gameStore.setGameNumber(dealPacket.gameNumber);
      }
      gameStore.setCurrentTurnPlayerId(dealPacket.firstTurnPlayerId);
      gameStore.setLeadPlayerId(dealPacket.leadPlayerId);
      gameStore.setWinners([]);
      gameStore.setIsGameOver(false);
      gameStore.setIsDealing(false);
      gameStore.setCurrentMove(null);
      gameStore.setSelectedCardIds(new Set<string>());
      gameStore.setCurrentHint(null);
      gameStore.setActiveGameType('ONLINE');
      gameStore.setCurrentScreen('GAME_TABLE');

      const counts: Record<string, number> = {};
      currentPlayers.forEach(p => {
        counts[p.id] = 13;
      });
      gameStore.setDealtCounts(counts);

      useModalStore.getState().closeModal('VICTORY');
      useModalStore.getState().closeModal('ONLINE_ROOM');
    });

    // Client listens for Table Sync
    globalP2PClient.onTableSync((sync: TableStateSyncPacket) => {
      const gameStore = useGameStore.getState();
      set({ lastTableSync: sync });

      if (sync.gameNumber) {
        gameStore.setGameNumber(sync.gameNumber);
      }
      gameStore.setCurrentTurnPlayerId(sync.currentTurnPlayerId);
      gameStore.setLeadPlayerId(sync.leadPlayerId ?? null);

      if (sync.currentMoveCards && sync.currentMoveCards.length > 0) {
        const moveCards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
        const combo = identifyCombination(moveCards);
        if (combo) {
          gameStore.setCurrentMove({
            playerId: sync.currentMovePlayerId || '',
            combination: combo,
            timestamp: Date.now(),
            isChop: null,
            choppedPlayerId: null,
            penaltyAmount: null,
            isCascadeChop: null,
            chopChainCount: null,
            chopChainTotalAmount: null
          });
        }
        soundManager.playCardSlap();
      } else {
        gameStore.setCurrentMove(null);
      }

      if (sync.lastActionMessage && sync.lastActionMessage.includes('bỏ lượt')) {
        soundManager.playPass();
      }

      if (sync.remainingCardCounts) {
        gameStore.setDealtCounts(sync.remainingCardCounts);
      }

      if (!sync.isGameOver) {
        useModalStore.getState().closeModal('VICTORY');
        useModalStore.getState().closeModal('ONLINE_ROOM');
      }

      if (sync.isGameOver) {
        gameStore.setIsGameOver(true);
        if (sync.winners.length > 0) {
          const winningPlayers = gameStore.players.filter(p => sync.winners.includes(p.id));
          gameStore.setWinners(winningPlayers);
        }
        useModalStore.getState().openModal('VICTORY');
      }
    });

    // Client listens for Game End
    globalP2PClient.onGameEnd((endPacket: GameEndPacket) => {
      set({ gameEndSummary: endPacket });
      const gameStore = useGameStore.getState();
      gameStore.setIsGameOver(true);
      if (endPacket.winners.length > 0) {
        const winningPlayers = gameStore.players.filter(p => endPacket.winners.includes(p.id));
        gameStore.setWinners(winningPlayers);
      }
      useModalStore.getState().openModal('VICTORY');
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
    const current = get().roomState;
    if (!current || !get().isHost) return;

    // Fill missing slots with Bots if match started with empty slots
    const filledPlayers = [...current.players];
    while (filledPlayers.length < current.playerCount) {
      const idx = filledPlayers.length;
      filledPlayers.push({
        peerId: `bot_${Date.now()}_${idx}`,
        playerId: `p${idx}`,
        name: `Bot Cao Thủ ${idx}`,
        avatar: '🤖',
        elo: 1150,
        coins: 50000,
        isHost: false,
        isReady: true,
        isBot: true
      });
    }

    const updatedState: OnlineRoomState = {
      ...current,
      players: filledPlayers,
      status: 'PLAYING',
      disbandReason: null,
      updatedAt: Date.now()
    };

    set({ roomState: updatedState });
    void globalP2PClient.broadcastRoomState(updatedState);

    // Initialize GameEngine and Host Driver
    const gameStore = useGameStore.getState();
    const customRules = new GameRulesBuilder()
      .withSettlement(updatedState.settlementRule)
      .withChopping((c: ChoppingRulesBuilder) => c
        .multiplier(updatedState.choppingMultiplier)
        .allowFourPairsCutAnytime(updatedState.allowFourPairsCutAnytime)
        .cascadeMultiplier(updatedState.cascadeChopEnabled)
      )
      .withCong((cg: CongRulesBuilder) => cg
        .enabled(updatedState.congEnabled)
      )
      .withGameFlow((f: GameFlowRulesBuilder) => f
        .prohibitEndingWithTwo(updatedState.prohibitEndingWithTwo)
        .threeSpadesEndingBonus(updatedState.threeSpadesEndingBonus)
      )
      .withTable((t: TableRulesBuilder) => t
        .playerCount(updatedState.playerCount)
        .betAmount(updatedState.betAmount)
      )
      .build();

    const initialPlayers: Player[] = filledPlayers.map(p => {
      if (p.isBot) {
        return createBotPlayer(p.playerId, 'BOT_ELO_1150', { name: p.name, avatar: p.avatar, score: p.coins });
      }
      return createPlayer({ id: p.playerId, name: p.name, avatar: p.avatar, score: p.coins });
    });

    gameStore.setPlayers(initialPlayers);
    gameStore.setPlayerCount(updatedState.playerCount);
    gameStore.setGameRules(customRules);
    gameStore.setGameSettings(prev => ({
      ...prev,
      betAmount: updatedState.betAmount,
      mode: updatedState.settlementRule
    }));
    gameStore.setActiveGameType('ONLINE');
    gameStore.setCurrentScreen('GAME_TABLE');
    gameStore.setIsDealing(false);
    useModalStore.getState().closeModal('ONLINE_ROOM');
    useModalStore.getState().closeModal('VICTORY');

    const prevDriver = get().hostDriver;
    const prevGameNumber = prevDriver ? prevDriver.gameNumber : 0;
    const prevWinnerId = prevDriver ? prevDriver.lastWinnerId : null;

    if (prevDriver) {
      prevDriver.cleanup();
    }

    const driver = new HostEngineDriver(globalP2PClient, updatedState, {
      onRoomStateChange: (updatedRoomState) => {
        set({ roomState: updatedRoomState });
        if (updatedRoomState.status === 'DISBANDED') {
          const reason = updatedRoomState.disbandReason || 'Bàn chơi đã tự động giải tán.';
          get().leaveRoom();
          set({
            disbandNotice: {
              title: 'BÀN CHƠI ĐÃ BỊ GIẢI TÁN',
              message: reason
            }
          });
          useModalStore.getState().closeModal('VICTORY');
          useModalStore.getState().closeModal('ONLINE_ROOM');
          useGameStore.getState().resetMatchState();
        }
      },
      onAutoStartMatch: () => {
        get().startMatch();
      }
    });
    driver.gameNumber = prevGameNumber;
    driver.lastWinnerId = prevWinnerId;
    set({ hostDriver: driver });

    driver.startMatch((hostCards) => {
      const currentPlayers = initialPlayers.map((p, idx) => {
        if (idx === 0) {
          return { ...p, hand: hostCards };
        }
        return p;
      });
      gameStore.setGameNumber(driver.gameNumber);
      gameStore.setPlayers(currentPlayers);
      gameStore.setCurrentTurnPlayerId(driver.engine?.currentRound.currentTurnPlayerId || 'p0');
      gameStore.setLeadPlayerId(driver.engine?.currentRound.leadPlayerId || 'p0');
      gameStore.setWinners([]);
      gameStore.setIsGameOver(false);
      gameStore.setCurrentMove(null);
      gameStore.setSelectedCardIds(new Set<string>());
      gameStore.setCurrentHint(null);

      const counts: Record<string, number> = {};
      currentPlayers.forEach(p => {
        counts[p.id] = 13;
      });
      gameStore.setDealtCounts(counts);
      useModalStore.getState().closeModal('VICTORY');
    });
  },

  sendMoveAction: (cardIds: string[]) => {
    const { isHost, hostDriver, myPlayerId } = get();
    const gameStore = useGameStore.getState();

    // Optimistically update local player hand & clear selection
    const currentPlayers = gameStore.players.map(p => {
      if (p.id === myPlayerId) {
        return {
          ...p,
          hand: p.hand.filter(c => !cardIds.includes(c.id))
        };
      }
      return p;
    });
    gameStore.setPlayers(currentPlayers);
    gameStore.clearCardSelection();

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
    const gameStore = useGameStore.getState();
    gameStore.clearCardSelection();

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

  voteRematch: (isReady: boolean) => {
    const { isHost, hostDriver, roomState, myPlayerId } = get();
    if (!roomState) return;

    if (isHost) {
      if (hostDriver) {
        hostDriver.handleRematchVote('p0', isReady);
      } else {
        const updatedPlayers = roomState.players.map(p => {
          if (p.isHost || p.playerId === 'p0') {
            return { ...p, isReady };
          }
          return p;
        });
        const updatedState: OnlineRoomState = {
          ...roomState,
          players: updatedPlayers,
          updatedAt: Date.now()
        };
        set({ roomState: updatedState });
        void globalP2PClient.broadcastRoomState(updatedState);

        const allReady = updatedState.players.every(p => p.isReady);
        if (allReady && updatedState.players.length === updatedState.playerCount) {
          get().startMatch();
        }
      }
    } else {
      const updatedPlayers = roomState.players.map(p => {
        if (p.playerId === myPlayerId) {
          return { ...p, isReady };
        }
        return p;
      });
      set({
        roomState: {
          ...roomState,
          players: updatedPlayers,
          updatedAt: Date.now()
        }
      });

      void globalP2PClient.sendRematchVote({
        playerId: myPlayerId,
        isReady,
        timestamp: Date.now()
      });
    }
  },

  clearDisbandNotice: () => {
    set({ disbandNotice: null });
  },

  leaveRoom: () => {
    const { isHost, hostDriver, roomState } = get();
    if (isHost && hostDriver && roomState && roomState.status !== 'DISBANDED') {
      hostDriver.disbandRoom('Chủ phòng đã giải tán bàn chơi.');
    }
    if (hostDriver) {
      hostDriver.cleanup();
    }
    globalP2PClient.leave();

    useGameStore.getState().resetMatchState();

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
