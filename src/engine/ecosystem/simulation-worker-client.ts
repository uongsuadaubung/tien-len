import { TableGroup, BotEntity } from './ecosystem-types';
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
  // Trong môi trường test runner (Node / Bun test), chạy inline để đạt độ trễ 0ms tức thì
  if (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || 'Bun' in globalThis)) {
    return null;
  }

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

function runInlineFallback(tables: TableGroup[], bots: BotEntity[]): WorkerOutputMessage {
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

export async function runEcosystemSimulation(
  tables: TableGroup[],
  bots: BotEntity[]
): Promise<WorkerOutputMessage> {
  if (typeof window === 'undefined' || typeof process !== 'undefined') {
    return runInlineFallback(tables, bots);
  }

  const worker = getOrCreateWorker();

  if (!worker) {
    return runInlineFallback(tables, bots);
  }

  return new Promise((resolve) => {
    let isSettled = false;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };

    const handleMessage = (event: MessageEvent<WorkerOutputMessage>) => {
      if (isSettled) return;
      if (event.data && event.data.type === 'SIMULATION_COMPLETE') {
        isSettled = true;
        cleanup();
        resolve(event.data);
      }
    };

    const handleError = (error: ErrorEvent) => {
      if (isSettled) return;
      console.warn('Web Worker gặp sự cố, tự động kích hoạt inline fallback:', error);
      isSettled = true;
      cleanup();
      resolve(runInlineFallback(tables, bots));
    };

    // Timeout phòng ngừa treo vĩnh viễn (3 giây)
    const timeoutId = setTimeout(() => {
      if (isSettled) return;
      console.warn('Web Worker quá hạn phản hồi (3s timeout), kích hoạt inline fallback.');
      isSettled = true;
      cleanup();
      resolve(runInlineFallback(tables, bots));
    }, 3000);

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    const message: WorkerInputMessage = {
      type: 'RUN_SIMULATION',
      tables,
      bots
    };

    try {
      worker.postMessage(message);
    } catch (e) {
      if (!isSettled) {
        console.warn('Lỗi khi postMessage tới Worker, fallback:', e);
        isSettled = true;
        cleanup();
        resolve(runInlineFallback(tables, bots));
      }
    }
  });
}
