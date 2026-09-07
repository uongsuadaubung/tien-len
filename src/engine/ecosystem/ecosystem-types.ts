/**
 * ============================================================================
 * KIỂU DỮ LIỆU HỆ SINH THÁI 200 BOT (ECOSYSTEM TYPES)
 * ============================================================================
 */

export {
  RANK_TIERS,
  type RankTierInfo,
  type EloTierInfo,
  getRankTierByElo,
  getTierFromElo,
  getTierInfoByTierNum,
  getTierFilterLabel
} from '../constants/ranks';

import type {
  BotEntity,
  BotStats,
  BotHeadToHead,
  EcosystemNewsItem,
  EcosystemNewsType
} from '../schemas/ecosystem.schema';

export type {
  BotEntity,
  BotStats,
  BotHeadToHead,
  EcosystemNewsItem,
  EcosystemNewsType
};

export type BotLifecycleStatus = 'ACTIVE' | 'BANKRUPT';
export type BotActivityStatus = 'IN_MATCH' | 'IDLE' | 'RESTING';

export interface TableGroup {
  tableId: string;
  betAmount: number;
  botIds: [string, string, string, string];
  tierNum: number;
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
  id: string;
  tableId: string;
  timestamp: number;
  betAmount: number;
  botResults: BotMatchResult[];
  highlightNews: EcosystemNewsItem[];
}
