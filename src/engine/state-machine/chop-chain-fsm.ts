import type { PlayedMove } from '../types';

export interface NoChopState {
  readonly type: 'NO_CHOP';
}

export interface SingleChopState {
  readonly type: 'SINGLE_CHOP';
  readonly chopperPlayerId: string;
  readonly choppedPlayerId: string;
  readonly penaltyAmount: number;
  readonly move: PlayedMove;
}

export interface CascadeChopChainState {
  readonly type: 'CASCADE_CHOP_CHAIN';
  readonly chainCount: number;
  readonly currentChopperPlayerId: string;
  readonly currentChoppedPlayerId: string;
  readonly originalVictimPlayerId: string;
  readonly totalPenaltyAmount: number;
  readonly previousRefund: {
    readonly refundedPlayerId: string;
    readonly chargedPlayerId: string;
    readonly amount: number;
  } | null;
  readonly chopHistory: readonly PlayedMove[];
}

export type RoundChopState = NoChopState | SingleChopState | CascadeChopChainState;

export interface EvaluateChopParams {
  readonly isChopMove: boolean;
  readonly chopperId: string;
  readonly leadingMove: PlayedMove | null;
  readonly basePenalty: number;
  readonly isCascadeRuleActive: boolean;
  readonly currentRoundChopMoves: readonly PlayedMove[];
}

export interface ChopTransitionResult {
  readonly nextState: RoundChopState;
  readonly isChop: boolean;
  readonly isCascadeChop: boolean;
  readonly chopChainCount: number;
  readonly chopChainTotalAmount: number;
  readonly choppedPlayerId: string | null;
  readonly penaltyAmount: number;
  readonly refund: {
    readonly toPlayerId: string;
    readonly fromPlayerId: string;
    readonly amount: number;
  } | null;
}

/**
 * Máy trạng thái quản lý chuỗi Chặt Heo & Chặt Hàng (State Pattern FSM)
 */
export class ChopChainStateMachine {
  private currentState: RoundChopState = { type: 'NO_CHOP' };

  public get state(): RoundChopState {
    return this.currentState;
  }

  public reset(): void {
    this.currentState = { type: 'NO_CHOP' };
  }

  /**
   * Đánh giá và chuyển đổi trạng thái chặt khi có một nước đi mới trong vòng
   */
  public evaluateMove(params: EvaluateChopParams): ChopTransitionResult {
    const {
      isChopMove,
      chopperId,
      leadingMove,
      basePenalty,
      isCascadeRuleActive,
      currentRoundChopMoves
    } = params;

    // 1. Không phải nước chặt
    if (!isChopMove || leadingMove === null) {
      return {
        nextState: this.currentState,
        isChop: false,
        isCascadeChop: false,
        chopChainCount: 0,
        chopChainTotalAmount: 0,
        choppedPlayerId: null,
        penaltyAmount: 0,
        refund: null
      };
    }

    const choppedPlayerId = leadingMove.playerId;
    const prevChopMoves = currentRoundChopMoves.filter(m => m.isChop);

    // 2. Chặt đè chồng (Cascade Chop Chain)
    if (isCascadeRuleActive && prevChopMoves.length > 0) {
      const chainCount = prevChopMoves.length + 1;
      const lastChopMove = prevChopMoves[prevChopMoves.length - 1];

      let previousRefund: {
        toPlayerId: string;
        fromPlayerId: string;
        amount: number;
      } | null = null;
      let totalPenalty = basePenalty;

      if (lastChopMove && lastChopMove.choppedPlayerId) {
        const prevVictimId = lastChopMove.choppedPlayerId;
        const prevChopperId = lastChopMove.playerId;
        const prevAmount = lastChopMove.penaltyAmount || 0;

        previousRefund = {
          toPlayerId: prevVictimId,
          fromPlayerId: prevChopperId,
          amount: prevAmount
        };

        totalPenalty = prevAmount + basePenalty;
      }

      const nextState: CascadeChopChainState = {
        type: 'CASCADE_CHOP_CHAIN',
        chainCount,
        currentChopperPlayerId: chopperId,
        currentChoppedPlayerId: choppedPlayerId,
        originalVictimPlayerId: prevChopMoves[0]?.choppedPlayerId || choppedPlayerId,
        totalPenaltyAmount: totalPenalty,
        previousRefund: previousRefund ? {
          refundedPlayerId: previousRefund.toPlayerId,
          chargedPlayerId: previousRefund.fromPlayerId,
          amount: previousRefund.amount
        } : null,
        chopHistory: [...prevChopMoves]
      };

      this.currentState = nextState;

      return {
        nextState,
        isChop: true,
        isCascadeChop: true,
        chopChainCount: chainCount,
        chopChainTotalAmount: totalPenalty,
        choppedPlayerId,
        penaltyAmount: totalPenalty,
        refund: previousRefund
      };
    }

    // 3. Chặt đơn lẻ thông thường
    const singleChopState: SingleChopState = {
      type: 'SINGLE_CHOP',
      chopperPlayerId: chopperId,
      choppedPlayerId,
      penaltyAmount: basePenalty,
      move: leadingMove
    };

    this.currentState = singleChopState;

    return {
      nextState: singleChopState,
      isChop: true,
      isCascadeChop: false,
      chopChainCount: 1,
      chopChainTotalAmount: basePenalty,
      choppedPlayerId,
      penaltyAmount: basePenalty,
      refund: null
    };
  }
}
