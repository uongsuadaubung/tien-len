import type { Card, Combination } from '../../engine/types';
import type { BotCandidateEvaluation, BotDecisionTelemetry } from '../../engine/match-logger';
import type { DecisionContext, ValidMoveInfo } from '../decision-types';

export type BotThinkingPhaseStatus = 'EMERGENCY_RESCUE' | 'END_GAME' | 'OPENING' | 'MID_GAME';

/**
 * Quyết định đánh bài (Type-Safe: cards và combination ĐẢM BẢO TỒN TẠI 100%)
 */
export interface PlayBotDecision {
  readonly type: 'PLAY';
  readonly cards: readonly Card[];
  readonly combination: Combination;
  readonly reason?: string;
  readonly strategyUsed?: string;
  readonly evaluationScore?: number;
  readonly candidatesEvaluated?: readonly BotCandidateEvaluation[];
  readonly telemetry?: BotDecisionTelemetry;
}

/**
 * Quyết định bỏ lượt (Type-Safe: Không có bài đánh)
 */
export interface PassBotDecision {
  readonly type: 'PASS';
  readonly cards?: undefined;
  readonly combination?: undefined;
  readonly reason?: string;
  readonly strategyUsed?: string;
  readonly evaluationScore?: number;
  readonly candidatesEvaluated?: readonly BotCandidateEvaluation[];
  readonly telemetry?: BotDecisionTelemetry;
}

/**
 * Discriminated Union cho toàn bộ quyết định của Bot AI
 */
export type BotDecision = PlayBotDecision | PassBotDecision;

/**
 * Giao diện hành vi cho từng Giai đoạn Suy luận nhận thức của Bot (State Pattern)
 */
export interface IBotThinkingPhaseState {
  readonly phase: BotThinkingPhaseStatus;
  evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null;
}
