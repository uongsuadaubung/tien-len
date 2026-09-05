import type { GithubUser } from '../schemas/settings.schema';
import type { TienLenSaveData } from '../schemas/sync.schema';

export type { GithubUser, TienLenSaveData };

export interface GistFile {
  content: string | null;
  raw_url: string;
  filename: string | null;
  size: number | null;
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
  files: Record<string, { raw_url: string; filename: string | null }>;
}

export type SyncResponse<T = unknown> =
  | ({ success: true } & T)
  | { success: false; error: string };

export type SmartSyncResult =
  | { type: 'no_action' }
  | { type: 'synced'; detail: 'upload' | 'download' }
  | { type: 'conflict'; localData: TienLenSaveData; cloudData: TienLenSaveData };

export type GistHistoryItem =
  | {
      readonly success: true;
      readonly version: string;
      readonly committedAt: string;
      readonly saveData: TienLenSaveData;
    }
  | {
      readonly success: false;
      readonly version: string;
      readonly committedAt: string;
      readonly error: string;
    };
