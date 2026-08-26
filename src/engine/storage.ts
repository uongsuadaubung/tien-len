import { 
  Quest, 
  Achievement, 
  INITIAL_ACHIEVEMENTS, 
  getTodayDateString, 
  generateDailyQuestsForDate, 
  DAILY_QUEST_COUNT 
} from './quests';
import { ECONOMY_CONSTANTS } from './constants/economy';

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
  lastDailyResetDate: string;
  dailyQuests: Quest[];
  achievements: Achievement[];
  dailyMilestonesClaimed: Record<number, boolean>;
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
  coins: ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS,
  elo: ECONOMY_CONSTANTS.DEFAULT_STARTING_ELO,
  campaignUnlockedChapter: 1,
  campaignChapterWins: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  loans: 0,
  dailyReliefClaimedCount: 0,
  lastDailyResetTimestamp: Date.now(),
  lastDailyResetDate: getTodayDateString(),
  dailyQuests: generateDailyQuestsForDate(getTodayDateString()),
  achievements: INITIAL_ACHIEVEMENTS,
  dailyMilestonesClaimed: { 1: false, 3: false, 5: false },
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
    const todayStr = getTodayDateString();

    if (!raw) {
      const initialProfile: PlayerProfile = {
        ...DEFAULT_PROFILE,
        lastDailyResetDate: todayStr,
        dailyQuests: generateDailyQuestsForDate(todayStr),
        dailyMilestonesClaimed: { 1: false, 3: false, 5: false }
      };
      savePlayerProfile(initialProfile);
      return initialProfile;
    }

    const parsed = JSON.parse(raw);
    const now = Date.now();
    const isNewDay = !parsed.lastDailyResetDate || parsed.lastDailyResetDate !== todayStr;

    let dailyQuests: Quest[];

    if (isNewDay) {
      // Sang ngày mới -> Reset lượt cứu trợ, mốc thưởng ngày và băm 5 nhiệm vụ mới
      parsed.dailyReliefClaimedCount = 0;
      parsed.lastDailyResetTimestamp = now;
      parsed.lastDailyResetDate = todayStr;
      parsed.dailyMilestonesClaimed = { 1: false, 3: false, 5: false };
      dailyQuests = generateDailyQuestsForDate(todayStr);
    } else {
      // Cùng ngày -> Bảo toàn tiến trình nhiệm vụ của ngày hôm nay
      const expectedQuests = generateDailyQuestsForDate(todayStr);
      const existingQuestsMap = new Map<string, Quest>(
        (parsed.dailyQuests || []).map((q: Quest) => [q.id, q])
      );

      // Đồng bộ đúng 5 nhiệm vụ của ngày hôm nay với tiến độ đã lưu
      dailyQuests = expectedQuests.map(exp => {
        const saved = existingQuestsMap.get(exp.id);
        if (saved) {
          return {
            ...exp,
            currentCount: saved.currentCount || 0,
            isCompleted: saved.isCompleted || false,
            isClaimed: saved.isClaimed || false
          };
        }
        return exp;
      });
    }

    // Đồng bộ danh sách thành tựu (Thêm thành tựu mới nếu chưa có trong profile)
    const existingAchievementsMap = new Map<string, Achievement>(
      (parsed.achievements || []).map((a: Achievement) => [a.id, a])
    );
    const achievements: Achievement[] = INITIAL_ACHIEVEMENTS.map(initialAch => {
      const saved = existingAchievementsMap.get(initialAch.id);
      if (saved) {
        // Tự động sửa lỗi ach_debt_free nếu từng bị đánh dấu hoàn thành sai trước đó
        if (initialAch.id === 'ach_debt_free' && !saved.isClaimed) {
          return {
            ...initialAch,
            currentCount: 0,
            isCompleted: false,
            isClaimed: false
          };
        }

        return {
          ...initialAch,
          currentCount: saved.currentCount || 0,
          isCompleted: saved.isCompleted || false,
          isClaimed: saved.isClaimed || false
        };
      }
      return initialAch;
    });

    const finalProfile: PlayerProfile = {
      ...DEFAULT_PROFILE,
      ...parsed,
      lastDailyResetDate: todayStr,
      dailyQuests,
      achievements,
      dailyMilestonesClaimed: parsed.dailyMilestonesClaimed || { 1: false, 3: false, 5: false },
      stats: {
        ...DEFAULT_PROFILE.stats,
        ...(parsed.stats || {})
      },
      campaignChapterWins: {
        ...DEFAULT_PROFILE.campaignChapterWins,
        ...(parsed.campaignChapterWins || {})
      }
    };

    savePlayerProfile(finalProfile);
    return finalProfile;
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
  gameId: string | null;
  gameType: string | null;
  mode: string | null;
  gameNumber: number;
  betAmount: number;
  depositAmount: number;
  penaltyMultiplier: number | null;
  activeGameType: string | null;
  playerCount: number | null;
  isRanked: boolean;
  startedAt: number | null;
  timestamp: number | null;
}

const ACTIVE_MATCH_SESSION_KEY = 'TIEN_LEN_ACTIVE_MATCH_SESSION_V1';

export function saveActiveMatchSession(session: ActiveMatchSession): void {
  try {
    setStorageItem(ACTIVE_MATCH_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Lỗi khi lưu ActiveMatchSession:', e);
  }
}

export function getActiveMatchSession(): ActiveMatchSession | null {
  try {
    const raw = getStorageItem(ACTIVE_MATCH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveMatchSession;
  } catch (e) {
    console.error('Lỗi khi đọc ActiveMatchSession:', e);
    return null;
  }
}

export function clearActiveMatchSession(): void {
  try {
    removeStorageItem(ACTIVE_MATCH_SESSION_KEY);
  } catch (e) {
    console.error('Lỗi khi xóa ActiveMatchSession:', e);
  }
}

// ============================================================================
// BỘ HỒ SƠ HÀNH VI ĐỐI THỦ THẬT (HUMAN BEHAVIOR PROFILE STORE)
// ============================================================================

const HUMAN_BEHAVIOR_PROFILE_KEY = 'TIEN_LEN_HUMAN_BEHAVIOR_PROFILE_V1';

export function saveHumanBehaviorProfile(data: any): void {
  try {
    setStorageItem(HUMAN_BEHAVIOR_PROFILE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Lỗi khi lưu HumanBehaviorProfile:', e);
  }
}

export function loadHumanBehaviorProfile(): any | null {
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

export function getHumanBehaviorProfile(): any | null {
  return loadHumanBehaviorProfile();
}
