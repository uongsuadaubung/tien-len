import { Card, InstantWinType, Rank } from './types';
import { ALL_RANKS, ALL_SUITS, createCard, isBlackCard, isRedCard, sortCards } from './card';

/**
 * Khởi tạo bộ bài 52 lá tiêu chuẩn
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of ALL_RANKS) {
    for (const suit of ALL_SUITS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

/**
 * Xáo bài ngẫu nhiên theo thuật toán chuẩn Fisher-Yates
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Chia bài cho 4 người chơi (mỗi người 13 lá, đã được sắp xếp tăng dần)
 */
export function dealCards(deck: Card[]): Card[][] {
  const hands: Card[][] = [[], [], [], []];
  for (let i = 0; i < 52; i++) {
    hands[i % 4].push(deck[i]);
  }
  return hands.map(sortCards);
}

/**
 * Kiểm tra xem tay bài có được Tới Trắng hay không
 */
export function checkInstantWin(hand: Card[], isFirstGame = false): InstantWinType | null {
  if (!hand || hand.length < 12) return null;

  const sorted = sortCards(hand);

  // 1. Tứ quý 3 ở ván đầu tiên
  if (isFirstGame) {
    const threes = sorted.filter(c => c.rank === 3);
    if (threes.length === 4) {
      return 'FIRST_ROUND_FOUR_THREES';
    }
  }

  // 2. Tứ quý 2 (4 con heo)
  const twos = sorted.filter(c => c.rank === 15);
  if (twos.length === 4) {
    return 'FOUR_TWOS';
  }

  // 3. Sảnh Rồng (Dãy liên tiếp từ 3 tới A = 12 lá hoặc 3 tới 2 = 13 lá)
  const uniqueRanks = Array.from(new Set(sorted.map(c => c.rank)));
  // Kiểm tra có đủ các rank từ 3 (3) đến 14 (A) không
  const hasDragon3ToA = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].every(r =>
    uniqueRanks.includes(r as Rank)
  );
  if (hasDragon3ToA) {
    return 'DRAGON_STRAIGHT';
  }

  // 4. 13 lá đồng màu (toàn đỏ hoặc toàn đen)
  if (sorted.length === 13) {
    if (sorted.every(isRedCard) || sorted.every(isBlackCard)) {
      return 'SAME_COLOR_13';
    }
  }

  // Gom các đôi trong tay bài để kiểm tra 5 đôi thông & 6 đôi bất kỳ
  const rankCounts: Record<number, number> = {};
  for (const card of sorted) {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  }

  const pairRanks: Rank[] = [];
  for (const rankStr in rankCounts) {
    const rank = Number(rankStr) as Rank;
    const count = rankCounts[rank];
    if (count >= 2) pairRanks.push(rank);
    if (count === 4) pairRanks.push(rank); // Tứ quý tính là 2 đôi
  }

  // 5. 5 Đôi Thông (5 đôi liên tiếp, không tính đôi 2)
  const distinctNonTwoPairRanks = Array.from(new Set(pairRanks.filter(r => r < 15))).sort((a, b) => a - b);
  let maxConsecutivePairs = 1;
  let currentConsecutive = 1;
  for (let i = 0; i < distinctNonTwoPairRanks.length - 1; i++) {
    if (distinctNonTwoPairRanks[i + 1] === distinctNonTwoPairRanks[i] + 1) {
      currentConsecutive++;
      maxConsecutivePairs = Math.max(maxConsecutivePairs, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }

  if (maxConsecutivePairs >= 5) {
    return 'FIVE_PAIRS_SEQUENTIAL';
  }

  // 6. 6 Đôi bất kỳ
  if (pairRanks.length >= 6) {
    return 'SIX_PAIRS';
  }

  return null;
}
