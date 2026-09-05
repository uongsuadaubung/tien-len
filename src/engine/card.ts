import { Card, Rank, Suit } from './types';

export const SUIT_WEIGHTS: Record<Suit, number> = {
  SPADES: 0,   // Bích (♠) - Bé nhất
  CLUBS: 1,    // Chuồn/Tép (♣)
  DIAMONDS: 2, // Rô (♦)
  HEARTS: 3    // Cơ (♥) - Lớn nhất
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  SPADES: '♠',
  CLUBS: '♣',
  DIAMONDS: '♦',
  HEARTS: '♥'
};

export const RANK_NAMES: Record<Rank, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2'
};

export const ALL_RANKS: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
export const ALL_SUITS: Suit[] = ['SPADES', 'CLUBS', 'DIAMONDS', 'HEARTS'];

export function createCard(rank: Rank, suit: Suit): Card {
  const weight = rank * 4 + SUIT_WEIGHTS[suit];
  const suitShort = suit[0]; // S, C, D, H
  const rankStr = RANK_NAMES[rank];
  return {
    id: `${rank}_${suit}`,
    rank,
    suit,
    weight,
    code: `${rankStr}${suitShort}`
  };
}

export function parseCard(cardStr: string): Card {
  // Format: "3S", "10D", "2H", "AC", "KD", "QH", "JS"
  const suitChar = cardStr.slice(-1).toUpperCase();
  const rankStr = cardStr.slice(0, -1).toUpperCase();

  let suit: Suit;
  switch (suitChar) {
    case 'S': suit = 'SPADES'; break;
    case 'C': suit = 'CLUBS'; break;
    case 'D': suit = 'DIAMONDS'; break;
    case 'H': suit = 'HEARTS'; break;
    default: throw new Error(`Invalid suit character: ${suitChar}`);
  }

  let rank: Rank;
  switch (rankStr) {
    case '3': rank = 3; break;
    case '4': rank = 4; break;
    case '5': rank = 5; break;
    case '6': rank = 6; break;
    case '7': rank = 7; break;
    case '8': rank = 8; break;
    case '9': rank = 9; break;
    case '10': rank = 10; break;
    case 'J': rank = 11; break;
    case 'Q': rank = 12; break;
    case 'K': rank = 13; break;
    case 'A': rank = 14; break;
    case '2': rank = 15; break;
    default: throw new Error(`Invalid rank: ${rankStr}`);
  }

  return createCard(rank, suit);
}

export function parseCards(cardsStr: string): Card[] {
  return cardsStr
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseCard);
}

/**
 * So sánh 2 lá bài theo chuẩn Tiến Lên Miền Nam:
 * Rank trước -> Nếu cùng Rank thì so Suit (Bích < Chuồn < Rô < Cơ)
 */
export function compareCards(a: Card, b: Card): number {
  return a.weight - b.weight;
}

/**
 * Sắp xếp bài tăng dần theo luật Tiến Lên Miền Nam (3S -> 2H)
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

/**
 * Kiểm tra xem 1 lá có phải là lá Heo (2) không
 */
export function isTwo(card: Card): boolean {
  return card.rank === 15;
}

/**
 * Kiểm tra lá bài có phải màu Đỏ (Cơ, Rô) hay Đen (Bích, Chuồn)
 */
export function isRedCard(card: Card): boolean {
  return card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
}

export function isBlackCard(card: Card): boolean {
  return card.suit === 'SPADES' || card.suit === 'CLUBS';
}

export function isRedTwo(card: Card): boolean {
  return isTwo(card) && isRedCard(card);
}

export function isBlackTwo(card: Card): boolean {
  return isTwo(card) && isBlackCard(card);
}

export const SUIT_VIETNAMESE_NAMES: Record<Suit, string> = {
  SPADES: 'Bích',
  CLUBS: 'Tép',
  DIAMONDS: 'Rô',
  HEARTS: 'Cơ'
};

/**
 * Chuyển lá bài thành dạng ký hiệu trực quan cho người chơi (vd: "3♠", "10♦", "A♥", "2♥")
 */
export function formatCard(card: Card): string {
  return `${RANK_NAMES[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

/**
 * Chuyển danh sách lá bài thành chuỗi ký hiệu trực quan (vd: "3♠ 4♣ 5♦")
 */
export function formatCards(cards: readonly Card[], separator = ' '): string {
  return cards.map(formatCard).join(separator);
}

/**
 * Chuyển lá bài thành tên tiếng Việt đầy đủ (vd: "3 Bích", "10 Rô", "A Cơ", "2 Cơ")
 */
export function formatCardVietnamese(card: Card): string {
  return `${RANK_NAMES[card.rank]} ${SUIT_VIETNAMESE_NAMES[card.suit]}`;
}

