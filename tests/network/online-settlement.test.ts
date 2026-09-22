import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useViewStore } from '../../src/stores/useViewStore';
import { loadPlayerProfile } from '../../src/engine/storage';
import { globalP2PClient } from '../../src/engine/network/p2p-client';
import { createCard } from '../../src/engine/card';
import { createPlayer } from '../../src/engine/player-factory';
import { GameEndPacket, OnlineRoomState, OnlinePlayer, TableStateSyncPacket, createGameEndPacket } from '../../src/engine/network/network.schema';

describe('Online P2P Settlement & Coin Payout Tests', () => {
  beforeEach(() => {
    useOnlineStore.getState().leaveRoom();
    useGameStore.getState().resetMatchState();
    const profile = loadPlayerProfile();
    useGameStore.setState({
      myPlayerId: profile.id,
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

  function fillRoomWithPeers(targetCount: number = 4) {
    const room = useOnlineStore.getState().roomState;
    if (!room) return;
    const currentPlayers = [...room.players];
    for (let i = currentPlayers.length; i < targetCount; i++) {
      currentPlayers.push({
        peerId: `peer_${i}`,
        playerId: `p${i}`,
        name: `Người chơi ${i}`,
        avatar: '🤠',
        elo: 1000 + i * 20,
        coins: 50000,
        isHost: false,
        isReady: true,
        isBot: false
      });
    }
    useOnlineStore.setState({
      roomState: {
        ...room,
        players: currentPlayers,
        updatedAt: Date.now()
      }
    });
  }

  it('1. Host tính toán kết toán chuẩn xác theo mức cược (betAmount) và cập nhật Xu khi ván đấu kết thúc', () => {
    const profile = useUserStore.getState().profile;
    const betAmount = 2000;

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount,
      settlementRule: 'COUNT_CARDS',      isPublic: true
    });
    fillRoomWithPeers(4);

    useOnlineStore.getState().startMatch();

    const hostInstance = useOnlineStore.getState().hostInstance;
    expect(hostInstance).not.toBeNull();
    if (!hostInstance || !hostInstance.engine) return;

    // Giả lập Host đánh hết bài và về Nhất
    const p0 = hostInstance.engine.players.find(p => p.id === profile.id)!;
    p0.hand = [];
    hostInstance.engine.winners = [p0];
    hostInstance.engine.isGameOver = true;

    // Kích hoạt kết thúc ván đấu
    hostInstance.handleGameOver({ skipDelay: true });

    const updatedProfile = useUserStore.getState().profile;
    const gameStore = useGameStore.getState();
    const onlineStore = useOnlineStore.getState();

    // 1. Host phải có payout dương (thắng tiền)
    const hostPayout = gameStore.matchPayouts[profile.id];
    expect(hostPayout).toBeGreaterThan(0);
    expect(updatedProfile.coins).toBe(50000 + hostPayout);
    expect(updatedProfile.stats.gamesPlayed).toBe(11);
    expect(updatedProfile.stats.wins).toBe(6);
    expect(updatedProfile.stats.currentStreak).toBe(3);

    // 2. RoomState.players phải được cập nhật số dư Xu mới
    const hostRoomPlayer = onlineStore.roomState?.players.find(p => p.playerId === profile.id);
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
      settlementRule: 'COUNT_CARDS',      isPublic: true
    });
    fillRoomWithPeers(4);

    useOnlineStore.getState().startMatch();

    const hostInstance = useOnlineStore.getState().hostInstance;
    if (!hostInstance || !hostInstance.engine) return;

    // Giả lập Bot 1 (p1) về Nhất, Host còn 5 lá bài
    const p1 = hostInstance.engine.players.find(p => p.id === 'p1')!;
    const p0 = hostInstance.engine.players.find(p => p.id === profile.id)!;
    p1.hand = [];
    p0.hand = [
      createCard(3, 'SPADES'),
      createCard(4, 'CLUBS'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'HEARTS'),
      createCard(7, 'SPADES')
    ];
    hostInstance.engine.winners = [p1];
    hostInstance.engine.isGameOver = true;

    hostInstance.handleGameOver({ skipDelay: true });

    const updatedProfile = useUserStore.getState().profile;
    const gameStore = useGameStore.getState();

    const hostPayout = gameStore.matchPayouts[profile.id];
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

    const endPacket: GameEndPacket = createGameEndPacket({
      winners: ['p1'],
      payouts: {
        p0: -15000,
        p1: 15000
      },
      eloDeltas: {
        p0: -25,
        p1: 25
      },
      playerScores: {
        p0: 35000,
        p1: 45000
      },
      allPlayerHands: {
        p0: [{ rank: 15, suit: 'HEARTS', id: '2_HEARTS' }],
        p1: []
      }
    });

    // Giả lập Khách nhận GameEndPacket từ Host
    globalP2PClient.emitGameEndForTest(endPacket, 'host_peer_123');

    const updatedProfile = useUserStore.getState().profile;
    const gameStore = useGameStore.getState();

    // Guest thắng 15.000 Xu và myPlayerId phải được bảo toàn, không bị clobber
    expect(gameStore.matchPayouts['p1']).toBe(15000);
    expect(gameStore.myPlayerId).toBe('p1');
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
      settlementRule: 'WINNER_TAKES_ALL',      isPublic: true
    });
    fillRoomWithPeers(4);

    useOnlineStore.getState().startMatch();

    const hostInstance = useOnlineStore.getState().hostInstance;
    if (!hostInstance || !hostInstance.engine) return;

    // Giả lập Host về Nhất, các đối thủ đã đánh bài (không cóng) và không giữ heo thối
    const p0 = hostInstance.engine.players.find(p => p.id === profile.id)!;
    p0.hand = [];
    hostInstance.engine.players.forEach(p => {
      p.hasPlayedFirstCard = true;
      if (p.id !== profile.id) {
        p.hand = [createCard(3, 'SPADES')]; // 1 lá không phải 2
      }
    });

    hostInstance.engine.winners = [p0];
    hostInstance.engine.isGameOver = true;

    hostInstance.handleGameOver({ skipDelay: true });

    const gameStore = useGameStore.getState();
    const hostPayout = gameStore.matchPayouts[profile.id];

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
      settlementRule: 'COUNT_CARDS',      isPublic: true
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

    // Giả lập nhận join_req từ Khách không đủ tiền
    globalP2PClient.emitJoinRequestForTest(brokeGuest, 'broke_guest_peer');

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

    const highBetRoomState: OnlineRoomState = {
      roomCode: 'TL-9999',
      hostPeerId: 'host_peer_1',
      playerCount: 4,
      betAmount: 5000, // Cược 5000 Xu > 800 Xu
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: 1,
      congMultiplier: 1,
      isPublic: true,
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
      status: 'WAITING',
      disbandReason: null,
      updatedAt: Date.now()
    };

    // Gọi handler nhận roomState
    globalP2PClient.emitRoomStateForTest(highBetRoomState, 'host_peer_1');

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

    const endPacket: GameEndPacket = createGameEndPacket({
      winners: ['p1', 'p0'], // p1 về Nhất, p0 về Nhì
      payouts: { p1: 7000, p0: -7000 },
      eloDeltas: { p1: 25, p0: -25 },
      playerScores: { p1: 57000, p0: 43000 },
      allPlayerHands: {
        p0: [createCard(3, 'SPADES'), createCard(4, 'SPADES')],
        p1: []
      }
    });

    // Giả lập Guest nhận GameEndPacket
    globalP2PClient.emitGameEndForTest(endPacket, 'host_peer_456');

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

  it('8. Host kết thúc ván: Mặc định chờ đúng MATCH_END_REVEAL_DELAY_MS (2s) trước khi kích hoạt kết toán và mở VictoryModal', async () => {
    const profile = useUserStore.getState().profile;
    const betAmount = 1000;

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount,
      settlementRule: 'COUNT_CARDS',
      isPublic: true
    });
    fillRoomWithPeers(4);

    useOnlineStore.getState().startMatch();

    const hostInstance = useOnlineStore.getState().hostInstance;
    expect(hostInstance).not.toBeNull();
    if (!hostInstance || !hostInstance.engine) return;

    const p0 = hostInstance.engine.players.find(p => p.id === profile.id)!;
    p0.hand = [];
    hostInstance.engine.winners = [p0];
    hostInstance.engine.isGameOver = true;

    // Đặt revealDelayMs ngắn (20ms) để kiểm thử bộ đệm kết toán mà không đóng băng test suite 2s
    hostInstance.options.revealDelayMs = 20;

    // Gọi handleGameOver mà KHÔNG truyền skipDelay (mặc định chờ revealDelayMs)
    hostInstance.handleGameOver();

    // Ngay lúc vừa gọi: Chưa mở VictoryModal
    expect(useViewStore.getState().isVictoryOpen).toBe(false);

    // Chờ 30ms
    await new Promise(resolve => setTimeout(resolve, 30));

    // Sau delay: VictoryModal đã được mở và kết toán đã hoàn tất
    expect(useViewStore.getState().isVictoryOpen).toBe(true);
    expect(useGameStore.getState().matchPayouts[profile.id]).toBeGreaterThan(0);
  });

  it('9. Khách (Client/Guest) thắng ván: useVictoryLogic và modal hiển thị đúng tổng kết tiền bàn dương (+Xu) và danh hiệu CHIẾN THẮNG, không bị gán nhầm tiền âm của Host', () => {
    const profile = useUserStore.getState().profile;
    profile.coins = 50000;
    useUserStore.getState().setProfile(profile);

    // Client gia nhập phòng với tư cách Guest
    useOnlineStore.getState().joinRoom(profile, 'TL-WIN1');
    useOnlineStore.setState({ myPlayerId: 'p1' });

    const players = [
      createPlayer({ id: 'p0', name: 'Host (Chủ Bàn)', avatar: '🤠', score: 50000, hand: [createCard(4, 'SPADES')] }),
      createPlayer({ id: 'p1', name: 'Guest (Tôi)', avatar: '🤠', score: 50000, hand: [] })
    ];

    useGameStore.setState({
      activeGameType: 'ONLINE',
      myPlayerId: 'p1',
      players,
      winners: [players[1]]
    });

    const endPacket: GameEndPacket = createGameEndPacket({
      winners: ['p1'],
      payouts: {
        p0: -20000,
        p1: 20000
      },
      eloDeltas: {
        p0: -20,
        p1: 20
      },
      playerScores: {
        p0: 30000,
        p1: 70000
      },
      allPlayerHands: {
        p0: [{ rank: 4, suit: 'SPADES', id: '4_SPADES' }],
        p1: []
      }
    });

    // Client nhận GameEndPacket
    globalP2PClient.emitGameEndForTest(endPacket, 'host_peer_test');

    const endStore = useGameStore.getState();
    expect(endStore.matchPayouts['p1']).toBe(20000);
    expect(endStore.myPlayerId).toBe('p1');

    // Kiểm tra Authoritative Perspective Settlement được tính toán chuẩn xác từ Engine/Store
    expect(endStore.perspectiveSettlement).not.toBeNull();
    const settlement = endStore.perspectiveSettlement!;

    // Tiền bàn của người chơi cục bộ phải là số dương của Client thắng (+20.000), không phải số âm của Host (-20.000)
    expect(settlement.subjectPlayerId).toBe('p1');
    expect(settlement.isWinner).toBe(true);
    expect(settlement.netPayout).toBe(20000);
    expect(settlement.scenario).toBe('ONLINE');
    expect(settlement.players.find(p => p.id === 'p1')?.netPayout).toBe(20000);
    expect(settlement.players.find(p => p.id === 'p0')?.netPayout).toBe(-20000);
  });

  it('10. Khi một bên đánh nước đi kết thúc ván online: Cả Host và Khách đều đồng bộ và hiển thị chính xác nước đi cuối cùng (winningMove/currentMove) trên bàn đấu', () => {
    const profile = useUserStore.getState().profile;
    useOnlineStore.getState().createRoom(profile, {
      playerCount: 2,
      betAmount: 1000,
      settlementRule: 'COUNT_CARDS',
      isPublic: true
    });
    fillRoomWithPeers(2);

    useOnlineStore.getState().startMatch();

    const hostInstance = useOnlineStore.getState().hostInstance;
    expect(hostInstance).not.toBeNull();
    if (!hostInstance || !hostInstance.engine) return;

    const broadcastSpy = spyOn(globalP2PClient, 'broadcastTableSync');

    try {
      const engine = hostInstance.engine;
      const hostPlayer = engine.players.find(p => p.id === profile.id)!;
      const guestPlayer = engine.players.find(p => p.id !== profile.id)!;

      // Giả lập ván đấu đã qua nước đầu tiên, Host chỉ còn 1 lá bài duy nhất (A Cơ) và đang tới lượt
      engine.isFirstMoveOfGame = false;
      const winningCard = createCard(14, 'HEARTS'); // A Cơ
      hostPlayer.hand = [winningCard];
      guestPlayer.hand = [createCard(5, 'SPADES')];
      engine.currentRound.currentTurnPlayerId = hostPlayer.id;
      engine.currentRound.leadPlayerId = hostPlayer.id;

      // Host đánh lá bài cuối cùng
      const playRes = hostInstance.playCards(hostPlayer.id, [winningCard]);
      expect(playRes.success).toBe(true);
      expect(engine.isGameOver).toBe(true);
      expect(hostPlayer.hand.length).toBe(0);

      // 1. Kiểm tra trên Host: matchState là GAME_OVER và winningMove phản ánh đúng lá bài A Cơ vừa đánh
      const hostGameStore = useGameStore.getState();
      expect(hostGameStore.isGameOver).toBe(true);
      expect(hostGameStore.matchState.status).toBe('GAME_OVER');
      if (hostGameStore.matchState.status === 'GAME_OVER') {
        expect(hostGameStore.matchState.winningMove).not.toBeNull();
        expect(hostGameStore.matchState.winningMove?.playerId).toBe(hostPlayer.id);
        expect(hostGameStore.matchState.winningMove?.combination.cards[0].rank).toBe(14);
        expect(hostGameStore.matchState.winningMove?.combination.cards[0].suit).toBe('HEARTS');
      }
      expect(hostGameStore.currentMove).not.toBeNull();
      expect(hostGameStore.currentMove?.playerId).toBe(hostPlayer.id);
      expect(hostGameStore.currentMove?.combination.cards[0].id).toBe(winningCard.id);

      // 2. Giả lập Khách (Guest) nhận TableStateSyncPacket từ Host
      expect(broadcastSpy).toHaveBeenCalled();
      const calls = broadcastSpy.mock.calls;
      const lastSyncPacket = calls[calls.length - 1][0] as TableStateSyncPacket;

      expect(lastSyncPacket.isGameOver).toBe(true);
      expect(lastSyncPacket.currentMoveCards?.length).toBe(1);
      expect(lastSyncPacket.currentMoveCards?.[0].rank).toBe(14);
      expect(lastSyncPacket.currentMoveCards?.[0].suit).toBe('HEARTS');

      // Chuyển sang góc nhìn Guest và áp dụng authoritative table sync
      useGameStore.setState({ myPlayerId: guestPlayer.id });
      useGameStore.getState().applyAuthoritativeTableSync(lastSyncPacket);

      const guestGameStore = useGameStore.getState();
      expect(guestGameStore.isGameOver).toBe(true);
      expect(guestGameStore.matchState.status).toBe('GAME_OVER');
      if (guestGameStore.matchState.status === 'GAME_OVER') {
        expect(guestGameStore.matchState.winningMove).not.toBeNull();
        expect(guestGameStore.matchState.winningMove?.playerId).toBe(hostPlayer.id);
        expect(guestGameStore.matchState.winningMove?.combination.cards[0].rank).toBe(14);
        expect(guestGameStore.matchState.winningMove?.combination.cards[0].suit).toBe('HEARTS');
      }
      expect(guestGameStore.currentMove).not.toBeNull();
      expect(guestGameStore.currentMove?.playerId).toBe(hostPlayer.id);
      expect(guestGameStore.currentMove?.combination.cards[0].id).toBe(winningCard.id);
    } finally {
      broadcastSpy.mockRestore();
    }
  });
});


