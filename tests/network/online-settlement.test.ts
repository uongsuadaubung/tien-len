import { describe, expect, it, beforeEach } from 'bun:test';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useModalStore } from '../../src/stores/useModalStore';
import { loadPlayerProfile } from '../../src/engine/storage';
import { globalP2PClient } from '../../src/engine/network/p2p-client';
import { createCard } from '../../src/engine/card';
import { createPlayer } from '../../src/engine/player-factory';
import { GameEndPacket } from '../../src/engine/network/network.schema';

describe('Online P2P Settlement & Coin Payout Tests', () => {
  beforeEach(() => {
    useOnlineStore.getState().leaveRoom();
    useGameStore.setState({
      currentScreen: 'LOBBY',
      players: [],
      currentTurnPlayerId: null,
      leadPlayerId: null,
      currentMove: null,
      isGameOver: false,
      isDealing: false,
      matchPayouts: {},
      lastEloDelta: 0,
      allEloDeltas: undefined
    });
    useModalStore.getState().closeAllModals();

    const profile = loadPlayerProfile();
    profile.coins = 50000;
    profile.elo = 1000;
    profile.stats = {
      gamesPlayed: 10,
      wins: 5,
      currentStreak: 2,
      highestStreak: 4,
      totalEarned: 25000,
      chopsDone: 1,
      congsGiven: 0
    };
    useUserStore.getState().setProfile(profile);
  });

  it('1. Host tính toán kết toán chuẩn xác theo mức cược (betAmount) và cập nhật Xu khi ván đấu kết thúc', () => {
    const profile = useUserStore.getState().profile;
    const betAmount = 2000;

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null
    });

    useOnlineStore.getState().startMatch();

    const hostDriver = useOnlineStore.getState().hostDriver;
    expect(hostDriver).not.toBeNull();
    if (!hostDriver || !hostDriver.engine) return;

    // Giả lập Host (p0) đánh hết bài và về Nhất
    const p0 = hostDriver.engine.players.find(p => p.id === 'p0')!;
    p0.hand = [];
    hostDriver.engine.winners = [p0];
    hostDriver.engine.isGameOver = true;

    // Kích hoạt kết thúc ván đấu
    (hostDriver as unknown as { handleGameOver: () => void }).handleGameOver();

    const updatedProfile = useUserStore.getState().profile;
    const gameStore = useGameStore.getState();
    const onlineStore = useOnlineStore.getState();

    // 1. Host phải có payout dương (thắng tiền)
    const hostPayout = gameStore.matchPayouts['p0'];
    expect(hostPayout).toBeGreaterThan(0);
    expect(updatedProfile.coins).toBe(50000 + hostPayout);
    expect(updatedProfile.stats.gamesPlayed).toBe(11);
    expect(updatedProfile.stats.wins).toBe(6);
    expect(updatedProfile.stats.currentStreak).toBe(3);

    // 2. RoomState.players phải được cập nhật số dư Xu mới
    const hostRoomPlayer = onlineStore.roomState?.players.find(p => p.playerId === 'p0');
    expect(hostRoomPlayer?.coins).toBe(50000 + hostPayout);

    // 3. Modal Victory phải được mở
    expect(useModalStore.getState().isVictoryOpen).toBe(true);
  });

  it('2. Host thua ván đấu: Trừ đúng số Xu dựa theo số lá bài còn lại trên tay và mức cược', () => {
    const profile = useUserStore.getState().profile;
    const betAmount = 5000;

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null
    });

    useOnlineStore.getState().startMatch();

    const hostDriver = useOnlineStore.getState().hostDriver;
    if (!hostDriver || !hostDriver.engine) return;

    // Giả lập Bot 1 (p1) về Nhất, Host (p0) còn 5 lá bài
    const p1 = hostDriver.engine.players.find(p => p.id === 'p1')!;
    const p0 = hostDriver.engine.players.find(p => p.id === 'p0')!;
    p1.hand = [];
    p0.hand = [
      createCard(3, 'SPADES'),
      createCard(4, 'CLUBS'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'HEARTS'),
      createCard(7, 'SPADES')
    ];
    hostDriver.engine.winners = [p1];
    hostDriver.engine.isGameOver = true;

    (hostDriver as unknown as { handleGameOver: () => void }).handleGameOver();

    const updatedProfile = useUserStore.getState().profile;
    const gameStore = useGameStore.getState();

    const hostPayout = gameStore.matchPayouts['p0'];
    expect(hostPayout).toBeLessThan(0);
    // 5 lá * 5000 = -25000
    expect(hostPayout).toBe(-25000);
    expect(updatedProfile.coins).toBe(50000 - 25000);
    expect(updatedProfile.stats.gamesPlayed).toBe(11);
    expect(updatedProfile.stats.wins).toBe(5);
    expect(updatedProfile.stats.currentStreak).toBe(0);
  });

  it('3. Khách (Guest Client) nhận GameEndPacket: Cập nhật matchPayouts, cộng/trừ Xu vào Profile và mở bài các đối thủ', () => {
    const profile = useUserStore.getState().profile;
    profile.coins = 30000;
    useUserStore.getState().setProfile(profile);

    // Guest gia nhập phòng
    useOnlineStore.getState().joinRoom(profile, 'TL-1234');
    useOnlineStore.setState({ myPlayerId: 'p1' });

    useGameStore.setState({
      players: [
        createPlayer({ id: 'p0', name: 'Host', avatar: '🤠', score: 50000, hand: [] }),
        createPlayer({ id: 'p1', name: 'Guest (Tôi)', avatar: '🤠', score: 30000, hand: [createCard(3, 'SPADES')] })
      ]
    });

    const endPacket: GameEndPacket = {
      winners: ['p1'],
      payouts: {
        p0: -15000,
        p1: 15000
      },
      eloDeltas: {
        p0: -25,
        p1: 25
      },
      allPlayerHands: {
        p0: [{ rank: 15, suit: 'HEARTS', id: '2_HEARTS' }],
        p1: []
      }
    };

    // Gọi trực tiếp callback onGameEnd đã đăng ký trong globalP2PClient
    const handlers = (globalP2PClient as unknown as { onGameEndCallbacks: Array<(p: GameEndPacket, peer: string) => void> }).onGameEndCallbacks;
    handlers.forEach(h => h(endPacket, 'host_peer'));

    const updatedProfile = useUserStore.getState().profile;
    const gameStore = useGameStore.getState();

    // Guest thắng 15.000 Xu
    expect(gameStore.matchPayouts['p1']).toBe(15000);
    expect(updatedProfile.coins).toBe(30000 + 15000);
    expect(updatedProfile.elo).toBe(1000 + 25);
    expect(updatedProfile.stats.wins).toBe(6);
    expect(updatedProfile.stats.gamesPlayed).toBe(11);

    // Bài của đối thủ p0 được hiển thị (thối 2 cơ)
    expect(gameStore.players.find(p => p.id === 'p0')?.hand.length).toBe(1);
    expect(gameStore.players.find(p => p.id === 'p0')?.hand[0].rank).toBe(15);
    expect(useModalStore.getState().isVictoryOpen).toBe(true);
  });

  it('4. Chế độ Nhất Ăn Tất (WINNER_TAKES_ALL): Người về Nhất ăn trọn mức cược cơ bản của cả làng khi không có cóng', () => {
    const profile = useUserStore.getState().profile;
    const betAmount = 10000;

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount,
      settlementRule: 'WINNER_TAKES_ALL',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null
    });

    useOnlineStore.getState().startMatch();

    const hostDriver = useOnlineStore.getState().hostDriver;
    if (!hostDriver || !hostDriver.engine) return;

    // Giả lập p0 về Nhất, các đối thủ đã đánh bài (không cóng) và không giữ heo thối
    const p0 = hostDriver.engine.players.find(p => p.id === 'p0')!;
    p0.hand = [];
    hostDriver.engine.players.forEach(p => {
      p.hasPlayedFirstCard = true;
      if (p.id !== 'p0') {
        p.hand = [createCard(3, 'SPADES')]; // 1 lá không phải 2
      }
    });

    hostDriver.engine.winners = [p0];
    hostDriver.engine.isGameOver = true;

    (hostDriver as unknown as { handleGameOver: () => void }).handleGameOver();

    const gameStore = useGameStore.getState();
    const hostPayout = gameStore.matchPayouts['p0'];

    // 3 người thua x 10.000 Xu = +30.000 Xu
    expect(hostPayout).toBe(30000);
    expect(gameStore.matchPayouts['p1']).toBe(-10000);
    expect(gameStore.matchPayouts['p2']).toBe(-10000);
    expect(gameStore.matchPayouts['p3']).toBe(-10000);
  });
});
