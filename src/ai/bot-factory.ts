import { BotConfig } from "./types";

type BotPersonaRaw = Omit<BotConfig, 'name' | 'avatar'> & { name?: string | null; avatar?: string | null };

const RAW_BOT_PERSONAS: Record<string, BotPersonaRaw> = {
  // ==========================================
  // TIER 1: TẬP SỰ / NOVICE (ELO 850 - 1000)
  // ==========================================
  BOT_ELO_850: {
    id: 'BOT_ELO_850',
    tier: 'Tier 1: Rookie',
    elo: 850,
    description: 'Chơi ngây thơ hồn nhiên, có bài gì nhỏ nhất đánh nấy, không nhớ bài.',
    memoryDepth: 0.1,
    riskAppetite: 0.8,
    trapTendency: 0.0,
    baitingTendency: 0.0,
    antiLeaderAggression: 1.0,
    tempoControl: 0.2,
    damageControl: 0.2,
    turnsToWinLookahead: 0.0,
    dynamicHandSacrifice: 0.0,
    bombInferenceRate: 0.0,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.0,
    inMatchAdaptationRate: 0.0,
    handPartitioningOptimality: 0.35,
    simulationLookahead: 0,
    mctsSimulations: 0
  },
  BOT_ELO_900: {
    id: 'BOT_ELO_900',
    tier: 'Tier 1: Rookie',
    elo: 900,
    description: 'Thích đánh bài lẻ loi, ít khi gom được sảnh dài.',
    memoryDepth: 0.15,
    riskAppetite: 0.85,
    trapTendency: 0.0,
    baitingTendency: 0.0,
    antiLeaderAggression: 1.0,
    tempoControl: 0.2,
    damageControl: 0.2,
    turnsToWinLookahead: 0.0,
    dynamicHandSacrifice: 0.0,
    bombInferenceRate: 0.0,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.0,
    inMatchAdaptationRate: 0.0,
    handPartitioningOptimality: 0.35,
    simulationLookahead: 0,
    mctsSimulations: 0
  },
  BOT_ELO_950: {
    id: 'BOT_ELO_950',
    tier: 'Tier 1: Rookie',
    elo: 950,
    description: 'Đánh cẩn thận nhưng hay quên bài đã đánh.',
    memoryDepth: 0.2,
    riskAppetite: 0.75,
    trapTendency: 0.1,
    baitingTendency: 0.0,
    antiLeaderAggression: 1.0,
    tempoControl: 0.25,
    damageControl: 0.25,
    turnsToWinLookahead: 0.0,
    dynamicHandSacrifice: 0.0,
    bombInferenceRate: 0.0,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.0,
    inMatchAdaptationRate: 0.0,
    handPartitioningOptimality: 0.4,
    simulationLookahead: 0,
    mctsSimulations: 0
  },
  BOT_ELO_1000: {
    id: 'BOT_ELO_1000',
    tier: 'Tier 1: Rookie',
    elo: 1000,
    description: 'Bắt đầu biết gom đôi và sảnh nhỏ.',
    memoryDepth: 0.25,
    riskAppetite: 0.75,
    trapTendency: 0.1,
    baitingTendency: 0.0,
    antiLeaderAggression: 1.0,
    tempoControl: 0.25,
    damageControl: 0.25,
    turnsToWinLookahead: 0.0,
    dynamicHandSacrifice: 0.0,
    bombInferenceRate: 0.0,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.0,
    inMatchAdaptationRate: 0.0,
    handPartitioningOptimality: 0.45,
    simulationLookahead: 0,
    mctsSimulations: 0
  },

  // ==========================================
  // TIER 2: PHONG TRÀO / CHALLENGER (ELO 1150 - 1350)
  // ==========================================
  BOT_ELO_1150: {
    id: 'BOT_ELO_1150',
    tier: 'Tier 2: Challenger',
    elo: 1150,
    description: 'Thích xả Heo lớn để giành quyền đi đầu sớm, hay bị chặt đè ngược.',
    memoryDepth: 0.4,
    riskAppetite: 0.75,
    trapTendency: 0.25,
    baitingTendency: 0.1,
    antiLeaderAggression: 1.0,
    tempoControl: 0.45,
    damageControl: 0.45,
    turnsToWinLookahead: 0.3,
    dynamicHandSacrifice: 0.4,
    bombInferenceRate: 0.0,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.3,
    inMatchAdaptationRate: 0.2,
    handPartitioningOptimality: 0.6,
    simulationLookahead: 1,
    mctsSimulations: 0
  },
  BOT_ELO_1200: {
    id: 'BOT_ELO_1200',
    tier: 'Tier 2: Challenger',
    elo: 1200,
    description: 'Chơi ngẫu hứng, có bài là đè không cần tính toán lượt sau.',
    memoryDepth: 0.4,
    riskAppetite: 0.8,
    trapTendency: 0.2,
    baitingTendency: 0.1,
    antiLeaderAggression: 1.0,
    tempoControl: 0.45,
    damageControl: 0.45,
    turnsToWinLookahead: 0.3,
    dynamicHandSacrifice: 0.4,
    bombInferenceRate: 0.0,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.3,
    inMatchAdaptationRate: 0.2,
    handPartitioningOptimality: 0.6,
    simulationLookahead: 1,
    mctsSimulations: 0
  },
  BOT_ELO_1250: {
    id: 'BOT_ELO_1250',
    tier: 'Tier 2: Challenger',
    elo: 1250,
    description: 'Phong cách phóng khoáng, thích đè Heo bằng bộ to.',
    memoryDepth: 0.45,
    riskAppetite: 0.8,
    trapTendency: 0.3,
    baitingTendency: 0.15,
    antiLeaderAggression: 1.0,
    tempoControl: 0.5,
    damageControl: 0.5,
    turnsToWinLookahead: 0.3,
    dynamicHandSacrifice: 0.4,
    bombInferenceRate: 0.0,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.35,
    inMatchAdaptationRate: 0.25,
    handPartitioningOptimality: 0.6,
    simulationLookahead: 1,
    mctsSimulations: 0
  },
  BOT_ELO_1350: {
    id: 'BOT_ELO_1350',
    tier: 'Tier 2: Challenger',
    elo: 1350,
    description: 'Biết canh me lúc đối thủ sơ hở để xả rác.',
    memoryDepth: 0.5,
    riskAppetite: 0.75,
    trapTendency: 0.35,
    baitingTendency: 0.2,
    antiLeaderAggression: 1.0,
    tempoControl: 0.55,
    damageControl: 0.55,
    turnsToWinLookahead: 0.35,
    dynamicHandSacrifice: 0.45,
    bombInferenceRate: 0.1,
    semiCooperativeCooperation: 0.0,
    positionalAwareness: 0.35,
    inMatchAdaptationRate: 0.25,
    handPartitioningOptimality: 0.6,
    simulationLookahead: 1,
    mctsSimulations: 0
  },

  // ==========================================
  // TIER 3: KINH NGHIỆM / VETERAN (ELO 1450 - 1650)
  // ==========================================
  BOT_ELO_1450: {
    id: 'BOT_ELO_1450',
    tier: 'Tier 3: Veteran',
    elo: 1450,
    description: 'Giữ Heo rất chặt, ưu tiên xả hết rác, kiên nhẫn rình bẫy Hàng.',
    memoryDepth: 0.75,
    riskAppetite: 0.6,
    trapTendency: 0.5,
    baitingTendency: 0.4,
    antiLeaderAggression: 1.0,
    tempoControl: 0.7,
    damageControl: 0.7,
    turnsToWinLookahead: 0.6,
    dynamicHandSacrifice: 0.65,
    bombInferenceRate: 0.5,
    semiCooperativeCooperation: 0.5,
    positionalAwareness: 0.6,
    inMatchAdaptationRate: 0.6,
    handPartitioningOptimality: 0.75,
    simulationLookahead: 2,
    mctsSimulations: 0
  },
  BOT_ELO_1550: {
    id: 'BOT_ELO_1550',
    tier: 'Tier 3: Veteran',
    elo: 1550,
    description: 'Chuyên gia ém Hàng quý, thích đánh mồi Át/K để câu Heo đối thủ.',
    memoryDepth: 0.8,
    riskAppetite: 0.6,
    trapTendency: 0.6,
    baitingTendency: 0.45,
    antiLeaderAggression: 1.0,
    tempoControl: 0.75,
    damageControl: 0.7,
    turnsToWinLookahead: 0.65,
    dynamicHandSacrifice: 0.7,
    bombInferenceRate: 0.5,
    semiCooperativeCooperation: 0.5,
    positionalAwareness: 0.65,
    inMatchAdaptationRate: 0.6,
    handPartitioningOptimality: 0.75,
    simulationLookahead: 2,
    mctsSimulations: 0
  },
  BOT_ELO_1600: {
    id: 'BOT_ELO_1600',
    tier: 'Tier 3: Veteran',
    elo: 1600,
    description: 'Rất giỏi nhớ Heo, chỉ rình Heo Đỏ của đối thủ để xả bài đè chết.',
    memoryDepth: 0.85,
    riskAppetite: 0.65,
    trapTendency: 0.6,
    baitingTendency: 0.5,
    antiLeaderAggression: 1.0,
    tempoControl: 0.75,
    damageControl: 0.75,
    turnsToWinLookahead: 0.65,
    dynamicHandSacrifice: 0.7,
    bombInferenceRate: 0.55,
    semiCooperativeCooperation: 0.5,
    positionalAwareness: 0.65,
    inMatchAdaptationRate: 0.65,
    handPartitioningOptimality: 0.78,
    simulationLookahead: 2,
    mctsSimulations: 0
  },
  BOT_ELO_1650: {
    id: 'BOT_ELO_1650',
    tier: 'Tier 3: Veteran',
    elo: 1650,
    description: 'Lối đánh điềm đạm, biết nhử đối thủ ra bài lớn trước.',
    memoryDepth: 0.85,
    riskAppetite: 0.65,
    trapTendency: 0.6,
    baitingTendency: 0.5,
    antiLeaderAggression: 1.0,
    tempoControl: 0.8,
    damageControl: 0.75,
    turnsToWinLookahead: 0.7,
    dynamicHandSacrifice: 0.7,
    bombInferenceRate: 0.6,
    semiCooperativeCooperation: 0.5,
    positionalAwareness: 0.68,
    inMatchAdaptationRate: 0.65,
    handPartitioningOptimality: 0.78,
    simulationLookahead: 2,
    mctsSimulations: 0
  },

  // ==========================================
  // TIER 4: CAO THỦ / MASTER (ELO 1750 - 1950)
  // ==========================================
  BOT_ELO_1750: {
    id: 'BOT_ELO_1750',
    tier: 'Tier 4: Master',
    elo: 1750,
    description: 'Đếm bài chuẩn xác 100%, tính toán xác suất, chuyên gia săn Heo.',
    memoryDepth: 0.95,
    riskAppetite: 0.65,
    trapTendency: 0.55,
    baitingTendency: 0.75,
    antiLeaderAggression: 1.0,
    tempoControl: 0.85,
    damageControl: 0.85,
    turnsToWinLookahead: 0.85,
    dynamicHandSacrifice: 0.88,
    bombInferenceRate: 0.85,
    semiCooperativeCooperation: 0.8,
    positionalAwareness: 0.85,
    inMatchAdaptationRate: 0.85,
    handPartitioningOptimality: 0.85,
    simulationLookahead: 3,
    mctsSimulations: 0
  },
  BOT_ELO_1850: {
    id: 'BOT_ELO_1850',
    tier: 'Tier 4: Master',
    elo: 1850,
    description: 'Tính toán số nhịp về bài tối ưu, chuyên gia nhốt đối thủ gần về nhất.',
    memoryDepth: 0.95,
    riskAppetite: 0.7,
    trapTendency: 0.55,
    baitingTendency: 0.8,
    antiLeaderAggression: 1.0,
    tempoControl: 0.88,
    damageControl: 0.88,
    turnsToWinLookahead: 0.85,
    dynamicHandSacrifice: 0.9,
    bombInferenceRate: 0.85,
    semiCooperativeCooperation: 0.8,
    positionalAwareness: 0.88,
    inMatchAdaptationRate: 0.85,
    handPartitioningOptimality: 0.85,
    simulationLookahead: 3,
    mctsSimulations: 0
  },
  BOT_ELO_1900: {
    id: 'BOT_ELO_1900',
    tier: 'Tier 4: Master',
    elo: 1900,
    description: 'Mô hình hóa thế bài bằng xác suất, không bao giờ đánh thừa lá.',
    memoryDepth: 0.95,
    riskAppetite: 0.7,
    trapTendency: 0.55,
    baitingTendency: 0.8,
    antiLeaderAggression: 1.0,
    tempoControl: 0.88,
    damageControl: 0.88,
    turnsToWinLookahead: 0.85,
    dynamicHandSacrifice: 0.9,
    bombInferenceRate: 0.85,
    semiCooperativeCooperation: 0.8,
    positionalAwareness: 0.88,
    inMatchAdaptationRate: 0.88,
    handPartitioningOptimality: 0.85,
    simulationLookahead: 3,
    mctsSimulations: 0
  },
  BOT_ELO_1950: {
    id: 'BOT_ELO_1950',
    tier: 'Tier 4: Master',
    elo: 1950,
    description: 'Kiểm soát nhịp độ bàn chơi, ép đối thủ xả bài to đúng kế hoạch.',
    memoryDepth: 0.95,
    riskAppetite: 0.7,
    trapTendency: 0.55,
    baitingTendency: 0.8,
    antiLeaderAggression: 1.0,
    tempoControl: 0.9,
    damageControl: 0.9,
    turnsToWinLookahead: 0.9,
    dynamicHandSacrifice: 0.92,
    bombInferenceRate: 0.88,
    semiCooperativeCooperation: 0.8,
    positionalAwareness: 0.9,
    inMatchAdaptationRate: 0.9,
    handPartitioningOptimality: 0.85,
    simulationLookahead: 3,
    mctsSimulations: 0
  },

  // ==========================================
  // TIER 5: ĐẠI CAO THỦ / MYTHIC (ELO 2050 - 2500)
  // ==========================================
  BOT_ELO_2050: {
    id: 'BOT_ELO_2050',
    tier: 'Tier 5: Mythic',
    elo: 2050,
    description: 'Có bài to là đè liền tay, thích áp đảo thế trận liên tục cướp cái.',
    memoryDepth: 1.0,
    riskAppetite: 0.75,
    trapTendency: 0.6,
    baitingTendency: 0.9,
    antiLeaderAggression: 1.0,
    tempoControl: 0.95,
    damageControl: 0.95,
    turnsToWinLookahead: 0.95,
    dynamicHandSacrifice: 0.95,
    bombInferenceRate: 0.95,
    semiCooperativeCooperation: 1.0,
    positionalAwareness: 0.95,
    inMatchAdaptationRate: 0.95,
    handPartitioningOptimality: 0.9,
    simulationLookahead: 4,
    mctsSimulations: 0
  },
  BOT_ELO_2150: {
    id: 'BOT_ELO_2150',
    tier: 'Tier 5: Mythic',
    elo: 2150,
    description: 'Đoán chính xác 95% bài đối thủ, khai thác triệt để mọi điểm mù.',
    memoryDepth: 1.0,
    riskAppetite: 0.7,
    trapTendency: 0.6,
    baitingTendency: 0.95,
    antiLeaderAggression: 1.0,
    tempoControl: 0.98,
    damageControl: 0.98,
    turnsToWinLookahead: 1.0,
    dynamicHandSacrifice: 1.0,
    bombInferenceRate: 1.0,
    semiCooperativeCooperation: 1.0,
    positionalAwareness: 1.0,
    inMatchAdaptationRate: 1.0,
    handPartitioningOptimality: 0.9,
    simulationLookahead: 4,
    mctsSimulations: 0
  },
  BOT_ELO_2300: {
    id: 'BOT_ELO_2300',
    tier: 'Tier 5: Mythic',
    elo: 2300,
    description: 'Chế độ Max Cấu Hình: Kiểm soát nhịp độ, bẫy Heo hoàn hảo, không để lại sơ hở.',
    memoryDepth: 1.0,
    riskAppetite: 0.7,
    trapTendency: 0.65,
    baitingTendency: 1.0,
    antiLeaderAggression: 1.0,
    tempoControl: 1.0,
    damageControl: 1.0,
    turnsToWinLookahead: 1.0,
    dynamicHandSacrifice: 1.0,
    bombInferenceRate: 1.0,
    semiCooperativeCooperation: 1.0,
    positionalAwareness: 1.0,
    inMatchAdaptationRate: 1.0,
    handPartitioningOptimality: 0.88,
    simulationLookahead: 4,
    mctsSimulations: 0
  },
  BOT_ELO_2500: {
    id: 'BOT_ELO_2500',
    tier: 'Tier 5: Mythic',
    elo: 2500,
    description: 'Trí tuệ nhân tạo tối cao: Đọc vị đối thủ, giữ bài bọc lót hoàn hảo, dứt điểm cờ tàn chuẩn xác.',
    memoryDepth: 1.0,
    riskAppetite: 0.7,
    trapTendency: 0.7,
    baitingTendency: 1.0,
    antiLeaderAggression: 1.0,
    tempoControl: 1.0,
    damageControl: 1.0,
    turnsToWinLookahead: 1.0,
    dynamicHandSacrifice: 1.0,
    bombInferenceRate: 1.0,
    semiCooperativeCooperation: 1.0,
    positionalAwareness: 1.0,
    inMatchAdaptationRate: 1.0,
    handPartitioningOptimality: 0.88,
    simulationLookahead: 4,
    mctsSimulations: 0
  }
};

export const BOT_PERSONAS: Record<string, BotConfig> = Object.fromEntries(
  Object.entries(RAW_BOT_PERSONAS).map(([k, v]) => [
    k,
    { name: null, avatar: null, ...v }
  ])
);

export function getBotConfig(id: string, customOverrides?: Partial<BotConfig>): BotConfig {
  let baseKey = id;
  if (id && id.startsWith('dyn_')) {
    const match = id.match(/BOT_ELO_\d+/);
    if (match) {
      baseKey = match[0];
    }
  }
  const base = BOT_PERSONAS[baseKey] || BOT_PERSONAS[id] || BOT_PERSONAS.BOT_ELO_1150;
  return {
    ...base,
    ...(customOverrides || {})
  };
}

export function createCustomBotConfig(
  baseId: string,
  overrides: Partial<BotConfig>
): BotConfig {
  let baseKey = baseId;
  if (baseId && baseId.startsWith('dyn_')) {
    const match = baseId.match(/BOT_ELO_\d+/);
    if (match) {
      baseKey = match[0];
    }
  }
  const base = BOT_PERSONAS[baseKey] || BOT_PERSONAS[baseId] || BOT_PERSONAS.BOT_ELO_1150;
  return {
    ...base,
    ...overrides
  };
}

export function getAllBotConfigs(): BotConfig[] {
  return Object.values(BOT_PERSONAS);
}

// ============================================================================
// DYNAMIC RANDOM BOT IDENTITY GENERATOR (GLOBAL GAMER / ESPORTS IDENTITY)
// ============================================================================

export const GLOBAL_BOT_NAMES = [
  // Việt Nam (Latin ABC)
  'Nam Phong', 'Tuan Kiet', 'Minh Triet', 'Hoang Long', 'Bao Tram', 'Khanh Linh', 'Hai Dang', 'Quoc Bao', 'Duy Anh', 'Thanh Dat',
  'Tien Dung', 'Quang Hai', 'Minh Vuong', 'Trong Hoang', 'Huu Thang', 'Viet Anh', 'Xuan Truong', 'Cong Phuong', 'Van Toan', 'Dinh Trong',
  'Duc Huy', 'Van Lam', 'Hong Duy', 'Van Duc', 'Tuan Anh', 'Tan Tai', 'Thanh Chung', 'Viet Hung', 'Ngoc Hai', 'Duy Manh',
  'Bao Long', 'Gia Bao', 'Minh Khoi', 'Duc Phuc', 'Hoang Nam', 'Thien An', 'Dang Khoa', 'Bao Khang', 'Phuc Thinh', 'Tan Phat',
  'Hai Yen', 'Thu Thao', 'Bich Phuong', 'Kim Ngan', 'Thanh Huong', 'Mai Anh', 'Thuy Linh', 'Yen Nhi', 'Minh Chau', 'Phuong Linh',

  // Anh, Mỹ, Úc, Canada (English / Anglo)
  'Alexander', 'Oliver', 'Charlotte', 'Benjamin', 'Lucas', 'Ethan', 'Evelyn', 'Liam', 'Noah', 'James',
  'Mason', 'Logan', 'Emma', 'Sophia', 'Jackson', 'Aiden', 'Henry', 'Sebastian', 'Jack', 'Samuel',
  'Matthew', 'Daniel', 'Anthony', 'David', 'Chloe', 'Grace', 'Harper', 'Victoria', 'Zoe', 'Carter',
  'Wyatt', 'Dylan', 'Luke', 'Gabriel', 'Owen', 'Grayson', 'Nathan', 'Caleb', 'Isaac', 'Hunter',
  'Christian', 'Andrew', 'Connor', 'Eli', 'Aaron', 'Landon', 'Jonathan', 'Nolan', 'Nicholas', 'Austin',
  'Amelia', 'Hannah', 'Audrey', 'Bella', 'Claire', 'Skyler', 'Hazel', 'Lucy', 'Stella', 'Violet',

  // Tây Ban Nha, Bồ Đào Nha, Nam Mỹ (Hispanic / Latino)
  'Mateo', 'Santiago', 'Leonardo', 'Rodrigo', 'Thiago', 'Diego', 'Valentina', 'Isabella', 'Camila', 'Sofia',
  'Carlos', 'Alvaro', 'Fernando', 'Rafael', 'Javier', 'Gonzalo', 'Alejandro', 'Manuel', 'Lorenzo', 'Sergio',
  'Elena', 'Carmen', 'Pablo', 'Andres', 'Joaquin', 'Emiliano', 'Matias', 'Nicolas', 'Felipe', 'Bautista',
  'Lucia', 'Martina', 'Catalina', 'Mariana', 'Julieta', 'Valeria', 'Daniela', 'Fernanda', 'Paula', 'Renata',

  // Pháp, Ý, Đức, Bỉ, Thụy Sĩ (Western Europe)
  'Felix', 'Max', 'Lukas', 'Julian', 'Marco', 'Matteo', 'Alessandro', 'Hugo', 'Louis', 'Arthur',
  'Jonas', 'Paul', 'Leon', 'Finn', 'Elias', 'Fabian', 'Moritz', 'Tobias', 'Florian', 'Stefan',
  'Julien', 'Antoine', 'Maxime', 'Clement', 'Valentin', 'Baptiste', 'Romain', 'Adrien', 'Corentin', 'Guillaume',
  'Luca', 'Davide', 'Federico', 'Simone', 'Andrea', 'Gabriele', 'Tommaso', 'Lorenzo', 'Edoardo', 'Riccardo',
  'Clara', 'Camille', 'Lea', 'Manon', 'Chloe', 'Giulia', 'Chiara', 'Francesca', 'Greta', 'Laura',

  // Bắc Âu & Đông Âu Latin (Scandinavian & Slavic Latinized)
  'Lars', 'Henrik', 'Magnus', 'Astrid', 'Freja', 'Gustav', 'Erik', 'Viktor', 'Oskar', 'Axel',
  'Arvid', 'Nils', 'Kasper', 'Soren', 'Mikkel', 'Mathias', 'Oliver', 'Emil', 'Rasmus', 'Frederik',
  'Stanislav', 'Milan', 'Tomas', 'Marek', 'Jan', 'Petr', 'Jiri', 'Pavel', 'Martin', 'Michal',
  'Elena', 'Karin', 'Ingrid', 'Maja', 'Linnea', 'Klara', 'Petra', 'Zuzana', 'Tereza', 'Lenka',

  // Nhật Bản & Hàn Quốc (Phiên âm Romaji / Latin ABC)
  'Kenji', 'Ren', 'Daiki', 'Kazuki', 'Haruto', 'Ryuto', 'Minho', 'Jun', 'Taehyun', 'Seung',
  'Akira', 'Shin', 'Takashi', 'Hiro', 'Yuto', 'Sota', 'Kaito', 'Jin', 'Hyun', 'Dong',
  'Kenta', 'Shota', 'Hayato', 'Riku', 'Taiki', 'Tsubasa', 'Naoki', 'Yuma', 'Takumi', 'Keita',
  'Jiwon', 'Minjun', 'Seojun', 'Dohyun', 'Yejun', 'Siwoo', 'Haeseong', 'Kyungsoo', 'Sungmin', 'Jaehyuk',
  'Aoi', 'Hina', 'Yui', 'Sakura', 'Rin', 'Sora', 'Mei', 'Nanami', 'Eunji', 'Sujin',

  // Biệt hiệu Gamer / Esports Quốc tế
  'Shadow', 'Viper', 'Phoenix', 'Blaze', 'Cyber', 'Titan', 'Ghost', 'Knight', 'Raven', 'Frost',
  'Storm', 'Zack', 'Drake', 'Ace', 'Kuro', 'Zane', 'Rex', 'Luna', 'Nova', 'Oscar',
  'Vanguard', 'Apex', 'Matrix', 'Nexus', 'Pulse', 'Rogue', 'Specter', 'Striker', 'Phantom', 'Zenith'
];

export const GLOBAL_NICKNAMES_BY_TIER: Record<number, string[]> = {
  1: ['Rookie', 'Novice', 'Apprentice', 'Newbie', 'Starter', 'Junior', 'Cadet'],
  2: ['Challenger', 'Striker', 'Wildcard', 'Blitzer', 'Gambit', 'Rebel', 'Fighter'],
  3: ['Veteran', 'Tactician', 'Card Hunter', 'Strategist', 'Sniper', 'Sentinel', 'Tracker'],
  4: ['Grandmaster', 'Mind Reader', 'Predator', 'Pro Ace', 'Vanguard', 'Executioner', 'Warlock'],
  5: ['Mythic', 'Overlord', 'Supreme AI', 'Apex Legend', 'Immortal', 'Alpha Mind', 'Zero Defeat']
};

export const GLOBAL_AVATARS = [
  '🤠', '🧔', '👨', '👩', '👧', '🧒', '👶', '👴', '👵', '🧓', 
  '🕶️', '🎩', '👑', '🧠', '💼', '🏹', '🎣', '🤖', '🎭', '🥋', 
  '🎲', '⚡', '🌪️', '🔥', '🛡️', '⚔️', '💎', '👓'
];

export const TIER_BASE_PERSONAS: Record<number, string[]> = {
  1: ['BOT_ELO_850', 'BOT_ELO_900', 'BOT_ELO_950', 'BOT_ELO_1000'],
  2: ['BOT_ELO_1150', 'BOT_ELO_1200', 'BOT_ELO_1250', 'BOT_ELO_1350'],
  3: ['BOT_ELO_1450', 'BOT_ELO_1550', 'BOT_ELO_1600', 'BOT_ELO_1650'],
  4: ['BOT_ELO_1750', 'BOT_ELO_1850', 'BOT_ELO_1900', 'BOT_ELO_1950'],
  5: ['BOT_ELO_2050', 'BOT_ELO_2150', 'BOT_ELO_2300', 'BOT_ELO_2500']
};

/**
 * Sinh cấu hình Bot ngẫu nhiên chuẩn Quốc tế / Esports
 */
export function generateRandomBotConfig(
  tier: number = 2,
  options?: {
    excludeNames?: string[];
    excludeAvatars?: string[];
    baseId?: string;
  }
): BotConfig {
  const normalizedTier = Math.max(1, Math.min(5, tier));
  const candidateIds = TIER_BASE_PERSONAS[normalizedTier] || TIER_BASE_PERSONAS[2];
  const chosenBaseId = options?.baseId || candidateIds[Math.floor(Math.random() * candidateIds.length)];
  const baseConfig = BOT_PERSONAS[chosenBaseId] || BOT_PERSONAS.BOT_ELO_1150;

  const excludeNames = options?.excludeNames || [];
  const excludeAvatars = options?.excludeAvatars || [];

  // Sinh Gamertag ngẫu nhiên chuẩn quốc tế
  let generatedName = '';
  let attempts = 0;
  while (attempts < 25) {
    attempts++;
    const name = GLOBAL_BOT_NAMES[Math.floor(Math.random() * GLOBAL_BOT_NAMES.length)];
    const titlePool = GLOBAL_NICKNAMES_BY_TIER[normalizedTier] || GLOBAL_NICKNAMES_BY_TIER[2];
    const title = titlePool[Math.floor(Math.random() * titlePool.length)];
    const candidateName = `${name} (${title})`;
    if (!excludeNames.includes(candidateName)) {
      generatedName = candidateName;
      break;
    }
  }
  if (!generatedName) {
    generatedName = `Player #${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  // Chọn Avatar phù hợp không trùng tại bàn
  const availableAvatars = GLOBAL_AVATARS.filter(a => !excludeAvatars.includes(a));
  const chosenAvatar = availableAvatars.length > 0
    ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)]
    : (baseConfig.avatar || '🤖');

  return {
    ...baseConfig,
    id: `dyn_${chosenBaseId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: generatedName,
    avatar: chosenAvatar,
    description: `Đấu thủ Bậc ${baseConfig.tier}. Lối đánh chiến thuật, độc lập.`
  };
}

/**
 * Trả về nhãn định danh chuẩn hóa cho Persona (ví dụ: "Tier 1: Rookie (Elo 850)")
 */
export function getBotArchetypeLabel(config: BotConfig): string {
  return `${config.tier || 'Đấu Thủ'} (Elo ${config.elo || 1000})`;
}

/**
 * Sinh danh sách Bot đối thủ ngẫu nhiên cho một bàn đấu
 */
export function getRandomBotConfigsForTable(
  tiers: number[] = [1, 2, 3],
  count: number = 3
): BotConfig[] {
  const result: BotConfig[] = [];
  const usedNames: string[] = [];
  const usedAvatars: string[] = [];
  const usedPersonas: string[] = [];

  // Trộn ngẫu nhiên danh sách tiers để 3 ghế ngồi nhận các bậc rank khác nhau
  const shuffledTiers = [...tiers].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    const tier = shuffledTiers[i % shuffledTiers.length] || (Math.floor(Math.random() * 5) + 1);
    const candidatePool = (TIER_BASE_PERSONAS[tier] || TIER_BASE_PERSONAS[2]).filter(id => !usedPersonas.includes(id));
    const chosenBaseId = candidatePool.length > 0
      ? candidatePool[Math.floor(Math.random() * candidatePool.length)]
      : (TIER_BASE_PERSONAS[tier] || TIER_BASE_PERSONAS[2])[Math.floor(Math.random() * (TIER_BASE_PERSONAS[tier] || TIER_BASE_PERSONAS[2]).length)];

    usedPersonas.push(chosenBaseId);

    const bot = generateRandomBotConfig(tier, {
      excludeNames: usedNames,
      excludeAvatars: usedAvatars,
      baseId: chosenBaseId
    });
    result.push(bot);
    usedNames.push(bot.name || '');
    usedAvatars.push(bot.avatar || '🤖');
  }

  return result;
}

/**
 * Sinh số tiền vốn (Bankroll) khởi điểm tự nhiên, sống động cho Bot
 * dựa trên Bậc Elo, tính cách (Risk Appetite) và Mức cược bàn chơi
 */
export function generateRealisticBotBankroll(config: Partial<BotConfig>, betAmount: number = 100): number {
  const elo = config.elo || 1150;
  const effectiveBet = Math.max(50, betAmount);

  // Xác định bậc Tier của Bot (1 đến 5)
  let tier = 2;
  if (elo <= 1000) tier = 1;
  else if (elo <= 1350) tier = 2;
  else if (elo <= 1650) tier = 3;
  else if (elo <= 1950) tier = 4;
  else tier = 5;

  let minMult = 30;
  let maxMult = 55;

  switch (tier) {
    case 1: // Tập Sự: Vốn nhỏ khiêm tốn (30x - 55x cược)
      minMult = 30;
      maxMult = 55;
      break;
    case 2: // Phong Trào: Túi tiền tầm trung (60x - 110x cược)
      minMult = 60;
      maxMult = 110;
      break;
    case 3: // Kinh Nghiệm: Vốn dày dạn (120x - 220x cược)
      minMult = 120;
      maxMult = 220;
      break;
    case 4: // Cao Thủ: Đại gia sới bạc (240x - 450x cược)
      minMult = 240;
      maxMult = 450;
      break;
    case 5: // Thần Bài: Vốn khủng (500x - 1000x cược)
      minMult = 500;
      maxMult = 1000;
      break;
  }

  // Yếu tố tâm lý mạo hiểm (Risk Appetite)
  const risk = config.riskAppetite ?? 0.7;
  const riskBonus = (risk - 0.5) * 10;

  // Tính toán số nhân ngẫu nhiên
  const mult = minMult + Math.random() * (maxMult - minMult) + riskBonus;
  let rawBankroll = Math.round(effectiveBet * Math.max(minMult, mult));

  // Làm tròn tự nhiên theo bước nhảy số tiền
  if (rawBankroll < 10000) {
    rawBankroll = Math.round(rawBankroll / 50) * 50;
  } else if (rawBankroll < 50000) {
    rawBankroll = Math.round(rawBankroll / 100) * 100;
  } else {
    rawBankroll = Math.round(rawBankroll / 500) * 500;
  }

  return Math.max(3000, rawBankroll);
}
