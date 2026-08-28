import type { GithubUser } from '../schemas/settings.schema';
import type { TienLenSaveData } from '../schemas/sync.schema';

export type { GithubUser, TienLenSaveData };

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
