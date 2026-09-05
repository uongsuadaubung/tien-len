import { Card, Combination, PlayedMove } from './types';
import { isValidMove } from './validator';
import { compareCards } from './card';
import { generateCandidateMoves } from '../ai/decision-maker';

export interface QuickSelectCandidate {
  cards: Card[];
  combination: Combination;
  isChop: boolean;
}

export interface QuickSelectContext {
  hand: Card[];
  leadingMove: PlayedMove | null;
  isLeadMove: boolean;
  isFirstMoveOfGame: boolean | null;
  allowFourPairsCutAnytime: boolean | null;
  prohibitEndingWithTwo: boolean | null;
}

/**
 * Tìm kiếm toàn bộ các tổ hợp hợp lệ để đè bài trên bàn (hoặc mở màn)
 * và sắp xếp theo thứ tự "Vừa khít nhất" (Tối ưu từ nhỏ đến lớn)
 */
export function getSortedQuickSelectCandidates(context: QuickSelectContext): QuickSelectCandidate[] {
  const hand = context.hand;
  const leadingMove = context.leadingMove;
  const isLeadMove = context.isLeadMove;
  const isFirstMoveOfGame = context.isFirstMoveOfGame ?? false;
  const allowFourPairsCutAnytime = context.allowFourPairsCutAnytime ?? true;
  const prohibitEndingWithTwo = context.prohibitEndingWithTwo ?? true;

  if (!hand || hand.length === 0) return [];

  const rawCandidateCards = generateCandidateMoves(hand);
  const targetCombo = leadingMove?.combination || null;

  const validCandidates: QuickSelectCandidate[] = [];

  // Lọc các tổ hợp hợp lệ theo luật chơi
  for (const cards of rawCandidateCards) {
    const isFinishing = cards.length === hand.length;
    const valResult = isValidMove({
      cards,
      target: targetCombo,
      isFirstMoveOfGame,
      isLeadMove,
      hasPassedRound: false,
      allowFourPairsCutAnytime,
      isFinishingMove: isFinishing,
      prohibitEndingWithTwo
    });

    if (valResult.valid) {
      validCandidates.push({
        cards,
        combination: valResult.combination,
        isChop: valResult.isChop
      });
    }
  }

  if (validCandidates.length === 0) return [];

  // Sắp xếp thứ tự các tổ hợp từ "Vừa khít nhất" (nhỏ nhất) đến lớn nhất
  validCandidates.sort((a, b) => {
    // 1. Nếu một bên là Chặt Heo/Hàng và một bên là đè bài thường:
    // Ưu tiên đè bài thường trước (tiết kiệm Hàng quý)
    if (a.isChop !== b.isChop) {
      return a.isChop ? 1 : -1;
    }

    // 2. Nếu cùng kiểu tổ hợp và cùng số lượng lá: so sánh quân bài cao nhất (nhỏ xếp trước)
    if (a.combination.type === b.combination.type && a.combination.length === b.combination.length) {
      return compareCards(a.combination.highestCard, b.combination.highestCard);
    }

    // 3. Nếu là Lead Move (hoặc các kiểu khác nhau): Ưu tiên Rác nhỏ -> Đôi nhỏ -> Sám -> Sảnh ngắn/nhỏ -> Hàng
    const typeWeights: Record<string, number> = {
      SINGLE: 1,
      PAIR: 2,
      TRIPLE: 3,
      STRAIGHT: 4,
      THREE_PAIRS_SEQUENTIAL: 5,
      FOUR_OF_A_KIND: 6,
      FOUR_PAIRS_SEQUENTIAL: 7
    };

    const weightA = typeWeights[a.combination.type] || 99;
    const weightB = typeWeights[b.combination.type] || 99;

    if (weightA !== weightB) {
      return weightA - weightB;
    }

    // Nếu cùng kiểu (ví dụ cùng là Sảnh nhưng khác độ dài khi lead)
    if (a.combination.length !== b.combination.length) {
      return a.combination.length - b.combination.length;
    }

    return compareCards(a.combination.highestCard, b.combination.highestCard);
  });

  return validCandidates;
}

/**
 * Lấy tổ hợp tiếp theo để chọn nhanh (Hỗ trợ cycle xoay vòng các phương án)
 */
export function getNextQuickSelectCards(
  context: QuickSelectContext,
  currentSelectedIds: Set<string>
): Card[] | null {
  const candidates = getSortedQuickSelectCandidates(context);
  if (candidates.length === 0) return null;

  // Kiểm tra xem hiện tại đang chọn tổ hợp nào trong danh sách candidate
  const currentIndex = candidates.findIndex(cand => {
    if (cand.cards.length !== currentSelectedIds.size) return false;
    return cand.cards.every(c => currentSelectedIds.has(c.id));
  });

  if (currentIndex === -1) {
    // Chưa chọn gì hoặc đang chọn bài khác -> Chọn phương án vừa khít nhất (index 0)
    return candidates[0].cards;
  }

  // Nếu đang chọn đúng candidate -> Chuyển sang phương án tiếp theo (xoay vòng)
  const nextIndex = (currentIndex + 1) % candidates.length;
  return candidates[nextIndex].cards;
}
