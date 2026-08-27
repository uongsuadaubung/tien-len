import { 
  BotDecisionHandler, 
  DecisionContext, 
  ValidMoveInfo, 
  BotDecision, 
  buildBotDecision 
} from '../decision-types';
import { RuleDecisionContext } from '../rule-strategies';

/**
 * 1. Handler Quy Tắc Khẩn Cấp (Emergency Rule Handler):
 * Xử lý tất cả các tình huống can thiệp khẩn cấp được kích hoạt từ Composite Rule Strategy:
 * - Thoát Cóng khẩn cấp khi chưa ra lá bài nào và có người sắp về (Emergency Unfreeze).
 * - Chống đền bài khi người kế tiếp báo 1 lá (Anti-Leader Intercept).
 * - Xả Heo cờ tàn để tránh thối Heo khi có luật Cấm 2 cuối.
 * - Đánh 3 Bích an toàn mở màn ván 1.
 */
export class EmergencyRuleHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    const compositeStrategy = context.compositeRuleStrategy;
    if (!compositeStrategy) {
      return this.passToNext(context, validMoves);
    }

    const ruleContext: RuleDecisionContext = {
      hand: context.hand,
      currentRoundLeadingMove: context.currentRoundLeadingMove,
      isFirstMoveOfGame: context.isFirstMoveOfGame,
      isLeadMove: context.isLeadMove,
      tracker: context.tracker,
      remainingPlayerCards: context.remainingPlayerCards,
      nextPlayerId: context.nextPlayerId,
      hasPlayedFirstCard: context.hasPlayedFirstCard,
      isNextPlayerOneCard: context.isNextPlayerOneCard,
      prohibitEndingWithTwo: context.prohibitEndingWithTwo,
      rules: compositeStrategy.rules,
      handPartitioningOptimality: context.config.handPartitioningOptimality,
      antiLeaderAggression: context.config.antiLeaderAggression,
      tempoControl: context.config.tempoControl,
      trapTendency: context.config.trapTendency,
      riskAppetite: context.config.riskAppetite
    };

    const emergency = compositeStrategy.evaluateEmergencyOverrides(ruleContext, validMoves);
    if (emergency) {
      return buildBotDecision(emergency.type, {
        cards: emergency.cards || null,
        combination: emergency.combination || null,
        reason: emergency.reason || null,
        strategyUsed: 'EMERGENCY_OVERRIDE'
      });
    }

    return this.passToNext(context, validMoves);
  }
}
