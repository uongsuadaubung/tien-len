import { useMemo } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { normalizePlayerCount } from '../../engine/types';
import type { TableConfigState } from '../components/TableRulesConfigPanel';
import type { CustomGameModalConfig } from './useCustomGame';

export interface GameSetupConfigs {
  quickSetupInitialConfig: Partial<TableConfigState>;
  customGameInitialConfig: CustomGameModalConfig;
}

/**
 * Hàm thuần túy (Pure Resolver) tính toán cấu hình khởi tạo cho bàn đấu
 */
export function computeGameSetupConfigs(params: {
  gameSettings: ReturnType<typeof useGameStore.getState>['gameSettings'];
  quickTableConfig: ReturnType<typeof useGameStore.getState>['quickTableConfig'];
  playerCount: number;
  botPersonaIds: ReturnType<typeof useGameStore.getState>['botPersonaIds'];
  customBotConfigs: ReturnType<typeof useGameStore.getState>['customBotConfigs'];
}): GameSetupConfigs {
  const { gameSettings, quickTableConfig, playerCount, botPersonaIds, customBotConfigs } = params;

  return {
    quickSetupInitialConfig: {
      playerCount: quickTableConfig.playerCount,
      mode: quickTableConfig.settlementRule,
      betAmount: quickTableConfig.betAmount,
      choppingMultiplier: quickTableConfig.choppingMultiplier,
      congMultiplier: quickTableConfig.congMultiplier,
      congEnabled: quickTableConfig.congEnabled,
      prohibitEndingWithTwo: quickTableConfig.prohibitEndingWithTwo,
      allowFourPairsCutAnytime: quickTableConfig.allowFourPairsCutAnytime,
      threeSpadesEndingBonus: quickTableConfig.threeSpadesEndingBonus,
      cascadeChopEnabled: quickTableConfig.cascadeChopEnabled,
      instantWinEnabled: gameSettings.instantWinEnabled
    },
    customGameInitialConfig: {
      selectedModeId: gameSettings.mode,
      settings: gameSettings,
      playerCount: normalizePlayerCount(playerCount),
      botPersonaIds,
      customBotConfigs,
      choppingMultiplier: quickTableConfig.choppingMultiplier,
      congMultiplier: quickTableConfig.congMultiplier,
      congEnabled: quickTableConfig.congEnabled
    }
  };
}

/**
 * Hook tập trung cung cấp cấu hình khởi tạo cho cả Web Game Modals và Mobile Game Sheets (Single Source of Truth).
 * Giải quyết triệt để phân mảnh code giữa Web và Mobile đối với quickSetupInitialConfig và customGameInitialConfig.
 */
export function useGameSetupConfigs(): GameSetupConfigs {
  const {
    gameSettings,
    quickTableConfig,
    playerCount,
    botPersonaIds,
    customBotConfigs
  } = useGameStore();

  return useMemo(
    () => computeGameSetupConfigs({
      gameSettings,
      quickTableConfig,
      playerCount,
      botPersonaIds,
      customBotConfigs
    }),
    [
      gameSettings,
      quickTableConfig,
      playerCount,
      botPersonaIds,
      customBotConfigs
    ]
  );
}
