import { BotConfig } from '../../ai/types';

/**
 * ============================================================================
 * KIỂU DỮ LIỆU HỆ SINH THÁI 200 BOT (ECOSYSTEM TYPES)
 * ============================================================================
 */

export type BotLifecycleStatus = 'ACTIVE' | 'BANKRUPT';
export type BotActivityStatus = 'IN_MATCH' | 'IDLE' | 'RESTING';

export interface BotHeadToHead {
  games: number;
  botWins: number;
  humanWins: number;
  netCoinsEarnedFromHuman: number;
}

export interface BotStats {
  gamesPlayed: number;
  wins: number;
  chopsDone: number;
  congsGiven: number;
  totalEarned: number;
}

export interface BotEntity extends BotConfig {
  coins: number;
  tierNum: number; // 1, 2, 3, 4, 5
  currentStreak: number; // Dương = thắng liên tiếp, Âm = thua liên tiếp
  highestStreak: number;
  stats: BotStats;
  headToHeadVsHuman: BotHeadToHead;
  personalityTags: string[]; // Ví dụ: ['Thích Chặt Heo', 'Đếm Bài Thần Sầu', 'Hổ Báo', 'Cắt Lỗ Tốt']
  status: BotLifecycleStatus;
  activityStatus: BotActivityStatus;
  createdAt: number;
  rankBadge: string;
  title: string;
}

export interface TableGroup {
  tableId: string;
  betAmount: number;
  botIds: [string, string, string, string];
  tierNum: number;
}

export type EcosystemNewsType = 
  | 'BANKRUPTCY' 
  | 'ROOKIE_JOINED' 
  | 'BIG_WIN' 
  | 'WIN_STREAK' 
  | 'PROMOTION' 
  | 'HEAD_TO_HEAD'
  | 'HIGH_ROLLER';

export interface EcosystemNewsItem {
  id: string;
  timestamp: number;
  type: EcosystemNewsType;
  message: string;
  botId: string | null;
  botName: string | null;
  avatar: string | null;
  amount: number | null;
}

export interface BotMatchResult {
  botId: string;
  rank: number; // 1, 2, 3, 4
  deltaCoins: number;
  deltaElo: number;
  hadCong: boolean;
  hadThoi: boolean;
  chopsCount: number;
  congsGivenCount: number;
}

export interface SimulatedTableResult {
  tableId: string;
  betAmount: number;
  botResults: BotMatchResult[];
  highlightNews: EcosystemNewsItem[] | null;
}
