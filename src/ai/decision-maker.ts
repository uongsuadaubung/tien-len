import { Card, Combination, PlayedMove } from '../engine/types';
import { compareCards, isTwo, sortCards } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { isValidMove } from '../engine/validator';
import { BotConfig } from './types';
import { CardTracker } from './card-tracker';
import { partitionHand } from './hand-partitioner';
import { MctsSolver } from './mcts-solver';

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
 * Sinh ra tất cả các tập hợp con các lá bài có thể tạo thành nước đi hợp lệ
 */
export function generateCandidateMoves(hand: Card[]): Card[][] {
  const sorted = sortCards(hand);
  const candidates: Card[][] = [];

  // 1. Rác (1 lá)
  for (const c of sorted) {
    candidates.push([c]);
  }

  // 2. Đôi (2 lá)
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[i].rank === sorted[j].rank) {
        candidates.push([sorted[i], sorted[j]]);
      }
    }
  }

  // 3. Sám (3 lá)
  for (let i = 0; i < sorted.length - 2; i++) {
    for (let j = i + 1; j < sorted.length - 1; j++) {
      for (let k = j + 1; k < sorted.length; k++) {
        if (sorted[i].rank === sorted[j].rank && sorted[j].rank === sorted[k].rank) {
          candidates.push([sorted[i], sorted[j], sorted[k]]);
        }
      }
    }
  }

  // 4. Tứ Quý (4 lá)
  for (let i = 0; i < sorted.length - 3; i++) {
    if (
      sorted[i].rank === sorted[i + 1].rank &&
      sorted[i + 1].rank === sorted[i + 2].rank &&
      sorted[i + 2].rank === sorted[i + 3].rank
    ) {
      candidates.push([sorted[i], sorted[i + 1], sorted[i + 2], sorted[i + 3]]);
    }
  }

  // 5. Sảnh từ 3 đến 12 lá
  for (let len = 3; len <= 12; len++) {
    for (let i = 0; i <= sorted.length - len; i++) {
      const candidate: Card[] = [sorted[i]];
      if (isTwo(sorted[i])) continue;

      let currentRank = sorted[i].rank;
      for (let j = i + 1; j < sorted.length && candidate.length < len; j++) {
        if (isTwo(sorted[j])) continue;
        if (sorted[j].rank === currentRank + 1) {
          candidate.push(sorted[j]);
          currentRank = sorted[j].rank;
        }
      }

      if (candidate.length === len) {
        candidates.push(candidate);
      }
    }
  }

  // 6. Đôi thông (3 đôi thông, 4 đôi thông)
  for (let pairCount = 3; pairCount <= 4; pairCount++) {
    const pairGroups: Card[][] = [];
    for (let r = 3; r <= 14; r++) {
      const cardsOfRank = sorted.filter(c => c.rank === r);
      if (cardsOfRank.length >= 2) {
        pairGroups.push([cardsOfRank[0], cardsOfRank[1]]);
      } else {
        pairGroups.length = 0;
      }

      if (pairGroups.length === pairCount) {
        const comboCards: Card[] = [];
        for (const p of pairGroups) {
          comboCards.push(...p);
        }
        candidates.push(comboCards);
        pairGroups.shift();
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
    const { hand, isLeadMove, config, tracker } = context;

    if (hand.length <= 4) {
      // 1.1 Đánh 1 nước hết sạch bài về Nhất ngay
      const instantWinMove = validMoves.find(m => m.cards.length === hand.length);
      if (instantWinMove) {
        return {
          type: 'PLAY',
          cards: instantWinMove.cards,
          combination: instantWinMove.combination,
          reason: 'Dứt điểm toàn bộ bài để về Nhất'
        };
      }

      const sortedHand = sortCards(hand);

      // 1.2 Cờ tàn 2 lá
      if (isLeadMove && hand.length === 2) {
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

        // 1 lá Rác nhỏ + 1 Heo/Quân kiểm soát chắc ăn
        if (isTwo(sortedHand[1]) || sortedHand[1].rank >= 13 || tracker.isStrongestRemainingSingle(sortedHand[1])) {
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

      // 1.3 Cờ tàn 3 lá (Combinatorial Pipeline)
      if (isLeadMove && hand.length === 3 && (config.simulationLookahead || 0) >= 1) {
        const partition = partitionHand(hand, config.handPartitioningOptimality || 0.8);
        
        // Trường hợp A: [1 Đôi + 1 Rác lẻ (Heo / Quân kiểm soát)]
        if (partition.combinations.length === 1 && partition.combinations[0].type === 'PAIR' && partition.trashCards.length === 1) {
          const combo = partition.combinations[0];
          const trashCard = partition.trashCards[0];
          const isTrashControl = isTwo(trashCard) || tracker.isStrongestRemainingSingle(trashCard) || trashCard.rank >= 14;

          if (isTrashControl) {
            // Đánh đôi trước, dùng Quân kiểm soát để cướp cái dứt điểm
            const comboMove = validMoves.find(
              m => m.combination.type === 'PAIR' && m.combination.highestCard.id === combo.highestCard.id
            );
            if (comboMove) {
              return {
                type: 'PLAY',
                cards: comboMove.cards,
                combination: comboMove.combination,
                reason: 'Cờ tàn 3 lá: Đánh đôi trước, giữ Heo/quân kiểm soát chốt hạ'
              };
            }
          } else {
            // Nếu đôi là đôi to (Heo / Át / K) và rác là rác nhỏ: Đánh rác nhỏ trước để đôi to cướp lại cái
            const isPairStrong = isTwo(combo.highestCard) || combo.highestCard.rank >= 13;
            if (isPairStrong) {
              const trashMove = validMoves.find(m => m.cards.length === 1 && m.cards[0].id === trashCard.id);
              if (trashMove) {
                return {
                  type: 'PLAY',
                  cards: trashMove.cards,
                  combination: trashMove.combination,
                  reason: 'Cờ tàn 3 lá: Đánh rác nhỏ trước, dùng Đôi to cướp lại cái'
                };
              }
            }
          }
        }
      }

      // 1.4 Cờ tàn 4 lá (Combinatorial Pipeline)
      if (isLeadMove && hand.length === 4 && (config.simulationLookahead || 0) >= 1) {
        const partition = partitionHand(hand, config.handPartitioningOptimality || 0.8);
        
        // Trường hợp A: [1 Sảnh 3 lá + 1 Heo / Quân kiểm soát]
        if (partition.combinations.length === 1 && partition.combinations[0].type === 'STRAIGHT' && partition.trashCards.length === 1) {
          const combo = partition.combinations[0];
          const trashCard = partition.trashCards[0];
          const isTrashControl = isTwo(trashCard) || tracker.isStrongestRemainingSingle(trashCard) || trashCard.rank >= 14;

          if (isTrashControl) {
            const comboMove = validMoves.find(
              m => m.combination.type === 'STRAIGHT' &&
                   m.combination.length === combo.length &&
                   m.combination.highestCard.id === combo.highestCard.id
            );
            if (comboMove) {
              return {
                type: 'PLAY',
                cards: comboMove.cards,
                combination: comboMove.combination,
                reason: 'Cờ tàn 4 lá: Đánh Sảnh 3 lá trước, giữ Heo/quân kiểm soát chốt hạ'
              };
            }
          }
        }

        // Trường hợp B: [2 Đôi (1 Đôi nhỏ + 1 Đôi to/Heo)]
        const pairs = partition.combinations.filter(c => c.type === 'PAIR');
        if (pairs.length === 2) {
          const sortedPairs = [...pairs].sort((a, b) => a.highestCard.weight - b.highestCard.weight);
          const smallPair = sortedPairs[0];
          const comboMove = validMoves.find(
            m => m.combination.type === 'PAIR' && m.combination.highestCard.id === smallPair.highestCard.id
          );
          if (comboMove) {
            return {
              type: 'PLAY',
              cards: comboMove.cards,
              combination: comboMove.combination,
              reason: 'Cờ tàn 4 lá: Đánh đôi nhỏ trước, giữ đôi to cướp lại cái'
            };
          }
        }
      }

      // 1.5 Cờ tàn tổng quát (Tổ hợp + Rác nhỏ)
      if (isLeadMove && (config.handPartitioningOptimality || 0) >= 0.6) {
        const partition = partitionHand(hand, config.handPartitioningOptimality);
        if (partition.combinations.length > 0 && partition.trashCards.length <= 1) {
          const combo = partition.combinations[0];
          const comboMove = validMoves.find(
            m => m.combination.type === combo.type &&
                 m.combination.length === combo.length &&
                 m.combination.highestCard.rank === combo.highestCard.rank
          );
          if (comboMove) {
            return {
              type: 'PLAY',
              cards: comboMove.cards,
              combination: comboMove.combination,
              reason: 'Cờ tàn: Đánh tổ hợp trước để dứt điểm bằng lá bài còn lại'
            };
          }
        }
      }
    }

    return this.passToNext(context, validMoves);
  }
}

/**
 * 2. Handler Chống Về Nhất (Anti-Leader Intercept): Cướp cái khi đối thủ còn 1 lá
 */
export class AntiLeaderInterceptHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    const { remainingPlayerCards, isLeadMove, isFirstMoveOfGame, nextPlayerId } = context;

    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const isNextPlayerOneCard = context.isNextPlayerOneCard ?? (remainingPlayerCards[nextPlayerId] === 1);

    // CŨ: if ((config.antiLeaderAggression || 0) >= 0.5 && isEmergencyAntiLeader && !isFirstMoveOfGame && isLeadMove) {
    // MẶC ĐỊNH BẬT TẤT CẢ LÀ 1 (Mọi bậc bot đều kích hoạt cơ chế Chống Báo khi đối thủ còn 1 lá)
    if (isEmergencyAntiLeader && !isFirstMoveOfGame && isLeadMove) {
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

      // 2. Nếu không có bộ (chỉ toàn rác lẻ): CHỈ xả lá rác CAO NHẤT (Át / Heo / Rác to nhất) khi ĐỐI TƯỢNG TIẾP THEO (nextPlayerId) là người báo 1 lá (chống đền báo)
      if (isNextPlayerOneCard) {
        const singleMoves = validMoves.filter(m => m.combination.type === 'SINGLE');
        if (singleMoves.length > 0) {
          singleMoves.sort((a, b) => b.combination.highestCard.weight - a.combination.highestCard.weight);
          const bestSingle = singleMoves[0];
          return {
            type: 'PLAY',
            cards: bestSingle.cards,
            combination: bestSingle.combination,
            reason: `Đánh lá bài cao nhất để chặn đầu người chơi kế tiếp (${nextPlayerId}) đang báo 1 lá (chống đền báo)`
          };
        }
      }
    }

    return this.passToNext(context, validMoves);
  }
}

/**
 * 3. Handler Đi Đầu (Lead Move Heuristic): Ra bài khi được quyền dẫn vòng
 */
export class LeadMoveHeuristicHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (!context.isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    const { hand, config, tracker, remainingPlayerCards, isFirstMoveOfGame, nextPlayerId, mctsMap } = context;
    const partition = partitionHand(hand, config.handPartitioningOptimality || 0.5);
    const activeOpponentsCount = Object.entries(remainingPlayerCards).filter(
      ([pid, count]) => pid !== config.id && count > 0
    ).length;
    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const isNextPlayerOneCard = context.isNextPlayerOneCard ?? (remainingPlayerCards[nextPlayerId] === 1);

    // 1. Nước đầu tiên của ván: Bắt buộc đánh tổ hợp chứa 3 Bích
    if (isFirstMoveOfGame) {
      const threeSpadeMoves = validMoves.filter(m => m.cards.some(c => c.rank === 3 && c.suit === 'SPADES'));
      if (threeSpadeMoves.length > 0) {
        threeSpadeMoves.sort((a, b) => b.cards.length - a.cards.length);
        const chosen = threeSpadeMoves[0];
        return {
          type: 'PLAY',
          cards: chosen.cards,
          combination: chosen.combination,
          reason: 'Đánh mở màn ván bài với 3 Bích'
        };
      }
    }

    // 2. Opponent Weakness Exploitation (Khai thác điểm yếu của người cửa dưới nextPlayerId & đối thủ nguy hiểm)
    if (config.memoryDepth >= 0.5 && partition.combinations.length > 0 && !isEmergencyAntiLeader) {
      // Ưu tiên 1: Người chơi kế tiếp (cửa dưới trực tiếp `nextPlayerId`) - người đầu tiên phải đỡ bài sau bot
      // Ưu tiên 2: Đối thủ nguy hiểm nhất (ít lá nhất còn lại)
      const targetOpponentId = (remainingPlayerCards[nextPlayerId] > 0)
        ? nextPlayerId
        : Object.entries(remainingPlayerCards)
            .filter(([pid, count]) => pid !== config.id && count > 0)
            .sort((a, b) => a[1] - b[1])[0]?.[0];

      if (targetOpponentId) {
        const passedCombos = tracker.getOpponentWeaknessCombos(targetOpponentId);

        for (const combo of partition.combinations) {
          if (
            combo.type !== 'FOUR_OF_A_KIND' &&
            combo.type !== 'THREE_PAIRS_SEQUENTIAL' &&
            combo.type !== 'FOUR_PAIRS_SEQUENTIAL'
          ) {
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
                  reason: `Khai thác điểm yếu: Đánh ${combo.type} do người kế tiếp (${targetOpponentId}) từng bỏ lượt`
                };
              }
            }
          }
        }
      }
    }

    // 3. Ưu tiên cao nhất đối với Bot trình độ cao (Tier 3/4/5): Xả Bộ lớn trước (Sảnh dài, Sám, Đôi) để giảm mạnh số lá trên tay
    if (config.tempoControl && config.tempoControl >= 0.5 && partition.combinations.length > 0) {
      const nonChopCombos = partition.combinations.filter(
        c =>
          c.type !== 'FOUR_OF_A_KIND' &&
          c.type !== 'THREE_PAIRS_SEQUENTIAL' &&
          c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
          c.type !== 'FIVE_PAIRS_SEQUENTIAL'
      );

      if (nonChopCombos.length > 0) {
        const sortedCombos = [...nonChopCombos].sort((a, b) => {
          if (b.cards.length !== a.cards.length) {
            return b.cards.length - a.cards.length; // Bộ nhiều lá (Sảnh dài) ưu tiên trước
          }
          return a.highestCard.weight - b.highestCard.weight; // Đánh bộ nhỏ trước để giữ bộ to bọc lót lấy lại cái
        });

        const chosenCombo = sortedCombos[0];
        const matchingMove = validMoves.find(
          m =>
            m.combination.type === chosenCombo.type &&
            m.cards.length === chosenCombo.cards.length &&
            m.combination.highestCard.rank === chosenCombo.highestCard.rank
        );

        if (matchingMove) {
          return {
            type: 'PLAY',
            cards: matchingMove.cards,
            combination: matchingMove.combination,
            reason: `Kiểm soát nhịp độ: Đánh bộ ${chosenCombo.type} ${chosenCombo.cards.length} lá`
          };
        }
      }
    }

    // 4. Nếu có Hàng Chặt và bài ít lá (<= 5 lá): Gài bẫy câu Heo đối thủ
    if (
      hand.length <= 5 &&
      (config.baitingTendency || 0) > 0.5 &&
      partition.combinations.some(
        c =>
          c.type === 'FOUR_OF_A_KIND' ||
          c.type === 'THREE_PAIRS_SEQUENTIAL' ||
          c.type === 'FOUR_PAIRS_SEQUENTIAL'
      )
    ) {
      const baitCards = hand.filter(c => isTwo(c) || c.rank === 14);
      if (baitCards.length > 0) {
        const smallestBait = sortCards(baitCards)[0];
        const baitMove = validMoves.find(m => m.cards.length === 1 && m.cards[0].id === smallestBait.id);
        if (baitMove) {
          return {
            type: 'PLAY',
            cards: baitMove.cards,
            combination: baitMove.combination,
            reason: 'Mồi nhử Heo để chuẩn bị chặt hàng'
          };
        }
      }
    }

    // 5. Ưu tiên xả tổ hợp dài (Sảnh, Sám) trước để giảm nhanh số lá bài và duy trì thế thượng phong
    if (partition.combinations.length > 0) {
      const nonChopCombos = partition.combinations.filter(
        c =>
          c.type !== 'FOUR_OF_A_KIND' &&
          c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
          c.type !== 'THREE_PAIRS_SEQUENTIAL'
      );

      const longCombo = nonChopCombos.find(c => c.cards.length >= 3);
      if (longCombo && (config.tempoControl || 0) >= 0.45) {
        const move = validMoves.find(
          m =>
            m.combination.type === longCombo.type &&
            m.combination.length === longCombo.length &&
            m.combination.highestCard.id === longCombo.highestCard.id
        );
        if (move) {
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: 'Xả tổ hợp dài để giữ nhịp và giảm nhanh số lá bài'
          };
        }
      }
    }

    // 5. Đánh rác nhỏ nhất để tống bài lẻ (chỉ chặn không đánh rác nhỏ khi người kế tiếp báo 1 lá)
    const nonTwoTrash = partition.trashCards.filter(c => !isTwo(c));
    if (nonTwoTrash.length > 0 && !context.isNextPlayerOneCard) {
      const smallestTrash = nonTwoTrash[0];
      const move = validMoves.find(
        m => m.combination.type === 'SINGLE' && m.cards[0].id === smallestTrash.id
      );
      if (move) {
        return {
          type: 'PLAY',
          cards: move.cards,
          combination: move.combination,
          reason: 'Tống rác nhỏ nhất (giữ Heo lại)'
        };
      }
    }

    // 6. Đánh bộ nhỏ nhất trong các tổ hợp đã ghép
    if (partition.combinations.length > 0) {
      const nonChopCombos = partition.combinations.filter(
        c =>
          c.type !== 'FOUR_OF_A_KIND' &&
          c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
          c.type !== 'THREE_PAIRS_SEQUENTIAL'
      );

      if (nonChopCombos.length > 0) {
        const smallestCombo = nonChopCombos[0];
        const move = validMoves.find(
          m =>
            m.combination.type === smallestCombo.type &&
            m.combination.length === smallestCombo.length &&
            m.combination.highestCard.id === smallestCombo.highestCard.id
        );
        if (move) {
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: 'Đánh bộ nhỏ nhất để giữ nhịp'
          };
        }
      }
    }

    // 7. Nếu có MCTS: Chọn nước đi tối ưu theo tỉ lệ thắng
    if (mctsMap && mctsMap.size > 0) {
      let bestMove = validMoves[0];
      let bestWinRate = -1;
      for (const m of validMoves) {
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
        reason: 'MCTS tối ưu nước đi'
      };
    }

    // 8. Nếu không còn rác thường và không còn bộ: Đánh rác bất kỳ (kể cả Heo nếu chỉ còn toàn Heo)
    if (partition.trashCards.length > 0) {
      const smallestTrash = partition.trashCards[0];
      const move = validMoves.find(
        m => m.combination.type === 'SINGLE' && m.cards[0].id === smallestTrash.id
      );
      if (move) {
        return {
          type: 'PLAY',
          cards: move.cards,
          combination: move.combination,
          reason: 'Đánh rác còn lại'
        };
      }
    }

    const defaultMove = validMoves[0];
    return {
      type: 'PLAY',
      cards: defaultMove.cards,
      combination: defaultMove.combination,
      reason: 'Nước đi hợp lệ mặc định'
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
        if (isTargetTwo) {
          // Đối phương ĐÁNH HEO -> Bot có Heo to hơn đè là hợp lý
          score += 100;
          if ((config.simulationLookahead || 0) >= 2 && twoSafety.riskScore > 50) {
            score -= (twoSafety.riskScore - 50) * (1 - (config.riskAppetite || 0.5));
          }
        } else {
          // Đối phương KHÔNG ĐÁNH HEO (đối phương đánh bài thường 3..A):
          // Dùng Heo đè bài thường là hành động tốn kém, cần được kiểm soát chặt chẽ!
          if (isEmergencyAntiLeader) {
            // Trường hợp khẩn cấp: Đối thủ còn 1 lá -> Bắt buộc đè để chặn về nhất
            // CŨ: score += 200 * (config.antiLeaderAggression || 0.85);
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
  const antiLeader = new AntiLeaderInterceptHandler();
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
  const { hand, currentRoundLeadingMove, isFirstMoveOfGame, isLeadMove, config, remainingPlayerCards, tracker } = context;

  // 1. Sinh danh sách nước đi hợp lệ
  const candidateMoveCards = generateCandidateMoves(hand);
  const targetCombo = currentRoundLeadingMove?.combination || null;

  const validMoves: ValidMoveInfo[] = [];
  for (const cards of candidateMoveCards) {
    const valResult = isValidMove(cards, targetCombo, isFirstMoveOfGame, isLeadMove);
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
      const sorted = sortCards(hand);
      const singleCard = sorted[0];
      const singleCombo = identifyCombination([singleCard])!;
      return {
        type: 'PLAY',
        cards: [singleCard],
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
