import { useState, useCallback, useMemo } from 'react';
import { 
  GameSettings, 
  PlayerCount, 
  normalizePlayerCount,
  BotPersonaIdTuple,
  CustomBotConfigTuple,
  updateTupleAt
} from '../../engine/types';
import { BOT_PERSONAS, getAllBotConfigs, getBotConfig } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { calculateRequiredDeposit } from '../../engine/constants/economy';
import { TableConfigState } from '../components/TableRulesConfigPanel';
import type { CustomGameModalConfig } from '../../engine/schemas/settings.schema';

export type { CustomGameModalConfig };

export type CustomGameTabType = 'MODE_RULES' | 'BOT_ROSTER' | 'ADVANCED_AI';

import { useUserStore } from '../../stores/useUserStore';
import { t, type I18nKeyPath } from '../../locales';

export interface BotPreset {
  readonly id: string;
  readonly nameKey: I18nKeyPath;
  readonly descKey: I18nKeyPath;
  readonly botIds: BotPersonaIdTuple;
}

export const BOT_PRESETS: readonly BotPreset[] = [
  { id: 'NEWBIE_TABLE', nameKey: 'customGame.presetNewbieName', descKey: 'customGame.presetNewbieDesc', botIds: ['BOT_ELO_700', 'BOT_ELO_750', 'BOT_ELO_850'] },
  { id: 'CASUAL_STREET', nameKey: 'customGame.presetCasualName', descKey: 'customGame.presetCasualDesc', botIds: ['BOT_ELO_950', 'BOT_ELO_1000', 'BOT_ELO_1150'] },
  { id: 'MID_TIER_PRO', nameKey: 'customGame.presetProName', descKey: 'customGame.presetProDesc', botIds: ['BOT_ELO_1500', 'BOT_ELO_1750', 'BOT_ELO_1800'] },
  { id: 'ELITE_CLUB', nameKey: 'customGame.presetEliteName', descKey: 'customGame.presetEliteDesc', botIds: ['BOT_ELO_2000', 'BOT_ELO_2300', 'BOT_ELO_2500'] }
];

export interface UseCustomGameProps {
  initialConfig: Partial<CustomGameModalConfig> | null;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
  onClose: (() => void) | null;
}

export interface UseCustomGameReturn {
  playerCount: PlayerCount;
  setPlayerCount: (count: PlayerCount) => void;
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  botPersonaIds: BotPersonaIdTuple;
  setBotPersonaIds: (ids: BotPersonaIdTuple) => void;
  customBotConfigs: CustomBotConfigTuple<BotConfig>;
  setCustomBotConfigs: React.Dispatch<React.SetStateAction<CustomBotConfigTuple<BotConfig>>>;
  choppingMultiplier: number;
  setChoppingMultiplier: (multiplier: number) => void;
  congMultiplier: number;
  setCongMultiplier: (multiplier: number) => void;
  congEnabled: boolean;
  setCongEnabled: (enabled: boolean) => void;
  activeTab: CustomGameTabType;
  setActiveTab: (tab: CustomGameTabType) => void;
  activeBotSeatIndex: number;
  setActiveBotSeatIndex: (index: number) => void;
  depositRequired: number;
  isInsufficientCoins: boolean;
  actualDeposit: number;
  seatLabels: readonly string[];
  activeBotCount: number;
  currentActivePersona: BotConfig;
  currentActiveCustom: Partial<BotConfig>;
  currentConfig: BotConfig;
  allPersonas: BotConfig[];
  handleApplyBotPreset: (presetBotIds: BotPersonaIdTuple) => void;
  handleApplyGodModeAll: () => void;
  handleRandomizeBots: () => void;
  handleUpdateBotPersona: (seatIndex: number, personaId: string) => void;
  handleConfigChange: <K extends keyof BotConfig>(field: K, value: BotConfig[K]) => void;
  handleTableConfigChange: (updated: Partial<TableConfigState>) => void;
  handleStartGame: () => void;
}

const getSeatLabels = () => [
  t('tableConfig.seatLeft'),
  t('tableConfig.seatTop'),
  t('tableConfig.seatRight')
] as const;

import { CustomGameModalConfigSchema } from '../../engine/schemas/settings.schema';

/**
 * Hàm biên giới (boundary resolver): phân giải cấu hình custom game qua Zod Gatekeeper SSOT
 */
export function resolveCustomGameConfig(
  partial: Partial<CustomGameModalConfig> | null | undefined,
  playerCoins: number
): CustomGameModalConfig {
  const clean = partial
    ? Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined))
    : {};
  const parsed = CustomGameModalConfigSchema.parse(clean);
  const resolvedPlayerCount = normalizePlayerCount(partial?.playerCount ?? parsed.playerCount);
  const initialBet = Math.min(
    partial?.settings?.betAmount ?? parsed.settings.betAmount,
    Math.max(1, playerCoins)
  );

  return {
    ...parsed,
    playerCount: resolvedPlayerCount,
    settings: {
      ...parsed.settings,
      playerCount: resolvedPlayerCount,
      betAmount: initialBet
    }
  };
}

/**
 * Custom hook quản lý toàn bộ trạng thái và nghiệp vụ cho Xưởng Tùy Biến Trận Đấu Sandbox
 */
export function useCustomGame({
  initialConfig,
  onStartCustomGame,
  onClose
}: UseCustomGameProps): UseCustomGameReturn {
  const { profile } = useUserStore();
  const playerCoins = profile.coins;
  const allPersonas = useMemo(() => getAllBotConfigs(), []);

  const initialResolved = useMemo(
    () => resolveCustomGameConfig(initialConfig, playerCoins),
    [initialConfig, playerCoins]
  );

  const [playerCount, setPlayerCount] = useState<PlayerCount>(initialResolved.playerCount);
  const [settings, setSettings] = useState<GameSettings>(initialResolved.settings);
  const [botPersonaIds, setBotPersonaIds] = useState<BotPersonaIdTuple>(initialResolved.botPersonaIds);
  const [customBotConfigs, setCustomBotConfigs] = useState<CustomBotConfigTuple<BotConfig>>(initialResolved.customBotConfigs);

  const [choppingMultiplier, setChoppingMultiplier] = useState<number>(initialResolved.choppingMultiplier);
  const [congMultiplier, setCongMultiplier] = useState<number>(initialResolved.congMultiplier);
  const [congEnabled, setCongEnabled] = useState<boolean>(initialResolved.congEnabled);

  const [activeTab, setActiveTab] = useState<CustomGameTabType>('MODE_RULES');
  const [activeBotSeatIndex, setActiveBotSeatIndex] = useState<number>(0);

  const depositRequired = calculateRequiredDeposit(settings.betAmount, congMultiplier, congEnabled);
  const isInsufficientCoins = playerCoins < settings.betAmount;
  const actualDeposit = Math.min(playerCoins, depositRequired);

  const handleApplyBotPreset = useCallback((presetBotIds: BotPersonaIdTuple) => {
    setBotPersonaIds([presetBotIds[0], presetBotIds[1], presetBotIds[2]]);
  }, []);

  const handleApplyGodModeAll = useCallback(() => {
    setBotPersonaIds(['BOT_ELO_3200', 'BOT_ELO_2750', 'BOT_ELO_2500']);
    setCustomBotConfigs([
      { mctsSimulations: 50, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 1.0, useMinimaxEndgame: true, useBayesianInference: true },
      { mctsSimulations: 30, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95, useMinimaxEndgame: true, useBayesianInference: true },
      { mctsSimulations: 20, memoryDepth: 1.0, tempoControl: 0.98, damageControl: 0.98, antiLeaderAggression: 1.0, baitingTendency: 0.90, useMinimaxEndgame: true }
    ]);
  }, []);

  const handleRandomizeBots = useCallback(() => {
    const personaKeys = Object.keys(BOT_PERSONAS);
    const shuffled = [...personaKeys].sort(() => 0.5 - Math.random());
    setBotPersonaIds([shuffled[0], shuffled[1], shuffled[2]]);
  }, []);

  const handleUpdateBotPersona = useCallback((seatIndex: number, personaId: string) => {
    setBotPersonaIds(prev => updateTupleAt(prev, seatIndex, personaId));
  }, []);

  const handleConfigChange = useCallback(<K extends keyof BotConfig>(field: K, value: BotConfig[K]) => {
    setCustomBotConfigs(prev => {
      const current = prev[activeBotSeatIndex];
      const updated = { ...current, [field]: value };
      return updateTupleAt(prev, activeBotSeatIndex, updated);
    });
  }, [activeBotSeatIndex]);

  const handleTableConfigChange = useCallback((updated: Partial<TableConfigState>) => {
    if (updated.playerCount !== undefined) {
      setPlayerCount(updated.playerCount);
    }
    if (updated.choppingMultiplier !== undefined) {
      setChoppingMultiplier(updated.choppingMultiplier);
    }
    if (updated.congMultiplier !== undefined) {
      setCongMultiplier(updated.congMultiplier);
    }
    if (updated.congEnabled !== undefined) {
      setCongEnabled(updated.congEnabled);
    }
    setSettings(prev => ({
      ...prev,
      ...updated
    }));
  }, []);

  const handleStartGame = useCallback(() => {
    if (settings.betAmount <= 0) {
      alert(t('tableConfig.betInputErrorPositive'));
      return;
    }
    if (isInsufficientCoins) {
      alert(t('tableConfig.insufficientCoinsAlert', {
        coins: playerCoins.toLocaleString(),
        bet: settings.betAmount.toLocaleString()
      }));
      return;
    }

    onStartCustomGame({
      selectedModeId: settings.mode,
      settings: {
        ...settings,
        playerCount
      },
      botPersonaIds,
      customBotConfigs,
      playerCount,
      choppingMultiplier,
      congMultiplier,
      congEnabled
    });
    onClose?.();
  }, [isInsufficientCoins, onClose, onStartCustomGame, playerCount, playerCoins, settings, botPersonaIds, customBotConfigs, choppingMultiplier, congMultiplier, congEnabled]);

  const activeBotCount = playerCount - 1;
  const currentActivePersona = getBotConfig(botPersonaIds[activeBotSeatIndex]);
  const currentActiveCustom = customBotConfigs[activeBotSeatIndex];
  const currentConfig: BotConfig = useMemo(() => ({
    ...currentActivePersona,
    ...(currentActiveCustom ? currentActiveCustom : {})
  }), [currentActivePersona, currentActiveCustom]);

  return {
    playerCount,
    setPlayerCount,
    settings,
    setSettings,
    botPersonaIds,
    setBotPersonaIds,
    customBotConfigs,
    setCustomBotConfigs,
    choppingMultiplier,
    setChoppingMultiplier,
    congMultiplier,
    setCongMultiplier,
    congEnabled,
    setCongEnabled,
    activeTab,
    setActiveTab,
    activeBotSeatIndex,
    setActiveBotSeatIndex,
    depositRequired,
    isInsufficientCoins,
    actualDeposit,
    seatLabels: getSeatLabels(),
    activeBotCount,
    currentActivePersona,
    currentActiveCustom,
    currentConfig,
    allPersonas,
    handleApplyBotPreset,
    handleApplyGodModeAll,
    handleRandomizeBots,
    handleUpdateBotPersona,
    handleConfigChange,
    handleTableConfigChange,
    handleStartGame
  };
}
