import { Card, Combination, Player } from './types';
import { isRedCard, isTwo } from './card';

export interface EconomySettings {
  betAmount: number;
  penaltyMultiplier: number | null;
  hardcoreMultiplier: number | null;
}

export interface ChopPenaltyResult {
  chopperId: string;
  targetId: string;
  amount: number;
  description: string;
}

export interface EndGameSettlementResult {
  payouts: Record<string, number>; // playerId -> net change
  loanDeductions: Record<string, number>; // playerId -> loan repaid
  congedPlayerIds: string[];
  rottenPenalties: Record<string, number>;
}

/**
 * Helper trích xuất hệ số nhân sát phạt (multiplier: 1x, 2x, 3x, 4x, 5x...)
 */
function getMultiplier(val: number = 1): number {
  return Math.max(1, val);
}

/**
 * Tính toán tiền phạt chặt tức thì (Instant Chop Penalty)
 */
export function calculateChopPenalty(
  target: Combination,
  _candidate: Combination,
  betAmount: number,
  penaltyMultiplier: number = 1
): { amount: number; description: string } {
  const mult = getMultiplier(penaltyMultiplier);
  const bet = betAmount;

  // 1. Chặt 1 Heo
  if (target.type === 'SINGLE' && isTwo(target.highestCard)) {
    const isRed = isRedCard(target.highestCard);
    const baseMult = isRed ? 2 : 1;
    const finalAmount = bet * baseMult * mult;
    return {
      amount: finalAmount,
      description: isRed ? `Chặt Heo Đỏ (+${finalAmount.toLocaleString()} xu)` : `Chặt Heo Đen (+${finalAmount.toLocaleString()} xu)`
    };
  }

  // 2. Chặt Đôi Heo
  if (target.type === 'PAIR' && isTwo(target.highestCard)) {
    const redCount = target.cards.filter(isRedCard).length;
    let baseMult = 2; // 2 đen
    if (redCount === 2) baseMult = 4; // 2 đỏ
    else if (redCount === 1) baseMult = 3; // 1 đỏ 1 đen
    const finalAmount = bet * baseMult * mult;
    return {
      amount: finalAmount,
      description: `Chặt Đôi Heo (+${finalAmount.toLocaleString()} xu)`
    };
  }

  // 3. Chặt 3 Đôi Thông
  if (target.type === 'THREE_PAIRS_SEQUENTIAL') {
    const finalAmount = bet * 3 * mult;
    return {
      amount: finalAmount,
      description: `Chặt Đè 3 Đôi Thông (+${finalAmount.toLocaleString()} xu)`
    };
  }

  // 4. Chặt Tứ Quý
  if (target.type === 'FOUR_OF_A_KIND') {
    const finalAmount = bet * 4 * mult;
    return {
      amount: finalAmount,
      description: `Chặt Đè Tứ Quý (+${finalAmount.toLocaleString()} xu)`
    };
  }

  // 5. Chặt 4 Đôi Thông
  if (target.type === 'FOUR_PAIRS_SEQUENTIAL') {
    const finalAmount = bet * 6 * mult;
    return {
      amount: finalAmount,
      description: `Chặt Đè 4 Đôi Thông (+${finalAmount.toLocaleString()} xu)`
    };
  }

  const fallback = bet * mult;
  return { amount: fallback, description: `Chặt Hàng (+${fallback.toLocaleString()} xu)` };
}

/**
 * Tính tiền phạt Thối Heo/Hàng khi ván đấu kết thúc
 */
export function calculateRottenPenalty(hand: Card[], betAmount: number, penaltyMultiplier: number = 1): number {
  let penalty = 0;
  const mult = getMultiplier(penaltyMultiplier);
  const bet = betAmount;

  // 1. Thối Heo
  for (const card of hand) {
    if (isTwo(card)) {
      penalty += (isRedCard(card) ? bet * 2 : bet * 1) * mult;
    }
  }

  // 2. Thối Tứ Quý
  const rankCounts: Record<number, number> = {};
  for (const card of hand) {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  }

  for (const rank in rankCounts) {
    if (rankCounts[rank] === 4 && Number(rank) < 15) {
      penalty += bet * 4 * mult;
    }
  }

  return penalty;
}

/**
 * Tính toán tiền phạt Cóng (Cháy bài)
 */
export function calculateCongPenalty(betAmount: number, penaltyMultiplier: number = 1): number {
  const mult = getMultiplier(penaltyMultiplier);
  // Cóng đền 26 mức cược (hoặc 52, 78, 104... mức cược tùy theo multiplier)
  return 26 * betAmount * mult;
}

/**
 * Tính toán kết quả cho chế độ Đếm Lá (Card-Count / Sát Phạt)
 * - Ván dừng khi 1 người về Nhất.
 * - Người thua bị phạt: (Số lá còn lại × Cược × Mult) + Thối heo/hàng + Cóng.
 * - Nếu Về 3 Bích (isThreeSpadesWin), toàn bộ tiền phạt từ người thua được nhân 2.
 * - Người về Nhất ăn trọn số tiền phạt này.
 */
export function calculateCountCardsSettlement(
  players: Player[],
  winnerId: string,
  betAmount: number,
  penaltyMultiplier: number = 1,
  isThreeSpadesWin: boolean = false
): Record<string, number> {
  const payouts: Record<string, number> = {};
  players.forEach(p => { payouts[p.id] = 0; });

  const mult = getMultiplier(penaltyMultiplier);
  const threeSpadesMultiplier = isThreeSpadesWin ? 2 : 1;
  let totalWinnerEarn = 0;

  for (const player of players) {
    if (player.id !== winnerId) {
      let lossAmount = 0;
      // Kiểm tra Cóng (13 lá và chưa đánh ra được lá nào)
      if (player.hand.length === 13 && !player.hasPlayedFirstCard) {
        lossAmount += calculateCongPenalty(betAmount, mult);
      } else {
        lossAmount += player.hand.length * betAmount * mult;
      }

      // Thối heo / thối hàng
      const rotten = calculateRottenPenalty(player.hand, betAmount, mult);
      lossAmount += rotten;

      // Áp dụng nhân đôi nếu người về Nhất về bằng lá 3 Bích
      lossAmount *= threeSpadesMultiplier;

      payouts[player.id] = -lossAmount;
      totalWinnerEarn += lossAmount;
    }
  }

  payouts[winnerId] = totalWinnerEarn;
  return payouts;
}

/**
 * Tính toán kết quả cho chế độ Nhất Ăn Tất (Winner-Takes-All)
 * - Mỗi người thua mất 1 mức cược cơ bản × mult + Thối heo/hàng + Cóng.
 * - Nếu Về 3 Bích (isThreeSpadesWin), toàn bộ tiền phạt từ người thua được nhân 2.
 * - Người về Nhất ăn trọn.
 */
export function calculateWinnerTakesAllSettlement(
  players: Player[],
  winnerId: string,
  betAmount: number,
  penaltyMultiplier: number = 1,
  isThreeSpadesWin: boolean = false
): Record<string, number> {
  const payouts: Record<string, number> = {};
  players.forEach(p => { payouts[p.id] = 0; });

  const mult = getMultiplier(penaltyMultiplier);
  const threeSpadesMultiplier = isThreeSpadesWin ? 2 : 1;
  let totalWinnerEarn = 0;

  for (const player of players) {
    if (player.id !== winnerId) {
      let lossAmount = betAmount * mult;

      if (player.hand.length === 13 && !player.hasPlayedFirstCard) {
        lossAmount += calculateCongPenalty(betAmount, mult);
      }

      const rotten = calculateRottenPenalty(player.hand, betAmount, mult);
      lossAmount += rotten;

      // Áp dụng nhân đôi nếu người về Nhất về bằng lá 3 Bích
      lossAmount *= threeSpadesMultiplier;

      payouts[player.id] = -lossAmount;
      totalWinnerEarn += lossAmount;
    }
  }

  payouts[winnerId] = totalWinnerEarn;
  return payouts;
}

/**
 * Tính toán kết quả cho chế độ Truyền Thống (Rank-Based: Nhất Nhì Ba Bét)
 */
export function calculateTraditionalSettlement(
  players: Player[],
  winners: Player[],
  betAmount: number,
  penaltyMultiplier: number = 1,
  isThreeSpadesWin: boolean = false
): Record<string, number> {
  const payouts: Record<string, number> = {};
  players.forEach(p => { payouts[p.id] = 0; });
  const mult = getMultiplier(penaltyMultiplier);
  const threeSpadesMultiplier = isThreeSpadesWin ? 2 : 1;

  if (winners.length === 4) {
    payouts[winners[0].id] = betAmount * 3 * mult * threeSpadesMultiplier;
    payouts[winners[1].id] = betAmount * 1 * mult;
    payouts[winners[2].id] = -betAmount * 1 * mult;
    payouts[winners[3].id] = -betAmount * 3 * mult * threeSpadesMultiplier;
  } else if (winners.length === 3) {
    payouts[winners[0].id] = betAmount * 2 * mult * threeSpadesMultiplier;
    payouts[winners[1].id] = 0;
    payouts[winners[2].id] = -betAmount * 2 * mult * threeSpadesMultiplier;
  } else if (winners.length === 2) {
    payouts[winners[0].id] = betAmount * 1 * mult * threeSpadesMultiplier;
    payouts[winners[1].id] = -betAmount * 1 * mult * threeSpadesMultiplier;
  }

  // Thối heo / thối hàng cho những người không về Nhất
  const winnerFirst = winners[0];
  for (const player of players) {
    if (player.id !== winnerFirst?.id && player.hand.length > 0) {
      let rotten = calculateRottenPenalty(player.hand, betAmount, mult);
      if (rotten > 0) {
        rotten *= threeSpadesMultiplier;
        payouts[player.id] = (payouts[player.id] || 0) - rotten;
        if (winnerFirst) {
          payouts[winnerFirst.id] = (payouts[winnerFirst.id] || 0) + rotten;
        }
      }

      if (player.hand.length === 13 && !player.hasPlayedFirstCard) {
        let cong = calculateCongPenalty(betAmount, mult);
        cong *= threeSpadesMultiplier;
        payouts[player.id] = (payouts[player.id] || 0) - cong;
        if (winnerFirst) {
          payouts[winnerFirst.id] = (payouts[winnerFirst.id] || 0) + cong;
        }
      }
    }
  }

  return payouts;
}

