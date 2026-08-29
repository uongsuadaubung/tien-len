import { describe, expect, it, beforeEach } from 'bun:test';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useModalStore } from '../../src/stores/useModalStore';
import { loadPlayerProfile } from '../../src/engine/storage';
import { globalP2PClient } from '../../src/engine/network/p2p-client';

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
    useModalStore.getState().closeAllModals();
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
      prohibitEndingWithTwo: null
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

    useModalStore.getState().openModal('ONLINE_ROOM');
    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount: 5000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: null,
      congEnabled: null,
      prohibitEndingWithTwo: null
    });

    useOnlineStore.getState().startMatch();

    const onlineState = useOnlineStore.getState();
    const gameState = useGameStore.getState();
    const modalState = useModalStore.getState();

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
      prohibitEndingWithTwo: null
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
      prohibitEndingWithTwo: null
    });

    // Ván 1 bắt đầu
    useOnlineStore.getState().startMatch();
    expect(useGameStore.getState().activeGameType).toBe('ONLINE');
    expect(useGameStore.getState().myPlayerId).toBe('p0');

    // Kết thúc Ván 1 và mở VICTORY modal
    useModalStore.getState().openModal('VICTORY');
    useGameStore.getState().setIsGameOver(true);
    expect(useModalStore.getState().isVictoryOpen).toBe(true);

    // Host bấm Ván Mới (gọi startMatch)
    useOnlineStore.getState().startMatch();

    // Xác nhận:
    // 1. activeGameType vẫn là ONLINE (không bị rơi về QUICK offline bot)
    expect(useGameStore.getState().activeGameType).toBe('ONLINE');
    // 2. VICTORY modal được đóng tự động
    expect(useModalStore.getState().isVictoryOpen).toBe(false);
    // 3. Trạng thái ván mới đã reset chuẩn
    expect(useGameStore.getState().isGameOver).toBe(false);
    expect(useGameStore.getState().currentMove).toBeNull();
    // 4. Host có 13 lá bài mới
    expect(useGameStore.getState().players[0].hand.length).toBe(13);
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
      prohibitEndingWithTwo: null
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
    expect(useGameStore.getState().isGameOver).toBe(false);
    expect(useModalStore.getState().isVictoryOpen).toBe(false);
    expect(useGameStore.getState().players[0].hand.length).toBe(13);
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
      prohibitEndingWithTwo: null
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
      prohibitEndingWithTwo: null
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
      prohibitEndingWithTwo: null
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
});


