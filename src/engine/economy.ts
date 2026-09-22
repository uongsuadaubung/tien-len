import { Card, Combination, MatchPlayer } from './types';
import { isRedCard, isTwo } from './card';
import {
  wasmCalculateChopPenalty,
  wasmCalculateRottenPenalty,
  wasmCalculateCongPenalty,
  wasmCalculateCountCardsSettlement,
  wasmCalculateWinnerTakesAllSettlement,
  wasmCalculateTraditionalSettlement
} from './wasm-bridge';

export interface EconomySettings {
  readonly betAmount: number;
  readonly penaltyMultiplier: number | null;
  readonly hardcoreMultiplier: number | null;
}

export interface ChopPenaltyResult {
  readonly chopperId: string;
  readonly targetId: string;
  readonly amount: number;
  readonly description: string;
}

export interface EndGameSettlementResult {
  readonly payouts: Readonly<Record<string, number>>; // playerId -> net change
  readonly loanDeductions: Readonly<Record<string, number>>; // playerId -> loan repaid
  readonly congedPlayerIds: readonly string[];
  readonly rottenPenalties: Readonly<Record<string, number>>;
}

/**
 * Helper trích xuất hệ số nhân sát phạt (multiplier: 1x, 2x, 3x, 4x, 5x...)
 */
function getMultiplier(val: number = 1): number {
  if (val < 0) {
    throw new Error(`[getMultiplier] Invariant violated: multiplier cannot be negative (got ${val})`);
  }
  return Math.max(1, val);
}

function getChopDescription(target: Combination, amount: number): string {
  if (target.type === 'SINGLE' && isTwo(target.highestCard)) {
    const isRed = isRedCard(target.highestCard);
    return isRed
      ? `Chặt Heo Đỏ (+${amount.toLocaleString()} xu)`
      : `Chặt Heo Đen (+${amount.toLocaleString()} xu)`;
  }
  if (target.type === 'PAIR' && isTwo(target.highestCard)) {
    return `Chặt Đôi Heo (+${amount.toLocaleString()} xu)`;
  }
  if (target.type === 'THREE_PAIRS_SEQUENTIAL') {
    return `Chặt Đè 3 Đôi Thông (+${amount.toLocaleString()} xu)`;
  }
  if (target.type === 'FOUR_OF_A_KIND') {
    return `Chặt Đè Tứ Quý (+${amount.toLocaleString()} xu)`;
  }
  if (target.type === 'FOUR_PAIRS_SEQUENTIAL') {
    return `Chặt Đè 4 Đôi Thông (+${amount.toLocaleString()} xu)`;
  }
  return `Chặt Hàng (+${amount.toLocaleString()} xu)`;
}

function calculateChopPenaltyTsFallback(target: Combination, betAmount: number, penaltyMultiplier: number): number {
  const mult = getMultiplier(penaltyMultiplier);
  if (target.type === 'SINGLE' && isTwo(target.highestCard)) {
    return betAmount * (isRedCard(target.highestCard) ? 2 : 1) * mult;
  }
  if (target.type === 'PAIR' && isTwo(target.highestCard)) {
    const redCount = target.cards.filter(isRedCard).length;
    const baseMult = redCount === 2 ? 4 : redCount === 1 ? 3 : 2;
    return betAmount * baseMult * mult;
  }
  if (target.type === 'THREE_PAIRS_SEQUENTIAL') return betAmount * 3 * mult;
  if (target.type === 'FOUR_OF_A_KIND') return betAmount * 4 * mult;
  if (target.type === 'FOUR_PAIRS_SEQUENTIAL') return betAmount * 6 * mult;
  return betAmount * mult;
}

/**
 * Tính toán tiền phạt chặt tức thì (Instant Chop Penalty)
 */
export function calculateChopPenalty(
  target: Combination,
  candidate: Combination,
  betAmount: number,
  penaltyMultiplier: number = 1
): { amount: number; description: string } {
  if (betAmount < 0) {
    throw new Error(`[calculateChopPenalty] Invariant violated: betAmount cannot be negative (got ${betAmount})`);
  }
  const amount = wasmCalculateChopPenalty(target, candidate, betAmount, penaltyMultiplier);
  return {
    amount,
    description: getChopDescription(target, amount)
  };
}

/**
 * Tính tiền phạt Thối Heo/Hàng khi ván đấu kết thúc
 */
export function calculateRottenPenalty(hand: readonly Card[], betAmount: number, penaltyMultiplier: number = 1): number {
  if (betAmount < 0) {
    throw new Error(`[calculateRottenPenalty] Invariant violated: betAmount cannot be negative (got ${betAmount})`);
  }
  return wasmCalculateRottenPenalty(hand, betAmount, penaltyMultiplier);
}

/**
 * Tính toán tiền phạt Cóng (Cháy bài)
 * - Cóng đền 26 mức cược (13 lá x 2 theo luật Tiến Lên Miền Nam chuẩn).
 * - Có áp dụng hệ số nhân phạt Cóng riêng biệt (congMultiplier), độc lập với hệ số phạt Chặt/Thối.
 */
export function calculateCongPenalty(betAmount: number, congMultiplier: number = 1): number {
  if (betAmount < 0) {
    throw new Error(`[calculateCongPenalty] Invariant violated: betAmount cannot be negative (got ${betAmount})`);
  }
  return wasmCalculateCongPenalty(betAmount, congMultiplier);
}

/**
 * Tính toán kết quả cho chế độ Đếm Lá (Card-Count / Sát Phạt)
 * - Ván dừng khi 1 người về Nhất.
 * - Người thua bị phạt: Số lá còn lại × Cược + Thối heo/hàng (nhân penaltyMultiplier) + Cóng (nhân congMultiplier).
 * - Nếu Về 3 Bích (isThreeSpadesWin), toàn bộ tiền phạt từ người thua được nhân 2.
 * - Người về Nhất ăn trọn số tiền phạt này.
 */
export function calculateCountCardsSettlement(
  players: readonly MatchPlayer[],
  winnerId: string,
  betAmount: number,
  penaltyMultiplier: number = 1,
  isThreeSpadesWin: boolean = false,
  congMultiplier: number = 1
): Readonly<Record<string, number>> {
  if (players.length === 0) {
    throw new Error('[calculateCountCardsSettlement] Invariant violated: players list cannot be empty');
  }
  if (!players.some(p => p.id === winnerId)) {
    throw new Error(`[calculateCountCardsSettlement] Invariant violated: winnerId "${winnerId}" must exist in players`);
  }
  if (betAmount < 0) {
    throw new Error(`[calculateCountCardsSettlement] Invariant violated: betAmount cannot be negative (got ${betAmount})`);
  }

  return wasmCalculateCountCardsSettlement(players, winnerId, betAmount, penaltyMultiplier, isThreeSpadesWin, congMultiplier);
}

/**
 * Tính toán kết quả cho chế độ Nhất Ăn Tất (Winner-Takes-All)
 */
export function calculateWinnerTakesAllSettlement(
  players: readonly MatchPlayer[],
  winnerId: string,
  betAmount: number,
  penaltyMultiplier: number = 1,
  isThreeSpadesWin: boolean = false,
  congMultiplier: number = 1
): Readonly<Record<string, number>> {
  if (players.length === 0) {
    throw new Error('[calculateWinnerTakesAllSettlement] Invariant violated: players list cannot be empty');
  }
  if (!players.some(p => p.id === winnerId)) {
    throw new Error(`[calculateWinnerTakesAllSettlement] Invariant violated: winnerId "${winnerId}" must exist in players`);
  }
  if (betAmount < 0) {
    throw new Error(`[calculateWinnerTakesAllSettlement] Invariant violated: betAmount cannot be negative (got ${betAmount})`);
  }

  return wasmCalculateWinnerTakesAllSettlement(players, winnerId, betAmount, penaltyMultiplier, isThreeSpadesWin, congMultiplier);
}

/**
 * Tính toán kết quả cho chế độ Truyền Thống (Rank-Based: Nhất Nhì Ba Bét)
 */
export function calculateTraditionalSettlement(
  players: readonly MatchPlayer[],
  winners: readonly MatchPlayer[],
  betAmount: number,
  penaltyMultiplier: number = 1,
  isThreeSpadesWin: boolean = false,
  congMultiplier: number = 1
): Readonly<Record<string, number>> {
  if (players.length === 0) {
    throw new Error('[calculateTraditionalSettlement] Invariant violated: players list cannot be empty');
  }
  if (winners.length === 0) {
    throw new Error('[calculateTraditionalSettlement] Invariant violated: winners list cannot be empty');
  }
  if (!winners.every(w => players.some(p => p.id === w.id))) {
    throw new Error('[calculateTraditionalSettlement] Invariant violated: all winners must exist in players');
  }
  if (betAmount < 0) {
    throw new Error(`[calculateTraditionalSettlement] Invariant violated: betAmount cannot be negative (got ${betAmount})`);
  }

  return wasmCalculateTraditionalSettlement(players, winners, betAmount, penaltyMultiplier, isThreeSpadesWin, congMultiplier);
}


