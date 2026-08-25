import { Quest, Achievement, INITIAL_DAILY_QUESTS, INITIAL_ACHIEVEMENTS } from './quests';

export interface PlayerProfile {
  name: string;
  avatar: string;
  coins: number;
  elo: number;
  campaignUnlockedChapter: number;
  campaignChapterWins: Record<number, number>;
  loans: number; // Tiền nợ chủ sòng
  dailyReliefClaimedCount: number;
  lastDailyResetTimestamp: number;
  dailyQuests: Quest[];
  achievements: Achievement[];
  stats: {
    gamesPlayed: number;
    wins: number;
    chopsDone: number;
    congsGiven: number;
    totalEarned: number;
    highestStreak: number;
    currentStreak: number;
  };
}

const STORAGE_KEY = 'TIEN_LEN_PLAYER_PROFILE_V2';

const DEFAULT_PROFILE: PlayerProfile = {
  name: '',
  avatar: '🤠',
  coins: 1000000,
  elo: 1000,
  campaignUnlockedChapter: 1,
  campaignChapterWins: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  loans: 0,
  dailyReliefClaimedCount: 0,
  lastDailyResetTimestamp: Date.now(),
  dailyQuests: INITIAL_DAILY_QUESTS,
  achievements: INITIAL_ACHIEVEMENTS,
  stats: {
    gamesPlayed: 0,
    wins: 0,
    chopsDone: 0,
    congsGiven: 0,
    totalEarned: 0,
    highestStreak: 0,
    currentStreak: 0
  }
};

// ============================================================================
// SAFE STORAGE HELPER (Hỗ trợ cả môi trường Browser và Node/Bun Testing)
// ============================================================================

const memoryFallbackStore: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (e) {}
  return memoryFallbackStore[key] || null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch (e) {}
  memoryFallbackStore[key] = value;
}

function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch (e) {}
  delete memoryFallbackStore[key];
}

/**
 * Tải thông tin người chơi từ LocalStorage (hoặc khởi tạo mặc định)
 */
export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };

    const parsed = JSON.parse(raw);
    const now = Date.now();
    const isNewDay = now - (parsed.lastDailyResetTimestamp || 0) > 24 * 60 * 60 * 1000;

    if (isNewDay) {
      parsed.dailyReliefClaimedCount = 0;
      parsed.lastDailyResetTimestamp = now;
      parsed.dailyQuests = INITIAL_DAILY_QUESTS.map(q => ({ ...q }));
    }

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      stats: {
        ...DEFAULT_PROFILE.stats,
        ...(parsed.stats || {})
      },
      campaignChapterWins: {
        ...DEFAULT_PROFILE.campaignChapterWins,
        ...(parsed.campaignChapterWins || {})
      },
      dailyQuests: parsed.dailyQuests || INITIAL_DAILY_QUESTS,
      achievements: parsed.achievements || INITIAL_ACHIEVEMENTS
    };
  } catch (e) {
    console.error('Lỗi khi tải PlayerProfile:', e);
    return { ...DEFAULT_PROFILE };
  }
}

/**
 * Lưu thông tin người chơi vào LocalStorage
 */
export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    setStorageItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Lỗi khi lưu PlayerProfile:', e);
  }
}

/**
 * Khôi phục về dữ liệu mặc định (Reset Profile)
 */
export function resetPlayerProfile(): PlayerProfile {
  try {
    removeStorageItem(STORAGE_KEY);
    removeStorageItem(HUMAN_BEHAVIOR_PROFILE_KEY);
  } catch (e) {
    console.error('Lỗi khi xóa profile:', e);
  }
  return { ...DEFAULT_PROFILE };
}

// ============================================================================
// PHIÊN TRẬN ĐẤU ĐANG DIỄN RA & TIỀN CỌC (ACTIVE MATCH SESSION & BUY-IN DEPOSIT)
// ============================================================================

export interface ActiveMatchSession {
  gameId: string;
  gameType: 'QUICK' | 'RANKED' | 'CAMPAIGN' | 'UNDERGROUND';
  mode: string;
  depositAmount: number;
  betAmount: number;
  penaltyMultiplier: number;
  isRanked: boolean;
  startedAt: number;
}

const ACTIVE_MATCH_KEY = 'TIEN_LEN_ACTIVE_MATCH_SESSION';

export function saveActiveMatchSession(session: ActiveMatchSession): void {
  try {
    setStorageItem(ACTIVE_MATCH_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Lỗi khi lưu ActiveMatchSession:', e);
  }
}

export function getActiveMatchSession(): ActiveMatchSession | null {
  try {
    const raw = getStorageItem(ACTIVE_MATCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi khi đọc ActiveMatchSession:', e);
    return null;
  }
}

export function clearActiveMatchSession(): void {
  try {
    removeStorageItem(ACTIVE_MATCH_KEY);
  } catch (e) {
    console.error('Lỗi khi xóa ActiveMatchSession:', e);
  }
}

// ============================================================================
// HỒ SƠ TÂM LÝ & THÓI QUEN NGƯỜI CHƠI (LONG-TERM PLAYER BEHAVIOR PROFILE)
// ============================================================================

const HUMAN_BEHAVIOR_PROFILE_KEY = 'TIEN_LEN_HUMAN_PLAYER_BEHAVIOR_PROFILE_V1';

export function saveHumanBehaviorProfile(profile: unknown): void {
  try {
    setStorageItem(HUMAN_BEHAVIOR_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Lỗi khi lưu HumanBehaviorProfile:', e);
  }
}

export function loadHumanBehaviorProfile(): unknown {
  try {
    const raw = getStorageItem(HUMAN_BEHAVIOR_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi khi đọc HumanBehaviorProfile:', e);
    return null;
  }
}

export function clearHumanBehaviorProfile(): void {
  try {
    removeStorageItem(HUMAN_BEHAVIOR_PROFILE_KEY);
  } catch (e) {
    console.error('Lỗi khi xóa HumanBehaviorProfile:', e);
  }
}


