import { useState, useCallback } from 'react';
import { GameSettlementRule } from '../../engine/types';
import { calculateRequiredDeposit } from '../../engine/constants/economy';
import { TableConfigState, TableConfigStateSchema } from '../../engine/schemas/settings.schema';

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
 * Hàm biên giới (boundary resolver): phân giải cấu hình bàn chơi nhanh qua Zod Gatekeeper SSOT
 */
export function resolveQuickSetupConfig(
  partial: Partial<TableConfigState> | null | undefined
): TableConfigState {
  const clean = partial
    ? Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined))
    : {};
  return TableConfigStateSchema.parse(clean);
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

  const depositRequired = calculateRequiredDeposit(
    config.betAmount,
    config.congMultiplier,
    config.congEnabled
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
      settlementRule: config.mode,
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
