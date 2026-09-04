import { useState, useCallback, useEffect } from 'react';
import { GameSettlementRule } from '../../engine/types';
import { ECONOMY_CONSTANTS, calculateRequiredDeposit } from '../../engine/constants/economy';
import { TableConfigState } from '../components/TableRulesConfigPanel';

export interface QuickSetupConfig {
  playerCount: 2 | 3 | 4;
  betAmount: number;
  settlementRule: GameSettlementRule;
  choppingMultiplier: number;
  congEnabled: boolean;
  prohibitEndingWithTwo: boolean;
  allowFourPairsCutAnytime: boolean;
  threeSpadesEndingBonus: boolean;
  cascadeChopEnabled: boolean;
}

import { useUserStore } from '../../stores/useUserStore';
import { t } from '../../locales';

export interface UseQuickSetupProps {
  initialConfig?: Partial<TableConfigState>;
  onStartGame: (config: QuickSetupConfig) => void;
  onClose?: () => void;
}

export interface UseQuickSetupReturn {
  config: TableConfigState;
  setConfig: React.Dispatch<React.SetStateAction<TableConfigState>>;
  depositRequired: number;
  isInsufficientCoins: boolean;
  actualDeposit: number;
  handleConfigChange: (updated: Partial<TableConfigState>) => void;
  handleStart: () => void;
}

/**
 * Custom hook quản lý toàn bộ trạng thái và nghiệp vụ cho Cấu Hình Bàn Chơi Nhanh
 */
export function useQuickSetup({
  initialConfig,
  onStartGame,
  onClose
}: UseQuickSetupProps): UseQuickSetupReturn {
  const { profile } = useUserStore();
  const playerCoins = profile.coins;
  const [config, setConfig] = useState<TableConfigState>({
    playerCount: initialConfig?.playerCount || 4,
    mode: initialConfig?.mode || 'COUNT_CARDS',
    betAmount: initialConfig?.betAmount || ECONOMY_CONSTANTS.DEFAULT_QUICK_BET,
    choppingMultiplier: initialConfig?.choppingMultiplier ?? 1,
    congEnabled: initialConfig?.congEnabled ?? true,
    prohibitEndingWithTwo: initialConfig?.prohibitEndingWithTwo ?? true,
    allowFourPairsCutAnytime: initialConfig?.allowFourPairsCutAnytime ?? true,
    threeSpadesEndingBonus: initialConfig?.threeSpadesEndingBonus ?? true,
    cascadeChopEnabled: initialConfig?.cascadeChopEnabled ?? true,
    instantWinEnabled: initialConfig?.instantWinEnabled ?? true
  });

  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({
        ...prev,
        playerCount: initialConfig.playerCount ?? prev.playerCount,
        mode: initialConfig.mode ?? prev.mode,
        betAmount: initialConfig.betAmount ?? prev.betAmount,
        choppingMultiplier: initialConfig.choppingMultiplier ?? prev.choppingMultiplier,
        congEnabled: initialConfig.congEnabled ?? prev.congEnabled,
        prohibitEndingWithTwo: initialConfig.prohibitEndingWithTwo ?? prev.prohibitEndingWithTwo,
        allowFourPairsCutAnytime: initialConfig.allowFourPairsCutAnytime ?? prev.allowFourPairsCutAnytime,
        threeSpadesEndingBonus: initialConfig.threeSpadesEndingBonus ?? prev.threeSpadesEndingBonus,
        cascadeChopEnabled: initialConfig.cascadeChopEnabled ?? prev.cascadeChopEnabled,
        instantWinEnabled: initialConfig.instantWinEnabled ?? prev.instantWinEnabled
      }));
    }
  }, [initialConfig]);

  const currentMultiplier = config.choppingMultiplier || 1;
  const depositRequired = calculateRequiredDeposit(config.betAmount, currentMultiplier);
  const isInsufficientCoins = playerCoins < config.betAmount;
  const actualDeposit = Math.min(playerCoins, depositRequired);

  const handleConfigChange = useCallback((updated: Partial<TableConfigState>) => {
    setConfig(prev => ({ ...prev, ...updated }));
  }, []);

  const handleStart = useCallback(() => {
    if (isInsufficientCoins) {
      alert(t('tableConfig.insufficientCoinsAlert', {
        coins: playerCoins.toLocaleString(),
        bet: config.betAmount.toLocaleString()
      }));
      return;
    }

    onStartGame({
      playerCount: config.playerCount,
      betAmount: Math.max(10, config.betAmount),
      settlementRule: config.mode === 'CUSTOM' ? 'COUNT_CARDS' : config.mode,
      choppingMultiplier: config.choppingMultiplier ?? 1,
      congEnabled: config.congEnabled ?? true,
      prohibitEndingWithTwo: config.prohibitEndingWithTwo ?? true,
      allowFourPairsCutAnytime: config.allowFourPairsCutAnytime ?? true,
      threeSpadesEndingBonus: config.threeSpadesEndingBonus ?? true,
      cascadeChopEnabled: config.cascadeChopEnabled ?? true
    });
    onClose?.();
  }, [config, isInsufficientCoins, onClose, onStartGame, playerCoins]);

  return {
    config,
    setConfig,
    depositRequired,
    isInsufficientCoins,
    actualDeposit,
    handleConfigChange,
    handleStart
  };
}
