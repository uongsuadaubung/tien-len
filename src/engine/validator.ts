import { Card, Combination } from './types';
import { isTwo, formatCard, formatCardVietnamese } from './card';
import { identifyCombination } from './combinations';
import { wasmCanBeat, wasmCanChop } from './wasm-bridge';

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
  const isBeating = wasmCanBeat(candidate, target);
  if (isBeating) {
    const isChop = wasmCanChop(candidate, target) ||
      candidate.type === 'THREE_PAIRS_SEQUENTIAL' ||
      candidate.type === 'FOUR_PAIRS_SEQUENTIAL';
    return {
      valid: true,
      combination: candidate,
      isChop
    };
  }

  return {
    valid: false,
    reason: 'Tổ hợp này không thể đè hoặc chặt được tổ hợp bài đang có trên bàn'
  };
}

export interface BaseValidMoveContext {
  cards: Card[];
  target: Combination | null;
  isLeadMove: boolean;
  hasPassedRound: boolean;
  allowFourPairsCutAnytime: boolean;
  isFinishingMove: boolean;
  prohibitEndingWithTwo: boolean;
}

export interface FirstMoveOfGameContext extends BaseValidMoveContext {
  isFirstMoveOfGame: true;
  firstMoveRequiredCard: Card;
}

export interface NormalMoveContext extends BaseValidMoveContext {
  isFirstMoveOfGame: false;
  firstMoveRequiredCard?: null;
}

export type IsValidMoveContext = FirstMoveOfGameContext | NormalMoveContext;

/**
 * Thẩm định toàn diện một nước đi theo luật Tiến Lên Miền Nam
 * Nhận duy nhất 1 đối tượng context với đầy đủ tất cả các trường bắt buộc
 */
export function isValidMove(context: IsValidMoveContext): ValidationResult {
  const {
    cards,
    target,
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

  // Ràng buộc ván đầu tiên: Phải chứa quân bài mở màn nhỏ nhất bàn (được định danh chặt chẽ qua context)
  if (context.isFirstMoveOfGame) {
    const requiredCard = context.firstMoveRequiredCard;
    const hasRequiredCard = cards.some(c => c.id === requiredCard.id);
    if (!hasRequiredCard) {
      return {
        valid: false,
        reason: `Lượt đánh đầu tiên của ván đầu bắt buộc phải chứa quân ${formatCardVietnamese(requiredCard)} (${formatCard(requiredCard)})`
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
