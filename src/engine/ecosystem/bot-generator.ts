import { BOT_PERSONAS, GLOBAL_BOT_NAMES, GLOBAL_NICKNAMES_BY_TIER, GLOBAL_AVATARS } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { ECOSYSTEM_CONSTANTS } from '../constants/ecosystem';
import { BotEntity } from './ecosystem-types';

/**
 * Danh sách base persona ID phân theo 5 Tier
 */
const TIER_DNA_KEYS: Record<number, string[]> = {
  1: ['BOT_ELO_850', 'BOT_ELO_900', 'BOT_ELO_950', 'BOT_ELO_1000'],
  2: ['BOT_ELO_1150', 'BOT_ELO_1200', 'BOT_ELO_1250', 'BOT_ELO_1350'],
  3: ['BOT_ELO_1450', 'BOT_ELO_1550', 'BOT_ELO_1600', 'BOT_ELO_1650'],
  4: ['BOT_ELO_1750', 'BOT_ELO_1850', 'BOT_ELO_1900', 'BOT_ELO_1950'],
  5: ['BOT_ELO_2050', 'BOT_ELO_2150', 'BOT_ELO_2300', 'BOT_ELO_2500']
};

const TIER_BADGES: Record<number, string> = {
  1: '🥉',
  2: '🥈',
  3: '🥇',
  4: '💎',
  5: '👑'
};

const TIER_NAMES: Record<number, string> = {
  1: 'Tập Sự',
  2: 'Phong Trào',
  3: 'Kinh Nghiệm',
  4: 'Cao Thủ',
  5: 'Thần Bài'
};

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
 * Sinh vốn ngân sách khởi điểm ngẫu nhiên cho Bot theo Tier
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
  const dnaKeys = TIER_DNA_KEYS[tierNum] || TIER_DNA_KEYS[2];
  const chosenDnaKey = dnaKeys[index % dnaKeys.length];
  const baseDna = BOT_PERSONAS[chosenDnaKey] || BOT_PERSONAS.BOT_ELO_1150;

  // Tìm tên độc nhất
  let name = '';
  let title = '';
  const titlePool = GLOBAL_NICKNAMES_BY_TIER[tierNum] || GLOBAL_NICKNAMES_BY_TIER[2];
  title = titlePool[Math.floor(Math.random() * titlePool.length)];

  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    const randomBaseName = GLOBAL_BOT_NAMES[Math.floor(Math.random() * GLOBAL_BOT_NAMES.length)];
    const candidate = `${randomBaseName} (${title})`;
    if (!usedNames.has(candidate)) {
      name = candidate;
      usedNames.add(candidate);
      break;
    }
  }

  if (!name) {
    name = `Player ${tierNum}-${index + 1} (${title})`;
  }

  // Chọn avatar ngẫu nhiên
  const avatar = GLOBAL_AVATARS[Math.floor(Math.random() * GLOBAL_AVATARS.length)] || '🤖';

  // Áp dụng Gaussian Jitter cho các chỉ số
  const eloOffset = Math.round((Math.random() - 0.5) * 60);
  const finalElo = Math.max(800, Math.min(2600, baseDna.elo + eloOffset));
  const riskAppetite = applyJitter(baseDna.riskAppetite);

  const config: BotConfig = {
    ...baseDna,
    id: `eco_bot_${tierNum}_${index + 1}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    avatar,
    elo: finalElo,
    tier: `Tier ${tierNum}: ${TIER_NAMES[tierNum]}`,
    description: `Bot ${TIER_NAMES[tierNum]} (Elo ${finalElo}). Lối đánh độc lập, cá tính riêng.`,
    memoryDepth: applyJitter(baseDna.memoryDepth),
    riskAppetite,
    trapTendency: applyJitter(baseDna.trapTendency),
    baitingTendency: applyJitter(baseDna.baitingTendency),
    antiLeaderAggression: 1.0, // Luôn giữ 1.0 vì độc lập và chống đối thủ sắp về nhất
    tempoControl: applyJitter(baseDna.tempoControl),
    damageControl: applyJitter(baseDna.damageControl),
    turnsToWinLookahead: applyJitter(baseDna.turnsToWinLookahead),
    dynamicHandSacrifice: applyJitter(baseDna.dynamicHandSacrifice),
    bombInferenceRate: applyJitter(baseDna.bombInferenceRate),
    semiCooperativeCooperation: baseDna.semiCooperativeCooperation,
    positionalAwareness: applyJitter(baseDna.positionalAwareness),
    inMatchAdaptationRate: applyJitter(baseDna.inMatchAdaptationRate),
    handPartitioningOptimality: applyJitter(baseDna.handPartitioningOptimality),
    simulationLookahead: baseDna.simulationLookahead,
    mctsSimulations: baseDna.mctsSimulations
  };

  const personalityTags = generatePersonalityTags(config);
  const coins = generateEcosystemBankroll(tierNum, riskAppetite);

  return {
    ...config,
    coins,
    tierNum,
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
    rankBadge: TIER_BADGES[tierNum] || '🥈',
    title
  };
}

/**
 * Khởi tạo toàn bộ 200 Bot ban đầu theo đúng tỉ lệ 5 Tiers
 */
export function generateInitial200Bots(): BotEntity[] {
  const bots: BotEntity[] = [];
  const usedNames = new Set<string>();

  for (let tier = 1; tier <= 5; tier++) {
    const count = ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION[tier] || 20;
    for (let i = 0; i < count; i++) {
      const bot = createBotEntityFromDNA(tier, i, usedNames);
      bots.push(bot);
    }
  }

  return bots;
}

/**
 * Sinh 1 Tân Binh mới thay thế khi có bot bị phá sản:
 * - Kế thừa bộ chỉ số AI (DNA/Skill attributes) tương ứng với Bậc Rank của Bot vừa bị đào thải (bankruptTierNum).
 * - Vị trí Elo được reset về mức khởi điểm (850 - 1000).
 * - Số tiền vốn (vàng) được cấp mức khởi tạo tân binh (Tier 1 Starting Bankroll: 3.000 - 6.000 xu).
 * - Bot sẽ bắt đầu từ Tier 1 (Tập Sự) và tự đánh, tích lũy tiền và leo lại rank bằng chính thực lực của nó.
 */
export function draftRookieBot(
  existingNames: Set<string>,
  bankruptTierNum: number = 1
): BotEntity {
  const index = Math.floor(Math.random() * 1000);
  const targetTier = Math.min(5, Math.max(1, bankruptTierNum));
  // Tạo bot kế thừa DNA của bậc vừa bị đào thải
  const rookie = createBotEntityFromDNA(targetTier, index, existingNames);

  // Reset Elo về mức khởi đầu (850 - 1000)
  rookie.elo = Math.floor(Math.random() * 150) + 850;

  // Cấp vốn khởi tạo tân binh (Tier 1: 3.000 - 6.000 xu)
  rookie.coins = generateEcosystemBankroll(1, rookie.riskAppetite);

  // Hiển thị ban đầu ở Bậc Tập sự để bot tự leo lại
  rookie.tierNum = 1;
  rookie.tier = 'Tier 1: Tập Sự';
  rookie.rankBadge = TIER_BADGES[1];
  rookie.title = targetTier >= 4 ? 'Thần Đồng Ẩn Danh' : targetTier >= 3 ? 'Ẩn Sĩ Giang Hồ' : 'Tân Binh';
  rookie.name = (rookie.name || 'Bot Tân Binh').replace(/\(.*?\)/, `(${rookie.title})`);
  rookie.description = targetTier >= 4
    ? 'Thiên tài bài bạc mang tư duy đỉnh cao, vừa gia nhập sới với số vốn tân binh để tự mình leo lên đỉnh vinh quang.'
    : targetTier >= 3
    ? 'Cao thủ ẩn dật bước vào sới với lối đánh lão luyện, bắt đầu hành trình gầy dựng lại cơ đồ từ những bàn đấu cơ bản.'
    : 'Tân binh mới gia nhập sới bạc với quyết tâm làm lại từ đầu.';

  return rookie;
}
