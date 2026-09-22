import { BOT_PERSONAS, generateRandomBotConfig } from '../ai/bot-factory';
import { BotConfig } from '../ai/types';
import { MatchPlayer } from './types';
import { 
  RANK_TIERS, 
  RankTierInfo, 
  getRankTierByElo, 
  getTierFromElo 
} from './constants/ranks';
import type { I18nKeyPath } from '../locales/types';
import { wasmCalculateEloDelta, wasmComputeTableEloSettlement } from './wasm-bridge';

export { RANK_TIERS, type RankTierInfo, getRankTierByElo, getTierFromElo };

export interface EloPerformanceMetrics {
  remainingCards?: number;
  chopsCount?: number;
  gotChoppedCount?: number;
  rottenCount?: number;
  isBurnt?: boolean;
  causedBurntCount?: number;
  isThreeSpadesWin?: boolean;
  isInstantWin?: boolean;
  currentStreak?: number;
}

export interface EloBreakdownItem {
  id: string;
  labelKey: I18nKeyPath;
  value: number;
}

export interface EloDeltaResult {
  delta: number;
  newElo: number;
  breakdown: {
    base: number;
    opponentScaling: number;
    performance: number;
    streak: number;
    items: EloBreakdownItem[];
  };
}

/**
 * Tính toán thay đổi Elo sau một ván xếp hạng theo mô hình Đa Chiều (Multi-Dimensional Elo)
 * 1. Base Delta theo quy mô bàn (2 người: ±20, 3 người: +28/0/-28, 4 người: +40/+15/-15/-40)
 * 2. Scaling theo chênh lệch Elo đối thủ
 * 3. Điểm hiệu suất diễn biến thi đấu (Performance Metrics): Chặt Heo, Bị Chặt, Thối Heo, Cóng, Kháng cự còn ít lá, 3 Bích
 * 4. Điểm thưởng chuỗi thắng (Streak Bonus)
 */
export function calculateEloDelta(
  rankPosition: number,
  playerElo: number,
  opponentsAvgElo: number,
  totalPlayers: number = 4,
  metrics?: EloPerformanceMetrics
): EloDeltaResult {
  return wasmCalculateEloDelta(rankPosition, playerElo, opponentsAvgElo, totalPlayers, metrics);
}

export interface TableEloSettlementParams {
  readonly players: readonly MatchPlayer[];
  readonly winners: readonly MatchPlayer[];
  readonly playerElos: Readonly<Record<string, number>>;
  readonly chopsByPlayer: Readonly<Record<string, number>>;
  readonly gotChoppedByPlayer: Readonly<Record<string, number>>;
  readonly streaksByPlayer: Readonly<Record<string, number>>;
  readonly isThreeSpadesWin: boolean;
  readonly isInstantWin: boolean;
}

export interface TableEloSettlementResult {
  readonly allEloDeltas: Readonly<Record<string, number>>;
  readonly allEloBreakdowns: Readonly<Record<string, EloDeltaResult['breakdown']>>;
}

/**
 * Kết toán Elo tổng quát cho TOÀN BỘ NGƯỜI CHƠI trên bàn đấu (triệu gọi trực tiếp Rust WASM Engine):
 * Áp dụng cùng một công thức toán học bình đẳng cho cả người chơi và Bot.
 * Tuyệt đối không fallback ngầm; toàn bộ dữ liệu là non-nullable tại thời điểm kết toán.
 */
export function computeTableEloSettlement(params: TableEloSettlementParams): TableEloSettlementResult {
  return wasmComputeTableEloSettlement(params);
}

/**
 * Thuật toán Matchmaking: Ghép 3 Bot có Elo dao động quanh người chơi kèm danh tính phong phú
 */
export function matchmakeRankedOpponents(playerElo: number): BotConfig[] {
  const allBots = Object.values(BOT_PERSONAS);
  
  // Sắp xếp các bot theo độ gần với Elo người chơi
  const sorted = [...allBots].sort((a, b) => {
    const aElo = a.elo ?? 1000;
    const bElo = b.elo ?? 1000;
    return Math.abs(aElo - playerElo) - Math.abs(bElo - playerElo);
  });

  // Chọn ra 3 bot gần nhất nhưng có độ đa dạng phong cách (không trùng bot)
  const candidatePool = sorted.slice(0, 6);
  const shuffled = [...candidatePool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  // Sinh tên và avatar ngẫu nhiên phong phú nhưng giữ trọn vẹn chỉ số Elo và AI
  const usedNames: string[] = [];
  const usedAvatars: string[] = [];
  return selected.map(bot => {
    const tierNum = getTierFromElo(bot.elo).tierNum;

    const dynamicBot = generateRandomBotConfig(tierNum, {
      baseId: bot.id,
      excludeNames: usedNames,
      excludeAvatars: usedAvatars
    });
    usedNames.push(dynamicBot.name);
    usedAvatars.push(dynamicBot.avatar);
    return dynamicBot;
  });
}
