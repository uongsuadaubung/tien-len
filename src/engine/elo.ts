import { BOT_PERSONAS, generateRandomBotConfig, getBotConfig } from '../ai/bot-factory';
import { BotConfig } from '../ai/types';
import { Player } from './types';
import { getTierFromElo } from './ecosystem/ecosystem-types';
import type { I18nKeyPath } from '../locales/types';

export interface RankTierInfo {
  id: string;
  name: string;
  badge: string;
  minElo: number;
  maxElo: number;
  color: string;
  description: string;
}

export const RANK_TIERS: RankTierInfo[] = [
  {
    id: 'IRON',
    name: 'Sắt',
    badge: '⚙️',
    minElo: 0,
    maxElo: 899,
    color: '#71717A',
    description: 'Bậc khởi đầu cho người mới, làm quen thao tác và luật bài cơ bản.'
  },
  {
    id: 'BRONZE',
    name: 'Đồng',
    badge: '🥉',
    minElo: 900,
    maxElo: 1199,
    color: '#CD7F32',
    description: 'Nắm vững luật cơ bản, bắt đầu biết tẩu rác và giữ Heo an toàn.'
  },
  {
    id: 'SILVER',
    name: 'Bạc',
    badge: '🥈',
    minElo: 1200,
    maxElo: 1499,
    color: '#C0C0C0',
    description: 'Phong cách phóng khoáng, biết đếm Heo và gài bẫy nhử mồi cơ bản.'
  },
  {
    id: 'GOLD',
    name: 'Vàng',
    badge: '🥇',
    minElo: 1500,
    maxElo: 1799,
    color: '#FFD700',
    description: 'Già dơ sới bạc, đếm Heo + Át chuẩn xác và chống đền bài 1 lá quyết liệt.'
  },
  {
    id: 'PLATINUM',
    name: 'Bạch Kim',
    badge: '💎',
    minElo: 1800,
    maxElo: 2099,
    color: '#00FA9A',
    description: 'Bán chuyên đẳng cấp, nhớ trọn 52 lá và tối ưu hóa giải phóng bài rác.'
  },
  {
    id: 'DIAMOND',
    name: 'Kim Cương',
    badge: '🔮',
    minElo: 2100,
    maxElo: 2399,
    color: '#00FFFF',
    description: 'Chuyên nghiệp Esports, tự động tái cấu trúc thế bài theo nhịp trận đấu.'
  },
  {
    id: 'MASTER',
    name: 'Cao Thủ',
    badge: '👑',
    minElo: 2400,
    maxElo: 2699,
    color: '#DA70D6',
    description: 'Đỉnh cao suy luận, dùng xác suất Bayes đoán chính xác 85% bài ẩn của đối thủ.'
  },
  {
    id: 'GRANDMASTER',
    name: 'Đại Cao Thủ',
    badge: '🌌',
    minElo: 2700,
    maxElo: 2999,
    color: '#FF4500',
    description: 'Khắc tinh cờ tàn, vét cạn Minimax Alpha-Beta tìm chuỗi Forced-Win tất thắng.'
  },
  {
    id: 'CHALLENGER',
    name: 'Thách Đấu',
    badge: '⚡',
    minElo: 3000,
    maxElo: 9999,
    color: '#F59E0B',
    description: 'Trùm cuối siêu AI (Alpha Mind, Zero Defeat), đỉnh cao thế giới.'
  }
];

/**
 * Lấy thông tin Bậc Rank theo điểm Elo
 */
export function getRankTierByElo(elo: number): RankTierInfo {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANK_TIERS[i].minElo) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

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
  const eloDiff = opponentsAvgElo - playerElo;
  const scaling = Math.max(0.6, Math.min(1.5, 1 + eloDiff / 800));

  let baseDelta = 0;
  if (totalPlayers === 2) {
    baseDelta = rankPosition === 1 ? 20 : -20;
  } else if (totalPlayers === 3) {
    if (rankPosition === 1) {
      baseDelta = 28;
    } else if (rankPosition === 2) {
      baseDelta = 0;
    } else {
      baseDelta = -28;
    }
  } else {
    // 4 Players
    if (rankPosition === 1) {
      baseDelta = 40;
    } else if (rankPosition === 2) {
      baseDelta = 15;
    } else if (rankPosition === 3) {
      baseDelta = -15;
    } else {
      baseDelta = -40;
    }
  }

  const scaledBase = baseDelta >= 0
    ? Math.round(baseDelta * scaling)
    : -Math.round(Math.abs(baseDelta) / scaling);
  const scalingDiff = scaledBase - baseDelta;

  const items: EloBreakdownItem[] = [];
  items.push({ id: 'base', labelKey: 'victory.eloBase', value: baseDelta });
  if (scalingDiff !== 0) {
    items.push({ id: 'scaling', labelKey: 'victory.eloOpponentScaling', value: scalingDiff });
  }

  let performanceDelta = 0;
  if (metrics) {
    // 1. Kháng cự kiên cường / Hiệu số lá bài còn lại (cho người thua)
    if (rankPosition >= 2) {
      if (metrics.isBurnt) {
        performanceDelta -= 8;
        items.push({ id: 'burntPenalty', labelKey: 'victory.eloBurntPenalty', value: -8 });
      } else if (metrics.remainingCards !== undefined) {
        if (metrics.remainingCards <= 2) {
          performanceDelta += 4;
          items.push({ id: 'cardMitigation', labelKey: 'victory.eloCardMitigationHeroic', value: 4 });
        } else if (metrics.remainingCards <= 5) {
          performanceDelta += 2;
          items.push({ id: 'cardMitigation', labelKey: 'victory.eloCardMitigationActive', value: 2 });
        } else if (metrics.remainingCards >= 10) {
          performanceDelta -= 3;
          items.push({ id: 'cardOverwhelm', labelKey: 'victory.eloCardOverwhelmed', value: -3 });
        }
      }
    }

    // 2. Chặt Heo / Chặt Hàng thành công
    if (metrics.chopsCount && metrics.chopsCount > 0) {
      const chopBonus = Math.min(6, metrics.chopsCount * 3);
      performanceDelta += chopBonus;
      items.push({ id: 'chopsBonus', labelKey: 'victory.eloChopsBonus', value: chopBonus });
    }

    // 3. Bị Chặt Heo / Chặt Hàng
    if (metrics.gotChoppedCount && metrics.gotChoppedCount > 0) {
      const chopPenalty = -Math.min(6, metrics.gotChoppedCount * 2);
      performanceDelta += chopPenalty;
      items.push({ id: 'gotChoppedPenalty', labelKey: 'victory.eloGotChoppedPenalty', value: chopPenalty });
    }

    // 4. Thối Heo / Thối Hàng cuối ván
    if (metrics.rottenCount && metrics.rottenCount > 0) {
      const rottenPenalty = -Math.min(6, metrics.rottenCount * 2);
      performanceDelta += rottenPenalty;
      items.push({ id: 'rottenPenalty', labelKey: 'victory.eloRottenPenalty', value: rottenPenalty });
    }

    // 5. Ép đối thủ Cóng (chỉ dành cho người về Nhất)
    if (rankPosition === 1 && metrics.causedBurntCount && metrics.causedBurntCount > 0) {
      const burnBonus = Math.min(10, metrics.causedBurntCount * 5);
      performanceDelta += burnBonus;
      items.push({ id: 'causedBurntBonus', labelKey: 'victory.eloCausedBurntBonus', value: burnBonus });
    }

    // 6. Dứt điểm 3 Bích cuối cùng
    if (rankPosition === 1 && metrics.isThreeSpadesWin) {
      performanceDelta += 8;
      items.push({ id: 'threeSpadesBonus', labelKey: 'victory.eloThreeSpadesBonus', value: 8 });
    }

    // 7. Tới Trắng tức thì
    if (rankPosition === 1 && metrics.isInstantWin) {
      performanceDelta += 4;
      items.push({ id: 'instantWinBonus', labelKey: 'victory.eloInstantWinBonus', value: 4 });
    }
  }

  // 4. Thưởng Chuỗi Thắng (dành cho người về Nhất)
  let streakDelta = 0;
  if (rankPosition === 1 && metrics?.currentStreak) {
    if (metrics.currentStreak >= 5) {
      streakDelta = 6;
      items.push({ id: 'streakBonus', labelKey: 'victory.eloStreak5Bonus', value: 6 });
    } else if (metrics.currentStreak >= 3) {
      streakDelta = 3;
      items.push({ id: 'streakBonus', labelKey: 'victory.eloStreak3Bonus', value: 3 });
    }
  }

  const totalDelta = scaledBase + performanceDelta + streakDelta;
  const newElo = Math.max(100, playerElo + totalDelta);

  return {
    delta: totalDelta,
    newElo,
    breakdown: {
      base: baseDelta,
      opponentScaling: scalingDiff,
      performance: performanceDelta,
      streak: streakDelta,
      items
    }
  };
}

export interface TableEloSettlementParams {
  readonly players: readonly Player[];
  readonly winners: readonly Player[];
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
 * Kết toán Elo tổng quát cho TOÀN BỘ NGƯỜI CHƠI trên bàn đấu:
 * Áp dụng cùng một công thức toán học bình đẳng cho cả người chơi và Bot.
 * Tuyệt đối không fallback ngầm; toàn bộ dữ liệu là non-nullable tại thời điểm kết toán.
 */
export function computeTableEloSettlement(params: TableEloSettlementParams): TableEloSettlementResult {
  const {
    players,
    winners,
    playerElos,
    chopsByPlayer,
    gotChoppedByPlayer,
    streaksByPlayer,
    isThreeSpadesWin,
    isInstantWin
  } = params;

  const totalPlayers = players.length;
  const allEloDeltas: Record<string, number> = {};
  const allEloBreakdowns: Record<string, EloDeltaResult['breakdown']> = {};

  // Xếp hạng đầy đủ cho toàn bộ người chơi:
  // Nếu có trong winners: theo thứ tự về đích
  // Nếu chưa có trong winners (ví dụ đếm lá dừng ngay khi có người về nhất):
  // Xếp theo số lá bài còn lại tăng dần (ai còn ít bài hơn xếp hạng cao hơn)
  const rankedPlayers = [...players].sort((a, b) => {
    const aWinIdx = winners.findIndex(w => w.id === a.id);
    const bWinIdx = winners.findIndex(w => w.id === b.id);
    if (aWinIdx !== -1 && bWinIdx !== -1) return aWinIdx - bWinIdx;
    if (aWinIdx !== -1) return -1;
    if (bWinIdx !== -1) return 1;
    return a.hand.length - b.hand.length;
  });

  for (let i = 0; i < rankedPlayers.length; i++) {
    const p = rankedPlayers[i];
    const rankPosition = i + 1; // 1 (Nhất), 2 (Nhì), 3 (Ba), 4 (Bét)

    // Lấy Elo hiện tại của người chơi
    let currentElo = playerElos[p.id];
    if (currentElo === undefined) {
      if (p.isBot && p.botPersonaId) {
        const config = getBotConfig(p.botPersonaId);
        currentElo = config.elo ?? 1000;
      } else {
        currentElo = 1000;
      }
    }

    // Tính Elo trung bình của tất cả đối thủ khác tại bàn
    const otherPlayers = players.filter(other => other.id !== p.id);
    const opponentsAvgElo = otherPlayers.length > 0
      ? Math.round(
          otherPlayers.reduce((sum, other) => {
            let oElo = playerElos[other.id];
            if (oElo === undefined) {
              if (other.isBot && other.botPersonaId) {
                const cfg = getBotConfig(other.botPersonaId);
                oElo = cfg.elo ?? 1000;
              } else {
                oElo = 1000;
              }
            }
            return sum + oElo;
          }, 0) / otherPlayers.length
        )
      : 1000;

    // Trích xuất Performance Metrics riêng cho người chơi này
    const isBurnt = !p.hasPlayedFirstCard;
    const remainingCards = p.hand.length;
    const chopsCount = chopsByPlayer[p.id] ?? 0;
    const gotChoppedCount = gotChoppedByPlayer[p.id] ?? 0;
    const rottenCount = rankPosition >= 2 ? p.hand.filter(c => c.rank === 15).length : 0;
    const causedBurntCount = rankPosition === 1
      ? players.filter(other => other.id !== p.id && !other.hasPlayedFirstCard).length
      : 0;
    const isThisThreeSpadesWin = isThreeSpadesWin && rankPosition === 1;
    const isThisInstantWin = isInstantWin && rankPosition === 1;
    const currentStreak = streaksByPlayer[p.id] ?? 0;

    const res = calculateEloDelta(
      rankPosition,
      currentElo,
      opponentsAvgElo,
      totalPlayers,
      {
        remainingCards,
        isBurnt,
        chopsCount,
        gotChoppedCount,
        rottenCount,
        causedBurntCount,
        isThreeSpadesWin: isThisThreeSpadesWin,
        isInstantWin: isThisInstantWin,
        currentStreak
      }
    );

    allEloDeltas[p.id] = res.delta;
    allEloBreakdowns[p.id] = res.breakdown;
  }

  return {
    allEloDeltas,
    allEloBreakdowns
  };
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
