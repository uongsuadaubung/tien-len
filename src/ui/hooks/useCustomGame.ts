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

export interface UseCustomGameProps {
  playerCoins: number;
  initialConfig?: Partial<CustomGameModalConfig>;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
  onClose?: () => void;
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

const SEAT_LABELS = [
  'Ghế Trái (Bot 1)',
  'Ghế Trên (Bot 2)',
  'Ghế Phải (Bot 3)'
] as const;

/**
 * Custom hook quản lý toàn bộ trạng thái và nghiệp vụ cho Xưởng Tùy Biến Trận Đấu Sandbox
 */
export function useCustomGame({
  playerCoins,
  initialConfig,
  onStartCustomGame,
  onClose
}: UseCustomGameProps): UseCustomGameReturn {
  const allPersonas = useMemo(() => getAllBotConfigs(), []);

  const initialBet = Math.min(
    initialConfig?.settings?.betAmount || ECONOMY_CONSTANTS.DEFAULT_QUICK_BET,
    Math.max(1, playerCoins)
  );

  const [playerCount, setPlayerCount] = useState<PlayerCount>(
    normalizePlayerCount(initialConfig?.playerCount)
  );

  const [settings, setSettings] = useState<GameSettings>({
    mode: initialConfig?.settings?.mode || 'COUNT_CARDS',
    betAmount: initialBet,
    playerCount: normalizePlayerCount(initialConfig?.playerCount),
    allowFourPairsCutAnytime: initialConfig?.settings?.allowFourPairsCutAnytime ?? true,
    instantWinEnabled: initialConfig?.settings?.instantWinEnabled ?? true,
    soundEnabled: initialConfig?.settings?.soundEnabled ?? true,
    prohibitEndingWithTwo: initialConfig?.settings?.prohibitEndingWithTwo ?? true,
    threeSpadesEndingBonus: initialConfig?.settings?.threeSpadesEndingBonus ?? true,
    cascadeChopEnabled: initialConfig?.settings?.cascadeChopEnabled ?? true
  });

  const [botPersonaIds, setBotPersonaIds] = useState<BotPersonaIdTuple>(
    initialConfig?.botPersonaIds || ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1750']
  );

  const [customBotConfigs, setCustomBotConfigs] = useState<CustomBotConfigTuple<BotConfig>>(
    initialConfig?.customBotConfigs || [{}, {}, {}]
  );

  const [choppingMultiplier, setChoppingMultiplier] = useState<number>(1);
  const [congEnabled, setCongEnabled] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<CustomGameTabType>('MODE_RULES');
  const [activeBotSeatIndex, setActiveBotSeatIndex] = useState<number>(0);

  const depositRequired = calculateRequiredDeposit(settings.betAmount, choppingMultiplier);
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
      alert('Mức cược phải lớn hơn 0 Xu!');
      return;
    }
    if (isInsufficientCoins) {
      alert(`Số dư hiện tại (${playerCoins.toLocaleString()} Xu) không đủ mức cược tối thiểu của bàn (${settings.betAmount.toLocaleString()} Xu)!`);
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
  const currentActivePersona = BOT_PERSONAS[botPersonaIds[activeBotSeatIndex]] || BOT_PERSONAS.BOT_ELO_1150;
  const currentActiveCustom = customBotConfigs[activeBotSeatIndex] || {};
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
    seatLabels: SEAT_LABELS,
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
