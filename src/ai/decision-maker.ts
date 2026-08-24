import { Card, Combination, PlayedMove } from '../engine/types';
import { compareCards, isTwo, sortCards } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { isValidMove } from '../engine/validator';
import { BotConfig } from './types';
import { CardTracker } from './card-tracker';
import { partitionHand } from './hand-partitioner';
import { MctsSolver } from './mcts-solver';
import { resolveAIModePolicy } from './mode-policies';

export interface DecisionContext {
  hand: Card[];
  currentRoundLeadingMove: PlayedMove | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
  tracker: CardTracker;
  config: BotConfig;
  remainingPlayerCards: Record<string, number>;
  nextPlayerId: string; // BẮT BUỘC: ID người chơi kế tiếp theo chiều kim đồng hồ
  isNextPlayerOneCard?: boolean;
  prohibitEndingWithTwo?: boolean;
  gameMode?: string; // Chế độ chơi: COUNT_CARDS, TRADITIONAL, WINNER_TAKES_ALL, UNDERGROUND, RANKED, CAMPAIGN...
  mctsMap?: Map<string, number>;
}

export interface BotDecision {
  type: 'PLAY' | 'PASS';
  cards?: Card[];
  combination?: Combination;
  reason?: string;
}

export interface ValidMoveInfo {
  cards: Card[];
  combination: Combination;
  isChop: boolean;
}

/**
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
 * 1. Handler Cờ Tàn (Endgame Solver): Xử lý dứt điểm khi còn <= 4 lá bài
 */
export class EndgameSolverHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    const { hand, isLeadMove, config, tracker, prohibitEndingWithTwo } = context;

    // 1. Nước đi dứt điểm ngay lập tức (Instant Win): Nếu có nước đi đánh hết sạch bài trên tay
    const instantWinMove = validMoves.find(m => m.cards.length === hand.length);
    if (instantWinMove) {
      return {
        type: 'PLAY',
        cards: instantWinMove.cards,
        combination: instantWinMove.combination,
        reason: 'Dứt điểm toàn bộ bài để về Nhất'
      };
    }

    if (!isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    // =========================================================================
    // 2. THUẬT TOÁN TỔNG QUÁT CỜ TÀN (GENERIC COMBINATORIAL ENDGAME SOLVER)
    // Bao phủ 100% mọi tổ hợp: (1, 2, 3, 4 con Heo) + (1 Rác, 1 Đôi, 1 Sảnh, 1 Tam, 1 Tứ Quý, Đôi thông...)
    // =========================================================================
    const twos = hand.filter(isTwo);
    const nonTwos = hand.filter(c => !isTwo(c));

    // A. Khi có luật CẤM 2 CUỐI và trên tay có cả Heo lẫn bài thường:
    if (prohibitEndingWithTwo && twos.length > 0 && nonTwos.length > 0) {
      const nonTwoPartition = partitionHand(nonTwos, 1.0);
      const totalNonTwoTurns = nonTwoPartition.combinations.length + nonTwoPartition.trashCards.length;

      // Khi phần bài thường nonTwos chỉ còn ĐÚNG 1 lượt (1 rác, 1 đôi, 1 tam, 1 sảnh, 1 tứ quý, đôi thông...):
      // BẮT BUỘC xả tổ hợp Heo ra trước để cướp nhịp và tránh bị thối Heo (vì luật cấm về bằng Heo ở lá cuối cùng)!
      if (totalNonTwoTurns === 1) {
        const twoComboMove = validMoves.find(m => m.cards.length === twos.length && m.cards.every(isTwo))
          || validMoves.find(m => m.cards.every(isTwo));

        if (twoComboMove) {
          return {
            type: 'PLAY',
            cards: twoComboMove.cards,
            combination: twoComboMove.combination,
            reason: `Cờ tàn tổng quát (Cấm 2 cuối): Đánh tổ hợp Heo (${twoComboMove.combination.type}) trước để dứt điểm bằng bộ thường còn lại`
          };
        }
      }
    }

    // B. Trường hợp cờ tàn 2 lá không cấm 2 cuối (hoặc cấm 2 cuối nhưng không có Heo):
    if (hand.length === 2) {
      const sortedHand = sortCards(hand);
      // Đôi 2 lá -> Đánh đôi về bài
      if (sortedHand[0].rank === sortedHand[1].rank) {
        const pairMove = validMoves.find(m => m.combination.type === 'PAIR');
        if (pairMove) {
          return {
            type: 'PLAY',
            cards: pairMove.cards,
            combination: pairMove.combination,
            reason: 'Cờ tàn 2 lá: Về đôi'
          };
        }
      }

      // 1 lá Rác nhỏ + 1 Heo/quân to giữ cái (luật thông thường không cấm 2 cuối):
      if (!prohibitEndingWithTwo && (isTwo(sortedHand[1]) || sortedHand[1].rank >= 13 || tracker.isStrongestRemainingSingle(sortedHand[1]))) {
        const smallMove = validMoves.find(m => m.cards.length === 1 && m.cards[0].id === sortedHand[0].id);
        if (smallMove) {
          return {
            type: 'PLAY',
            cards: smallMove.cards,
            combination: smallMove.combination,
            reason: 'Cờ tàn 2 lá: Đánh rác nhỏ trước, giữ Heo/bài to chốt hạ'
          };
        }
      }
    }

    return this.passToNext(context, validMoves);
  }
}

/**
 * 2. Handler Chặn Người Về Nhất (Anti-Leader Defense):
 * Khi có đối thủ còn 1 lá (báo 1 lá):
 * - Nếu đối thủ là NGƯỜI KẾ TIẾP (direct nextPlayerId): Bắt buộc đánh lá bài/tổ hợp TO NHẤT để chặn đầu, chống đền bài.
 * - Nếu đối thủ là NGƯỜI KHÁC (non-direct): Tẩu thoát rác nhỏ của bản thân để giảm thiệt hại và chạy bài.
 */
export class AntiLeaderDefenseHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    const { remainingPlayerCards, isLeadMove, isFirstMoveOfGame, nextPlayerId } = context;

    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const isDirectNextPlayerReporting = remainingPlayerCards[nextPlayerId] === 1;

    if (isEmergencyAntiLeader && !isFirstMoveOfGame && isLeadMove) {
      if (isDirectNextPlayerReporting) {
        // 1. Ưu tiên hàng đầu: Đánh Bộ (Đôi, Sảnh, Sám, Tứ Quý) để đối thủ 1 lá KHÔNG THỂ đỡ được
        const comboMove = validMoves.find(
          m => m.combination.type === 'PAIR' || m.combination.type === 'STRAIGHT' || m.combination.type === 'TRIPLE' || m.combination.type === 'FOUR_OF_A_KIND'
        );
        if (comboMove) {
          return {
            type: 'PLAY',
            cards: comboMove.cards,
            combination: comboMove.combination,
            reason: 'Đánh bộ để đối thủ 1 lá không thể bắt được'
          };
        }

        // 2. Nếu không có bộ (chỉ toàn rác lẻ): BẮT BUỘC đánh lá rác TO NHẤT (Át / Heo / Rác to nhất) để chặn đầu
        const singles = validMoves.filter(m => m.combination.type === 'SINGLE');
        if (singles.length > 0) {
          singles.sort((a, b) => b.combination.highestCard.weight - a.combination.highestCard.weight);
          const topSingle = singles[0];
          return {
            type: 'PLAY',
            cards: topSingle.cards,
            combination: topSingle.combination,
            reason: 'Chặn đầu người kế tiếp báo 1 lá (tránh đền bài)'
          };
        }
      } else {
        // Người báo 1 lá là người khác -> Tẩu rác nhỏ
        const singles = validMoves.filter(m => m.combination.type === 'SINGLE' && !isTwo(m.combination.highestCard));
        if (singles.length > 0) {
          singles.sort((a, b) => a.combination.highestCard.weight - b.combination.highestCard.weight);
          const smallestSingle = singles[0];
          return {
            type: 'PLAY',
            cards: smallestSingle.cards,
            combination: smallestSingle.combination,
            reason: 'Tẩu rác nhỏ thoát bài (người báo 1 lá không phải người kế tiếp)'
          };
        }
      }
    }

    return this.passToNext(context, validMoves);
  }
}

/**
 * 3. Handler Ra Bài Cầm Cái (Lead Move Heuristic):
 * Chiến thuật chuẩn Tiến Lên Miền Nam:
 * 1. Mở màn 3 Bích: Tuyệt đối KHÔNG phá Hàng (3 Đôi Thông, 4 Đôi Thông, Tứ Quý) chỉ để đánh 3 Bích.
 * 2. Tẩu rác nhỏ (3, 4, 5...) trước khi cầm cái để xả bài yếu và thăm dò bài.
 * 3. Xả các bộ nhỏ/sảnh nhỏ trước, giữ bài to (A, 2) và Hàng làm vũ khí cướp cái / phòng thủ.
 */
export class LeadMoveHeuristicHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (!context.isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    const { hand, config, tracker, remainingPlayerCards, isFirstMoveOfGame, nextPlayerId, mctsMap } = context;
    const partition = partitionHand(hand, config.handPartitioningOptimality || 0.5);
    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const isNextPlayerOneCard = context.isNextPlayerOneCard ?? (remainingPlayerCards[nextPlayerId] === 1);

    // =========================================================================
    // 1. NƯỚC MỞ MÀN ĐẦU TIÊN CỦA VÁN (Bắt buộc chứa 3 Bích 3♠)
    // =========================================================================
    if (isFirstMoveOfGame) {
      const threeSpadeMoves = validMoves.filter(m => m.cards.some(c => c.rank === 3 && c.suit === 'SPADES'));
      if (threeSpadeMoves.length > 0) {
        // TUYỆT ĐỐI KHÔNG xả 3 Đôi Thông (334455), 4 Đôi Thông, hoặc Tứ Quý ở nước mở màn!
        const safeThreeSpadeMoves = threeSpadeMoves.filter(
          m => m.combination.type !== 'THREE_PAIRS_SEQUENTIAL' &&
               m.combination.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
               m.combination.type !== 'FOUR_OF_A_KIND'
        );

        const candidateList = safeThreeSpadeMoves.length > 0 ? safeThreeSpadeMoves : threeSpadeMoves;

        // Ưu tiên:
        // 1. Rác đơn 3♠ nếu 3♠ là rác
        // 2. Đôi nhỏ [3♠, 3x] hoặc Sảnh ngắn [3♠, 4, 5]
        // 3. Nước đi ngắn nhất (tiết kiệm tài nguyên bài)
        const sortedThreeMoves = [...candidateList].sort((a, b) => {
          if (a.combination.type === 'SINGLE' && b.combination.type !== 'SINGLE') return -1;
          if (b.combination.type === 'SINGLE' && a.combination.type !== 'SINGLE') return 1;
          return a.cards.length - b.cards.length;
        });

        const chosen = sortedThreeMoves[0];
        return {
          type: 'PLAY',
          cards: chosen.cards,
          combination: chosen.combination,
          reason: 'Đánh mở màn ván bài với 3 Bích an toàn (bảo vệ hàng chặt)'
        };
      }
    }

    // =========================================================================
    // 2. KHAI THÁC ĐIỂM YẾU ĐỐI THỦ (OPPONENT WEAKNESS EXPLOITATION)
    // =========================================================================
    if (config.memoryDepth >= 0.5 && partition.combinations.length > 0 && !isEmergencyAntiLeader && !isNextPlayerOneCard) {
      const targetOpponentId = (remainingPlayerCards[nextPlayerId] > 0)
        ? nextPlayerId
        : Object.entries(remainingPlayerCards)
            .filter(([pid, count]) => pid !== config.id && count > 0)
            .sort((a, b) => a[1] - b[1])[0]?.[0];

      if (targetOpponentId) {
        const passedCombos = tracker.getOpponentWeaknessCombos(targetOpponentId);

        const nonChopCombos = partition.combinations.filter(
          c => c.type !== 'FOUR_OF_A_KIND' &&
               c.type !== 'THREE_PAIRS_SEQUENTIAL' &&
               c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
               c.type !== 'FIVE_PAIRS_SEQUENTIAL'
        );

        for (const combo of nonChopCombos) {
          let matchesWeakness = passedCombos.has(combo.type);
          if (combo.type === 'STRAIGHT' && tracker.hasOpponentPassedOnStraightLength(targetOpponentId, combo.length)) {
            matchesWeakness = true;
          }

          if (matchesWeakness) {
            const move = validMoves.find(
              m => m.combination.type === combo.type &&
                   m.cards.length === combo.cards.length &&
                   m.combination.highestCard.rank === combo.highestCard.rank
            );
            if (move) {
              return {
                type: 'PLAY',
                cards: move.cards,
                combination: move.combination,
                reason: `Khai thác điểm yếu: Đánh ${combo.type} do đối thủ (${targetOpponentId}) từng bỏ lượt`
              };
            }
          }
        }
      }
    }

    // =========================================================================
    // 3. CHIẾN THUẬT THEO CHẾ ĐỘ CHƠI (MODE-SPECIFIC AI STRATEGY POLICY)
    // =========================================================================
    const policy = resolveAIModePolicy(context.gameMode);
    const leadPolicy = policy.getLeadPolicy();

    // A. Chế độ Đếm Lá / Sòng Bạc Ngầm: Ưu tiên xả Sảnh dài (4-6 lá) & Bộ nhiều lá trước để giảm số lá tồn cấp tốc
    if (leadPolicy.preferLongestComboFirst && partition.combinations.length > 0 && !isEmergencyAntiLeader && !isNextPlayerOneCard) {
      const nonChopCombos = partition.combinations.filter(
        c =>
          c.type !== 'FOUR_OF_A_KIND' &&
          c.type !== 'THREE_PAIRS_SEQUENTIAL' &&
          c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
          c.type !== 'FIVE_PAIRS_SEQUENTIAL'
      );

      if (nonChopCombos.length > 0) {
        // Sắp xếp: Bộ nhiều lá nhất trước (Sảnh dài > Sám > Đôi), rồi đến trọng số nhỏ
        const sortedCombos = [...nonChopCombos].sort((a, b) => {
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
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: `Chiến thuật ${policy.modeName}: Xả tổ hợp dài nhất (${longestCombo.type} ${longestCombo.cards.length} lá) trước để giảm số lá tồn`
          };
        }
      }
    }

    // B. Chế độ Truyền Thống / Đấu Hạng Elo: TẨU RÁC NHỎ TRƯỚC (TRASH DISPOSAL)
    const nonTwoTrash = partition.trashCards.filter(c => !isTwo(c));
    if (nonTwoTrash.length > 0) {
      if (!isNextPlayerOneCard) {
        // Người kế tiếp không báo 1 lá -> Tống rác nhỏ nhất (3, 4, 5...)
        const smallestTrash = nonTwoTrash[0];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === smallestTrash.id
        );
        if (move) {
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: 'Tẩu rác nhỏ nhất để thăm dò và xả bài yếu'
          };
        }
      } else {
        // Người kế tiếp báo 1 lá -> CHẶN ĐẦU: Đánh lá rác TO NHẤT
        const largestTrash = nonTwoTrash[nonTwoTrash.length - 1];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === largestTrash.id
        );
        if (move) {
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: 'Chặn đầu người kế tiếp báo 1 lá bằng rác lớn nhất'
          };
        }
      }
    }

    // C. ĐÁNH BỘ NHỎ NHẤT / SẢNH NHỎ TRƯỚC (Không xả Hàng Chặt & Không xả Heo)
    if (partition.combinations.length > 0) {
      const nonChopCombos = partition.combinations.filter(
        c =>
          c.type !== 'FOUR_OF_A_KIND' &&
          c.type !== 'THREE_PAIRS_SEQUENTIAL' &&
          c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
          c.type !== 'FIVE_PAIRS_SEQUENTIAL'
      );

      if (nonChopCombos.length > 0) {
        // Ưu tiên bộ có trọng lượng nhỏ nhất trước
        const sortedCombos = [...nonChopCombos].sort((a, b) => {
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
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: `Đánh bộ nhỏ ${smallestCombo.type} ${smallestCombo.cards.length} lá để giữ nhịp`
          };
        }
      }
    }

    // =========================================================================
    // 5. CỜ TÀN HOẶC MCTS: TỐI ƯU NƯỚC ĐI
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
      return {
        type: 'PLAY',
        cards: bestMove.cards,
        combination: bestMove.combination,
        reason: 'MCTS tối ưu nước đi cờ tàn'
      };
    }

    // =========================================================================
    // 6. NƯỚC ĐI MẶC ĐỊNH AN TOÀN (Tránh đánh Heo/Hàng nếu còn nước đi thường)
    // =========================================================================
    const nonTwoMoves = validMoves.filter(m => !m.cards.some(isTwo));
    const nonChopMoves = (nonTwoMoves.length > 0 ? nonTwoMoves : validMoves).filter(
      m => m.combination.type !== 'THREE_PAIRS_SEQUENTIAL' &&
           m.combination.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
           m.combination.type !== 'FOUR_OF_A_KIND'
    );

    const safeDefault = nonChopMoves.length > 0 ? nonChopMoves[0] : (nonTwoMoves.length > 0 ? nonTwoMoves[0] : validMoves[0]);
    return {
      type: 'PLAY',
      cards: safeDefault.cards,
      combination: safeDefault.combination,
      reason: 'Nước đi an toàn mặc định'
    };
  }
}

/**
 * 4. Handler Chặn Bài Vòng Đấu (Responding Move Heuristic): Đỡ bài hoặc bỏ lượt
 */
export class RespondingMoveHeuristicHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (context.isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    const { hand, tracker, config, remainingPlayerCards, currentRoundLeadingMove, mctsMap } = context;
    const targetCombo = currentRoundLeadingMove?.combination;
    const partition = partitionHand(hand, config.handPartitioningOptimality);
    const twoSafety = tracker.getTwoSafetyReport();
    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const activeOpponentsCount = Object.entries(remainingPlayerCards).filter(([id, cnt]) => id !== config.id && cnt > 0).length;

    let bestMoveScore = -9999;
    let bestMove: ValidMoveInfo | null = null;

    const pendingCombosCardCount = partition.combinations.reduce((acc, c) => acc + c.cards.length, 0);
    const leadValueRatio = pendingCombosCardCount / Math.max(1, hand.length);

    for (const move of validMoves) {
      let score = 50;

      if (move.isChop) {
        score += 280;
        if (targetCombo && isTwo(targetCombo.highestCard)) {
          score += 60;
        }
        score += (config.trapTendency || 0.5) * 50;
      }

      const containsTwo = move.cards.some(isTwo);
      const isTargetTwo = targetCombo && targetCombo.cards.some(isTwo);

      if (containsTwo) {
        const nonTwosCount = hand.filter(c => !isTwo(c)).length;
        if (context.prohibitEndingWithTwo && nonTwosCount > 0 && hand.length <= 4) {
          // Cờ tàn (<= 4 lá) có luật Cấm 2 cuối: Đè bằng Heo để cướp cái rồi dứt điểm bằng các lá thường còn lại!
          score += 260;
        } else if (isTargetTwo) {
          // Đối phương ĐÁNH HEO -> Bot có Heo to hơn đè là hợp lý
          score += 100;
          if ((config.simulationLookahead || 0) >= 2 && twoSafety.riskScore > 50) {
            score -= (twoSafety.riskScore - 50) * (1 - (config.riskAppetite || 0.5));
          }
        } else {
          // Đối phương KHÔNG ĐÁNH HEO (đối phương đánh bài thường 3..A):
          // Dùng Heo đè bài thường là hành động tốn kém, cần được kiểm soát chặt chẽ!
          if (isEmergencyAntiLeader) {
            score += 200; // Mặc định bật tất cả là 1 (antiLeaderAggression = 1.0)
          } else if (hand.length <= 4) {
            // Cờ tàn (<= 4 lá): Xả Heo cướp cái để dứt điểm về Nhất
            score += 160;
          } else if (activeOpponentsCount === 1) {
            // Solo 1v1: Cướp cái chắc chắn được quyền đi tiếp
            score += 80 * (config.antiLeaderAggression || 0.8);
          } else if (
            (config.tempoControl || 0) >= 0.8 &&
            pendingCombosCardCount >= hand.length - 2 &&
            targetCombo &&
            targetCombo.highestCard.rank === 14
          ) {
            // Bot Cao Thủ (Tier 4/5): Chỉ xả Heo đè Át khi TOÀN BỘ bài còn lại đều là Bộ bài dứt điểm được
            score += 120 * (config.tempoControl || 0.5);
          } else {
            // Khi bài còn nhiều (hand.length >= 5) và trong bàn 3-4 người:
            // Phạt điểm BẢO TOÀN HEO cực mạnh để KHÔNG tự ý vứt Heo đè rác
            score -= 180;
            if (targetCombo && targetCombo.highestCard.rank < 14) {
              // Đối thủ đánh bài dưới Át (3..K) mà vứt Heo ra đè là tối kỵ!
              score -= 100;
            }
          }
        }
      }

      if ((config.tempoControl || 0) > 0.2 && !containsTwo) {
        score += leadValueRatio * 150 * (config.tempoControl || 0.5);
        if (leadValueRatio > 0.35 && move.combination.highestCard.rank >= 13) {
          score += 100 * (config.tempoControl || 0.5);
        }
      }

      if (activeOpponentsCount === 1) {
        // Trong đối đầu 1v1: Đè bài thành công là 100% cướp được cái -> Tăng điểm mạnh
        score += 80 * (config.antiLeaderAggression || 0.8);
      }

      // Điểm điều chỉnh chiến thuật theo Chế Độ Chơi (Mode Strategy Policy)
      const policy = resolveAIModePolicy(context.gameMode);
      score += policy.getRespondingScoreModifier(move, hand.length, currentRoundLeadingMove);

      if (mctsMap) {
        const key = move.cards.map(c => c.id).sort().join('_');
        if (mctsMap.has(key)) {
          const winRate = mctsMap.get(key)!;
          score += (winRate - 0.25) * 40;
        }
      }

      if (isEmergencyAntiLeader) {
        // CŨ: score += 150 * (config.antiLeaderAggression || 0.85);
        score += 150; // Mặc định bật tất cả là 1 (antiLeaderAggression = 1.0)
      }

      // Kiểm tra phá bộ quan trọng
      const moveCardIds = new Set(move.cards.map(c => c.id));
      let breaksImportantCombo = false;
      let comboBreakSeverity = 0;

      for (const combo of partition.combinations) {
        const comboCardIds = combo.cards.map((c: Card) => c.id);
        const overlapCount = comboCardIds.filter((id: string) => moveCardIds.has(id)).length;
        if (overlapCount > 0 && overlapCount < combo.cards.length) {
          breaksImportantCombo = true;

          // Nếu là Sảnh dài >= 4 lá và lá bị đánh là đầu mút: Phần còn lại vẫn là Sảnh hợp lệ
          if (combo.type === 'STRAIGHT' && combo.cards.length >= 4) {
            const sortedComboCards = sortCards(combo.cards);
            const isEndCard = move.cards.length === 1 && (move.cards[0].id === sortedComboCards[0].id || move.cards[0].id === sortedComboCards[sortedComboCards.length - 1].id);
            if (isEndCard) {
              comboBreakSeverity += 8;
            } else {
              comboBreakSeverity += 35;
            }
          } else if (combo.type === 'FOUR_OF_A_KIND' || combo.type === 'THREE_PAIRS_SEQUENTIAL' || combo.type === 'FOUR_PAIRS_SEQUENTIAL') {
            comboBreakSeverity += 100;
          } else if (combo.type === 'TRIPLE') {
            comboBreakSeverity += 12;
          } else if (combo.type === 'STRAIGHT' && combo.cards.length === 3) {
            comboBreakSeverity += 18;
          } else if (combo.type === 'PAIR') {
            comboBreakSeverity += 6;
          }
        }
      }

      if (breaksImportantCombo) {
        const penaltyDiscount = (hand.length <= 4 || isEmergencyAntiLeader || activeOpponentsCount === 1) ? 0.0 : 0.7;
        score -= comboBreakSeverity * config.handPartitioningOptimality * penaltyDiscount;
      }

      const isTrash = move.cards.every(c => partition.trashCards.some(tc => tc.id === c.id));
      if (isTrash) {
        score += 10;
      }

      // Sắp hết bài hoặc đánh xong còn <= 2 lá: Tăng điểm rất mạnh để về đích
      if (hand.length <= 3 || hand.length - move.cards.length <= 2) {
        score += 120;
      }

      if (move.cards.length === 1 && tracker.isStrongestRemainingSingle(move.cards[0])) {
        // Lá bài to nhất tuyệt đối còn lại: Nếu sắp về hoặc có bộ chờ đánh thì cực kỳ có giá trị
        if (hand.length <= 4 || leadValueRatio > 0.3) {
          score += 100 * (config.tempoControl || 0.6);
        }
      }

      // Minimum Sufficient Beat: Thẩm định chênh lệch sức mạnh lá bài (Ưu tiên đè bằng lá nhỏ nhất vừa đủ, bảo toàn bài to)
      if (targetCombo && !move.cards.some(isTwo)) {
        const weightDiff = move.combination.highestCard.weight - targetCombo.highestCard.weight;
        const skillFactor = config.handPartitioningOptimality || 0.5;
        score -= weightDiff * 0.75 * skillFactor;
      }

      // Thưởng điểm nhận thức chiến lược cho Bot cấp cao (Tier 4 / 5)
      if ((config.simulationLookahead || 0) >= 3) {
        if (move.combination.type === 'STRAIGHT' || move.combination.type === 'PAIR') {
          score += 25;
        }
      }

      // Sai số ngẫu nhiên của người mới / phong trào (Tier 1 / 2) do thiếu tính toán nước xa
      if ((config.simulationLookahead || 0) === 0) {
        score += (Math.random() - 0.5) * 50;
      } else if ((config.simulationLookahead || 0) === 1) {
        score += (Math.random() - 0.5) * 20;
      }

      if (score > bestMoveScore) {
        bestMoveScore = score;
        bestMove = move;
      }
    }

    if (bestMove && bestMoveScore > 0) {
      return {
        type: 'PLAY',
        cards: bestMove.cards,
        combination: bestMove.combination
      };
    }

    return {
      type: 'PASS',
      reason: 'Chủ động bỏ lượt để giữ thế bài'
    };
  }
}

/**
 * 5. Handler Dự Phòng Cuối Cùng (Fallback Decision Handler)
 */
export class FallbackDecisionHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (context.isLeadMove && validMoves.length > 0) {
      const first = validMoves[0];
      return {
        type: 'PLAY',
        cards: first.cards,
        combination: first.combination,
        reason: 'Nước đi dự phòng'
      };
    }

    return {
      type: 'PASS',
      reason: 'Bỏ lượt'
    };
  }
}

/**
 * Xây dựng chuỗi Chain of Responsibility hoàn chỉnh cho AI
 */
export function buildBotDecisionChain(): BotDecisionHandler {
  const endgame = new EndgameSolverHandler();
  const antiLeader = new AntiLeaderDefenseHandler();
  const leadMove = new LeadMoveHeuristicHandler();
  const responseMove = new RespondingMoveHeuristicHandler();
  const fallback = new FallbackDecisionHandler();

  endgame
    .setNext(antiLeader)
    .setNext(leadMove)
    .setNext(responseMove)
    .setNext(fallback);

  return endgame;
}

const DEFAULT_DECISION_CHAIN = buildBotDecisionChain();

/**
 * Hàm quyết định nước đi của AI Bot áp dụng Chain of Responsibility Pattern
 */
export function makeBotDecision(context: DecisionContext): BotDecision {
  const { hand, currentRoundLeadingMove, isFirstMoveOfGame, isLeadMove, config, remainingPlayerCards, tracker, prohibitEndingWithTwo } = context;

  // 1. Sinh danh sách nước đi hợp lệ
  const candidateMoveCards = generateCandidateMoves(hand);
  const targetCombo = currentRoundLeadingMove?.combination || null;
  const isProhibitEndingWithTwo = prohibitEndingWithTwo ?? true;

  const validMoves: ValidMoveInfo[] = [];
  for (const cards of candidateMoveCards) {
    const isFinishing = cards.length === hand.length;
    const valResult = isValidMove(
      cards,
      targetCombo,
      isFirstMoveOfGame,
      isLeadMove,
      false,
      true,
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

  // 2. Nếu không có nước đi hợp lệ nào: Buộc phải Bỏ lượt (hoặc đánh 1 lá nếu là Lead)
  if (validMoves.length === 0) {
    if (isLeadMove && hand.length > 0) {
      if (isProhibitEndingWithTwo && hand.every(isTwo)) {
        return {
          type: 'PASS',
          reason: 'Chỉ còn Heo trên tay, không thể đánh do luật cấm về bằng Heo (2)'
        };
      }
      const nonTwos = hand.filter(c => !isTwo(c));
      const chosenCard = nonTwos.length > 0 ? sortCards(nonTwos)[0] : sortCards(hand)[0];
      const singleCombo = identifyCombination([chosenCard])!;
      return {
        type: 'PLAY',
        cards: [chosenCard],
        combination: singleCombo,
        reason: 'Buộc phải ra bài khi đang cầm cái'
      };
    }
    return {
      type: 'PASS',
      reason: 'Không có nước đi hợp lệ'
    };
  }

  // 3. Chạy MCTS nếu Bot có cấu hình mctsSimulations > 0 (Tier 4 / Tier 5)
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

  const enrichedContext: DecisionContext = {
    ...context,
    mctsMap
  };

  // 4. Xử lý qua Chain of Responsibility
  const decision = DEFAULT_DECISION_CHAIN.handle(enrichedContext, validMoves);
  if (decision) {
    return decision;
  }

  // Dự phòng an toàn
  return {
    type: isLeadMove ? 'PLAY' : 'PASS',
    cards: isLeadMove ? validMoves[0].cards : undefined,
    combination: isLeadMove ? validMoves[0].combination : undefined
  };
}
