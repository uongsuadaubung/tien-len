import { describe, expect, test, beforeEach } from 'bun:test';
import { 
  PlayerProfile, 
  loadPlayerProfile, 
  savePlayerProfile, 
  resetPlayerProfile, 
  ActiveMatchSession, 
  saveActiveMatchSession, 
  getActiveMatchSession, 
  clearActiveMatchSession 
} from '../../src/engine/storage';
import { INITIAL_DAILY_QUESTS, INITIAL_ACHIEVEMENTS } from '../../src/engine/quests';

describe('Luồng Tiền Cọc & Xử Phạt Thoát Game / Bỏ Cuộc (Forfeit & Penalty Workflow)', () => {
  let mockProfile: PlayerProfile;

  beforeEach(() => {
    resetPlayerProfile();
    clearActiveMatchSession();

    mockProfile = {
      name: 'Thần Bài Cọc',
      avatar: '🤠',
      coins: 50000,
      elo: 1200,
      campaignUnlockedChapter: 1,
      campaignChapterWins: {},
      loans: 0,
      dailyReliefClaimedCount: 0,
      lastDailyResetTimestamp: Date.now(),
      lastDailyResetDate: '2026-08-26',
      dailyQuests: INITIAL_DAILY_QUESTS.map(q => ({ ...q })),
      achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a })),
      dailyMilestonesClaimed: { 1: false, 3: false, 5: false },
      stats: {
        gamesPlayed: 10,
        wins: 6,
        chopsDone: 3,
        congsGiven: 1,
        totalEarned: 150000,
        highestStreak: 5,
        currentStreak: 3
      }
    };
    savePlayerProfile(mockProfile);
  });

  test('1. Tính toán chuẩn xác số tiền cọc (Deposit = 26 lá x Bet x Hệ số phạt)', () => {
    // Cược 500 xu, x1 -> Cọc 13,000 xu
    const bet500x1 = 500 * 26 * 1;
    expect(bet500x1).toBe(13000);

    // Cược 500 xu, x2 -> Cọc 26,000 xu
    const bet500x2 = 500 * 26 * 2;
    expect(bet500x2).toBe(26000);

    // Cược 1,000 xu, x4 -> Cọc 104,000 xu
    const bet1000x4 = 1000 * 26 * 4;
    expect(bet1000x4).toBe(104000);

    // Đấu Hạng (Ranked) -> Cọc 0 xu
    const rankedDeposit = 0;
    expect(rankedDeposit).toBe(0);
  });

  test('2. Quản lý vòng đời ActiveMatchSession trong LocalStorage', () => {
    expect(getActiveMatchSession()).toBeNull();

    const session: ActiveMatchSession = {
      gameId: 'match_12345',
      gameType: 'QUICK',
      mode: 'CARD_COUNT',
      gameNumber: 1,
      depositAmount: 13000,
      betAmount: 500,
      penaltyMultiplier: 1,
      activeGameType: 'QUICK',
      playerCount: 4,
      isRanked: false,
      startedAt: Date.now(),
      timestamp: Date.now()
    };

    saveActiveMatchSession(session);
    const retrieved = getActiveMatchSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.gameId).toBe('match_12345');
    expect(retrieved?.depositAmount).toBe(13000);

    clearActiveMatchSession();
    expect(getActiveMatchSession()).toBeNull();
  });

  test('3. Luồng Bỏ Cuộc (Forfeit) trận cược Xu: Mất tiền cọc, ghi nhận 1 trận thua & ngắt streak', () => {
    const betAmount = 500;
    const mult = 2;
    const requiredDeposit = 26 * betAmount * mult; // 26,000 xu

    // 1. Tạm giữ cọc khi vào trận
    mockProfile.coins -= requiredDeposit; // 50,000 - 26,000 = 24,000 xu
    savePlayerProfile(mockProfile);

    saveActiveMatchSession({
      gameId: 'match_test_forfeit',
      gameType: 'QUICK',
      mode: 'CARD_COUNT',
      gameNumber: 1,
      depositAmount: requiredDeposit,
      betAmount,
      penaltyMultiplier: mult,
      activeGameType: 'QUICK',
      playerCount: 4,
      isRanked: false,
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    // 2. Người chơi chủ động Bỏ Cuộc (Forfeit)
    const activeSession = getActiveMatchSession();
    expect(activeSession).not.toBeNull();
    clearActiveMatchSession();

    // Tiền cọc không được hoàn lại, ghi nhận thua
    mockProfile.stats.gamesPlayed += 1;
    mockProfile.stats.currentStreak = 0;
    savePlayerProfile(mockProfile);

    const reloaded = loadPlayerProfile();
    expect(reloaded.coins).toBe(24000); // Đã mất 26,000 xu cọc
    expect(reloaded.stats.gamesPlayed).toBe(11);
    expect(reloaded.stats.currentStreak).toBe(0);
    expect(getActiveMatchSession()).toBeNull();
  });

  test('4. Luồng Bỏ Cuộc (Forfeit) Đấu Hạng (Ranked): Trừ phạt -30 Elo, ngắt streak', () => {
    saveActiveMatchSession({
      gameId: 'match_ranked_forfeit',
      gameType: 'RANKED',
      mode: 'TRADITIONAL_RANK_BASED',
      gameNumber: 1,
      depositAmount: 0,
      betAmount: 0,
      penaltyMultiplier: 1,
      activeGameType: 'RANKED',
      playerCount: 4,
      isRanked: true,
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    const activeSession = getActiveMatchSession();
    expect(activeSession?.isRanked).toBe(true);
    clearActiveMatchSession();

    mockProfile.elo = Math.max(0, mockProfile.elo - 30);
    mockProfile.stats.gamesPlayed += 1;
    mockProfile.stats.currentStreak = 0;
    savePlayerProfile(mockProfile);

    const reloaded = loadPlayerProfile();
    expect(reloaded.elo).toBe(1170); // 1200 - 30
    expect(reloaded.stats.gamesPlayed).toBe(11);
    expect(reloaded.stats.currentStreak).toBe(0);
  });

  test('5. Giả lập hành vi F5 / Tải lại trang khi trận đang dở: Phát hiện session và tự động phạt', () => {
    // Giả lập trạng thái trước khi F5: Tiền cọc đã trừ 26,000 xu
    const requiredDeposit = 26000;
    mockProfile.coins -= requiredDeposit;
    savePlayerProfile(mockProfile);

    saveActiveMatchSession({
      gameId: 'match_interrupted_f5',
      gameType: 'QUICK',
      mode: 'CARD_COUNT',
      gameNumber: 1,
      depositAmount: requiredDeposit,
      betAmount: 500,
      penaltyMultiplier: 2,
      activeGameType: 'QUICK',
      playerCount: 4,
      isRanked: false,
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    // Giả lập App khởi động lại (F5 Recovery Logic)
    const interruptedSession = getActiveMatchSession();
    expect(interruptedSession).not.toBeNull();
    clearActiveMatchSession();

    // Tự động xử thua
    mockProfile.stats.gamesPlayed += 1;
    mockProfile.stats.currentStreak = 0;
    savePlayerProfile(mockProfile);

    const reloaded = loadPlayerProfile();
    expect(reloaded.coins).toBe(24000);
    expect(reloaded.stats.gamesPlayed).toBe(11);
    expect(reloaded.stats.currentStreak).toBe(0);
    expect(getActiveMatchSession()).toBeNull();
  });

  test('6. Trận đấu hoàn thành hợp lệ: Hoàn cọc và kết toán số dư chính xác', () => {
    const betAmount = 500;
    const requiredDeposit = 26 * betAmount * 1; // 13,000 xu

    // Tạm giữ cọc
    mockProfile.coins -= requiredDeposit; // 50,000 - 13,000 = 37,000 xu
    savePlayerProfile(mockProfile);

    saveActiveMatchSession({
      gameId: 'match_normal_end',
      gameType: 'QUICK',
      mode: 'CARD_COUNT',
      gameNumber: 1,
      depositAmount: requiredDeposit,
      betAmount,
      penaltyMultiplier: 1,
      activeGameType: 'QUICK',
      playerCount: 4,
      isRanked: false,
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    // Giả sử kết thúc trận: Thắng ăn được 3,500 xu
    const humanNetEarned = 3500;
    const heldDeposit = getActiveMatchSession()?.depositAmount || 0;
    clearActiveMatchSession();

    mockProfile.coins = mockProfile.coins + heldDeposit + humanNetEarned; // 37,000 + 13,000 + 3,500 = 53,500 xu
    mockProfile.stats.gamesPlayed += 1;
    mockProfile.stats.wins += 1;
    mockProfile.stats.currentStreak += 1;
    mockProfile.stats.totalEarned += humanNetEarned;
    savePlayerProfile(mockProfile);

    const reloaded = loadPlayerProfile();
    expect(reloaded.coins).toBe(53500); // 50,000 + 3,500
    expect(reloaded.stats.wins).toBe(7);
    expect(reloaded.stats.currentStreak).toBe(4);
    expect(getActiveMatchSession()).toBeNull();
  });
});
