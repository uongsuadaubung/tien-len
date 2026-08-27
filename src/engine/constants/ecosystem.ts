/**
 * ============================================================================
 * HẰNG SỐ HỆ SINH THÁI 200 BOT (ECOSYSTEM CONSTANTS)
 * ============================================================================
 */

export type AvailableBetAmount = 1000 | 2000 | 5000 | 10000 | 20000 | 50000 | 100000;

export interface EcosystemConfig {
  MAX_BOT_COUNT: number;
  BANKRUPTCY_THRESHOLD: number;
  MIN_BET_AMOUNT: number;
  MIN_ELO: number;
  MAX_ELO: number;
  AVAILABLE_BET_AMOUNTS: AvailableBetAmount[];
  TIER_DISTRIBUTION: Record<number, number>;
  TIER_INITIAL_BANKROLL: Record<number, { min: number; max: number }>;
  JITTER_RATE: number;
  BASE_ACTIVITY_PROBABILITY: number;
  TILT_RISK_BOOST: number;
  DB_NAME: string;
  DB_VERSION: number;
}

export const ECOSYSTEM_CONSTANTS: EcosystemConfig = {
  // Tổng số lượng Bot trong thế giới sới bạc
  MAX_BOT_COUNT: 200,

  // Giới hạn Elo toàn hệ sinh thái
  MIN_ELO: 600,
  MAX_ELO: 9999,

  // Ngưỡng phá sản: Bot có số xu <= mức này sẽ bị tuyên bố vỡ nợ và đào thải
  BANKRUPTCY_THRESHOLD: 1000,

  // Mức cược tối thiểu tại sới bạc
  MIN_BET_AMOUNT: 1000,

  // Danh sách các mức cược hỗ trợ trong toàn bộ sới bạc
  AVAILABLE_BET_AMOUNTS: [1000, 2000, 5000, 10000, 20000, 50000, 100000],

  // Phân bổ số lượng Bot khởi điểm theo 9 Bậc Rank (Tổng = 200)
  TIER_DISTRIBUTION: {
    1: 40, // Tier 1: Tân Thủ (Beginner) - 20% (Elo 650 - 850)
    2: 36, // Tier 2: Tập Sự (Novice) - 18% (Elo 950 - 1150)
    3: 32, // Tier 3: Phong Trào (Amateur) - 16% (Elo 1250 - 1450)
    4: 28, // Tier 4: Lão Luyện (Veteran) - 14% (Elo 1550 - 1750)
    5: 24, // Tier 5: Tinh Anh (Elite) - 12% (Elo 1850 - 2050)
    6: 18, // Tier 6: Cao Thủ (Master) - 9% (Elo 2150 - 2350)
    7: 12, // Tier 7: Đại Cao Thủ (Grandmaster) - 6% (Elo 2450 - 2650)
    8: 7,  // Tier 8: Thần Bài (Mythic) - 3.5% (Elo 2750 - 2950)
    9: 3   // Tier 9: Siêu Trí Tuệ (Supreme AI BOSS) - 1.5% (Elo 3050 - 3400)
  },

  // Khoảng vốn khởi điểm theo từng Tier (Xu)
  TIER_INITIAL_BANKROLL: {
    1: { min: 5000, max: 15000 },
    2: { min: 10000, max: 25000 },
    3: { min: 30000, max: 60000 },
    4: { min: 70000, max: 150000 },
    5: { min: 160000, max: 400000 },
    6: { min: 450000, max: 900000 },
    7: { min: 1000000, max: 2500000 },
    8: { min: 3000000, max: 8000000 },
    9: { min: 10000000, max: 30000000 }
  },

  // Độ lệch ngẫu nhiên Gaussian Jitter cho chỉ số Bot (±15%)
  JITTER_RATE: 0.15,

  // Tỉ lệ tham gia thi đấu tự nhiên mỗi vòng (40% - 70%)
  BASE_ACTIVITY_PROBABILITY: 0.55,

  // Hệ số gia tăng tâm lý cay cú gỡ gạc (Tilt) khi dính chuỗi thua
  TILT_RISK_BOOST: 0.35,

  // Tên cơ sở dữ liệu IndexedDB & Phiên bản Hợp Nhất Toàn Bộ Game
  DB_NAME: 'TIEN_LEN_DEXIE_DB_V1',
  DB_VERSION: 1
};
