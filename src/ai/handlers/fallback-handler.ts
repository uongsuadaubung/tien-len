import { 
  BotDecisionHandler, 
  DecisionContext, 
  ValidMoveInfo, 
  BotDecision, 
  buildBotDecision 
} from '../decision-types';

/**
 * 5. Handler Dự Phòng Cuối Cùng (Fallback Decision Handler)
 */
export class FallbackDecisionHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (context.isLeadMove && validMoves.length > 0) {
      const first = validMoves[0];
      return buildBotDecision('PLAY', {
        cards: first.cards,
        combination: first.combination,
        reason: 'Nước đi dự phòng',
        strategyUsed: 'FALLBACK_LEAD'
      });
    }

    return buildBotDecision('PASS', {
      reason: 'Bỏ lượt',
      strategyUsed: 'FALLBACK_PASS'
    });
  }
}
