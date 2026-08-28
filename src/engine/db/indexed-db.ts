import Dexie, { type Table } from 'dexie';
import { BotEntity, EcosystemNewsItem } from '../ecosystem/ecosystem-types';
import type { PlayerProfile, ActiveMatchSession } from '../storage';
import type { MatchLogReport } from '../match-logger';
import { ECOSYSTEM_CONSTANTS } from '../constants/ecosystem';

/**
 * ============================================================================
 * TIEN LEN DEXIE DATABASE (100% PURE INDEXEDDB)
 * Quản lý 8 Object Store chuyên nghiệp, an toàn, hỗ trợ transactions & indexes
 * ============================================================================
 */

export interface KeyValueRecord<T> {
  key: string;
  data: T;
  updatedAt: number | null;
}

export class TienLenDatabase extends Dexie {
  bots!: Table<BotEntity, string>;
  newsfeed!: Table<EcosystemNewsItem, string>;
  player_profile!: Table<KeyValueRecord<PlayerProfile>, string>;
  game_settings!: Table<KeyValueRecord<Record<string, unknown>>, string>;
  active_session!: Table<KeyValueRecord<ActiveMatchSession>, string>;
  human_behavior!: Table<KeyValueRecord<unknown>, string>;
  match_logs!: Table<MatchLogReport, string>;

  constructor() {
    super(ECOSYSTEM_CONSTANTS.DB_NAME);
    this.version(1).stores({
      bots: 'id, elo, coins, status, dnaTier',
      newsfeed: 'id, timestamp, type',
      player_profile: 'key',
      game_settings: 'key',
      active_session: 'key',
      human_behavior: 'key',
      match_logs: 'matchId, startedAt, gameMode'
    });
  }
}

// In-Memory RAM Cache dự phòng (hỗ trợ môi trường SSR / Web Worker / Test)
export const memoryStore: {
  bots: Map<string, BotEntity>;
  newsfeed: EcosystemNewsItem[];
  player_profile: PlayerProfile | null;
  game_settings: Record<string, unknown> | null;
  active_session: ActiveMatchSession | null;
  human_behavior: unknown | null;
  match_logs: Map<string, MatchLogReport>;
} = {
  bots: new Map(),
  newsfeed: [],
  player_profile: null,
  game_settings: null,
  active_session: null,
  human_behavior: null,
  match_logs: new Map()
};

let dbInstance: TienLenDatabase | null = null;

export function getGameDB(): TienLenDatabase {
  if (!dbInstance) {
    dbInstance = new TienLenDatabase();
  }
  return dbInstance;
}

export const getEcosystemDB = getGameDB;

// ============================================================================
// BOT OPERATIONS
// ============================================================================

export async function dbGetAllBots(): Promise<BotEntity[]> {
  try {
    const db = getGameDB();
    const bots = await db.bots.toArray();
    if (bots.length > 0) {
      bots.forEach(b => memoryStore.bots.set(b.id, b));
      return bots;
    }
    return Array.from(memoryStore.bots.values());
  } catch {
    return Array.from(memoryStore.bots.values());
  }
}

export async function dbSaveBot(bot: BotEntity): Promise<void> {
  memoryStore.bots.set(bot.id, bot);
  try {
    const db = getGameDB();
    await db.bots.put(bot);
  } catch {}
}

export async function dbSaveBotsBatch(bots: BotEntity[]): Promise<void> {
  bots.forEach(b => memoryStore.bots.set(b.id, b));
  try {
    const db = getGameDB();
    await db.bots.bulkPut(bots);
  } catch {}
}

export async function dbDeleteBotsBatch(botIds: string[]): Promise<void> {
  botIds.forEach(id => memoryStore.bots.delete(id));
  try {
    const db = getGameDB();
    await db.bots.bulkDelete(botIds);
  } catch {}
}

// ============================================================================
// NEWSFEED OPERATIONS (Tối đa 100 tin, tự động dọn tin cũ)
// ============================================================================

export async function dbGetNewsfeed(limit: number = 30): Promise<EcosystemNewsItem[]> {
  try {
    const db = getGameDB();
    const items = await db.newsfeed.orderBy('timestamp').reverse().limit(limit).toArray();
    if (items.length > 0) {
      memoryStore.newsfeed = items;
      return items;
    }
    return memoryStore.newsfeed.slice(0, limit);
  } catch {
    return memoryStore.newsfeed.slice(0, limit);
  }
}

export async function dbAddNewsItem(item: EcosystemNewsItem): Promise<void> {
  memoryStore.newsfeed.unshift(item);
  if (memoryStore.newsfeed.length > 100) {
    memoryStore.newsfeed.pop();
  }

  try {
    const db = getGameDB();
    await db.newsfeed.put(item);
    const count = await db.newsfeed.count();
    if (count > 100) {
      const oldest = await db.newsfeed.orderBy('timestamp').limit(count - 100).primaryKeys();
      await db.newsfeed.bulkDelete(oldest);
    }
  } catch {}
}

export async function dbAddNewsBatch(items: EcosystemNewsItem[]): Promise<void> {
  for (const item of items) {
    memoryStore.newsfeed.unshift(item);
  }
  if (memoryStore.newsfeed.length > 100) {
    memoryStore.newsfeed = memoryStore.newsfeed.slice(0, 100);
  }

  try {
    const db = getGameDB();
    await db.newsfeed.bulkPut(items);
    const count = await db.newsfeed.count();
    if (count > 100) {
      const oldest = await db.newsfeed.orderBy('timestamp').limit(count - 100).primaryKeys();
      await db.newsfeed.bulkDelete(oldest);
    }
  } catch {}
}

// ============================================================================
// ============================================================================
// RESET / CLEAR ALL ECOSYSTEM DATA
// ============================================================================

export async function dbResetEcosystem(): Promise<void> {
  memoryStore.bots.clear();
  memoryStore.newsfeed = [];

  try {
    const db = getGameDB();
    await Promise.all([
      db.bots.clear(),
      db.newsfeed.clear()
    ]);
  } catch {}
}

// ============================================================================
// 1. PLAYER PROFILE OPERATIONS
// ============================================================================

export async function dbGetPlayerProfile(): Promise<PlayerProfile | null> {
  try {
    const db = getGameDB();
    const record = await db.player_profile.get('current');
    if (record?.data) {
      memoryStore.player_profile = record.data;
      return record.data;
    }
    return memoryStore.player_profile;
  } catch {
    return memoryStore.player_profile;
  }
}

export async function dbSavePlayerProfile(profile: PlayerProfile): Promise<void> {
  memoryStore.player_profile = profile;
  try {
    const db = getGameDB();
    await db.player_profile.put({ key: 'current', data: profile, updatedAt: Date.now() });
  } catch {}
}

export async function dbDeletePlayerProfile(): Promise<void> {
  memoryStore.player_profile = null;
  try {
    const db = getGameDB();
    await db.player_profile.delete('current');
  } catch {}
}

// ============================================================================
// 2. GAME SETTINGS OPERATIONS
// ============================================================================

export async function dbGetGameSettings(): Promise<Record<string, unknown> | null> {
  try {
    const db = getGameDB();
    const record = await db.game_settings.get('current');
    if (record?.data) {
      memoryStore.game_settings = record.data;
      return record.data;
    }
    return memoryStore.game_settings;
  } catch {
    return memoryStore.game_settings;
  }
}

export async function dbSaveGameSettings(settings: Record<string, unknown>): Promise<void> {
  memoryStore.game_settings = settings;
  try {
    const db = getGameDB();
    await db.game_settings.put({ key: 'current', data: settings, updatedAt: Date.now() });
  } catch {}
}

// ============================================================================
// 3. ACTIVE MATCH SESSION OPERATIONS
// ============================================================================

export async function dbGetActiveSession(): Promise<ActiveMatchSession | null> {
  try {
    const db = getGameDB();
    const record = await db.active_session.get('current');
    if (record?.data) {
      memoryStore.active_session = record.data;
      return record.data;
    }
    return memoryStore.active_session;
  } catch {
    return memoryStore.active_session;
  }
}

export async function dbSaveActiveSession(session: ActiveMatchSession): Promise<void> {
  memoryStore.active_session = session;
  try {
    const db = getGameDB();
    await db.active_session.put({ key: 'current', data: session, updatedAt: Date.now() });
  } catch {}
}

export async function dbClearActiveSession(): Promise<void> {
  memoryStore.active_session = null;
  try {
    const db = getGameDB();
    await db.active_session.delete('current');
  } catch {}
}

// ============================================================================
// 4. HUMAN BEHAVIOR PROFILE OPERATIONS
// ============================================================================

export async function dbGetHumanBehavior(): Promise<unknown | null> {
  try {
    const db = getGameDB();
    const record = await db.human_behavior.get('current');
    if (record?.data) {
      memoryStore.human_behavior = record.data;
      return record.data;
    }
    return memoryStore.human_behavior;
  } catch {
    return memoryStore.human_behavior;
  }
}

export async function dbSaveHumanBehavior(data: unknown): Promise<void> {
  memoryStore.human_behavior = data;
  try {
    const db = getGameDB();
    await db.human_behavior.put({ key: 'current', data, updatedAt: Date.now() });
  } catch {}
}

export async function dbClearHumanBehavior(): Promise<void> {
  memoryStore.human_behavior = null;
  try {
    const db = getGameDB();
    await db.human_behavior.delete('current');
  } catch {}
}

// ============================================================================
// 5. MATCH LOGS / TELEMETRY OPERATIONS
// ============================================================================

export async function dbSaveMatchLog(report: MatchLogReport): Promise<void> {
  memoryStore.match_logs.set(report.matchId, report);
  try {
    const db = getGameDB();
    await db.match_logs.put(report);
  } catch {}
}

export async function dbGetMatchLog(matchId: string): Promise<MatchLogReport | null> {
  try {
    const db = getGameDB();
    const report = await db.match_logs.get(matchId);
    return report || memoryStore.match_logs.get(matchId) || null;
  } catch {
    return memoryStore.match_logs.get(matchId) || null;
  }
}

export async function dbGetRecentMatchLogs(limit: number = 20): Promise<MatchLogReport[]> {
  try {
    const db = getGameDB();
    const logs = await db.match_logs.orderBy('startedAt').reverse().limit(limit).toArray();
    return logs.length > 0 ? logs : Array.from(memoryStore.match_logs.values()).slice(0, limit);
  } catch {
    return Array.from(memoryStore.match_logs.values()).slice(0, limit);
  }
}
