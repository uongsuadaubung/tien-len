import { 
  BotDecisionHandler, 
  DecisionContext, 
  ValidMoveInfo, 
  BotDecision, 
  buildBotDecision 
} from '../decision-types';
import { Card } from '../../engine/types';
import { isTwo, sortCards } from '../../engine/card';
import { identifyCombination } from '../../engine/combinations';
import { MinimaxEndgameSolver } from '../solvers/minimax-endgame-solver';
import { BayesianCardInferenceEngine } from '../solvers/bayesian-card-tracker';

/**
 * 2. Handler Cờ Tàn (Endgame Solver): Xử lý dứt điểm khi còn <= 4 lá bài
 * Tích hợp Minimax Alpha-Beta Endgame Solver tìm kiếm chuỗi nước đi Forced-Win tất thắng 100%
 */
export class EndgameSolverHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    const { hand, isLeadMove, tracker, prohibitEndingWithTwo, config, remainingPlayerCards, currentRoundLeadingMove } = context;

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

    // 2. MINIMAX ALPHA-BETA ENDGAME SOLVER (Kích hoạt cho Bot Cao Thủ Tier 7, 8, 9)
    const activeOpponents = Object.entries(remainingPlayerCards).filter(([pid, count]) => pid !== config.id && count > 0);
    const totalOpponentCards = activeOpponents.reduce((sum, entry) => sum + entry[1], 0);

    if ((config.useMinimaxEndgame || config.elo >= 2400) && hand.length <= 5) {
      const unseenCards = tracker.getUnseenCards();
      const targetCombo = currentRoundLeadingMove?.combination || null;

      if (unseenCards.length <= 8 && totalOpponentCards <= 8 && unseenCards.length === totalOpponentCards) {
        const minimaxResult = MinimaxEndgameSolver.solve1v1(
          hand,
          unseenCards,
          isLeadMove,
          targetCombo,
          prohibitEndingWithTwo,
          10
        );

        if (minimaxResult.isForcedWin && minimaxResult.bestMove) {
          return buildBotDecision('PLAY', {
            cards: minimaxResult.bestMove.cards,
            combination: minimaxResult.bestMove.combination,
            reason: minimaxResult.reason,
            strategyUsed: 'MINIMAX_ALPHA_BETA_FORCED_WIN',
            evaluationScore: 1000
          });
        }
      }
    }

    // 2B. CỜ TÀN ĐỠ BÀI (RESPONDING ENDGAME FORCED WIN GRAB)
    // Khi còn <= 4 lá: Nếu có nước đi cướp cái bằng Heo hoặc bài to nhất, và các lá còn lại bảo đảm dứt điểm được
    if (!isLeadMove) {
      if (config.turnsToWinLookahead >= 0.5 && hand.length <= 4) {
        for (const m of validMoves) {
          const isTwoCard = m.cards.some(isTwo);
          const isDominant = isTwoCard ||
            (m.cards.length === 1 && tracker.isStrongestRemainingSingle(m.cards[0])) ||
            (m.combination.type === 'PAIR' && tracker.isStrongestRemainingPair(m.combination.highestCard.rank));

          if (isDominant) {
            const mIds = new Set(m.cards.map(c => c.id));
            const remaining = hand.filter(c => !mIds.has(c.id));
            const remainingCombo = remaining.length > 0 ? identifyCombination(remaining) : null;
            const canFinishRemaining = remaining.length === 0 ||
              (remaining.length === 1 && (!prohibitEndingWithTwo || !isTwo(remaining[0]))) ||
              (remainingCombo !== null && (!prohibitEndingWithTwo || !remainingCombo.cards.some(isTwo)));

            if (canFinishRemaining) {
              return buildBotDecision('PLAY', {
                cards: m.cards,
                combination: m.combination,
                reason: 'Cờ tàn dứt điểm: Cướp cái bằng bài to để lập tức về Nhất ở lượt sau',
                strategyUsed: 'ENDGAME_RESPONDING_WIN_GRAB',
                evaluationScore: 1000
              });
            }
          }
        }
      }
      return this.passToNext(context, validMoves);
    }

    // 3. Trường hợp cờ tàn 2 lá:
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

      // 1 lá Rác nhỏ + 1 Heo/quân to giữ cái:
      // Yêu cầu turnsToWinLookahead >= 0.35 (Tier 3+) để biết cách giữ Heo/bài to chốt hạ
      const canHoldFinisher = !prohibitEndingWithTwo || !isTwo(sortedHand[1]);
      if (
        config.turnsToWinLookahead >= 0.35 &&
        canHoldFinisher &&
        (isTwo(sortedHand[1]) || sortedHand[1].rank >= 13 || tracker.isStrongestRemainingSingle(sortedHand[1]))
      ) {
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

    // 4. Kỹ thuật cờ tàn 3 lá cho Cao Thủ (Tier 6+ với turnsToWinLookahead >= 0.85):
    // Trường hợp: 1 Đôi + 1 Lá chốt hạ (Heo hoặc lá to nhất bàn)
    if (config.turnsToWinLookahead >= 0.85 && hand.length === 3) {
      const sortedHand = sortCards(hand);
      let pairCards: Card[] | null = null;
      let kicker: Card | null = null;

      if (sortedHand[0].rank === sortedHand[1].rank) {
        pairCards = [sortedHand[0], sortedHand[1]];
        kicker = sortedHand[2];
      } else if (sortedHand[1].rank === sortedHand[2].rank) {
        pairCards = [sortedHand[1], sortedHand[2]];
        kicker = sortedHand[0];
      }

      if (pairCards && kicker) {
        const isKickerDominant = isTwo(kicker) || kicker.rank >= 14 || tracker.isStrongestRemainingSingle(kicker);
        const canFinishWithKicker = !prohibitEndingWithTwo || !isTwo(kicker);

        if (isKickerDominant && canFinishWithKicker) {
          const pairMove = validMoves.find(m => m.combination.type === 'PAIR' && m.cards[0].rank === pairCards![0].rank);
          if (pairMove) {
            return buildBotDecision('PLAY', {
              cards: pairMove.cards,
              combination: pairMove.combination,
              reason: 'Cờ tàn 3 lá cao cấp: Đánh đôi trước, giữ bài to chốt hạ',
              strategyUsed: 'ENDGAME_ADVANCED_LEAD'
            });
          }
        }
      }
    }

    return this.passToNext(context, validMoves);
  }
}
