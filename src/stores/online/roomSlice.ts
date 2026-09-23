import { globalP2PClient } from '../../engine/network/p2p-client';
import { globalLobbyDiscoveryClient } from '../../engine/network/lobby-discovery';
import { 
  type OnlineRoomState, 
  type OnlinePlayer,
  type TableStateSyncPacket,
  type DealHandPacket,
  type GameEndPacket,
  type PublicRoomSummary
} from '../../engine/network/network.schema';
import { createCard } from '../../engine/card';
import { useGameStore } from '../useGameStore';
import { useViewStore } from '../useViewStore';
import { useUserStore } from '../useUserStore';
import { 
  type MatchPlayer, 
  type Card,
  GameRulesBuilder,
  type ChoppingRulesBuilder,
  type CongRulesBuilder,
  type GameFlowRulesBuilder,
  type TableRulesBuilder
} from '../../engine/types';
import { loadPlayerProfile, saveActiveOnlineSession, clearActiveOnlineSession } from '../../engine/storage';
import { createPlayer, updatePlayersHand, maskOpponentHands, revealPlayersHands, cloneMatchPlayer, resetPlayersForNewGame, createMatchPlayerFromProfile } from '../../engine/player-factory';
import { applyAuthoritativeSettlementToProfile } from '../../services/match-settlement-service';
import { createPerspectiveSettlement } from '../../engine/settlement/perspective-settlement';
import { type PlayingTurnMatchState, type GameOverMatchState, createPlayingTurnMatchState } from '../../engine/state-machine/types';
import { type RoomSlice, type OnlineSliceCreator } from './types';
import { P2PHostPeerTransport } from '../../engine/transport/p2p-transport';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';
import { TableSessionFactory } from '../../engine/session/table-session-factory';

let activeJoinRetryTimer: ReturnType<typeof setInterval> | null = null;
let activeJoinSafetyTimeout: ReturnType<typeof setTimeout> | null = null;

function clearJoinTimers(): void {
  if (activeJoinRetryTimer) {
    clearInterval(activeJoinRetryTimer);
    activeJoinRetryTimer = null;
  }
  if (activeJoinSafetyTimeout) {
    clearTimeout(activeJoinSafetyTimeout);
    activeJoinSafetyTimeout = null;
  }
}

export function generateRoomPin(existingRooms: readonly PublicRoomSummary[] = []): string {
  const existingCodes = new Set(existingRooms.map(r => r.roomCode.toUpperCase().trim()));

  for (let attempt = 0; attempt < 50; attempt++) {
    // 1. Kết hợp thời gian mili-giây thực tế + biến thiên ngẫu nhiên
    const now = Date.now();
    const timeComponent = (now % 10000);
    const randomJitter = Math.floor(Math.random() * 9000) + 1000;
    
    // Tạo 4 chữ số phân phối đều từ 1000 đến 9999
    const pinNumber = ((timeComponent + randomJitter + (attempt * 137)) % 9000) + 1000;
    const pin = `TL-${pinNumber}`;

    // 2. Chặn trùng hoàn toàn với các phòng đang hoạt động trong hệ sinh thái
    if (!existingCodes.has(pin)) {
      return pin;
    }
  }

  const fallback = Math.floor(1000 + Math.random() * 9000);
  return `TL-${fallback}`;
}

function syncLobbyBroadcast(roomState: OnlineRoomState): void {
  if (!roomState.isPublic || roomState.status !== 'WAITING') {
    globalLobbyDiscoveryClient.stopBroadcasting();
    return;
  }
  const host = roomState.players.find(p => p.isHost);
  if (!host) return;
  const summary: PublicRoomSummary = {
    roomCode: roomState.roomCode,
    hostName: host.name,
    hostAvatar: host.avatar,
    hostElo: host.elo,
    playerCount: roomState.players.length,
    maxPlayers: roomState.playerCount,
    betAmount: roomState.betAmount,
    settlementRule: roomState.settlementRule,
    choppingMultiplier: roomState.choppingMultiplier,
    congMultiplier: roomState.congMultiplier ?? 1,
    congEnabled: roomState.congEnabled,
    prohibitEndingWithTwo: roomState.prohibitEndingWithTwo,
    allowFourPairsCutAnytime: roomState.allowFourPairsCutAnytime,
    threeSpadesEndingBonus: roomState.threeSpadesEndingBonus,
    cascadeChopEnabled: roomState.cascadeChopEnabled,
    status: roomState.status,
    isPublic: roomState.isPublic,
    updatedAt: Date.now()
  };
  globalLobbyDiscoveryClient.updateBroadcast(summary);
}

export const createRoomSlice: OnlineSliceCreator<RoomSlice> = (set, get) => ({
  sessionState: {
    status: 'IDLE',
    publicRooms: []
  },
  isOnlineMatch: false,
  isHost: false,
  roomCode: null,
  roomState: null,
  myPlayerId: loadPlayerProfile().id,
  connectionStatus: 'IDLE',
  disbandNotice: null,
  reconnectNotice: null,
  publicRooms: [],
  isBrowsingLobby: false,
  isLobbyLoading: false,

  setSessionState: (session) => set({ sessionState: session }),

  startBrowsingLobby: () => {
    set({
      isBrowsingLobby: true,
      isLobbyLoading: true,
      sessionState: {
        status: 'BROWSING_LOBBY',
        publicRooms: get().publicRooms,
        isLoading: true
      }
    });
    globalLobbyDiscoveryClient.startListening((rooms) => {
      set({
        publicRooms: rooms,
        isLobbyLoading: false,
        sessionState: {
          status: 'BROWSING_LOBBY',
          publicRooms: rooms,
          isLoading: false
        }
      });
    });
  },

  stopBrowsingLobby: () => {
    globalLobbyDiscoveryClient.stopListening();
    set({
      isBrowsingLobby: false,
      isLobbyLoading: false,
      sessionState: {
        status: 'IDLE',
        publicRooms: get().publicRooms
      }
    });
  },

  refreshLobbyRooms: () => {
    set({ isLobbyLoading: true });
    globalLobbyDiscoveryClient.requestRoomList();
    setTimeout(() => {
      set({ isLobbyLoading: false });
    }, 400);
  },

  joinPublicRoom: (profile, room) => {
    get().stopBrowsingLobby();
    get().joinRoom(profile, room.roomCode);
  },

  createRoom: (profile, options) => {
    const existingRooms = get().publicRooms;
    const roomCode = generateRoomPin(existingRooms);
    const selfPeerId = globalP2PClient.selfPeerId;
    const isPublic = options.isPublic ?? true;

    const hostPlayer: OnlinePlayer = {
      peerId: selfPeerId,
      playerId: profile.id || loadPlayerProfile().id,
      name: (profile.name && !profile.name.startsWith('usr_')) ? profile.name : 'Chủ Bàn',
      avatar: (profile.avatar && profile.avatar !== '👤') ? profile.avatar : '🤠',
      elo: profile.elo ?? 1000,
      coins: profile.coins ?? 50000,
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
      congMultiplier: options.congMultiplier ?? 1,
      congEnabled: options.congEnabled ?? true,
      prohibitEndingWithTwo: options.prohibitEndingWithTwo ?? true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      players: [hostPlayer],
      status: 'WAITING',
      disbandReason: null,
      isPublic,
      updatedAt: Date.now()
    };

    globalP2PClient.join(roomCode);

    // Bắt đầu phát thanh phòng công khai
    if (isPublic) {
      syncLobbyBroadcast(initialRoomState);
    }

    // Host chủ động phát sóng roomState ngay khi có máy khách kết nối phòng qua Supabase Realtime (Peer Join)
    globalP2PClient.onPeerJoin((peerId) => {
      const current = get().roomState;
      if (current && current.status === 'WAITING') {
        void globalP2PClient.broadcastRoomState(current, peerId);
      }
    });

    // Host lắng nghe yêu cầu tham gia của các máy khách
    globalP2PClient.onJoinRequest((incomingPlayer, peerId) => {
      const current = get().roomState;
      if (!current) return;

      // Xử lý Reconnect khi trận đấu đang diễn ra (PLAYING)
      if (current.status === 'PLAYING') {
        const { hostInstance } = get();
        const existingPlayer = current.players.find(p => p.playerId === incomingPlayer.playerId);
        if (existingPlayer && hostInstance) {
          const updatedPlayers = current.players.map(p => {
            if (p.playerId === incomingPlayer.playerId) {
              return {
                ...p,
                peerId,
                isDisconnected: false,
                disconnectDeadline: null
              };
            }
            return p;
          });
          const reconnectedRoom: OnlineRoomState = {
            ...current,
            players: updatedPlayers,
            updatedAt: Date.now()
          };
          set({ roomState: reconnectedRoom, reconnectNotice: null });
          void globalP2PClient.broadcastRoomState(reconnectedRoom);

          const newHostPeerTransport = new P2PHostPeerTransport(globalP2PClient, peerId, incomingPlayer.playerId);
          hostInstance.handlePlayerReconnect(incomingPlayer.playerId, newHostPeerTransport);
          return;
        }
      }

      if (current.status !== 'WAITING') return;

      const existingPlayer = current.players.find(p => p.peerId === peerId);
      if (existingPlayer) {
        void globalP2PClient.broadcastRoomState(current, peerId);
        return;
      }

      if (current.players.length >= current.playerCount) {
        return; // Phòng đã đầy
      }

      // Kiểm tra tài chính của Khách: số dư phải đủ mức cược tối thiểu
      if (incomingPlayer.coins < current.betAmount) {
        return; // Không đủ tiền cược
      }

      let assignedPlayerId = incomingPlayer.playerId && incomingPlayer.playerId.trim() !== ''
        ? incomingPlayer.playerId
        : `p${current.players.length}`;
      if (current.players.some(p => p.playerId === assignedPlayerId)) {
        assignedPlayerId = `${assignedPlayerId}_${current.players.length}`;
      }
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

      set({
        roomState: updatedState,
        sessionState: {
          status: 'IN_ROOM_WAITING',
          roomCode: updatedState.roomCode,
          roomState: updatedState,
          isHost: true,
          myPlayerId: get().myPlayerId
        }
      });
      void globalP2PClient.broadcastRoomState(updatedState);
      syncLobbyBroadcast(updatedState);
    });

    // Host lắng nghe người chơi thoát phòng (Peer Leave)
    globalP2PClient.onPeerLeave((peerId) => {
      const { hostInstance, roomState, isOnlineMatch } = get();
      if (!isOnlineMatch || !roomState) return;

      if (hostInstance) {
        hostInstance.handlePeerLeave(peerId);
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
        set({
          roomState: updatedRoom,
          sessionState: {
            status: 'IN_ROOM_WAITING',
            roomCode: updatedRoom.roomCode,
            roomState: updatedRoom,
            isHost: true,
            myPlayerId: get().myPlayerId
          }
        });
        void globalP2PClient.broadcastRoomState(updatedRoom);
        syncLobbyBroadcast(updatedRoom);
      }
    });

    // Host lắng nghe Chat
    globalP2PClient.onChat((chat) => {
      set(s => ({ chatMessages: [...s.chatMessages.slice(-50), chat] }));
    });

    // Host lắng nghe bỏ phiếu sẵn sàng chơi lại (Rematch Vote) từ các máy khách
    globalP2PClient.onRematchVote((vote) => {
      const { isHost, hostInstance } = get();
      if (!isHost || !hostInstance) return;
      hostInstance.handleRematchVote(vote.playerId, vote.isReady);
    });

    const hostPlayerId = profile.id || loadPlayerProfile().id;
    useGameStore.setState({
      activeGameType: 'ONLINE',
      myPlayerId: hostPlayerId
    });

    set({
      sessionState: {
        status: 'IN_ROOM_WAITING',
        roomCode,
        roomState: initialRoomState,
        isHost: true,
        myPlayerId: hostPlayerId
      },
      isOnlineMatch: true,
      isHost: true,
      roomCode,
      roomState: initialRoomState,
      myPlayerId: hostPlayerId,
      connectionStatus: 'CONNECTED',
      chatMessages: [],
      lastTableSync: null,
      gameEndSummary: null,
      disbandNotice: null
    });
  },

  joinRoom: (profile, roomCode) => {
    clearJoinTimers();
    let formattedCode = roomCode.toUpperCase().trim();
    if (!formattedCode.startsWith('TL-') && /^[A-Z0-9]{4}$/.test(formattedCode)) {
      formattedCode = `TL-${formattedCode}`;
    }
    globalP2PClient.join(formattedCode);

    useGameStore.setState({
      activeGameType: 'ONLINE'
    });

    set({
      sessionState: {
        status: 'CONNECTING',
        targetRoomCode: formattedCode,
        attemptCount: 1
      },
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
      playerId: profile.id || loadPlayerProfile().id,
      name: (profile.name && !profile.name.startsWith('usr_')) ? profile.name : 'Đấu Thủ',
      avatar: (profile.avatar && profile.avatar !== '👤') ? profile.avatar : '🤠',
      elo: profile.elo ?? 1000,
      coins: profile.coins ?? 50000,
      isHost: false,
      isReady: true,
      isBot: false
    };

    // Client lắng nghe cập nhật Room State từ Host
    globalP2PClient.onRoomState((roomState) => {
      if (roomState.status === 'DISBANDED') {
        const reason = roomState.disbandReason || 'Bàn chơi đã được giải tán do có người chơi thoát trận.';
        get().leaveRoom();
        set({
          disbandNotice: {
            title: 'BÀN CHƠI ĐÃ BỊ GIẢI TÁN',
            message: reason
          }
        });
        useViewStore.getState().closeModal('VICTORY');
        useViewStore.getState().closeModal('ONLINE_ROOM');
        useGameStore.getState().resetMatchState();
        return;
      }

      // Tự động dập tắt banner Reconnect nếu toàn bộ người chơi đã kết nối ổn định
      if (roomState.players.every(p => !p.isDisconnected)) {
        set({ reconnectNotice: null });
      }

      // Kiểm tra tài chính của Khách (Guest) so với mức cược của phòng
      const userProfile = useUserStore.getState().profile;
      if (userProfile.coins < roomState.betAmount) {
        get().leaveRoom();
        set({
          disbandNotice: {
            title: 'KHÔNG ĐỦ TIỀN CƯỢC',
            message: `Số dư ví của bạn (${userProfile.coins.toLocaleString()} Xu) không đủ để tham gia phòng có mức cược ${roomState.betAmount.toLocaleString()} Xu/lá. Vui lòng nạp thêm hoặc mở Ngân Hàng để vay vốn/nhận trợ cấp!`
          }
        });
        useViewStore.getState().closeModal('VICTORY');
        useViewStore.getState().closeModal('ONLINE_ROOM');
        useGameStore.getState().resetMatchState();
        return;
      }

      const me = roomState.players.find(p => p.peerId === globalP2PClient.selfPeerId);
      const myId = me ? me.playerId : get().myPlayerId;
      const isPlaying = roomState.status === 'PLAYING';

      // Nếu nhận roomState từ Host nhưng mình chưa được ghi nhận vào danh sách players
      if (!me && roomState.status === 'WAITING' && roomState.players.length < roomState.playerCount) {
        void globalP2PClient.sendJoinRequest(candidatePlayer, roomState.hostPeerId);
        void globalP2PClient.sendJoinRequest(candidatePlayer);
      }

      if (me) {
        clearJoinTimers();
      }

      useGameStore.setState({
        myPlayerId: myId,
        activeGameType: 'ONLINE'
      });

      set({
        sessionState: isPlaying ? {
          status: 'IN_ROOM_PLAYING',
          roomCode: roomState.roomCode,
          roomState,
          isHost: false,
          myPlayerId: myId
        } : {
          status: 'IN_ROOM_WAITING',
          roomCode: roomState.roomCode,
          roomState,
          isHost: false,
          myPlayerId: myId
        },
        roomState,
        connectionStatus: 'CONNECTED',
        myPlayerId: myId
      });

      if (roomState.status === 'PLAYING') {
        saveActiveOnlineSession({
          roomCode: roomState.roomCode,
          playerId: myId,
          savedAt: Date.now()
        });

        const gameStore = useGameStore.getState();
        useViewStore.getState().closeModal('ONLINE_ROOM');
        useViewStore.getState().closeModal('VICTORY');
        gameStore.setCurrentScreen('GAME_TABLE');
        gameStore.setActiveGameType('ONLINE');
        gameStore.setIsGameOver(false);
        gameStore.setInstantWinType(undefined);
        gameStore.setWinners([]);
        gameStore.clearCardSelection();
        gameStore.setCurrentMove(null);
        gameStore.setCurrentHint(null);

        const customRules = new GameRulesBuilder()
          .withSettlement(roomState.settlementRule)
          .withChopping((c: ChoppingRulesBuilder) => c
            .multiplier(roomState.choppingMultiplier)
            .allowFourPairsCutAnytime(roomState.allowFourPairsCutAnytime)
            .cascadeMultiplier(roomState.cascadeChopEnabled)
          )
          .withCong((cg: CongRulesBuilder) => cg
            .enabled(roomState.congEnabled)
            .multiplier(roomState.congMultiplier ?? 1)
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

        gameStore.setPlayerCount(roomState.playerCount);
        gameStore.setGameRules(customRules);
        gameStore.setGameSettings(prev => ({
          ...prev,
          betAmount: roomState.betAmount,
          mode: roomState.settlementRule
        }));

        const existingSession = appFlowCoordinator.getActiveSession();
        if (!existingSession) {
          const initialPlayers: MatchPlayer[] = roomState.players.map(p => {
            return createPlayer({ id: p.playerId, name: p.name, avatar: p.avatar, score: p.coins, hand: [] });
          });
          gameStore.setPlayers(initialPlayers);
          gameStore.setIsDealing(false);

          if (!get().isHost && roomState.hostPeerId) {
            const clientSession = TableSessionFactory.createOnlineGuestSession({
              hostPeerId: roomState.hostPeerId,
              localPlayerId: myId,
              rules: customRules,
              initialPlayers
            });

            appFlowCoordinator.setActiveSession(clientSession);
          }
        } else {
          // Phiên chơi đã tồn tại (Rematch Ván 2+): Giữ nguyên bài đã chia, chỉ đồng bộ lại điểm số
          gameStore.setPlayers(prevPlayers => {
            return prevPlayers.map(prev => {
              const roomPlayer = roomState.players.find(rp => rp.playerId === prev.id);
              if (roomPlayer) {
                return cloneMatchPlayer(prev, { score: roomPlayer.coins });
              }
              return prev;
            });
          });
        }
      }
    });

    // Client lắng nghe khi Host hoặc Peer rời phòng
    globalP2PClient.onPeerLeave((peerId) => {
      const { roomState, isOnlineMatch } = get();
      if (!isOnlineMatch || !roomState) return;

      if (peerId === roomState.hostPeerId) {
        get().leaveRoom();
        set({
          disbandNotice: {
            title: 'BÀN CHƠI ĐÃ BỊ GIẢI TÁN',
            message: 'Chủ phòng đã thoát khỏi trận đấu hoặc mất kết nối mạng. Bàn chơi đã tự động giải tán.'
          }
        });
        useViewStore.getState().closeModal('VICTORY');
        useViewStore.getState().closeModal('ONLINE_ROOM');
        useGameStore.getState().resetMatchState();
      }
    });

    globalP2PClient.onDealHand((dealPacket: DealHandPacket, senderPeerId?: string) => {
      const gameStore = useGameStore.getState();
      const room = get().roomState;

      const selfPeerId = globalP2PClient.selfPeerId;
      const me = room?.players.find(p => p.peerId === selfPeerId);
      const myId = dealPacket.playerId || (me ? me.playerId : get().myPlayerId);
      set({ myPlayerId: myId });

      const cards = dealPacket.cards.map(c => createCard(c.rank, c.suit));
      const hostPeerId = room?.hostPeerId || senderPeerId || 'host';

      const basePlayers = (room && room.players.length > 0)
        ? room.players.map(p => createPlayer({ id: p.playerId, name: p.name, avatar: p.avatar, score: p.coins }))
        : (gameStore.players.length > 0
          ? gameStore.players
          : [
              createPlayer({ id: hostPeerId, name: 'Chủ Bàn', avatar: '🤠', score: 50000 }),
              createPlayer({ id: myId, name: 'Đấu Thủ', avatar: '🤠', score: 50000 })
            ]);

      const currentPlayers = updatePlayersHand(
        maskOpponentHands(basePlayers, myId),
        myId,
        cards
      );

      if (!get().isHost && !appFlowCoordinator.getActiveSession()) {
        const clientSession = TableSessionFactory.createOnlineGuestSession({
          hostPeerId,
          localPlayerId: myId,
          rules: gameStore.gameRules,
          initialPlayers: currentPlayers
        });

        appFlowCoordinator.setActiveSession(clientSession);
      }

      const isFirstMoveOfGame = dealPacket.isFirstMoveOfGame ?? false;
      const isLeadMove = dealPacket.isLeadMove ?? true;

      gameStore.setMyPlayerId(myId);
      gameStore.setPlayers(prevPlayers => {
        if (prevPlayers && prevPlayers.length > 0) {
          return resetPlayersForNewGame(prevPlayers, myId, cards);
        }
        return currentPlayers;
      });
      const validatedCount: 2 | 3 | 4 = room?.playerCount === 2 ? 2 : room?.playerCount === 3 ? 3 : 4;
      gameStore.setPlayerCount(validatedCount);
      if (dealPacket.gameNumber) {
        gameStore.setGameNumber(dealPacket.gameNumber);
      }
      gameStore.setCurrentTurnPlayerId(dealPacket.firstTurnPlayerId);
      gameStore.setLeadPlayerId(dealPacket.leadPlayerId);
      const requiredCard = isFirstMoveOfGame && dealPacket.firstMoveRequiredCard
        ? createCard(dealPacket.firstMoveRequiredCard.rank, dealPacket.firstMoveRequiredCard.suit)
        : null;

      gameStore.setIsFirstMoveOfGame(isFirstMoveOfGame);
      gameStore.setFirstMoveRequiredCard(requiredCard);
      gameStore.setIsLeadMove(isLeadMove);
      gameStore.setWinners([]);
      gameStore.setIsGameOver(false);
      gameStore.setCurrentMove(null);
      gameStore.setSelectedCardIds(new Set<string>());
      gameStore.setCurrentHint(null);
      gameStore.setActiveGameType('ONLINE');
      gameStore.setCurrentScreen('GAME_TABLE');

      if (!gameStore.isDealing) {
        const playingState: PlayingTurnMatchState = createPlayingTurnMatchState({
          status: 'PLAYING',
          gameNumber: dealPacket.gameNumber,
          roundNumber: 1,
          players: currentPlayers,
          currentTurnPlayerId: dealPacket.firstTurnPlayerId,
          leadPlayerId: dealPacket.leadPlayerId,
          roundMoves: [],
          leadingMove: null,
          isLeadMove,
          isFirstMoveOfGame,
          firstMoveRequiredCard: requiredCard,
          passedPlayerIds: [],
          chopNotification: null,
          botThinkingThought: null,
          rules: gameStore.gameRules
        });
        gameStore.setMatchState(playingState);

        const counts: Record<string, number> = {};
        currentPlayers.forEach(p => {
          counts[p.id] = 13;
        });
        gameStore.setDealtCounts(counts);
      }

      useViewStore.getState().closeModal('VICTORY');
      useViewStore.getState().closeModal('ONLINE_ROOM');
    });

    // Client lắng nghe đồng bộ bàn đấu công khai từ Host (Authoritative Single Source of Truth)
    globalP2PClient.onTableSync((sync: TableStateSyncPacket) => {
      set({ 
        lastTableSync: sync,
        reconnectNotice: sync.reconnectNotice ?? null
      });
      useGameStore.getState().applyAuthoritativeTableSync(sync);
    });

    // Client lắng nghe gói tin kết thúc ván đấu & kết toán
    globalP2PClient.onGameEnd((endPacket: GameEndPacket) => {
      clearActiveOnlineSession();
      set({ gameEndSummary: endPacket });
      const gameStore = useGameStore.getState();

      // Tiết lộ bài tàn cuộc của đối thủ
      let updatedPlayers = gameStore.players;
      if (endPacket.allPlayerHands) {
        const revealedMap: Record<string, Card[]> = {};
        for (const [pid, remoteCards] of Object.entries(endPacket.allPlayerHands)) {
          revealedMap[pid] = remoteCards.map(c => createCard(c.rank, c.suit));
        }
        updatedPlayers = revealPlayersHands(gameStore.players, revealedMap);
      }

      // Cập nhật điểm số/xu từ Server Authoritative packet
      if (endPacket.playerScores) {
        updatedPlayers = updatedPlayers.map(p => {
          const score = endPacket.playerScores[p.id];
          return score !== undefined ? { ...p, score } : p;
        });
      }
      gameStore.setPlayers(updatedPlayers);

      const onlineId = get().myPlayerId;
      const gameStoreId = gameStore.myPlayerId;
      const myId = updatedPlayers.some(p => p.id === onlineId)
        ? onlineId
        : (updatedPlayers.some(p => p.id === gameStoreId) ? gameStoreId : null);

      if (!myId) {
        throw new Error(`[roomSlice:onGameEnd] Invariant violated: Local player identity (${onlineId} / ${gameStoreId}) not found among match players`);
      }

      gameStore.setMyPlayerId(myId);
      set({ myPlayerId: myId });

      const myEloDelta = endPacket.eloDeltas[myId] || 0;
      const isMyWin = endPacket.winners.length > 0 && endPacket.winners[0] === myId;

      gameStore.setMatchPayouts(endPacket.payouts);
      gameStore.setLastEloDelta(myEloDelta);
      gameStore.setAllEloDeltas(endPacket.eloDeltas);
      gameStore.setIsGameOver(true);

      const winningPlayers = endPacket.winners.length > 0
        ? endPacket.winners
            .map(id => updatedPlayers.find(p => p.id === id))
            .filter((p): p is MatchPlayer => p !== undefined && p !== null)
        : [];

      if (winningPlayers.length > 0) {
        gameStore.setWinners(winningPlayers);
      }

      const currentWinningMove = gameStore.currentMove ?? (gameStore.matchState.status === 'PLAYING' ? gameStore.matchState.leadingMove : (gameStore.matchState.status === 'GAME_OVER' ? gameStore.matchState.winningMove : null));

      // Cập nhật Profile cho Client/Guest qua Single Source of Truth tập trung
      const congsGivenCount = isMyWin
        ? gameStore.players.filter(p => p.id !== myId && (gameStore.dealtCounts[p.id] === 13 || p.hand.length === 13)).length
        : 0;

      const { updatedProfile } = applyAuthoritativeSettlementToProfile({
        humanPlayerId: myId,
        payouts: endPacket.payouts,
        eloDeltas: endPacket.eloDeltas,
        eloDelta: myEloDelta,
        isVictoryModalRanked: true,
        winners: winningPlayers,
        allPlayers: updatedPlayers,
        betAmount: get().roomState?.betAmount ?? gameStore.gameRules.table.betAmount,
        isThreeSpadesWin: endPacket.isThreeSpadesWin ?? false,
        instantWinType: endPacket.instantWinType ?? null,
        heldDeposit: 0,
        congsGivenCount,
        activeGameType: 'ONLINE'
      });

      const perspectiveSettlement = createPerspectiveSettlement({
        subjectPlayerId: myId,
        allPlayers: updatedPlayers,
        winners: winningPlayers,
        payouts: endPacket.payouts,
        eloDeltas: endPacket.eloDeltas,
        subjectEloDelta: myEloDelta,
        subjectEloBreakdown: null,
        loanDeduction: endPacket.loanDeduction ?? 0,
        isThreeSpadesWin: endPacket.isThreeSpadesWin ?? false,
        instantWinType: endPacket.instantWinType ?? null,
        activeGameType: 'ONLINE',
        betAmount: get().roomState?.betAmount ?? gameStore.gameRules.table.betAmount,
        subjectCoins: updatedProfile.coins
      });
      gameStore.setPerspectiveSettlement(perspectiveSettlement);

      const gameOverState: GameOverMatchState = {
        status: 'GAME_OVER',
        gameNumber: gameStore.gameNumber,
        players: updatedPlayers,
        winners: winningPlayers,
        winningMove: currentWinningMove,
        isThreeSpadesWin: false,
        matchPayouts: endPacket.payouts,
        eloDeltas: endPacket.eloDeltas,
        settlement: perspectiveSettlement,
        matchLogReport: null,
        rules: gameStore.gameRules
      };
      gameStore.setMatchState(gameOverState);

      useViewStore.getState().openModal('VICTORY');
    });

    // Client lắng nghe Chat
    globalP2PClient.onChat((chat) => {
      set(s => ({ chatMessages: [...s.chatMessages.slice(-50), chat] }));
    });

    // Handshake đa tầng
    globalP2PClient.onPeerJoin((peerId) => {
      void globalP2PClient.sendJoinRequest(candidatePlayer, peerId);
      void globalP2PClient.sendJoinRequest(candidatePlayer);
    });

    // Thử gửi ngay 1 lần lập tức và định kỳ mỗi 1000ms tối đa 8 lần nếu chưa được ghi nhận vào phòng
    void globalP2PClient.sendJoinRequest(candidatePlayer);
    let attempts = 0;
    activeJoinRetryTimer = setInterval(() => {
      attempts++;
      const current = get();
      const meInRoom = current.roomState?.players.some(p => p.peerId === globalP2PClient.selfPeerId);
      if (!meInRoom && current.isOnlineMatch && !current.isHost && attempts <= 8) {
        void globalP2PClient.sendJoinRequest(candidatePlayer);
      } else {
        if (activeJoinRetryTimer) {
          clearInterval(activeJoinRetryTimer);
          activeJoinRetryTimer = null;
        }
      }
    }, 1000);

    // Timer an toàn 25s nếu không kết nối được tới Host
    activeJoinSafetyTimeout = setTimeout(() => {
      const current = get();
      if (current.sessionState.status === 'CONNECTING' && current.roomState === null && !current.isHost) {
        set({
          connectionStatus: 'DISCONNECTED',
          disbandNotice: {
            title: 'KẾT NỐI KHÔNG THÀNH CÔNG',
            message: 'Không tìm thấy phòng hoặc không thể kết nối tới chủ bàn. Vui lòng kiểm tra lại mã PIN và đảm bảo chủ phòng đang mở bàn!'
          }
        });
        current.leaveRoom();
      }
    }, 25000);
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

    set({
      roomState: updatedState,
      sessionState: {
        status: 'IN_ROOM_WAITING',
        roomCode: updatedState.roomCode,
        roomState: updatedState,
        isHost: true,
        myPlayerId: get().myPlayerId
      }
    });
    void globalP2PClient.broadcastRoomState(updatedState);
    syncLobbyBroadcast(updatedState);
  },

  clearDisbandNotice: () => {
    set({ disbandNotice: null });
  },

  clearReconnectNotice: () => {
    set({ reconnectNotice: null });
  },

  leaveRoom: () => {
    clearJoinTimers();
    clearActiveOnlineSession();
    globalLobbyDiscoveryClient.stopBroadcasting();
    const { isHost, hostInstance, roomState } = get();
    if (isHost && hostInstance && roomState && roomState.status !== 'DISBANDED') {
      hostInstance.dispose();
    }
    appFlowCoordinator.setActiveSession(null);
    globalP2PClient.leave();

    const defaultProfile = loadPlayerProfile();
    const defaultProfileId = defaultProfile.id;
    useGameStore.getState().setCurrentScreen('LOBBY');
    useGameStore.getState().setActiveGameType('QUICK');
    useGameStore.getState().setMyPlayerId(defaultProfileId);
    useGameStore.getState().resetMatchState();
    useGameStore.getState().setPlayers([createMatchPlayerFromProfile(defaultProfile)]);

    set({
      sessionState: {
        status: 'IDLE',
        publicRooms: get().publicRooms
      },
      isOnlineMatch: false,
      isHost: false,
      roomCode: null,
      roomState: null,
      myPlayerId: defaultProfileId,
      connectionStatus: 'IDLE',
      chatMessages: [],
      lastTableSync: null,
      gameEndSummary: null,
      reconnectNotice: null,
      hostInstance: null
    });
  }
});
