/**
 * ============================================================================
 * HẰNG SỐ HỆ SINH THÁI 200 BOT (ECOSYSTEM CONSTANTS)
 * ============================================================================
 */

import { RANK_TIERS } from './ranks';

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
  // Tổng số lượng Bot trong toàn bộ hệ sinh thái sới bạc
  MAX_BOT_COUNT: 200,

  MIN_ELO: 600,
  MAX_ELO: 9999,

  // Ngưỡng phá sản: Bot có số xu <= mức này sẽ bị tuyên bố vỡ nợ và đào thải
  BANKRUPTCY_THRESHOLD: 1000,

  // Mức cược tối thiểu tại sới bạc
  MIN_BET_AMOUNT: 1000,

  // Danh sách các mức cược hỗ trợ trong toàn bộ sới bạc
  AVAILABLE_BET_AMOUNTS: [1000, 2000, 5000, 10000, 20000, 50000, 100000],

  // Phân bổ số lượng Bot khởi điểm phái sinh trực tiếp từ SSOT RANK_TIERS (Tổng = 200)
  TIER_DISTRIBUTION: Object.fromEntries(
    RANK_TIERS.map(t => [t.tierNum, t.targetBotQuota])
  ),

  // Khoảng vốn khởi điểm theo từng Tier phái sinh trực tiếp từ SSOT RANK_TIERS (Xu)
  TIER_INITIAL_BANKROLL: Object.fromEntries(
    RANK_TIERS.map(t => [t.tierNum, t.bankroll])
  ),

  // Độ lệch ngẫu nhiên Gaussian Jitter cho chỉ số Bot (±15%)
  JITTER_RATE: 0.15,

  // Tỉ lệ tham gia thi đấu tự nhiên mỗi vòng (40% - 70%)
  BASE_ACTIVITY_PROBABILITY: 0.55,

  // Hệ số gia tăng tâm lý cay cú gỡ gạc (Tilt) khi dính chuỗi thua
  TILT_RISK_BOOST: 0.35,

  // Tên cơ sở dữ liệu IndexedDB & Phiên bản Hợp Nhất Toàn Bộ Game (Bản mới tinh khôi)
  DB_NAME: 'TIEN_LEN_GAME_DB',
  DB_VERSION: 1
};
