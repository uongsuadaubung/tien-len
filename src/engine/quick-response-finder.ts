import { Card, Combination, PlayedMove } from './types';
import { wasmGetSortedQuickSelectCandidates } from './wasm-bridge';

export interface QuickSelectCandidate {
  cards: Card[];
  combination: Combination;
  isChop: boolean;
}

export interface QuickSelectContext {
  hand: Card[];
  leadingMove: PlayedMove | null;
  isLeadMove: boolean;
  isFirstMoveOfGame?: boolean | null;
  allowFourPairsCutAnytime?: boolean | null;
  prohibitEndingWithTwo?: boolean | null;
  firstMoveRequiredCard?: Card | null;
}

/**
 * Tìm kiếm toàn bộ các tổ hợp hợp lệ để đè bài trên bàn (hoặc mở màn)
 * và sắp xếp theo thứ tự "Vừa khít nhất" (Tối ưu từ nhỏ đến lớn qua Rust WASM)
 */
export function getSortedQuickSelectCandidates(context: QuickSelectContext): QuickSelectCandidate[] {
  const { hand, leadingMove, isLeadMove, firstMoveRequiredCard } = context;
  const isFirstMoveOfGame = context.isFirstMoveOfGame === true;
  const prohibitEndingWithTwo = context.prohibitEndingWithTwo !== false;

  if (!hand || hand.length === 0) return [];

  return wasmGetSortedQuickSelectCandidates(
    hand,
    leadingMove ? leadingMove.combination : null,
    isLeadMove,
    isFirstMoveOfGame,
    firstMoveRequiredCard ? firstMoveRequiredCard.id : null,
    prohibitEndingWithTwo
  );
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

