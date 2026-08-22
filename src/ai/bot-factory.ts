import { BotConfig } from './types';

export const BOT_PERSONAS: Record<string, BotConfig> = {
  // ==========================================
  // TIER 1: TẬP SỰ / NHẬP MÔN (ELO 850 - 1000)
  // ==========================================
  BE_NAM: {
    id: 'BE_NAM',
    name: 'Bé Năm (Tập sự)',
    avatar: '🧒',
    tier: 'Tier 1: Tập Sự',
    elo: 850,
    description: 'Chơi ngây thơ hồn nhiên, có gì đánh nấy, không nhớ bài.',
    memoryDepth: 0.1,
    riskAppetite: 0.75,
    trapTendency: 0.0,
    baitingTendency: 0.0,
    antiLeaderAggression: 0.2,
    handPartitioningOptimality: 0.3,
    simulationLookahead: 0,
    mctsSimulations: 0
  },
  CU_TI: {
    id: 'CU_TI',
    name: 'Cu Tí (Ngây thơ)',
    avatar: '👶',
    tier: 'Tier 1: Tập Sự',
    elo: 900,
    description: 'Thích đánh bài lẻ loi, ít khi gom được sảnh dài.',
    memoryDepth: 0.15,
    riskAppetite: 0.85,
    trapTendency: 0.0,
    baitingTendency: 0.0,
    antiLeaderAggression: 0.25,
    handPartitioningOptimality: 0.35,
    simulationLookahead: 0,
    mctsSimulations: 0
  },
  UT_NHO: {
    id: 'UT_NHO',
    name: 'Út Nhỏ (Nhập môn)',
    avatar: '👧',
    tier: 'Tier 1: Tập Sự',
    elo: 950,
    description: 'Đánh cẩn thận nhưng hay quên bài đã đánh.',
    memoryDepth: 0.2,
    riskAppetite: 0.6,
    trapTendency: 0.1,
    baitingTendency: 0.0,
    antiLeaderAggression: 0.3,
    handPartitioningOptimality: 0.45,
    simulationLookahead: 0,
    mctsSimulations: 0
  },
  EM_BA: {
    id: 'EM_BA',
    name: 'Em Ba (Học việc)',
    avatar: '👦',
    tier: 'Tier 1: Tập Sự',
    elo: 1000,
    description: 'Bắt đầu biết giữ đôi, xả rác nhỏ trước.',
    memoryDepth: 0.25,
    riskAppetite: 0.7,
    trapTendency: 0.15,
    baitingTendency: 0.0,
    antiLeaderAggression: 0.4,
    handPartitioningOptimality: 0.5,
    simulationLookahead: 1,
    mctsSimulations: 0
  },

  // ==========================================
  // TIER 2: PHONG TRÀO / NGÀY TẾT (ELO 1150 - 1350)
  // ==========================================
  CHU_BAY: {
    id: 'CHU_BAY',
    name: 'Chú Bảy (Liều lĩnh)',
    avatar: '🤠',
    tier: 'Tier 2: Phong Trào',
    elo: 1150,
    description: 'Thích xả heo sớm tranh quyền, phong cách tất tay ngày Tết.',
    memoryDepth: 0.4,
    riskAppetite: 0.9,
    trapTendency: 0.2,
    baitingTendency: 0.1,
    antiLeaderAggression: 0.5,
    tempoControl: 0.3,
    handPartitioningOptimality: 0.55,
    simulationLookahead: 1,
    mctsSimulations: 0
  },
  BA_XI: {
    id: 'BA_XI',
    name: 'Anh Ba Xị (Máu lửa)',
    avatar: '🍻',
    tier: 'Tier 2: Phong Trào',
    elo: 1200,
    description: 'Đánh bài tốc chiến tốc thắng, có đôi là đè liền tay.',
    memoryDepth: 0.45,
    riskAppetite: 0.95,
    trapTendency: 0.25,
    baitingTendency: 0.15,
    antiLeaderAggression: 0.55,
    tempoControl: 0.35,
    handPartitioningOptimality: 0.55,
    simulationLookahead: 1,
    mctsSimulations: 0
  },
  TU_RUOU: {
    id: 'TU_RUOU',
    name: 'Cậu Tư Rượu (Tất tay)',
    avatar: '🛵',
    tier: 'Tier 2: Phong Trào',
    elo: 1250,
    description: 'Phong cách phóng khoáng, thích đè Heo bằng bộ to.',
    memoryDepth: 0.45,
    riskAppetite: 0.9,
    trapTendency: 0.3,
    baitingTendency: 0.2,
    antiLeaderAggression: 0.6,
    tempoControl: 0.35,
    handPartitioningOptimality: 0.6,
    simulationLookahead: 1,
    mctsSimulations: 0
  },
  NAM_XOM: {
    id: 'NAM_XOM',
    name: 'Bác Năm Xóm (Phong trào)',
    avatar: '🏡',
    tier: 'Tier 2: Phong Trào',
    elo: 1350,
    description: 'Chơi quen tay nhiều năm, giữ bài khá ổn định.',
    memoryDepth: 0.5,
    riskAppetite: 0.75,
    trapTendency: 0.35,
    baitingTendency: 0.25,
    antiLeaderAggression: 0.6,
    tempoControl: 0.4,
    handPartitioningOptimality: 0.6,
    simulationLookahead: 1,
    mctsSimulations: 0
  },

  // ==========================================
  // TIER 3: KINH NGHIỆM / GIÀ DƠ (ELO 1450 - 1650)
  // ==========================================
  BAC_TU: {
    id: 'BAC_TU',
    name: 'Bác Tư (Cẩn trọng)',
    avatar: '👴',
    tier: 'Tier 3: Kinh Nghiệm',
    elo: 1450,
    description: 'Giữ heo rất chặt, ưu tiên xả hết rác, kiên nhẫn rình bẫy hàng.',
    memoryDepth: 0.8,
    riskAppetite: 0.5,
    trapTendency: 0.6,
    baitingTendency: 0.5,
    antiLeaderAggression: 0.8,
    tempoControl: 0.65,
    damageControl: 0.7,
    handPartitioningOptimality: 0.85,
    simulationLookahead: 2,
    mctsSimulations: 0
  },
  CAU_UT: {
    id: 'CAU_UT',
    name: 'Cậu Út (Kẻ Gài Bẫy)',
    avatar: '🎭',
    tier: 'Tier 3: Kinh Nghiệm',
    elo: 1550,
    description: 'Chuyên gia ém hàng quý, thích đánh mồi Át/K để câu Heo đối thủ.',
    memoryDepth: 0.85,
    riskAppetite: 0.55,
    trapTendency: 0.7,
    baitingTendency: 0.85,
    antiLeaderAggression: 0.85,
    tempoControl: 0.7,
    damageControl: 0.65,
    handPartitioningOptimality: 0.85,
    simulationLookahead: 2,
    mctsSimulations: 0
  },
  CHI_TU: {
    id: 'CHI_TU',
    name: 'Chị Tư (Thợ Săn Heo)',
    avatar: '🏹',
    tier: 'Tier 3: Kinh Nghiệm',
    elo: 1600,
    description: 'Rất giỏi nhớ Heo, chỉ rình Heo Đỏ của đối thủ để xả bài đè chết.',
    memoryDepth: 0.9,
    riskAppetite: 0.6,
    trapTendency: 0.65,
    baitingTendency: 0.7,
    antiLeaderAggression: 0.85,
    tempoControl: 0.75,
    damageControl: 0.7,
    handPartitioningOptimality: 0.9,
    simulationLookahead: 2,
    mctsSimulations: 0
  },
  ANH_SAU: {
    id: 'ANH_SAU',
    name: 'Anh Sáu (Lão Luyện)',
    avatar: '🎣',
    tier: 'Tier 3: Kinh Nghiệm',
    elo: 1650,
    description: 'Lối đánh điềm đạm, biết nhử đối thủ ra bài lớn trước.',
    memoryDepth: 0.88,
    riskAppetite: 0.6,
    trapTendency: 0.65,
    baitingTendency: 0.65,
    antiLeaderAggression: 0.85,
    tempoControl: 0.75,
    damageControl: 0.7,
    handPartitioningOptimality: 0.9,
    simulationLookahead: 2,
    mctsSimulations: 0
  },

  // ==========================================
  // TIER 4: CAO THỦ / BÁN CHUYÊN (ELO 1750 - 1950)
  // ==========================================
  CO_BA: {
    id: 'CO_BA',
    name: 'Cô Ba (Thần Bài)',
    avatar: '👑',
    tier: 'Tier 4: Cao Thủ',
    elo: 1750,
    description: 'Đếm bài chuẩn xác 100%, tính toán xác suất, chuyên gia săn heo.',
    memoryDepth: 1.0,
    riskAppetite: 0.65,
    trapTendency: 0.5,
    baitingTendency: 0.6,
    antiLeaderAggression: 0.95,
    tempoControl: 0.85,
    damageControl: 0.8,
    handPartitioningOptimality: 1.0,
    simulationLookahead: 3,
    mctsSimulations: 15
  },
  ANH_HAI: {
    id: 'ANH_HAI',
    name: 'Anh Hai (Chiến Thuật)',
    avatar: '👨‍🏫',
    tier: 'Tier 4: Cao Thủ',
    elo: 1850,
    description: 'Tính toán số nhịp về bài tối ưu, chuyên gia nhốt đối thủ gần về nhất.',
    memoryDepth: 1.0,
    riskAppetite: 0.7,
    trapTendency: 0.5,
    baitingTendency: 0.55,
    antiLeaderAggression: 1.0,
    tempoControl: 0.9,
    damageControl: 0.85,
    handPartitioningOptimality: 1.0,
    simulationLookahead: 4,
    mctsSimulations: 20
  },
  THAY_BA: {
    id: 'THAY_BA',
    name: 'Thầy Giáo Ba (Toán Học)',
    avatar: '🧠',
    tier: 'Tier 4: Cao Thủ',
    elo: 1900,
    description: 'Mô hình hóa thế bài bằng xác suất, không bao giờ đánh thừa lá.',
    memoryDepth: 1.0,
    riskAppetite: 0.7,
    trapTendency: 0.5,
    baitingTendency: 0.6,
    antiLeaderAggression: 1.0,
    tempoControl: 0.9,
    damageControl: 0.85,
    handPartitioningOptimality: 1.0,
    simulationLookahead: 4,
    mctsSimulations: 20
  },
  BA_SON: {
    id: 'BA_SON',
    name: 'Đại Gia Ba Son (Ép Nhịp)',
    avatar: '💼',
    tier: 'Tier 4: Cao Thủ',
    elo: 1950,
    description: 'Kiểm soát nhịp độ bàn chơi, ép đối thủ xả bài to đúng kế hoạch.',
    memoryDepth: 1.0,
    riskAppetite: 0.75,
    trapTendency: 0.55,
    baitingTendency: 0.6,
    antiLeaderAggression: 1.0,
    tempoControl: 0.95,
    damageControl: 0.85,
    handPartitioningOptimality: 1.0,
    simulationLookahead: 4,
    mctsSimulations: 20
  },

  // ==========================================
  // TIER 5: ĐẠI CAO THỦ / THẦN BÀI TỐI THƯỢNG (ELO 2050 - 2500)
  // ==========================================
  BA_NAM: {
    id: 'BA_NAM',
    name: 'Bà Năm (Hổ Báo Cực Hạn)',
    avatar: '🦁',
    tier: 'Tier 5: Thần Bài',
    elo: 2050,
    description: 'Có bài to là đè liền tay, thích áp đảo thế trận liên tục cướp cái.',
    memoryDepth: 0.95,
    riskAppetite: 0.85,
    trapTendency: 0.5,
    baitingTendency: 0.5,
    antiLeaderAggression: 1.0,
    tempoControl: 0.95,
    damageControl: 0.85,
    handPartitioningOptimality: 1.0,
    simulationLookahead: 4,
    mctsSimulations: 25
  },
  TRUM_SONG: {
    id: 'TRUM_SONG',
    name: 'Trùm Sòng Bạc (Nhìn Thấu)',
    avatar: '🎩',
    tier: 'Tier 5: Thần Bài',
    elo: 2150,
    description: 'Đoán chính xác 95% bài đối thủ, khai thác triệt để mọi điểm mù.',
    memoryDepth: 1.0,
    riskAppetite: 0.7,
    trapTendency: 0.55,
    baitingTendency: 0.6,
    antiLeaderAggression: 1.0,
    tempoControl: 1.0,
    damageControl: 0.95,
    handPartitioningOptimality: 1.0,
    simulationLookahead: 4,
    mctsSimulations: 25
  },
  CO_SAU: {
    id: 'CO_SAU',
    name: 'Cô Sáu (Thần Bài Tối Thượng)',
    avatar: '👑',
    tier: 'Tier 5: Thần Bài',
    elo: 2300,
    description: 'Chế độ Max Cấu Hình: Chạy mô phỏng Monte Carlo MCTS, kiểm soát nhịp độ, bẫy Heo hoàn hảo.',
    memoryDepth: 1.0,
    riskAppetite: 0.7,
    trapTendency: 0.55,
    baitingTendency: 0.6,
    antiLeaderAggression: 1.0,
    tempoControl: 1.0,
    damageControl: 1.0,
    mctsSimulations: 30,
    handPartitioningOptimality: 1.0,
    simulationLookahead: 4
  },
  ALPHA_TL: {
    id: 'ALPHA_TL',
    name: 'Alpha-Tiến Lên (Siêu Trí Tuệ)',
    avatar: '🤖',
    tier: 'Tier 5: Thần Bài',
    elo: 2500,
    description: 'Trí tuệ nhân tạo tối cao: Mô phỏng Monte Carlo, tìm đường về đích hoàn hảo.',
    memoryDepth: 1.0,
    riskAppetite: 0.75,
    trapTendency: 0.55,
    baitingTendency: 0.6,
    antiLeaderAggression: 1.0,
    tempoControl: 1.0,
    damageControl: 1.0,
    mctsSimulations: 30,
    handPartitioningOptimality: 1.0,
    simulationLookahead: 4
  }
};

export function getBotConfig(id: string, customOverrides?: Partial<BotConfig>): BotConfig {
  const base = BOT_PERSONAS[id] || BOT_PERSONAS.CHU_BAY;
  if (!customOverrides) return base;
  return {
    ...base,
    ...customOverrides
  };
}

export function createCustomBotConfig(
  baseId: string,
  overrides: Partial<BotConfig>
): BotConfig {
  const base = BOT_PERSONAS[baseId] || BOT_PERSONAS.CHU_BAY;
  return {
    ...base,
    ...overrides
  };
}

export function getAllBotConfigs(): BotConfig[] {
  return Object.values(BOT_PERSONAS);
}
