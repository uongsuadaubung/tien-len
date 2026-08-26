import { TableGroup, BotEntity, SimulatedTableResult, EcosystemNewsItem } from './ecosystem-types';
import { simulateAllTablesBatch } from './headless-sim';
import { WorkerInputMessage, WorkerOutputMessage } from './simulation-worker';

/**
 * ============================================================================
 * SIMULATION WORKER CLIENT BRIDGE
 * Quản lý khởi tạo và giao tiếp với Web Worker từ Main Thread.
 * Tích hợp Fallback inline an toàn nếu môi trường không hỗ trợ Web Worker.
 * ============================================================================
 */

let workerInstance: Worker | null = null;

function getOrCreateWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;

  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./simulation-worker.ts', import.meta.url), {
        type: 'module'
      });
    } catch (e) {
      console.warn('Không thể khởi tạo Web Worker, chuyển sang inline runner:', e);
      workerInstance = null;
    }
  }

  return workerInstance;
}

export async function runEcosystemSimulation(
  tables: TableGroup[],
  bots: BotEntity[]
): Promise<WorkerOutputMessage> {
  const worker = getOrCreateWorker();

  if (!worker) {
    // Inline Fallback
    const startTime = performance.now();
    const botsMap = new Map<string, BotEntity>();
    for (const b of bots) {
      botsMap.set(b.id, b);
    }
    const { tableResults, allNews } = simulateAllTablesBatch(tables, botsMap);
    return {
      type: 'SIMULATION_COMPLETE',
      tableResults,
      highlightNews: allNews,
      executionTimeMs: Math.round(performance.now() - startTime)
    };
  }

  return new Promise((resolve) => {
    const handleMessage = (event: MessageEvent<WorkerOutputMessage>) => {
      if (event.data.type === 'SIMULATION_COMPLETE') {
        worker.removeEventListener('message', handleMessage);
        resolve(event.data);
      }
    };

    worker.addEventListener('message', handleMessage);

    const message: WorkerInputMessage = {
      type: 'RUN_SIMULATION',
      tables,
      bots
    };

    worker.postMessage(message);
  });
}
