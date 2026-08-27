import { create } from 'zustand';
import { GameSpeedMode } from '../engine/game-speed';
import { dbGetGameSettings, dbSaveGameSettings } from '../engine/db/indexed-db';

import type { GithubUser } from '../engine/sync/types';

export interface SavedSettings extends Record<string, unknown> {
  soundEnabled: boolean;
  autoSortEnabled: boolean;
  aiHintEnabled: boolean;
  quickResponseAssistEnabled: boolean;
  xrayEnabled: boolean;
  botReasoningLogEnabled: boolean;
  gameSpeed: GameSpeedMode;
  githubToken: string;
  gistId: string;
  lastSync: number;
  lastSyncedHash: string;
  cachedGithubUser: GithubUser | null;
}

const DEFAULT_SETTINGS: SavedSettings = {
  soundEnabled: true,
  autoSortEnabled: true,
  aiHintEnabled: false,
  quickResponseAssistEnabled: false,
  xrayEnabled: false,
  botReasoningLogEnabled: false,
  gameSpeed: 'REALISTIC',
  githubToken: '',
  gistId: '',
  lastSync: 0,
  lastSyncedHash: '',
  cachedGithubUser: null
};

function persistSettings(state: SettingsState): void {
  const data: SavedSettings = {
    soundEnabled: state.soundEnabled,
    autoSortEnabled: state.autoSortEnabled,
    aiHintEnabled: state.aiHintEnabled,
    quickResponseAssistEnabled: state.quickResponseAssistEnabled,
    xrayEnabled: state.xrayEnabled,
    botReasoningLogEnabled: state.botReasoningLogEnabled,
    gameSpeed: state.gameSpeed,
    githubToken: state.githubToken,
    gistId: state.gistId,
    lastSync: state.lastSync,
    lastSyncedHash: state.lastSyncedHash,
    cachedGithubUser: state.cachedGithubUser
  };

  dbSaveGameSettings(data).catch(() => {});
}

interface SettingsState {
  soundEnabled: boolean;
  autoSortEnabled: boolean;
  aiHintEnabled: boolean;
  quickResponseAssistEnabled: boolean;
  xrayEnabled: boolean;
  botReasoningLogEnabled: boolean;
  gameSpeed: GameSpeedMode;
  githubToken: string;
  gistId: string;
  lastSync: number;
  lastSyncedHash: string;
  cachedGithubUser: GithubUser | null;

  // Actions
  toggleSound: () => void;
  toggleAutoSort: () => void;
  toggleAiHint: () => void;
  toggleQuickResponseAssist: () => void;
  toggleXRay: () => void;
  toggleBotReasoningLog: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAutoSortEnabled: (enabled: boolean) => void;
  setAiHintEnabled: (enabled: boolean) => void;
  setQuickResponseAssistEnabled: (enabled: boolean) => void;
  setXRayEnabled: (enabled: boolean) => void;
  setBotReasoningLogEnabled: (enabled: boolean) => void;
  setGameSpeed: (speed: GameSpeedMode) => void;
  setGithubToken: (token: string) => void;
  setCachedGithubUser: (user: GithubUser | null) => void;
  setGistId: (id: string) => void;
  setLastSyncRecord: (timestamp: number, hash: string) => void;
  clearGithubAuth: () => void;
  hydrateSettings: (settings: Partial<SavedSettings>) => void;
}

const initial = DEFAULT_SETTINGS;

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: initial.soundEnabled,
  autoSortEnabled: initial.autoSortEnabled,
  aiHintEnabled: initial.aiHintEnabled,
  quickResponseAssistEnabled: initial.quickResponseAssistEnabled,
  xrayEnabled: initial.xrayEnabled,
  botReasoningLogEnabled: initial.botReasoningLogEnabled,
  gameSpeed: initial.gameSpeed,
  githubToken: initial.githubToken,
  gistId: initial.gistId,
  lastSync: initial.lastSync,
  lastSyncedHash: initial.lastSyncedHash,
  cachedGithubUser: initial.cachedGithubUser,

  hydrateSettings: (settings) => set((state) => ({ ...state, ...settings })),

  toggleSound: () => set((state) => {
    const next = { ...state, soundEnabled: !state.soundEnabled };
    persistSettings(next);
    return next;
  }),
  toggleAutoSort: () => set((state) => {
    const next = { ...state, autoSortEnabled: !state.autoSortEnabled };
    persistSettings(next);
    return next;
  }),
  toggleAiHint: () => set((state) => {
    const next = { ...state, aiHintEnabled: !state.aiHintEnabled };
    persistSettings(next);
    return next;
  }),
  toggleQuickResponseAssist: () => set((state) => {
    const next = { ...state, quickResponseAssistEnabled: !state.quickResponseAssistEnabled };
    persistSettings(next);
    return next;
  }),
  toggleXRay: () => set((state) => {
    const next = { ...state, xrayEnabled: !state.xrayEnabled };
    persistSettings(next);
    return next;
  }),
  toggleBotReasoningLog: () => set((state) => {
    const next = { ...state, botReasoningLogEnabled: !state.botReasoningLogEnabled };
    persistSettings(next);
    return next;
  }),

  setSoundEnabled: (enabled) => set((state) => {
    const next = { ...state, soundEnabled: enabled };
    persistSettings(next);
    return next;
  }),
  setAutoSortEnabled: (enabled) => set((state) => {
    const next = { ...state, autoSortEnabled: enabled };
    persistSettings(next);
    return next;
  }),
  setAiHintEnabled: (enabled) => set((state) => {
    const next = { ...state, aiHintEnabled: enabled };
    persistSettings(next);
    return next;
  }),
  setQuickResponseAssistEnabled: (enabled) => set((state) => {
    const next = { ...state, quickResponseAssistEnabled: enabled };
    persistSettings(next);
    return next;
  }),
  setXRayEnabled: (enabled) => set((state) => {
    const next = { ...state, xrayEnabled: enabled };
    persistSettings(next);
    return next;
  }),
  setBotReasoningLogEnabled: (enabled) => set((state) => {
    const next = { ...state, botReasoningLogEnabled: enabled };
    persistSettings(next);
    return next;
  }),
  setGameSpeed: (speed) => set((state) => {
    const next = { ...state, gameSpeed: speed };
    persistSettings(next);
    return next;
  }),
  setGithubToken: (token) => set((state) => {
    const next = { ...state, githubToken: token };
    persistSettings(next);
    return next;
  }),
  setCachedGithubUser: (user) => set((state) => {
    const next = { ...state, cachedGithubUser: user };
    persistSettings(next);
    return next;
  }),
  setGistId: (id) => set((state) => {
    const next = { ...state, gistId: id };
    persistSettings(next);
    return next;
  }),
  setLastSyncRecord: (timestamp, hash) => set((state) => {
    const next = { ...state, lastSync: timestamp, lastSyncedHash: hash };
    persistSettings(next);
    return next;
  }),
  clearGithubAuth: () => set((state) => {
    const next = {
      ...state,
      githubToken: '',
      gistId: '',
      lastSync: 0,
      lastSyncedHash: '',
      cachedGithubUser: null
    };
    persistSettings(next);
    return next;
  })
}));

// Khởi động đồng bộ settings từ IndexedDB
if (typeof window !== 'undefined') {
  dbGetGameSettings().then((settings) => {
    if (settings) {
      useSettingsStore.getState().hydrateSettings(settings);
    }
  }).catch(() => {});
}

