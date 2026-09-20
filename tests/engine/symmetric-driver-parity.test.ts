import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GameEventBus } from '../../src/engine/events/game-event-bus';
import { GuestEngineDriver } from '../../src/engine/network/guest-engine-driver';
import { HostEngineDriver } from '../../src/engine/network/host-engine-driver';
import { OfflineMatchDriver } from '../../src/engine/offline-match-driver';
import { appFlowCoordinator } from '../../src/services/app-flow-coordinator';
import { P2PClient } from '../../src/engine/network/p2p-client';
import { useGameStore } from '../../src/stores/useGameStore';
import { createCard } from '../../src/engine/card';
import { createPlayer } from '../../src/engine/player-factory';
import type { TableStateSyncPacket, GameEndPacket, OnlineRoomState } from '../../src/engine/network/network.schema';
import type { IMatchDriver } from '../../src/engine/match-driver.interface';

// Mock P2PClient for testing
class MockP2PClient {
  public tableSyncHandlers: ((sync: TableStateSyncPacket) => void)[] = [];
  public gameEndHandlers: ((packet: GameEndPacket) => void)[] = [];
  public sentActions: any[] = [];
  public broadcastTableSyncPackets: TableStateSyncPacket[] = [];

  public onTableSync(handler: (sync: TableStateSyncPacket) => void): () => void {
    this.tableSyncHandlers.push(handler);
    return () => {
      const idx = this.tableSyncHandlers.indexOf(handler);
      if (idx !== -1) this.tableSyncHandlers.splice(idx, 1);
    };
  }

  public onGameEnd(handler: (packet: GameEndPacket) => void): () => void {
    this.gameEndHandlers.push(handler);
    return () => {
      const idx = this.gameEndHandlers.indexOf(handler);
      if (idx !== -1) this.gameEndHandlers.splice(idx, 1);
    };
  }

  public sendPlayerAction(action: any): Promise<void> {
    this.sentActions.push(action);
    return Promise.resolve();
  }

  public broadcastTableSync(packet: TableStateSyncPacket): Promise<void> {
    this.broadcastTableSyncPackets.push(packet);
    return Promise.resolve();
  }

  public broadcastRoomState(): Promise<void> {
    return Promise.resolve();
  }

  public broadcastGameEnd(): Promise<void> {
    return Promise.resolve();
  }

  public sendPrivateDealHand(): Promise<void> {
    return Promise.resolve();
  }

  public onPlayerAction(): () => void {
    return () => {};
  }

  public onRematchVote(): () => void {
    return () => {};
  }
}

describe('Symmetric Match Driver Parity (Kiến trúc Driver Đối Xứng)', () => {
  let mockP2P: MockP2PClient;

  beforeEach(() => {
    mockP2P = new MockP2PClient();
    appFlowCoordinator.setActiveDriver(null);
    useGameStore.getState().resetMatchState();
  });

  afterEach(() => {
    appFlowCoordinator.setActiveDriver(null);
  });

  test('1. OfflineMatchDriver, HostEngineDriver và GuestEngineDriver đều thỏa mãn IMatchDriver', () => {
    const offlineDriver: IMatchDriver = new OfflineMatchDriver();
    const guestDriver: IMatchDriver = new GuestEngineDriver({
      p2pClient: mockP2P as unknown as P2PClient,
      myPlayerId: 'guest_1'
    });
    const mockRoom: OnlineRoomState = {
      roomCode: 'TL-TEST',
      hostPeerId: 'peer_host',
      playerCount: 4,
      betAmount: 1000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: 1,
      congMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      players: [
        { playerId: 'host_1', peerId: 'peer_host', name: 'Host', avatar: '1', coins: 50000, elo: 1200, isHost: true, isReady: true, isBot: false },
        { playerId: 'guest_1', peerId: 'peer_guest', name: 'Guest', avatar: '2', coins: 50000, elo: 1200, isHost: false, isReady: true, isBot: false }
      ],
      status: 'WAITING',
      disbandReason: null,
      isPublic: true,
      updatedAt: Date.now()
    };
    const hostDriver: IMatchDriver = new HostEngineDriver(mockP2P as unknown as P2PClient, mockRoom);

    // Kiểm tra hợp đồng IMatchDriver đầy đủ
    [offlineDriver, hostDriver, guestDriver].forEach(driver => {
      expect(typeof driver.playCards).toBe('function');
      expect(typeof driver.passTurn).toBe('function');
      expect(typeof driver.reorderPlayerHand).toBe('function');
      expect(typeof driver.getTracker).toBe('function');
      expect(typeof driver.getAiHint).toBe('function');
      expect(typeof driver.handleGameOver).toBe('function');
      expect(typeof driver.cleanup).toBe('function');
    });

    offlineDriver.cleanup();
    hostDriver.cleanup();
    guestDriver.cleanup();
  });

  test('2. AppFlowCoordinator quản lý Driver đa hình thống nhất cho cả Offline và Online', () => {
    const guestDriver = new GuestEngineDriver({
      p2pClient: mockP2P as unknown as P2PClient,
      myPlayerId: 'player_guest'
    });

    expect(appFlowCoordinator.getActiveDriver()).toBeNull();
    expect(appFlowCoordinator.hasActiveMatch()).toBe(false);

    appFlowCoordinator.setActiveDriver(guestDriver);
    expect(appFlowCoordinator.getActiveDriver()).toBe(guestDriver);
    expect(appFlowCoordinator.hasActiveMatch()).toBe(true);

    // Test passTurn qua Coordinator
    useGameStore.getState().setMyPlayerId('player_guest');
    const passResult = appFlowCoordinator.passTurn();
    expect(passResult).toBe(true);
    expect(mockP2P.sentActions.length).toBe(1);
    expect(mockP2P.sentActions[0].type).toBe('PASS');
    expect(mockP2P.sentActions[0].playerId).toBe('player_guest');

    // Test playCards qua Coordinator
    const card3S = createCard(3, 'SPADES');
    const localPlayer = createPlayer({
      id: 'player_guest',
      name: 'Guest Player',
      score: 50000,
      hand: [card3S]
    });
    useGameStore.getState().setPlayers([localPlayer]);
    useGameStore.getState().setSelectedCardIds(new Set([card3S.id]));

    const playResult = appFlowCoordinator.playSelectedCards();
    expect(playResult).toBe(true);
    expect(mockP2P.sentActions.length).toBe(2);
    expect(mockP2P.sentActions[1].type).toBe('PLAY');
    expect(mockP2P.sentActions[1].cardIds).toEqual([card3S.id]);

    guestDriver.cleanup();
  });

  test('3. GuestEngineDriver Domain Event Bridge kích hoạt âm thanh khi nhận gói TableStateSyncPacket', () => {
    const bus = GameEventBus.getInstance();
    const guestDriver = new GuestEngineDriver({
      p2pClient: mockP2P as unknown as P2PClient,
      myPlayerId: 'guest_1'
    });

    const card4H = createCard(4, 'HEARTS');
    const player1 = createPlayer({ id: 'guest_1', name: 'Guest', score: 10000, hand: [card4H] });
    const player2 = createPlayer({ id: 'host_1', name: 'Host', score: 10000, hand: [] });
    useGameStore.getState().setPlayers([player1, player2]);

    let cardPlayedFired = false;
    let chopFired = false;
    let turnPassedFired = false;

    const unCard = bus.subscribe('CARD_PLAYED', () => { cardPlayedFired = true; });
    const unChop = bus.subscribe('CHOP_EXECUTED', () => { chopFired = true; });
    const unPass = bus.subscribe('TURN_PASSED', () => { turnPassedFired = true; });

    // Gửi packet đánh bài từ Host sang Guest
    const syncPacket: TableStateSyncPacket = {
      seq: 1,
      timestamp: Date.now(),
      currentTurnPlayerId: 'guest_1',
      leadPlayerId: 'host_1',
      currentMoveCards: [{ rank: 5, suit: 'SPADES', id: '5_SPADES' }],
      currentMovePlayerId: 'host_1',
      currentMoveCombinationType: 'SINGLE',
      isChop: false,
      isCascadeChop: false,
      remainingCardCounts: { host_1: 12, guest_1: 13 },
      passedPlayerIds: [],
      roundNumber: 1,
      winners: [],
      isGameOver: false,
      gameNumber: 1,
      isFirstMoveOfGame: false,
      isLeadMove: true
    };

    mockP2P.tableSyncHandlers.forEach(h => h(syncPacket));
    expect(cardPlayedFired).toBe(true);

    // Gửi packet Chặt Heo
    const chopSyncPacket: TableStateSyncPacket = {
      ...syncPacket,
      seq: 2,
      currentMoveCards: [
        { rank: 6, suit: 'SPADES', id: '6_SPADES' },
        { rank: 6, suit: 'CLUBS', id: '6_CLUBS' },
        { rank: 6, suit: 'DIAMONDS', id: '6_DIAMONDS' },
        { rank: 6, suit: 'HEARTS', id: '6_HEARTS' }
      ],
      currentMoveCombinationType: 'FOUR_OF_A_KIND',
      isChop: true,
      chopNotification: {
        visible: true,
        chopperName: 'Host',
        targetName: 'Guest',
        amount: 4000,
        isCascade: false,
        chainCount: 1
      }
    };
    mockP2P.tableSyncHandlers.forEach(h => h(chopSyncPacket));
    expect(chopFired).toBe(true);

    // Gửi packet bỏ lượt
    const passSyncPacket: TableStateSyncPacket = {
      ...chopSyncPacket,
      seq: 3,
      passedPlayerIds: ['guest_1']
    };
    mockP2P.tableSyncHandlers.forEach(h => h(passSyncPacket));
    expect(turnPassedFired).toBe(true);

    unCard();
    unChop();
    unPass();
    guestDriver.cleanup();
  });

  test('4. GuestEngineDriver cung cấp CardTracker và Quân Sư AI hợp lệ', () => {
    const card3S = createCard(3, 'SPADES');
    const localPlayer = createPlayer({
      id: 'guest_1',
      name: 'Guest Player',
      score: 50000,
      hand: [card3S]
    });
    useGameStore.getState().setPlayers([localPlayer]);
    useGameStore.getState().setMyPlayerId('guest_1');

    const guestDriver = new GuestEngineDriver({
      p2pClient: mockP2P as unknown as P2PClient,
      myPlayerId: 'guest_1'
    });

    // 1. Kiểm tra Tracker
    const tracker = guestDriver.getTracker('guest_1');
    expect(tracker).not.toBeNull();
    expect(tracker?.getPlayedCardIds().length).toBe(0);

    // 2. Kiểm tra Quân Sư AI
    const hint = guestDriver.getAiHint('guest_1');
    expect(hint).not.toBeNull();
    expect(hint?.action).toBe('PLAY');
    if (hint && hint.action === 'PLAY') {
      expect(hint.cards.length).toBe(1);
      expect(hint.cards[0].id).toBe(card3S.id);
    }

    guestDriver.cleanup();
  });

  test('5. GuestEngineDriver.playCards lạc quan xóa bài khỏi tay localPlayer trong useGameStore ngay lập tức và gửi packet P2P', () => {
    const card3S = createCard(3, 'SPADES');
    const card4S = createCard(4, 'SPADES');
    const card5S = createCard(5, 'SPADES');
    const localPlayer = createPlayer({
      id: 'guest_1',
      name: 'Guest Player',
      score: 50000,
      hand: [card3S, card4S, card5S]
    });
    useGameStore.getState().setPlayers([localPlayer]);
    useGameStore.getState().setMyPlayerId('guest_1');
    useGameStore.getState().setSelectedCardIds(new Set([card3S.id, card4S.id]));

    const guestDriver = new GuestEngineDriver({
      p2pClient: mockP2P as unknown as P2PClient,
      myPlayerId: 'guest_1'
    });

    // Bấm đánh bài (optimistic play)
    const result = guestDriver.playCards('guest_1', [card3S, card4S]);
    expect(result.success).toBe(true);

    // Kiểm tra bài trên tay localPlayer đã bị xóa ngay lập tức
    const updatedStore = useGameStore.getState();
    const myPlayer = updatedStore.players.find(p => p.id === 'guest_1');
    expect(myPlayer).toBeDefined();
    expect(myPlayer?.hand.length).toBe(1);
    expect(myPlayer?.hand[0].id).toBe(card5S.id);
    expect(myPlayer?.playedCards.length).toBe(2);
    expect(myPlayer?.playedCards.map(c => c.id)).toEqual([card3S.id, card4S.id]);

    // Lựa chọn bài trên UI phải được dọn sạch
    expect(updatedStore.selectedCardIds.size).toBe(0);

    // Gói tin P2P PLAY đã được gửi đi
    expect(mockP2P.sentActions.length).toBe(1);
    expect(mockP2P.sentActions[0].type).toBe('PLAY');
    expect(mockP2P.sentActions[0].playerId).toBe('guest_1');
    expect(mockP2P.sentActions[0].cardIds).toEqual([card3S.id, card4S.id]);

    guestDriver.cleanup();
  });

  test('6. TableStateSyncPacket từ Host đồng bộ authoritative xóa bài khỏi tay người chơi trên Client', () => {
    const card3S = createCard(3, 'SPADES');
    const card4S = createCard(4, 'SPADES');
    const card5S = createCard(5, 'SPADES');
    const localPlayer = createPlayer({
      id: 'guest_1',
      name: 'Guest Player',
      score: 50000,
      hand: [card3S, card4S, card5S]
    });
    const hostPlayer = createPlayer({
      id: 'host_1',
      name: 'Host Player',
      score: 50000,
      hand: [] // Fog of War đối thủ
    });
    useGameStore.getState().setPlayers([localPlayer, hostPlayer]);
    useGameStore.getState().setMyPlayerId('guest_1');

    const guestDriver = new GuestEngineDriver({
      p2pClient: mockP2P as unknown as P2PClient,
      myPlayerId: 'guest_1'
    });

    // Giả lập Host gửi TableStateSyncPacket xác nhận lượt đánh của guest_1
    const syncPacket: TableStateSyncPacket = {
      seq: 10,
      timestamp: Date.now(),
      currentTurnPlayerId: 'host_1',
      leadPlayerId: 'guest_1',
      currentMoveCards: [
        { rank: 3, suit: 'SPADES', id: card3S.id },
        { rank: 4, suit: 'SPADES', id: card4S.id }
      ],
      currentMovePlayerId: 'guest_1',
      currentMoveCombinationType: 'PAIR',
      isChop: false,
      isCascadeChop: false,
      remainingCardCounts: {
        guest_1: 1,
        host_1: 13
      },
      passedPlayerIds: [],
      roundNumber: 1,
      winners: [],
      isGameOver: false,
      gameNumber: 1,
      isFirstMoveOfGame: false,
      isLeadMove: false
    };

    mockP2P.tableSyncHandlers.forEach(h => h(syncPacket));

    const state = useGameStore.getState();
    const guestInStore = state.players.find(p => p.id === 'guest_1');
    expect(guestInStore).toBeDefined();
    expect(guestInStore?.hand.length).toBe(1);
    expect(guestInStore?.hand[0].id).toBe(card5S.id);
    expect(guestInStore?.playedCards.length).toBe(2);
    expect(state.dealtCounts['guest_1']).toBe(1);
    expect(state.dealtCounts['host_1']).toBe(13);

    guestDriver.cleanup();
  });
});
