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

  // Ngưỡng phá sản: Bot có số xu <= mức này sẽ bị tuyên bố vỡ nợ và đào thải
  BANKRUPTCY_THRESHOLD: 1000,

  // Mức cược tối thiểu tại sới bạc
  MIN_BET_AMOUNT: 1000,

  // Danh sách các mức cược hỗ trợ trong toàn bộ sới bạc
  AVAILABLE_BET_AMOUNTS: [1000, 2000, 5000, 10000, 20000, 50000, 100000],

  // Phân bổ số lượng Bot khởi điểm theo 5 Bậc Rank (Tổng = 200)
  TIER_DISTRIBUTION: {
    1: 50, // Tier 1: Tập Sự (Rookie) - 25% (Elo 850 - 1050)
    2: 70, // Tier 2: Phong Trào (Challenger) - 35% (Elo 1100 - 1350)
    3: 50, // Tier 3: Kinh Nghiệm (Veteran) - 25% (Elo 1400 - 1650)
    4: 20, // Tier 4: Cao Thủ (Master) - 10% (Elo 1700 - 1950)
    5: 10  // Tier 5: Thần Bài (Mythic) - 5% (Elo 2000 - 2500)
  },

  // Khoảng vốn khởi điểm theo từng Tier (Xu)
  TIER_INITIAL_BANKROLL: {
    1: { min: 3000, max: 6000 },
    2: { min: 10000, max: 25000 },
    3: { min: 40000, max: 100000 },
    4: { min: 150000, max: 400000 },
    5: { min: 800000, max: 2500000 }
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
