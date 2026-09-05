import { Card, Combination } from './types';
import { compareCards, isTwo } from './card';
import { identifyCombination } from './combinations';

export interface ValidValidationResult {
  readonly valid: true;
  readonly combination: Combination;
  readonly isChop: boolean;
  readonly reason?: undefined;
}

export interface InvalidValidationResult {
  readonly valid: false;
  readonly combination?: undefined;
  readonly isChop?: undefined;
  readonly reason: string;
}

export type ValidationResult = ValidValidationResult | InvalidValidationResult;

/**
 * Kiểm tra xem tổ hợp `candidate` có đè / chặt được tổ hợp `target` hay không
 */
export function canBeat(candidate: Combination, target: Combination): ValidationResult {
  // 1. Trường hợp cùng loại tổ hợp và cùng số lượng lá
  if (candidate.type === target.type && candidate.length === target.length) {
    if (compareCards(candidate.highestCard, target.highestCard) > 0) {
      const isChopSpecial =
        candidate.type === 'THREE_PAIRS_SEQUENTIAL' ||
        candidate.type === 'FOUR_OF_A_KIND' ||
        candidate.type === 'FOUR_PAIRS_SEQUENTIAL';

      return {
        valid: true,
        combination: candidate,
        isChop: isChopSpecial
      };
    }
    return { valid: false, reason: 'Bài đánh ra nhỏ hơn bài trên bàn' };
  }

  // 2. Chặt 1 Heo (Single 2)
  if (target.type === 'SINGLE' && isTwo(target.highestCard)) {
    if (
      candidate.type === 'THREE_PAIRS_SEQUENTIAL' ||
      candidate.type === 'FOUR_OF_A_KIND' ||
      candidate.type === 'FOUR_PAIRS_SEQUENTIAL'
    ) {
      return {
        valid: true,
        combination: candidate,
        isChop: true
      };
    }
  }

  // 3. Chặt Đôi Heo (Pair of 2s)
  if (target.type === 'PAIR' && isTwo(target.highestCard)) {
    if (
      candidate.type === 'FOUR_OF_A_KIND' ||
      candidate.type === 'FOUR_PAIRS_SEQUENTIAL'
    ) {
      return {
        valid: true,
        combination: candidate,
        isChop: true
      };
    }
    if (candidate.type === 'THREE_PAIRS_SEQUENTIAL') {
      return {
        valid: false,
        reason: '3 Đôi thông không chặt được đôi Heo (cần Tứ quý hoặc 4 đôi thông)'
      };
    }
  }

  // 4. Chặt 3 Đôi Thông
  if (target.type === 'THREE_PAIRS_SEQUENTIAL') {
    if (
      candidate.type === 'FOUR_OF_A_KIND' ||
      candidate.type === 'FOUR_PAIRS_SEQUENTIAL'
    ) {
      return {
        valid: true,
        combination: candidate,
        isChop: true
      };
    }
  }

  // 5. Chặt Tứ Quý
  if (target.type === 'FOUR_OF_A_KIND') {
    if (candidate.type === 'FOUR_PAIRS_SEQUENTIAL') {
      return {
        valid: true,
        combination: candidate,
        isChop: true
      };
    }
  }

  return {
    valid: false,
    reason: 'Tổ hợp bài không phù hợp để đè bộ bài hiện tại'
  };
}

export interface IsValidMoveContext {
  cards: Card[];
  target: Combination | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
  hasPassedRound: boolean;
  allowFourPairsCutAnytime: boolean;
  isFinishingMove: boolean;
  prohibitEndingWithTwo: boolean;
}

/**
 * Thẩm định toàn diện một nước đi theo luật Tiến Lên Miền Nam
 * Nhận duy nhất 1 đối tượng context với đầy đủ tất cả các trường bắt buộc
 */
export function isValidMove(context: IsValidMoveContext): ValidationResult {
  const {
    cards,
    target,
    isFirstMoveOfGame,
    isLeadMove,
    hasPassedRound,
    allowFourPairsCutAnytime,
    isFinishingMove,
    prohibitEndingWithTwo
  } = context;

  if (!cards || cards.length === 0) {
    return { valid: false, reason: 'Chưa chọn lá bài nào' };
  }

  // Nhận diện tổ hợp
  const combination = identifyCombination(cards);
  if (!combination) {
    return { valid: false, reason: 'Tổ hợp các lá bài không hợp lệ theo luật' };
  }

  // Ràng buộc luật cấm đánh 2 cuối cùng (Cấm về Heo)
  if (prohibitEndingWithTwo && isFinishingMove) {
    const hasTwo = cards.some(isTwo);
    if (hasTwo) {
      return {
        valid: false,
        reason: 'Luật cấm về bằng lá Heo (2) cuối cùng! Bạn không thể đánh 2 để hết bài.'
      };
    }
  }

  // Ràng buộc ván đầu tiên: Phải chứa 3 Bích (3S)
  if (isFirstMoveOfGame) {
    const has3Spades = cards.some(c => c.rank === 3 && c.suit === 'SPADES');
    if (!has3Spades) {
      return {
        valid: false,
        reason: 'Lượt đánh đầu tiên của ván đầu bắt buộc phải chứa quân 3 Bích (3♠)'
      };
    }
  }

  // Nếu là lượt mở đầu vòng mới (Lead move) hoặc bàn đang trống
  if (isLeadMove || !target) {
    return {
      valid: true,
      combination,
      isChop: false
    };
  }

  // Nếu người chơi đã bỏ lượt trong vòng này
  if (hasPassedRound) {
    // Trường hợp ngoại lệ: 4 đôi thông có thể nhảy vòng chặt tự do
    if (allowFourPairsCutAnytime && combination.type === 'FOUR_PAIRS_SEQUENTIAL') {
      return canBeat(combination, target);
    }
    return { valid: false, reason: 'Bạn đã bỏ lượt trong vòng này' };
  }

  // Kiểm tra luật đè bài bình thường & chặt heo/hàng
  return canBeat(combination, target);
}
