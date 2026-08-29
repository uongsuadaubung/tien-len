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
import { identifyCombination } from '../../engine/combinations';
import { soundManager } from '../../ui/audio/sound-manager';
import { useGameStore } from '../useGameStore';
import { useModalStore } from '../useModalStore';
import { useUserStore } from '../useUserStore';
import { 
  type Player, 
  GameRulesBuilder,
  type ChoppingRulesBuilder,
  type CongRulesBuilder,
  type GameFlowRulesBuilder,
  type TableRulesBuilder 
} from '../../engine/types';
import { type PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { createPlayer, createBotPlayer } from '../../engine/player-factory';
import { GameEventBus, type MatchCompletedEvent } from '../../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../../engine/evaluators/progress-evaluators';
import { type RoomSlice, type OnlineSliceCreator } from './types';

export function generateRoomPin(existingRooms: PublicRoomSummary[] = []): string {
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
  const host = roomState.players.find(p => p.isHost) || roomState.players[0];
  const summary: PublicRoomSummary = {
    roomCode: roomState.roomCode,
    hostName: host?.name || 'Chủ Bàn',
    hostAvatar: host?.avatar || '🤠',
    hostElo: host?.elo || 1000,
    playerCount: roomState.players.length,
    maxPlayers: roomState.playerCount,
    betAmount: roomState.betAmount,
    settlementRule: roomState.settlementRule,
    choppingMultiplier: roomState.choppingMultiplier,
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
  isOnlineMatch: false,
  isHost: false,
  roomCode: null,
  roomState: null,
  myPlayerId: 'p0',
  connectionStatus: 'IDLE',
  disbandNotice: null,
  publicRooms: [],
  isBrowsingLobby: false,
  isLobbyLoading: false,

  startBrowsingLobby: () => {
    set({ isBrowsingLobby: true, isLobbyLoading: true });
    globalLobbyDiscoveryClient.startListening((rooms) => {
      set({ publicRooms: rooms, isLobbyLoading: false });
    });
  },

  stopBrowsingLobby: () => {
    globalLobbyDiscoveryClient.stopListening();
    set({ isBrowsingLobby: false, isLobbyLoading: false });
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
        set({ roomState: updatedRoom });
        void globalP2PClient.broadcastRoomState(updatedRoom);
        syncLobbyBroadcast(updatedRoom);
      }
    });

    // Host lắng nghe Chat
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
        useModalStore.getState().closeModal('VICTORY');
        useModalStore.getState().closeModal('ONLINE_ROOM');
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
        useModalStore.getState().closeModal('VICTORY');
        useModalStore.getState().closeModal('ONLINE_ROOM');
        useGameStore.getState().resetMatchState();
      }
    });

    // Client lắng nghe gói tin chia 13 lá riêng tư
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

    // Client lắng nghe đồng bộ bàn đấu công khai
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
          const winningPlayers = sync.winners
            .map(id => gameStore.players.find(p => p.id === id))
            .filter((p): p is Player => p !== undefined && p !== null);
          gameStore.setWinners(winningPlayers);
        }
        useModalStore.getState().openModal('VICTORY');
      }
    });

    // Client lắng nghe gói tin kết thúc ván đấu & kết toán
    globalP2PClient.onGameEnd((endPacket: GameEndPacket) => {
      set({ gameEndSummary: endPacket });
      const gameStore = useGameStore.getState();
      const myId = get().myPlayerId;
      const myPayout = endPacket.payouts[myId] || 0;
      const myEloDelta = endPacket.eloDeltas[myId] || 0;
      const isMyWin = endPacket.winners.length > 0 && endPacket.winners[0] === myId;

      gameStore.setMatchPayouts(endPacket.payouts);
      gameStore.setLastEloDelta(myEloDelta);
      gameStore.setAllEloDeltas(endPacket.eloDeltas);
      gameStore.setIsGameOver(true);

      // Tiết lộ bài tàn cuộc của đối thủ
      let updatedPlayers = gameStore.players;
      if (endPacket.allPlayerHands) {
        updatedPlayers = gameStore.players.map(p => {
          const remoteCards = endPacket.allPlayerHands[p.id];
          if (remoteCards && p.id !== myId) {
            return {
              ...p,
              hand: remoteCards.map(c => createCard(c.rank, c.suit))
            };
          }
          return p;
        });
        gameStore.setPlayers(updatedPlayers);
      }

      if (endPacket.winners.length > 0) {
        const winningPlayers = endPacket.winners
          .map(id => updatedPlayers.find(p => p.id === id))
          .filter((p): p is Player => p !== undefined && p !== null);
        gameStore.setWinners(winningPlayers);
      }

      useModalStore.getState().openModal('VICTORY');

      // Cập nhật Profile cho Client/Guest
      const userStore = useUserStore.getState();
      const currentProfile = userStore.profile;
      const nextCoins = Math.max(0, currentProfile.coins + myPayout);
      const nextElo = Math.max(0, currentProfile.elo + myEloDelta);
      const nextWins = isMyWin ? currentProfile.stats.wins + 1 : currentProfile.stats.wins;
      const nextCurrentStreak = isMyWin ? currentProfile.stats.currentStreak + 1 : 0;
      const nextHighestStreak = Math.max(currentProfile.stats.highestStreak, nextCurrentStreak);
      const nextTotalEarned = myPayout > 0 ? currentProfile.stats.totalEarned + myPayout : currentProfile.stats.totalEarned;

      const updatedProfile: PlayerProfile = {
        ...currentProfile,
        coins: nextCoins,
        elo: nextElo,
        stats: {
          ...currentProfile.stats,
          gamesPlayed: currentProfile.stats.gamesPlayed + 1,
          wins: nextWins,
          currentStreak: nextCurrentStreak,
          highestStreak: nextHighestStreak,
          totalEarned: nextTotalEarned
        }
      };

      const congsGivenCount = isMyWin
        ? gameStore.players.filter(p => p.id !== myId && (gameStore.dealtCounts[p.id] === 13 || p.hand.length === 13)).length
        : 0;

      const matchCompletedEvent: MatchCompletedEvent = {
        type: 'MATCH_COMPLETED',
        activeGameType: 'ONLINE',
        winnerPlayerId: endPacket.winners[0] || myId,
        isHumanWinner: isMyWin,
        winners: gameStore.winners,
        allPlayers: gameStore.players,
        payouts: endPacket.payouts,
        humanNetCoins: myPayout,
        totalHumanCoins: nextCoins,
        betAmount: get().roomState?.betAmount || 1000,
        isThreeSpadesWin: false,
        playerCount: gameStore.players.length,
        congsGivenCount,
        cascadeChopCount: 0,
        loanDeduction: 0,
        instantWinType: null
      };

      const finalQuests = evaluateDailyQuests([matchCompletedEvent], updatedProfile.dailyQuests, updatedProfile);
      const finalAchievements = evaluateAchievements([matchCompletedEvent], updatedProfile.achievements, updatedProfile);
      updatedProfile.dailyQuests = finalQuests;
      updatedProfile.achievements = finalAchievements;

      userStore.setProfile(updatedProfile);
      savePlayerProfile(updatedProfile);
      GameEventBus.getInstance().publish(matchCompletedEvent);

      useModalStore.getState().openModal('VICTORY');
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
    syncLobbyBroadcast(updatedState);
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
    syncLobbyBroadcast(updatedState);
  },

  clearDisbandNotice: () => {
    set({ disbandNotice: null });
  },

  leaveRoom: () => {
    globalLobbyDiscoveryClient.stopBroadcasting();
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
});
