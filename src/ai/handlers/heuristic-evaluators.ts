import { Card, Combination, PlayedMove } from '../../engine/types';
import { isTwo, sortCards } from '../../engine/card';
import { BotConfig } from '../types';
import { CardTracker } from '../card-tracker';
import { partitionHand } from '../hand-partitioner';
import { OpponentProfiler } from '../opponent-profiler';
import { 
  AI_HEURISTIC_WEIGHTS, 
  DecisionContext, 
  ValidMoveInfo 
} from '../decision-types';

export interface HandStrengthMetrics {
  score: number;
  tier: 'DOMINANT' | 'STRONG' | 'BALANCED' | 'WEAK';
  twoCount: number;
  bombCount: number;
  nonTwoTrashCount: number;
  comboCardsCount: number;
  hasUnbeatableFinish: boolean;
}

/**
 * Đánh giá lực bài (Hand Strength Index: 0 -> 100):
 * Xác định thế bài đang Áp Đảo (Dominant), Mạnh (Strong), Cân Bằng (Balanced) hay Yếu (Weak)
 * để chỉ đạo chiến thuật ra bài thích ứng:
 * - Bài Áp Đảo / Nắm nhiều Heo: "Bảo Kê Tẩu Rác", KHÔNG BAO GIỜ xả Heo/Sám Heo trước khi còn rác nhỏ.
 * - Bài Yếu / Nguy cơ Cóng: Xả nhanh sảnh dài/bộ nhiều lá để tẩu bài.
 */
export function evaluateHandStrength(
  hand: Card[],
  partition: ReturnType<typeof partitionHand>
): HandStrengthMetrics {
  const twoCount = hand.filter(isTwo).length;
  const nonTwoTrash = partition.trashCards.filter(c => !isTwo(c));
  const nonTwoTrashCount = nonTwoTrash.length;

  const bombs = partition.combinations.filter(
    c =>
      c.type === 'FOUR_OF_A_KIND' ||
      c.type === 'THREE_PAIRS_SEQUENTIAL' ||
      c.type === 'FOUR_PAIRS_SEQUENTIAL' ||
      c.type === 'FIVE_PAIRS_SEQUENTIAL'
  );
  const bombCount = bombs.length;

  const comboCardsCount = partition.combinations.reduce((sum, c) => sum + c.cards.length, 0);

  let score = 30;

  // 1. Heo & Hàng (Lực kiểm soát bàn)
  if (twoCount === 1) score += 12;
  else if (twoCount === 2) score += 28;
  else if (twoCount === 3) score += 55; // Cầm 3 con Heo là thế bài siêu đẳng!
  else if (twoCount >= 4) score += 80;

  score += bombCount * 22;

  // 2. Rác & Cơ cấu bài
  if (nonTwoTrashCount === 0) score += 25;
  else if (nonTwoTrashCount === 1) score += 15;
  else if (nonTwoTrashCount === 2) score += 5;
  else if (nonTwoTrashCount >= 5) score -= 15;

  // 3. Tỉ lệ bài nằm trong combo
  if (hand.length > 0) {
    const comboRatio = comboCardsCount / hand.length;
    score += Math.round(comboRatio * 20);
  }

  score = Math.max(0, Math.min(100, score));

  let tier: 'DOMINANT' | 'STRONG' | 'BALANCED' | 'WEAK' = 'WEAK';
  if (score >= 68 || twoCount >= 3 || (twoCount >= 2 && bombCount >= 1)) {
    tier = 'DOMINANT';
  } else if (score >= 50 || twoCount >= 2 || bombCount >= 1) {
    tier = 'STRONG';
  } else if (score >= 35) {
    tier = 'BALANCED';
  }

  const hasUnbeatableFinish =
    (nonTwoTrashCount === 0 && (twoCount >= 2 || bombCount >= 1)) ||
    (hand.length <= 3 && twoCount >= 1);

  return {
    score,
    tier,
    twoCount,
    bombCount,
    nonTwoTrashCount,
    comboCardsCount,
    hasUnbeatableFinish
  };
}

/**
 * Tính toán số nhịp cần thiết để xả sạch bài (Turns-to-Win / Distance to Clearance):
 * Mỗi tổ hợp (Sảnh, Đôi, Sám, Hàng) hoặc mỗi lá rác lẻ loi được tính là 1 nhịp đánh độc lập.
 */
export function calculateTurnsToClearHand(
  hand: Card[],
  partition: ReturnType<typeof partitionHand>
): number {
  if (hand.length === 0) return 0;
  const nonTwoTrash = partition.trashCards.filter(c => !isTwo(c));
  const twoSingles = hand.filter(isTwo);
  const regularCombos = partition.combinations.filter(c => !c.cards.some(isTwo));
  const twoCombos = partition.combinations.filter(c => c.cards.some(isTwo));

  let turns = regularCombos.length + nonTwoTrash.length;
  if (twoCombos.length > 0) {
    turns += twoCombos.length;
  } else {
    turns += twoSingles.length;
  }
  return Math.max(1, turns);
}

/**
 * 1. Chấm điểm thưởng Chặt Heo / Chặt Hàng
 */
export function evaluateChoppingScore(
  move: ValidMoveInfo,
  targetCombo: Combination | null,
  config: BotConfig,
  trapTendencyBonus: number
): number {
  if (!move.isChop) return 0;
  let chopScore = AI_HEURISTIC_WEIGHTS.BASE_CHOP_REWARD;
  if (targetCombo && isTwo(targetCombo.highestCard)) {
    chopScore += AI_HEURISTIC_WEIGHTS.CHOP_TWO_BONUS;
  }
  chopScore += config.trapTendency * AI_HEURISTIC_WEIGHTS.TRAP_TENDENCY_FACTOR + trapTendencyBonus;
  return chopScore;
}

/**
 * 2. Chấm điểm chiến thuật Ra Heo (2) & Tránh nguy cơ bị Chặt đè
 */
export function evaluateTwoManagementScore(
  _move: ValidMoveInfo,
  targetCombo: Combination | null,
  context: DecisionContext,
  twoSafety: ReturnType<CardTracker['getTwoSafetyReport']>,
  hand: Card[],
  pendingCombosCardCount: number,
  activeOpponentsCount: number,
  isEmergencyAntiLeader: boolean,
  choppingRiskFactor: number,
  config: BotConfig
): number {
  let scoreMod = 0;
  const nonTwosCount = hand.filter(c => !isTwo(c)).length;
  const isTargetTwo = targetCombo && targetCombo.cards.some(isTwo);

  // Suy luận xác suất Hàng Chặt ẩn ngoài bàn (Bomb Inference)
  const bombProb = context.tracker.getBombProbability();
  if (config.bombInferenceRate >= 0.4 && bombProb > 0.35) {
    scoreMod -= bombProb * config.bombInferenceRate * AI_HEURISTIC_WEIGHTS.BOMB_INFERENCE_FACTOR;
  }

  if (context.prohibitEndingWithTwo && nonTwosCount > 0 && hand.length <= 4) {
    // Cờ tàn có luật Cấm 2 cuối: Đè bằng Heo để cướp cái rồi dứt điểm bằng các lá thường còn lại!
    scoreMod += AI_HEURISTIC_WEIGHTS.PROHIBIT_ENDING_TWO_DUMP;
  } else if (isTargetTwo) {
    // Đối phương ĐÁNH HEO -> Bot có Heo to hơn đè là hợp lý
    scoreMod += AI_HEURISTIC_WEIGHTS.TWO_BEATS_TWO_REWARD;
    if (config.simulationLookahead >= 2 && twoSafety.riskScore > 50) {
      scoreMod -= (twoSafety.riskScore - 50) * choppingRiskFactor * (1 - config.riskAppetite);
    }
  } else {
    // Đối phương KHÔNG ĐÁNH HEO (đối phương đánh bài thường 3..A):
    if (isEmergencyAntiLeader) {
      scoreMod += AI_HEURISTIC_WEIGHTS.EMERGENCY_TWO_DUMP_BONUS * config.antiLeaderAggression;
    } else if (hand.length <= 4) {
      // Cờ tàn (<= 4 lá): Xả Heo cướp cái để dứt điểm về Nhất
      scoreMod += AI_HEURISTIC_WEIGHTS.ENDGAME_TWO_LEAD_GRAB;
    } else if (activeOpponentsCount === 1) {
      // Solo 1v1: Cướp cái chắc chắn được quyền đi tiếp
      scoreMod += AI_HEURISTIC_WEIGHTS.SOLO_TWO_AGGRESSION * config.antiLeaderAggression;
    } else if (
      config.tempoControl >= 0.8 &&
      pendingCombosCardCount >= hand.length - 2 &&
      targetCombo &&
      targetCombo.highestCard.rank === 14
    ) {
      // Bot Cao Thủ (Tier 4/5): Chỉ xả Heo đè Át khi TOÀN BỘ bài còn lại đều là Bộ bài dứt điểm được
      scoreMod += AI_HEURISTIC_WEIGHTS.TEMPO_TWO_BEATS_ACE * config.tempoControl;
    } else {
      // Phạt điểm BẢO TOÀN HEO cực mạnh để KHÔNG tự ý vứt Heo đè rác
      scoreMod -= AI_HEURISTIC_WEIGHTS.WASTING_TWO_BASE_PENALTY;
      if (targetCombo && targetCombo.highestCard.rank < 14) {
        scoreMod -= AI_HEURISTIC_WEIGHTS.WASTING_TWO_ON_LOW_PENALTY;
      }
    }
  }

  return scoreMod;
}

/**
 * 3. Tính toán chi phí phá vỡ bộ bài (Combo Integrity Cost & Absolute Bomb Protection)
 */
export function evaluateComboIntegrityCost(
  move: ValidMoveInfo,
  partition: ReturnType<typeof partitionHand>,
  hand: Card[],
  isEmergencyAntiLeader: boolean,
  activeOpponentsCount: number,
  config: BotConfig,
  isNextPlayerOneCard: boolean
): number {
  const moveCardIds = new Set(move.cards.map(c => c.id));
  let breaksImportantCombo = false;
  let comboBreakSeverity = 0;
  let breaksBomb = false;

  for (const combo of partition.combinations) {
    const comboCardIds = combo.cards.map((c: Card) => c.id);
    const overlapCount = comboCardIds.filter((id: string) => moveCardIds.has(id)).length;
    if (overlapCount > 0 && overlapCount < combo.cards.length) {
      breaksImportantCombo = true;

      if (
        combo.type === 'FOUR_OF_A_KIND' ||
        combo.type === 'THREE_PAIRS_SEQUENTIAL' ||
        combo.type === 'FOUR_PAIRS_SEQUENTIAL'
      ) {
        comboBreakSeverity += AI_HEURISTIC_WEIGHTS.BREAK_BOMB_COST;
        breaksBomb = true;
      } else if (combo.type === 'STRAIGHT' && combo.cards.length >= 4) {
        const sortedComboCards = sortCards(combo.cards);
        const isEndCard =
          move.cards.length === 1 &&
          (move.cards[0].id === sortedComboCards[0].id ||
           move.cards[0].id === sortedComboCards[sortedComboCards.length - 1].id);
        comboBreakSeverity += isEndCard
          ? AI_HEURISTIC_WEIGHTS.BREAK_STRAIGHT_END_COST
          : AI_HEURISTIC_WEIGHTS.BREAK_STRAIGHT_MIDDLE_COST;
      } else if (combo.type === 'STRAIGHT' && combo.cards.length === 3) {
        comboBreakSeverity += AI_HEURISTIC_WEIGHTS.BREAK_3_STRAIGHT_COST;
      } else if (combo.type === 'TRIPLE') {
        comboBreakSeverity += AI_HEURISTIC_WEIGHTS.BREAK_TRIPLE_COST;
      } else if (combo.type === 'PAIR') {
        comboBreakSeverity += AI_HEURISTIC_WEIGHTS.BREAK_PAIR_COST;
      }
    }
  }

  if (!breaksImportantCombo) return 0;

  let totalCost = 0;

  // MÀNG LỌC BẢO VỆ HÀNG CHẶT TUYỆT ĐỐI TRONG 1V1 VÀ CỜ TÀN:
  // Tuyệt đối không xé Tứ Quý / Đôi Thông để đè lá rác thường trừ khi là đòn dứt điểm hoặc cứu thua khẩn cấp!
  if (breaksBomb) {
    const isFinishingMove = move.cards.length === hand.length;
    const isUrgentSave = isEmergencyAntiLeader || isNextPlayerOneCard;
    if (!isFinishingMove && !isUrgentSave) {
      totalCost += AI_HEURISTIC_WEIGHTS.BREAK_BOMB_COST * 2;
    }
  }

  const penaltyDiscount =
    hand.length <= 4 || isEmergencyAntiLeader || (activeOpponentsCount === 1 && !breaksBomb)
      ? 0.0
      : 0.7;

  totalCost += comboBreakSeverity * config.handPartitioningOptimality * penaltyDiscount;

  // Nếu bẻ bài để cứu thua sinh tử: Thưởng điểm giảm nhẹ
  if (config.dynamicHandSacrifice >= 0.4 && (isEmergencyAntiLeader || isNextPlayerOneCard)) {
    totalCost -= AI_HEURISTIC_WEIGHTS.EMERGENCY_SACRIFICE_REWARD * config.dynamicHandSacrifice;
  }

  return totalCost;
}

/**
 * 4. Chấm điểm điều chỉnh Vị Thế Ghế Ngồi & Thích Ứng Khắc Chế Đối Thủ
 */
export function evaluatePositionalAndAdaptationModifiers(
  move: ValidMoveInfo,
  currentRoundLeadingMove: PlayedMove | null,
  context: DecisionContext,
  config: BotConfig,
  twoSafety: ReturnType<CardTracker['getTwoSafetyReport']>,
  targetCombo: Combination | null,
  hand: Card[]
): number {
  let mod = 0;
  const containsTwo = move.cards.some(isTwo);

  // Ý thức vị thế ghế ngồi (Cắt mớm bài nhà trên)
  if (
    config.positionalAwareness >= 0.4 &&
    currentRoundLeadingMove &&
    !containsTwo &&
    !move.isChop &&
    move.combination.type === 'SINGLE'
  ) {
    const nextCards = context.remainingPlayerCards[context.nextPlayerId] ?? 10;
    const leadingCardRank = currentRoundLeadingMove.combination.highestCard.rank;
    if (leadingCardRank <= 6 && nextCards <= 4) {
      mod += AI_HEURISTIC_WEIGHTS.POSITIONAL_UPSTREAM_INTERCEPT * config.positionalAwareness;
    }
  }

  // Tự động bắt bài & khắc chế đối thủ (In-Match Adaptation)
  if (
    config.inMatchAdaptationRate >= 0.4 &&
    move.isChop &&
    currentRoundLeadingMove
  ) {
    const targetPid = currentRoundLeadingMove.playerId;
    const targetProfile = context.opponentProfiles?.[targetPid] ?? OpponentProfiler.getInstance().getProfile(targetPid);
    if (targetProfile && targetProfile.heoGreedRate >= 0.65 && hand.length > 4) {
      const isTargetBlackTwo = targetCombo && isTwo(targetCombo.highestCard) && (targetCombo.highestCard.suit === 'SPADES' || targetCombo.highestCard.suit === 'CLUBS');
      const hasUnseenRedTwos = twoSafety.unseenRedTwosCount > 0;
      if (isTargetBlackTwo && hasUnseenRedTwos) {
        mod -= AI_HEURISTIC_WEIGHTS.HEO_GREED_PASS_DEDUCTION * config.inMatchAdaptationRate;
      }
    }
  }

  return mod;
}
