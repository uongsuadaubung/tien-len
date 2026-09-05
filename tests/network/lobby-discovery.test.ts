import { describe, expect, it, beforeEach } from 'bun:test';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useViewStore } from '../../src/stores/useViewStore';
import { loadPlayerProfile } from '../../src/engine/storage';
import { PublicRoomSummarySchema, type PublicRoomSummary } from '../../src/engine/network/network.schema';
import { generateRoomPin } from '../../src/stores/online/roomSlice';

describe('WebRTC P2P Public Lobby Discovery & Room Browser Tests', () => {
  beforeEach(() => {
    useOnlineStore.getState().leaveRoom();
    useOnlineStore.getState().stopBrowsingLobby();
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

  it('1. PublicRoomSummarySchema: Validate cấu trúc thông tin tóm tắt phòng công khai', () => {
    const validSummary: PublicRoomSummary = {
      roomCode: 'TL-8888',
      hostName: 'Cao Thủ Sài Gòn',
      hostAvatar: '🤠',
      hostElo: 1850,
      playerCount: 2,
      maxPlayers: 4,
      betAmount: 2000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: 2,
      congMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      status: 'WAITING',
      isPublic: true,
      updatedAt: Date.now()
    };

    const parsed = PublicRoomSummarySchema.safeParse(validSummary);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.roomCode).toBe('TL-8888');
      expect(parsed.data.betAmount).toBe(2000);
      expect(parsed.data.maxPlayers).toBe(4);
    }
  });

  it('2. Host tạo phòng Công Khai (isPublic: true): Kích hoạt phát thanh thông tin phòng', () => {
    const profile = loadPlayerProfile();
    profile.name = 'Host Công Khai';
    profile.coins = 100000;

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount: 2000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: 2,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      isPublic: true
    });

    const state = useOnlineStore.getState();
    expect(state.isOnlineMatch).toBe(true);
    expect(state.isHost).toBe(true);
    expect(state.roomState?.isPublic).toBe(true);
    expect(state.roomState?.status).toBe('WAITING');
  });

  it('3. Host tạo phòng Riêng Tư (isPublic: false): Không phát thanh phòng lên sảnh', () => {
    const profile = loadPlayerProfile();
    profile.name = 'Host Kín Đáo';

    useOnlineStore.getState().createRoom(profile, {
      playerCount: 2,
      betAmount: 5000,
      settlementRule: 'TRADITIONAL',
      choppingMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      isPublic: false
    });

    const state = useOnlineStore.getState();
    expect(state.roomState?.isPublic).toBe(false);
    expect(state.roomState?.status).toBe('WAITING');
  });

  it('4. Lắng nghe Sảnh Phòng (startBrowsingLobby & stopBrowsingLobby): Cập nhật trạng thái duyệt sảnh', () => {
    const store = useOnlineStore.getState();
    expect(store.isBrowsingLobby).toBe(false);

    store.startBrowsingLobby();
    expect(useOnlineStore.getState().isBrowsingLobby).toBe(true);

    store.stopBrowsingLobby();
    expect(useOnlineStore.getState().isBrowsingLobby).toBe(false);
  });

  it('5. Khách vào bàn từ Sảnh (joinPublicRoom): Dừng duyệt sảnh và kết nối vào phòng chỉ định', () => {
    const profile = loadPlayerProfile();
    profile.name = 'Khách Sảnh';
    profile.coins = 50000;

    const targetRoom: PublicRoomSummary = {
      roomCode: 'TL-9999',
      hostName: 'Chủ Bàn Đẹp Trai',
      hostAvatar: '😎',
      hostElo: 1500,
      playerCount: 1,
      maxPlayers: 4,
      betAmount: 1000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: 1,
      congMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      status: 'WAITING',
      isPublic: true,
      updatedAt: Date.now()
    };

    useOnlineStore.getState().startBrowsingLobby();
    expect(useOnlineStore.getState().isBrowsingLobby).toBe(true);

    useOnlineStore.getState().joinPublicRoom(profile, targetRoom);

    const state = useOnlineStore.getState();
    expect(state.isBrowsingLobby).toBe(false);
    expect(state.isOnlineMatch).toBe(true);
    expect(state.isHost).toBe(false);
    expect(state.roomCode).toBe('TL-9999');
  });

  it('6. Khi trận đấu bắt đầu (startMatch) hoặc rời phòng: Tự động dừng phát thanh sảnh', () => {
    const profile = loadPlayerProfile();
    useOnlineStore.getState().createRoom(profile, {
      playerCount: 4,
      betAmount: 1000,
      settlementRule: 'COUNT_CARDS',
      choppingMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true,
      isPublic: true
    });

    // Bắt đầu trận đấu
    useOnlineStore.getState().startMatch();
    expect(useOnlineStore.getState().roomState?.status).toBe('PLAYING');

    // Rời phòng
    useOnlineStore.getState().leaveRoom();
    expect(useOnlineStore.getState().isOnlineMatch).toBe(false);
    expect(useOnlineStore.getState().roomState).toBeNull();
  });

  it('7. generateRoomPin: Sinh mã 4 số chuẩn TL-XXXX và tự động né các phòng đang tồn tại', () => {
    const existing: PublicRoomSummary[] = [
      {
        roomCode: 'TL-1234',
        hostName: 'Host 1',
        hostAvatar: '🤠',
        hostElo: 1000,
        playerCount: 1,
        maxPlayers: 4,
        betAmount: 1000,
        settlementRule: 'COUNT_CARDS',
        choppingMultiplier: 1,
        congMultiplier: 1,
        congEnabled: true,
        prohibitEndingWithTwo: true,
        allowFourPairsCutAnytime: true,
        threeSpadesEndingBonus: true,
        cascadeChopEnabled: true,
        status: 'WAITING',
        isPublic: true,
        updatedAt: Date.now()
      }
    ];

    for (let i = 0; i < 20; i++) {
      const pin = generateRoomPin(existing);
      expect(pin).toMatch(/^TL-\d{4}$/);
      expect(pin).not.toBe('TL-1234');
    }
  });
});
