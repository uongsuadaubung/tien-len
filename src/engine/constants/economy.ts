/**
 * HẰNG SỐ KINH TẾ & TÀI CHÍNH TOÀN CỤC (GLOBAL ECONOMY CONSTANTS)
 * Nguồn định nghĩa duy nhất (Single Source of Truth) cho các chỉ số tài chính, vốn khởi nghiệp, cứu trợ và toàn bộ hệ thống phần thưởng.
 */

// ============================================================================
// 1. CÁC MỐC PHẦN THƯỞNG VÒNG QUAY THẦN BÀI (LUCKY WHEEL REWARDS)
// ============================================================================
export const LUCKY_WHEEL_REWARDS = {
  /** Nổ hũ độc đắc (x10) */
  JACKPOT: 100_000,
  /** Trúng lớn (x5) */
  TIER_1_50K: 50_000,
  /** Lãi đậm (x3) */
  TIER_2_30K: 30_000,
  /** Lãi gấp đôi (x2) */
  TIER_3_20K: 20_000,
  /** Hoàn vốn (x1) */
  REFUND_10K: 10_000,
  /** Quà an ủi (x0.2) */
  CONSOLATION_2K: 2_000,
  /** Trượt / Mất trắng */
  LOSS_0: 0
} as const;

export interface LuckyWheelSliceConfig {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly icon: string;
  readonly gradient: readonly [string, string];
  readonly textColor: string;
  readonly isJackpot: boolean;
  readonly isLoss: boolean;
  /** Tỷ lệ xác suất xuất hiện (phần trăm %, tổng tất cả các ô = 100%) */
  readonly probabilityPercent: number;
}

export const LUCKY_WHEEL_SLICES: readonly LuckyWheelSliceConfig[] = [
  {
    id: 'jackpot_100k',
    label: '100K JACKPOT',
    value: LUCKY_WHEEL_REWARDS.JACKPOT,
    icon: '👑',
    gradient: ['#991b1b', '#450a0a'],
    textColor: '#ffffff',
    isJackpot: true,
    isLoss: false,
    probabilityPercent: 1.5
  },
  {
    id: 'loss_mat_trang',
    label: 'MẤT TRẮNG',
    value: LUCKY_WHEEL_REWARDS.LOSS_0,
    icon: '💨',
    gradient: ['#1e2942', '#151d30'],
    textColor: '#94a3b8',
    isJackpot: false,
    isLoss: true,
    probabilityPercent: 20.0
  },
  {
    id: 'prize_30k',
    label: '30,000',
    value: LUCKY_WHEEL_REWARDS.TIER_2_30K,
    icon: '💰',
    gradient: ['#103828', '#081c14'],
    textColor: '#e5b869',
    isJackpot: false,
    isLoss: false,
    probabilityPercent: 6.0
  },
  {
    id: 'prize_2k',
    label: '2,000',
    value: LUCKY_WHEEL_REWARDS.CONSOLATION_2K,
    icon: '🪙',
    gradient: ['#273554', '#151d30'],
    textColor: '#d4deec',
    isJackpot: false,
    isLoss: true,
    probabilityPercent: 25.0
  },
  {
    id: 'prize_50k',
    label: '50K XU',
    value: LUCKY_WHEEL_REWARDS.TIER_1_50K,
    icon: '💎',
    gradient: ['#3b1c54', '#1a0c26'],
    textColor: '#ffffff',
    isJackpot: false,
    isLoss: false,
    probabilityPercent: 4.5
  },
  {
    id: 'loss_truot_tay',
    label: 'TRƯỢT TAY',
    value: LUCKY_WHEEL_REWARDS.LOSS_0,
    icon: '❌',
    gradient: ['#3d141e', '#1f080e'],
    textColor: '#fca5a5',
    isJackpot: false,
    isLoss: true,
    probabilityPercent: 20.0
  },
  {
    id: 'prize_20k',
    label: '20,000',
    value: LUCKY_WHEEL_REWARDS.TIER_3_20K,
    icon: '🪙',
    gradient: ['#422c10', '#1c1105'],
    textColor: '#ffffff',
    isJackpot: false,
    isLoss: false,
    probabilityPercent: 8.0
  },
  {
    id: 'refund_10k',
    label: '10,000',
    value: LUCKY_WHEEL_REWARDS.REFUND_10K,
    icon: '🍀',
    gradient: ['#103833', '#071716'],
    textColor: '#4ade80',
    isJackpot: false,
    isLoss: false,
    probabilityPercent: 15.0
  }
];

/**
 * Hàm trợ giúp tính toán index ô trúng thưởng dựa trên số ngẫu nhiên [0, 100)
 */
export function determineWinningWheelSliceIndex(randomNumber100: number): number {
  let accumulated = 0;
  for (let i = 0; i < LUCKY_WHEEL_SLICES.length; i++) {
    accumulated += LUCKY_WHEEL_SLICES[i].probabilityPercent;
    if (randomNumber100 < accumulated) {
      return i;
    }
  }
  return LUCKY_WHEEL_SLICES.length - 1;
}

// ============================================================================
// 2. CÁC MỐC PHẦN THƯỞNG HÒM CỘT MỐC NGÀY (DAILY MILESTONE REWARDS)
// ============================================================================
export const DAILY_MILESTONE_REWARDS = {
  MILESTONE_1: 5_000,
  MILESTONE_3: 15_000,
  MILESTONE_5: 30_000
} as const;

// ============================================================================
// 3. TIER PHẦN THƯỞNG NHIỆM VỤ NGÀY & THÀNH TỰU (QUEST & ACHIEVEMENT REWARDS)
// ============================================================================
export const QUEST_REWARD_TIERS = {
  MINI: 5_000,
  EASY: 10_000,
  MEDIUM: 15_000,
  HARD: 20_000,
  EPIC: 25_000,
  MASTER: 35_000
} as const;

export const ACHIEVEMENT_REWARD_TIERS = {
  BRONZE: 20_000,
  SILVER: 50_000,
  GOLD: 100_000,
  PLATINUM: 250_000,
  DIAMOND: 500_000,
  MASTER: 1_000_000,
  GRANDMASTER: 1_500_000
} as const;

// ============================================================================
// 4. HẰNG SỐ TÀI CHÍNH TOÀN CỤC (GLOBAL ECONOMY CONFIG)
// ============================================================================
export const ECONOMY_CONSTANTS = {
  /** Vốn khởi nghiệp mặc định cho tân thủ mới tạo tài khoản */
  DEFAULT_STARTING_COINS: 50_000,

  /** Điểm Elo ban đầu cho người chơi mới */
  DEFAULT_STARTING_ELO: 1_000,

  /** Mức cược mặc định cho Chơi Nhanh (Xu / lá) */
  DEFAULT_QUICK_BET: 1_000,

  /** Mức cược tối thiểu cho mọi bàn đấu (Xu / lá) */
  MIN_TABLE_BET: 1_000,

  /** Chi phí mua 1 vé quay Vòng Quay Thần Bài */
  LUCKY_WHEEL_SPIN_COST: 10_000,

  /** Giá trị nổ hũ tối đa của Vòng Quay Thần Bài */
  LUCKY_WHEEL_JACKPOT: LUCKY_WHEEL_REWARDS.JACKPOT,

  /** Toàn bộ các mốc phần thưởng của Vòng Quay */
  LUCKY_WHEEL_REWARDS,

  /** Các mốc thưởng hòm ngày */
  DAILY_MILESTONE_REWARDS,

  /** Các bậc thưởng nhiệm vụ */
  QUEST_REWARD_TIERS,

  /** Các bậc thưởng thành tựu */
  ACHIEVEMENT_REWARD_TIERS,

  /** Số tiền cứu trợ phá sản khẩn cấp mỗi lần nhận */
  DAILY_RELIEF_AMOUNT: 20_000,

  /** Ngưỡng Xu tối đa được phép nhận cứu trợ phá sản (khi số dư nhỏ hơn ngưỡng này) */
  BANKRUPTCY_RELIEF_THRESHOLD: 10_000,

  /** Số lần tối đa được nhận gói cứu trợ phá sản trong 1 ngày */
  MAX_DAILY_RELIEF_COUNT: 3,

  /** Các gói vay ngân hàng chủ sòng */
  LOAN_PACKAGES: [
    { amount: 20_000, label: 'Tiếp Sức', desc: 'Vốn quay vòng nhanh' },
    { amount: 50_000, label: 'Vực Dậy', desc: 'Vốn đánh bàn trung cấp' },
    { amount: 100_000, label: 'Đại Gia', desc: 'Vốn chiến bàn lớn' },
    { amount: 250_000, label: 'Thần Bài', desc: 'Tất tay phục thù' }
  ],

  /** Điểm Elo bị phạt khi thoát game / F5 giữa trận */
  F5_DISCONNECT_ELO_PENALTY: 30,

  /** Hệ số số lá bài tối đa quy đổi tiền cọc an toàn (26 lá = 2 người chơi x 13 lá) */
  DEPOSIT_CARD_MULTIPLIER: 26
} as const;

/**
 * Tính tiền cọc an toàn yêu cầu cho bàn đấu: 26 * betAmount * choppingMultiplier
 */
export function calculateRequiredDeposit(betAmount: number, choppingMultiplier: number = 1): number {
  return ECONOMY_CONSTANTS.DEPOSIT_CARD_MULTIPLIER * betAmount * (choppingMultiplier || 1);
}
