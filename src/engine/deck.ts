import { Card, InstantWinType } from './types';
import { wasmCreateDeck, wasmCheckInstantWin, wasmDealCards } from './wasm-bridge';

/**
 * Khởi tạo bộ bài 52 lá tiêu chuẩn (Rust WASM Native)
 */
export function createDeck(): Card[] {
  return wasmCreateDeck();
}

/**
 * Thuật toán tạo số ngẫu nhiên có Seed (Mulberry32 PRNG)
 * Dùng cho kiểm thử mô phỏng xác định (Deterministic Testing & Benchmarks)
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Xáo bài ngẫu nhiên theo thuật toán chuẩn Fisher-Yates (hỗ trợ PRNG có seed)
 */
export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Chia bài cho người chơi (2, 3 hoặc 4 người, mỗi người 13 lá, đã được sắp xếp tăng dần qua Rust WASM)
 */
export function dealCards(deck: Card[], playerCount: number = 4): Card[][] {
  return wasmDealCards(deck, playerCount);
}

/**
 * Kiểm tra xem tay bài có được Tới Trắng hay không (Rust WASM Native)
 */
export function checkInstantWin(hand: Card[], isFirstGame = false): InstantWinType | null {
  if (!hand || hand.length < 12) return null;
  return wasmCheckInstantWin(hand, isFirstGame);
}
