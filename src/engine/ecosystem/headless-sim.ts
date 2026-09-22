import { BotEntity, TableGroup, SimulatedTableResult, EcosystemNewsItem } from './ecosystem-types';
import { wasmSimulateSingleTable, wasmSimulateTablesBatch } from '../wasm-bridge';

/**
 * ============================================================================
 * HEADLESS FAST MATCH SIMULATOR (RUST NATIVE WASM ENGINE)
 * Giả lập các bàn đấu 4 Bot thuần túy thuật toán chạy trực tiếp trong Rust WASM.
 * Tốc độ xử lý: < 0.1 mili-giây / 1 ván đấu.
 * ============================================================================
 */

export function simulateSingleTableMatch(
  table: TableGroup,
  botsMap: Map<string, BotEntity>
): SimulatedTableResult {
  return wasmSimulateSingleTable(table, botsMap);
}

/**
 * Giả lập toàn bộ danh sách các bàn đấu trong vòng mô phỏng bằng Rust native WASM batch
 */
export function simulateAllTablesBatch(
  tables: TableGroup[],
  botsMap: Map<string, BotEntity>
): {
  tableResults: SimulatedTableResult[];
  allNews: EcosystemNewsItem[];
} {
  return wasmSimulateTablesBatch(tables, botsMap);
}
