import { Card, Combination, GameRules, PlayedMove, createDefaultGameRules } from '../engine/types';
import { compareCards, isTwo, sortCards } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { isValidMove } from '../engine/validator';
import { BotConfig } from './types';
import { CardTracker } from './card-tracker';
import { partitionHand } from './hand-partitioner';
import { MctsSolver } from './mcts-solver';
import { CfrEngine } from './cfr-engine';
import { OpponentBehaviorProfile, OpponentProfiler } from './opponent-profiler';
import { 
  CompositeRuleStrategy, 
  RuleDecisionContext, 
  type ValidMoveInfo, 
  resolveCompositeRuleStrategy 
} from './rule-strategies';
import { BotCandidateEvaluation, BotDecisionTelemetry } from '../engine/match-logger';

export type { ValidMoveInfo };

export interface DecisionContext {
  hand: Card[];
  currentRoundLeadingMove: PlayedMove | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
  tracker: CardTracker;
  config: BotConfig;
  remainingPlayerCards: Record<string, number>;
  nextPlayerId: string; // BẮT BUỘC: ID người chơi kế tiếp theo chiều kim đồng hồ
  rules: GameRules;    // BẮT BUỘC: Toàn bộ tập luật active chi phối ván đấu
  hasPlayedFirstCard: boolean; // BẮT BUỘC: Trạng thái đã ra lá bài nào chưa (dùng cho luật Cóng)
  isNextPlayerOneCard: boolean;
  prohibitEndingWithTwo: boolean;
  gameMode: string;    // Chế độ chơi
  mctsMap: Map<string, number> | null;
  compositeRuleStrategy: CompositeRuleStrategy | null;
  opponentProfiles: Record<string, OpponentBehaviorProfile> | null;
}

export interface BotDecision {
  type: 'PLAY' | 'PASS';
  cards: Card[] | null;
  combination: Combination | null;
  reason: string | null;
  strategyUsed: string | null;
  evaluationScore: number | null;
  candidatesEvaluated: BotCandidateEvaluation[] | null;
  telemetry: BotDecisionTelemetry | null;
}

export function buildBotDecision(
  type: 'PLAY' | 'PASS',
  opts: {
    cards?: Card[] | null;
    combination?: Combination | null;
    reason?: string | null;
    strategyUsed?: string | null;
    evaluationScore?: number | null;
    candidatesEvaluated?: BotCandidateEvaluation[] | null;
    telemetry?: BotDecisionTelemetry | null;
  } = {}
): BotDecision {
  return {
    type,
    cards: opts.cards ?? null,
    combination: opts.combination ?? null,
    reason: opts.reason ?? null,
    strategyUsed: opts.strategyUsed ?? null,
    evaluationScore: opts.evaluationScore ?? null,
    candidatesEvaluated: opts.candidatesEvaluated ?? null,
    telemetry: opts.telemetry ?? null
  };
}

// ============================================================================
// BẢNG HẰNG SỐ TRỌNG SỐ ĐIỂM CHIẾN THUẬT AI (CENTRALIZED HEURISTIC WEIGHTS)
// ============================================================================

export const AI_HEURISTIC_WEIGHTS = {
  // 1. Mức Khẩn Cấp & Sinh Tử
  EMERGENCY_SACRIFICE_REWARD: 160,
  EMERGENCY_INTERCEPT_BONUS: 150,
  EMERGENCY_TWO_DUMP_BONUS: 200,
  SEMI_COOP_PASS_DEDUCTION: 600,
  HEO_GREED_PASS_DEDUCTION: 600,

  // 2. Chặt Heo & Gài Bẫy
  BASE_CHOP_REWARD: 280,
  CHOP_TWO_BONUS: 60,
  TRAP_TENDENCY_FACTOR: 50,
  BOMB_INFERENCE_FACTOR: 120,

  // 3. Quản Lý & Bảo Toàn Heo (2)
  PROHIBIT_ENDING_TWO_DUMP: 260,
  TWO_BEATS_TWO_REWARD: 100,
  ENDGAME_TWO_LEAD_GRAB: 160,
  SOLO_TWO_AGGRESSION: 80,
  TEMPO_TWO_BEATS_ACE: 120,
  WASTING_TWO_BASE_PENALTY: 180,
  WASTING_TWO_ON_LOW_PENALTY: 100,

  // 4. Vị Thế Ghế Ngồi & Thích Ứng
  POSITIONAL_UPSTREAM_INTERCEPT: 90,
  SOLO_NORMAL_MOVE_AGGRESSION: 80,
  LEAD_TEMPO_FACTOR: 150,
  HIGH_CARD_TEMPO_BONUS: 100,

  // 5. Cờ Tàn & Về Bài
  ENDGAME_SPRINT_BONUS: 120,
  STRONGEST_SINGLE_BONUS: 100,
  TRASH_MOVE_REWARD: 10,
  TIER_LOOKAHEAD_BONUS: 25,

  // 6. Chi Phí Phá Vỡ Bộ Bài (Combo Breaking Penalty)
  BREAK_BOMB_COST: 120,
  BREAK_STRAIGHT_MIDDLE_COST: 35,
  BREAK_STRAIGHT_END_COST: 8,
  BREAK_TRIPLE_COST: 12,
  BREAK_PAIR_COST: 6,
  BREAK_3_STRAIGHT_COST: 18
} as const;

/**
 * Thuật toán tổ hợp tổng quát: Sinh tất cả các tập con k phần tử từ một mảng
 */
export function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map(item => [item]);

  const results: T[][] = [];
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      results.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return results;
}

/**
 * Tích Descartes tổng quát giữa các danh sách
 */
export function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [];
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap(a => curr.map(c => [...a, c])),
    [[]]
  );
}

/**
 * Thuật toán tổng quát sinh toàn bộ tập con các lá bài có thể tạo thành nước đi hợp lệ
 */
export function generateCandidateMoves(hand: Card[]): Card[][] {
  const sorted = sortCards(hand);
  const candidates: Card[][] = [];

  // 1. Gom nhóm lá bài theo Rank
  const rankMap = new Map<number, Card[]>();
  for (const c of sorted) {
    if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
    rankMap.get(c.rank)!.push(c);
  }

  // 2. Thuật toán tổng quát sinh các tổ hợp cùng Bậc (Rác k=1, Đôi k=2, Sám k=3, Tứ Quý k=4)
  for (const [_, cards] of rankMap) {
    for (let k = 1; k <= cards.length; k++) {
      for (const subset of getCombinations(cards, k)) {
        candidates.push(subset);
      }
    }
  }

  // 3. Thuật toán tổng quát sinh Sảnh (Độ dài từ 3 đến 12 lá bài liên tiếp, không chứa Heo)
  const nonTwoRanks = Array.from(rankMap.keys())
    .filter(r => r <= 14) // Chỉ 3..A (không lấy Heo 15)
    .sort((a, b) => a - b);

  for (let i = 0; i < nonTwoRanks.length; i++) {
    const consecutiveRanks: number[] = [nonTwoRanks[i]];
    for (let j = i + 1; j < nonTwoRanks.length; j++) {
      if (nonTwoRanks[j] === consecutiveRanks[consecutiveRanks.length - 1] + 1) {
        consecutiveRanks.push(nonTwoRanks[j]);
        if (consecutiveRanks.length >= 3) {
          const rankCardLists = consecutiveRanks.map(r => rankMap.get(r)!);
          const straightSubsets = cartesianProduct(rankCardLists);
          candidates.push(...straightSubsets);
        }
      } else {
        break;
      }
    }
  }

  // 4. Thuật toán tổng quát sinh Đôi Thông (Từ 3 đôi thông trở lên liên tiếp, không chứa Heo)
  const pairRanks = Array.from(rankMap.entries())
    .filter(([r, cards]) => r <= 14 && cards.length >= 2)
    .map(([r]) => r)
    .sort((a, b) => a - b);

  for (let i = 0; i < pairRanks.length; i++) {
    const consecutivePairRanks: number[] = [pairRanks[i]];
    for (let j = i + 1; j < pairRanks.length; j++) {
      if (pairRanks[j] === consecutivePairRanks[consecutivePairRanks.length - 1] + 1) {
        consecutivePairRanks.push(pairRanks[j]);
        if (consecutivePairRanks.length >= 3) {
          const pairChoices = consecutivePairRanks.map(r => getCombinations(rankMap.get(r)!, 2));
          const seqPairSubsets = cartesianProduct(pairChoices).map(pairs => pairs.flat());
          candidates.push(...seqPairSubsets);
        }
      } else {
        break;
      }
    }
  }

  return candidates;
}

// ============================================================================
// CHAIN OF RESPONSIBILITY: CÁC HANDLER QUYẾT ĐỊNH NƯỚC ĐI
// ============================================================================

export abstract class BotDecisionHandler {
  protected nextHandler: BotDecisionHandler | null = null;

  public setNext(handler: BotDecisionHandler): BotDecisionHandler {
    this.nextHandler = handler;
    return handler;
  }

  public abstract handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null;

  protected passToNext(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (this.nextHandler) {
      return this.nextHandler.handle(context, validMoves);
    }
    return null;
  }
}

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
 * 3. Handler Ra Bài Cầm Cái (Rule-Driven, Hand-Strength & Grandmaster Governed Lead Move Heuristic):
 * Tự động đồng bộ chính sách ra bài với Lực bài, Nhịp độ, Bẫy Nhử Mồi & Bẻ bài:
 * - Chặn đầu đền bài (Dynamic Sacrifice): Bẻ bài đánh lá to nhất tuyệt đối khi người kế bên còn 1 lá.
 * - Gài bẫy nhử mồi (Baiting Trap): Đánh Át/Heo đen khi ôm Hàng để câu Heo đối thủ Chặt Chồng.
 * - Tăng tốc dứt điểm (Turns-to-Win): Đẩy nhanh tiến độ khi còn <= 2 nhịp dứt điểm.
 * - Thế Bài Thượng Đẳng / Nắm >= 2 Heo: "Bảo Kê Tẩu Rác", dùng rác nhỏ thăm dò, giữ Heo bọc lót cướp cái dứt điểm.
 * - PreferLongestComboFirst (Đếm Lá / Sát phạt tốc độ): Xả sảnh dài & bộ thường (3..A) nhiều lá trước (KHÔNG xả Heo).
 * - DumpSmallTrashFirst (Truyền Thống / Elo): Tẩu rác nhỏ 3, 4, 5... trước để xả bài yếu và thăm dò.
 */
export class LeadMoveHeuristicHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (!context.isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    const { hand, config, tracker, remainingPlayerCards, nextPlayerId, mctsMap } = context;
    const partition = partitionHand(hand, config.handPartitioningOptimality);
    const handStrength = evaluateHandStrength(hand, partition);
    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const isNextPlayerOneCard = context.isNextPlayerOneCard ?? (remainingPlayerCards[nextPlayerId] === 1);

    const nonTwoTrash = partition.trashCards.filter(c => !isTwo(c));
    const regularNonTwoCombos = partition.combinations.filter(
      c =>
        c.type !== 'FOUR_OF_A_KIND' &&
        c.type !== 'THREE_PAIRS_SEQUENTIAL' &&
        c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
        c.type !== 'FIVE_PAIRS_SEQUENTIAL' &&
        !c.cards.some(isTwo) // KHÔNG BAO GIỜ coi Heo/Đôi Heo/Sám Heo là combo thường để xả bừa bãi!
    );

    // =========================================================================
    // 0. CHẶN ĐẦU ĐỀN BÀI SINH TỬ BẰNG BẺ BÀI (DYNAMIC SACRIFICE / SPLITTING)
    // =========================================================================
    if (isNextPlayerOneCard) {
      if (config.dynamicHandSacrifice >= 0.4) {
        const sortedHand = sortCards(hand);
        const absoluteHighestCard = sortedHand[sortedHand.length - 1];
        const splitMove = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === absoluteHighestCard.id
        );
        if (splitMove) {
          return buildBotDecision('PLAY', {
            cards: splitMove.cards,
            combination: splitMove.combination,
            reason: `Bẻ bài chặn đền bài (Dynamic Sacrifice): Xé bài đánh lá to nhất ${absoluteHighestCard.rank} chặn người 1 lá`,
            strategyUsed: 'DYNAMIC_SACRIFICE'
          });
        }
      }
      if (nonTwoTrash.length > 0) {
        const largestTrash = nonTwoTrash[nonTwoTrash.length - 1];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === largestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: 'Chặn đầu người kế tiếp báo 1 lá bằng rác lớn nhất',
            strategyUsed: 'ANTI_ONE_CARD_INTERCEPT'
          });
        }
      }
    }

    // =========================================================================
    // 1. KHAI THÁC ĐIỂM YẾU & BẮT BÀI ĐỐI THỦ (IN-MATCH ADAPTATION & WEAKNESS EXPLOITATION)
    // =========================================================================
    if ((config.memoryDepth >= 0.4 || config.inMatchAdaptationRate >= 0.3) && regularNonTwoCombos.length > 0 && !isEmergencyAntiLeader && !isNextPlayerOneCard) {
      const targetOpponentId = (remainingPlayerCards[nextPlayerId] > 0)
        ? nextPlayerId
        : Object.entries(remainingPlayerCards)
            .filter(([pid, count]) => pid !== config.id && count > 0)
            .sort((a, b) => a[1] - b[1])[0]?.[0];

      if (targetOpponentId) {
        const passedCombos = tracker.getOpponentWeaknessCombos(targetOpponentId);
        const targetProfile = context.opponentProfiles?.[targetOpponentId] ?? OpponentProfiler.getInstance().getProfile(targetOpponentId);

        for (const combo of regularNonTwoCombos) {
          let matchesWeakness = passedCombos.has(combo.type);
          if (combo.type === 'STRAIGHT' && tracker.hasOpponentPassedOnStraightLength(targetOpponentId, combo.length)) {
            matchesWeakness = true;
          }
          if (config.inMatchAdaptationRate >= 0.3 && targetProfile) {
            const passRate = targetProfile.passRateByType[combo.type] || 0;
            if (passRate >= 0.45) {
              matchesWeakness = true;
            }
          }

          if (matchesWeakness) {
            const move = validMoves.find(
              m => m.combination.type === combo.type &&
                   m.cards.length === combo.cards.length &&
                   m.combination.highestCard.rank === combo.highestCard.rank
            );
            if (move) {
              return buildBotDecision('PLAY', {
                cards: move.cards,
                combination: move.combination,
                reason: `Khai thác điểm yếu & bắt bài (In-Match Adaptation): Đánh ${combo.type} do đối thủ (${targetOpponentId}) có tỉ lệ bỏ lượt cao`,
                strategyUsed: 'IN_MATCH_ADAPTATION'
              });
            }
          }
        }
      }
    }

    // =========================================================================
    // 2. GÀI BẪY NHỬ MỒI CHẶT HEO (BAITING & CHOPPING TRAP)
    // =========================================================================
    const hasBomb = partition.combinations.some(
      c =>
        c.type === 'FOUR_OF_A_KIND' ||
        c.type === 'THREE_PAIRS_SEQUENTIAL' ||
        c.type === 'FOUR_PAIRS_SEQUENTIAL'
    );
    if (
      hasBomb &&
      config.baitingTendency >= 0.4 &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard &&
      hand.length >= 6
    ) {
      const singleMoves = validMoves.filter(m => m.combination.type === 'SINGLE');
      const baitMove = singleMoves.find(
        m => m.cards[0].rank === 14 || (isTwo(m.cards[0]) && (m.cards[0].suit === 'SPADES' || m.cards[0].suit === 'CLUBS'))
      );
      if (baitMove) {
        return buildBotDecision('PLAY', {
          cards: baitMove.cards,
          combination: baitMove.combination,
          reason: `Gài bẫy nhử mồi (Baiting Trap): Đánh ${baitMove.cards[0].rank} khi đang ôm Hàng Chặt để câu Heo đối thủ`,
          strategyUsed: 'BAITING_TRAP'
        });
      }
    }

    // =========================================================================
    // 3. QUẢN LÝ NHỊP ĐỘ DỰA TRÊN SỐ NHỊP VỀ BÀI (TURNS-TO-WIN TEMPO ACCELERATION)
    // =========================================================================
    const turnsToWin = calculateTurnsToClearHand(hand, partition);
    if (
      config.turnsToWinLookahead >= 0.5 &&
      turnsToWin <= 2 &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard
    ) {
      if (regularNonTwoCombos.length > 0) {
        const sortedCombos = [...regularNonTwoCombos].sort((a, b) => b.cards.length - a.cards.length);
        const bestSprintCombo = sortedCombos[0];
        const move = validMoves.find(
          m =>
            m.combination.type === bestSprintCombo.type &&
            m.cards.length === bestSprintCombo.cards.length &&
            m.combination.highestCard.id === bestSprintCombo.highestCard.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: `Tăng tốc dứt điểm (Turns-to-Win: ${turnsToWin} nhịp): Xả ${bestSprintCombo.type} để về bài thần tốc`,
            strategyUsed: 'TEMPO_SPRINT'
          });
        }
      }
    }

    // =========================================================================
    // 4. CHIẾN THUẬT DỰA TRÊN LỰC BÀI (HAND STRENGTH GOVERNED LEAD POLICY)
    // =========================================================================

    // THẾ BÀI THƯỢNG ĐẲNG / ÁP ĐẢO (DOMINANT HAND: Nắm >= 2-3 Heo hoặc Hàng):
    // Chiến thuật: "Bảo Kê Tẩu Rác". Có Heo giữ cái thì tẩu rác nhỏ trước để rảnh tay dứt điểm về Nhất!
    if (
      (handStrength.tier === 'DOMINANT' || (handStrength.tier === 'STRONG' && handStrength.twoCount >= 2)) &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard
    ) {
      if (nonTwoTrash.length > 0) {
        const smallestTrash = nonTwoTrash[0];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === smallestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: `Lực bài áp đảo (${handStrength.twoCount} Heo): Tẩu rác nhỏ ${smallestTrash.rank} dưới sự bảo kê của Heo`,
            strategyUsed: 'DOMINANT_TRASH_DISPOSAL'
          });
        }
      }
      // Nếu đã sạch rác (nonTwoTrash = 0): Xả sảnh/bộ dài nhất để dứt điểm!
      if (regularNonTwoCombos.length > 0) {
        const sortedCombos = [...regularNonTwoCombos].sort((a, b) => {
          if (b.cards.length !== a.cards.length) return b.cards.length - a.cards.length;
          return a.highestCard.weight - b.highestCard.weight;
        });
        const bestCombo = sortedCombos[0];
        const move = validMoves.find(
          m =>
            m.combination.type === bestCombo.type &&
            m.cards.length === bestCombo.cards.length &&
            m.combination.highestCard.id === bestCombo.highestCard.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: `Lực bài áp đảo đã sạch rác: Xả bộ dài nhất (${bestCombo.type} ${bestCombo.cards.length} lá) dứt điểm`,
            strategyUsed: 'DOMINANT_COMBO_CLEAR'
          });
        }
      }
    }

    // =========================================================================
    // 3. CHÍNH SÁCH RA BÀI HỢP THÀNH TỪ CÁC RULE ACTIVE (COMPOSITE LEAD POLICY)
    // =========================================================================
    const compositeStrategy = context.compositeRuleStrategy;
    const leadPolicy = compositeStrategy ? compositeStrategy.getCompositeLeadPolicy() : {
      preferLongestComboFirst: false,
      dumpSmallTrashFirst: true,
      aggressiveFinisherPush: false
    };

    // A. Ưu tiên xả Sảnh dài (4-6 lá) & Bộ thường nhiều lá trước (Luật Đếm Lá - Không xả Heo)
    if (leadPolicy.preferLongestComboFirst && regularNonTwoCombos.length > 0 && !isEmergencyAntiLeader && !isNextPlayerOneCard) {
      const sortedCombos = [...regularNonTwoCombos].sort((a, b) => {
        if (b.cards.length !== a.cards.length) {
          return b.cards.length - a.cards.length;
        }
        return a.highestCard.weight - b.highestCard.weight;
      });

      const longestCombo = sortedCombos[0];
      const move = validMoves.find(
        m =>
          m.combination.type === longestCombo.type &&
          m.cards.length === longestCombo.cards.length &&
          m.combination.highestCard.id === longestCombo.highestCard.id
      );
      if (move) {
        return buildBotDecision('PLAY', {
          cards: move.cards,
          combination: move.combination,
          reason: `Chiến thuật Rule-Driven: Xả tổ hợp dài nhất (${longestCombo.type} ${longestCombo.cards.length} lá) trước để giảm số lá tồn`,
          strategyUsed: 'RULE_DRIVEN_LONGEST_COMBO'
        });
      }
    }

    // B. TẨU RÁC (TRASH DISPOSAL - Luật Truyền Thống / Đấu Hạng Elo)
    if (nonTwoTrash.length > 0) {
      if (!isNextPlayerOneCard) {
        // Positional Awareness (Tie-breaker an toàn đì nhà dưới):
        // Nếu Bot có positionalAwareness >= 0.4 và có >= 2 lá rác độc lập:
        // Bot chọn lá rác tầm trung (8, 9, 10, J) trong danh sách nonTwoTrash để đì nhà dưới
        // nếu nhà dưới có ít bài (<= 6 lá) hoặc có thói quen tẩu rác nhỏ (trashLeadRate >= 0.6)!
        if (config.positionalAwareness >= 0.4 && nonTwoTrash.length >= 2) {
          const nextCardsCount = remainingPlayerCards[nextPlayerId] ?? 10;
          const nextProfile = context.opponentProfiles?.[nextPlayerId] ?? OpponentProfiler.getInstance().getProfile(nextPlayerId);
          const isNextVulnerable = nextCardsCount <= 6 || (nextProfile && nextProfile.trashLeadRate >= 0.6);

          if (isNextVulnerable) {
            const mediumTrash = [...nonTwoTrash].reverse().find(c => c.rank >= 8 && c.rank <= 11);
            if (mediumTrash) {
              const move = validMoves.find(
                m => m.combination.type === 'SINGLE' && m.cards[0].id === mediumTrash.id
              );
              if (move) {
                return buildBotDecision('PLAY', {
                  cards: move.cards,
                  combination: move.combination,
                  reason: `Ý thức vị thế ghế ngồi (Positional Awareness): Đánh rác tầm trung ${mediumTrash.rank} để đì nhà dưới (${nextPlayerId})`,
                  strategyUsed: 'POSITIONAL_TRASH_LEAD'
                });
              }
            }
          }
        }

        // Mặc định an toàn: Tống rác nhỏ nhất (3, 4, 5...)
        const smallestTrash = nonTwoTrash[0];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === smallestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: 'Tẩu rác nhỏ nhất để thăm dò và xả bài yếu',
            strategyUsed: 'SMALLEST_TRASH_DISPOSAL'
          });
        }
      } else {
        // Người kế tiếp báo 1 lá -> CHẶN ĐẦU: Đánh lá rác TO NHẤT
        const largestTrash = nonTwoTrash[nonTwoTrash.length - 1];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === largestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: 'Chặn đầu người kế tiếp báo 1 lá bằng rác lớn nhất',
            strategyUsed: 'ANTI_ONE_CARD_LARGEST_TRASH'
          });
        }
      }
    }

    // C. ĐÁNH BỘ NHỎ NHẤT / SẢNH NHỎ TRƯỚC (Không xả Hàng Chặt & Không xả Heo)
    if (regularNonTwoCombos.length > 0) {
      const sortedCombos = [...regularNonTwoCombos].sort((a, b) => {
        return a.highestCard.weight - b.highestCard.weight;
      });

      const smallestCombo = sortedCombos[0];
      const move = validMoves.find(
        m =>
          m.combination.type === smallestCombo.type &&
          m.cards.length === smallestCombo.cards.length &&
          m.combination.highestCard.id === smallestCombo.highestCard.id
      );
      if (move) {
        return buildBotDecision('PLAY', {
          cards: move.cards,
          combination: move.combination,
          reason: `Đánh bộ nhỏ ${smallestCombo.type} ${smallestCombo.cards.length} lá để giữ nhịp`,
          strategyUsed: 'SMALLEST_COMBO_LEAD'
        });
      }
    }

    // =========================================================================
    // 3. CỜ TÀN HOẶC MCTS: TỐI ƯU NƯỚC ĐI
    // =========================================================================
    if (mctsMap && mctsMap.size > 0) {
      let bestMove = validMoves[0];
      let bestWinRate = -1;
      for (const m of validMoves) {
        const isTwoMove = m.cards.some(isTwo);
        const nonTwoMovesExist = validMoves.some(vm => !vm.cards.some(isTwo));
        if (isTwoMove && nonTwoMovesExist && hand.length > 3) {
          continue;
        }

        const key = m.cards.map(c => c.id).sort().join('_');
        const winRate = mctsMap.get(key) || 0;
        if (winRate > bestWinRate) {
          bestWinRate = winRate;
          bestMove = m;
        }
      }
      return buildBotDecision('PLAY', {
        cards: bestMove.cards,
        combination: bestMove.combination,
        reason: 'MCTS tối ưu nước đi cờ tàn',
        strategyUsed: 'MCTS_LEAD_OPTIMIZATION'
      });
    }

    // =========================================================================
    // 4. NƯỚC ĐI MẶC ĐỊNH AN TOÀN (Tránh đánh Heo/Hàng nếu còn nước đi thường)
    // =========================================================================
    const nonTwoMoves = validMoves.filter(m => !m.cards.some(isTwo));
    const nonChopMoves = (nonTwoMoves.length > 0 ? nonTwoMoves : validMoves).filter(
      m => m.combination.type !== 'THREE_PAIRS_SEQUENTIAL' &&
           m.combination.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
           m.combination.type !== 'FOUR_OF_A_KIND'
    );

    const safeDefault = nonChopMoves.length > 0 ? nonChopMoves[0] : (nonTwoMoves.length > 0 ? nonTwoMoves[0] : validMoves[0]);
    return buildBotDecision('PLAY', {
      cards: safeDefault.cards,
      combination: safeDefault.combination,
      reason: 'Nước đi an toàn mặc định',
      strategyUsed: 'SAFE_DEFAULT_LEAD'
    });
  }
}

// ============================================================================
// SUB-EVALUATORS CHẤM ĐIỂM CHIẾN THUẬT (MODULAR EVALUATION HELPERS)
// ============================================================================

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
  move: ValidMoveInfo,
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

/**
 * 4. Handler Chặn Bài Vòng Đấu (Rule-Driven Responding Move Heuristic): Đỡ bài hoặc bỏ lượt
 */
export class RespondingMoveHeuristicHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (context.isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    const { hand, tracker, config, remainingPlayerCards, currentRoundLeadingMove, mctsMap } = context;
    const targetCombo = currentRoundLeadingMove?.combination || null;
    const partition = partitionHand(hand, config.handPartitioningOptimality);
    const twoSafety = tracker.getTwoSafetyReport();
    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const activeOpponentsCount = Object.entries(remainingPlayerCards).filter(([id, cnt]) => id !== config.id && cnt > 0).length;

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

      const bluffCheck = CfrEngine.getInstance().evaluateBluffPass(
        hand,
        currentRoundLeadingMove,
        targetPlayerId,
        targetProfile,
        config,
        remainingTargetCards
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
        if (leadValueRatio > 0.35 && move.combination.highestCard.rank >= 13) {
          score += AI_HEURISTIC_WEIGHTS.HIGH_CARD_TEMPO_BONUS * config.tempoControl;
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

      // 9. Cứu thua khẩn cấp
      if (isEmergencyAntiLeader) {
        score += AI_HEURISTIC_WEIGHTS.EMERGENCY_INTERCEPT_BONUS;
        reasons.push('Khẩn cấp chặn người 1 lá');
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

      // 12. Cờ tàn tăng tốc dứt điểm
      if (hand.length <= 3 || hand.length - move.cards.length <= 2) {
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
      if (targetCombo && !move.cards.some(isTwo)) {
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
      evaluationScore: bestMoveScore > -9000 ? Math.round(bestMoveScore) : null,
      candidatesEvaluated: sortedCandidates
    });
  }
}

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

/**
 * Xây dựng chuỗi Chain of Responsibility hoàn chỉnh cho AI
 */
export function buildBotDecisionChain(): BotDecisionHandler {
  const emergencyRule = new EmergencyRuleHandler();
  const endgame = new EndgameSolverHandler();
  const leadMove = new LeadMoveHeuristicHandler();
  const responseMove = new RespondingMoveHeuristicHandler();
  const fallback = new FallbackDecisionHandler();

  emergencyRule
    .setNext(endgame)
    .setNext(leadMove)
    .setNext(responseMove)
    .setNext(fallback);

  return emergencyRule;
}

const DEFAULT_DECISION_CHAIN = buildBotDecisionChain();

/**
 * Hàm quyết định nước đi của AI Bot áp dụng Kiến trúc Rule-First & Chain of Responsibility
 */
export function makeBotDecision(context: DecisionContext): BotDecision {
  const { 
    hand, 
    currentRoundLeadingMove, 
    isFirstMoveOfGame, 
    isLeadMove, 
    config, 
    remainingPlayerCards, 
    tracker 
  } = context;

  // 1. Tự động định vị và hợp thành Composite Rule Strategy từ GameRules hoặc GameMode
  const compositeRuleStrategy = context.compositeRuleStrategy 
    || resolveCompositeRuleStrategy(context.rules, context.gameMode);
  const activeRules = compositeRuleStrategy.rules;

  const isProhibitEndingWithTwo = context.prohibitEndingWithTwo !== undefined
    ? context.prohibitEndingWithTwo
    : (context.rules ? (activeRules.gameFlow.prohibitEndingWithTwo ?? false) : false);
  const allowFourPairsCutAnytime = activeRules.chopping.allowFourPairsCutAnytime ?? true;

  // 2. Sinh danh sách nước đi hợp lệ
  const candidateMoveCards = generateCandidateMoves(hand);
  const targetCombo = currentRoundLeadingMove?.combination || null;

  const validMoves: ValidMoveInfo[] = [];
  for (const cards of candidateMoveCards) {
    const isFinishing = cards.length === hand.length;
    const valResult = isValidMove(
      cards,
      targetCombo,
      isFirstMoveOfGame,
      isLeadMove,
      false,
      allowFourPairsCutAnytime,
      isFinishing,
      isProhibitEndingWithTwo
    );
    if (valResult.valid && valResult.combination) {
      validMoves.push({
        cards,
        combination: valResult.combination,
        isChop: valResult.isChop || false
      });
    }
  }

  // 3. Nếu không có nước đi hợp lệ nào: Buộc phải Bỏ lượt (hoặc đánh 1 lá nếu là Lead)
  if (validMoves.length === 0) {
    let emptyDecision: BotDecision;
    if (isLeadMove && hand.length > 0) {
      if (isProhibitEndingWithTwo && hand.every(isTwo)) {
        emptyDecision = {
          type: 'PASS',
          cards: null,
          combination: null,
          reason: 'Chỉ còn Heo trên tay, không thể đánh do luật cấm về bằng Heo (2)',
          strategyUsed: 'PROHIBIT_TWO_PASS',
          evaluationScore: null,
          candidatesEvaluated: null,
          telemetry: null
        };
      } else {
        const nonTwos = hand.filter(c => !isTwo(c));
        const chosenCard = nonTwos.length > 0 ? sortCards(nonTwos)[0] : sortCards(hand)[0];
        const singleCombo = identifyCombination([chosenCard])!;
        emptyDecision = {
          type: 'PLAY',
          cards: [chosenCard],
          combination: singleCombo,
          reason: 'Buộc phải ra bài khi đang cầm cái',
          strategyUsed: 'FORCED_LEAD_PLAY',
          evaluationScore: null,
          candidatesEvaluated: null,
          telemetry: null
        };
      }
    } else {
      emptyDecision = {
        type: 'PASS',
        cards: null,
        combination: null,
        reason: 'Không có nước đi hợp lệ',
        strategyUsed: 'NO_VALID_MOVES_PASS',
        evaluationScore: null,
        candidatesEvaluated: null,
        telemetry: null
      };
    }

    const handTwoCount = hand.filter(isTwo).length;
    const partition = partitionHand(hand, config.handPartitioningOptimality);
    const trashCount = partition.trashCards.length;

    const telemetry: BotDecisionTelemetry = {
      chosenReason: emptyDecision.reason || 'Bỏ lượt',
      strategyUsed: emptyDecision.strategyUsed || 'NO_VALID_MOVES',
      heuristicScore: null,
      evaluatedCandidatesCount: 0,
      topCandidates: [],
      mctsWinRate: null,
      mctsSimulations: config.mctsSimulations || null,
      handStrengthTwoCount: handTwoCount,
      handStrengthTrashCount: trashCount,
      remainingOpponentCards: { ...remainingPlayerCards }
    };

    return {
      ...emptyDecision,
      telemetry
    };
  }

  // 4. Chạy MCTS nếu Bot có cấu hình mctsSimulations > 0 (Tier 4 / Tier 5)
  const mctsMap: Map<string, number> = new Map();
  if (config.mctsSimulations && config.mctsSimulations > 0 && validMoves.length > 0) {
    const evaluations = MctsSolver.evaluateCandidateMoves(
      config.id,
      hand,
      validMoves,
      tracker,
      remainingPlayerCards,
      config.mctsSimulations
    );
    for (const ev of evaluations) {
      const key = ev.moveCards.map(c => c.id).sort().join('_');
      mctsMap.set(key, ev.winRate);
    }
  }

  const opponentProfiles = context.opponentProfiles || OpponentProfiler.getInstance().getAllProfiles();

  const enrichedContext: DecisionContext = {
    ...context,
    rules: activeRules,
    prohibitEndingWithTwo: isProhibitEndingWithTwo,
    compositeRuleStrategy,
    mctsMap,
    opponentProfiles
  };

  // 5. Xử lý qua Rule-First Chain of Responsibility
  const decision = DEFAULT_DECISION_CHAIN.handle(enrichedContext, validMoves) || {
    type: isLeadMove ? 'PLAY' : 'PASS',
    cards: isLeadMove ? validMoves[0].cards : null,
    combination: isLeadMove ? validMoves[0].combination : null,
    reason: isLeadMove ? 'Nước đi mặc định khi cầm cái' : 'Bỏ lượt mặc định',
    strategyUsed: 'SAFE_DEFAULT',
    evaluationScore: null,
    candidatesEvaluated: null,
    telemetry: null
  };

  const handTwoCount = hand.filter(isTwo).length;
  const partition = partitionHand(hand, config.handPartitioningOptimality);
  const trashCount = partition.trashCards.length;

  let mctsBestWinRate: number | null = null;
  if (decision.cards && decision.cards.length > 0 && mctsMap.size > 0) {
    const key = decision.cards.map(c => c.id).sort().join('_');
    if (mctsMap.has(key)) {
      mctsBestWinRate = mctsMap.get(key) || null;
    }
  }

  const telemetry: BotDecisionTelemetry = {
    chosenReason: decision.reason || (decision.type === 'PLAY' ? 'Đánh bài theo chiến thuật' : 'Bỏ lượt'),
    strategyUsed: decision.strategyUsed || (isLeadMove ? 'LEAD_STRATEGY' : 'RESPONSE_STRATEGY'),
    heuristicScore: decision.evaluationScore !== undefined ? decision.evaluationScore : null,
    evaluatedCandidatesCount: validMoves.length,
    topCandidates: decision.candidatesEvaluated || (decision.cards ? [{
      cards: decision.cards,
      combinationType: decision.combination?.type || null,
      score: decision.evaluationScore || 100,
      reasons: [decision.reason || 'Quyết định từ chiến thuật ưu tiên']
    }] : []),
    mctsWinRate: mctsBestWinRate,
    mctsSimulations: config.mctsSimulations || null,
    handStrengthTwoCount: handTwoCount,
    handStrengthTrashCount: trashCount,
    remainingOpponentCards: { ...remainingPlayerCards }
  };

  return {
    ...decision,
    telemetry
  };
}
