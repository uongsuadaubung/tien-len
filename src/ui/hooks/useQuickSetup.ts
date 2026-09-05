import { useState, useCallback, useEffect } from 'react';
import { GameSettlementRule } from '../../engine/types';
import { ECONOMY_CONSTANTS, calculateRequiredDeposit } from '../../engine/constants/economy';
import { TableConfigState } from '../components/TableRulesConfigPanel';

export interface QuickSetupConfig {
  playerCount: 2 | 3 | 4;
  betAmount: number;
  settlementRule: GameSettlementRule;
  choppingMultiplier: number;
  congMultiplier: number;
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
 * Hàm biên giới (boundary resolver): phân giải cấu hình bàn chơi nhanh, đảm bảo 100% thuộc tính hợp lệ và non-null
 */
export function resolveQuickSetupConfig(
  partial: Partial<TableConfigState> | null | undefined
): TableConfigState {
  return {
    playerCount: partial?.playerCount ?? 4,
    mode: partial?.mode ?? 'COUNT_CARDS',
    betAmount: partial?.betAmount ?? ECONOMY_CONSTANTS.DEFAULT_QUICK_BET,
    choppingMultiplier: partial?.choppingMultiplier ?? 1,
    congMultiplier: partial?.congMultiplier ?? 1,
    congEnabled: partial?.congEnabled ?? true,
    prohibitEndingWithTwo: partial?.prohibitEndingWithTwo ?? true,
    allowFourPairsCutAnytime: partial?.allowFourPairsCutAnytime ?? true,
    threeSpadesEndingBonus: partial?.threeSpadesEndingBonus ?? true,
    cascadeChopEnabled: partial?.cascadeChopEnabled ?? true,
    instantWinEnabled: partial?.instantWinEnabled ?? true
  };
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
  const [config, setConfig] = useState<TableConfigState>(() =>
    resolveQuickSetupConfig(initialConfig)
  );

  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({
        ...prev,
        ...resolveQuickSetupConfig({ ...prev, ...initialConfig })
      }));
    }
  }, [initialConfig]);

  const depositRequired = calculateRequiredDeposit(
    config.betAmount,
    config.congMultiplier ?? 1,
    config.congEnabled ?? true
  );
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
      choppingMultiplier: config.choppingMultiplier,
      congMultiplier: config.congMultiplier,
      congEnabled: config.congEnabled,
      prohibitEndingWithTwo: config.prohibitEndingWithTwo,
      allowFourPairsCutAnytime: config.allowFourPairsCutAnytime,
      threeSpadesEndingBonus: config.threeSpadesEndingBonus,
      cascadeChopEnabled: config.cascadeChopEnabled
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
