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
}

export interface BotDecision {
  type: 'PLAY' | 'PASS';
  cards?: Card[];
  combination?: Combination;
  reason?: string;
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
      // Tìm các tổ hợp tăng dần liên tiếp không chứa 2
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
        pairGroups.length = 0; // Bị đứt đoạn
      }

      if (pairGroups.length === pairCount) {
        candidates.push(pairGroups.flat());
        pairGroups.shift(); // Trượt cửa sổ
      }
    }
  }

  return candidates;
}

/**
 * Tính số nhịp đánh tối thiểu để sạch bài (Turns-to-Win)
 */
function calculateTurnsToWin(partition: { combinations: Combination[]; trashCards: Card[] }): number {
  return partition.trashCards.length + partition.combinations.length;
}

/**
 * Bộ giải thế cờ tàn (Endgame Solver) khi bài còn <= 4 lá
 * Tìm chuỗi nước đi tất thắng (Guaranteed Win Path)
 */
function solveEndgame(
  hand: Card[],
  validMoves: { cards: Card[]; combination: Combination; isChop: boolean }[],
  isLeadMove: boolean,
  tracker: CardTracker
): { cards: Card[]; combination: Combination } | null {
  if (hand.length > 4 || validMoves.length === 0) return null;

  // Trường hợp 1: Có nước đi đánh 1 phát hết sạch bài luôn
  const instantFinish = validMoves.find(m => m.cards.length === hand.length);
  if (instantFinish) return instantFinish;

  // Trường hợp 2: Nếu là Lead Move, tìm nước đi mà sau khi đánh, lá bài còn lại là lá to nhất bàn chắc chắn giành cái
  if (isLeadMove) {
    for (const move of validMoves) {
      const remaining = hand.filter(c => !move.cards.some(mc => mc.id === c.id));
      if (remaining.length === 1 && tracker.isStrongestRemainingSingle(remaining[0])) {
        return move;
      }
    }
  }

  return null;
}

/**
 * Đưa ra quyết định tối ưu cho Bot dựa trên cấu hình Persona và các thuật toán AI nâng cao
 */
export function makeBotDecision(context: DecisionContext): BotDecision {
  const {
    hand,
    currentRoundLeadingMove,
    isFirstMoveOfGame,
    isLeadMove,
    tracker,
    config,
    remainingPlayerCards
  } = context;

  if (!hand || hand.length === 0) {
    return { type: 'PASS', reason: 'Không còn bài' };
  }

  const partition = partitionHand(hand, config.handPartitioningOptimality);
  const targetCombo = currentRoundLeadingMove ? currentRoundLeadingMove.combination : null;
  const twoSafety = tracker.getTwoSafetyReport();
  const remainingOpponentTwos = tracker.getRemainingTwosCount();

  const activeOpponents = Object.entries(remainingPlayerCards).filter(
    ([id, count]) => id !== context.config.id && count > 0
  );
  const minOpponentCards =
    activeOpponents.length > 0
      ? Math.min(...activeOpponents.map(([, count]) => count))
      : 999;
  const isEmergencyAntiLeader = minOpponentCards <= 3;
  const leaderOpponentId = activeOpponents.find(
    ([, count]) => count === minOpponentCards
  )?.[0];
  const activeOpponentsCount = activeOpponents.length;

  const hasSpecialChopCombo = partition.combinations.some(
    c =>
      c.type === 'THREE_PAIRS_SEQUENTIAL' ||
      c.type === 'FOUR_OF_A_KIND' ||
      c.type === 'FOUR_PAIRS_SEQUENTIAL'
  );

  const allCandidateCards = generateCandidateMoves(hand);
  const validMoves: { cards: Card[]; combination: Combination; isChop: boolean }[] = [];

  for (const candidate of allCandidateCards) {
    const val = isValidMove(
      candidate,
      targetCombo,
      isFirstMoveOfGame,
      isLeadMove,
      false,
      true
    );
    if (val.valid && val.combination) {
      validMoves.push({
        cards: candidate,
        combination: val.combination,
        isChop: !!val.isChop
      });
    }
  }

  if (validMoves.length === 0) {
    return { type: 'PASS', reason: 'Không có bài đè' };
  }

  // 0. BỘ GIẢI THẾ CỜ TÀN (ENDGAME SOLVER) KHI BÀI <= 4 LÁ
  const endgameMove = solveEndgame(hand, validMoves, isLeadMove || !targetCombo, tracker);
  if (endgameMove) {
    return {
      type: 'PLAY',
      cards: endgameMove.cards,
      combination: endgameMove.combination,
      reason: 'Endgame Solver: Chuỗi nước đi tất thắng'
    };
  }

  // 0.1 CHẠY MÔ PHỎNG MONTE CARLO (MCTS ROLLOUT) NẾU ĐƯỢC BẬT
  let mctsMap: Map<string, number> = new Map();
  if (config.mctsSimulations && config.mctsSimulations > 0) {
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

  // 1. TRƯỜNG HỢP: Mở Đầu Vòng (Lead Move)
  if (isLeadMove || !targetCombo) {
    if (isFirstMoveOfGame) {
      const valid3SMoves = validMoves.filter(m =>
        m.cards.some(c => c.rank === 3 && c.suit === 'SPADES')
      );
      valid3SMoves.sort((a, b) => b.cards.length - a.cards.length);
      const chosen = valid3SMoves[0] || validMoves[0];
      return {
        type: 'PLAY',
        cards: chosen.cards,
        combination: chosen.combination
      };
    }

    if (isEmergencyAntiLeader && leaderOpponentId) {
      const passedStraights = partition.combinations.filter(
        c => c.type === 'STRAIGHT' && tracker.hasOpponentPassedOnStraightLength(leaderOpponentId, c.length)
      );
      if (passedStraights.length > 0) {
        const target = passedStraights[0];
        const move = validMoves.find(
          m => m.combination.type === target.type && m.combination.length === target.length
        );
        if (move) {
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: 'Anti-Leader: Đánh sảnh khai thác điểm mù đối thủ'
          };
        }
      }

      for (const combo of partition.combinations) {
        if (tracker.hasOpponentPassedOnType(leaderOpponentId, combo.type)) {
          const move = validMoves.find(
            m => m.combination.type === combo.type && m.combination.length === combo.length
          );
          if (move) {
            return {
              type: 'PLAY',
              cards: move.cards,
              combination: move.combination,
              reason: 'Anti-Leader: Đánh kiểu bài đối thủ từng bỏ lượt'
            };
          }
        }
      }
    }

    // CHIẾN THUẬT: Gài Bẫy & Dụ Heo (Baiting Strategy)
    // Chỉ gài bẫy khi vẫn còn Heo của đối thủ trên bàn và bài còn nhiều lá
    const baitingTendency = config.baitingTendency || (config.trapTendency > 0.7 ? 0.8 : 0);
    if (hasSpecialChopCombo && remainingOpponentTwos > 0 && hand.length > 5 && baitingTendency > 0.6) {
      const baitCards = partition.trashCards.filter(c => (c.rank === 14 || c.rank === 13) && !isTwo(c));
      if (baitCards.length > 0) {
        const baitCard = baitCards[0];
        const move = validMoves.find(
          m => m.cards.length === 1 && m.cards[0].id === baitCard.id
        );
        if (move) {
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: 'Baiting: Đánh Át/K câu Heo đối thủ'
          };
        }
      }
    }

    // Với bot trình độ cao (handPartitioningOptimality >= 0.7): Ưu tiên xả tổ hợp lớn (Sảnh, Đôi, Sám) để giảm nhanh số lượng lá
    if (config.handPartitioningOptimality >= 0.7 && partition.combinations.length > 0) {
      const validCombosToPlay = partition.combinations.filter(c => {
        if (c.type === 'FOUR_OF_A_KIND' || c.type === 'FOUR_PAIRS_SEQUENTIAL' || c.type === 'THREE_PAIRS_SEQUENTIAL') {
          return remainingOpponentTwos === 0 || hand.length <= 5;
        }
        return true;
      });

      // Sắp xếp ưu tiên sảnh dài trước hoặc đôi
      validCombosToPlay.sort((a, b) => b.cards.length - a.cards.length);

      if (validCombosToPlay.length > 0) {
        const bestCombo = validCombosToPlay[0];
        const move = validMoves.find(
          m =>
            m.combination.type === bestCombo.type &&
            m.combination.length === bestCombo.length &&
            m.combination.highestCard.id === bestCombo.highestCard.id
        );
        if (move) {
          return {
            type: 'PLAY',
            cards: move.cards,
            combination: move.combination,
            reason: 'High-Elo: Xả tổ hợp bài lớn để giảm nhanh số lá'
          };
        }
      }
    }

    // Ưu tiên MCTS nếu có đánh giá vượt trội (>= 40%)
    if (mctsMap.size > 0) {
      let bestMctsMove = validMoves[0];
      let maxMctsWinRate = -1;
      for (const move of validMoves) {
        const key = move.cards.map(c => c.id).sort().join('_');
        const winRate = mctsMap.get(key) ?? 0;
        if (winRate > maxMctsWinRate) {
          maxMctsWinRate = winRate;
          bestMctsMove = move;
        }
      }

      if (maxMctsWinRate >= 0.4) {
        return {
          type: 'PLAY',
          cards: bestMctsMove.cards,
          combination: bestMctsMove.combination,
          reason: `MCTS Rollout: Tỷ lệ thắng ${(maxMctsWinRate * 100).toFixed(0)}%`
        };
      }
    }

    const trashSingles = partition.trashCards.filter(c => !isTwo(c));
    if (trashSingles.length > 0) {
      const smallestTrash = trashSingles[0];
      const move = validMoves.find(
        m => m.cards.length === 1 && m.cards[0].id === smallestTrash.id
      );
      if (move) {
        return {
          type: 'PLAY',
          cards: move.cards,
          combination: move.combination
        };
      }
    }

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
            combination: move.combination
          };
        }
      }
    }

    const defaultMove = validMoves[0];
    return {
      type: 'PLAY',
      cards: defaultMove.cards,
      combination: defaultMove.combination
    };
  }

  // 2. TRƯỜNG HỢP: Đè Bài Trong Vòng (Responding Move)
  let bestMoveScore = -9999;
  let bestMove: { cards: Card[]; combination: Combination; isChop: boolean } | null = null;

  const pendingCombosCardCount = partition.combinations.reduce((acc, c) => acc + c.cards.length, 0);
  const leadValueRatio = pendingCombosCardCount / Math.max(1, hand.length);

  for (const move of validMoves) {
    let score = 50; // Điểm cơ bản khuyến khích đánh bài hợp lệ thay vì bỏ lượt vô cớ

    if (move.isChop) {
      score += 280;
      if (targetCombo && isTwo(targetCombo.highestCard)) {
        score += 60;
      }
      score += (config.trapTendency || 0.5) * 50;
    }

    if (move.cards.some(isTwo)) {
      if (twoSafety.isSafe) {
        score += 70;
      } else {
        const riskPenalty = twoSafety.riskScore * (1.1 - config.riskAppetite);
        score -= riskPenalty;
      }

      const activeOpponentsCount = Object.keys(remainingPlayerCards).filter(id => id !== context.config.id).length;
      if (isEmergencyAntiLeader || activeOpponentsCount === 1) {
        score += 170 * (config.antiLeaderAggression || 0.85);
      } else if (config.riskAppetite > 0.7) {
        score += 40;
      }

      if ((isEmergencyAntiLeader || activeOpponentsCount === 1) && (config.damageControl || 0) > 0.3) {
        score += 85 * (config.damageControl || 0.5);
      }
    }

    if ((config.tempoControl || 0) > 0.2) {
      score += leadValueRatio * 130 * (config.tempoControl || 0.5);
    }

    const key = move.cards.map(c => c.id).sort().join('_');
    if (mctsMap.has(key)) {
      const winRate = mctsMap.get(key)!;
      score += winRate * 200;
    }

    if (isEmergencyAntiLeader) {
      score += 100 * (config.antiLeaderAggression || 0.85);
    }

    const moveCardIds = new Set(move.cards.map(c => c.id));
    let breaksImportantCombo = false;

    for (const combo of partition.combinations) {
      const comboCardIds = combo.cards.map((c: Card) => c.id);
      const overlapCount = comboCardIds.filter((id: string) => moveCardIds.has(id)).length;
      if (overlapCount > 0 && overlapCount < combo.cards.length) {
        breaksImportantCombo = true;
        break;
      }
    }

    if (breaksImportantCombo) {
      // Trong cờ tàn (hand <= 5 lá) hoặc khi 1v1 / khẩn cấp: Giảm nhẹ hình phạt phá bộ để cướp nhịp dứt điểm
      const penaltyDiscount = (hand.length <= 5 || isEmergencyAntiLeader || activeOpponentsCount === 1) ? 0.35 : 1.0;
      score -= 75 * config.handPartitioningOptimality * penaltyDiscount;
    }

    const isTrash = move.cards.every(c => partition.trashCards.some(tc => tc.id === c.id));
    if (isTrash) {
      score += 40;
    }

    // Nếu đánh nước này xong giúp bot còn <= 2 lá (sắp thắng): Tăng điểm mạnh
    if (hand.length - move.cards.length <= 2) {
      score += 70;
    }

    const weightDiff = move.combination.highestCard.weight - targetCombo!.highestCard.weight;
    score -= weightDiff * 0.25;

    if (move.cards.length === 1 && tracker.isStrongestRemainingSingle(move.cards[0]) && hand.length > 2) {
      score -= 25 * (1 - config.riskAppetite);
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

