import type { TienLenSaveData, SmartSyncResult } from './types';
import { uploadToGist, downloadFromGist } from './github-api';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore, SavedSettings } from '../../stores/useSettingsStore';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { ecosystemManager } from '../ecosystem/ecosystem-manager';
import { ECONOMY_CONSTANTS } from '../constants/economy';
import { sanitizeAndValidateProfile } from '../storage';
import { 
  dbGetAllBots, 
  dbSaveBotsBatch, 
  dbGetNewsfeed, 
  dbAddNewsBatch,
  dbGetHumanBehavior,
  dbSaveHumanBehavior,
  dbGetRecentMatchLogs,
  dbSaveMatchLog,
  dbSavePlayerProfile,
  dbSaveGameSettings
} from '../db/indexed-db';
import { safeParseSaveData } from '../schemas/sync.schema';

/**
 * Trích xuất các chỉ số tiến trình cốt lõi của người chơi để so sánh đồng bộ
 * (Tập trung chính vào Số Xu, Số Trận Đấu, Số Trận Thắng và Điểm Elo)
 */
export function getCorePlayerProgress(save: unknown): {
  name: string;
  coins: number;
  gamesPlayed: number;
  wins: number;
  elo: number;
} | null {
  const parseResult = safeParseSaveData(save);
  if (!parseResult.success || !parseResult.data || !parseResult.data.profile) return null;
  const p = parseResult.data.profile;
  return {
    name: p.name.trim(),
    coins: p.coins,
    gamesPlayed: p.stats.gamesPlayed,
    wins: p.stats.wins,
    elo: p.elo
  };
}

/**
 * Tính toán mã băm SHA-256 dựa trên tiến trình người chơi (Xu & Số trận đấu)
 */
export async function computeHash(data: unknown): Promise<string> {
  if (!data) return '';
  const progress = getCorePlayerProgress(data);
  if (!progress) return '';

  const str = `name:${progress.name}|coins:${progress.coins}|games:${progress.gamesPlayed}|wins:${progress.wins}|elo:${progress.elo}`;
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Kiểm tra xem dữ liệu Save có tiến trình chơi thực tế hay không
 */
export function hasProgress(save: TienLenSaveData | null | undefined): boolean {
  if (!save || !save.profile) return false;
  const p = save.profile;

  const hasName = Boolean(p.name && p.name.trim().length > 0);
  const hasGames = (p.stats?.gamesPlayed || 0) > 0;
  const hasWins = (p.stats?.wins || 0) > 0;
  const hasEarnings = (p.stats?.totalEarned || 0) > 0;
  const hasCampaignProgress = (p.campaignUnlockedChapter || 1) > 1;
  const hasEloChanged = (p.elo || ECONOMY_CONSTANTS.DEFAULT_STARTING_ELO) !== ECONOMY_CONSTANTS.DEFAULT_STARTING_ELO;
  const hasCoinsChanged = (p.coins || ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS) !== ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS;
  const hasCompletedAchievements = (p.achievements || []).some((a) => a.isCompleted || a.isClaimed);
  const hasCustomBots = Boolean(save.bots && save.bots.length > 0 && save.bots.some((b) => (b.stats?.gamesPlayed || 0) > 0));

  return (
    hasName ||
    hasGames ||
    hasWins ||
    hasEarnings ||
    hasCampaignProgress ||
    hasEloChanged ||
    hasCoinsChanged ||
    hasCompletedAchievements ||
    hasCustomBots
  );
}

/**
 * Trích xuất toàn bộ dữ liệu lưu trữ 100% từ Zustand Stores & IndexedDB
 */
export async function getLocalSaveData(): Promise<TienLenSaveData> {
  const profile = useUserStore.getState().profile;
  const settingsState = useSettingsStore.getState();

  const settings: SavedSettings = {
    soundEnabled: settingsState.soundEnabled,
    autoSortEnabled: settingsState.autoSortEnabled,
    aiHintEnabled: settingsState.aiHintEnabled,
    quickResponseAssistEnabled: settingsState.quickResponseAssistEnabled,
    xrayEnabled: settingsState.xrayEnabled,
    botReasoningLogEnabled: settingsState.botReasoningLogEnabled,
    gameSpeed: settingsState.gameSpeed,
    githubToken: settingsState.githubToken,
    gistId: settingsState.gistId,
    lastSync: settingsState.lastSync,
    lastSyncedHash: settingsState.lastSyncedHash,
    cachedGithubUser: settingsState.cachedGithubUser,
    autoBackupOnMatchEnd: settingsState.autoBackupOnMatchEnd,
    autoBackupInterval: settingsState.autoBackupInterval || 5,
    autoSyncOnStartup: settingsState.autoSyncOnStartup
  };

  const [bots, newsfeed, humanBehavior, matchLogs] = await Promise.all([
    dbGetAllBots().catch(() => []),
    dbGetNewsfeed(50).catch(() => []),
    dbGetHumanBehavior().catch(() => null),
    dbGetRecentMatchLogs(20).catch(() => [])
  ]);

  return {
    version: 1,
    updatedAt: Date.now(),
    profile: sanitizeAndValidateProfile(profile),
    settings,
    bots: bots.length > 0 ? bots : undefined,
    newsfeed: newsfeed.length > 0 ? newsfeed : undefined,
    humanBehavior: humanBehavior || undefined,
    matchLogs: matchLogs.length > 0 ? matchLogs : undefined
  };
}

/**
 * Áp dụng dữ liệu đám mây vào Game Stores và 100% cơ sở dữ liệu IndexedDB
 */
export async function applyRemoteSaveData(remote: TienLenSaveData): Promise<void> {
  if (!remote) return;

  // 1. Profile
  if (remote.profile) {
    const validated = sanitizeAndValidateProfile(remote.profile);
    useUserStore.getState().setProfile(validated);
    await dbSavePlayerProfile(validated).catch(() => {});
  }

  // 2. Settings
  if (remote.settings) {
    useSettingsStore.getState().hydrateSettings(remote.settings);
    await dbSaveGameSettings(remote.settings).catch(() => {});
  }

  // 3. 200 Bots trong Hệ Sinh Thái
  if (remote.bots && remote.bots.length > 0) {
    await dbSaveBotsBatch(remote.bots).catch(() => {});
    await ecosystemManager.initialize().catch(() => {});
    await useEcosystemStore.getState().refreshEcosystem().catch(() => {});
  }

  // 4. Bản Tin Sới Bạc (Newsfeed)
  if (remote.newsfeed && remote.newsfeed.length > 0) {
    await dbAddNewsBatch(remote.newsfeed).catch(() => {});
    await useEcosystemStore.getState().refreshEcosystem().catch(() => {});
  }

  // 5. Hồ Sơ Hành Vi Người Chơi (Human Behavior)
  if (remote.humanBehavior !== undefined && remote.humanBehavior !== null) {
    await dbSaveHumanBehavior(remote.humanBehavior).catch(() => {});
  }

  // 7. Nhật Ký Telemetry Ván Đấu (Match Logs)
  if (remote.matchLogs && remote.matchLogs.length > 0) {
    for (const log of remote.matchLogs) {
      await dbSaveMatchLog(log).catch(() => {});
    }
  }
}

/**
 * Đồng Bộ Thông Minh 3 Chiều (3-Way Hash Smart Sync)
 */
export async function smartSync(): Promise<SmartSyncResult> {
  const settings = useSettingsStore.getState();
  const token = settings.githubToken;
  if (!token) {
    throw new Error('Chưa cấu hình GitHub Token');
  }

  const local = await getLocalSaveData();
  const cloudResponse = await downloadFromGist(token, settings.gistId);

  let cloud: TienLenSaveData | null = null;
  if (cloudResponse.success) {
    cloud = cloudResponse.data;
    if (cloudResponse.gistId && cloudResponse.gistId !== settings.gistId) {
      settings.setGistId(cloudResponse.gistId);
    }
  } else if (!cloudResponse.error.includes('Chưa tìm thấy bản lưu')) {
    throw new Error(cloudResponse.error);
  }

  const H_local = await computeHash(local);
  const H_cloud = await computeHash(cloud);
  const H_base = settings.lastSyncedHash;

  // 1. Trường hợp đặc biệt: Máy local mới tinh chưa có tiến trình, đám mây đã có tiến trình
  if (local && cloud && !hasProgress(local) && hasProgress(cloud)) {
    await applyRemoteSaveData(cloud);
    settings.setLastSyncRecord(Date.now(), H_cloud);
    return { type: 'synced', detail: 'download' };
  }

  // 2. Hai bên giống nhau y hệt
  if (H_local === H_cloud) {
    if (H_base !== H_local) {
      settings.setLastSyncRecord(Date.now(), H_local);
    }
    return { type: 'no_action' };
  }

  // 3. Cả hai bên đều không đổi so với snapshot
  if (H_local === H_base && H_cloud === H_base) {
    return { type: 'no_action' };
  }

  // 4. Chỉ Local thay đổi -> Auto Upload lên Cloud
  if (H_local !== H_base && (H_cloud === H_base || !cloud)) {
    const uploadRes = await uploadToGist(token, local, settings.gistId);
    if (!uploadRes.success) {
      throw new Error(uploadRes.error);
    }
    if (uploadRes.gistId) {
      settings.setGistId(uploadRes.gistId);
    }
    settings.setLastSyncRecord(Date.now(), H_local);
    return { type: 'synced', detail: 'upload' };
  }

  // 5. Chỉ Cloud thay đổi -> Auto Download về máy
  if (H_local === H_base && H_cloud !== H_base && cloud) {
    await applyRemoteSaveData(cloud);
    settings.setLastSyncRecord(Date.now(), H_cloud);
    return { type: 'synced', detail: 'download' };
  }

  // 6. Xung Đột (Cả hai bên đều thay đổi độc lập)
  if (cloud) {
    return { type: 'conflict', localData: local, cloudData: cloud };
  }

  // Nếu Cloud rỗng, upload Local lên
  const uploadRes = await uploadToGist(token, local, settings.gistId);
  if (!uploadRes.success) throw new Error(uploadRes.error);
  if (uploadRes.gistId) settings.setGistId(uploadRes.gistId);
  settings.setLastSyncRecord(Date.now(), H_local);
  return { type: 'synced', detail: 'upload' };
}

/**
 * Cưỡng bức tải dữ liệu local lên Cloud (Ghi đè Đám mây)
 */
export async function forceUploadToCloud(): Promise<void> {
  const settings = useSettingsStore.getState();
  const token = settings.githubToken;
  if (!token) throw new Error('Chưa cấu hình GitHub Token');

  const local = await getLocalSaveData();
  const uploadRes = await uploadToGist(token, local, settings.gistId);
  if (!uploadRes.success) throw new Error(uploadRes.error);

  if (uploadRes.gistId) settings.setGistId(uploadRes.gistId);
  const hash = await computeHash(local);
  settings.setLastSyncRecord(Date.now(), hash);
}

/**
 * Cưỡng bức tải dữ liệu từ Cloud về máy (Ghi đè Máy này)
 */
export async function forceDownloadFromCloud(): Promise<void> {
  const settings = useSettingsStore.getState();
  const token = settings.githubToken;
  if (!token) throw new Error('Chưa cấu hình GitHub Token');

  const res = await downloadFromGist(token, settings.gistId);
  if (!res.success) throw new Error(res.error);

  await applyRemoteSaveData(res.data);
  if (res.gistId) settings.setGistId(res.gistId);
  const hash = await computeHash(res.data);
  settings.setLastSyncRecord(Date.now(), hash);
}

/**
 * Khôi phục phiên bản Save Data từ lịch sử
 */
export async function restoreHistoryVersion(data: TienLenSaveData): Promise<void> {
  const settings = useSettingsStore.getState();
  const token = settings.githubToken;
  if (!token) throw new Error('Chưa cấu hình GitHub Token');

  // Cập nhật lên Gist trước
  const uploadRes = await uploadToGist(token, data, settings.gistId);
  if (!uploadRes.success) throw new Error(uploadRes.error);

  // Áp dụng vào máy
  await applyRemoteSaveData(data);
  const hash = await computeHash(data);
  settings.setLastSyncRecord(Date.now(), hash);
}
