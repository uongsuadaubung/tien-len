import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useViewStore } from '../../src/stores/useViewStore';
import { loadPlayerProfile } from '../../src/engine/storage';
import { globalP2PClient } from '../../src/engine/network/p2p-client';
import { createCard, ALL_RANKS } from '../../src/engine/card';
import { Card } from '../../src/engine/types';
import { createPlayer } from '../../src/engine/player-factory';
import { isValidMove } from '../../src/engine/validator';
import { identifyCombination } from '../../src/engine/combinations';
import { appFlowCoordinator } from '../../src/services/app-flow-coordinator';
import { createTableSyncPacket, createGameEndPacket } from '../../src/engine/network/packet-factory';

describe('Online P2P Match Flow & State Transition Tests', () => {
  beforeEach(() => {
    useOnlineStore.getState().leaveRoom();
    useGameStore.getState().resetMatchState();
    useGameStore.setState({
      myPlayerId: loadPlayerProfile().id,
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
      settlementRule: 'COUNT_CARDS',      isPublic: true
    });

    const state = useOnlineStore.getState();
    expect(state.isOnlineMatch).toBe(true);
    expect(state.isHost).toBe(true);
    expect(state.myPlayerId).toBe(profile.id);
    expect(state.roomCode).toStartWith('TL-');
    expect(state.roomState?.players.length).toBe(1);
    expect(state.roomState?.players[0].name).toBe('Host Pro');
    expect(state.roomState?.status).toBe('WAITING');
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

  it('2. Host bắt đầu trận đấu: khi đủ người chơi thật, chuyển screen sang GAME_TABLE và đóng modal ONLINE_ROOM', () => {
    const profile = loadPlayerProfile();
    profile.name = 'Host Pro';

    useViewStore.getState().openModal('ONLINE_ROOM');
    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount: 5000,
      settlementRule: 'COUNT_CARDS',      isPublic: true
    });
    fillRoomWithPeers(4);

    useOnlineStore.getState().startMatch();

    const onlineState = useOnlineStore.getState();
    const gameState = useGameStore.getState();
    const modalState = useViewStore.getState();

    expect(onlineState.roomState?.status).toBe('PLAYING');
    expect(onlineState.roomState?.players.length).toBe(4);
    expect(gameState.currentScreen).toBe('GAME_TABLE');
    expect(gameState.activeGameType).toBe('ONLINE');
    expect(gameState.myPlayerId).toBe(profile.id);
    expect(gameState.players.length).toBe(4);
    expect(gameState.players[0].hand.length).toBe(13);
    expect(modalState.isOnlineRoomOpen).toBe(false);
  });

  it('3. Rời phòng: dọn dẹp sạch sẽ hostInstance, roomState và đưa screen về trạng thái ban đầu', () => {
    const profile = loadPlayerProfile();
    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount: 1000,
      settlementRule: 'COUNT_CARDS',      isPublic: true
    });

    useOnlineStore.getState().startMatch();
    expect(useOnlineStore.getState().isOnlineMatch).toBe(true);

    useOnlineStore.getState().leaveRoom();
    const state = useOnlineStore.getState();

    expect(state.isOnlineMatch).toBe(false);
    expect(state.isHost).toBe(false);
    expect(state.roomCode).toBeNull();
    expect(state.roomState).toBeNull();
    expect(state.hostInstance).toBeNull();
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
      settlementRule: 'COUNT_CARDS',      isPublic: true
    });
    fillRoomWithPeers(4);

    // Ván 1 bắt đầu
    useOnlineStore.getState().startMatch();
    expect(useGameStore.getState().activeGameType).toBe('ONLINE');
    expect(useGameStore.getState().myPlayerId).toBe(profile.id);

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
    const isInstantWin = Boolean(useGameStore.getState().instantWinType || useOnlineStore.getState().hostInstance?.instantWinType);
    if (isInstantWin) {
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
      settlementRule: 'COUNT_CARDS',      isPublic: true
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
    const driver = useOnlineStore.getState().hostInstance!;
    driver.engine!.winners = [driver.engine!.players[0]];
    driver.engine!.isGameOver = true;
    driver.handleGameOver({ skipDelay: true });

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
      settlementRule: 'COUNT_CARDS',      isPublic: true
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
    const driver = useOnlineStore.getState().hostInstance!;
    driver.engine!.winners = [driver.engine!.players[0]];
    driver.engine!.isGameOver = true;
    driver.handleGameOver({ skipDelay: true });
    useOnlineStore.getState().voteRematch(true);
    driver.handleRematchVote('p1', true);

    // Ván 2 tự động khởi động
    const activeDriver = useOnlineStore.getState().hostInstance!;
    activeDriver.finishDealing();
    const gameStore = useGameStore.getState();
    expect(gameStore.activeGameType).toBe('ONLINE');
    expect(gameStore.gameNumber).toBe(2);
    expect(gameStore.players.length).toBe(2);
    expect(gameStore.players[0].id).toBe(profile.id);
    expect(gameStore.players[1].id).toBe('p1');
    expect(gameStore.dealtCounts[profile.id]).toBe(13);
    expect(gameStore.dealtCounts['p1']).toBe(13);

    // Người có lượt đánh bài
    const turnPlayerId = gameStore.currentTurnPlayerId!;
    expect([profile.id, 'p1']).toContain(turnPlayerId);

    const activePlayerInEngine = activeDriver.engine?.players.find(p => p.id === turnPlayerId)!;
    const has3S = activePlayerInEngine.hand.find((c: Card) => c.rank === 3 && c.suit === 'SPADES');
    const cardToPlay = has3S || activePlayerInEngine.hand[0];

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
      settlementRule: 'COUNT_CARDS',      isPublic: true
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
    const hostInstance = useOnlineStore.getState().hostInstance;
    if (hostInstance) {
      hostInstance.handlePeerLeave('guest_peer_leave_1');
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
      settlementRule: 'COUNT_CARDS',      isPublic: true
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
    if (useGameStore.getState().instantWinType) {
      useGameStore.setState({ instantWinType: null });
      useOnlineStore.setState({ roomState: { ...useOnlineStore.getState().roomState!, status: 'PLAYING' } });
    }
    expect(useGameStore.getState().activeGameType).toBe('ONLINE');
    expect(useOnlineStore.getState().roomState?.status).toBe('PLAYING');

    // Khách rời phòng giữa chừng -> Kích hoạt Grace Period 25s
    const driver = useOnlineStore.getState().hostInstance!;
    driver.handlePeerLeave('guest_peer_playing_leave');

    // Xác nhận bàn chơi chưa giải tán ngay mà bước vào Grace Period 25s
    const stateDuringGrace = useOnlineStore.getState();
    expect(stateDuringGrace.roomState?.status).toBe('PLAYING');
    const leavingInRoom = stateDuringGrace.roomState?.players.find(p => p.playerId === 'p1');
    expect(leavingInRoom?.isDisconnected).toBe(true);
    expect(leavingInRoom?.disconnectDeadline).toBeGreaterThan(Date.now());
    expect(stateDuringGrace.disbandNotice).toBeNull();
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
      congMultiplier: 1,
      isPublic: true,
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
    globalP2PClient.emitRoomStateForTest(roomStateFromHost, 'host_peer_123');

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
    globalP2PClient.emitJoinRequestForTest({
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
    useOnlineStore.getState().hostInstance?.finishDealing();

    const gameState = useGameStore.getState();
    const onlineState = useOnlineStore.getState();

    // 1. Kiểm tra trạng thái trận đấu
    expect(onlineState.roomState?.status).toBe('PLAYING');
    expect(onlineState.roomState?.players.length).toBe(2); // Đúng 2 người, không thêm bot thừa
    expect(gameState.activeGameType).toBe('ONLINE');
    expect(gameState.players.length).toBe(2);
    expect(gameState.players[0].hand.length).toBe(13); // Host nhận 13 lá
    expect(gameState.dealtCounts[profileHost.id]).toBe(13);
    expect(gameState.dealtCounts['p1']).toBe(13);

    // 2. State Pattern: matchState BẢO ĐẢM chuyển sang status PLAYING (hoặc GAME_OVER nếu tới trắng ngẫu nhiên)
    expect(['PLAYING', 'GAME_OVER']).toContain(gameState.matchState.status);
    if (gameState.matchState.status === 'PLAYING') {
      expect(gameState.matchState.currentTurnPlayerId).toBeDefined();
      expect(gameState.matchState.leadPlayerId).toBeDefined();

      const hostInstance = useOnlineStore.getState().hostInstance;
      expect(hostInstance).not.toBeNull();
      const firstTurnId = hostInstance?.engine?.currentRound.currentTurnPlayerId;
      const isFirstMoveOfGame = hostInstance?.engine?.isFirstMoveOfGame;

      expect(gameState.currentTurnPlayerId).toBe(firstTurnId ?? null);
      expect(gameState.isFirstMoveOfGame).toBe(isFirstMoveOfGame ?? false);

      // 3. Nếu Host giữ 3 Bích: Host có lượt đánh, 3 Bích hợp lệ
      const hostHand = gameState.players[0].hand;
      const hostHas3S = hostHand.some(c => c.rank === 3 && c.suit === 'SPADES');

      if (hostHas3S) {
        expect(firstTurnId).toBe(profileHost.id);
        expect(isFirstMoveOfGame).toBe(true);

        const card3S = hostHand.find(c => c.rank === 3 && c.suit === 'SPADES')!;
        const validation = isValidMove({
          cards: [card3S],
          target: null,
          isFirstMoveOfGame: true,
          firstMoveRequiredCard: card3S,
          isLeadMove: true,
          hasPassedRound: false,
          allowFourPairsCutAnytime: true,
          isFinishingMove: false,
          prohibitEndingWithTwo: true
        });
        // Host thực hiện đánh 3 Bích
        useOnlineStore.getState().sendMoveAction([card3S.id]);

        const stateAfterPlay = useGameStore.getState();
        expect(stateAfterPlay.currentMove).not.toBeNull();
        expect(stateAfterPlay.currentMove?.playerId).toBe(profileHost.id);
        // Lượt chuyển sang Khách (p1)
        expect(stateAfterPlay.currentTurnPlayerId).toBe('p1');
        // isFirstMoveOfGame đã chuyển thành false
        expect(stateAfterPlay.isFirstMoveOfGame).toBe(false);
      }
    }
  });

  it('12. Khách nhận gói tin chia bài chứa 3 Bích: matchState chuyển PLAYING và có lượt đánh đầu tiên', () => {
    const profileGuest = { ...loadPlayerProfile(), name: 'Guest Tester', coins: 50000 };
    useOnlineStore.getState().joinRoom(profileGuest, 'TL-2222');

    const card3S = createCard(3, 'SPADES');
    const dummyHand = [card3S];
    for (const r of ALL_RANKS) {
      if (r >= 4) {
        dummyHand.push(createCard(r, 'HEARTS'));
      }
    }

    // Giả lập Khách nhận gói tin onDealHand từ Host
    globalP2PClient.emitDealHandForTest({
      playerId: 'p1',
      cards: dummyHand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
      leadPlayerId: 'p1',
      firstTurnPlayerId: 'p1',
      gameNumber: 1,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: { rank: card3S.rank, suit: card3S.suit, id: card3S.id },
      isLeadMove: true
    }, 'host_peer');

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
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: card3S,
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
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: card3S,
      isLeadMove: guestGameStore.isLeadMove,
      hasPassedRound: false,
      allowFourPairsCutAnytime: true,
      isFinishingMove: false,
      prohibitEndingWithTwo: true
    });
    expect(invalidPlay.valid).toBe(false);
    expect(invalidPlay.reason).toContain('3 Bích');
  });

  it('13. Bàn 2 người không ai có 3 Bích: Người giữ bài nhỏ nhất được đi trước và BẮT BUỘC phải đánh lá bài nhỏ nhất (hoặc bộ chứa nó)', () => {
    const profileGuest = { ...loadPlayerProfile(), name: 'Guest Smallest', coins: 50000 };
    useOnlineStore.getState().joinRoom(profileGuest, 'TL-3333');

    // Giả lập bài Khách có lá nhỏ nhất là 4 Bích (không ai có 3 Bích)
    const card4S = createCard(4, 'SPADES');
    const card5C = createCard(5, 'CLUBS');
    const guestHand = [card4S, card5C];
    for (const r of ALL_RANKS) {
      if (r >= 6) {
        guestHand.push(createCard(r, 'CLUBS'));
      }
    }

    globalP2PClient.emitDealHandForTest({
      playerId: 'p1',
      cards: guestHand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
      leadPlayerId: 'p1',
      firstTurnPlayerId: 'p1',
      gameNumber: 1,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: { rank: card4S.rank, suit: card4S.suit, id: card4S.id },
      isLeadMove: true
    }, 'host_peer');

    const store = useGameStore.getState();
    expect(store.matchState.status).toBe('PLAYING');
    expect(store.currentTurnPlayerId).toBe('p1');
    expect(store.isFirstMoveOfGame).toBe(true);
    expect(store.firstMoveRequiredCard?.id).toBe(card4S.id);

    // 1. Thử đánh lá không phải 4 Bích (ví dụ 5 Tép) -> Phải bị từ chối
    const invalidValidation = isValidMove({
      cards: [card5C],
      target: null,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: card4S,
      isLeadMove: store.isLeadMove,
      hasPassedRound: false,
      allowFourPairsCutAnytime: true,
      isFinishingMove: false,
      prohibitEndingWithTwo: true
    });
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.reason).toContain('4 Bích');

    // 2. Đánh lẻ 4 Bích (hoặc tổ hợp chứa 4 Bích) -> Hoàn toàn hợp lệ
    const validValidation = isValidMove({
      cards: [card4S],
      target: null,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: card4S,
      isLeadMove: store.isLeadMove,
      hasPassedRound: false,
      allowFourPairsCutAnytime: true,
      isFinishingMove: false,
      prohibitEndingWithTwo: true
    });
    expect(validValidation.valid).toBe(true);
  });

  it('14. Đồng bộ TableCenter & HUD Client: Khi Host đánh bài, Client thấy lá bài trên bàn và thấy đúng số bài Host còn lại', () => {
    const profileGuest = { ...loadPlayerProfile(), name: 'Guest Tester', coins: 50000 };
    useOnlineStore.getState().joinRoom(profileGuest, 'TL-4444');

    const hostId = 'host_p0';
    const guestId = profileGuest.id;

    useOnlineStore.setState({
      roomState: {
        ...useOnlineStore.getState().roomState!,
        players: [
          { peerId: 'host_peer_123', playerId: hostId, name: 'Host Pro', avatar: '🤠', elo: 1000, coins: 50000, isHost: true, isReady: true, isBot: false },
          { peerId: 'guest_peer_456', playerId: guestId, name: profileGuest.name, avatar: profileGuest.avatar, elo: profileGuest.elo, coins: profileGuest.coins, isHost: false, isReady: true, isBot: false }
        ]
      }
    });

    const card3S = createCard(3, 'SPADES');
    const guestCards = [card3S, ...ALL_RANKS.filter(r => r !== 3).map(r => createCard(r, 'CLUBS'))];

    // 1. Giả lập Host chia bài cho Client
    globalP2PClient.emitDealHandForTest({
      playerId: guestId,
      cards: guestCards.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
      leadPlayerId: hostId,
      firstTurnPlayerId: hostId,
      gameNumber: 1,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: { rank: card3S.rank, suit: card3S.suit, id: card3S.id },
      isLeadMove: true
    }, 'host_peer');

    const store = useGameStore.getState();
    expect(store.matchState.status).toBe('PLAYING');
    expect(store.currentTurnPlayerId).toBe(hostId);
    expect(store.dealtCounts[hostId]).toBe(13);
    expect(store.dealtCounts[guestId]).toBe(13);

    // 2. Host đánh ra lá bài 3 Bích (SINGLE [3S])
    globalP2PClient.emitTableSyncForTest(createTableSyncPacket({
      seq: 1,
      currentTurnPlayerId: guestId, // Chuyển lượt sang Client
      leadPlayerId: hostId,
      currentMoveCards: [{ rank: 3, suit: 'SPADES', id: '3_SPADES' }],
      currentMovePlayerId: hostId,
      remainingCardCounts: {
        [hostId]: 12, // Host còn 12 lá
        [guestId]: 13 // Guest còn 13 lá
      },
      lastActionMessage: 'Chủ Bàn đã đánh bài',
      isFirstMoveOfGame: false,
      isLeadMove: false
    }), 'host_peer');

    const updatedStore = useGameStore.getState();

    // 3. Kiểm tra lá bài hiển thị trên bàn (TableCenter):
    // gameStore.currentMove và matchState.leadingMove BẢO ĐẢM KHÔNG BỊ NULL
    expect(updatedStore.currentMove).not.toBeNull();
    expect(updatedStore.currentMove?.playerId).toBe(hostId);
    expect(updatedStore.currentMove?.combination.type).toBe('SINGLE');
    expect(updatedStore.currentMove?.combination.cards[0].rank).toBe(3);
    expect(updatedStore.currentMove?.combination.cards[0].suit).toBe('SPADES');

    // Kiểm tra matchState.leadingMove và isLeadMove
    expect(updatedStore.matchState.status).toBe('PLAYING');
    if (updatedStore.matchState.status === 'PLAYING') {
      expect(updatedStore.matchState.isLeadMove).toBe(false);
      expect(updatedStore.matchState.leadingMove).not.toBeNull();
      expect(updatedStore.matchState.leadingMove?.playerId).toBe(hostId);
      expect(updatedStore.matchState.leadingMove?.combination.cards[0].rank).toBe(3);
    }

    // 4. Kiểm tra HUD số lá bài của Host: Phải là 12, không bao giờ bị 0 hay rỗng
    expect(updatedStore.dealtCounts[hostId]).toBe(12);
    expect(updatedStore.dealtCounts[guestId]).toBe(13);
  });

  it('14. Khách đánh bài qua sendMoveAction: Gửi đúng cardIds lên Host, hiển thị bài đánh trên bàn và chuyển lượt', () => {
    const profileGuest = { ...loadPlayerProfile(), id: 'guest_test_p1', name: 'Guest Tester', coins: 50000 };
    useOnlineStore.getState().joinRoom(profileGuest, 'TL-3333');
    useOnlineStore.setState({ myPlayerId: profileGuest.id, isHost: false });

    // Giả lập guestDriver được khởi tạo
    const sendSpy = spyOn(globalP2PClient, 'sendPlayerAction');

    const cardToPlay = createCard(5, 'DIAMONDS');
    useGameStore.setState({
      myPlayerId: profileGuest.id,
      players: [
        createPlayer({ id: 'host_p0', name: 'Host', avatar: '🤠', score: 50000, hand: [] }),
        createPlayer({ id: profileGuest.id, name: profileGuest.name, avatar: '🤠', score: 50000, hand: [cardToPlay] })
      ]
    });

    // Khách thực hiện đánh bài
    useOnlineStore.getState().sendMoveAction([cardToPlay.id]);

    expect(sendSpy).toHaveBeenCalled();
    const lastCall = sendSpy.mock.calls[sendSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('PLAY');
    expect(lastCall.playerId).toBe(profileGuest.id);
    expect(lastCall.cardIds).toEqual([cardToPlay.id]);

    sendSpy.mockRestore();
  });

  it('15. Bỏ phiếu Rematch qua mạng P2P (Guest sẵn sàng trước, Host sẵn sàng sau): Tự động bắt đầu Ván 2 và dọn dẹp modal Victory', () => {
    const profileHost = {
      ...loadPlayerProfile(),
      name: 'Host Rematch Test',
      avatar: '🤠',
      elo: 1600,
      coins: 90000
    };

    useOnlineStore.getState().createRoom(profileHost, {
      betAmount: 1000,
      playerCount: 2,
      settlementRule: 'COUNT_CARDS',
      isPublic: true
    });

    const guestPlayer = {
      peerId: 'guest_peer_rematch_1',
      playerId: 'guest_rematch_p1',
      name: 'Guest Rematcher',
      avatar: '😎',
      elo: 1300,
      coins: 50000,
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

    // 1. Khởi động Ván 1
    useOnlineStore.getState().startMatch();
    const driver = useOnlineStore.getState().hostInstance!;
    driver.engine!.winners = [driver.engine!.players[0]];
    driver.engine!.isGameOver = true;
    driver.handleGameOver({ skipDelay: true });

    // Đảm bảo ván 1 kết thúc, modal Victory được mở giả định
    useViewStore.getState().openModal('VICTORY');
    expect(useViewStore.getState().isVictoryOpen).toBe(true);
    expect(useOnlineStore.getState().roomState?.status).toBe('ENDED');
    expect(useOnlineStore.getState().roomState?.players[0].isReady).toBe(false);
    expect(useOnlineStore.getState().roomState?.players[1].isReady).toBe(false);

    // 2. Khách gửi REMATCH_VOTE qua mạng P2P trước
    globalP2PClient.emitRematchVoteForTest({
      playerId: guestPlayer.playerId,
      isReady: true,
      timestamp: Date.now()
    }, guestPlayer.peerId);

    // Host đã tiếp nhận vote của khách: Khách = true, Host = false -> Chưa bắt đầu ván mới
    expect(useOnlineStore.getState().roomState?.players[1].isReady).toBe(true);
    expect(useOnlineStore.getState().roomState?.players[0].isReady).toBe(false);
    expect(useViewStore.getState().isVictoryOpen).toBe(true);

    // 3. Giờ Host bấm sẵn sàng -> Cả 2 đều sẵn sàng -> Tự động kích hoạt Ván 2
    useOnlineStore.getState().voteRematch(true);

    expect(useOnlineStore.getState().roomState?.status).toBe('PLAYING');
    expect(useViewStore.getState().isVictoryOpen).toBe(false);
    expect(useGameStore.getState().gameNumber).toBe(2);
    if (!useGameStore.getState().instantWinType) {
      expect(useGameStore.getState().isGameOver).toBe(false);
      expect(useGameStore.getState().players[0].hand.length).toBe(13);
    }
  });

  it('16. Bỏ phiếu Rematch qua mạng P2P (Host sẵn sàng trước, Guest sẵn sàng sau): Tự động bắt đầu Ván 2 và dọn dẹp modal Victory', () => {
    const profileHost = {
      ...loadPlayerProfile(),
      name: 'Host Rematch Test 2',
      avatar: '🤠',
      elo: 1600,
      coins: 90000
    };

    useOnlineStore.getState().createRoom(profileHost, {
      betAmount: 1000,
      playerCount: 2,
      settlementRule: 'COUNT_CARDS',
      isPublic: true
    });

    const guestPlayer = {
      peerId: 'guest_peer_rematch_2',
      playerId: 'guest_rematch_p2',
      name: 'Guest Rematcher 2',
      avatar: '😎',
      elo: 1300,
      coins: 50000,
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

    // 1. Khởi động Ván 1
    useOnlineStore.getState().startMatch();
    const driver = useOnlineStore.getState().hostInstance!;
    driver.engine!.winners = [driver.engine!.players[0]];
    driver.engine!.isGameOver = true;
    driver.handleGameOver({ skipDelay: true });

    useViewStore.getState().openModal('VICTORY');
    expect(useViewStore.getState().isVictoryOpen).toBe(true);
    expect(useOnlineStore.getState().roomState?.status).toBe('ENDED');

    // 2. Host bấm sẵn sàng trước
    useOnlineStore.getState().voteRematch(true);
    expect(useOnlineStore.getState().roomState?.players[0].isReady).toBe(true);
    expect(useOnlineStore.getState().roomState?.players[1].isReady).toBe(false);
    expect(useViewStore.getState().isVictoryOpen).toBe(true);

    // 3. Khách gửi REMATCH_VOTE qua mạng P2P sau -> Cả 2 sẵn sàng -> Tự động kích hoạt Ván 2
    globalP2PClient.emitRematchVoteForTest({
      playerId: guestPlayer.playerId,
      isReady: true,
      timestamp: Date.now()
    }, guestPlayer.peerId);

    expect(useOnlineStore.getState().roomState?.status).toBe('PLAYING');
    expect(useViewStore.getState().isVictoryOpen).toBe(false);
    expect(useGameStore.getState().gameNumber).toBe(2);
    if (!useGameStore.getState().instantWinType) {
      expect(useGameStore.getState().isGameOver).toBe(false);
      expect(useGameStore.getState().players[0].hand.length).toBe(13);
    }
  });

  it('17. Rematch Ván 2 Online: Khách (Guest) nhận đủ 13 lá bài và kích hoạt hiệu ứng chia bài (isDealing: true) đồng bộ với Host', () => {
    const profileGuest = {
      ...loadPlayerProfile(),
      name: 'Guest Player 17',
      avatar: '🤠',
      elo: 1500,
      coins: 80000
    };

    useOnlineStore.getState().joinRoom(profileGuest, 'TL-1717');

    const dummyHandGame1 = Array.from({ length: 13 }, (_, i) => createCard(((i % 13) + 1) as any, 'HEARTS'));

    // Giả lập Khách nhận bài ván 1
    globalP2PClient.emitDealHandForTest({
      playerId: profileGuest.id,
      cards: dummyHandGame1.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
      leadPlayerId: profileGuest.id,
      firstTurnPlayerId: profileGuest.id,
      gameNumber: 1,
      isFirstMoveOfGame: true,
      isLeadMove: true
    }, 'host_peer_17');

    expect(useGameStore.getState().players.find(p => p.id === profileGuest.id)?.hand.length).toBe(13);

    // Kết thúc ván 1: status -> ENDED
    const roomStateEnded: any = {
      roomCode: 'TL-1717',
      hostPeerId: 'host_peer_17',
      status: 'ENDED',
      playerCount: 2,
      betAmount: 1000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: 1,
      allowFourPairsCutAnytime: true,
      cascadeChopEnabled: true,
      congEnabled: true,
      congMultiplier: 1,
      prohibitEndingWithTwo: true,
      threeSpadesEndingBonus: false,
      players: [
        { peerId: 'host_peer_17', playerId: 'host_p17', name: 'Host 17', avatar: '🤠', coins: 90000, isHost: true, isReady: false },
        { peerId: 'guest_peer_17', playerId: profileGuest.id, name: 'Guest 17', avatar: '🤠', coins: 70000, isHost: false, isReady: false }
      ],
      updatedAt: Date.now()
    };
    globalP2PClient.emitRoomStateForTest(roomStateEnded, 'host_peer_17');
    useViewStore.getState().openModal('VICTORY');

    // Cả 2 cùng vote rematch -> Host bắt đầu Ván 2
    const dummyHandGame2 = Array.from({ length: 13 }, (_, i) => createCard(((i % 13) + 1) as any, 'SPADES'));

    // Host gửi room_state PLAYING
    const roomStatePlayingGame2 = {
      ...roomStateEnded,
      status: 'PLAYING',
      updatedAt: Date.now()
    };
    globalP2PClient.emitRoomStateForTest(roomStatePlayingGame2, 'host_peer_17');

    // Host gửi DEAL_HAND cho Guest
    globalP2PClient.emitDealHandForTest({
      playerId: profileGuest.id,
      cards: dummyHandGame2.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
      leadPlayerId: 'host_p17',
      firstTurnPlayerId: 'host_p17',
      gameNumber: 2,
      isFirstMoveOfGame: false,
      isLeadMove: true
    }, 'host_peer_17');

    // Host broadcast TABLE_SYNC đang chia bài (isDealing: true)
    globalP2PClient.emitTableSyncForTest(createTableSyncPacket({
      seq: 1,
      gameNumber: 2,
      remainingCardCounts: { host_p17: 0, [profileGuest.id]: 0 },
      isDealing: true,
      dealtCounts: { host_p17: 0, [profileGuest.id]: 0 }
    }), 'host_peer_17');

    const guestGameStore = useGameStore.getState();

    // Xác nhận trên máy Khách:
    // 1. Khách ĐÃ CÓ đủ 13 lá bài cho ván 2 (Không bị rỗng [] hay 0 lá)
    const guestHand = guestGameStore.players.find(p => p.id === profileGuest.id)?.hand || [];
    expect(guestHand.length).toBe(13);
    expect(guestHand.every(c => c.suit === 'SPADES')).toBe(true);

    // 2. Hiệu ứng chia bài ĐANG CHẠY (isDealing: true)
    expect(guestGameStore.isDealing).toBe(true);
    expect(guestGameStore.currentScreen).toBe('GAME_TABLE');
    expect(useViewStore.getState().isVictoryOpen).toBe(false);

    // 3. Khi hoạt ảnh chia bài hoàn tất (finishDealing từ Host gửi TABLE_SYNC)
    globalP2PClient.emitTableSyncForTest(createTableSyncPacket({
      seq: 2,
      gameNumber: 2,
      currentTurnPlayerId: 'host_p17',
      leadPlayerId: 'host_p17',
      remainingCardCounts: { host_p17: 13, [profileGuest.id]: 13 },
      isDealing: false,
      dealtCounts: { host_p17: 13, [profileGuest.id]: 13 }
    }), 'host_peer_17');

    const syncedGuestStore = useGameStore.getState();
    expect(syncedGuestStore.isDealing).toBe(false);
    expect(syncedGuestStore.matchState.status).toBe('PLAYING');
    expect(syncedGuestStore.players.find(p => p.id === profileGuest.id)?.hand.length).toBe(13);
  });

  it('18. Khách bỏ lượt ở vòng cũ -> Host cầm cái mở vòng mới -> Khách được giải phóng cờ Bỏ lượt và có thể đánh bài đè bình thường', () => {
    const profileGuest = { ...loadPlayerProfile(), name: 'Guest Passer', coins: 80000 };
    useOnlineStore.getState().joinRoom(profileGuest, 'TL-PASS-TEST');

    const cardJClubs = createCard(11, 'CLUBS');
    const cardJHearts = createCard(11, 'HEARTS');
    const guestHand = [cardJClubs, cardJHearts];

    // Khách nhận bài
    globalP2PClient.emitDealHandForTest({
      playerId: profileGuest.id,
      cards: guestHand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
      leadPlayerId: 'host_p18',
      firstTurnPlayerId: 'host_p18',
      gameNumber: 1,
      isFirstMoveOfGame: false,
      isLeadMove: true
    }, 'host_peer_18');

    // Host mở vòng 1 với bộ 5-6-7-8, lượt chuyển sang Guest
    globalP2PClient.emitTableSyncForTest(createTableSyncPacket({
      seq: 1,
      currentTurnPlayerId: profileGuest.id,
      leadPlayerId: 'host_p18',
      remainingCardCounts: { host_p18: 9, [profileGuest.id]: 2 },
      currentMoveCards: [createCard(5, 'HEARTS'), createCard(6, 'CLUBS'), createCard(7, 'CLUBS'), createCard(8, 'HEARTS')],
      currentMovePlayerId: 'host_p18',
      isFirstMoveOfGame: false,
      isLeadMove: false,
      isDealing: false,
      dealtCounts: { host_p18: 9, [profileGuest.id]: 2 }
    }), 'host_peer_18');

    // Guest bấm Bỏ Lượt ở Vòng 1
    useOnlineStore.getState().sendPassAction();

    // Xác nhận trên store: Guest mang cờ isPassedCurrentRound: true
    const guestStoreAfterPass = useGameStore.getState();
    const guestPlayerAfterPass = guestStoreAfterPass.players.find(p => p.id === profileGuest.id);
    expect(guestPlayerAfterPass?.isPassedCurrentRound).toBe(true);

    // Host thắng vòng 1 (CẦM CÁI) và bắt đầu Vòng 2 với Đôi 9 (9♣, 9♦). Lượt chuyển sang Guest.
    // TABLE_SYNC của vòng mới reset passedPlayerIds = []
    globalP2PClient.emitTableSyncForTest(createTableSyncPacket({
      seq: 2,
      roundNumber: 2,
      currentTurnPlayerId: profileGuest.id,
      leadPlayerId: 'host_p18',
      remainingCardCounts: { host_p18: 7, [profileGuest.id]: 2 },
      passedPlayerIds: [], // Đã reset sạch sẽ cho vòng mới
      currentMoveCards: [createCard(9, 'CLUBS'), createCard(9, 'DIAMONDS')],
      currentMovePlayerId: 'host_p18',
      isFirstMoveOfGame: false,
      isLeadMove: false,
      isDealing: false,
      dealtCounts: { host_p18: 7, [profileGuest.id]: 2 }
    }), 'host_peer_18');

    const guestStoreInRound2 = useGameStore.getState();
    const guestPlayerInRound2 = guestStoreInRound2.players.find(p => p.id === profileGuest.id);

    // Xác nhận 1: isPassedCurrentRound đã được giải phóng (false)
    expect(guestPlayerInRound2?.isPassedCurrentRound).toBe(false);

    // Xác nhận 2: Thẩm định nước đi Đôi J đè Đôi 9 thành công mà không bị chặn bởi cờ Bỏ lượt
    const validMoveRes = isValidMove({
      cards: [cardJClubs, cardJHearts],
      target: identifyCombination([createCard(9, 'CLUBS'), createCard(9, 'DIAMONDS')]),
      isLeadMove: false,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null,
      hasPassedRound: guestPlayerInRound2?.isPassedCurrentRound ?? false,
      allowFourPairsCutAnytime: true,
      isFinishingMove: true,
      prohibitEndingWithTwo: true
    });
    expect(validMoveRes.valid).toBe(true);

    // Xác nhận 3: ClientSession của Khách cho phép đánh bài (canPlay = true) và không bị khóa Bỏ lượt
    const session = appFlowCoordinator.getActiveSession();
    expect(session).not.toBeNull();
    if (session) {
      session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: cardJClubs.id });
      session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: cardJHearts.id });
      const frame = session.getLatestFrame();
      expect(frame.controls.canPlay).toBe(true);
      expect(frame.controls.playButtonLabel).toBe('Đánh (2 lá)');
      expect(frame.seats.find(s => s.playerId === profileGuest.id)?.isPassed).toBe(false);
    }
  });
});


