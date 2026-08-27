import { BOT_PERSONAS, generateRandomBotConfig } from '../ai/bot-factory';
import { BotConfig } from '../ai/types';
import { getTierFromElo } from './ecosystem/ecosystem-types';

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
    id: 'WOOD',
    name: 'Tân Thủ',
    badge: '🪵',
    minElo: 0,
    maxElo: 899,
    color: '#8B5A2B',
    description: 'Bậc khởi đầu dành cho người mới làm quen với sới bạc.'
  },
  {
    id: 'BRONZE',
    name: 'Tập Sự',
    badge: '🥉',
    minElo: 900,
    maxElo: 1199,
    color: '#CD7F32',
    description: 'Nắm vững luật cơ bản, bắt đầu biết xả rác và giữ Heo an toàn.'
  },
  {
    id: 'SILVER',
    name: 'Phong Trào',
    badge: '🥈',
    minElo: 1200,
    maxElo: 1499,
    color: '#C0C0C0',
    description: 'Phong cách phóng khoáng, biết đếm Heo và gài bẫy nhử mồi cơ bản.'
  },
  {
    id: 'GOLD',
    name: 'Lão Luyện',
    badge: '🥇',
    minElo: 1500,
    maxElo: 1799,
    color: '#FFD700',
    description: 'Già dơ sới bạc, đếm Heo + Át chuẩn xác và chống đền bài 1 lá quyết liệt.'
  },
  {
    id: 'PLATINUM',
    name: 'Tinh Anh',
    badge: '💎',
    minElo: 1800,
    maxElo: 2099,
    color: '#E5E4E2',
    description: 'Bán chuyên đẳng cấp, nhớ trọn 52 lá và tung hỏa mù CFR Bluffing.'
  },
  {
    id: 'DIAMOND',
    name: 'Cao Thủ',
    badge: '🔮',
    minElo: 2100,
    maxElo: 2399,
    color: '#00FFFF',
    description: 'Chuyên nghiệp Esports, tự động tái cấu trúc thế bài theo nhịp trận đấu.'
  },
  {
    id: 'MASTER',
    name: 'Đại Cao Thủ',
    badge: '👑',
    minElo: 2400,
    maxElo: 2699,
    color: '#FF4500',
    description: 'Đỉnh cao suy luận, dùng xác suất Bayes đoán chính xác 85% bài ẩn của đối thủ.'
  },
  {
    id: 'GRANDMASTER',
    name: 'Thần Bài Huyền Thoại',
    badge: '🌌',
    minElo: 2700,
    maxElo: 2999,
    color: '#9932CC',
    description: 'Khắc tinh cờ tàn, vét cạn Minimax Alpha-Beta tìm chuỗi Forced-Win tất thắng.'
  },
  {
    id: 'CHALLENGER',
    name: 'Siêu Trí Tuệ Vô Địch',
    badge: '⚡',
    minElo: 3000,
    maxElo: 9999,
    color: '#FFD700',
    description: 'Trùm cuối siêu AI (Alpha Mind, Zero Defeat), hoàn hảo không tì vết.'
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

/**
 * Tính toán thay đổi Elo sau một ván xếp hạng
 * @param rankPosition Vị trí về đích: 1 (Nhất), 2 (Nhì), 3 (Ba), 4 (Bét)
 * @param playerElo Điểm Elo hiện tại của người chơi
 * @param opponentsAvgElo Điểm Elo trung bình của các bot đối thủ
 * @param totalPlayers Tổng số người chơi tại bàn (2, 3 hoặc 4 người)
 */
export function calculateEloDelta(
  rankPosition: number,
  playerElo: number,
  opponentsAvgElo: number,
  totalPlayers: number = 4
): { delta: number; newElo: number } {
  const eloDiff = opponentsAvgElo - playerElo;
  const scaling = Math.max(0.5, Math.min(1.5, 1 + eloDiff / 800));

  let baseDelta = 0;
  if (totalPlayers === 2) {
    if (rankPosition === 1) {
      baseDelta = Math.round(30 * scaling);
    } else {
      baseDelta = -Math.round(30 / scaling);
    }
  } else if (totalPlayers === 3) {
    if (rankPosition === 1) {
      baseDelta = Math.round(32 * scaling);
    } else if (rankPosition === 2) {
      baseDelta = Math.round(eloDiff / 400); // Hòa Elo (±2)
    } else {
      baseDelta = -Math.round(32 / scaling);
    }
  } else {
    // 4 Players
    if (rankPosition === 1) {
      baseDelta = Math.round(35 * scaling);
    } else if (rankPosition === 2) {
      baseDelta = Math.round(12 * scaling);
    } else if (rankPosition === 3) {
      baseDelta = -Math.round(12 / scaling);
    } else {
      baseDelta = -Math.round(35 / scaling);
    }
  }

  const newElo = Math.max(100, playerElo + baseDelta);
  return { delta: baseDelta, newElo };
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
    usedNames.push(dynamicBot.name || '');
    usedAvatars.push(dynamicBot.avatar || '🤖');
    return dynamicBot;
  });
}
