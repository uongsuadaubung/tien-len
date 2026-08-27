import { ECOSYSTEM_CONSTANTS } from '../constants/ecosystem';
import { BotEntity, EcosystemNewsItem, SimulatedTableResult } from '../ecosystem/ecosystem-types';
import type { PlayerProfile, ActiveMatchSession } from '../storage';
import type { MatchLogReport } from '../match-logger';

/**
 * ============================================================================
 * UNIFIED INDEXED DB DATABASE LAYER FOR TIEN LEN MIEN NAM
 * Hỗ trợ lưu trữ cấu trúc lớn, async, tương thích cả Main Thread lẫn Web Worker.
 * Tích hợp In-Memory fallback an toàn cho môi trường test/SSR.
 * ============================================================================
 */

let dbInstance: IDBDatabase | null = null;
const memoryStore: {
  bots: Map<string, BotEntity>;
  newsfeed: EcosystemNewsItem[];
  match_history: SimulatedTableResult[];
  player_profile: PlayerProfile | null;
  game_settings: unknown | null;
  active_session: ActiveMatchSession | null;
  human_behavior: unknown | null;
  match_logs: Map<string, MatchLogReport>;
} = {
  bots: new Map(),
  newsfeed: [],
  match_history: [],
  player_profile: null,
  game_settings: null,
  active_session: null,
  human_behavior: null,
  match_logs: new Map()
};

/**
 * Khởi tạo hoặc lấy kết nối IndexedDB (Hỗ trợ cả window.indexedDB lẫn self.indexedDB trong Worker)
 */
export async function getGameDB(): Promise<IDBDatabase | null> {
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

        // Store 4: Player Profile
        if (!db.objectStoreNames.contains(ECOSYSTEM_CONSTANTS.PLAYER_PROFILE_STORE_NAME)) {
          db.createObjectStore(ECOSYSTEM_CONSTANTS.PLAYER_PROFILE_STORE_NAME);
        }

        // Store 5: Game Settings
        if (!db.objectStoreNames.contains(ECOSYSTEM_CONSTANTS.GAME_SETTINGS_STORE_NAME)) {
          db.createObjectStore(ECOSYSTEM_CONSTANTS.GAME_SETTINGS_STORE_NAME);
        }

        // Store 6: Active Match Session
        if (!db.objectStoreNames.contains(ECOSYSTEM_CONSTANTS.ACTIVE_SESSION_STORE_NAME)) {
          db.createObjectStore(ECOSYSTEM_CONSTANTS.ACTIVE_SESSION_STORE_NAME);
        }

        // Store 7: Human Behavior Profile
        if (!db.objectStoreNames.contains(ECOSYSTEM_CONSTANTS.HUMAN_BEHAVIOR_STORE_NAME)) {
          db.createObjectStore(ECOSYSTEM_CONSTANTS.HUMAN_BEHAVIOR_STORE_NAME);
        }

        // Store 8: Match Logs (Nhật ký phân tích trận đấu chi tiết)
        if (!db.objectStoreNames.contains(ECOSYSTEM_CONSTANTS.MATCH_LOGS_STORE_NAME)) {
          const logsStore = db.createObjectStore(ECOSYSTEM_CONSTANTS.MATCH_LOGS_STORE_NAME, { keyPath: 'matchId' });
          logsStore.createIndex('startedAt', 'startedAt', { unique: false });
          logsStore.createIndex('gameMode', 'gameMode', { unique: false });
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

// Alias cho tương thích ngược
export const getEcosystemDB = getGameDB;

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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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

  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
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
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ============================================================================
// 1. PLAYER PROFILE OPERATIONS
// ============================================================================

export async function dbGetPlayerProfile(): Promise<PlayerProfile | null> {
  const db = await getGameDB();
  if (!db) return memoryStore.player_profile;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.PLAYER_PROFILE_STORE_NAME, 'readonly');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.PLAYER_PROFILE_STORE_NAME);
      const request = store.get('current');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(memoryStore.player_profile);
    } catch {
      resolve(memoryStore.player_profile);
    }
  });
}

export async function dbSavePlayerProfile(profile: PlayerProfile): Promise<void> {
  memoryStore.player_profile = profile;
  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.PLAYER_PROFILE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.PLAYER_PROFILE_STORE_NAME);
      store.put(profile, 'current');

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function dbDeletePlayerProfile(): Promise<void> {
  memoryStore.player_profile = null;
  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.PLAYER_PROFILE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.PLAYER_PROFILE_STORE_NAME);
      store.delete('current');

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ============================================================================
// 2. GAME SETTINGS OPERATIONS
// ============================================================================

export async function dbGetGameSettings<T = unknown>(): Promise<T | null> {
  const db = await getGameDB();
  if (!db) return (memoryStore.game_settings as T) || null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.GAME_SETTINGS_STORE_NAME, 'readonly');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.GAME_SETTINGS_STORE_NAME);
      const request = store.get('current');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve((memoryStore.game_settings as T) || null);
    } catch {
      resolve((memoryStore.game_settings as T) || null);
    }
  });
}

export async function dbSaveGameSettings<T = unknown>(settings: T): Promise<void> {
  memoryStore.game_settings = settings;
  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.GAME_SETTINGS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.GAME_SETTINGS_STORE_NAME);
      store.put(settings, 'current');

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ============================================================================
// 3. ACTIVE MATCH SESSION OPERATIONS
// ============================================================================

export async function dbGetActiveSession(): Promise<ActiveMatchSession | null> {
  const db = await getGameDB();
  if (!db) return memoryStore.active_session;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.ACTIVE_SESSION_STORE_NAME, 'readonly');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.ACTIVE_SESSION_STORE_NAME);
      const request = store.get('current');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(memoryStore.active_session);
    } catch {
      resolve(memoryStore.active_session);
    }
  });
}

export async function dbSaveActiveSession(session: ActiveMatchSession): Promise<void> {
  memoryStore.active_session = session;
  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.ACTIVE_SESSION_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.ACTIVE_SESSION_STORE_NAME);
      store.put(session, 'current');

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function dbClearActiveSession(): Promise<void> {
  memoryStore.active_session = null;
  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.ACTIVE_SESSION_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.ACTIVE_SESSION_STORE_NAME);
      store.delete('current');

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ============================================================================
// 4. HUMAN BEHAVIOR PROFILE OPERATIONS
// ============================================================================

export async function dbGetHumanBehavior<T = unknown>(): Promise<T | null> {
  const db = await getGameDB();
  if (!db) return (memoryStore.human_behavior as T) || null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.HUMAN_BEHAVIOR_STORE_NAME, 'readonly');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.HUMAN_BEHAVIOR_STORE_NAME);
      const request = store.get('current');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve((memoryStore.human_behavior as T) || null);
    } catch {
      resolve((memoryStore.human_behavior as T) || null);
    }
  });
}

export async function dbSaveHumanBehavior<T = unknown>(data: T): Promise<void> {
  memoryStore.human_behavior = data;
  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.HUMAN_BEHAVIOR_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.HUMAN_BEHAVIOR_STORE_NAME);
      store.put(data, 'current');

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function dbClearHumanBehavior(): Promise<void> {
  memoryStore.human_behavior = null;
  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.HUMAN_BEHAVIOR_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.HUMAN_BEHAVIOR_STORE_NAME);
      store.delete('current');

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ============================================================================
// 5. MATCH LOGS (DETAILED MATCH REPORTS)
// ============================================================================

export async function dbSaveMatchLog(report: MatchLogReport): Promise<void> {
  if (!report || !report.matchId) return;
  memoryStore.match_logs.set(report.matchId, report);
  const db = await getGameDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.MATCH_LOGS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.MATCH_LOGS_STORE_NAME);
      store.put(report);

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function dbGetRecentMatchLogs(limit: number = 20): Promise<MatchLogReport[]> {
  const db = await getGameDB();
  if (!db) {
    return Array.from(memoryStore.match_logs.values()).slice(-limit).reverse();
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ECOSYSTEM_CONSTANTS.MATCH_LOGS_STORE_NAME, 'readonly');
      const store = tx.objectStore(ECOSYSTEM_CONSTANTS.MATCH_LOGS_STORE_NAME);
      const index = store.index('startedAt');
      const cursorRequest = index.openCursor(null, 'prev');
      const results: MatchLogReport[] = [];

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      cursorRequest.onerror = () => resolve(Array.from(memoryStore.match_logs.values()).slice(-limit).reverse());
    } catch {
      resolve(Array.from(memoryStore.match_logs.values()).slice(-limit).reverse());
    }
  });
}
