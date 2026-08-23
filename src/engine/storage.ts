import { Quest, Achievement, INITIAL_DAILY_QUESTS, INITIAL_ACHIEVEMENTS } from './quests';

export interface PlayerProfile {
  name: string;
  avatar: string;
  coins: number;
  elo: number;
  activeTitle: string;
  activeCardBack: string;
  activeTableFelt: string;
  activeAvatarFrame: string;
  unlockedItems: string[];
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
  name: 'Đại Gia Sài Thành',
  avatar: '🤠',
  coins: 20000,
  elo: 1000,
  activeTitle: 'title_novice',
  activeCardBack: 'card_back_classic',
  activeTableFelt: 'felt_traditional_emerald',
  activeAvatarFrame: 'frame_none',
  unlockedItems: ['card_back_classic', 'felt_traditional_emerald', 'frame_none', 'title_novice'],
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

/**
 * Tải thông tin người chơi từ LocalStorage (hoặc khởi tạo mặc định)
 */
export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
      unlockedItems: parsed.unlockedItems || DEFAULT_PROFILE.unlockedItems,
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Lỗi khi lưu PlayerProfile:', e);
  }
}

/**
 * Khôi phục về dữ liệu mặc định (Reset Profile)
 */
export function resetPlayerProfile(): PlayerProfile {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Lỗi khi xóa profile:', e);
  }
  return { ...DEFAULT_PROFILE };
}
