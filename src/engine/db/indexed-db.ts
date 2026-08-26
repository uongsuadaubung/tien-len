import { ECOSYSTEM_CONSTANTS } from '../constants/ecosystem';
import { BotEntity, EcosystemNewsItem, SimulatedTableResult } from '../ecosystem/ecosystem-types';

/**
 * ============================================================================
 * INDEXED DB DATABASE LAYER FOR LIVING BOT ECOSYSTEM
 * Hỗ trợ lưu trữ cấu trúc lớn, async, tương thích cả Main Thread lẫn Web Worker.
 * Tích hợp In-Memory fallback an toàn cho môi trường test/SSR.
 * ============================================================================
 */

let dbInstance: IDBDatabase | null = null;
const memoryStore: {
  bots: Map<string, BotEntity>;
  newsfeed: EcosystemNewsItem[];
  match_history: SimulatedTableResult[];
} = {
  bots: new Map(),
  newsfeed: [],
  match_history: []
};

/**
 * Khởi tạo hoặc lấy kết nối IndexedDB (Hỗ trợ cả window.indexedDB lẫn self.indexedDB trong Worker)
 */
export async function getEcosystemDB(): Promise<IDBDatabase | null> {
  const idb = typeof indexedDB !== 'undefined' 
    ? indexedDB 
    : (typeof window !== 'undefined' ? window.indexedDB : (typeof self !== 'undefined' ? self.indexedDB : null));

  if (!idb) {
    return null; // Fallback sang in-memory
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve) => {
    try {
      const request = idb.open(ECOSYSTEM_CONSTANTS.DB_NAME, ECOSYSTEM_CONSTANTS.DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        // Store 1: Bots
        if (!db.objectStoreNames.contains(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME)) {
          const botStore = db.createObjectStore(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME, { keyPath: 'id' });
          botStore.createIndex('elo', 'elo', { unique: false });
          botStore.createIndex('coins', 'coins', { unique: false });
          botStore.createIndex('tier', 'tier', { unique: false });
          botStore.createIndex('status', 'status', { unique: false });
        }

        // Store 2: Newsfeed
        if (!db.objectStoreNames.contains(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME)) {
          const newsStore = db.createObjectStore(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME, { keyPath: 'id' });
          newsStore.createIndex('timestamp', 'timestamp', { unique: false });
          newsStore.createIndex('type', 'type', { unique: false });
        }

        // Store 3: Match History
        if (!db.objectStoreNames.contains(ECOSYSTEM_CONSTANTS.MATCH_HISTORY_STORE_NAME)) {
          const historyStore = db.createObjectStore(ECOSYSTEM_CONSTANTS.MATCH_HISTORY_STORE_NAME, { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        console.warn('Lỗi kết nối IndexedDB, chuyển sang In-Memory Fallback:', e);
        resolve(null);
      };
    } catch (err) {
      console.warn('Không thể mở IndexedDB:', err);
      resolve(null);
    }
  });
}

// ============================================================================
// BOT OPERATIONS
// ============================================================================

export async function dbGetAllBots(): Promise<BotEntity[]> {
  const db = await getEcosystemDB();
  if (!db) {
    return Array.from(memoryStore.bots.values());
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME, 'readonly');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (e) {
      resolve(Array.from(memoryStore.bots.values()));
    }
  });
}

export async function dbGetBotById(id: string): Promise<BotEntity | null> {
  const db = await getEcosystemDB();
  if (!db) {
    return memoryStore.bots.get(id) || null;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME, 'readonly');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    } catch (e) {
      resolve(memoryStore.bots.get(id) || null);
    }
  });
}

export async function dbSaveBot(bot: BotEntity): Promise<void> {
  memoryStore.bots.set(bot.id, bot);
  const db = await getEcosystemDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME);
      const request = store.put(bot);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      resolve();
    }
  });
}

export async function dbSaveBotsBatch(bots: BotEntity[]): Promise<void> {
  for (const bot of bots) {
    memoryStore.bots.set(bot.id, bot);
  }

  const db = await getEcosystemDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME);

      for (const bot of bots) {
        store.put(bot);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      resolve();
    }
  });
}

export async function dbDeleteBot(id: string): Promise<void> {
  memoryStore.bots.delete(id);
  const db = await getEcosystemDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      resolve();
    }
  });
}

// ============================================================================
// NEWSFEED OPERATIONS
// ============================================================================

export async function dbGetNewsfeed(limit: number = 30): Promise<EcosystemNewsItem[]> {
  const db = await getEcosystemDB();
  if (!db) {
    return memoryStore.newsfeed.slice(0, limit);
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME, 'readonly');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME);
      const index = store.index('timestamp');
      const cursorRequest = index.openCursor(null, 'prev'); // Mới nhất lên đầu
      const results: EcosystemNewsItem[] = [];

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      cursorRequest.onerror = () => reject(cursorRequest.error);
    } catch (e) {
      resolve(memoryStore.newsfeed.slice(0, limit));
    }
  });
}

export async function dbAddNewsItem(item: EcosystemNewsItem): Promise<void> {
  memoryStore.newsfeed.unshift(item);
  if (memoryStore.newsfeed.length > 100) {
    memoryStore.newsfeed.pop();
  }

  const db = await getEcosystemDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME);
      store.put(item);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      resolve();
    }
  });
}

export async function dbAddNewsBatch(items: EcosystemNewsItem[]): Promise<void> {
  for (const item of items) {
    memoryStore.newsfeed.unshift(item);
  }
  if (memoryStore.newsfeed.length > 100) {
    memoryStore.newsfeed = memoryStore.newsfeed.slice(0, 100);
  }

  const db = await getEcosystemDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME);

      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      resolve();
    }
  });
}

// ============================================================================
// RESET / CLEAR ALL ECOSYSTEM DATA
// ============================================================================

export async function dbResetEcosystem(): Promise<void> {
  memoryStore.bots.clear();
  memoryStore.newsfeed = [];
  memoryStore.match_history = [];

  const db = await getEcosystemDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([
        ECOSYSTEM_CONSTANTS.BOT_STORE_NAME,
        ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME,
        ECOSYSTEM_CONSTANTS.MATCH_HISTORY_STORE_NAME
      ], 'readwrite');

      tx.objectStore(ECOSYSTEM_CONSTANTS.BOT_STORE_NAME).clear();
      tx.objectStore(ECOSYSTEM_CONSTANTS.NEWS_STORE_NAME).clear();
      tx.objectStore(ECOSYSTEM_CONSTANTS.MATCH_HISTORY_STORE_NAME).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      resolve();
    }
  });
}
