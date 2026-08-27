import type { PlayerProfile } from '../storage';
import type { SavedSettings } from '../../stores/useSettingsStore';
import type { BotEntity, EcosystemNewsItem, SimulatedTableResult } from '../ecosystem/ecosystem-types';
import type { MatchLogReport } from '../match-logger';

export interface GithubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
}

export interface GistFile {
  content?: string;
  raw_url: string;
  filename?: string;
  size?: number;
}

export interface Gist {
  id: string;
  description: string | null;
  updated_at: string;
  created_at: string;
  files: Record<string, GistFile>;
}

export interface GistListItem {
  id: string;
  description: string | null;
  updated_at: string;
  files: Record<string, { raw_url: string; filename?: string }>;
}

export interface TienLenSaveData {
  version: number;
  updatedAt: number;
  profile: PlayerProfile;
  settings: Partial<SavedSettings>;
  bots?: BotEntity[];
  newsfeed?: EcosystemNewsItem[];
  matchHistory?: SimulatedTableResult[];
  humanBehavior?: unknown;
  matchLogs?: MatchLogReport[];
}

export type SyncResponse<T = unknown> =
  | ({ success: true } & T)
  | { success: false; error: string };

export type SmartSyncResult =
  | { type: 'no_action' }
  | { type: 'synced'; detail: 'upload' | 'download' }
  | { type: 'conflict'; localData: TienLenSaveData; cloudData: TienLenSaveData };

export interface GistHistoryItem {
  version: string;
  committedAt: string;
  saveData: TienLenSaveData | null;
  error?: string;
}
