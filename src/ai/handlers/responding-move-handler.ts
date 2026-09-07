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
import { RuleDecisionContext } from '../rule-strategies';
import { BotCandidateEvaluation } from '../../engine/match-logger';
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
    const leaderWithOneCardId = Object.entries(remainingPlayerCards).find(([pid, cnt]) => pid !== config.id && cnt === 1)?.[0];
    const hasAnyOneCardLeader = leaderWithOneCardId !== undefined;
    const isDirectLeaderOneCard = leaderWithOneCardId !== undefined && currentRoundLeadingMove?.playerId === leaderWithOneCardId;
    const isNextPlayerOneCard = context.isNextPlayerOneCard ?? (remainingPlayerCards[nextPlayerId] === 1);
    const isEmergencyAntiLeader = isDirectLeaderOneCard || (isNextPlayerOneCard && targetCombo?.type === 'SINGLE');
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
    // CỬA 1: DỨT ĐIỂM TOÀN BỘ BÀI TRÊN TAY (Endgame Instant Win Gate)
    // =========================================================================
    const finishMove = validMoves.find(m => m.cards.length === hand.length);
    if (finishMove) {
      return buildBotDecision('PLAY', {
        cards: finishMove.cards,
        combination: finishMove.combination,
        reason: 'Cờ tàn dứt điểm: Đánh hết toàn bộ bài trên tay để về Nhất',
        strategyUsed: 'ENDGAME_INSTANT_WIN',
        evaluationScore: 1000
      });
    }

    // =========================================================================
    // CỬA 2: CHỐNG ĐỀN BÀI SINH TỬ KHI NGƯỜI KẾ TIẾP BÁO 1 LÁ (Anti-Feeding Gate)
    // Luật Tiến Lên Miền Nam: Khi người kế tiếp chỉ còn 1 lá và lượt này đánh bài lẻ,
    // bắt buộc phải đánh lá bài lẻ to nhất có thể để chặn đầu, chống đền bài cho cả làng.
    // =========================================================================
    if (
      isNextPlayerOneCard &&
      targetCombo?.type === 'SINGLE' &&
      validSingleMoves.length > 0
    ) {
      const highestSingleMove = validSingleMoves.reduce((best, cur) =>
        cur.combination.highestCard.weight > best.combination.highestCard.weight ? cur : best
      );
      return buildBotDecision('PLAY', {
        cards: highestSingleMove.cards,
        combination: highestSingleMove.combination,
        reason: `Chống đền bài: Bắt buộc đè lá bài to nhất [ ${highestSingleMove.cards.map(c => c.code).join(' ')} ] chặn người kế tiếp 1 lá`,
        strategyUsed: 'ANTI_ONE_CARD_INTERCEPT',
        evaluationScore: 1000
      });
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

      // 3. Nhường lượt chiến thuật khi đối thủ khác đã chặn người 1 lá (Tactical Pass on Intercepted Leader)
      // Khi một người chơi khác (không phải người 1 lá) vừa tung đòn chặn mạnh (Heo hoặc lá bài to >= 13),
      // việc ta đè tiếp bằng Heo của mình mà bản thân không thể về ngay (còn nhiều rác không dứt điểm được)
      // sẽ tự sát phá vỡ thế bài của chính ta và mớm chiến thắng cho người 1 lá khi ta phải đi đầu sau đó.
      if (
        config.semiCooperativeCooperation >= 0.5 &&
        activeOpponentsCount >= 2 &&
        currentRoundLeadingMove &&
        hasAnyOneCardLeader
      ) {
        const isMoveByOtherNonLeader = leaderWithOneCardId && currentRoundLeadingMove.playerId !== leaderWithOneCardId;
        const isLeadStrongBlock = currentRoundLeadingMove.combination.cards.some(isTwo) || currentRoundLeadingMove.combination.highestCard.rank >= 13;
        
        if (isMoveByOtherNonLeader && isLeadStrongBlock) {
          const moveUsesTwo = move.cards.some(isTwo);
          const turnsToClear = calculateTurnsToClearHand(hand, partition);
          const cannotFinishSoon = turnsToClear > 1 && (hand.length - move.cards.length >= 2);
          
          if (moveUsesTwo && cannotFinishSoon) {
            score -= AI_HEURISTIC_WEIGHTS.SEMI_COOP_PASS_DEDUCTION * config.semiCooperativeCooperation;
            reasons.push('Nhường lượt chiến thuật: Đã có người chặn người 1 lá, giữ Heo phòng thủ');
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
        const isLateGameOrSprint = hand.length <= 5 || (hand.length - move.cards.length <= 3);
        const isTargetHighCard = targetCombo !== null && targetCombo.highestCard.rank >= 11;
        const turnsToClear = calculateTurnsToClearHand(hand, partition);
        const canFinishSoon = turnsToClear <= 2;
        const hasHoldOpportunity = twoSafety.unseenTwosCount === 0 || hand.some(isTwo) || isLateGameOrSprint || isTargetHighCard;

        if (hasHoldOpportunity) {
          score += leadValueRatio * AI_HEURISTIC_WEIGHTS.LEAD_TEMPO_FACTOR * config.tempoControl;
        }

        // Chỉ thưởng điểm cướp cái bằng bài to (K, A) khi:
        // - Cờ tàn (hand.length <= 5 hoặc đánh xong còn <= 3 lá), HOẶC
        // - Đối phương đánh bài đã là bài to (targetCombo.highestCard.rank >= 11), HOẶC
        // - Bài còn lại có khả năng dứt điểm ngay (turns to clear <= 2).
        // Tuyệt đối không quăng K, A vào rác nhỏ (3..10) ở đầu ván khi còn nhiều bài!
        if (move.combination.highestCard.rank >= 13) {
          if (isLateGameOrSprint || isTargetHighCard || canFinishSoon) {
            if (leadValueRatio > 0.35) {
              score += AI_HEURISTIC_WEIGHTS.HIGH_CARD_TEMPO_BONUS * config.tempoControl;
              reasons.push('Kiểm soát nhịp độ bài to (K/A)');
            }
          }
        }

        // SOLO 1v1 CƯỚP CÁI: Trong 1v1, cướp cái bằng bài rác (không phá combo) để giành thế thượng phong
        if (activeOpponentsCount === 1 && !move.isChop && move.cards.length === 1) {
          const isTrashCard = !partition.combinations.some(combo => combo.cards.some(c => c.id === move.cards[0]?.id));
          if (isTrashCard) {
            score += AI_HEURISTIC_WEIGHTS.SOLO_NORMAL_MOVE_AGGRESSION * config.tempoControl;
            reasons.push('Solo 1v1: Cướp quyền Cầm Cái bằng rác lẻ');
          }
        }
      }

      // 7. Điểm điều chỉnh từ GameRules composite strategy (bao gồm TableScaleRuleStrategy)
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

      // 8. Đánh giá MCTS Rollouts (chuẩn hóa dynamic baseline theo số người chơi)
      if (mctsMap) {
        const key = move.cards.map(c => c.id).sort().join('_');
        if (mctsMap.has(key)) {
          const winRate = mctsMap.get(key)!;
          const baselineWinRate = 1 / Math.max(2, totalActive);
          const scaleFactor = totalActive <= 2 ? 15 : totalActive === 3 ? 30 : 12;
          const clampLimit = totalActive <= 2 ? 10 : totalActive === 3 ? 18 : 8;
          const mctsDelta = Math.max(-clampLimit, Math.min(clampLimit, (winRate - baselineWinRate) * scaleFactor));
          score += mctsDelta;
          reasons.push(`MCTS Winrate ${(winRate * 100).toFixed(0)}% (${mctsDelta > 0 ? '+' : ''}${Math.round(mctsDelta)})`);
        }
      }

      // 9. Cứu thua khẩn cấp & Chặn đầu đối thủ sắp dứt điểm cờ tàn
      const antiScale = Math.max(0.85, config.antiLeaderAggression ?? 0.85);
      if (isEmergencyAntiLeader) {
        score += AI_HEURISTIC_WEIGHTS.EMERGENCY_INTERCEPT_BONUS * antiScale;
        reasons.push(`Khẩn cấp chặn người 1 lá (x${antiScale.toFixed(2)})`);
      } else {
        const remainingTargetCards = currentRoundLeadingMove ? (remainingPlayerCards[currentRoundLeadingMove.playerId] ?? 10) : 10;
        const isNearFinishTarget = remainingTargetCards <= (activeOpponentsCount <= 2 ? 3 : 2);
        const turnsToClear = calculateTurnsToClearHand(hand, partition);
        const isSelfNearFinish = turnsToClear <= 2 || hand.length <= 4;
        // Bot tự thân ưu tiên về Nhất (Self-Interest):
        // Chỉ dồn lực chặn đối thủ sắp về khi BẢN THÂN CÓ KHẢ NĂNG CƯỚP CÁI ĐỂ VỀ NHẤT (isSelfNearFinish)
        // hoặc trong Solo 1v1 (activeOpponentsCount === 1).
        // Tuyệt đối KHÔNG tự sát làm bia đỡ đạn cho cả làng khi bản thân còn nhiều bài!
        const canSeizeWin = isSelfNearFinish || activeOpponentsCount === 1;

        if (isNearFinishTarget && canSeizeWin) {
          const threatBonus = AI_HEURISTIC_WEIGHTS.EMERGENCY_INTERCEPT_BONUS * 0.6 * antiScale;
          score += threatBonus;
          reasons.push(`Chặn đầu cướp cái dứt điểm về Nhất (${remainingTargetCards} lá, +${Math.round(threatBonus)})`);
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

      // 12a. TUYỆT ĐỐI KHÔNG ĐỂ LẠI HEO LÀM LÁ BÀI CUỐI KHI CẤM 2 CUỐI:
      if (
        context.prohibitEndingWithTwo &&
        remainingAfterMove.length > 0 &&
        remainingAfterMove.every(isTwo)
      ) {
        score -= 9999;
        reasons.push('Tử huyệt: Đánh nước này sẽ để lại Heo làm lá bài cuối (Cấm về bằng 2, -9999)');
      }

      const isExhaustedTrash =
        remainingAfterMove.length >= 2 &&
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
      } else if (hand.length <= 3 || remainingAfterMove.length <= 1) {
        score += AI_HEURISTIC_WEIGHTS.ENDGAME_SPRINT_BONUS;
        reasons.push('Tăng tốc cờ tàn dứt điểm');
      }

      // 12b. Áp đảo dứt điểm cờ tàn trong Solo 1v1
      if (activeOpponentsCount === 1 && !isExhaustedTrash && (hand.length <= 2 || remainingAfterMove.length <= 1) && !containsTwo) {
        score += 150;
        reasons.push('Cờ tàn Solo: Quyết liệt cướp cái về bài (+150)');
      }

      // 13. Khai thác lá bài to nhất tuyệt đối
      if (move.cards.length === 1 && tracker.isStrongestRemainingSingle(move.cards[0])) {
        const isTargetHighCard = targetCombo !== null && targetCombo.highestCard.rank >= 11;
        const turnsToClear = calculateTurnsToClearHand(hand, partition);
        if (hand.length <= 5 || isTargetHighCard || turnsToClear <= 2) {
          score += AI_HEURISTIC_WEIGHTS.STRONGEST_SINGLE_BONUS * config.tempoControl;
          reasons.push('Cầm trịch lá to nhất bàn');
        }
      }

      // 14. Minimum Sufficient Beat (Đè bằng lá nhỏ nhất vừa đủ, bảo toàn bài to)
      // Đóng vai trò tie-breaker nhẹ nhàng (hệ số 0.2), ưu tiên lá nhỏ hơn vừa đủ nhưng KHÔNG ép bot bỏ lượt
      // KHÔNG áp dụng hình phạt này khi người kế tiếp đang báo 1 lá (vì đang cần đè bằng lá to nhất để chống đền bài)!
      if (targetCombo && !move.cards.some(isTwo) && !(isNextPlayerOneCard && move.combination.type === 'SINGLE')) {
        const weightDiff = move.combination.highestCard.weight - targetCombo.highestCard.weight;
        score -= weightDiff * 0.2;
      }

      // 15. Nhận thức chiến lược cao cấp
      if (config.simulationLookahead >= 3) {
        if (move.combination.type === 'STRAIGHT' || move.combination.type === 'PAIR') {
          score += AI_HEURISTIC_WEIGHTS.TIER_LOOKAHEAD_BONUS;
        }
      }

      // 16. Tối ưu hóa số nhịp về bài (Turns-to-Clear Lookahead):
      // Bot có tầm nhìn chiến lược (turnsToWinLookahead >= 0.35) đánh giá xem nước đi có giúp rút ngắn nhịp về bài không
      if (config.turnsToWinLookahead >= 0.35) {
        const remainingHand = hand.filter(c => !move.cards.some(mc => mc.id === c.id));
        const currentTurns = calculateTurnsToClearHand(hand, partition);
        const nextPartition = partitionHand(remainingHand, config.handPartitioningOptimality);
        const nextTurns = calculateTurnsToClearHand(remainingHand, nextPartition);
        const turnsReduced = currentTurns - nextTurns;
        if (turnsReduced > 0) {
          score += turnsReduced * 35 * config.turnsToWinLookahead;
          reasons.push(`Rút ngắn ${turnsReduced} nhịp về bài (+${Math.round(turnsReduced * 35 * config.turnsToWinLookahead)})`);
        } else if (turnsReduced < 0 && hand.length <= 6) {
          score += turnsReduced * 30 * config.turnsToWinLookahead;
          reasons.push(`Kéo dài ${-turnsReduced} nhịp về bài (${Math.round(turnsReduced * 30 * config.turnsToWinLookahead)})`);
        }
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

    const isCrucialEndgameMove = hand.length <= 2 && bestMove !== null;

    if (bestMove && (bestMoveScore > 0 || isCrucialEndgameMove)) {
      return buildBotDecision('PLAY', {
        cards: bestMove.cards,
        combination: bestMove.combination,
        reason: isCrucialEndgameMove && bestMoveScore <= 0
          ? `Cờ tàn sinh tử: Bắt buộc đè bài dứt điểm [ ${bestMove.cards.map(c => c.code).join(' ')} ]`
          : `Đánh giá Heuristics (${Math.round(bestMoveScore)} điểm): Đánh ${bestMove.combination.type} [ ${bestMove.cards.map(c => c.code).join(' ')} ]`,
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
