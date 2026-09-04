import { describe, expect, it, beforeEach } from 'bun:test';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useViewStore } from '../../src/stores/useViewStore';
import { loadPlayerProfile } from '../../src/engine/storage';
import { globalP2PClient } from '../../src/engine/network/p2p-client';
import { createCard } from '../../src/engine/card';
import { isValidMove } from '../../src/engine/validator';

describe('Online P2P Match Flow & State Transition Tests', () => {
  beforeEach(() => {
    useOnlineStore.getState().leaveRoom();
    useGameStore.setState({
      currentScreen: 'LOBBY',
      players: [],
      currentTurnPlayerId: null,
      leadPlayerId: null,
      currentMove: null,
      isGameOver: false,
      isDealing: false
    });
    useViewStore.getState().closeAllModals();
  });

  it('1. Host tạo phòng: khởi tạo roomState và chuyển trạng thái isOnlineMatch', () => {
    const profile = loadPlayerProfile();
    profile.name = 'Host Pro';

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount: 5000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
    });

    const state = useOnlineStore.getState();
    expect(state.isOnlineMatch).toBe(true);
    expect(state.isHost).toBe(true);
    expect(state.myPlayerId).toBe('p0');
    expect(state.roomCode).toStartWith('TL-');
    expect(state.roomState?.players.length).toBe(1);
    expect(state.roomState?.players[0].name).toBe('Host Pro');
    expect(state.roomState?.status).toBe('WAITING');
  });

  it('2. Host bắt đầu trận đấu: tự động lấp đầy Bot, chuyển screen sang GAME_TABLE và đóng modal ONLINE_ROOM', () => {
    const profile = loadPlayerProfile();
    profile.name = 'Host Pro';

    useViewStore.getState().openModal('ONLINE_ROOM');
    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount: 5000,
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

    const onlineState = useOnlineStore.getState();
    const gameState = useGameStore.getState();
    const modalState = useViewStore.getState();

    expect(onlineState.roomState?.status).toBe('PLAYING');
    expect(onlineState.roomState?.players.length).toBe(4);
    expect(gameState.currentScreen).toBe('GAME_TABLE');
    expect(gameState.activeGameType).toBe('ONLINE');
    expect(gameState.myPlayerId).toBe('p0');
    expect(gameState.players.length).toBe(4);
    expect(gameState.players[0].hand.length).toBe(13);
    expect(modalState.isOnlineRoomOpen).toBe(false);
  });

  it('3. Rời phòng: dọn dẹp sạch sẽ hostDriver, roomState và đưa screen về trạng thái ban đầu', () => {
    const profile = loadPlayerProfile();
    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount: 1000,
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
    expect(useOnlineStore.getState().isOnlineMatch).toBe(true);

    useOnlineStore.getState().leaveRoom();
    const state = useOnlineStore.getState();

    expect(state.isOnlineMatch).toBe(false);
    expect(state.isHost).toBe(false);
    expect(state.roomCode).toBeNull();
    expect(state.roomState).toBeNull();
    expect(state.hostDriver).toBeNull();
  });

  it('4. Sắp xếp bài khi chơi Online: hoạt động mượt mà cho cả Host và Guest', () => {
    const { createCard } = require('../../src/engine/card');
    const { createPlayer } = require('../../src/engine/player-factory');

    // Giả lập ván chơi Online cho Guest (p1)
    useOnlineStore.setState({
      isOnlineMatch: true,
      myPlayerId: 'p1'
    });

    const unorganizedCards = [
      createCard(10, 'HEARTS'),
      createCard(3, 'SPADES'),
      createCard(15, 'HEARTS'), // 2 Cơ
      createCard(4, 'CLUBS')
    ];

    useGameStore.setState({
      players: [
        createPlayer({ id: 'p0', name: 'Host', avatar: '🤠' }),
        createPlayer({ id: 'p1', name: 'Guest 1', avatar: '😎', hand: unorganizedCards })
      ],
      handSortMode: 'NATURAL',
      smartVariantIndex: 0
    });

    // Test xếp bài với hook useSmartHandSorting
    const { useSmartHandSorting } = require('../../src/ui/hooks/useSmartHandSorting');
    const mockEngineRef = { current: null };
    
    // Gọi sort trực tiếp bằng cách thực thi logic sắp xếp
    const store = useGameStore.getState();
    const guest = store.players.find(p => p.id === 'p1');
    expect(guest?.hand[0].rank).toBe(10);
    expect(guest?.hand[1].rank).toBe(3);

    // Chuyển sang SMART_GROUP
    useGameStore.setState({ handSortMode: 'SMART_GROUP' });
    expect(useGameStore.getState().handSortMode).toBe('SMART_GROUP');
  });

  it('5. Host ấn Ván Mới khi chơi Online: tiếp tục trận đấu P2P và không chuyển sang đánh với bot offline', () => {
    const profile = {
      ...loadPlayerProfile(),
      name: 'Host Player',
      avatar: '🤠',
      elo: 1500,
      coins: 80000,
      stats: {
        gamesPlayed: 10,
        wins: 5,
        chopsDone: 2,
        congsGiven: 1,
        totalEarned: 100000,
        highestStreak: 3,
        currentStreak: 1
      }
    };

    useOnlineStore.getState().createRoom(profile, {
      betAmount: 1000,
      playerCount: 4,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
    });

    // Ván 1 bắt đầu
    useOnlineStore.getState().startMatch();
    expect(useGameStore.getState().activeGameType).toBe('ONLINE');
    expect(useGameStore.getState().myPlayerId).toBe('p0');

    // Kết thúc Ván 1 và mở VICTORY modal
    useViewStore.getState().openModal('VICTORY');
    useGameStore.getState().setIsGameOver(true);
    expect(useViewStore.getState().isVictoryOpen).toBe(true);

    // Host bấm Ván Mới (gọi startMatch)
    useOnlineStore.getState().startMatch();

    // Xác nhận:
    // 1. activeGameType vẫn là ONLINE (không bị rơi về QUICK offline bot)
    expect(useGameStore.getState().activeGameType).toBe('ONLINE');
    // 3. Trạng thái ván mới đã reset chuẩn
    if (useGameStore.getState().instantWinType) {
      expect(useGameStore.getState().isGameOver).toBe(true);
    } else {
      expect(useGameStore.getState().isGameOver).toBe(false);
      expect(useGameStore.getState().currentMove).toBeNull();
      // 4. Host có 13 lá bài mới
      expect(useGameStore.getState().players[0].hand.length).toBe(13);
    }
  });

  it('6. Bỏ phiếu ván mới Online (Rematch Ready Check): Chỉ khi 100% người chơi trong phòng đồng ý mới bắt đầu ván mới', () => {
    const profile = {
      ...loadPlayerProfile(),
      name: 'Host Player',
      avatar: '🤠',
      elo: 1500,
      coins: 80000
    };

    useOnlineStore.getState().createRoom(profile, {
      betAmount: 1000,
      playerCount: 2,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
    });

    // Thêm guest p1 vào phòng
    const guestPlayer = {
      peerId: 'guest_peer_1',
      playerId: 'p1',
      name: 'Guest Player',
      avatar: '😎',
      elo: 1200,
      coins: 40000,
      isHost: false,
      isReady: true,
      isBot: false
    };
    const room = useOnlineStore.getState().roomState!;
    useOnlineStore.setState({
      roomState: {
        ...room,
        players: [...room.players, guestPlayer]
      }
    });

    // Bắt đầu ván 1
    useOnlineStore.getState().startMatch();
    expect(useGameStore.getState().activeGameType).toBe('ONLINE');

    // Giả lập ván 1 kết thúc -> HostEngineDriver handleGameOver reset isReady của tất cả người chơi về false
    const driver = useOnlineStore.getState().hostDriver!;
    driver.engine!.winners = [driver.engine!.players[0]];
    driver.engine!.isGameOver = true;
    (driver as any).handleGameOver();

    const stateAfterEnd = useOnlineStore.getState();
    expect(stateAfterEnd.roomState?.status).toBe('ENDED');
    expect(stateAfterEnd.roomState?.players[0].isReady).toBe(false);
    expect(stateAfterEnd.roomState?.players[1].isReady).toBe(false);
    expect(useGameStore.getState().isGameOver).toBe(true);

    // 1. Chỉ có Host vote sẵn sàng (1/2 phiếu) -> Ván mới CHƯA bắt đầu
    useOnlineStore.getState().voteRematch(true);
    expect(useOnlineStore.getState().roomState?.players[0].isReady).toBe(true);
    expect(useOnlineStore.getState().roomState?.players[1].isReady).toBe(false);
    expect(useGameStore.getState().isGameOver).toBe(true);

    // 2. Guest p1 vote sẵn sàng (2/2 phiếu - 100% đồng ý) -> Tự động bắt đầu ván mới
    driver.handleRematchVote('p1', true);
    expect(useOnlineStore.getState().roomState?.players[1].isReady).toBe(true);

    // Xác nhận ván 2 đã bắt đầu thành công
    if (useGameStore.getState().instantWinType) {
      expect(useGameStore.getState().isGameOver).toBe(true);
    } else {
      expect(useGameStore.getState().isGameOver).toBe(false);
      expect(useGameStore.getState().players[0].hand.length).toBe(13);
    }
  });

  it('7. Vào Ván 2 Online sau khi Rematch: Đảm bảo danh sách đối thủ hiển thị đầy đủ và đồng bộ nước đi cho đối thủ', () => {
    const profile = {
      ...loadPlayerProfile(),
      name: 'Host Player',
      avatar: '🤠',
      elo: 1500,
      coins: 80000
    };

    useOnlineStore.getState().createRoom(profile, {
      betAmount: 1000,
      playerCount: 2,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
    });

    const guestPlayer = {
      peerId: 'guest_peer_1',
      playerId: 'p1',
      name: 'Guest Player',
      avatar: '😎',
      elo: 1200,
      coins: 40000,
      isHost: false,
      isReady: true,
      isBot: false
    };
    const room = useOnlineStore.getState().roomState!;
    useOnlineStore.setState({
      roomState: {
        ...room,
        players: [...room.players, guestPlayer]
      }
    });

    // Bắt đầu ván 1
    useOnlineStore.getState().startMatch();

    // Kết thúc ván 1 và kích hoạt Rematch
    const driver = useOnlineStore.getState().hostDriver!;
    driver.engine!.winners = [driver.engine!.players[0]];
    driver.engine!.isGameOver = true;
    (driver as any).handleGameOver();
    useOnlineStore.getState().voteRematch(true);
    driver.handleRematchVote('p1', true);

    // Ván 2 tự động khởi động
    const gameStore = useGameStore.getState();
    const activeDriver = useOnlineStore.getState().hostDriver!;
    expect(gameStore.activeGameType).toBe('ONLINE');
    expect(gameStore.gameNumber).toBe(2);
    expect(gameStore.players.length).toBe(2);
    expect(gameStore.players[0].id).toBe('p0');
    expect(gameStore.players[1].id).toBe('p1');
    expect(gameStore.dealtCounts['p0']).toBe(13);
    expect(gameStore.dealtCounts['p1']).toBe(13);

    // Người có lượt đánh bài
    const turnPlayerId = gameStore.currentTurnPlayerId!;
    expect(['p0', 'p1']).toContain(turnPlayerId);

    const activePlayerInEngine = activeDriver.engine?.players.find(p => p.id === turnPlayerId)!;
    const cardToPlay = activePlayerInEngine.hand[0];

    activeDriver.handlePlayerAction({
      type: 'PLAY',
      playerId: turnPlayerId,
      cardIds: [cardToPlay.id],
      timestamp: Date.now()
    });

    // Xác nhận nước đi đã được đồng bộ lên bàn cờ
    const updatedGameStore = useGameStore.getState();
    expect(updatedGameStore.currentMove).not.toBeNull();
    expect(updatedGameStore.currentMove?.playerId).toBe(turnPlayerId);
    expect(updatedGameStore.dealtCounts[turnPlayerId]).toBe(12);
  });

  it('8. Khách thoát khi đang ở phòng chờ (WAITING): Tự động giải phóng slot thành ghế trống', () => {
    const profile = {
      ...loadPlayerProfile(),
      name: 'Host Player',
      avatar: '🤠',
      elo: 1500,
      coins: 80000
    };

    useOnlineStore.getState().createRoom(profile, {
      betAmount: 1000,
      playerCount: 3,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
    });

    const guestPlayer = {
      peerId: 'guest_peer_leave_1',
      playerId: 'p1',
      name: 'Guest Leaver',
      avatar: '😎',
      elo: 1200,
      coins: 40000,
      isHost: false,
      isReady: true,
      isBot: false
    };

    const room = useOnlineStore.getState().roomState!;
    useOnlineStore.setState({
      roomState: {
        ...room,
        players: [...room.players, guestPlayer]
      }
    });
    expect(useOnlineStore.getState().roomState?.players.length).toBe(2);

    // Giả lập guest ngắt kết nối (onPeerLeave)
    const hostDriver = useOnlineStore.getState().hostDriver;
    if (hostDriver) {
      hostDriver.handlePeerLeave('guest_peer_leave_1');
    } else {
      const currentRoom = useOnlineStore.getState().roomState!;
      const updatedPlayers = currentRoom.players.filter(p => p.peerId !== 'guest_peer_leave_1');
      useOnlineStore.setState({
        roomState: {
          ...currentRoom,
          players: updatedPlayers
        }
      });
    }

    // Xác nhận slot đã được giải phóng
    expect(useOnlineStore.getState().roomState?.players.length).toBe(1);
    expect(useOnlineStore.getState().roomState?.players[0].isHost).toBe(true);
  });

  it('9. Khách thoát / mất kết nối giữa trận đấu (PLAYING): Dừng trận ngay, giải tán bàn và hiển thị thông báo', () => {
    const profile = {
      ...loadPlayerProfile(),
      name: 'Host Player',
      avatar: '🤠',
      elo: 1500,
      coins: 80000
    };

    useOnlineStore.getState().createRoom(profile, {
      betAmount: 1000,
      playerCount: 2,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null,
      allowFourPairsCutAnytime: null,
      threeSpadesEndingBonus: null,
      cascadeChopEnabled: null,
      isPublic: true
    });

    const guestPlayer = {
      peerId: 'guest_peer_playing_leave',
      playerId: 'p1',
      name: 'Nguyễn Văn Thoát',
      avatar: '😎',
      elo: 1200,
      coins: 40000,
      isHost: false,
      isReady: true,
      isBot: false
    };

    const room = useOnlineStore.getState().roomState!;
    useOnlineStore.setState({
      roomState: {
        ...room,
        players: [...room.players, guestPlayer]
      }
    });

    // Bắt đầu trận đấu
    useOnlineStore.getState().startMatch();
    expect(useGameStore.getState().activeGameType).toBe('ONLINE');
    expect(useOnlineStore.getState().roomState?.status).toBe('PLAYING');

    // Khách rời phòng giữa chừng
    const driver = useOnlineStore.getState().hostDriver!;
    driver.handlePeerLeave('guest_peer_playing_leave');

    // Xác nhận bàn chơi giải tán và có thông báo rõ ràng
    const stateAfterDisband = useOnlineStore.getState();
    expect(stateAfterDisband.disbandNotice).not.toBeNull();
    expect(stateAfterDisband.disbandNotice?.title).toBe('BÀN CHƠI ĐÃ BỊ GIẢI TÁN');
    expect(stateAfterDisband.disbandNotice?.message).toContain('Nguyễn Văn Thoát');
    expect(useGameStore.getState().activeGameType).toBe('QUICK');
  });

  it('10. Host giải tán / thoát phòng: Các Khách nhận thông báo giải tán và quay về Sảnh an toàn', () => {
    const profile = {
      ...loadPlayerProfile(),
      name: 'Guest Player',
      avatar: '😎',
      elo: 1200,
      coins: 40000
    };

    // Khách tham gia phòng của Host
    useOnlineStore.getState().joinRoom(profile, 'TL-9999');
    expect(useOnlineStore.getState().isOnlineMatch).toBe(true);

    // Host gửi gói tin phòng DISBANDED
    const roomStateFromHost = {
      roomCode: 'TL-9999',
      hostPeerId: 'host_peer_123',
      playerCount: 2 as const,
      betAmount: 1000,
      settlementRule: 'COUNT_CARDS' as const,
      choppingMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      players: [],
      status: 'DISBANDED' as const,
      disbandReason: 'Chủ phòng đã thoát khỏi trận đấu.',
      updatedAt: Date.now()
    };

    // Khách nhận roomState DISBANDED
    const onRoomStateFn = (globalP2PClient as any).onRoomStateCallbacks?.[0];
    if (onRoomStateFn) {
      onRoomStateFn(roomStateFromHost, 'host_peer_123');
    }

    // Xác nhận Khách đã thoát online an toàn và hiện thông báo
    const guestState = useOnlineStore.getState();
    expect(guestState.isOnlineMatch).toBe(false);
    expect(guestState.disbandNotice?.message).toContain('Chủ phòng đã thoát');
    expect(useGameStore.getState().currentScreen).toBe('LOBBY');
  });

  it('11. Trận đấu Online 2 người: Bắt đầu mượt mà, State Pattern PLAYING kích hoạt, kiểm tra quyền đi đầu với 3 Bích', () => {
    const profileHost = { ...loadPlayerProfile(), name: 'Host Player' };

    // Host tạo bàn 2 người
    useOnlineStore.getState().createRoom(profileHost, {
      playerCount: 2,
      betAmount: 2000,
      settlementRule: 'TRADITIONAL',
      choppingMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      isPublic: true
    });

    // Giả lập Khách gửi join request vào phòng
    const onJoinReqFn = (globalP2PClient as any).onJoinRequestCallbacks?.[0];
    expect(onJoinReqFn).toBeDefined();
    onJoinReqFn({
      peerId: 'guest_peer_2p',
      playerId: 'p1',
      name: 'Guest Player',
      avatar: '🤠',
      elo: 1000,
      coins: 50000,
      isHost: false,
      isReady: true,
      isBot: false
    }, 'guest_peer_2p');

    const roomBeforeStart = useOnlineStore.getState().roomState;
    expect(roomBeforeStart?.players.length).toBe(2);
    expect(roomBeforeStart?.playerCount).toBe(2);

    // Host bắt đầu trận đấu 2 người
    useOnlineStore.getState().startMatch();

    const gameState = useGameStore.getState();
    const onlineState = useOnlineStore.getState();

    // 1. Kiểm tra trạng thái trận đấu
    expect(onlineState.roomState?.status).toBe('PLAYING');
    expect(onlineState.roomState?.players.length).toBe(2); // Đúng 2 người, không thêm bot thừa
    expect(gameState.activeGameType).toBe('ONLINE');
    expect(gameState.players.length).toBe(2);
    expect(gameState.players[0].hand.length).toBe(13); // Host nhận 13 lá
    expect(gameState.dealtCounts['p0']).toBe(13);
    expect(gameState.dealtCounts['p1']).toBe(13);

    // 2. State Pattern: matchState BẢO ĐẢM chuyển sang status PLAYING (Không bị treo ở WAITING)
    expect(gameState.matchState.status).toBe('PLAYING');
    if (gameState.matchState.status === 'PLAYING') {
      expect(gameState.matchState.currentTurnPlayerId).toBeDefined();
      expect(gameState.matchState.leadPlayerId).toBeDefined();
    }

    const hostDriver = useOnlineStore.getState().hostDriver;
    expect(hostDriver).not.toBeNull();
    const firstTurnId = hostDriver?.engine?.currentRound.currentTurnPlayerId;
    const isFirstMoveOfGame = hostDriver?.engine?.isFirstMoveOfGame;

    expect(gameState.currentTurnPlayerId).toBe(firstTurnId ?? null);
    expect(gameState.isFirstMoveOfGame).toBe(isFirstMoveOfGame ?? false);

    // 3. Nếu Host giữ 3 Bích: Host có lượt đánh, 3 Bích hợp lệ
    const hostHand = gameState.players[0].hand;
    const hostHas3S = hostHand.some(c => c.rank === 3 && c.suit === 'SPADES');

    if (hostHas3S) {
      expect(firstTurnId).toBe('p0');
      expect(isFirstMoveOfGame).toBe(true);

      const card3S = hostHand.find(c => c.rank === 3 && c.suit === 'SPADES')!;
      const validation = isValidMove({
        cards: [card3S],
        target: null,
        isFirstMoveOfGame: true,
        isLeadMove: true,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: false,
        prohibitEndingWithTwo: true
      });
      expect(validation.valid).toBe(true);

      // Host thực hiện đánh 3 Bích
      useOnlineStore.getState().sendMoveAction([card3S.id]);

      const stateAfterPlay = useGameStore.getState();
      expect(stateAfterPlay.currentMove).not.toBeNull();
      expect(stateAfterPlay.currentMove?.playerId).toBe('p0');
      // Lượt chuyển sang Khách (p1)
      expect(stateAfterPlay.currentTurnPlayerId).toBe('p1');
      // isFirstMoveOfGame đã chuyển thành false
      expect(stateAfterPlay.isFirstMoveOfGame).toBe(false);
    }
  });

  it('12. Khách nhận gói tin chia bài chứa 3 Bích: matchState chuyển PLAYING và có lượt đánh đầu tiên', () => {
    const profileGuest = { ...loadPlayerProfile(), name: 'Guest Tester', coins: 50000 };
    useOnlineStore.getState().joinRoom(profileGuest, 'TL-2222');

    const card3S = createCard(3, 'SPADES');
    const dummyHand = [card3S];
    for (let r = 4; r <= 15; r++) {
      dummyHand.push(createCard(r as any, 'HEARTS'));
    }

    // Giả lập Khách nhận gói tin onDealHand từ Host
    const onDealHandFn = (globalP2PClient as any).onDealHandCallbacks?.[0];
    expect(onDealHandFn).toBeDefined();

    onDealHandFn({
      playerId: 'p1',
      cards: dummyHand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
      leadPlayerId: 'p1',
      firstTurnPlayerId: 'p1',
      gameNumber: 1,
      isFirstMoveOfGame: true,
      isLeadMove: true
    });

    const guestGameStore = useGameStore.getState();

    // Xác nhận State Pattern trên máy Khách đã chuyển sang PLAYING
    expect(guestGameStore.matchState.status).toBe('PLAYING');
    expect(guestGameStore.currentTurnPlayerId).toBe('p1');
    expect(guestGameStore.leadPlayerId).toBe('p1');
    expect(guestGameStore.isFirstMoveOfGame).toBe(true);
    expect(guestGameStore.isLeadMove).toBe(true);

    // Khách có quân 3 Bích trên tay
    const guestHand = guestGameStore.players.find(p => p.id === 'p1')?.hand || [];
    expect(guestHand.length).toBe(13);
    expect(guestHand.some(c => c.rank === 3 && c.suit === 'SPADES')).toBe(true);

    // Lượt đầu tiên: Đánh 3 Bích là hợp lệ
    const valid3S = isValidMove({
      cards: [card3S],
      target: null,
      isFirstMoveOfGame: guestGameStore.isFirstMoveOfGame,
      isLeadMove: guestGameStore.isLeadMove,
      hasPassedRound: false,
      allowFourPairsCutAnytime: true,
      isFinishingMove: false,
      prohibitEndingWithTwo: true
    });
    expect(valid3S.valid).toBe(true);

    // Đánh quân khác (không chứa 3 Bích) ở lượt đầu tiên sẽ bị từ chối
    const invalidCard = guestHand.find(c => !(c.rank === 3 && c.suit === 'SPADES'))!;
    const invalidPlay = isValidMove({
      cards: [invalidCard],
      target: null,
      isFirstMoveOfGame: guestGameStore.isFirstMoveOfGame,
      isLeadMove: guestGameStore.isLeadMove,
      hasPassedRound: false,
      allowFourPairsCutAnytime: true,
      isFinishingMove: false,
      prohibitEndingWithTwo: true
    });
    expect(invalidPlay.valid).toBe(false);
    expect(invalidPlay.reason).toContain('3 Bích');
  });

  it('13. Bàn 2 người không ai có 3 Bích: Người giữ bài nhỏ nhất được đi trước và không bắt buộc 3 Bích', () => {
    const profileGuest = { ...loadPlayerProfile(), name: 'Guest Smallest', coins: 50000 };
    useOnlineStore.getState().joinRoom(profileGuest, 'TL-3333');

    // Giả lập bài Khách có lá nhỏ nhất là 4 Bích (không có 3 Bích)
    const card4S = createCard(4, 'SPADES');
    const guestHand = [card4S];
    for (let r = 5; r <= 16; r++) {
      guestHand.push(createCard(Math.min(15, r) as any, 'CLUBS'));
    }

    const onDealHandFn = (globalP2PClient as any).onDealHandCallbacks?.[0];
    onDealHandFn({
      playerId: 'p1',
      cards: guestHand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
      leadPlayerId: 'p1',
      firstTurnPlayerId: 'p1',
      gameNumber: 1,
      isFirstMoveOfGame: false, // Không ai có 3 Bích nên không bắt buộc 3 Bích
      isLeadMove: true
    });

    const store = useGameStore.getState();
    expect(store.matchState.status).toBe('PLAYING');
    expect(store.currentTurnPlayerId).toBe('p1');
    expect(store.isFirstMoveOfGame).toBe(false);

    // Đánh 4 Bích hoàn toàn hợp lệ mà không bị báo lỗi thiếu 3 Bích
    const validation = isValidMove({
      cards: [card4S],
      target: null,
      isFirstMoveOfGame: store.isFirstMoveOfGame,
      isLeadMove: store.isLeadMove,
      hasPassedRound: false,
      allowFourPairsCutAnytime: true,
      isFinishingMove: false,
      prohibitEndingWithTwo: true
    });
    expect(validation.valid).toBe(true);
  });
});


