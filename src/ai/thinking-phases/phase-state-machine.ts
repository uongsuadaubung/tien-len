import type { DecisionContext, ValidMoveInfo } from '../decision-types';
import type { IBotThinkingPhaseState, BotDecision, BotThinkingPhaseStatus } from './types';
import {
  EmergencyRescuePhaseState,
  EndGamePhaseState,
  OpeningPhaseState,
  MidGamePhaseState
} from './phases';

/**
 * Máy trạng thái điều phối các Giai đoạn Suy luận nhận thức của Bot AI (State Pattern)
 */
export class BotThinkingPhaseStateMachine {
  private currentState: IBotThinkingPhaseState;

  private readonly emergencyState = new EmergencyRescuePhaseState();
  private readonly endGameState = new EndGamePhaseState();
  private readonly openingState = new OpeningPhaseState();
  private readonly midGameState = new MidGamePhaseState();

  constructor() {
    this.currentState = this.openingState;
  }

  public get currentPhase(): BotThinkingPhaseStatus {
    return this.currentState.phase;
  }

  /**
   * Phân tích ngữ cảnh trận đấu để tự động chuyển sang Giai đoạn Suy luận phù hợp nhất
   */
  public transitionToPhase(context: DecisionContext): IBotThinkingPhaseState {
    const { hand, remainingPlayerCards, isNextPlayerOneCard, isLeadMove, hasPlayedFirstCard } = context;

    // 1. Kiểm tra điều kiện Khẩn cấp (Chống Cóng hoặc Chặn đền bài 1 lá)
    const opponentCardCounts = Object.entries(remainingPlayerCards)
      .filter(([id]) => id !== context.config.id)
      .map(([, count]) => count);

    const minOpponentCards = opponentCardCounts.length > 0 ? Math.min(...opponentCardCounts) : 13;
    const isAntiCongDanger = !hasPlayedFirstCard && minOpponentCards <= 2;
    const isAntiOneCardDanger = isNextPlayerOneCard && isLeadMove;

    if (isAntiCongDanger || isAntiOneCardDanger) {
      this.currentState = this.emergencyState;
      return this.currentState;
    }

    // 2. Kiểm tra Cờ Tàn (Endgame: Còn ít bài hoặc có đối thủ sắp về)
    if (hand.length <= 3 || minOpponentCards <= 2) {
      this.currentState = this.endGameState;
      return this.currentState;
    }

    // 3. Khai Cuộc (Opening: Bài còn nhiều > 8 lá)
    if (hand.length > 8) {
      this.currentState = this.openingState;
      return this.currentState;
    }

    // 4. Trung Cuộc (Mid Game: Giằng co thế cờ 4-8 lá)
    this.currentState = this.midGameState;
    return this.currentState;
  }

  /**
   * Đánh giá nước đi qua Giai đoạn Suy luận hiện tại
   */
  public evaluate(context: DecisionContext, validMoves: readonly ValidMoveInfo[]): BotDecision | null {
    const activeState = this.transitionToPhase(context);
    return activeState.evaluate(context, validMoves);
  }
}
