import { describe, expect, it, beforeEach } from 'bun:test';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useViewStore } from '../../src/stores/useViewStore';
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
    useViewStore.getState().closeAllModals();

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
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
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
    expect(useViewStore.getState().isVictoryOpen).toBe(true);
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
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
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
    expect(useViewStore.getState().isVictoryOpen).toBe(true);
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
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
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

  it('5. Host từ chối yêu cầu vào phòng nếu Khách (Guest) không đủ Xu so với mức cược của phòng', () => {
    const profile = useUserStore.getState().profile;
    const betAmount = 5000;

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
    });

    const brokeGuest = {
      peerId: 'guest_broke_1',
      playerId: '',
      name: 'Khách Hết Tiền',
      avatar: '🤠',
      elo: 1000,
      coins: 500, // Nhỏ hơn betAmount 5000
      isHost: false,
      isReady: true,
      isBot: false
    };

    // Giả lập Host nhận yêu cầu vào phòng từ khách không đủ tiền
    const joinHandlers = (globalP2PClient as unknown as { onJoinRequestCallbacks: Array<(p: typeof brokeGuest, peer: string) => void> }).onJoinRequestCallbacks;
    joinHandlers.forEach(h => h(brokeGuest, 'guest_broke_1'));

    // Xác nhận Host KHÔNG thêm người này vào danh sách phòng
    const roomState = useOnlineStore.getState().roomState;
    expect(roomState?.players.length).toBe(1);
    expect(roomState?.players[0].isHost).toBe(true);
  });

  it('6. Khách (Guest) tự động rời phòng và hiển thị thông báo KHÔNG ĐỦ TIỀN CƯỢC khi nhận roomState có cược lớn hơn số dư ví', () => {
    const poorProfile = {
      ...useUserStore.getState().profile,
      coins: 800 // Chỉ có 800 Xu
    };
    useUserStore.getState().setProfile(poorProfile);

    // Khách tham gia phòng
    useOnlineStore.getState().joinRoom(poorProfile, 'TL-9999');

    const highBetRoomState = {
      roomCode: 'TL-9999',
      hostPeerId: 'host_peer_1',
      playerCount: 4 as const,
      betAmount: 5000, // Cược 5000 Xu > 800 Xu
      settlementRule: 'COUNT_CARDS' as const,
      choppingMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      players: [
        {
          peerId: 'host_peer_1',
          playerId: 'p0',
          name: 'Chủ Bàn',
          avatar: '🤠',
          elo: 1000,
          coins: 50000,
          isHost: true,
          isReady: true,
          isBot: false
        }
      ],
      status: 'WAITING' as const,
      disbandReason: null,
      updatedAt: Date.now()
    };

    // Gọi handler nhận roomState
    const roomHandlers = (globalP2PClient as unknown as { onRoomStateCallbacks: Array<(s: typeof highBetRoomState, peer: string) => void> }).onRoomStateCallbacks;
    roomHandlers.forEach(h => h(highBetRoomState, 'host_peer_1'));

    // Xác nhận Khách đã tự động rời phòng và có thông báo lỗi tài chính
    const state = useOnlineStore.getState();
    expect(state.isOnlineMatch).toBe(false);
    expect(state.disbandNotice).not.toBeNull();
    expect(state.disbandNotice?.title).toBe('KHÔNG ĐỦ TIỀN CƯỢC');
    expect(state.disbandNotice?.message).toContain('800 Xu');
    expect(state.disbandNotice?.message).toContain(`${(5000).toLocaleString()} Xu/lá`);
  });

  it('7. Khách (Guest p1) về Nhất, Host (p0) về Nhì: Đảm bảo gameStore.winners của Guest bảo toàn đúng thứ tự [p1, p0], không bị đảo ngược', () => {
    const profile = useUserStore.getState().profile;
    useOnlineStore.getState().joinRoom(profile, 'TL-1234');

    // Khởi tạo players trong GameStore với p0 đứng trước p1
    const p0 = createPlayer({ id: 'p0', name: 'Chủ Bàn Heo Bích', avatar: '🤠', score: 50000 });
    const p1 = createPlayer({ id: 'p1', name: 'Khách Thắng Trận', avatar: '😎', score: 50000 });
    useGameStore.setState({
      players: [p0, p1],
      myPlayerId: 'p1', // Người chơi hiện tại là Khách p1
      winners: []
    });

    const endPacket = {
      winners: ['p1', 'p0'], // p1 về Nhất, p0 về Nhì
      payouts: { p1: 7000, p0: -7000 },
      eloDeltas: { p1: 25, p0: -25 },
      allPlayerHands: {
        p0: [createCard(3, 'SPADES'), createCard(4, 'SPADES')],
        p1: []
      }
    };

    // Giả lập Guest nhận GameEndPacket
    const gameEndHandlers = (globalP2PClient as unknown as { onGameEndCallbacks: Array<(p: typeof endPacket) => void> }).onGameEndCallbacks;
    gameEndHandlers.forEach(h => h(endPacket));

    const gameStore = useGameStore.getState();
    expect(gameStore.isGameOver).toBe(true);
    expect(gameStore.winners.length).toBe(2);
    // Vị trí 0 BẮT BUỘC phải là p1 (Khách Thắng Trận)
    expect(gameStore.winners[0].id).toBe('p1');
    expect(gameStore.winners[0].name).toBe('Khách Thắng Trận');
    // Vị trí 1 BẮT BUỘC phải là p0 (Chủ Bàn Heo Bích)
    expect(gameStore.winners[1].id).toBe('p0');
    expect(gameStore.winners[1].name).toBe('Chủ Bàn Heo Bích');
  });
});


