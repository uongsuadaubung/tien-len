import { Combination } from '../../engine/types';
import { isTwo } from '../../engine/card';
import { BotConfig } from '../types';
import { CardTracker } from '../card-tracker';
import { ValidMoveInfo } from '../decision-types';

export interface NashDecisionResult {
  shouldTakeAction: boolean;
  probability: number;
  reason: string;
}

/**
 * ============================================================================
 * NASH EQUILIBRIUM MIXED-STRATEGY SOLVER (CÂN BẰNG NASH CHIẾN LƯỢC HỖN HỢP)
 * Tính toán xác suất ngẫu nhiên hóa tối ưu cho các quyết định sinh tử (Chặt Heo, Ra Heo, Bluff)
 * để chống lại việc người chơi khai thác bắt bài thói quen của Bot
 * ============================================================================
 */
export class NashEquilibriumSolver {
  /**
   * Tính toán xác suất cân bằng Nash cho quyết định Ra Heo / Chặt Heo
   * @param gainValue Lợi ích kỳ vọng nếu thắng lượt (ví dụ: cướp cái, về bài)
   * @param lossRisk Nguy cơ rủi ro nếu bị chặt đè / đền bài
   */
  public static calculateNashProbability(gainValue: number, lossRisk: number): number {
    const total = Math.max(1, gainValue + lossRisk);
    const prob = gainValue / total;
    return Math.max(0.1, Math.min(0.9, Number(prob.toFixed(3))));
  }

  /**
   * Đánh giá chiến lược hỗn hợp Nash khi cân nhắc Chặt Heo hoặc Xả Heo
   */
  public static evaluateNashChoppingAction(
    move: ValidMoveInfo,
    targetCombo: Combination | null,
    tracker: CardTracker,
    config: BotConfig,
    remainingCardsCount: number
  ): NashDecisionResult {
    const twoSafety = tracker.getTwoSafetyReport();
    const bombProb = tracker.getBombProbability();

    // 1. Nếu thế bài còn quá ít lá (<= 3 lá): Luôn dứt điểm
    if (remainingCardsCount <= 3) {
      return {
        shouldTakeAction: true,
        probability: 1.0,
        reason: 'Cờ tàn dứt điểm: Không áp dụng ngẫu nhiên hóa'
      };
    }

    // 2. Lợi ích kỳ vọng: Cướp cái + Thưởng chặt
    let gain = 100;
    if (move.isChop) gain += 150;
    if (targetCombo && isTwo(targetCombo.highestCard)) gain += 80;

    // 3. Rủi ro bị chặt đè lại: Dựa trên xác suất Hàng và số Heo to còn lại
    let lossRisk = twoSafety.riskScore * 1.5;
    if (bombProb > 0.3) lossRisk += bombProb * 120;

    // Điều chỉnh theo khẩu vị rủi ro và chỉ số thích ứng của Bot
    gain *= config.riskAppetite + 0.5;
    lossRisk *= (1.5 - config.riskAppetite);

    const nashProb = this.calculateNashProbability(gain, lossRisk);
    const roll = Math.random();
    const shouldTakeAction = roll <= nashProb;

    return {
      shouldTakeAction,
      probability: nashProb,
      reason: `Nash Mixed Strategy (Xác suất ${Math.round(nashProb * 100)}% - Roll: ${Math.round(roll * 100)}%): ${shouldTakeAction ? 'Hành động' : 'Nhịn để bảo toàn'}`
    };
  }
}
