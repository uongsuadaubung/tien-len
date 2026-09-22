import { Card, CombinationType } from './types';
import { wasmGetAvailableSmartVariants, wasmSortSmartGroups } from './wasm-bridge';

export interface SmartCardGroup {
  id: string;
  type: CombinationType | 'SINGLE';
  name: string;
  cards: Card[];
}

export type PartitionStrategy = 'OPTIMAL_TURNS' | 'BIG_HANDS' | 'MAX_STRAIGHTS' | 'MAX_PAIRS';

/**
 * Lấy tất cả các phương án phân rã bộ thông minh khả thi (đa chiến thuật).
 * 100% Native Rust WebAssembly (Zero TypeScript duplicate algorithm).
 */
export function getAvailableSmartVariants(hand: Card[]): SmartCardGroup[][] {
  if (!hand || hand.length === 0) return [];
  return wasmGetAvailableSmartVariants(hand);
}

/**
 * Lấy danh sách các nhóm bài thông minh theo chỉ số phương án (variantIndex).
 * 100% Native Rust WebAssembly.
 */
export function getSmartHandGroups(hand: Card[], variantIndex: number = 0): SmartCardGroup[] {
  if (!hand || hand.length === 0) return [];
  return wasmSortSmartGroups(hand, variantIndex);
}

/**
 * Trả về mảng Card[] đã được sắp xếp thông minh theo phương án (variantIndex).
 */
export function sortCardsSmart(hand: Card[], variantIndex: number = 0): Card[] {
  const groups = getSmartHandGroups(hand, variantIndex);
  const result: Card[] = [];
  for (const group of groups) {
    result.push(...group.cards);
  }
  return result;
}
