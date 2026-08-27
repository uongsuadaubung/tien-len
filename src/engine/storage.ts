import { 
  Quest, 
  Achievement, 
  INITIAL_ACHIEVEMENTS, 
  getTodayDateString, 
  generateDailyQuestsForDate 
} from './quests';
import { CAMPAIGN_CHAPTERS } from './campaign';
import { ECONOMY_CONSTANTS } from './constants/economy';
import {
  dbGetPlayerProfile,
  dbSavePlayerProfile,
  dbDeletePlayerProfile,
  dbGetActiveSession,
  dbSaveActiveSession,
  dbClearActiveSession,
  dbGetHumanBehavior,
  dbSaveHumanBehavior,
  dbClearHumanBehavior
} from './db/indexed-db';

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
const ACTIVE_MATCH_SESSION_KEY = 'TIEN_LEN_ACTIVE_MATCH_SESSION_V1';
const HUMAN_BEHAVIOR_PROFILE_KEY = 'TIEN_LEN_HUMAN_BEHAVIOR_PROFILE_V1';

export const DEFAULT_PROFILE: PlayerProfile = {
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
// IN-MEMORY SYNCHRONOUS CACHE LAYER
// Đảm bảo React và Zustand phản hồi tức thì 0ms, đồng bộ xuống IndexedDB
// ============================================================================

let cachedProfile: PlayerProfile | null = null;
let cachedActiveSession: ActiveMatchSession | null = null;
let cachedHumanBehavior: unknown | null = null;

/**
 * Chuẩn hóa và làm sạch dữ liệu Profile (kiểm tra ngày mới, nhiệm vụ, thành tựu)
 */
export function sanitizeAndValidateProfile(parsed: Partial<PlayerProfile>): PlayerProfile {
  const todayStr = getTodayDateString();
  const now = Date.now();
  const isNewDay = !parsed.lastDailyResetDate || parsed.lastDailyResetDate !== todayStr;

  let dailyQuests: Quest[];

  if (isNewDay) {
    parsed.dailyReliefClaimedCount = 0;
    parsed.lastDailyResetTimestamp = now;
    parsed.lastDailyResetDate = todayStr;
    parsed.dailyMilestonesClaimed = { 1: false, 3: false, 5: false };
    dailyQuests = generateDailyQuestsForDate(todayStr);
  } else {
    const expectedQuests = generateDailyQuestsForDate(todayStr);
    const existingQuestsMap = new Map<string, Quest>(
      (parsed.dailyQuests || []).map((q: Quest) => [q.id, q])
    );

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

  const existingAchievementsMap = new Map<string, Achievement>(
    (parsed.achievements || []).map((a: Achievement) => [a.id, a])
  );
  const achievements: Achievement[] = INITIAL_ACHIEVEMENTS.map(initialAch => {
    const saved = existingAchievementsMap.get(initialAch.id);
    if (saved) {
      if (initialAch.id === 'ach_debt_free' && !saved.isClaimed) {
        return {
          ...initialAch,
          currentCount: 0,
          isCompleted: false,
          isClaimed: false
        };
      }

      if (initialAch.id === 'ach_campaign_all_clear') {
        const winsMap = parsed.campaignChapterWins || {};
        let actualCompletedChapters = 0;
        for (const ch of CAMPAIGN_CHAPTERS) {
          if ((winsMap[ch.id] || 0) >= ch.requiredWins || (parsed.campaignUnlockedChapter || 1) > ch.id) {
            actualCompletedChapters++;
          }
        }
        const isReallyCompleted = actualCompletedChapters >= 5;
        return {
          ...initialAch,
          currentCount: Math.min(5, actualCompletedChapters),
          isCompleted: isReallyCompleted,
          isClaimed: isReallyCompleted ? (saved.isClaimed || false) : false
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

  return {
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
}

/**
 * Nạp toàn bộ dữ liệu từ IndexedDB vào bộ nhớ Cache khi khởi động ứng dụng
 */
export async function hydrateStorageFromIndexedDB(): Promise<{
  profile: PlayerProfile;
  activeSession: ActiveMatchSession | null;
  humanBehavior: unknown | null;
}> {
  try {
    const dbProfile = await dbGetPlayerProfile();
    if (dbProfile) {
      cachedProfile = sanitizeAndValidateProfile(dbProfile);
      dbSavePlayerProfile(cachedProfile); // Cập nhật lại nếu có reset ngày mới
    } else if (!cachedProfile) {
      cachedProfile = loadPlayerProfile();
      await dbSavePlayerProfile(cachedProfile);
    }

    const dbSession = await dbGetActiveSession();
    if (dbSession) {
      cachedActiveSession = dbSession;
    }

    const dbBehavior = await dbGetHumanBehavior();
    if (dbBehavior) {
      cachedHumanBehavior = dbBehavior;
    }
  } catch (e) {
    console.warn('Lỗi khi hydrate storage từ IndexedDB:', e);
  }

  return {
    profile: cachedProfile || loadPlayerProfile(),
    activeSession: cachedActiveSession,
    humanBehavior: cachedHumanBehavior
  };
}

/**
 * Tải thông tin người chơi từ Cache (hoặc khởi tạo mặc định và lưu IndexedDB)
 */
export function loadPlayerProfile(): PlayerProfile {
  if (cachedProfile) {
    return cachedProfile;
  }

  const todayStr = getTodayDateString();
  const initialProfile: PlayerProfile = {
    ...DEFAULT_PROFILE,
    lastDailyResetDate: todayStr,
    dailyQuests: generateDailyQuestsForDate(todayStr),
    dailyMilestonesClaimed: { 1: false, 3: false, 5: false }
  };
  cachedProfile = initialProfile;
  dbSavePlayerProfile(initialProfile).catch(() => {});
  return initialProfile;
}

/**
 * Lưu thông tin người chơi vào Cache và đồng bộ bất đồng bộ xuống IndexedDB
 */
export function savePlayerProfile(profile: PlayerProfile): void {
  const sanitized = sanitizeAndValidateProfile(profile);
  cachedProfile = sanitized;
  dbSavePlayerProfile(sanitized).catch(() => {});
}

/**
 * Khôi phục về dữ liệu mặc định (Reset Profile)
 */
export function resetPlayerProfile(): PlayerProfile {
  const initial: PlayerProfile = {
    ...DEFAULT_PROFILE,
    lastDailyResetDate: getTodayDateString(),
    dailyQuests: generateDailyQuestsForDate(getTodayDateString()),
    dailyMilestonesClaimed: { 1: false, 3: false, 5: false }
  };

  cachedProfile = initial;
  dbDeletePlayerProfile().catch(() => {});
  dbClearHumanBehavior().catch(() => {});

  return initial;
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

export function saveActiveMatchSession(session: ActiveMatchSession): void {
  cachedActiveSession = session;
  dbSaveActiveSession(session).catch(() => {});
}

export function getActiveMatchSession(): ActiveMatchSession | null {
  return cachedActiveSession;
}

export function clearActiveMatchSession(): void {
  cachedActiveSession = null;
  dbClearActiveSession().catch(() => {});
}

// ============================================================================
// BỘ HỒ SƠ HÀNH VI ĐỐI THỦ THẬT (HUMAN BEHAVIOR PROFILE STORE)
// ============================================================================

export function saveHumanBehaviorProfile(data: unknown): void {
  cachedHumanBehavior = data;
  dbSaveHumanBehavior(data).catch(() => {});
}

export function loadHumanBehaviorProfile(): unknown | null {
  return cachedHumanBehavior;
}

export function clearHumanBehaviorProfile(): void {
  cachedHumanBehavior = null;
  dbClearHumanBehavior().catch(() => {});
}

export function getHumanBehaviorProfile(): unknown | null {
  return loadHumanBehaviorProfile();
}

