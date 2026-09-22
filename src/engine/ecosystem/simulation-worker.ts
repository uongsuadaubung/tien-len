import { TableGroup, BotEntity, SimulatedTableResult, EcosystemNewsItem } from './ecosystem-types';
import { simulateAllTablesBatch } from './headless-sim';
import { initWasmCore } from '../wasm-bridge';

/**
 * ============================================================================
 * WEB WORKER FOR BACKGROUND ECOSYSTEM SIMULATION
 * Chạy trên luồng CPU độc lập để đảm bảo 0% giật lag cho UI của Người Chơi
 * ============================================================================
 */

export interface WorkerInputMessage {
  type: 'RUN_SIMULATION';
  tables: TableGroup[];
  bots: BotEntity[];
}

export interface WorkerOutputMessage {
  type: 'SIMULATION_COMPLETE';
  tableResults: SimulatedTableResult[];
  highlightNews: EcosystemNewsItem[];
  executionTimeMs: number;
}

// Preload WASM ngay khi worker thread được khởi tạo
void initWasmCore().catch(err => {
  console.warn('[SimulationWorker] Preload WASM warning:', err);
});

// Lắng nghe sự kiện từ Main Thread
self.onmessage = async (event: MessageEvent<WorkerInputMessage>) => {
  const { type, tables, bots } = event.data;

  if (type === 'RUN_SIMULATION') {
    // Đảm bảo WASM đã sẵn sàng 100% trước khi chạy mô phỏng
    await initWasmCore();

    const startTime = performance.now();

    const botsMap = new Map<string, BotEntity>();
    for (const bot of bots) {
      botsMap.set(bot.id, bot);
    }

    // Chạy giả lập toàn bộ bàn đấu
    const { tableResults, allNews } = simulateAllTablesBatch(tables, botsMap);

    const executionTimeMs = Math.round(performance.now() - startTime);

    const response: WorkerOutputMessage = {
      type: 'SIMULATION_COMPLETE',
      tableResults,
      highlightNews: allNews,
      executionTimeMs
    };

    self.postMessage(response);
  }
};
