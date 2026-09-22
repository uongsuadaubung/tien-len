import { Card, Combination } from './types';
import { wasmIdentifyCombination, wasmCanBeat } from './wasm-bridge';

// Phân tích và nhận diện danh sách các lá bài thuộc kiểu tổ hợp nào trong Tiến Lên Miền Nam (Rust WASM Native)

/**
 * Phân tích và nhận diện danh sách các lá bài thuộc kiểu tổ hợp nào trong Tiến Lên Miền Nam (Rust WASM Native)
 */
export function identifyCombination(cards: Card[]): Combination | null {
  if (!cards || cards.length === 0) return null;
  return wasmIdentifyCombination(cards);
}

/**
 * So sánh 2 lá bài bất kỳ theo luật Tiến Lên Miền Nam (Rust WASM Native)
 */
export function isBeating(candidate: Combination, target: Combination): boolean {
  return wasmCanBeat(candidate, target);
}

