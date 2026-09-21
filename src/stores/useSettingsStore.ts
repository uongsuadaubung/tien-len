import { create } from 'zustand';
import { GameSpeedMode } from '../engine/game-speed';
import { dbGetGameSettings, dbSaveGameSettings } from '../engine/db/indexed-db';

import { SavedSettingsSchema, type GithubUser, type SavedSettings } from '../engine/schemas/settings.schema';

export type { SavedSettings };

export const DEFAULT_SETTINGS: SavedSettings = SavedSettingsSchema.parse({});
export const SETTINGS_STORAGE_KEY = 'tienlen_saved_settings';

let memorySettingsCache: SavedSettings | null = null;

export function loadInitialSettings(): SavedSettings {
  if (memorySettingsCache) {
    return memorySettingsCache;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const validated = SavedSettingsSchema.safeParse(parsed);
        if (validated.success) {
          memorySettingsCache = validated.data;
          return validated.data;
        }
      }
    } catch {}
  }
  return DEFAULT_SETTINGS;
}

function persistSettings(state: SettingsState): void {
  const data: SavedSettings = {
    soundEnabled: state.soundEnabled,
    autoSortEnabled: state.autoSortEnabled,
    aiHintEnabled: state.aiHintEnabled,
    quickResponseAssistEnabled: state.quickResponseAssistEnabled,
    reverseButtonsEnabled: state.reverseButtonsEnabled,
    xrayEnabled: state.xrayEnabled,
    botReasoningLogEnabled: state.botReasoningLogEnabled,
    onlineMultiplayerBetaEnabled: state.onlineMultiplayerBetaEnabled,
    gameSpeed: state.gameSpeed,
    githubToken: state.githubToken,
    gistId: state.gistId,
    lastSync: state.lastSync,
    lastSyncedHash: state.lastSyncedHash,
    cachedGithubUser: state.cachedGithubUser,
    autoBackupOnMatchEnd: state.autoBackupOnMatchEnd,
    autoBackupInterval: state.autoBackupInterval,
    autoSyncOnStartup: state.autoSyncOnStartup
  };

  memorySettingsCache = data;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  dbSaveGameSettings(data).catch(() => {});
}

interface SettingsState {
  soundEnabled: boolean;
  autoSortEnabled: boolean;
  aiHintEnabled: boolean;
  quickResponseAssistEnabled: boolean;
  reverseButtonsEnabled: boolean;
  xrayEnabled: boolean;
  botReasoningLogEnabled: boolean;
  onlineMultiplayerBetaEnabled: boolean;
  gameSpeed: GameSpeedMode;
  githubToken: string;
  gistId: string;
  lastSync: number;
  lastSyncedHash: string;
  cachedGithubUser: GithubUser | null;
  autoBackupOnMatchEnd: boolean;
  autoBackupInterval: number;
  autoSyncOnStartup: boolean;

  // Actions
  toggleSound: () => void;
  toggleAutoSort: () => void;
  toggleAiHint: () => void;
  toggleQuickResponseAssist: () => void;
  toggleReverseButtons: () => void;
  toggleXRay: () => void;
  toggleBotReasoningLog: () => void;
  toggleOnlineMultiplayerBeta: () => void;
  toggleAutoBackupOnMatchEnd: () => void;
  toggleAutoSyncOnStartup: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAutoSortEnabled: (enabled: boolean) => void;
  setAiHintEnabled: (enabled: boolean) => void;
  setQuickResponseAssistEnabled: (enabled: boolean) => void;
  setReverseButtonsEnabled: (enabled: boolean) => void;
  setXRayEnabled: (enabled: boolean) => void;
  setBotReasoningLogEnabled: (enabled: boolean) => void;
  setOnlineMultiplayerBetaEnabled: (enabled: boolean) => void;
  setAutoBackupOnMatchEnd: (enabled: boolean) => void;
  setAutoBackupInterval: (interval: number) => void;
  setAutoSyncOnStartup: (enabled: boolean) => void;
  setGameSpeed: (speed: GameSpeedMode) => void;
  setGithubToken: (token: string) => void;
  setCachedGithubUser: (user: GithubUser | null) => void;
  setGistId: (id: string) => void;
  setLastSyncRecord: (timestamp: number, hash: string) => void;
  clearGithubAuth: () => void;
  hydrateSettings: (settings: Partial<SavedSettings>) => void;
}

const initial = loadInitialSettings();

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: initial.soundEnabled,
  autoSortEnabled: initial.autoSortEnabled,
  aiHintEnabled: initial.aiHintEnabled,
  quickResponseAssistEnabled: initial.quickResponseAssistEnabled,
  reverseButtonsEnabled: initial.reverseButtonsEnabled ?? false,
  xrayEnabled: initial.xrayEnabled,
  botReasoningLogEnabled: initial.botReasoningLogEnabled,
  onlineMultiplayerBetaEnabled: initial.onlineMultiplayerBetaEnabled ?? false,
  gameSpeed: initial.gameSpeed,
  githubToken: initial.githubToken,
  gistId: initial.gistId,
  lastSync: initial.lastSync,
  lastSyncedHash: initial.lastSyncedHash,
  cachedGithubUser: initial.cachedGithubUser,
  autoBackupOnMatchEnd: initial.autoBackupOnMatchEnd,
  autoBackupInterval: initial.autoBackupInterval || 5,
  autoSyncOnStartup: initial.autoSyncOnStartup,

  hydrateSettings: (settings) => set((state) => {
    const next = { ...state, ...settings };
    const data: SavedSettings = {
      soundEnabled: next.soundEnabled,
      autoSortEnabled: next.autoSortEnabled,
      aiHintEnabled: next.aiHintEnabled,
      quickResponseAssistEnabled: next.quickResponseAssistEnabled,
      reverseButtonsEnabled: next.reverseButtonsEnabled,
      xrayEnabled: next.xrayEnabled,
      botReasoningLogEnabled: next.botReasoningLogEnabled,
      onlineMultiplayerBetaEnabled: next.onlineMultiplayerBetaEnabled,
      gameSpeed: next.gameSpeed,
      githubToken: next.githubToken,
      gistId: next.gistId,
      lastSync: next.lastSync,
      lastSyncedHash: next.lastSyncedHash,
      cachedGithubUser: next.cachedGithubUser,
      autoBackupOnMatchEnd: next.autoBackupOnMatchEnd,
      autoBackupInterval: next.autoBackupInterval,
      autoSyncOnStartup: next.autoSyncOnStartup
    };
    memorySettingsCache = data;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }
    return next;
  }),

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
  toggleReverseButtons: () => set((state) => {
    const next = { ...state, reverseButtonsEnabled: !state.reverseButtonsEnabled };
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
  toggleOnlineMultiplayerBeta: () => set((state) => {
    const next = { ...state, onlineMultiplayerBetaEnabled: !state.onlineMultiplayerBetaEnabled };
    persistSettings(next);
    return next;
  }),
  setOnlineMultiplayerBetaEnabled: (enabled) => set((state) => {
    const next = { ...state, onlineMultiplayerBetaEnabled: enabled };
    persistSettings(next);
    return next;
  }),
  toggleAutoBackupOnMatchEnd: () => set((state) => {
    const next = { ...state, autoBackupOnMatchEnd: !state.autoBackupOnMatchEnd };
    persistSettings(next);
    return next;
  }),
  toggleAutoSyncOnStartup: () => set((state) => {
    const next = { ...state, autoSyncOnStartup: !state.autoSyncOnStartup };
    persistSettings(next);
    return next;
  }),
  setAutoBackupOnMatchEnd: (autoBackupOnMatchEnd) => set((state) => {
    const next = { ...state, autoBackupOnMatchEnd };
    persistSettings(next);
    return next;
  }),
  setAutoBackupInterval: (autoBackupInterval) => set((state) => {
    const next = { ...state, autoBackupInterval };
    persistSettings(next);
    return next;
  }),
  setAutoSyncOnStartup: (autoSyncOnStartup) => set((state) => {
    const next = { ...state, autoSyncOnStartup };
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
  setReverseButtonsEnabled: (enabled) => set((state) => {
    const next = { ...state, reverseButtonsEnabled: enabled };
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

