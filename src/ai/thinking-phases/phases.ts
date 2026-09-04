import type { DecisionContext, ValidMoveInfo } from '../decision-types';
import type { IBotThinkingPhaseState, BotDecision, BotThinkingPhaseStatus } from './types';
import { EmergencyRuleHandler } from '../handlers/emergency-handler';
import { EndgameSolverHandler } from '../handlers/endgame-handler';
import { LeadMoveHeuristicHandler } from '../handlers/lead-move-handler';
import { RespondingMoveHeuristicHandler } from '../handlers/responding-move-handler';
import { FallbackDecisionHandler } from '../handlers/fallback-handler';

// Handlers dùng chung (Singletons) tránh cấp phát mới liên tục trên mỗi turn
const emergencyRuleHandler = new EmergencyRuleHandler();
const endgameSolverHandler = new EndgameSolverHandler();
const leadMoveHandler = new LeadMoveHeuristicHandler();
const respondingMoveHandler = new RespondingMoveHeuristicHandler();
const fallbackDecisionHandler = new FallbackDecisionHandler();

/**
 * Đánh giá nước đi chiến thuật thông thường (áp dụng chung cho cả Khai cuộc và Trung cuộc)
 */
function evaluateStandardPlayMove(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
  if (context.isLeadMove) {
    return leadMoveHandler.handle(context, [...validMoves]) || fallbackDecisionHandler.handle(context, [...validMoves]);
  }
  return respondingMoveHandler.handle(context, [...validMoves]) || fallbackDecisionHandler.handle(context, [...validMoves]);
}

/**
 * 1. Giai đoạn Cứu Nguy Khẩn Cấp (EMERGENCY_RESCUE)
 * Ưu tiên tối thượng: Chống Cóng & Chặn đền bài người 1 lá
 */
export class EmergencyRescuePhaseState implements IBotThinkingPhaseState {
  public readonly phase: BotThinkingPhaseStatus = 'EMERGENCY_RESCUE';

  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    return emergencyRuleHandler.handle(context, [...validMoves]);
  }
}

/**
 * 2. Giai đoạn Cờ Tàn (END_GAME)
 * Bài còn ít lá (<= 3 lá) hoặc có người sắp về: Kích hoạt Minimax Solver / Instant Win dứt điểm
 */
export class EndGamePhaseState implements IBotThinkingPhaseState {
  public readonly phase: BotThinkingPhaseStatus = 'END_GAME';

  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    return endgameSolverHandler.handle(context, [...validMoves]);
  }
}

/**
 * 3. Giai đoạn Khai Cuộc (OPENING)
 * Bài còn nhiều (> 8 lá): Tập trung giữ khung bài, xả rác nhỏ hoặc sảnh dài theo mode
 */
export class OpeningPhaseState implements IBotThinkingPhaseState {
  public readonly phase: BotThinkingPhaseStatus = 'OPENING';

  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    return evaluateStandardPlayMove(context, validMoves);
  }
}

/**
 * 4. Giai đoạn Trung Cuộc (MID_GAME)
 * Bài từ 4 đến 8 lá: Giằng co nhịp độ, nhử Heo, bẫy Hàng, đoạt quyền Cái
 */
export class MidGamePhaseState implements IBotThinkingPhaseState {
  public readonly phase: BotThinkingPhaseStatus = 'MID_GAME';

  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    return evaluateStandardPlayMove(context, validMoves);
  }
}
