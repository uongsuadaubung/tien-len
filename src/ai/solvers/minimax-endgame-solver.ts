import { Card, Combination } from '../../engine/types';
import { isValidMove } from '../../engine/validator';
import { ValidMoveInfo, generateCandidateMoves } from '../decision-types';

export interface MinimaxEndgameResult {
  isForcedWin: boolean;
  turnsToWin: number;
  bestMove: ValidMoveInfo | null;
  reason: string;
}

export function cardToIndex(c: Card): number {
  const suitOffset = c.suit === 'SPADES' ? 0 : c.suit === 'CLUBS' ? 1 : c.suit === 'DIAMONDS' ? 2 : 3;
  return (c.rank - 3) * 4 + suitOffset;
}

export function cardsToBitmask(cards: Card[]): bigint {
  let mask = 0n;
  for (const c of cards) {
    mask |= (1n << BigInt(cardToIndex(c)));
  }
  return mask;
}

interface BitmaskMoveInfo extends ValidMoveInfo {
  mask: bigint;
}

/**
 * ============================================================================
 * HIGH-PERFORMANCE BITMASK MINIMAX ALPHA-BETA SOLVER (VÉT CẠN CỜ TÀN ĐỘ SÂU CAO)
 * Áp dụng kỹ thuật động cơ cờ cao cấp:
 * 1. 64-bit Bitmask State Operations (Tốc độ cấp độ phần cứng)
 * 2. Iterative Deepening Search (IDS) với độ sâu lên tới 10-12 plies
 * 3. Principal Variation (PV) & Killer Move Ordering
 * 4. Transposition Table Memoization với 64-bit Hash Key
 * ============================================================================
 */
export class MinimaxEndgameSolver {
  private static memo = new Map<string, number>();
  private static killerMoves: Map<number, BitmaskMoveInfo> = new Map();
  private static nodeCount = 0;
  private static readonly MAX_NODES = 15000;

  /**
   * Sinh khóa băm nhanh từ 64-bit Bitmask
   */
  private static getHashKey(
    myMask: bigint,
    oppMask: bigint,
    leadingWeight: number,
    isBotTurn: boolean
  ): string {
    return `${isBotTurn ? 1 : 0}_${myMask.toString(36)}_${oppMask.toString(36)}_${leadingWeight}`;
  }

  /**
   * Sắp xếp nước đi ưu tiên (Move Ordering):
   * PV Move > Finishing Moves > Killer Moves > Combos dài > Bài cao
   */
  private static orderMoves(
    moves: BitmaskMoveInfo[],
    handLength: number,
    depth: number,
    pvMove: BitmaskMoveInfo | null
  ): BitmaskMoveInfo[] {
    const killer = this.killerMoves.get(depth);

    return [...moves].sort((a, b) => {
      // 1. PV Move từ độ sâu trước được thử ĐẦU TIÊN
      if (pvMove) {
        if (a.mask === pvMove.mask) return -1;
        if (b.mask === pvMove.mask) return 1;
      }
      // 2. Nước đi dứt điểm hết sạch bài ưu tiên tuyệt đối
      if (a.cards.length === handLength && b.cards.length !== handLength) return -1;
      if (b.cards.length === handLength && a.cards.length !== handLength) return 1;
      // 3. Killer Move
      if (killer) {
        if (a.mask === killer.mask) return -1;
        if (b.mask === killer.mask) return 1;
      }
      // 4. Combo nhiều lá hơn ưu tiên trước
      if (b.cards.length !== a.cards.length) return b.cards.length - a.cards.length;
      // 5. Trọng số bài cao hơn
      return (b.combination?.highestCard.weight || 0) - (a.combination?.highestCard.weight || 0);
    });
  }

  /**
   * Giải cờ tàn 1v1 với Độ Sâu Đầy Đủ (Full Horizon Lookahead 8-12 plies)
   */
  public static solve1v1(
    myHand: Card[],
    opponentCards: Card[],
    isLeadMove: boolean,
    currentLeadingCombo: Combination | null,
    prohibitEndingWithTwo: boolean = false,
    maxSearchDepth: number = 10
  ): MinimaxEndgameResult {
    this.memo.clear();
    this.killerMoves.clear();
    this.nodeCount = 0;

    if (myHand.length === 0) {
      return {
        isForcedWin: true,
        turnsToWin: 0,
        bestMove: null,
        reason: 'Đã hết bài'
      };
    }

    // 1. Sinh toàn bộ nước đi hợp lệ cho lượt đầu tiên
    const candidates = generateCandidateMoves(myHand);
    const validFirstMoves: BitmaskMoveInfo[] = [];

    for (const cards of candidates) {
      const isFinishing = cards.length === myHand.length;
      const res = isValidMove({
        cards,
        target: currentLeadingCombo,
        isFirstMoveOfGame: false,
        isLeadMove,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: isFinishing,
        prohibitEndingWithTwo
      });
      if (res.valid && res.combination) {
        if (isFinishing) {
          return {
            isForcedWin: true,
            turnsToWin: 1,
            bestMove: { cards, combination: res.combination, isChop: res.isChop || false },
            reason: 'Dứt điểm cờ tàn 1 nước tất thắng (Mate-in-1)'
          };
        }
        validFirstMoves.push({
          cards,
          combination: res.combination,
          isChop: res.isChop || false,
          mask: cardsToBitmask(cards)
        });
      }
    }

    if (validFirstMoves.length === 0) {
      return {
        isForcedWin: false,
        turnsToWin: 99,
        bestMove: null,
        reason: 'Không có nước đi hợp lệ'
      };
    }

    const myHandMask = cardsToBitmask(myHand);
    const oppHandMask = cardsToBitmask(opponentCards);

    // Tính độ sâu thực tế bao quát toàn bộ bài của cả 2 bên (Tối đa 12 plies)
    const targetDepth = Math.min(maxSearchDepth, myHand.length + opponentCards.length + 2);

    let optimalMove: BitmaskMoveInfo | null = null;
    let shortestTurns = 99;
    let pvMove: BitmaskMoveInfo | null = null;

    // 2. Iterative Deepening Search: Duyệt tăng dần độ sâu từ 1 đến targetDepth
    for (let currentDepth = 1; currentDepth <= targetDepth; currentDepth++) {
      this.memo.clear();
      const sortedMoves = this.orderMoves(validFirstMoves, myHand.length, 0, pvMove);
      let depthBestMove: BitmaskMoveInfo | null = null;
      let depthBestScore = -1000;

      for (const move of sortedMoves) {
        const nextMyMask = myHandMask & ~move.mask;
        const nextMyHand = myHand.filter(c => !move.cards.some(mc => mc.id === c.id));

        const evalScore = this.minimax(
          nextMyHand,
          nextMyMask,
          opponentCards,
          oppHandMask,
          false, // Lượt đối thủ
          move.combination,
          prohibitEndingWithTwo,
          1,
          currentDepth,
          -1000,
          1000
        );

        if (evalScore > depthBestScore) {
          depthBestScore = evalScore;
          depthBestMove = move;
        }

        if (this.nodeCount >= this.MAX_NODES) break;
      }

      if (depthBestMove) {
        pvMove = depthBestMove;
      }

      if (depthBestScore > 0) {
        const turns = Math.ceil(100 - depthBestScore);
        if (turns < shortestTurns) {
          shortestTurns = turns;
          optimalMove = depthBestMove;
        }
        // Nếu đã chứng minh được Forced Win ở độ sâu này, trả về ngay lập tức
        if (shortestTurns <= currentDepth) break;
      }

      if (this.nodeCount >= this.MAX_NODES) break;
    }

    if (optimalMove) {
      return {
        isForcedWin: true,
        turnsToWin: shortestTurns,
        bestMove: optimalMove,
        reason: `Minimax Alpha-Beta tìm ra chuỗi dứt điểm tất thắng sau ${shortestTurns} nhịp (Mate-in-${shortestTurns})`
      };
    }

    return {
      isForcedWin: false,
      turnsToWin: 99,
      bestMove: pvMove || validFirstMoves[0],
      reason: 'Chưa có chuỗi tất thắng tuyệt đối'
    };
  }

  /**
   * Đệ quy Minimax Alpha-Beta Bitmask Engine
   */
  private static minimax(
    myHand: Card[],
    myMask: bigint,
    oppHand: Card[],
    oppMask: bigint,
    isBotTurn: boolean,
    currentCombo: Combination | null,
    prohibitEndingWithTwo: boolean,
    depth: number,
    maxDepth: number,
    alpha: number,
    beta: number
  ): number {
    this.nodeCount++;
    if (myMask === 0n) return 100 - depth; // Bot hết bài (Thắng)
    if (oppMask === 0n) return depth - 100; // Đối thủ hết bài (Thua)
    if (depth >= maxDepth || this.nodeCount >= this.MAX_NODES) return 0;

    const leadingWeight = currentCombo?.highestCard.weight || 0;
    const hash = this.getHashKey(myMask, oppMask, leadingWeight, isBotTurn);
    if (this.memo.has(hash)) return this.memo.get(hash)!;

    if (isBotTurn) {
      let maxVal = -1000;
      const candidates = generateCandidateMoves(myHand);
      const moves: BitmaskMoveInfo[] = [];

      for (const cards of candidates) {
        const isFinishing = cards.length === myHand.length;
        const res = isValidMove({
          cards,
          target: currentCombo,
          isFirstMoveOfGame: false,
          isLeadMove: currentCombo === null,
          hasPassedRound: false,
          allowFourPairsCutAnytime: true,
          isFinishingMove: isFinishing,
          prohibitEndingWithTwo
        });
        if (res.valid && res.combination) {
          moves.push({
            cards,
            combination: res.combination,
            isChop: res.isChop || false,
            mask: cardsToBitmask(cards)
          });
        }
      }

      const sortedMoves = this.orderMoves(moves, myHand.length, depth, null);

      for (const m of sortedMoves) {
        const nextMyHand = myHand.filter(c => !m.cards.some(mc => mc.id === c.id));
        const nextMyMask = myMask & ~m.mask;

        const val = this.minimax(
          nextMyHand,
          nextMyMask,
          oppHand,
          oppMask,
          false,
          m.combination,
          prohibitEndingWithTwo,
          depth + 1,
          maxDepth,
          alpha,
          beta
        );

        if (val > maxVal) {
          maxVal = val;
        }
        alpha = Math.max(alpha, maxVal);
        if (beta <= alpha) {
          this.killerMoves.set(depth, m);
          break; // Beta Cutoff
        }
      }

      // Thử nước Bỏ Lượt nếu không phải lượt cầm cái
      if (currentCombo !== null && beta > alpha) {
        const passScore = this.minimax(
          myHand,
          myMask,
          oppHand,
          oppMask,
          false,
          null, // Đối thủ cầm cái
          prohibitEndingWithTwo,
          depth + 1,
          maxDepth,
          alpha,
          beta
        );
        maxVal = Math.max(maxVal, passScore);
      }

      this.memo.set(hash, maxVal);
      return maxVal;
    } else {
      // Lượt của đối thủ (Minimizer)
      let minVal = 1000;
      const candidates = generateCandidateMoves(oppHand);
      const moves: BitmaskMoveInfo[] = [];

      for (const cards of candidates) {
        const isFinishing = cards.length === oppHand.length;
        const res = isValidMove({
          cards,
          target: currentCombo,
          isFirstMoveOfGame: false,
          isLeadMove: currentCombo === null,
          hasPassedRound: false,
          allowFourPairsCutAnytime: true,
          isFinishingMove: isFinishing,
          prohibitEndingWithTwo
        });
        if (res.valid && res.combination) {
          moves.push({
            cards,
            combination: res.combination,
            isChop: res.isChop || false,
            mask: cardsToBitmask(cards)
          });
        }
      }

      const sortedMoves = this.orderMoves(moves, oppHand.length, depth, null);

      for (const m of sortedMoves) {
        const nextOppHand = oppHand.filter(c => !m.cards.some(mc => mc.id === c.id));
        const nextOppMask = oppMask & ~m.mask;

        const val = this.minimax(
          myHand,
          myMask,
          nextOppHand,
          nextOppMask,
          true,
          m.combination,
          prohibitEndingWithTwo,
          depth + 1,
          maxDepth,
          alpha,
          beta
        );

        minVal = Math.min(minVal, val);
        beta = Math.min(beta, minVal);
        if (beta <= alpha) {
          this.killerMoves.set(depth, m);
          break; // Alpha Cutoff
        }
      }

      if (currentCombo !== null && beta > alpha) {
        const passScore = this.minimax(
          myHand,
          myMask,
          oppHand,
          oppMask,
          true,
          null, // Bot cầm cái
          prohibitEndingWithTwo,
          depth + 1,
          maxDepth,
          alpha,
          beta
        );
        minVal = Math.min(minVal, passScore);
      }

      this.memo.set(hash, minVal);
      return minVal;
    }
  }
}
