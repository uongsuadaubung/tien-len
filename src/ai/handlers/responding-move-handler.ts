import { 
  BotDecisionHandler, 
  DecisionContext, 
  ValidMoveInfo, 
  BotDecision, 
  buildBotDecision,
  AI_HEURISTIC_WEIGHTS
} from '../decision-types';
import { isTwo } from '../../engine/card';
import { createDefaultGameRules } from '../../engine/types';
import { partitionHand } from '../hand-partitioner';
import { CfrEngine } from '../cfr-engine';
import { RuleDecisionContext } from '../rule-strategies';
import { BotCandidateEvaluation } from '../../engine/match-logger';
import { NashEquilibriumSolver } from '../solvers/nash-equilibrium-solver';
import { 
  evaluateChoppingScore,
  evaluateTwoManagementScore,
  evaluateComboIntegrityCost,
  evaluatePositionalAndAdaptationModifiers,
  calculateTurnsToClearHand
} from './heuristic-evaluators';

/**
 * 4. Handler Chặn Bài Vòng Đấu (Rule-Driven Responding Move Heuristic): Đỡ bài hoặc bỏ lượt
 */
export class RespondingMoveHeuristicHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (context.isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    const { hand, tracker, config, remainingPlayerCards, nextPlayerId, currentRoundLeadingMove, mctsMap } = context;
    const targetCombo = currentRoundLeadingMove?.combination || null;
    const partition = partitionHand(hand, config.handPartitioningOptimality);
    const twoSafety = tracker.getTwoSafetyReport();
    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const isNextPlayerOneCard = context.isNextPlayerOneCard ?? (remainingPlayerCards[nextPlayerId] === 1);
    const totalActive = Object.values(remainingPlayerCards).filter(cnt => cnt > 0).length;
    const hasExplicitSelf = config.id && Object.prototype.hasOwnProperty.call(remainingPlayerCards, config.id);
    const activeOpponentsCount = hasExplicitSelf
      ? Object.entries(remainingPlayerCards).filter(([id, cnt]) => id !== config.id && cnt > 0).length
      : Math.max(1, totalActive - 1);

    const validSingleMoves = validMoves.filter(m => m.combination.type === 'SINGLE');
    const maxSingleWeight = validSingleMoves.length > 0
      ? Math.max(...validSingleMoves.map(m => m.combination.highestCard.weight))
      : 0;

    const compositeStrategy = context.compositeRuleStrategy;
    const choppingRiskFactor = compositeStrategy ? compositeStrategy.getChoppingRiskFactor() : 1.0;
    const trapTendencyBonus = compositeStrategy ? compositeStrategy.getTrapTendencyBonus() : 0;

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
      rules: compositeStrategy ? compositeStrategy.rules : (context.rules || createDefaultGameRules()),
      handPartitioningOptimality: config.handPartitioningOptimality,
      antiLeaderAggression: config.antiLeaderAggression,
      tempoControl: config.tempoControl,
      trapTendency: config.trapTendency,
      riskAppetite: config.riskAppetite
    };

    // =========================================================================
    // CFR BLUFF PASS CHECK (Tung hỏa mù theo lý thuyết trò chơi CFR)
    // =========================================================================
    if (currentRoundLeadingMove && config.elo >= 1600 && !isEmergencyAntiLeader) {
      const targetPlayerId = currentRoundLeadingMove.playerId;
      const targetProfile = context.opponentProfiles?.[targetPlayerId] ?? null;
      const remainingTargetCards = remainingPlayerCards[targetPlayerId] ?? 10;

      const targetRank = targetCombo?.highestCard.rank ?? 0;
      const hasFreeTrashBeat = targetCombo?.type === 'SINGLE' && partition.trashCards.some(tc =>
        !isTwo(tc) &&
        tc.rank > targetRank &&
        (tc.rank - targetRank) <= 3
      );

      const opponentCardsList = Object.entries(remainingPlayerCards)
        .filter(([id]) => id !== config.id)
        .map(([, count]) => count);
      const minOpponentCards = opponentCardsList.length > 0 ? Math.min(...opponentCardsList) : remainingTargetCards;

      const bluffCheck = CfrEngine.getInstance().evaluateBluffPass(
        hand,
        currentRoundLeadingMove,
        targetPlayerId,
        targetProfile,
        config,
        remainingTargetCards,
        {
          activeOpponentsCount,
          gameMode: context.gameMode,
          hasFreeTrashBeat,
          minOpponentCards
        }
      );

      if (bluffCheck.shouldBluffPass) {
        return buildBotDecision('PASS', {
          reason: bluffCheck.reason,
          strategyUsed: 'CFR_BLUFF_PASS'
        });
      }
    }

    let bestMoveScore = -9999;
    let bestMove: ValidMoveInfo | null = null;

    const pendingCombosCardCount = partition.combinations.reduce((acc, c) => acc + c.cards.length, 0);
    const leadValueRatio = pendingCombosCardCount / Math.max(1, hand.length);

    const evaluatedCandidateList: BotCandidateEvaluation[] = [];

    for (const move of validMoves) {
      let score = 50;
      const reasons: string[] = ['Điểm cơ bản +50'];
      const containsTwo = move.cards.some(isTwo);

      // 1. Chặt Heo & Hàng
      const chopScore = evaluateChoppingScore(move, targetCombo, config, trapTendencyBonus);
      if (chopScore !== 0) {
        score += chopScore;
        reasons.push(`Chặt bài (${chopScore > 0 ? '+' : ''}${Math.round(chopScore)})`);
      }

      // 2. Quản lý Heo (2) & Tránh nguy cơ bị Chặt đè
      if (containsTwo) {
        const twoScore = evaluateTwoManagementScore(
          move,
          targetCombo,
          context,
          twoSafety,
          hand,
          pendingCombosCardCount,
          activeOpponentsCount,
          isEmergencyAntiLeader,
          choppingRiskFactor,
          config
        );
        score += twoScore;
        reasons.push(`Quản lý Heo (${twoScore > 0 ? '+' : ''}${Math.round(twoScore)})`);
      }

      // 3. Liên minh tạm thời dìm người dẫn đầu bàn 4 người (Semi-Cooperative Passing)
      if (
        config.semiCooperativeCooperation >= 0.5 &&
        (context.gameMode === 'TRADITIONAL' || context.gameMode === 'QUICK') &&
        isEmergencyAntiLeader &&
        activeOpponentsCount >= 2 &&
        currentRoundLeadingMove
      ) {
        const leaderId = Object.entries(remainingPlayerCards).find(([pid, cnt]) => pid !== config.id && cnt === 1)?.[0];
        const currentLeadingPlayerId = currentRoundLeadingMove.playerId;
        if (currentLeadingPlayerId !== leaderId) {
          const isAllyMoveStrong = currentRoundLeadingMove.combination.highestCard.rank >= 13 || isTwo(currentRoundLeadingMove.combination.highestCard);
          if (isAllyMoveStrong) {
            score -= AI_HEURISTIC_WEIGHTS.SEMI_COOP_PASS_DEDUCTION * config.semiCooperativeCooperation;
            reasons.push('Nhường đồng minh dìm người 1 lá');
          }
        }
      }

      // 4. Vị thế ghế ngồi & Bắt bài khắc chế
      const posScore = evaluatePositionalAndAdaptationModifiers(
        move,
        currentRoundLeadingMove,
        context,
        config,
        twoSafety,
        targetCombo,
        hand
      );
      if (posScore !== 0) {
        score += posScore;
        reasons.push(`Vị thế ghế ngồi (${posScore > 0 ? '+' : ''}${Math.round(posScore)})`);
      }

      // 5. Kiểm soát nhịp độ & Lợi thế bài thường
      if (config.tempoControl > 0.2 && !containsTwo) {
        score += leadValueRatio * AI_HEURISTIC_WEIGHTS.LEAD_TEMPO_FACTOR * config.tempoControl;

        // Chỉ thưởng điểm cướp cái bằng bài to (K, A) khi:
        // - Cờ tàn (hand.length <= 5 hoặc đánh xong còn <= 3 lá), HOẶC
        // - Đối phương đánh bài đã là bài to (targetCombo.highestCard.rank >= 11), HOẶC
        // - Bài còn lại có khả năng dứt điểm ngay (turns to clear <= 2).
        // Tuyệt đối không quăng K, A vào rác nhỏ (3..8) ở đầu ván khi còn nhiều bài!
        const isLateGameOrSprint = hand.length <= 5 || (hand.length - move.cards.length <= 3);
        const isTargetHighCard = targetCombo !== null && targetCombo.highestCard.rank >= 11;
        const turnsToClear = calculateTurnsToClearHand(hand, partition);
        const canFinishSoon = turnsToClear <= 2;

        if (move.combination.highestCard.rank >= 13 && (isLateGameOrSprint || isTargetHighCard || canFinishSoon)) {
          if (leadValueRatio > 0.35) {
            score += AI_HEURISTIC_WEIGHTS.HIGH_CARD_TEMPO_BONUS * config.tempoControl;
            reasons.push('Kiểm soát nhịp độ bài to (K/A)');
          }
        }
      }

      // 6. Áp đảo trong Solo 1v1
      if (activeOpponentsCount === 1 && !containsTwo) {
        score += AI_HEURISTIC_WEIGHTS.SOLO_NORMAL_MOVE_AGGRESSION * config.antiLeaderAggression;
      }

      // 7. Điểm điều chỉnh từ GameRules composite strategy
      if (compositeStrategy) {
        const ruleScore = compositeStrategy.getCompositeRespondingScoreModifier(
          move, 
          hand.length, 
          currentRoundLeadingMove, 
          ruleContext
        );
        if (ruleScore !== 0) {
          score += ruleScore;
          reasons.push(`Luật game (${ruleScore > 0 ? '+' : ''}${Math.round(ruleScore)})`);
        }
      }

      // 8. Đánh giá MCTS Rollouts
      if (mctsMap) {
        const key = move.cards.map(c => c.id).sort().join('_');
        if (mctsMap.has(key)) {
          const winRate = mctsMap.get(key)!;
          const mctsDelta = (winRate - 0.25) * 40;
          score += mctsDelta;
          reasons.push(`MCTS Winrate ${(winRate * 100).toFixed(0)}% (${mctsDelta > 0 ? '+' : ''}${Math.round(mctsDelta)})`);
        }
      }

      // 9. Cứu thua khẩn cấp & Chặn đầu đối thủ sắp dứt điểm cờ tàn
      if (isEmergencyAntiLeader) {
        score += AI_HEURISTIC_WEIGHTS.EMERGENCY_INTERCEPT_BONUS;
        reasons.push('Khẩn cấp chặn người 1 lá');
      } else {
        const remainingTargetCards = currentRoundLeadingMove ? (remainingPlayerCards[currentRoundLeadingMove.playerId] ?? 10) : 10;
        const isNearFinishTarget = remainingTargetCards <= 3 || (activeOpponentsCount === 1 && remainingTargetCards <= 4);
        if (isNearFinishTarget && !containsTwo) {
          score += AI_HEURISTIC_WEIGHTS.EMERGENCY_INTERCEPT_BONUS * 0.5;
          reasons.push('Chặn đầu đối thủ sắp dứt điểm');
        }
      }

      // 9b. Chặn đầu người kế tiếp báo 1 lá (chống đền bài sinh tử)
      if (isNextPlayerOneCard && move.combination.type === 'SINGLE') {
        if (move.combination.highestCard.weight === maxSingleWeight) {
          score += AI_HEURISTIC_WEIGHTS.ANTI_ONE_CARD_INTERCEPT_BONUS;
          reasons.push('Chặn đầu người kế tiếp 1 lá bằng lá bài to nhất (chống đền bài)');
        } else {
          const weightGap = maxSingleWeight - move.combination.highestCard.weight;
          const penalty = weightGap * AI_HEURISTIC_WEIGHTS.FEEDING_ONE_CARD_PENALTY_FACTOR;
          score -= penalty;
          reasons.push(`Nguy cơ mớm bài cho người 1 lá (-${Math.round(penalty)})`);
        }
      }

      // 10. Chi phí xé bài / bảo vệ cấu trúc bài
      const integrityCost = evaluateComboIntegrityCost(
        move,
        partition,
        hand,
        isEmergencyAntiLeader,
        activeOpponentsCount,
        config,
        context.isNextPlayerOneCard
      );
      if (integrityCost > 0) {
        score -= integrityCost;
        reasons.push(`Phá bộ/xé bài (-${Math.round(integrityCost)})`);
      }

      // 11. Ưu tiên tẩu rác
      const isTrash = move.cards.every(c => partition.trashCards.some(tc => tc.id === c.id));
      if (isTrash) {
        score += AI_HEURISTIC_WEIGHTS.TRASH_MOVE_REWARD;
        reasons.push('Tẩu rác lẻ');
      }

      // 12. Cờ tàn tăng tốc dứt điểm & Chống cạn kiệt lực cờ tàn (Endgame Trash Exhaustion)
      const moveCardIds = new Set(move.cards.map(c => c.id));
      const remainingAfterMove = hand.filter(c => !moveCardIds.has(c.id));
      const isExhaustedTrash =
        remainingAfterMove.length > 0 &&
        remainingAfterMove.length <= 3 &&
        !remainingAfterMove.some(isTwo) &&
        remainingAfterMove.every(c => c.rank <= 7) &&
        !containsTwo &&
        !move.isChop &&
        (move.cards.length > 1 || !tracker.isStrongestRemainingSingle(move.cards[0])) &&
        !isEmergencyAntiLeader &&
        !isNextPlayerOneCard;

      if (isExhaustedTrash) {
        // Phạt nặng hành vi "tự sát cờ tàn": đốt bài to để rồi kẹt lại toàn rác nhỏ hạt tiêu không có lối thoát
        const exhaustionPenalty = AI_HEURISTIC_WEIGHTS.ENDGAME_EXHAUSTION_PENALTY + (3 - remainingAfterMove.length) * 30;
        score -= exhaustionPenalty;
        reasons.push(`Nguy cơ cạn kiệt lực cờ tàn (-${Math.round(exhaustionPenalty)})`);
      } else if (hand.length <= 3 || hand.length - move.cards.length <= 2) {
        score += AI_HEURISTIC_WEIGHTS.ENDGAME_SPRINT_BONUS;
        reasons.push('Tăng tốc cờ tàn');
      }

      // 13. Khai thác lá bài to nhất tuyệt đối
      if (move.cards.length === 1 && tracker.isStrongestRemainingSingle(move.cards[0])) {
        if (hand.length <= 4 || leadValueRatio > 0.3) {
          score += AI_HEURISTIC_WEIGHTS.STRONGEST_SINGLE_BONUS * config.tempoControl;
          reasons.push('Cầm trịch lá to nhất bàn');
        }
      }

      // 14. Minimum Sufficient Beat (Đè bằng lá nhỏ nhất vừa đủ, bảo toàn bài to)
      // KHÔNG áp dụng hình phạt này khi người kế tiếp đang báo 1 lá (vì đang cần đè bằng lá to nhất để chống đền bài)!
      if (targetCombo && !move.cards.some(isTwo) && !(isNextPlayerOneCard && move.combination.type === 'SINGLE')) {
        const weightDiff = move.combination.highestCard.weight - targetCombo.highestCard.weight;
        score -= weightDiff * 0.75 * config.handPartitioningOptimality;
      }

      // 15. Nhận thức chiến lược cao cấp
      if (config.simulationLookahead >= 3) {
        if (move.combination.type === 'STRAIGHT' || move.combination.type === 'PAIR') {
          score += AI_HEURISTIC_WEIGHTS.TIER_LOOKAHEAD_BONUS;
        }
      }

      // 16. Sai số ngẫu nhiên của tân thủ (Tier 1/2)
      if (config.simulationLookahead === 0) {
        score += (Math.random() - 0.5) * 50;
      } else if (config.simulationLookahead === 1) {
        score += (Math.random() - 0.5) * 20;
      }

      evaluatedCandidateList.push({
        cards: [...move.cards],
        combinationType: move.combination.type,
        score: Math.round(score),
        reasons
      });

      if (score > bestMoveScore) {
        bestMoveScore = score;
        bestMove = move;
      }
    }

    const sortedCandidates = [...evaluatedCandidateList].sort((a, b) => b.score - a.score).slice(0, 5);

    // Nash Equilibrium Mixed-Strategy Check (cho Tier 8, 9 hoặc khi kích hoạt useNashEquilibrium)
    if (bestMove && bestMoveScore > 0 && (config.useNashEquilibrium || config.elo >= 2700)) {
      const containsTwo = bestMove.cards.some(isTwo);
      if (bestMove.isChop || containsTwo) {
        const nash = NashEquilibriumSolver.evaluateNashChoppingAction(
          bestMove,
          targetCombo,
          tracker,
          config,
          hand.length,
          activeOpponentsCount
        );
        if (!nash.shouldTakeAction) {
          return buildBotDecision('PASS', {
            reason: nash.reason,
            strategyUsed: 'NASH_MIXED_PASS',
            evaluationScore: Math.round(bestMoveScore),
            candidatesEvaluated: sortedCandidates
          });
        }
      }
    }

    if (bestMove && bestMoveScore > 0) {
      return buildBotDecision('PLAY', {
        cards: bestMove.cards,
        combination: bestMove.combination,
        reason: `Đánh giá Heuristics (${Math.round(bestMoveScore)} điểm): Đánh ${bestMove.combination.type} [ ${bestMove.cards.map(c => c.code).join(' ')} ]`,
        strategyUsed: 'HEURISTIC_EVALUATION',
        evaluationScore: Math.round(bestMoveScore),
        candidatesEvaluated: sortedCandidates
      });
    }

    return buildBotDecision('PASS', {
      reason: 'Chủ động bỏ lượt để giữ thế bài (các nước đi đều có điểm đánh giá <= 0)',
      strategyUsed: 'HEURISTIC_EVALUATION_PASS',
      evaluationScore: bestMoveScore > -9000 ? Math.round(bestMoveScore) : undefined,
      candidatesEvaluated: sortedCandidates
    });
  }
}
