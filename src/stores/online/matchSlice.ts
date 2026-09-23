import { globalP2PClient } from '../../engine/network/p2p-client';
import { globalLobbyDiscoveryClient } from '../../engine/network/lobby-discovery';
import { type OnlineRoomState } from '../../engine/network/network.schema';
import { PlayerCountSchema } from '../../engine/schemas/settings.schema';
import { AuthoritativeMatchHost } from '../../engine/server/match-host';
import { useGameStore } from '../useGameStore';
import { useViewStore } from '../useViewStore';
import { 
  type MatchPlayer, 
  GameRulesBuilder,
  type ChoppingRulesBuilder,
  type CongRulesBuilder,
  type GameFlowRulesBuilder,
  type TableRulesBuilder 
} from '../../engine/types';
import { createPlayer, resetPlayersForNewGame } from '../../engine/player-factory';
import { type MatchSlice, type OnlineSliceCreator } from './types';
import { P2PHostPeerTransport } from '../../engine/transport/p2p-transport';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';
import { saveActiveOnlineSession, clearActiveOnlineSession } from '../../engine/storage';
import { TableSessionFactory } from '../../engine/session/table-session-factory';

export const createMatchSlice: OnlineSliceCreator<MatchSlice> = (set, get) => ({
  hostInstance: null,
  guestDriver: null,
  lastTableSync: null,
  gameEndSummary: null,

  startMatch: () => {
    globalLobbyDiscoveryClient.stopBroadcasting();
    const current = get().roomState;
    if (!current || !get().isHost) return;

    // Trận đấu Online chỉ bắt đầu khi có đúng 2, 3 hoặc 4 người chơi thật
    const countResult = PlayerCountSchema.safeParse(current.players.length);
    if (!countResult.success) return;

    const updatedState: OnlineRoomState = {
      ...current,
      playerCount: countResult.data,
      players: current.players,
      status: 'PLAYING',
      disbandReason: null,
      updatedAt: Date.now()
    };

    set({
      sessionState: {
        status: 'IN_ROOM_PLAYING',
        roomCode: updatedState.roomCode,
        roomState: updatedState,
        isHost: true,
        myPlayerId: get().myPlayerId,
        hostInstance: null
      },
      roomState: updatedState
    });
    void globalP2PClient.broadcastRoomState(updatedState);

    // Dọn dẹp host và session cũ nếu có
    if (get().hostInstance) {
      get().hostInstance?.dispose();
    }
    appFlowCoordinator.setActiveSession(null);

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
        .multiplier(updatedState.congMultiplier ?? 1)
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

    const initialPlayers: MatchPlayer[] = current.players.map(p => {
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
    gameStore.setInstantWinType(undefined);
    gameStore.setIsGameOver(false);
    useViewStore.getState().closeModal('ONLINE_ROOM');
    useViewStore.getState().closeModal('VICTORY');

    // Lưu vết phiên phòng Online đang chơi để hỗ trợ F5 / mở lại trình duyệt tự động Reconnect
    saveActiveOnlineSession({
      roomCode: updatedState.roomCode,
      playerId: get().myPlayerId,
      savedAt: Date.now()
    });

    // 1. Tạo AuthoritativeMatchHost
    const host = new AuthoritativeMatchHost({
      rules: customRules,
      players: initialPlayers,
      hostPlayerId: get().myPlayerId,
      enableDealingAnimation: true,
      onGameOver: (settlementResult) => {
        clearActiveOnlineSession();
        const current = get().roomState;
        if (current) {
          const updatedPlayers = current.players.map(p => {
            const payout = settlementResult?.payouts?.[p.playerId] ?? 0;
            return {
              ...p,
              coins: Math.max(0, p.coins + payout),
              isReady: false
            };
          });
          const endedState: OnlineRoomState = {
            ...current,
            status: 'ENDED',
            players: updatedPlayers,
            updatedAt: Date.now()
          };
          set({ roomState: endedState });
          void globalP2PClient.broadcastRoomState(endedState);
        }
      },
      onRematchVote: (playerId, isReady) => {
        const current = get().roomState;
        if (!current || !get().isHost) return;
        const updatedPlayers = current.players.map(p => {
          if (p.playerId === playerId) {
            return { ...p, isReady };
          }
          return p;
        });
        const updatedRoom: OnlineRoomState = {
          ...current,
          players: updatedPlayers,
          updatedAt: Date.now()
        };
        set({ roomState: updatedRoom });
        void globalP2PClient.broadcastRoomState(updatedRoom);
        const allReady = updatedPlayers.length >= 2 && updatedPlayers.every(p => p.isReady);
        if (allReady && current.status === 'ENDED') {
          get().startRematchOnHost();
        }
      },
      onPeerLeave: (peerId) => {
        const current = get().roomState;
        if (!current) return;
        if (current.status === 'WAITING') {
          const updatedPlayers = current.players.filter(p => p.peerId !== peerId);
          set({
            roomState: {
              ...current,
              players: updatedPlayers,
              updatedAt: Date.now()
            }
          });
          void globalP2PClient.broadcastRoomState({
            ...current,
            players: updatedPlayers,
            updatedAt: Date.now()
          });
        } else if (current.status === 'ENDED') {
          const updatedPlayers = current.players.filter(p => p.peerId !== peerId && p.playerId !== peerId);
          const updatedRoom: OnlineRoomState = {
            ...current,
            players: updatedPlayers,
            updatedAt: Date.now()
          };
          set({ roomState: updatedRoom });
          void globalP2PClient.broadcastRoomState(updatedRoom);
        } else if (current.status === 'PLAYING') {
          const leavingPlayer = current.players.find(p => p.peerId === peerId || p.playerId === peerId);
          if (!leavingPlayer) return;
          const leavingName = leavingPlayer.name || 'Một người chơi';

          // Kích hoạt Grace Period 25s thay vì giải tán bàn ngay lập tức
          const deadline = Date.now() + 25000;
          const updatedPlayers = current.players.map(p => {
            if (p.playerId === leavingPlayer.playerId) {
              return {
                ...p,
                isDisconnected: true,
                disconnectDeadline: deadline
              };
            }
            return p;
          });
          const updatedRoom: OnlineRoomState = {
            ...current,
            players: updatedPlayers,
            updatedAt: Date.now()
          };
          set({ roomState: updatedRoom });
          void globalP2PClient.broadcastRoomState(updatedRoom);

          host.handlePeerDisconnect(leavingPlayer.playerId, peerId, 25000, () => {
            const latestRoom = get().roomState;
            if (!latestRoom || latestRoom.status !== 'PLAYING') return;
            const reason = `${leavingName} đã mất kết nối quá thời gian chờ (25s).`;
            const disbanded: OnlineRoomState = {
              ...latestRoom,
              status: 'DISBANDED',
              disbandReason: reason,
              updatedAt: Date.now()
            };
            set({
              roomState: disbanded,
              disbandNotice: {
                title: 'BÀN CHƠI ĐÃ BỊ GIẢI TÁN',
                message: reason
              }
            });
            clearActiveOnlineSession();
            void globalP2PClient.broadcastRoomState(disbanded);
            useViewStore.getState().closeModal('VICTORY');
            useViewStore.getState().closeModal('ONLINE_ROOM');
            useGameStore.getState().resetMatchState();
            useGameStore.getState().setActiveGameType('QUICK');
            useGameStore.getState().setCurrentScreen('LOBBY');
          });
        }
      }
    });

    // 2. Đăng ký Host local transport và ClientSession qua TableSessionFactory
    const clientSession = TableSessionFactory.createOnlineHostSession({
      host,
      localPlayerId: get().myPlayerId,
      rules: customRules,
      initialPlayers
    });

    appFlowCoordinator.setActiveSession(clientSession);

    // 3. Đăng ký Supabase Realtime transport cho từng khách từ xa (Remote Guests)
    for (const player of updatedState.players) {
      if (player.playerId !== get().myPlayerId) {
        const peerTransport = new P2PHostPeerTransport(globalP2PClient, player.peerId, player.playerId);
        host.registerClient(player.playerId, peerTransport);
      }
    }

    set({
      hostInstance: host,
      sessionState: {
        status: 'IN_ROOM_PLAYING',
        roomCode: updatedState.roomCode,
        roomState: updatedState,
        isHost: true,
        myPlayerId: get().myPlayerId,
        hostInstance: host
      }
    });

    // 4. Bắt đầu ván đấu trên Server Host
    host.startMatch(1);
  },

  sendMoveAction: (cardIds: string[]) => {
    const session = appFlowCoordinator.getActiveSession();
    if (session) {
      session.sendIntent({ type: 'SET_SELECTED_CARDS', cardIds });
      session.sendIntent({ type: 'SUBMIT_PLAY' });
    } else {
      void globalP2PClient.sendPlayerAction({
        type: 'PLAY',
        playerId: get().myPlayerId,
        cardIds,
        timestamp: Date.now()
      });
    }
    useGameStore.getState().clearCardSelection();
  },

  sendPassAction: () => {
    const session = appFlowCoordinator.getActiveSession();
    if (session) {
      session.sendIntent({ type: 'SUBMIT_PASS' });
    } else {
      void globalP2PClient.sendPlayerAction({
        type: 'PASS',
        playerId: get().myPlayerId,
        timestamp: Date.now()
      });
    }
    useGameStore.getState().clearCardSelection();
  },

  startRematchOnHost: () => {
    const { hostInstance, roomState, myPlayerId } = get();
    if (!hostInstance || !roomState) return;

    const nextGameNum = hostInstance.gameNumber + 1;
    const lastWinner = hostInstance.lastWinnerId;

    // 1. Cập nhật RoomState: Chuyển status sang PLAYING
    const nextRoomState: OnlineRoomState = {
      ...roomState,
      status: 'PLAYING',
      updatedAt: Date.now()
    };
    set({ roomState: nextRoomState });
    void globalP2PClient.broadcastRoomState(nextRoomState);

    // 2. Làm sạch UI bàn đấu và đóng các modal trên máy Host
    const gameStore = useGameStore.getState();
    const viewStore = useViewStore.getState();
    gameStore.setGameNumber(nextGameNum);
    gameStore.setIsGameOver(false);
    gameStore.setInstantWinType(undefined);
    gameStore.setDealBanner(null);
    gameStore.setWinners([]);
    gameStore.clearCardSelection();
    gameStore.setCurrentMove(null);
    gameStore.setCurrentHint(null);
    gameStore.setPlayers(prevPlayers => {
      if (prevPlayers && prevPlayers.length > 0) {
        return resetPlayersForNewGame(prevPlayers, myPlayerId, []);
      }
      return prevPlayers;
    });
    viewStore.closeModal('VICTORY');
    viewStore.closeModal('ONLINE_ROOM');

    // Lưu active online session
    saveActiveOnlineSession({
      roomCode: nextRoomState.roomCode,
      playerId: myPlayerId,
      savedAt: Date.now()
    });

    // 3. Kích hoạt ván đấu mới trên Authoritative Host
    hostInstance.startMatch(nextGameNum, lastWinner);
  },

  voteRematch: (isReady: boolean) => {
    const { isHost, roomState, myPlayerId } = get();
    if (!roomState) return;

    if (isHost) {
      const updatedPlayers = roomState.players.map(p => {
        if (p.isHost || p.playerId === myPlayerId) {
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

      const allReady = updatedPlayers.length >= 2 && updatedPlayers.every(p => p.isReady);
      if (allReady && roomState.status === 'ENDED') {
        get().startRematchOnHost();
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
  }
});
