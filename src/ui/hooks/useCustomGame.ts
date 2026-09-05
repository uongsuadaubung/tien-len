import { useState, useCallback, useMemo } from 'react';
import { 
  GameSettings, 
  PlayerCount, 
  normalizePlayerCount,
  BotPersonaIdTuple,
  CustomBotConfigTuple,
  updateTupleAt
} from '../../engine/types';
import { BOT_PERSONAS, getAllBotConfigs } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { ECONOMY_CONSTANTS, calculateRequiredDeposit } from '../../engine/constants/economy';
import { TableConfigState } from '../components/TableRulesConfigPanel';

export interface CustomGameModalConfig {
  selectedModeId: string;
  settings: GameSettings;
  botPersonaIds: BotPersonaIdTuple;
  customBotConfigs: CustomBotConfigTuple<BotConfig>;
  playerCount: PlayerCount;
}

export type CustomGameTabType = 'MODE_RULES' | 'BOT_ROSTER' | 'ADVANCED_AI';

import { useUserStore } from '../../stores/useUserStore';
import { t } from '../../locales';

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

/**
 * Hàm biên giới (boundary resolver): phân giải cấu hình custom game, đảm bảo 100% thuộc tính hợp lệ và non-null
 */
export function resolveCustomGameConfig(
  partial: Partial<CustomGameModalConfig> | null | undefined,
  playerCoins: number
): CustomGameModalConfig {
  const resolvedPlayerCount = normalizePlayerCount(partial?.playerCount);
  const initialBet = Math.min(
    partial?.settings?.betAmount ?? ECONOMY_CONSTANTS.DEFAULT_QUICK_BET,
    Math.max(1, playerCoins)
  );

  return {
    selectedModeId: partial?.selectedModeId ?? 'COUNT_CARDS',
    playerCount: resolvedPlayerCount,
    settings: {
      mode: partial?.settings?.mode ?? 'COUNT_CARDS',
      betAmount: initialBet,
      playerCount: resolvedPlayerCount,
      allowFourPairsCutAnytime: partial?.settings?.allowFourPairsCutAnytime ?? true,
      instantWinEnabled: partial?.settings?.instantWinEnabled ?? true,
      soundEnabled: partial?.settings?.soundEnabled ?? true,
      prohibitEndingWithTwo: partial?.settings?.prohibitEndingWithTwo ?? true,
      threeSpadesEndingBonus: partial?.settings?.threeSpadesEndingBonus ?? true,
      cascadeChopEnabled: partial?.settings?.cascadeChopEnabled ?? true
    },
    botPersonaIds: partial?.botPersonaIds ?? ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1750'],
    customBotConfigs: partial?.customBotConfigs ?? [{}, {}, {}]
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

  const [choppingMultiplier, setChoppingMultiplier] = useState<number>(1);
  const [congEnabled, setCongEnabled] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<CustomGameTabType>('MODE_RULES');
  const [activeBotSeatIndex, setActiveBotSeatIndex] = useState<number>(0);

  const depositRequired = calculateRequiredDeposit(settings.betAmount);
  const isInsufficientCoins = playerCoins < settings.betAmount;
  const actualDeposit = Math.min(playerCoins, depositRequired);

  const handleApplyBotPreset = useCallback((presetBotIds: BotPersonaIdTuple) => {
    setBotPersonaIds([presetBotIds[0], presetBotIds[1], presetBotIds[2]]);
  }, []);

  const handleApplyGodModeAll = useCallback(() => {
    setBotPersonaIds(['BOT_ELO_3200', 'BOT_ELO_2750', 'BOT_ELO_2500']);
    setCustomBotConfigs([
      { mctsSimulations: 50, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 1.0, useMinimaxEndgame: true, useBayesianInference: true, useNashEquilibrium: true },
      { mctsSimulations: 30, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95, useMinimaxEndgame: true, useBayesianInference: true },
      { mctsSimulations: 20, memoryDepth: 1.0, tempoControl: 0.98, damageControl: 0.98, antiLeaderAggression: 1.0, baitingTendency: 0.90, useMinimaxEndgame: true }
    ]);
  }, []);

  const handleRandomizeBots = useCallback(() => {
    const personaKeys = Object.keys(BOT_PERSONAS);
    const shuffled = [...personaKeys].sort(() => 0.5 - Math.random());
    setBotPersonaIds([shuffled[0] || 'BOT_ELO_850', shuffled[1] || 'BOT_ELO_1150', shuffled[2] || 'BOT_ELO_1450']);
  }, []);

  const handleUpdateBotPersona = useCallback((seatIndex: number, personaId: string) => {
    setBotPersonaIds(prev => updateTupleAt(prev, seatIndex, personaId));
  }, []);

  const handleConfigChange = useCallback(<K extends keyof BotConfig>(field: K, value: BotConfig[K]) => {
    setCustomBotConfigs(prev => {
      const current = prev[activeBotSeatIndex] || {};
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
      playerCount
    });
    onClose?.();
  }, [isInsufficientCoins, onClose, onStartCustomGame, playerCount, playerCoins, settings, botPersonaIds, customBotConfigs]);

  const activeBotCount = playerCount - 1;
  const currentActivePersona = BOT_PERSONAS[botPersonaIds[activeBotSeatIndex]] ?? BOT_PERSONAS.BOT_ELO_1150;
  const currentActiveCustom = customBotConfigs[activeBotSeatIndex] ?? {};
  const currentConfig: BotConfig = useMemo(() => ({
    ...currentActivePersona,
    ...currentActiveCustom
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
