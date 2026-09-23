import { Card } from '../engine/types';
import { sortCards } from '../engine/card';
import { wasmPartitionHand } from '../engine/wasm-bridge';
import { HandPartition } from './types';

const PARTITION_CACHE = new Map<string, HandPartition>();
const MAX_PARTITION_CACHE_SIZE = 512;

export function clearPartitionCache(): void {
  PARTITION_CACHE.clear();
}

/**
 * Phân rã bộ bài tối ưu: Pure WASM Single Source of Truth (SSOT).
 * 100% thuật toán giải thế bài nằm tại Rust tien_len_core, không duy trì code trùng lặp.
 */
export function partitionHand(hand: Card[], optimality: number = 1.0): HandPartition {
  const sorted = sortCards(hand);
  if (sorted.length === 0) {
    return { combinations: [], trashCards: [], totalScore: 0 };
  }

  const cacheKey = `${sorted.map(c => c.id).join(',')}:${optimality.toFixed(2)}`;
  const cached = PARTITION_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = wasmPartitionHand(sorted, optimality);

  if (PARTITION_CACHE.size >= MAX_PARTITION_CACHE_SIZE) {
    const keys = Array.from(PARTITION_CACHE.keys());
    for (let i = 0; i < keys.length / 2; i++) {
      PARTITION_CACHE.delete(keys[i]);
    }
  }
  PARTITION_CACHE.set(cacheKey, result);

  return result;
}
