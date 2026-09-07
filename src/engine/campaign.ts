import { BOT_PERSONAS } from '../ai/bot-factory';
import { BotConfig } from '../ai/types';
import { BotEntity, getTierFromElo } from './ecosystem/ecosystem-types';

export interface CampaignBotConfig extends BotConfig {
  id: string;
  name: string;
  avatar: string;
  description: string;
  elo: number;
}

export interface CampaignChapter {
  id: number;
  name: string;
  subtitle: string;
  venueName: string;
  icon: string;
  backgroundTheme: string;
  description: string;
  requiredWins: number;
  betAmount: number;
  rewardCoins: number;
  rewardTitle: string | null;
  bots: readonly CampaignBotConfig[];
  specialRuleDescription: string | null;
}

export const CAMPAIGN_CHAPTERS: readonly CampaignChapter[] = Object.freeze([
  Object.freeze({
    id: 1,
    name: 'Chương 1',
    subtitle: 'Nhập Môn Xóm Nhỏ',
    venueName: 'Sới Bạc Cây Đa',
    icon: '🏡',
    backgroundTheme: 'from-amber-900/60 to-emerald-950/80',
    description: 'Bắt đầu cuộc hành trình từ sới bạc bình dân trong xóm. Đối đầu với các tay chơi tân thủ.',
    requiredWins: 2,
    betAmount: 500,
    rewardCoins: 10000,
    rewardTitle: 'Tân Thủ Xuất Sắc',
    bots: Object.freeze([
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_700, id: 'BOT_ELO_700_TI_CHUOT', name: 'Tí Chuột', avatar: '🐭', elo: 700 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_750, id: 'BOT_ELO_750_TEO_BO_RAO', name: 'Tèo Bờ Rào', avatar: '👦', elo: 750 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_850, id: 'BOT_ELO_850_BAC_BA', name: 'Bác Ba', avatar: '👴', elo: 850 })
    ]),
    specialRuleDescription: 'Thắng tích lũy 2 ván để mở khóa chương tiếp theo.'
  }),
  Object.freeze({
    id: 2,
    name: 'Chương 2',
    subtitle: 'Khói Lửa Bến Xe',
    venueName: 'Quán Nhậu Bến Xe Miền Tây',
    icon: '🍻',
    backgroundTheme: 'from-orange-950/80 to-red-950/90',
    description: 'Các tay chơi tập sự thích chặt chém liều lĩnh và xả Heo tốc chiến tốc thắng.',
    requiredWins: 3,
    betAmount: 2000,
    rewardCoins: 35000,
    rewardTitle: 'Anh Hùng Bến Xe',
    bots: Object.freeze([
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_950, id: 'BOT_ELO_950_BAY_XE_LOI', name: 'Bảy Xe Lôi', avatar: '🛺', elo: 950 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_1000, id: 'BOT_ELO_1000_NAM_XICH_LO', name: 'Năm Xích Lô', avatar: '🚴', elo: 1000 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_1150, id: 'BOT_ELO_1150_BA_GAC', name: 'Ba Gác', avatar: '🛵', elo: 1150 })
    ]),
    specialRuleDescription: 'Thắng 3 ván trước các tay chơi liều lĩnh bậc nhất bến xe.'
  }),
  Object.freeze({
    id: 3,
    name: 'Chương 3',
    subtitle: 'Bàn Cờ Quán Trà',
    venueName: 'Quán Trà Lão Tướng',
    icon: '🍵',
    backgroundTheme: 'from-yellow-950/80 to-stone-900/90',
    description: 'Các tay chơi lành nghề sừng sỏ bắt đầu biết gom bài, gài bẫy và phối hợp nhịp nhàng.',
    requiredWins: 3,
    betAmount: 8000,
    rewardCoins: 120000,
    rewardTitle: 'Bậc Thầy Nhớ Bài',
    bots: Object.freeze([
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_1250, id: 'BOT_ELO_1250_CHU_TU_CO', name: 'Chú Tư Cờ', avatar: '🍵', elo: 1250 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_1300, id: 'BOT_ELO_1300_REX_BUI_DOI', name: 'Rex Bụi Đời', avatar: '🤠', elo: 1300 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_1600, id: 'BOT_ELO_1600_BAC_SAU', name: 'Bác Sáu Toán Học', avatar: '🧮', elo: 1600 })
    ]),
    specialRuleDescription: 'Thắng 3 ván trước các cao thủ chuyên đếm lá và bẫy Heo.'
  }),
  Object.freeze({
    id: 4,
    name: 'Chương 4',
    subtitle: 'Đêm Sài Thành Rực Lửa',
    venueName: 'Câu Lạc Bộ Sài Gòn',
    icon: '💎',
    backgroundTheme: 'from-purple-950/80 to-slate-950/90',
    description: 'Sân chơi của các cao thủ bán chuyên. Ém Heo rình chặt và áp dụng chiến thuật ép nhịp cờ tàn.',
    requiredWins: 3,
    betAmount: 30000,
    rewardCoins: 500000,
    rewardTitle: 'Cao Thủ Sài Thành',
    bots: Object.freeze([
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_1750, id: 'BOT_ELO_1750_THIEU_GIA_KEN', name: 'Thiếu Gia Ken', avatar: '💎', elo: 1750 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_1800, id: 'BOT_ELO_1800_SOPHIA', name: 'Sophia', avatar: '👸', elo: 1800 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_1950, id: 'BOT_ELO_1950_MADAM_RUBY', name: 'Madam Ruby', avatar: '💃', elo: 1950 })
    ]),
    specialRuleDescription: 'Thắng 3 ván trước các cao thủ kiểm soát nhịp độ bàn chơi.'
  }),
  Object.freeze({
    id: 5,
    name: 'Chương 5',
    subtitle: 'Đỉnh Cao Thần Bài',
    venueName: 'Đền Thờ Trí Tuệ Tối Thượng',
    icon: '👑',
    backgroundTheme: 'from-amber-950 via-rose-950 to-black',
    description: 'Trận chiến Chung Kết Vĩ Đại: Đối đầu trực diện Tam Đại Thần Bài và Siêu Trí Tuệ Boss Alpha Mind với Minimax Endgame Solver và MCTS sâu.',
    requiredWins: 4,
    betAmount: 150000,
    rewardCoins: 3000000,
    rewardTitle: 'Bá Chủ Thần Bài Tối Thượng',
    bots: Object.freeze([
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_2300, id: 'BOT_ELO_2300_PHANTOM_APEX', name: 'Phantom Apex', avatar: '🎭', elo: 2300 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_2750, id: 'BOT_ELO_2750_CHRONOS', name: 'Chronos Bất Tử', avatar: '⏳', elo: 2750 }),
      Object.freeze({ ...BOT_PERSONAS.BOT_ELO_3200, id: 'BOT_ELO_3200_ALPHA_MIND', name: 'Alpha Mind', avatar: '🧠', elo: 3200 })
    ]),
    specialRuleDescription: 'Đánh bại Tam Đại Cao Thủ Thần Bài để bước lên Ngai Vàng Bá Chủ Tiến Lên!'
  })
]);

/**
 * Entity State Lifecycle / Factory:
 * Chuyển đổi CampaignBotConfig sang thực thể BotEntity hoàn chỉnh.
 * Đảm bảo các invariants nghiệp vụ (name, avatar, description, stats) luôn đầy đủ,
 * không cho phép trạng thái khuyết thiếu hoặc dựa dẫm vào fallback ở tầng UI.
 */
export function createCampaignBotEntity(botConfig: CampaignBotConfig, ecosystemBots?: BotEntity[]): BotEntity {
  if (ecosystemBots) {
    const existing = ecosystemBots.find(b => b.id === botConfig.id || b.name === botConfig.name);
    if (existing) return existing;
  }

  const tierInfo = getTierFromElo(botConfig.elo);
  return {
    id: botConfig.id,
    dnaTier: tierInfo.tierNum,
    name: botConfig.name,
    avatar: botConfig.avatar,
    elo: botConfig.elo,
    coins: botConfig.elo * 150,
    description: botConfig.description,
    personalityTags: [
      tierInfo.label,
      botConfig.useMinimaxEndgame ? 'Già Rơ' : 'Chiến Thuật',
      botConfig.riskAppetite > 0.7 ? 'Liều Lĩnh' : 'Chặt Chẽ'
    ],
    title: `Trùm ${tierInfo.label}`,
    status: 'ACTIVE',
    activityStatus: 'IN_MATCH',
    createdAt: Date.now(),
    memoryDepth: botConfig.memoryDepth ?? 0.5,
    riskAppetite: botConfig.riskAppetite ?? 0.5,
    trapTendency: botConfig.trapTendency ?? 0.5,
    baitingTendency: botConfig.baitingTendency ?? 0.5,
    antiLeaderAggression: botConfig.antiLeaderAggression ?? 1.0,
    tempoControl: botConfig.tempoControl ?? 0.5,
    damageControl: botConfig.damageControl ?? 0.5,
    turnsToWinLookahead: botConfig.turnsToWinLookahead ?? 0.5,
    dynamicHandSacrifice: botConfig.dynamicHandSacrifice ?? 0.5,
    bombInferenceRate: botConfig.bombInferenceRate ?? 0.5,
    semiCooperativeCooperation: botConfig.semiCooperativeCooperation ?? 0.5,
    positionalAwareness: botConfig.positionalAwareness ?? 0.5,
    inMatchAdaptationRate: botConfig.inMatchAdaptationRate ?? 0.5,
    mctsSimulations: botConfig.mctsSimulations ?? 0,
    handPartitioningOptimality: botConfig.handPartitioningOptimality ?? 0.5,
    simulationLookahead: botConfig.simulationLookahead ?? 1,
    useMinimaxEndgame: botConfig.useMinimaxEndgame ?? false,
    useBayesianInference: botConfig.useBayesianInference ?? false,
    useDynamicRepartitioning: botConfig.useDynamicRepartitioning ?? false,
    currentStreak: 2,
    highestStreak: 6,
    stats: {
      gamesPlayed: 120,
      wins: 72,
      chopsDone: 35,
      congsGiven: 18,
      totalEarned: botConfig.elo * 600
    },
    headToHeadVsHuman: {
      games: 0,
      botWins: 0,
      humanWins: 0,
      netCoinsEarnedFromHuman: 0
    }
  };
}
