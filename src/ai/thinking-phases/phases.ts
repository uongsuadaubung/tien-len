import type { DecisionContext, ValidMoveInfo } from '../decision-types';
import type { IBotThinkingPhaseState, BotDecision, BotThinkingPhaseStatus } from './types';
import { EmergencyRuleHandler } from '../handlers/emergency-handler';
import { EndgameSolverHandler } from '../handlers/endgame-handler';
import { LeadMoveHeuristicHandler } from '../handlers/lead-move-handler';
import { RespondingMoveHeuristicHandler } from '../handlers/responding-move-handler';
import { FallbackDecisionHandler } from '../handlers/fallback-handler';

/**
 * 1. Giai đoạn Cứu Nguy Khẩn Cấp (EMERGENCY_RESCUE)
 * Ưu tiên tối thượng: Chống Cóng & Chặn đền bài người 1 lá
 */
export class EmergencyRescuePhaseState implements IBotThinkingPhaseState {
  public readonly phase: BotThinkingPhaseStatus = 'EMERGENCY_RESCUE';
  private readonly handler = new EmergencyRuleHandler();

  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    return this.handler.handle(context, [...validMoves]);
  }
}

/**
 * 2. Giai đoạn Cờ Tàn (END_GAME)
 * Bài còn ít lá (<= 3 lá) hoặc có người sắp về: Kích hoạt Minimax Solver / Instant Win dứt điểm
 */
export class EndGamePhaseState implements IBotThinkingPhaseState {
  public readonly phase: BotThinkingPhaseStatus = 'END_GAME';
  private readonly handler = new EndgameSolverHandler();

  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    return this.handler.handle(context, [...validMoves]);
  }
}

/**
 * 3. Giai đoạn Khai Cuộc (OPENING)
 * Bài còn nhiều (> 8 lá): Tập trung giữ khung bài, xả rác nhỏ hoặc sảnh dài theo mode
 */
export class OpeningPhaseState implements IBotThinkingPhaseState {
  public readonly phase: BotThinkingPhaseStatus = 'OPENING';
  private readonly leadHandler = new LeadMoveHeuristicHandler();
  private readonly responseHandler = new RespondingMoveHeuristicHandler();
  private readonly fallbackHandler = new FallbackDecisionHandler();

  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    if (context.isLeadMove) {
      return this.leadHandler.handle(context, [...validMoves]) || this.fallbackHandler.handle(context, [...validMoves]);
    }
    return this.responseHandler.handle(context, [...validMoves]) || this.fallbackHandler.handle(context, [...validMoves]);
  }
}

/**
 * 4. Giai đoạn Trung Cuộc (MID_GAME)
 * Bài từ 4 đến 8 lá: Giằng co nhịp độ, nhử Heo, bẫy Hàng, đoạt quyền Cái
 */
export class MidGamePhaseState implements IBotThinkingPhaseState {
  public readonly phase: BotThinkingPhaseStatus = 'MID_GAME';
  private readonly leadHandler = new LeadMoveHeuristicHandler();
  private readonly responseHandler = new RespondingMoveHeuristicHandler();
  private readonly fallbackHandler = new FallbackDecisionHandler();

  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    if (context.isLeadMove) {
      return this.leadHandler.handle(context, [...validMoves]) || this.fallbackHandler.handle(context, [...validMoves]);
    }
    return this.responseHandler.handle(context, [...validMoves]) || this.fallbackHandler.handle(context, [...validMoves]);
  }
}
