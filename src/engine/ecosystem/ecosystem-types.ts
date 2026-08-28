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
  if (elo >= 3000) return { tierNum: 9, tier: 'Tier 9: Thách Đấu', rankBadge: '⚡', label: 'Thách Đấu' };
  if (elo >= 2700) return { tierNum: 8, tier: 'Tier 8: Đại Cao Thủ', rankBadge: '🌌', label: 'Đại Cao Thủ' };
  if (elo >= 2400) return { tierNum: 7, tier: 'Tier 7: Cao Thủ', rankBadge: '👑', label: 'Cao Thủ' };
  if (elo >= 2100) return { tierNum: 6, tier: 'Tier 6: Kim Cương', rankBadge: '🔮', label: 'Kim Cương' };
  if (elo >= 1800) return { tierNum: 5, tier: 'Tier 5: Bạch Kim', rankBadge: '💎', label: 'Bạch Kim' };
  if (elo >= 1500) return { tierNum: 4, tier: 'Tier 4: Vàng', rankBadge: '🥇', label: 'Vàng' };
  if (elo >= 1200) return { tierNum: 3, tier: 'Tier 3: Bạc', rankBadge: '🥈', label: 'Bạc' };
  if (elo >= 900) return { tierNum: 2, tier: 'Tier 2: Đồng', rankBadge: '🥉', label: 'Đồng' };
  return { tierNum: 1, tier: 'Tier 1: Sắt', rankBadge: '⚙️', label: 'Sắt' };
}

export function getTierInfoByTierNum(tierNum: number): EloTierInfo {
  switch (tierNum) {
    case 9: return { tierNum: 9, tier: 'Tier 9: Thách Đấu', rankBadge: '⚡', label: 'Thách Đấu' };
    case 8: return { tierNum: 8, tier: 'Tier 8: Đại Cao Thủ', rankBadge: '🌌', label: 'Đại Cao Thủ' };
    case 7: return { tierNum: 7, tier: 'Tier 7: Cao Thủ', rankBadge: '👑', label: 'Cao Thủ' };
    case 6: return { tierNum: 6, tier: 'Tier 6: Kim Cương', rankBadge: '🔮', label: 'Kim Cương' };
    case 5: return { tierNum: 5, tier: 'Tier 5: Bạch Kim', rankBadge: '💎', label: 'Bạch Kim' };
    case 4: return { tierNum: 4, tier: 'Tier 4: Vàng', rankBadge: '🥇', label: 'Vàng' };
    case 3: return { tierNum: 3, tier: 'Tier 3: Bạc', rankBadge: '🥈', label: 'Bạc' };
    case 2: return { tierNum: 2, tier: 'Tier 2: Đồng', rankBadge: '🥉', label: 'Đồng' };
    default: return { tierNum: 1, tier: 'Tier 1: Sắt', rankBadge: '⚙️', label: 'Sắt' };
  }
}

export function getTierFilterLabel(tier: number | 'ALL'): string {
  if (tier === 'ALL') return 'Tất Cả';
  const info = getTierInfoByTierNum(tier);
  return `${info.rankBadge} ${info.label}`;
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
  dnaTier: number; // Tier gốc của bộ não AI (1 -> 9)
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
  id?: string;
  tableId: string;
  timestamp?: number;
  betAmount: number;
  botResults: BotMatchResult[];
  highlightNews: EcosystemNewsItem[] | null;
}
