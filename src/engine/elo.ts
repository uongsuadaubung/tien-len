import { BOT_PERSONAS, generateRandomBotConfig } from '../ai/bot-factory';
import { BotConfig } from '../ai/types';

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
    id: 'BRONZE',
    name: 'Đồng Đoàn',
    badge: '🥉',
    minElo: 0,
    maxElo: 999,
    color: '#CD7F32',
    description: 'Bậc nhập môn dành cho người mới làm quen luật chơi.'
  },
  {
    id: 'SILVER',
    name: 'Bạc Đoàn',
    badge: '🥈',
    minElo: 1000,
    maxElo: 1249,
    color: '#C0C0C0',
    description: 'Người chơi đã nắm vững tổ hợp bài và bắt đầu biết giữ Heo.'
  },
  {
    id: 'GOLD',
    name: 'Vàng Đoàn',
    badge: '🥇',
    minElo: 1250,
    maxElo: 1499,
    color: '#FFD700',
    description: 'Phong trào lão luyện, thích chặt chém và xả rác nhanh.'
  },
  {
    id: 'PLATINUM',
    name: 'Bạch Kim',
    badge: '💎',
    minElo: 1500,
    maxElo: 1749,
    color: '#E5E4E2',
    description: 'Kinh nghiệm già dơ, biết nhớ bài và gài bẫy săn Heo.'
  },
  {
    id: 'DIAMOND',
    name: 'Kim Cương',
    badge: '💠',
    minElo: 1750,
    maxElo: 1999,
    color: '#00FFFF',
    description: 'Cao thủ bán chuyên, đếm bài chuẩn và ép nhịp đối thủ gần về nhất.'
  },
  {
    id: 'MASTER',
    name: 'Cao Thủ',
    badge: '👑',
    minElo: 2000,
    maxElo: 2299,
    color: '#FF4500',
    description: 'Thần bài thực thụ, kiểm soát nhịp độ bàn chơi đỉnh cao.'
  },
  {
    id: 'GRANDMASTER',
    name: 'Thần Bài Tối Thượng',
    badge: '🤖',
    minElo: 2300,
    maxElo: 9999,
    color: '#9932CC',
    description: 'Đỉnh cao trí tuệ nhân tạo, giải cờ tàn MCTS không có nước đi thừa.'
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
 * @param opponentsAvgElo Điểm Elo trung bình của 3 bot đối thủ
 */
export function calculateEloDelta(
  rankPosition: number,
  playerElo: number,
  opponentsAvgElo: number
): { delta: number; newElo: number } {
  const eloDiff = opponentsAvgElo - playerElo;
  const scaling = Math.max(0.5, Math.min(1.5, 1 + eloDiff / 800));

  let baseDelta = 0;
  if (rankPosition === 1) {
    baseDelta = Math.round(35 * scaling);
  } else if (rankPosition === 2) {
    baseDelta = Math.round(12 * scaling);
  } else if (rankPosition === 3) {
    baseDelta = -Math.round(12 / scaling);
  } else {
    baseDelta = -Math.round(35 / scaling);
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
    let tierNum = 2;
    const tierStr = bot.tier || '';
    if (tierStr.includes('1')) tierNum = 1;
    else if (tierStr.includes('2')) tierNum = 2;
    else if (tierStr.includes('3')) tierNum = 3;
    else if (tierStr.includes('4')) tierNum = 4;
    else if (tierStr.includes('5')) tierNum = 5;

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
