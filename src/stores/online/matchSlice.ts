import { globalP2PClient } from '../../engine/network/p2p-client';
import { globalLobbyDiscoveryClient } from '../../engine/network/lobby-discovery';
import { type OnlineRoomState } from '../../engine/network/network.schema';
import { HostEngineDriver } from '../../engine/network/host-engine-driver';
import { useGameStore } from '../useGameStore';
import { useViewStore } from '../useViewStore';
import { 
  type Player, 
  GameRulesBuilder,
  type ChoppingRulesBuilder,
  type CongRulesBuilder,
  type GameFlowRulesBuilder,
  type TableRulesBuilder 
} from '../../engine/types';
import { createPlayer, createBotPlayer } from '../../engine/player-factory';
import { type PlayingTurnMatchState, createPlayingTurnMatchState } from '../../engine/state-machine/types';
import { type MatchSlice, type OnlineSliceCreator } from './types';

export const createMatchSlice: OnlineSliceCreator<MatchSlice> = (set, get) => ({
  hostDriver: null,
  lastTableSync: null,
  gameEndSummary: null,

  startMatch: () => {
    globalLobbyDiscoveryClient.stopBroadcasting();
    const current = get().roomState;
    if (!current || !get().isHost) return;

    // Tự động lấp đầy Bot nếu phòng chưa đủ người
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

    set({
      sessionState: {
        status: 'IN_ROOM_PLAYING',
        roomCode: updatedState.roomCode,
        roomState: updatedState,
        isHost: true,
        myPlayerId: get().myPlayerId,
        hostDriver: null
      },
      roomState: updatedState
    });
    void globalP2PClient.broadcastRoomState(updatedState);

    // Khởi tạo GameEngine và HostEngineDriver
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
    useViewStore.getState().closeModal('ONLINE_ROOM');
    useViewStore.getState().closeModal('VICTORY');

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
          useViewStore.getState().closeModal('VICTORY');
          useViewStore.getState().closeModal('ONLINE_ROOM');
          useGameStore.getState().resetMatchState();
        }
      },
      onAutoStartMatch: () => {
        get().startMatch();
      }
    });
    driver.gameNumber = prevGameNumber;
    driver.lastWinnerId = prevWinnerId;
    set(state => ({
      hostDriver: driver,
      sessionState: state.sessionState.status === 'IN_ROOM_PLAYING'
        ? { ...state.sessionState, hostDriver: driver }
        : state.sessionState
    }));

    driver.startMatch((hostCards) => {
      const currentPlayers = initialPlayers.map((p, idx) => {
        if (idx === 0) {
          return { ...p, hand: hostCards };
        }
        return p;
      });
      const engine = driver.engine;
      if (!engine) {
        throw new Error('[OnlineMatchSlice] driver.engine không được null khi bắt đầu ván đấu!');
      }
      const currentTurnId = engine.currentRound.currentTurnPlayerId;
      const leadId = engine.currentRound.leadPlayerId;
      const isFirstMoveOfGame = engine.isFirstMoveOfGame;
      const isLeadMove = engine.isRoundLeadMove();

      gameStore.setGameNumber(driver.gameNumber);
      gameStore.setPlayers(currentPlayers);
      gameStore.setCurrentTurnPlayerId(currentTurnId);
      gameStore.setLeadPlayerId(leadId);
      gameStore.setIsFirstMoveOfGame(isFirstMoveOfGame);
      gameStore.setIsLeadMove(isLeadMove);
      gameStore.setWinners([]);
      gameStore.setInstantWinType(undefined);
      gameStore.setIsGameOver(false);
      gameStore.setCurrentMove(null);
      gameStore.setSelectedCardIds(new Set<string>());
      gameStore.setCurrentHint(null);

      const playingState: PlayingTurnMatchState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: driver.gameNumber,
        roundNumber: engine.roundNumber,
        players: currentPlayers,
        currentTurnPlayerId: currentTurnId,
        leadPlayerId: leadId,
        roundMoves: [],
        leadingMove: null,
        isLeadMove,
        isFirstMoveOfGame,
        passedPlayerIds: [],
        chopNotification: null,
        botThinkingThought: null,
        rules: customRules
      });
      gameStore.setMatchState(playingState);

      const counts: Record<string, number> = {};
      currentPlayers.forEach(p => {
        counts[p.id] = 13;
      });
      gameStore.setDealtCounts(counts);
      useViewStore.getState().closeModal('VICTORY');
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

  voteRematch: (isReady: boolean) => {
    const { isHost, hostDriver, roomState, myPlayerId } = get();
    if (!roomState) return;

    if (isHost) {
      if (hostDriver) {
        hostDriver.handleRematchVote(myPlayerId, isReady);
      } else {
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
  }
});
