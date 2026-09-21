import { describe, it, expect } from 'bun:test';
import { createCard } from '../../src/engine/card';
import { createPlayer } from '../../src/engine/player-factory';
import { createDefaultGameRules } from '../../src/engine/types';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { ClientSession } from '../../src/engine/presentation/client-session';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { P2PHostPeerTransport, P2PClientTransport } from '../../src/engine/transport/p2p-transport';
import { useGameStore } from '../../src/stores/useGameStore';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { appFlowCoordinator } from '../../src/services/app-flow-coordinator';
interface BroadcastEnvelope<T> {
  data: T;
  senderPeerId: string;
  targetPeerId?: string;
}

import type { 
  DealHandPacket, 
  PlayerActionPacket, 
  TableStateSyncPacket, 
  GameEndPacket, 
  OnlineRoomState
} from '../../src/engine/network/network.schema';

class MockSupabaseRealtimeHub {
  public hostCallbacks = new Map<string, Array<(payload: any) => void>>();
  public guestCallbacks = new Map<string, Array<(payload: any) => void>>();

  public hostPeerId = 'PEER_HOST';
  public guestPeerId = 'PEER_GUEST';

  public createClient(isHost: boolean) {
    const selfPeerId = isHost ? this.hostPeerId : this.guestPeerId;
    const myCallbacks = isHost ? this.hostCallbacks : this.guestCallbacks;
    const opponentCallbacks = isHost ? this.guestCallbacks : this.hostCallbacks;

    const on = (event: string, cb: (payload: any) => void) => {
      if (!myCallbacks.has(event)) myCallbacks.set(event, []);
      myCallbacks.get(event)!.push(cb);
      return () => {
        const list = myCallbacks.get(event) || [];
        myCallbacks.set(event, list.filter(c => c !== cb));
      };
    };

    const sendBroadcast = async (event: string, data: any, targetPeerId?: string) => {
      const envelope: BroadcastEnvelope<any> = {
        data,
        senderPeerId: selfPeerId,
        targetPeerId
      };
      const opponentPeerId = isHost ? this.guestPeerId : this.hostPeerId;
      if (!targetPeerId || targetPeerId === opponentPeerId) {
        const list = opponentCallbacks.get(event) || [];
        for (const cb of list) {
          cb({ payload: envelope });
        }
      }
    };

    return {
      selfPeerId,
      channel: {
        send: async ({ type, event, payload }: any) => {
          await sendBroadcast(event, payload.data, payload.targetPeerId);
          return 'ok';
        },
        state: 'joined'
      },
      isSubscribed: true,
      onDealHand: (cb: any) => on('deal_hand', ({ payload }) => {
        if (!payload.targetPeerId || payload.targetPeerId === selfPeerId) {
          cb(payload.data, payload.senderPeerId);
        }
      }),
      onPlayerAction: (cb: any) => on('player_act', ({ payload }) => {
        cb(payload.data, payload.senderPeerId);
      }),
      onTableSync: (cb: any) => on('table_sync', ({ payload }) => {
        cb(payload.data, payload.senderPeerId);
      }),
      onGameEnd: (cb: any) => on('game_end', ({ payload }) => {
        cb(payload.data, payload.senderPeerId);
      }),
      onPeerLeave: (cb: any) => on('peer_leave', ({ payload }) => {
        cb(payload.data, payload.senderPeerId);
      }),
      sendPrivateDealHand: async (packet: DealHandPacket, targetPeerId: string) => {
        await sendBroadcast('deal_hand', packet, targetPeerId);
      },
      sendPlayerAction: async (packet: PlayerActionPacket) => {
        await sendBroadcast('player_act', packet);
      },
      broadcastTableSync: async (packet: TableStateSyncPacket) => {
        await sendBroadcast('table_sync', packet);
      },
      broadcastGameEnd: async (packet: GameEndPacket) => {
        await sendBroadcast('game_end', packet);
      }
    };
  }
}

describe('Reproduce and test Online Turn Playing with appFlowCoordinator', () => {
  it('Simulates UI flow: Guest plays cards via appFlowCoordinator', async () => {
    const hub = new MockSupabaseRealtimeHub();
    const hostP2P = hub.createClient(true) as any;
    const guestP2P = hub.createClient(false) as any;

    const hostPlayerId = 'HOST_USER';
    const guestPlayerId = 'GUEST_USER';

    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000 }
    });

    const initialPlayers = [
      createPlayer({ id: hostPlayerId, name: 'Chủ Bàn', avatar: '🤠', hand: [] }),
      createPlayer({ id: guestPlayerId, name: 'Khách', avatar: '😎', hand: [] })
    ];

    // Host
    const host = new AuthoritativeMatchHost({
      hostPlayerId,
      players: initialPlayers,
      rules,
      instantDelay: true,
      enableDealingAnimation: false
    });

    const hostTransports = createMemoryDuplexTransport('HOST', hostPlayerId);
    host.registerClient(hostPlayerId, hostTransports.hostTransport);

    const hostSession = new ClientSession({
      localPlayerId: hostPlayerId,
      transport: hostTransports.clientTransport,
      gameRules: rules,
      initialPlayers,
      activeGameType: 'ONLINE'
    });

    const guestPeerTransport = new P2PHostPeerTransport(hostP2P, 'PEER_GUEST', guestPlayerId);
    host.registerClient(guestPlayerId, guestPeerTransport);

    // Guest side
    const guestClientTransport = new P2PClientTransport(guestP2P, 'PEER_HOST');
    const guestSession = new ClientSession({
      localPlayerId: guestPlayerId,
      transport: guestClientTransport,
      gameRules: rules,
      initialPlayers,
      activeGameType: 'ONLINE'
    });

    // Start match
    host.startMatch(1);

    expect(guestSession.getMyHand().length).toBe(13);
    expect(hostSession.getMyHand().length).toBe(13);

    // Setup Guest in appFlowCoordinator and useGameStore
    appFlowCoordinator.setActiveSession(guestSession);
    useGameStore.setState({
      myPlayerId: guestPlayerId,
      activeGameType: 'ONLINE',
      selectedCardIds: new Set<string>()
    });

    const currentTurn = host.engine.getCurrentPlayer()?.id;
    console.log('Turn belongs to:', currentTurn);

    // Force turn to Guest so Guest can play
    if (currentTurn !== guestPlayerId) {
      // Host plays first
      const hostCards = hostSession.getMyHand();
      hostSession.sendIntent({ type: 'SET_SELECTED_CARDS', cardIds: [hostCards[0].id] });
      hostSession.sendIntent({ type: 'SUBMIT_PLAY' });
    }

    // Now it should be Guest's turn
    expect(host.engine.getCurrentPlayer()?.id).toBe(guestPlayerId);

    // Guest selects cards in UI
    const guestCards = guestSession.getMyHand();
    const guestLead = host.engine.getLeadingMove();
    const playableCard = guestCards.find(c => !guestLead || c.weight > (guestLead.combination as any).weight);
    
    if (playableCard) {
      useGameStore.getState().toggleCardSelect(playableCard.id);
      expect(useGameStore.getState().selectedCardIds.has(playableCard.id)).toBe(true);

      // User clicks "Đánh" -> calls appFlowCoordinator.playSelectedCards()
      const playResult = appFlowCoordinator.playSelectedCards();
      expect(playResult).toBe(true);

      // Check Host engine
      expect(host.engine.getCurrentPlayer()?.id).toBe(hostPlayerId);

      // Check Host received the move!
      const hostFrame = hostSession.getLatestFrame();
      console.log('Host discardPile after Guest played:', hostFrame.discardPile);
      expect(hostFrame.discardPile?.cards[0].id).toBe(playableCard.id);
      expect(hostFrame.discardPile?.playedByPlayerId).toBe(guestPlayerId);
    }
  });

  it('applyAuthoritativeTableSync handles Fog-of-War null card hands safely without throwing TypeError', () => {
    const hostId = 'usr_xug6embl';
    const guestId = 'usr_v7jciolj';

    useGameStore.setState({
      myPlayerId: guestId,
      players: [
        createPlayer({ id: hostId, name: 'Host', avatar: '🤠', hand: [], cardCount: 3 }),
        createPlayer({ id: guestId, name: 'Guest', avatar: '😎', hand: [createCard(4, 'SPADES')] })
      ],
      dealtCounts: { [hostId]: 3, [guestId]: 1 }
    });

    const syncPacket: TableStateSyncPacket = {
      seq: 2,
      timestamp: Date.now(),
      gameNumber: 1,
      roundNumber: 1,
      isGameOver: false,
      isChop: false,
      isCascadeChop: false,
      currentTurnPlayerId: guestId,
      leadPlayerId: hostId,
      currentMovePlayerId: hostId,
      currentMoveCards: [createCard(3, 'HEARTS')],
      remainingCardCounts: { [hostId]: 2, [guestId]: 1 },
      passedPlayerIds: [],
      winners: []
    };

    // This must NOT throw TypeError: can't access property "id", c is null
    expect(() => {
      useGameStore.getState().applyAuthoritativeTableSync(syncPacket);
    }).not.toThrow();

    const state = useGameStore.getState();
    const hostPlayer = state.players.find(p => p.id === hostId);
    expect(hostPlayer?.cardCount).toBe(2);
    expect(state.dealtCounts[hostId]).toBe(2);
    expect(state.currentTurnPlayerId).toBe(guestId);
    expect(state.currentMove?.playerId).toBe(hostId);
  });
});

