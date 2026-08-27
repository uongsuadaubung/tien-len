import { create } from 'zustand';
import { GameSpeedMode } from '../engine/game-speed';
import { dbGetGameSettings, dbSaveGameSettings } from '../engine/db/indexed-db';

export interface SavedSettings {
  soundEnabled: boolean;
  autoSortEnabled: boolean;
  aiHintEnabled: boolean;
  quickResponseAssistEnabled: boolean;
  xrayEnabled: boolean;
  botReasoningLogEnabled: boolean;
  gameSpeed: GameSpeedMode;
}

const DEFAULT_SETTINGS: SavedSettings = {
  soundEnabled: true,
  autoSortEnabled: true,
  aiHintEnabled: false,
  quickResponseAssistEnabled: false,
  xrayEnabled: false,
  botReasoningLogEnabled: false,
  gameSpeed: 'REALISTIC'
};

function persistSettings(state: SettingsState): void {
  const data: SavedSettings = {
    soundEnabled: state.soundEnabled,
    autoSortEnabled: state.autoSortEnabled,
    aiHintEnabled: state.aiHintEnabled,
    quickResponseAssistEnabled: state.quickResponseAssistEnabled,
    xrayEnabled: state.xrayEnabled,
    botReasoningLogEnabled: state.botReasoningLogEnabled,
    gameSpeed: state.gameSpeed
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
  })
}));

// Khởi động đồng bộ settings từ IndexedDB
if (typeof window !== 'undefined') {
  dbGetGameSettings<SavedSettings>().then((settings) => {
    if (settings) {
      useSettingsStore.getState().hydrateSettings(settings);
    }
  }).catch(() => {});
}

