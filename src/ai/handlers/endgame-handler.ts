import { 
  BotDecisionHandler, 
  DecisionContext, 
  ValidMoveInfo, 
  BotDecision, 
  buildBotDecision 
} from '../decision-types';
import { isTwo, sortCards } from '../../engine/card';

/**
 * 2. Handler Cờ Tàn (Endgame Solver): Xử lý dứt điểm khi còn <= 4 lá bài
 */
export class EndgameSolverHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    const { hand, isLeadMove, tracker, prohibitEndingWithTwo } = context;

    // 1. Nước đi dứt điểm ngay lập tức (Instant Win): Nếu có nước đi đánh hết sạch bài trên tay
    const instantWinMove = validMoves.find(m => m.cards.length === hand.length);
    if (instantWinMove) {
      return buildBotDecision('PLAY', {
        cards: instantWinMove.cards,
        combination: instantWinMove.combination,
        reason: 'Dứt điểm toàn bộ bài để về Nhất',
        strategyUsed: 'ENDGAME_INSTANT_WIN'
      });
    }

    if (!isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    // 2. Trường hợp cờ tàn 2 lá không cấm 2 cuối (hoặc cấm 2 cuối nhưng không có Heo):
    if (hand.length === 2) {
      const sortedHand = sortCards(hand);
      // Đôi 2 lá -> Đánh đôi về bài
      if (sortedHand[0].rank === sortedHand[1].rank) {
        const pairMove = validMoves.find(m => m.combination.type === 'PAIR');
        if (pairMove) {
          return buildBotDecision('PLAY', {
            cards: pairMove.cards,
            combination: pairMove.combination,
            reason: 'Cờ tàn 2 lá: Về đôi',
            strategyUsed: 'ENDGAME_PAIR_WIN'
          });
        }
      }

      // 1 lá Rác nhỏ + 1 Heo/quân to giữ cái (luật thông thường không cấm 2 cuối):
      if (!prohibitEndingWithTwo && (isTwo(sortedHand[1]) || sortedHand[1].rank >= 13 || tracker.isStrongestRemainingSingle(sortedHand[1]))) {
        const smallMove = validMoves.find(m => m.cards.length === 1 && m.cards[0].id === sortedHand[0].id);
        if (smallMove) {
          return buildBotDecision('PLAY', {
            cards: smallMove.cards,
            combination: smallMove.combination,
            reason: 'Cờ tàn 2 lá: Đánh rác nhỏ trước, giữ Heo/bài to chốt hạ',
            strategyUsed: 'ENDGAME_SMALL_LEAD'
          });
        }
      }
    }

    return this.passToNext(context, validMoves);
  }
}
