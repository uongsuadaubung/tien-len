import { GameMode } from './types';

export type GameSettlementType = 'RANK_BASED' | 'CARD_COUNT' | 'WINNER_TAKES_ALL';

export interface GameModeDefinition {
  id: string;
  strategyId: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  colorScheme: {
    primary: string;
    border: string;
    bg: string;
    accent: string;
  };
  defaultSettings: {
    mode: GameMode;
    settlementType: GameSettlementType;
    allowFourPairsCutAnytime: boolean;
    instantWinEnabled: boolean;
    betAmount: number;
    playerCount: 2 | 3 | 4;
    prohibitEndingWithTwo: boolean;
  };
  defaultBotPersonaIds: [string, string, string]; // Mặc định cho 3 ghế (hoặc lấy 1, 2 tùy playerCount)
  allowedCustomizations: {
    canChangeBotLineup: boolean;
    canChangeBet: boolean;
    canChangeRules: boolean;
    canChangePlayerCount: boolean;
  };
}

export interface BotLineupPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  botIds: [string, string, string];
}

/**
 * =========================================================================
 * GAME MODE REGISTRY: Danh sách các chế độ chơi mở rộng.
 * Để thêm chế độ mới sau này, chỉ cần thêm 1 object vào mảng này!
 * =========================================================================
 */
export const GAME_MODE_REGISTRY: GameModeDefinition[] = [
  {
    id: 'TRADITIONAL',
    strategyId: 'TRADITIONAL',
    name: 'Truyền Thống (Nhất Nhì Ba Bét)',
    tagline: 'Luật chơi dân gian chuẩn mực',
    description: 'Chơi đến khi 3 người hết bài để xác định rõ thứ hạng Nhất (+3 cược), Nhì (+1 cược), Ba (-1 cược), Bét (-3 cược).',
    icon: '🎖️',
    badge: 'Kinh Điển',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    colorScheme: {
      primary: 'text-amber-300',
      border: 'border-amber-500/40',
      bg: 'from-amber-950/60 via-neutral-900/80 to-black',
      accent: 'bg-amber-600 hover:bg-amber-500'
    },
    defaultSettings: {
      mode: 'TRADITIONAL',
      settlementType: 'RANK_BASED',
      allowFourPairsCutAnytime: true,
      instantWinEnabled: true,
      betAmount: 500,
      playerCount: 4,
      prohibitEndingWithTwo: true
    },
    defaultBotPersonaIds: ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1750'],
    allowedCustomizations: {
      canChangeBotLineup: true,
      canChangeBet: true,
      canChangeRules: true,
      canChangePlayerCount: true
    }
  },
  {
    id: 'COUNT_CARDS',
    strategyId: 'COUNT_CARDS',
    name: 'Đếm Lá (Ăn Thua Tốc Độ)',
    tagline: 'Một người về Nhất là kết thúc',
    description: 'Ván bài dừng ngay lập tức khi có người đầu tiên hết bài. Những người còn lại đếm số lá trên tay để tính phạt tiền cược.',
    icon: '⚡',
    badge: 'Tốc Chiến',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    colorScheme: {
      primary: 'text-emerald-300',
      border: 'border-emerald-500/40',
      bg: 'from-emerald-950/60 via-neutral-900/80 to-black',
      accent: 'bg-emerald-600 hover:bg-emerald-500'
    },
    defaultSettings: {
      mode: 'COUNT_CARDS',
      settlementType: 'CARD_COUNT',
      allowFourPairsCutAnytime: true,
      instantWinEnabled: true,
      betAmount: 500,
      playerCount: 4,
      prohibitEndingWithTwo: true
    },
    defaultBotPersonaIds: ['BOT_ELO_1200', 'BOT_ELO_1350', 'BOT_ELO_1250'],
    allowedCustomizations: {
      canChangeBotLineup: true,
      canChangeBet: true,
      canChangeRules: true,
      canChangePlayerCount: true
    }
  },
  {
    id: 'WINNER_TAKES_ALL',
    strategyId: 'WINNER_TAKES_ALL',
    name: 'Nhất Ăn Tất (Sát Phạt Toàn Bàn)',
    tagline: 'Kẻ thắng gom trọn tiền cược',
    description: 'Chỉ tôn vinh duy nhất người về Nhất. Người về Nhất gom sạch toàn bộ tiền cược của tất cả đối thủ trên bàn.',
    icon: '👑',
    badge: 'Đỏ Đen',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40',
    colorScheme: {
      primary: 'text-yellow-300',
      border: 'border-yellow-500/40',
      bg: 'from-yellow-950/60 via-neutral-900/80 to-black',
      accent: 'bg-yellow-600 hover:bg-yellow-500'
    },
    defaultSettings: {
      mode: 'WINNER_TAKES_ALL',
      settlementType: 'WINNER_TAKES_ALL',
      allowFourPairsCutAnytime: true,
      instantWinEnabled: true,
      betAmount: 1000,
      playerCount: 4,
      prohibitEndingWithTwo: true
    },
    defaultBotPersonaIds: ['BOT_ELO_1950', 'BOT_ELO_2050', 'BOT_ELO_2150'],
    allowedCustomizations: {
      canChangeBotLineup: true,
      canChangeBet: true,
      canChangeRules: true,
      canChangePlayerCount: true
    }
  },
  {
    id: 'SOLO_1V1',
    strategyId: 'COUNT_CARDS',
    name: 'Đấu Tay Đôi (Solo 1 vs 1)',
    tagline: 'Cuộc chiến cân não đỉnh cao',
    description: 'Bàn đấu 2 người chơi giữa bạn và 1 Bot cao thủ. Mỗi bên 13 lá bài, so tài tính toán từng nước đi chiến thuật.',
    icon: '⚔️',
    badge: 'Solo 1v1',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    colorScheme: {
      primary: 'text-purple-300',
      border: 'border-purple-500/40',
      bg: 'from-purple-950/60 via-neutral-900/80 to-black',
      accent: 'bg-purple-600 hover:bg-purple-500'
    },
    defaultSettings: {
      mode: 'COUNT_CARDS',
      settlementType: 'CARD_COUNT',
      allowFourPairsCutAnytime: true,
      instantWinEnabled: true,
      betAmount: 1000,
      playerCount: 2,
      prohibitEndingWithTwo: true
    },
    defaultBotPersonaIds: ['BOT_ELO_2500', 'BOT_ELO_2300', 'BOT_ELO_2150'],
    allowedCustomizations: {
      canChangeBotLineup: true,
      canChangeBet: true,
      canChangeRules: true,
      canChangePlayerCount: false
    }
  },
  {
    id: 'CUSTOM_SANDBOX',
    strategyId: 'TRADITIONAL',
    name: 'Xưởng Tùy Biến Tự Do (Sandbox)',
    tagline: 'Tự do thiết lập mọi quy tắc',
    description: 'Toàn quyền kiểm soát số người chơi, luật kết thúc, tốc độ đi bài và tinh chỉnh từng thông số thuật toán AI.',
    icon: '🛠️',
    badge: 'Tùy Biến',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
    colorScheme: {
      primary: 'text-blue-300',
      border: 'border-blue-500/40',
      bg: 'from-blue-950/60 via-neutral-900/80 to-black',
      accent: 'bg-blue-600 hover:bg-blue-500'
    },
    defaultSettings: {
      mode: 'TRADITIONAL',
      settlementType: 'RANK_BASED',
      allowFourPairsCutAnytime: true,
      instantWinEnabled: true,
      betAmount: 500,
      playerCount: 4,
      prohibitEndingWithTwo: true
    },
    defaultBotPersonaIds: ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1750'],
    allowedCustomizations: {
      canChangeBotLineup: true,
      canChangeBet: true,
      canChangeRules: true,
      canChangePlayerCount: true
    }
  }
];

/**
 * =========================================================================
 * BOT LINEUP PRESETS: Các bộ 3 Bot chọn nhanh
 * =========================================================================
 */
export const BOT_LINEUP_PRESETS: BotLineupPreset[] = [
  {
    id: 'NOVICE',
    name: 'Tân Thủ Nhập Môn',
    icon: '👶',
    description: 'Tí Chuột, Tèo Bờ Rào, Bác Ba (Tier 1: Tân Thủ)',
    botIds: ['BOT_ELO_700', 'BOT_ELO_750', 'BOT_ELO_850']
  },
  {
    id: 'CHALLENGERS',
    name: 'Phong Trào Sôi Động',
    icon: '⚡',
    description: 'Ba Gác, Chú Tư, Zane (Tier 2-3: Tốc chiến xả láng)',
    botIds: ['BOT_ELO_1150', 'BOT_ELO_1250', 'BOT_ELO_1350']
  },
  {
    id: 'MASTERS',
    name: 'Cao Thủ Sới Bạc',
    icon: '💎',
    description: 'Sophia, Long, Raven (Tier 5-6: Gài bẫy, rình chặt Heo)',
    botIds: ['BOT_ELO_1750', 'BOT_ELO_1850', 'BOT_ELO_1950']
  },
  {
    id: 'GOD_MODE',
    name: 'Siêu Trí Tuệ & Thần Bài (God Mode)',
    icon: '👑',
    description: 'Alpha Mind, Oracle, Nova (Tier 8-9: Minimax, Bayesian, Nash)',
    botIds: ['BOT_ELO_3200', 'BOT_ELO_2750', 'BOT_ELO_2500']
  }
];

/**
 * Lấy định nghĩa chế độ theo ID
 */
export function getGameModeDefinition(modeId: string): GameModeDefinition {
  const found = GAME_MODE_REGISTRY.find(m => m.id === modeId);
  return found || GAME_MODE_REGISTRY[0];
}

/**
 * Lấy tất cả chế độ khả dụng
 */
export function getAllGameModeDefinitions(): GameModeDefinition[] {
  return GAME_MODE_REGISTRY;
}
