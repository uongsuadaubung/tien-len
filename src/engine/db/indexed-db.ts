import Dexie, { type Table } from 'dexie';
import { BotEntity, EcosystemNewsItem } from '../ecosystem/ecosystem-types';
import type { PlayerProfile, ActiveMatchSession } from '../storage';
import type { MatchLogReport } from '../match-logger';
import { SavedSettingsSchema, QuickTableConfigSchema, type QuickTableConfig } from '../schemas/settings.schema';
import { PlayerProfileSchema, type ActiveLoan } from '../schemas/profile.schema';
import { BotEntitySchema } from '../schemas/ecosystem.schema';
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

export interface PlayerRecord {
  id: string; // Unique primary key (e.g. 'usr_...', 'bot_...', 'peer_...')
  name: string;
  avatar: string;
  coins: number;
  elo: number;
  stats: {
    gamesPlayed: number;
    wins: number;
    chopsDone: number;
    congsGiven: number;
    totalEarned: number;
    highestStreak: number;
    currentStreak: number;
  };
  dnaTier?: number;
  status?: 'ACTIVE' | 'BANKRUPT';
  activityStatus?: 'IN_MATCH' | 'IDLE' | 'RESTING';
  aiConfig?: Record<string, unknown> | null;
  campaignUnlockedChapter?: number;
  campaignChapterWins?: Record<string | number, number>;
  dailyQuests?: unknown[];
  achievements?: unknown[];
  loans?: number;
  activeLoan?: ActiveLoan | null;
  dailyReliefClaimedCount?: number;
  lastDailyResetDate?: string;
  lastDailyResetTimestamp?: number;
  dailyMilestonesClaimed?: Record<string | number, boolean>;
  updatedAt: number;
}

export class TienLenDatabase extends Dexie {
  players!: Table<PlayerRecord, string>;
  newsfeed!: Table<EcosystemNewsItem, string>;
  game_settings!: Table<KeyValueRecord<unknown>, string>;
  active_session!: Table<KeyValueRecord<ActiveMatchSession>, string>;
  human_behavior!: Table<KeyValueRecord<unknown>, string>;
  match_logs!: Table<MatchLogReport, string>;

  constructor() {
    super(ECOSYSTEM_CONSTANTS.DB_NAME);
    this.version(1).stores({
      players: 'id, elo, coins, dnaTier, status',
      newsfeed: 'id, timestamp, type',
      game_settings: 'key',
      active_session: 'key',
      human_behavior: 'key',
      match_logs: 'matchId, startedAt, gameMode'
    });
  }
}

// In-Memory RAM Cache dự phòng (hỗ trợ môi trường SSR / Web Worker / Test)
export const memoryStore: {
  players: Map<string, PlayerRecord>;
  newsfeed: EcosystemNewsItem[];
  game_settings: Record<string, unknown> | null;
  active_session: ActiveMatchSession | null;
  human_behavior: unknown | null;
  match_logs: Map<string, MatchLogReport>;
} = {
  players: new Map(),
  newsfeed: [],
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
// BOT OPERATIONS (Thuần 100% dựa trên bảng players)
// ============================================================================

export function botToPlayerRecord(bot: BotEntity): PlayerRecord {
  return {
    id: bot.id,
    name: bot.name,
    avatar: bot.avatar,
    coins: bot.coins,
    elo: bot.elo,
    dnaTier: bot.dnaTier,
    status: bot.status,
    activityStatus: bot.activityStatus,
    stats: {
      gamesPlayed: bot.stats.gamesPlayed,
      wins: bot.stats.wins,
      chopsDone: bot.stats.chopsDone,
      congsGiven: bot.stats.congsGiven,
      totalEarned: bot.stats.totalEarned,
      highestStreak: bot.highestStreak,
      currentStreak: bot.currentStreak
    },
    updatedAt: Date.now()
  };
}

export function profileToPlayerRecord(profile: PlayerProfile): PlayerRecord {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    coins: profile.coins,
    elo: profile.elo,
    stats: profile.stats,
    campaignUnlockedChapter: profile.campaignUnlockedChapter,
    campaignChapterWins: profile.campaignChapterWins,
    dailyQuests: profile.dailyQuests,
    achievements: profile.achievements,
    loans: profile.loans,
    activeLoan: profile.activeLoan ?? null,
    dailyReliefClaimedCount: profile.dailyReliefClaimedCount,
    lastDailyResetDate: profile.lastDailyResetDate,
    lastDailyResetTimestamp: profile.lastDailyResetTimestamp,
    dailyMilestonesClaimed: profile.dailyMilestonesClaimed,
    updatedAt: Date.now()
  };
}

export async function dbGetAllBots(): Promise<BotEntity[]> {
  const players = await dbGetAllPlayers();
  const bots: BotEntity[] = [];
  for (const p of players) {
    if (p.id.startsWith('bot_') || (p.dnaTier !== undefined && !p.id.startsWith('usr_'))) {
      const parsed = BotEntitySchema.safeParse(p);
      if (parsed.success) {
        bots.push(parsed.data);
      }
    }
  }
  return bots;
}

export async function dbSaveBot(bot: BotEntity): Promise<void> {
  await dbSavePlayer(botToPlayerRecord(bot));
}

export async function dbSaveBotsBatch(bots: BotEntity[]): Promise<void> {
  await dbSavePlayersBatch(bots.map(botToPlayerRecord));
}

export async function dbDeleteBotsBatch(botIds: string[]): Promise<void> {
  botIds.forEach(id => memoryStore.players.delete(id));
  try {
    const db = getGameDB();
    await db.players.bulkDelete(botIds);
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
  const allPlayers = await dbGetAllPlayers();
  const botIds = allPlayers
    .filter(p => p.id.startsWith('bot_') || (p.dnaTier !== undefined && !p.id.startsWith('usr_')))
    .map(p => p.id);
  await dbDeleteBotsBatch(botIds);
  memoryStore.newsfeed = [];
  try {
    const db = getGameDB();
    await db.newsfeed.clear();
  } catch {}
}

// ============================================================================
// 1. PLAYER PROFILE OPERATIONS (Thuần 100% dựa trên bảng players + Identity Anchor)
// ============================================================================

export const LOCAL_PROFILE_ID_KEY = 'tien_len_local_profile_id';

let inMemoryAnchorProfileId: string | null = null;

export function getLocalAnchorProfileId(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(LOCAL_PROFILE_ID_KEY);
      if (stored) return stored;
    } catch {}
  }
  return inMemoryAnchorProfileId;
}

export function setLocalAnchorProfileId(id: string): void {
  if (!id) return;
  inMemoryAnchorProfileId = id;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_PROFILE_ID_KEY, id);
    } catch {}
  }
  try {
    const db = getGameDB();
    db.game_settings.put({ key: 'local_profile_id', data: id, updatedAt: Date.now() }).catch(() => {});
  } catch {}
}

export function clearLocalAnchorProfileId(): void {
  inMemoryAnchorProfileId = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(LOCAL_PROFILE_ID_KEY);
    } catch {}
  }
  try {
    const db = getGameDB();
    db.game_settings.delete('local_profile_id').catch(() => {});
  } catch {}
}

export async function getAnchoredProfileIdAsync(): Promise<string | null> {
  const syncId = getLocalAnchorProfileId();
  if (syncId) return syncId;
  try {
    const db = getGameDB();
    const record = await db.game_settings.get('local_profile_id');
    if (record?.data && typeof record.data === 'string') {
      setLocalAnchorProfileId(record.data);
      return record.data;
    }
  } catch {}
  return null;
}

export async function dbPurgeForeignHumanProfiles(ownerId: string): Promise<number> {
  if (!ownerId) return 0;
  let count = 0;
  const allPlayers = await dbGetAllPlayers();
  const foreignHumanIds = allPlayers
    .filter(p => p.id.startsWith('usr_') && p.id !== ownerId)
    .map(p => p.id);

  for (const fId of foreignHumanIds) {
    memoryStore.players.delete(fId);
    try {
      const db = getGameDB();
      await db.players.delete(fId);
    } catch {}
    count++;
  }
  return count;
}

export async function dbGetPlayerProfile(id?: string): Promise<PlayerProfile | null> {
  // 1. Nếu ID cụ thể được truyền vào
  if (id) {
    const p = await dbGetPlayer(id);
    if (p) {
      let needsSave = false;
      if (p.name && p.name.startsWith('usr_')) {
        p.name = '';
        needsSave = true;
      }
      if (p.avatar === '👤') {
        p.avatar = '🤠';
        needsSave = true;
      }
      if (needsSave) {
        dbSavePlayer(p).catch(() => {});
      }
      const parsed = PlayerProfileSchema.safeParse(p);
      if (parsed.success) {
        setLocalAnchorProfileId(parsed.data.id);
        return parsed.data;
      }
    }
  }

  // 2. Thử lấy từ Mỏ neo định danh (Local Anchor ID)
  const anchoredId = await getAnchoredProfileIdAsync();
  if (anchoredId) {
    const p = await dbGetPlayer(anchoredId);
    if (p) {
      let needsSave = false;
      if (p.name && p.name.startsWith('usr_')) {
        p.name = '';
        needsSave = true;
      }
      if (p.avatar === '👤') {
        p.avatar = '🤠';
        needsSave = true;
      }
      if (needsSave) {
        dbSavePlayer(p).catch(() => {});
      }
      const parsed = PlayerProfileSchema.safeParse(p);
      if (parsed.success) {
        // Dọn dẹp các bản ghi usr_ ngoại lai (nếu có do trận online trước đó gây ra)
        dbPurgeForeignHumanProfiles(anchoredId).catch(() => {});
        return parsed.data;
      }
    }
  }

  // 3. Quét toàn bộ bảng players để tìm các bản ghi human (usr_...)
  const allPlayers = await dbGetAllPlayers();
  const humanCandidates = allPlayers.filter(p => p.id.startsWith('usr_'));

  if (humanCandidates.length === 0) {
    return null;
  }

  // 4. THUẬT TOÁN TỰ PHỤC HỒI (Auto-Recovery):
  // Nếu có từ 2 bản ghi human trở lên (dấu hiệu cơ sở dữ liệu đã bị ô nhiễm do bug tráo đổi danh tính),
  // tự động phát hiện bản ghi chính chủ dựa trên:
  // - Điểm tiến trình: Số trận đã chơi (gamesPlayed), Số trận thắng (wins)
  // - Số Xu tích lũy (coins)
  // - Điểm Elo
  let bestCandidate = humanCandidates[0];
  if (humanCandidates.length > 1) {
    const calculateScore = (rec: PlayerRecord): number => {
      const games = rec.stats.gamesPlayed;
      const wins = rec.stats.wins;
      const coins = rec.coins;
      const elo = rec.elo;
      // Người chơi chính chủ có số xu lớn hoặc số trận nhiều sẽ có điểm ưu tiên vượt trội
      return (games * 100_000_000) + (wins * 10_000_000) + coins + elo;
    };

    bestCandidate = [...humanCandidates].sort((a, b) => calculateScore(b) - calculateScore(a))[0];
  }

  let needsSave = false;
  if (bestCandidate.name && bestCandidate.name.startsWith('usr_')) {
    bestCandidate.name = '';
    needsSave = true;
  }
  if (bestCandidate.avatar === '👤') {
    bestCandidate.avatar = '🤠';
    needsSave = true;
  }
  if (needsSave) {
    dbSavePlayer(bestCandidate).catch(() => {});
  }

  const parsed = PlayerProfileSchema.safeParse(bestCandidate);
  if (parsed.success) {
    // Đặt lại mỏ neo định danh cho bản ghi chính chủ vừa phục hồi
    setLocalAnchorProfileId(parsed.data.id);
    // Dọn dẹp sạch sẽ các bản ghi usr_ rác còn lại khỏi IndexedDB
    if (humanCandidates.length > 1) {
      await dbPurgeForeignHumanProfiles(parsed.data.id);
    }
    return parsed.data;
  }

  return null;
}

export async function dbSavePlayerProfile(profile: PlayerProfile): Promise<void> {
  if (profile.id) {
    setLocalAnchorProfileId(profile.id);
  }
  await dbSavePlayer(profileToPlayerRecord(profile));
}

export async function dbDeletePlayerProfile(id?: string): Promise<void> {
  clearLocalAnchorProfileId();
  if (id) {
    memoryStore.players.delete(id);
    try {
      const db = getGameDB();
      await db.players.delete(id);
    } catch {}
    return;
  }
  const allPlayers = await dbGetAllPlayers();
  const human = allPlayers.find(p => p.id.startsWith('usr_'));
  if (human) {
    memoryStore.players.delete(human.id);
    try {
      const db = getGameDB();
      await db.players.delete(human.id);
    } catch {}
  }
}

// ============================================================================
// 2. GAME SETTINGS OPERATIONS
// ============================================================================

export async function dbGetGameSettings(): Promise<Record<string, unknown> | null> {
  try {
    const db = getGameDB();
    const record = await db.game_settings.get('current');
    if (record?.data && typeof record.data === 'object') {
      const rawObj = record.data;
      // Bẫy lỗi: Nếu dữ liệu bị lẫn GameSettings (bàn cờ) thay vì SavedSettings (thiết lập người dùng)
      if ('mode' in rawObj && !('autoSortEnabled' in rawObj)) {
        console.warn('[dbGetGameSettings] Phát hiện dữ liệu bàn cờ bị ghi đè nhầm vào settings, bỏ qua để bảo vệ dữ liệu người dùng');
        return memoryStore.game_settings;
      }

      const parsed = SavedSettingsSchema.safeParse(record.data);
      if (parsed.success) {
        memoryStore.game_settings = parsed.data;
        return parsed.data;
      } else {
        // Phục hồi an toàn: nếu chỉ có 1 trường lạ/bị lỗi, không làm mất toàn bộ thiết lập
        const defaults = SavedSettingsSchema.parse({});
        const recovered = { ...defaults, ...rawObj };
        const secondAttempt = SavedSettingsSchema.safeParse(recovered);
        if (secondAttempt.success) {
          memoryStore.game_settings = secondAttempt.data;
          return secondAttempt.data;
        }
      }
    }
    return memoryStore.game_settings;
  } catch {
    return memoryStore.game_settings;
  }
}

export async function dbSaveGameSettings(settings: Record<string, unknown>): Promise<void> {
  // Tuyệt đối chặn không cho phép ghi GameSettings (bàn đấu) vào key 'current' của thiết lập người dùng
  if (typeof settings === 'object' && settings !== null && 'mode' in settings && !('autoSortEnabled' in settings)) {
    console.error('[dbSaveGameSettings] Bị gọi nhầm với GameSettings của bàn đấu! Đã chặn để bảo vệ thiết lập người dùng.');
    return;
  }
  memoryStore.game_settings = settings;
  try {
    const db = getGameDB();
    await db.game_settings.put({ key: 'current', data: settings, updatedAt: Date.now() });
  } catch {}
}

export async function dbGetQuickTableConfig(): Promise<QuickTableConfig | null> {
  try {
    const db = getGameDB();
    const record = await db.game_settings.get('quick_table_config');
    if (record?.data) {
      const parsed = QuickTableConfigSchema.safeParse(record.data);
      return parsed.success ? parsed.data : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function dbSaveQuickTableConfig(config: QuickTableConfig): Promise<void> {
  try {
    const db = getGameDB();
    await db.game_settings.put({ key: 'quick_table_config', data: config, updatedAt: Date.now() });
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

// ============================================================================
// 6. UNIFIED PLAYER OPERATIONS (Pure ID-Driven)
// ============================================================================

export async function dbGetPlayer(id: string): Promise<PlayerRecord | null> {
  try {
    const db = getGameDB();
    const p = await db.players.get(id);
    if (p) {
      memoryStore.players.set(p.id, p);
      return p;
    }
    return memoryStore.players.get(id) ?? null;
  } catch {
    return memoryStore.players.get(id) ?? null;
  }
}

export async function dbSavePlayer(player: PlayerRecord): Promise<void> {
  memoryStore.players.set(player.id, player);
  try {
    const db = getGameDB();
    await db.players.put(player);
  } catch {}
}

export async function dbSavePlayersBatch(players: PlayerRecord[]): Promise<void> {
  players.forEach(p => memoryStore.players.set(p.id, p));
  try {
    const db = getGameDB();
    await db.players.bulkPut(players);
  } catch {}
}

export async function dbGetAllPlayers(): Promise<PlayerRecord[]> {
  try {
    const db = getGameDB();
    const list = await db.players.toArray();
    if (list.length > 0) {
      list.forEach(p => memoryStore.players.set(p.id, p));
      return list;
    }
    return Array.from(memoryStore.players.values());
  } catch {
    return Array.from(memoryStore.players.values());
  }
}

export async function dbUpdatePlayerMatchResult(
  id: string,
  updates: {
    deltaCoins: number;
    deltaElo: number;
    isWin: boolean;
    chopsDone?: number;
    congsGiven?: number;
  },
  playerMeta?: { name?: string; avatar?: string }
): Promise<PlayerRecord | null> {
  let p = await dbGetPlayer(id);
  if (!p) {
    const isHuman = id.startsWith('usr_');
    const defaultName = isHuman ? 'Người Chơi' : id;
    const resolvedName = (playerMeta?.name && !playerMeta.name.startsWith('usr_'))
      ? playerMeta.name
      : defaultName;
    const resolvedAvatar = (playerMeta?.avatar && playerMeta.avatar !== '👤')
      ? playerMeta.avatar
      : (isHuman ? '🤠' : '🤖');

    // If not in DB yet, create base record
    p = {
      id,
      name: resolvedName,
      avatar: resolvedAvatar,
      coins: 50000,
      elo: 1000,
      stats: {
        gamesPlayed: 0,
        wins: 0,
        chopsDone: 0,
        congsGiven: 0,
        totalEarned: 0,
        highestStreak: 0,
        currentStreak: 0
      },
      updatedAt: Date.now()
    };
  } else {
    // Tự động chữa lành nếu bản ghi cũ từng bị lưu nhầm name là id (e.g. usr_...)
    if (p.name === p.id || (p.id.startsWith('usr_') && p.name.startsWith('usr_'))) {
      if (playerMeta?.name && !playerMeta.name.startsWith('usr_')) {
        p.name = playerMeta.name;
      } else if (p.id.startsWith('usr_')) {
        p.name = 'Người Chơi';
      }
    }
    if (p.id.startsWith('usr_') && (p.avatar === '👤' || !p.avatar)) {
      p.avatar = (playerMeta?.avatar && playerMeta.avatar !== '👤') ? playerMeta.avatar : '🤠';
    }
  }

  const nextCoins = Math.max(0, p.coins + updates.deltaCoins);
  const nextElo = Math.max(0, p.elo + updates.deltaElo);
  const nextWins = updates.isWin ? p.stats.wins + 1 : p.stats.wins;
  const nextCurrentStreak = updates.isWin ? p.stats.currentStreak + 1 : 0;
  const nextHighestStreak = Math.max(p.stats.highestStreak, nextCurrentStreak);
  const nextTotalEarned = updates.deltaCoins > 0 ? p.stats.totalEarned + updates.deltaCoins : p.stats.totalEarned;

  const updated: PlayerRecord = {
    ...p,
    coins: nextCoins,
    elo: nextElo,
    stats: {
      ...p.stats,
      gamesPlayed: p.stats.gamesPlayed + 1,
      wins: nextWins,
      currentStreak: nextCurrentStreak,
      highestStreak: nextHighestStreak,
      totalEarned: nextTotalEarned,
      chopsDone: p.stats.chopsDone + (updates.chopsDone || 0),
      congsGiven: p.stats.congsGiven + (updates.congsGiven || 0)
    },
    updatedAt: Date.now()
  };

  await dbSavePlayer(updated);
  return updated;
}

// Tự động dọn dẹp cơ sở dữ liệu cũ v1 nếu còn lưu trên trình duyệt client
try {
  if (typeof indexedDB !== 'undefined') {
    Dexie.delete('TIEN_LEN_DEXIE_DB_V1').catch(() => {});
  }
} catch {}

