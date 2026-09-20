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
  type Player, 
  GameRulesBuilder,
  type ChoppingRulesBuilder,
  type CongRulesBuilder,
  type GameFlowRulesBuilder,
  type TableRulesBuilder
} from '../../engine/types';
import { loadPlayerProfile } from '../../engine/storage';
import { createPlayer } from '../../engine/player-factory';
import { applyAuthoritativeSettlementToProfile } from '../../services/match-settlement-service';
import { createPerspectiveSettlement } from '../../engine/settlement/perspective-settlement';
import { type PlayingTurnMatchState, type GameOverMatchState, createPlayingTurnMatchState } from '../../engine/state-machine/types';
import { type RoomSlice, type OnlineSliceCreator } from './types';
import { GuestEngineDriver } from '../../engine/network/guest-engine-driver';

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

    // Host lắng nghe yêu cầu tham gia của các máy khách
    globalP2PClient.onJoinRequest((incomingPlayer, peerId) => {
      const current = get().roomState;
      if (!current || current.status !== 'WAITING') return;

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
    const formattedCode = roomCode.toUpperCase().trim();
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
          myPlayerId: myId,
          hostDriver: null
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
        const gameStore = useGameStore.getState();
        useViewStore.getState().closeModal('ONLINE_ROOM');
        useViewStore.getState().closeModal('VICTORY');

        if (!get().isHost && !get().guestDriver) {
          const guestDriver = new GuestEngineDriver({
            p2pClient: globalP2PClient,
            myPlayerId: myId
          });
          set({ guestDriver });
        }

        const currentPlayersMap = new Map(gameStore.players.map(p => [p.id, p]));

        const initialPlayers: Player[] = roomState.players.map(p => {
          const existing = currentPlayersMap.get(p.playerId);
          const hand = existing ? existing.hand : [];
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

    // Client lắng nghe gói tin chia 13 lá riêng tư
    globalP2PClient.onDealHand((dealPacket: DealHandPacket) => {
      const gameStore = useGameStore.getState();
      const room = get().roomState;
      const selfPeerId = globalP2PClient.selfPeerId;
      const me = room?.players.find(p => p.peerId === selfPeerId);
      const myId = dealPacket.playerId || me?.playerId || get().myPlayerId;
      set({ myPlayerId: myId });

      const cards = dealPacket.cards.map(c => createCard(c.rank, c.suit));

      const basePlayers = room && room.players.length > 0
        ? room.players.map(p => {
            return createPlayer({ id: p.playerId, name: p.name, avatar: p.avatar, score: p.coins });
          })
        : (gameStore.players.length > 0 ? gameStore.players : [
            createPlayer({ id: room?.hostPeerId || 'host', name: 'Chủ Bàn', avatar: '🤠', score: 50000 }),
            createPlayer({ id: myId, name: 'Đấu Thủ', avatar: '🤠', score: 50000 })
          ]);

      const currentPlayers = basePlayers.map((p) => {
        if (p.id === myId) {
          return { ...p, hand: cards };
        }
        return { ...p, hand: [] };
      });

      if (!get().isHost && !get().guestDriver) {
        const guestDriver = new GuestEngineDriver({
          p2pClient: globalP2PClient,
          myPlayerId: myId
        });
        set({ guestDriver });
      }

      const isFirstMoveOfGame = dealPacket.isFirstMoveOfGame ?? false;
      const isLeadMove = dealPacket.isLeadMove ?? true;

      gameStore.setMyPlayerId(myId);
      gameStore.setPlayers(currentPlayers);
      const validatedCount: 2 | 3 | 4 = room?.playerCount === 2 ? 2 : room?.playerCount === 3 ? 3 : 4;
      gameStore.setPlayerCount(validatedCount);
      if (dealPacket.gameNumber) {
        gameStore.setGameNumber(dealPacket.gameNumber);
      }
      gameStore.setCurrentTurnPlayerId(dealPacket.firstTurnPlayerId);
      gameStore.setLeadPlayerId(dealPacket.leadPlayerId);
      gameStore.setIsFirstMoveOfGame(isFirstMoveOfGame);
      gameStore.setIsLeadMove(isLeadMove);
      gameStore.setWinners([]);
      gameStore.setIsGameOver(false);
      gameStore.setIsDealing(false);
      gameStore.setCurrentMove(null);
      gameStore.setSelectedCardIds(new Set<string>());
      gameStore.setCurrentHint(null);
      gameStore.setActiveGameType('ONLINE');
      gameStore.setCurrentScreen('GAME_TABLE');

      const playingState: PlayingTurnMatchState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: dealPacket.gameNumber || 1,
        roundNumber: 1,
        players: currentPlayers,
        currentTurnPlayerId: dealPacket.firstTurnPlayerId,
        leadPlayerId: dealPacket.leadPlayerId,
        roundMoves: [],
        leadingMove: null,
        isLeadMove,
        isFirstMoveOfGame,
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

      useViewStore.getState().closeModal('VICTORY');
      useViewStore.getState().closeModal('ONLINE_ROOM');
    });

    // Client lắng nghe đồng bộ bàn đấu công khai từ Host (Authoritative Single Source of Truth)
    globalP2PClient.onTableSync((sync: TableStateSyncPacket) => {
      set({ lastTableSync: sync });
      useGameStore.getState().applyAuthoritativeTableSync(sync);
    });

    // Client lắng nghe gói tin kết thúc ván đấu & kết toán
    globalP2PClient.onGameEnd((endPacket: GameEndPacket) => {
      set({ gameEndSummary: endPacket });
      const gameStore = useGameStore.getState();

      // Tiết lộ bài tàn cuộc của đối thủ
      let updatedPlayers = gameStore.players;
      if (endPacket.allPlayerHands) {
        updatedPlayers = gameStore.players.map(p => {
          const remoteCards = endPacket.allPlayerHands[p.id];
          if (remoteCards) {
            return {
              ...p,
              hand: remoteCards.map(c => createCard(c.rank, c.suit))
            };
          }
          return p;
        });
        gameStore.setPlayers(updatedPlayers);
      }

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
            .filter((p): p is Player => p !== undefined && p !== null)
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
        loanDeduction: endPacket.loanDeduction ?? 0,
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

    // Handshake
    globalP2PClient.onPeerJoin(() => {
      void globalP2PClient.sendJoinRequest(candidatePlayer);
    });

    setTimeout(() => {
      void globalP2PClient.sendJoinRequest(candidatePlayer);
    }, 500);
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

  leaveRoom: () => {
    globalLobbyDiscoveryClient.stopBroadcasting();
    const { isHost, hostDriver, guestDriver, roomState } = get();
    if (isHost && hostDriver && roomState && roomState.status !== 'DISBANDED') {
      hostDriver.disbandRoom('Chủ phòng đã giải tán bàn chơi.');
    }
    if (hostDriver) {
      hostDriver.cleanup();
    }
    if (guestDriver) {
      guestDriver.cleanup();
    }
    globalP2PClient.leave();

    const defaultProfileId = loadPlayerProfile().id;
    useGameStore.getState().setCurrentScreen('LOBBY');
    useGameStore.getState().setActiveGameType('QUICK');
    useGameStore.getState().setMyPlayerId(defaultProfileId);
    useGameStore.getState().resetMatchState();

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
      hostDriver: null,
      guestDriver: null
    });
  }
});
