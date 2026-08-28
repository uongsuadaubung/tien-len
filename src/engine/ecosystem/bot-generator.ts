import { 
  BOT_PERSONAS, 
  GLOBAL_BOT_NAMES, 
  GLOBAL_NICKNAMES_BY_TIER, 
  GLOBAL_AVATARS,
  GLOBAL_AVATARS_BY_TIER,
  sanitizeAvatar,
  TIER_BASE_PERSONAS 
} from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { ECOSYSTEM_CONSTANTS } from '../constants/ecosystem';
import { ECONOMY_CONSTANTS } from '../constants/economy';
import { BotEntity, getTierFromElo } from './ecosystem-types';

/**
 * Hàm phụ trợ tính Gaussian Jitter (Độ lệch chuẩn ngẫu nhiên kẹp trong min/max)
 */
function applyJitter(baseValue: number, jitterRate: number = ECOSYSTEM_CONSTANTS.JITTER_RATE, minVal: number = 0.05, maxVal: number = 0.98): number {
  const deviation = (Math.random() - 0.5) * 2 * jitterRate;
  const raw = baseValue + deviation;
  return Math.max(minVal, Math.min(maxVal, Number(raw.toFixed(3))));
}

/**
 * Sinh các nhãn phong cách chơi (Personality Tags) dựa trên chỉ số nổi bật của bot
 */
export function generatePersonalityTags(config: Partial<BotConfig>): string[] {
  const tags: string[] = [];

  if ((config.trapTendency ?? 0) >= 0.55 || (config.baitingTendency ?? 0) >= 0.6) {
    tags.push('Thích Chặt Heo');
  }
  if ((config.memoryDepth ?? 0) >= 0.75) {
    tags.push('Đếm Bài Thần Sầu');
  }
  if ((config.riskAppetite ?? 0) >= 0.8) {
    tags.push('Hổ Báo Liều Lĩnh');
  } else if ((config.riskAppetite ?? 0) <= 0.45) {
    tags.push('Chắc Tay Phòng Thủ');
  }
  if ((config.damageControl ?? 0) >= 0.75) {
    tags.push('Cắt Lỗ Tinh Quái');
  }
  if ((config.turnsToWinLookahead ?? 0) >= 0.8) {
    tags.push('Dứt Điểm Chuẩn Xác');
  }
  if ((config.positionalAwareness ?? 0) >= 0.75) {
    tags.push('Đì Nhà Dưới');
  }
  if ((config.bombInferenceRate ?? 0) >= 0.7) {
    tags.push('Khứu Giác Bắt Bài');
  }

  if (tags.length === 0) {
    tags.push('Phong Cách Cân Bằng');
  }

  return tags.slice(0, 3);
}

/**
 * Sinh vốn ngân sách khởi điểm ngẫu nhiên cho Bot theo Tier (Dùng khi sinh 200 Bot ban đầu)
 */
export function generateEcosystemBankroll(tierNum: number, riskAppetite: number = 0.5): number {
  const range = ECOSYSTEM_CONSTANTS.TIER_INITIAL_BANKROLL[tierNum] || ECOSYSTEM_CONSTANTS.TIER_INITIAL_BANKROLL[2];
  const span = range.max - range.min;
  const riskBonus = (riskAppetite - 0.5) * (span * 0.2);
  const raw = range.min + Math.random() * span + riskBonus;

  let rounded = Math.round(raw);
  if (rounded < 10000) {
    rounded = Math.round(rounded / 100) * 100;
  } else if (rounded < 100000) {
    rounded = Math.round(rounded / 500) * 500;
  } else {
    rounded = Math.round(rounded / 1000) * 1000;
  }

  return Math.max(range.min, rounded);
}

/**
 * Sinh 1 Bot Entity độc nhất xoay quanh DNA của base persona + Jitter
 */
export function createBotEntityFromDNA(
  tierNum: number,
  index: number,
  usedNames: Set<string>
): BotEntity {
  const dnaKeys = TIER_BASE_PERSONAS[tierNum] || TIER_BASE_PERSONAS[2];
  const selectedKey = dnaKeys[index % dnaKeys.length];
  const basePersona = (selectedKey && BOT_PERSONAS[selectedKey]) || BOT_PERSONAS.BOT_ELO_1150;

  // 1. Tên và Avatar
  const availableNames = GLOBAL_BOT_NAMES.filter(n => !usedNames.has(n));
  const rawName = availableNames.length > 0
    ? availableNames[Math.floor(Math.random() * availableNames.length)]
    : `Cao Thủ ${tierNum}_${index + 1}`;
  usedNames.add(rawName);

  const nicknames = GLOBAL_NICKNAMES_BY_TIER[tierNum] || GLOBAL_NICKNAMES_BY_TIER[2];
  const nickname = nicknames[index % nicknames.length];
  const name = `${rawName} (${nickname})`;

  const avatarPool = GLOBAL_AVATARS_BY_TIER[tierNum] || GLOBAL_AVATARS;
  const rawAvatar = avatarPool[index % avatarPool.length] || GLOBAL_AVATARS[index % GLOBAL_AVATARS.length] || '🤖';
  const avatar = sanitizeAvatar(rawAvatar, index + tierNum);

  // 2. Tính Elo với Jitter
  let minElo = 600;
  let maxElo = 899;
  if (tierNum === 2) { minElo = 900; maxElo = 1199; }
  else if (tierNum === 3) { minElo = 1200; maxElo = 1499; }
  else if (tierNum === 4) { minElo = 1500; maxElo = 1799; }
  else if (tierNum === 5) { minElo = 1800; maxElo = 2099; }
  else if (tierNum === 6) { minElo = 2100; maxElo = 2399; }
  else if (tierNum === 7) { minElo = 2400; maxElo = 2699; }
  else if (tierNum === 8) { minElo = 2700; maxElo = 2999; }
  else if (tierNum === 9) { minElo = 3000; maxElo = 3400; }

  const baseElo = basePersona.elo;
  const eloOffset = (Math.random() - 0.5) * 80;
  const rawElo = Math.round(baseElo + eloOffset);
  const elo = Math.max(minElo, Math.min(maxElo, rawElo));

  // 3. Jitter các chỉ số AI
  const memoryDepth = applyJitter(basePersona.memoryDepth, 0.08, 0.1, 1.0);
  const riskAppetite = applyJitter(basePersona.riskAppetite, 0.1, 0.1, 0.95);
  const trapTendency = applyJitter(basePersona.trapTendency, 0.1, 0.05, 0.95);
  const baitingTendency = applyJitter(basePersona.baitingTendency, 0.1, 0.05, 0.95);
  const antiLeaderAggression = applyJitter(basePersona.antiLeaderAggression ?? 0.5, 0.08, 0.1, 0.95);
  const tempoControl = applyJitter(basePersona.tempoControl ?? 0.5, 0.08, 0.1, 0.95);
  const damageControl = applyJitter(basePersona.damageControl, 0.1, 0.1, 0.95);
  const turnsToWinLookahead = applyJitter(basePersona.turnsToWinLookahead, 0.08, 0.1, 0.95);
  const dynamicHandSacrifice = applyJitter(basePersona.dynamicHandSacrifice ?? 0.5, 0.08, 0.1, 0.95);
  const bombInferenceRate = applyJitter(basePersona.bombInferenceRate, 0.1, 0.05, 0.95);
  const semiCooperativeCooperation = applyJitter(basePersona.semiCooperativeCooperation ?? 0.5, 0.08, 0.1, 0.95);
  const positionalAwareness = applyJitter(basePersona.positionalAwareness, 0.1, 0.1, 0.95);
  const inMatchAdaptationRate = applyJitter(basePersona.inMatchAdaptationRate ?? 0.5, 0.08, 0.1, 0.95);
  const handPartitioningOptimality = applyJitter(basePersona.handPartitioningOptimality ?? 0.5, 0.08, 0.1, 0.95);
  const simulationLookahead = basePersona.simulationLookahead ?? (tierNum >= 5 ? 2 : 1);

  const personalityTags = generatePersonalityTags({
    trapTendency,
    baitingTendency,
    memoryDepth,
    riskAppetite,
    damageControl,
    turnsToWinLookahead,
    positionalAwareness,
    bombInferenceRate
  });

  const coins = generateEcosystemBankroll(tierNum, riskAppetite);
  const title = tierNum >= 9 ? 'Siêu Trí Tuệ Boss' : tierNum >= 8 ? 'Thần Bài' : tierNum >= 7 ? 'Đại Cao Thủ' : nickname;

  return {
    id: `bot_eco_t${tierNum}_${index}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    dnaTier: tierNum,
    name,
    avatar,
    description: basePersona.description || 'Cao thủ sới bạc',
    elo,
    memoryDepth,
    riskAppetite,
    trapTendency,
    baitingTendency,
    antiLeaderAggression,
    tempoControl,
    damageControl,
    turnsToWinLookahead,
    dynamicHandSacrifice,
    bombInferenceRate,
    semiCooperativeCooperation,
    positionalAwareness,
    inMatchAdaptationRate,
    handPartitioningOptimality,
    simulationLookahead,
    mctsSimulations: basePersona.mctsSimulations || 0,
    useMinimaxEndgame: basePersona.useMinimaxEndgame || tierNum >= 7,
    useBayesianInference: basePersona.useBayesianInference || tierNum >= 8,
    useNashEquilibrium: basePersona.useNashEquilibrium || tierNum >= 9,
    useDynamicRepartitioning: basePersona.useDynamicRepartitioning || tierNum >= 6,
    coins,
    currentStreak: 0,
    highestStreak: 0,
    stats: {
      gamesPlayed: 0,
      wins: 0,
      chopsDone: 0,
      congsGiven: 0,
      totalEarned: 0
    },
    headToHeadVsHuman: {
      games: 0,
      botWins: 0,
      humanWins: 0,
      netCoinsEarnedFromHuman: 0
    },
    personalityTags,
    status: 'ACTIVE',
    activityStatus: 'IDLE',
    createdAt: Date.now(),
    title
  };
}

/**
 * Khởi tạo toàn bộ 200 Bot ban đầu theo đúng tỉ lệ 9 Tiers Esports
 */
export function generateInitial200Bots(): BotEntity[] {
  const bots: BotEntity[] = [];
  const usedNames = new Set<string>();

  for (let tier = 1; tier <= 9; tier++) {
    const count = ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION[tier] || 20;
    for (let i = 0; i < count; i++) {
      const bot = createBotEntityFromDNA(tier, i, usedNames);
      bots.push(bot);
    }
  }

  return bots;
}

/**
 * Trích xuất chuẩn xác Bậc DNA (1..9) của Bot Entity:
 * 1. Đọc từ tiền tố ID chuẩn: bot_eco_t{tierNum}_...
 * 2. Đọc từ các cờ năng lực AI đặc thù (Nash, Bayesian, Minimax, Dynamic Repartitioning)
 * 3. Fallback theo điểm Elo nếu không có metadata ID
 */
export function getBotDnaTier(bot: BotEntity): number {
  if (typeof bot.dnaTier === 'number' && bot.dnaTier >= 1 && bot.dnaTier <= 9) {
    return bot.dnaTier;
  }

  if (bot.id) {
    const match = bot.id.match(/^bot_eco_t(\d+)_/);
    if (match) {
      const tier = parseInt(match[1], 10);
      if (tier >= 1 && tier <= 9) {
        return tier;
      }
    }
  }

  if (bot.useNashEquilibrium) return 9;
  if (bot.useBayesianInference) return 8;
  if (bot.useMinimaxEndgame) return 7;
  if (bot.useDynamicRepartitioning) return 6;

  return getTierFromElo(bot.elo).tierNum;
}

/**
 * Tìm Bậc Rank (AI DNA) đang bị thiếu hụt số lượng Bot so với định mức TIER_DISTRIBUTION.
 * Quét toàn bộ bot hiện có trong hệ sinh thái, phân loại chính xác DNA của từng bot.
 * Duyệt từ Tier CAO (Tier 9 Boss) xuống Tier THẤP (Tier 1 Tân Thủ):
 * - Nếu Bậc nào chưa đủ số lượng quota theo kim tự tháp, trả về ngay Bậc đó để sinh bot mới mang DNA tương ứng.
 * - Khi Bậc đó đã đủ số lượng, tự động chuyển xuống bậc tiếp theo.
 */
export function findUnderfilledTier(activeBots: BotEntity[]): number {
  const currentCounts: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
  };

  for (const bot of activeBots) {
    if (bot.status === 'ACTIVE') {
      const dnaTier = getBotDnaTier(bot);
      currentCounts[dnaTier] = (currentCounts[dnaTier] || 0) + 1;
    }
  }

  // Duyệt từ đỉnh tháp (Tier 9) xuống đáy tháp (Tier 1) để tìm vị trí thiếu hụt cao nhất
  for (let tier = 9; tier >= 1; tier--) {
    const quota = ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION[tier] || 0;
    const current = currentCounts[tier] || 0;
    if (current < quota) {
      return tier;
    }
  }

  return 1;
}

/**
 * Sinh Tân Binh mới gia nhập sới bạc:
 * - KẾ THỪA TRỌN VẸN BỘ NÃO / AI DNA của Bậc Rank thiếu hụt (targetTier).
 * - XUẤT PHÁT ĐIỂM CHUẨN THỰC TẾ: Elo khởi điểm = 1.000 (±30) như mọi người chơi mới tạo tài khoản.
 * - VỐN KHỞI ĐIỂM = 50.000 Xu (như tài khoản mới gia nhập).
 * - Bot sẽ tự tham gia các bàn đấu, đánh thắng, tích lũy tiền và tự leo tháp Elo bằng chính thực lực đỉnh cao của nó!
 */
export function draftBotForTier(
  existingNames: Set<string>,
  targetTier: number
): BotEntity {
  const index = Math.floor(Math.random() * 1000);
  const tier = Math.min(9, Math.max(1, targetTier));
  
  // 1. Tạo bot mang đầy đủ bộ não / AI DNA của targetTier (Minimax, Bayesian, Nash, Lookahead...)
  const bot = createBotEntityFromDNA(tier, index, existingNames);

  // 2. Thiết lập Elo xuất phát điểm chuẩn 1.000 Elo (như người chơi thật mới tạo tài khoản)
  const eloOffset = Math.floor(Math.random() * 60) - 30; // 970 -> 1030
  bot.elo = ECONOMY_CONSTANTS.DEFAULT_STARTING_ELO + eloOffset;

  // 3. Cấp vốn xuất phát điểm 50.000 Xu (như người chơi mới nhận gói tân thủ)
  bot.coins = ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS;

  // 4. Danh hiệu & mô tả tự nhiên của đấu thủ mới gia nhập, không để lộ bậc ngầm
  bot.title = 'Tân Binh Giang Hồ';
  bot.description = 'Đấu thủ mới gia nhập sới bạc với 50.000 Xu, sẵn sàng thử sức tại các bàn đấu.';

  return bot;
}

/**
 * Hàm tương thích ngược: Sinh bot thay thế
 */
export function draftRookieBot(
  existingNames: Set<string>,
  targetTierNum: number = 1
): BotEntity {
  return draftBotForTier(existingNames, targetTierNum);
}
