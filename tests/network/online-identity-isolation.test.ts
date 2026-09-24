import { describe, it, expect, beforeEach } from 'bun:test';
import { GameEngine } from '../../src/engine/game';
import { GameRulesBuilder } from '../../src/engine/types';
import { settleCompletedMatch } from '../../src/services/match-settlement-service';
import {
  dbGetPlayer,
  dbGetAllPlayers,
  dbSavePlayer,
  dbGetPlayerProfile,
  dbSavePlayerProfile,
  setLocalAnchorProfileId,
  clearLocalAnchorProfileId,
  getLocalAnchorProfileId,
  memoryStore,
  getGameDB
} from '../../src/engine/db/indexed-db';
import { hydrateStorageFromIndexedDB } from '../../src/engine/storage';
import { applyRemoteSaveData } from '../../src/engine/sync/sync-service';
import { useUserStore } from '../../src/stores/useUserStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { createCard } from '../../src/engine/card';
import { createPlayer } from '../../src/engine/player-factory';
import type { TienLenSaveData } from '../../src/engine/sync/types';

describe('Bảo Vệ Danh Tính & Tài Sản Khi Chơi Online & Đồng Bộ Dữ Liệu', () => {
  beforeEach(async () => {
    // Làm sạch memoryStore và Dexie table
    memoryStore.players.clear();
    clearLocalAnchorProfileId();
    try {
      const db = getGameDB();
      await db.players.clear();
      await db.game_settings.clear();
    } catch {}
    useUserStore.getState().resetProfile();
    useGameStore.getState().resetMatchState();
  });

  it('1. Trận Online kết thúc: Host KHÔNG lưu đối thủ online vào bảng db.players nội bộ', async () => {
    const hostId = 'usr_host_999';
    const guestId = 'usr_guest_000'; // Đứng trước hostId theo thứ tự bảng chữ cái

    // Thiết lập Profile Host có 10.000.000 Xu
    const hostProfile = {
      ...useUserStore.getState().profile,
      id: hostId,
      name: 'Đại Gia Sài Gòn',
      avatar: '🤠',
      coins: 10000000,
      elo: 1500,
      stats: {
        gamesPlayed: 50,
        wins: 30,
        chopsDone: 5,
        congsGiven: 2,
        totalEarned: 15000000,
        highestStreak: 5,
        currentStreak: 2
      }
    };
    useUserStore.getState().setProfile(hostProfile);
    await dbSavePlayerProfile(hostProfile);
    setLocalAnchorProfileId(hostId);

    // Khởi tạo Engine cho trận Online
    const rules = new GameRulesBuilder()
      .withTable(t => t.playerCount(2).betAmount(100000))
      .build();

    const hostMatchPlayer = createPlayer({
      id: hostId,
      name: hostProfile.name,
      avatar: hostProfile.avatar,
      score: hostProfile.coins,
      hand: []
    });

    const guestMatchPlayer = createPlayer({
      id: guestId,
      name: 'Khách Vãng Lai',
      avatar: '🦊',
      score: 50000,
      hand: [createCard(3, 'SPADES')]
    });

    const engine = new GameEngine([hostMatchPlayer, guestMatchPlayer], rules);
    engine.winners = [engine.players[0]];

    useGameStore.getState().setActiveGameType('ONLINE');

    // Chạy kết toán ván đấu
    const settlementResult = settleCompletedMatch(engine, hostId);

    expect(settlementResult).not.toBeNull();
    expect(settlementResult.updatedProfile.coins).toBeGreaterThan(10000000);

    // KIỂM TRA QUAN TRỌNG: Bảng db.players trên máy Host KHÔNG được chứa Guest!
    const guestInDb = await dbGetPlayer(guestId);
    expect(guestInDb).toBeNull();

    const allPlayersInDb = await dbGetAllPlayers();
    const humanPlayers = allPlayersInDb.filter(p => p.id.startsWith('usr_'));
    expect(humanPlayers.length).toBe(1);
    expect(humanPlayers[0].id).toBe(hostId);
    expect(humanPlayers[0].name).toBe('Đại Gia Sài Gòn');
  });

  it('2. F5 / Khởi động lại: Hydrate profile giữ nguyên danh tính và tài sản của Host', async () => {
    const hostId = 'usr_host_999';
    const hostProfile = {
      ...useUserStore.getState().profile,
      id: hostId,
      name: 'Chủ Bàn Đẳng Cấp',
      avatar: '🤠',
      coins: 25000000,
      elo: 1600
    };
    await dbSavePlayerProfile(hostProfile);
    setLocalAnchorProfileId(hostId);

    // Mô phỏng F5 / Reload trang
    const hydrated = await hydrateStorageFromIndexedDB();
    expect(hydrated.profile.id).toBe(hostId);
    expect(hydrated.profile.name).toBe('Chủ Bàn Đẳng Cấp');
    expect(hydrated.profile.coins).toBe(25000000);
  });

  it('3. Thuật toán Tự Phục Hồi (Auto-Recovery): Tự nhận diện và khôi phục tài khoản giàu có khi DB đã bị ô nhiễm từ trước', async () => {
    const hostId = 'usr_host_real';
    const guestId = 'usr_guest_polluter'; // Có ID nhỏ hơn theo chữ cái

    // Giả lập DB bị ô nhiễm trước bản vá:
    // Bản ghi 1: Khách nghèo (50k Xu, 0 trận)
    await dbSavePlayer({
      id: guestId,
      name: 'Kẻ Tráo Đổi',
      avatar: '👤',
      coins: 50000,
      elo: 1000,
      stats: { gamesPlayed: 0, wins: 0, chopsDone: 0, congsGiven: 0, totalEarned: 0, highestStreak: 0, currentStreak: 0 },
      updatedAt: Date.now()
    });

    // Bản ghi 2: Chủ nhân thật (50 triệu Xu, 120 trận)
    await dbSavePlayer({
      id: hostId,
      name: 'Chính Chủ Tỉ Phú',
      avatar: '🤠',
      coins: 50000000,
      elo: 1800,
      stats: { gamesPlayed: 120, wins: 85, chopsDone: 20, congsGiven: 10, totalEarned: 80000000, highestStreak: 12, currentStreak: 3 },
      updatedAt: Date.now()
    });

    // Giả lập người chơi không có anchor (hoặc anchor bị mất/trỏ sai)
    clearLocalAnchorProfileId();

    // Gọi nạp profile không truyền ID (tương tự như khi F5)
    const recoveredProfile = await dbGetPlayerProfile();

    expect(recoveredProfile).not.toBeNull();
    // Khẳng định 100%: Phải phục hồi chính xác tài khoản Tỉ Phú, không nhận Kẻ Tráo Đổi
    expect(recoveredProfile?.id).toBe(hostId);
    expect(recoveredProfile?.name).toBe('Chính Chủ Tỉ Phú');
    expect(recoveredProfile?.coins).toBe(50000000);
    expect(recoveredProfile?.elo).toBe(1800);

    // Khẳng định: Mỏ neo định danh đã được tự động thiết lập lại cho hostId
    expect(getLocalAnchorProfileId()).toBe(hostId);

    // Khẳng định: Kẻ tráo đổi rác đã bị tự động thanh trừng (Purge) vĩnh viễn khỏi DB
    const polluterInDb = await dbGetPlayer(guestId);
    expect(polluterInDb).toBeNull();
  });

  it('4. Đồng bộ Đám mây (Cloud Sync): Áp dụng cloud save neo ID mới và xóa sạch ID cũ bị phân mảnh', async () => {
    const oldLocalId = 'usr_local_old';
    const cloudProfileId = 'usr_cloud_synced';

    // Tạo bản ghi local cũ
    await dbSavePlayer({
      id: oldLocalId,
      name: 'Nick Cũ',
      avatar: '🤠',
      coins: 10000,
      elo: 1000,
      stats: { gamesPlayed: 2, wins: 1, chopsDone: 0, congsGiven: 0, totalEarned: 10000, highestStreak: 1, currentStreak: 1 },
      updatedAt: Date.now()
    });
    setLocalAnchorProfileId(oldLocalId);

    // Dữ liệu Cloud tải về
    const mockCloudSave: TienLenSaveData = {
      version: 1,
      updatedAt: Date.now(),
      settings: {},
      profile: {
        ...useUserStore.getState().profile,
        id: cloudProfileId,
        name: 'Nick Đám Mây',
        avatar: '🤠',
        coins: 88888888,
        elo: 2000
      }
    };

    // Áp dụng dữ liệu Cloud
    await applyRemoteSaveData(mockCloudSave);

    // Khẳng định: Anchor đã chuyển sang cloudProfileId
    expect(getLocalAnchorProfileId()).toBe(cloudProfileId);

    // Khẳng định: Profile trong Store là Cloud
    expect(useUserStore.getState().profile.id).toBe(cloudProfileId);
    expect(useUserStore.getState().profile.coins).toBe(88888888);

    // Khẳng định: Bản ghi local cũ đã được dọn sạch, không gây xung đột kép
    const oldPlayerInDb = await dbGetPlayer(oldLocalId);
    expect(oldPlayerInDb).toBeNull();

    // Khẳng định: Reload lại vẫn ra đúng profile đám mây
    const profileAfterReload = await dbGetPlayerProfile();
    expect(profileAfterReload?.id).toBe(cloudProfileId);
    expect(profileAfterReload?.name).toBe('Nick Đám Mây');
    expect(profileAfterReload?.coins).toBe(88888888);
  });

  it('5. Thoát phòng Online (leaveRoom): Khôi phục mảng players về profile người chơi cục bộ', () => {
    const localProfile = useUserStore.getState().profile;
    useGameStore.getState().setMyPlayerId(localProfile.id);

    // Giả lập trong phòng online có [Host, Guest]
    useGameStore.getState().setPlayers([
      createPlayer({
        id: 'usr_remote_host',
        name: 'Chủ Bàn Xa Lạ',
        avatar: '🤠',
        score: 99999999,
        hand: []
      }),
      createPlayer({
        id: localProfile.id,
        name: localProfile.name || 'Người Chơi',
        avatar: localProfile.avatar || '🤠',
        score: localProfile.coins,
        hand: []
      })
    ]);

    expect(useGameStore.getState().players.length).toBe(2);
    expect(useGameStore.getState().players[0].id).toBe('usr_remote_host');

    // Thoát phòng
    useOnlineStore.getState().leaveRoom();

    // Khẳng định: Danh sách players đã được làm sạch, chỉ còn người chơi cục bộ
    const playersAfterLeave = useGameStore.getState().players;
    expect(playersAfterLeave.length).toBe(1);
    expect(playersAfterLeave[0].id).toBe(localProfile.id);
  });

  it('6. Online Settlement Invariant: Điểm số của đối thủ (Guest) không bị cộng dồn 2 lần (No double payout addition)', async () => {
    const hostId = 'usr_host_test_1';
    const guestId = 'usr_guest_test_2';
    const betAmount = 1000;

    const rules = new GameRulesBuilder()
      .withSettlement('COUNT_CARDS')
      .withTable(t => t.betAmount(betAmount))
      .build();

    const hostMatchPlayer = createPlayer({
      id: hostId,
      name: 'Host',
      avatar: '🤠',
      score: 7000000,
      hand: [createCard(4, 'HEARTS')] // Thua, còn 1 lá
    });

    const guestMatchPlayer = createPlayer({
      id: guestId,
      name: 'Guest Winner',
      avatar: '🦊',
      score: 50000,
      hand: [] // Thắng (hết bài)
    });

    const engine = new GameEngine([hostMatchPlayer, guestMatchPlayer], rules);
    engine.winners = [guestMatchPlayer];
    engine.isGameOver = true;

    // Giả lập GameEngine kết thúc ván đấu và áp dụng payout ban đầu
    engine.settleEndGame();
    // Sau settleEndGame: Guest thắng 1 lá = +1,000 -> 51,000
    expect(engine.players.find(p => p.id === guestId)?.score).toBe(51000);

    useGameStore.getState().setActiveGameType('ONLINE');

    // Host gọi settleCompletedMatch
    const settlementResult = settleCompletedMatch(engine, hostId);

    expect(settlementResult.payouts[guestId]).toBe(1000);
    expect(settlementResult.payouts[hostId]).toBe(-1000);

    // Điểm của Guest chỉ được +1,000 từ điểm gốc (50,000 -> 51,000), TUYỆT ĐỐI không thành 52,000
    const finalGuest = engine.players.find(p => p.id === guestId);
    expect(finalGuest?.score).toBe(51000);
  });
});

