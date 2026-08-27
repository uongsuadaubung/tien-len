import { BotConfig } from '../../ai/types';

/**
 * ============================================================================
 * KIỂU DỮ LIỆU HỆ SINH THÁI 200 BOT (ECOSYSTEM TYPES)
 * ============================================================================
 */

export interface EloTierInfo {
  tierNum: number;
  tier: string;
  rankBadge: string;
  label: string;
}

/**
 * Hàm thuần túy phái sinh Bậc Rank, Danh Hiệu và Huy Hiệu trực tiếp từ Điểm Elo
 * (Single Source of Truth - không cần lưu dư thừa trong DB)
 */
export function getTierFromElo(elo: number): EloTierInfo {
  if (elo >= 2000) return { tierNum: 5, tier: 'Tier 5: Thần Bài', rankBadge: '👑', label: 'Thần Bài' };
  if (elo >= 1700) return { tierNum: 4, tier: 'Tier 4: Cao Thủ', rankBadge: '💎', label: 'Cao Thủ' };
  if (elo >= 1400) return { tierNum: 3, tier: 'Tier 3: Kinh Nghiệm', rankBadge: '🥇', label: 'Kinh Nghiệm' };
  if (elo >= 1100) return { tierNum: 2, tier: 'Tier 2: Phong Trào', rankBadge: '🥈', label: 'Phong Trào' };
  return { tierNum: 1, tier: 'Tier 1: Tập Sự', rankBadge: '🥉', label: 'Tập Sự' };
}

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
  currentStreak: number; // Dương = thắng liên tiếp, Âm = thua liên tiếp
  highestStreak: number;
  stats: BotStats;
  headToHeadVsHuman: BotHeadToHead;
  personalityTags: string[]; // Ví dụ: ['Thích Chặt Heo', 'Đếm Bài Thần Sầu', 'Hổ Báo', 'Cắt Lỗ Tốt']
  status: BotLifecycleStatus;
  activityStatus: BotActivityStatus;
  createdAt: number;
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
