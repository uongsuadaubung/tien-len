import { 
  type GameRules, 
  type GameSettings, 
  createDefaultGameRules,
  updateTupleAt 
} from '../../engine/types';
import { 
  GameSettingsSchema, 
  QuickTableConfigSchema, 
  type QuickTableConfig 
} from '../../engine/schemas/settings.schema';
import { dbSaveQuickTableConfig } from '../../engine/db/indexed-db';
import type { TableConfigSlice, GameSliceCreator } from './types';

export const DEFAULT_GAME_RULES: GameRules = createDefaultGameRules();
export const DEFAULT_GAME_SETTINGS: GameSettings = GameSettingsSchema.parse({});
export const DEFAULT_QUICK_TABLE_CONFIG: QuickTableConfig = QuickTableConfigSchema.parse({});

export const createTableConfigSlice: GameSliceCreator<TableConfigSlice> = (set) => ({
  activeGameType: 'QUICK',
  playerCount: 4,
  botPersonaIds: ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1450'],
  customBotConfigs: [{}, {}, {}],
  currentCampaignChapter: null,

  gameRules: DEFAULT_GAME_RULES,
  gameSettings: DEFAULT_GAME_SETTINGS,
  quickTableConfig: DEFAULT_QUICK_TABLE_CONFIG,

  setActiveGameType: (type) => set({ activeGameType: type }),
  setPlayerCount: (count) => set({ playerCount: count }),
  setBotPersonaIds: (ids) => set({ botPersonaIds: ids }),
  updateBotPersonaAt: (index, personaId) => set((state) => ({
    botPersonaIds: updateTupleAt(state.botPersonaIds, index, personaId)
  })),
  setCustomBotConfigs: (configs) => set({ customBotConfigs: configs }),
  updateCustomBotConfigAt: (index, config) => set((state) => {
    const currentConfig = state.customBotConfigs[index] || {};
    const mergedConfig = { ...currentConfig, ...config };
    return {
      customBotConfigs: updateTupleAt(state.customBotConfigs, index, mergedConfig)
    };
  }),
  setCurrentCampaignChapter: (chapter) => set({ currentCampaignChapter: chapter }),

  setGameRules: (rules) => set({ gameRules: rules }),
  setGameSettings: (settings) => set((state) => ({
    gameSettings: typeof settings === 'function' ? settings(state.gameSettings) : settings
  })),
  updateGameSettings: (partial) => set((state) => ({
    gameSettings: { ...state.gameSettings, ...partial }
  })),
  setQuickTableConfig: (config) => {
    set({ quickTableConfig: config });
    dbSaveQuickTableConfig(config).catch(() => {});
  },
  hydrateQuickTableConfig: (config) => set({ quickTableConfig: config })
});
