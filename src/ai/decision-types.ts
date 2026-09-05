import { Card, Combination, GameRules, PlayedMove } from '../engine/types';
import { sortCards } from '../engine/card';
import { BotConfig } from './types';
import { CardTracker } from './card-tracker';
import { OpponentBehaviorProfile } from './opponent-profiler';
import { CompositeRuleStrategy, type ValidMoveInfo } from './rule-strategies';
import { BotCandidateEvaluation, BotDecisionTelemetry } from '../engine/match-logger';

export type { ValidMoveInfo };

/**
 * Ngữ cảnh ra quyết định toàn diện của Bot AI
 */
export interface BaseDecisionContext {
  hand: Card[];
  isFirstMoveOfGame: boolean;
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

export interface LeadDecisionContext extends BaseDecisionContext {
  isLeadMove: true;
  currentRoundLeadingMove?: PlayedMove | null;
}

export interface FollowDecisionContext extends BaseDecisionContext {
  isLeadMove: false;
  currentRoundLeadingMove: PlayedMove; // ✅ BẢO ĐẢM 100% NON-NULLABLE KHI ĐÈ BÀI
}

export type DecisionContext = LeadDecisionContext | FollowDecisionContext;

export function createDecisionContext(params: BaseDecisionContext & {
  isLeadMove: boolean;
  currentRoundLeadingMove?: PlayedMove | null;
}): DecisionContext {
  if (params.isLeadMove || !params.currentRoundLeadingMove) {
    return {
      ...params,
      isLeadMove: true,
      currentRoundLeadingMove: params.currentRoundLeadingMove ?? null
    };
  }
  return {
    ...params,
    isLeadMove: false,
    currentRoundLeadingMove: params.currentRoundLeadingMove
  };
}

export { 
  type BotDecision, 
  type PlayBotDecision, 
  type PassBotDecision,
  type BotThinkingPhaseStatus 
} from './thinking-phases';
import type { BotDecision } from './thinking-phases';

export interface BuildBotDecisionOptions {
  cards?: readonly Card[];
  combination?: Combination;
  reason?: string;
  strategyUsed?: string;
  evaluationScore?: number;
  candidatesEvaluated?: readonly BotCandidateEvaluation[];
  telemetry?: BotDecisionTelemetry;
}

/**
 * Helper khởi tạo đối tượng BotDecision (Discriminated Union)
 */
export function buildBotDecision(
  type: 'PLAY' | 'PASS',
  opts: Partial<BuildBotDecisionOptions> = {}
): BotDecision {
  if (type === 'PLAY') {
    return {
      type: 'PLAY',
      cards: opts.cards ?? [],
      combination: opts.combination!,
      reason: opts.reason,
      strategyUsed: opts.strategyUsed,
      evaluationScore: opts.evaluationScore,
      candidatesEvaluated: opts.candidatesEvaluated,
      telemetry: opts.telemetry
    };
  }
  return {
    type: 'PASS',
    reason: opts.reason,
    strategyUsed: opts.strategyUsed,
    evaluationScore: opts.evaluationScore,
    candidatesEvaluated: opts.candidatesEvaluated,
    telemetry: opts.telemetry
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
  ANTI_ONE_CARD_INTERCEPT_BONUS: 350,
  FEEDING_ONE_CARD_PENALTY_FACTOR: 2.0,
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
  ENDGAME_EXHAUSTION_PENALTY: 260,
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
  for (const cards of rankMap.values()) {
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
// CHAIN OF RESPONSIBILITY: LỚP TRỪU TƯỢNG CHO TẤT CẢ HANDLER
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
