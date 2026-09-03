import { useEffect, useCallback } from 'react';
import { useSmartHandSorting } from './useSmartHandSorting';
import { useMatchSettlement, CampaignResultMeta } from './useMatchSettlement';
import { useMatchAIHints } from './useMatchAIHints';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';
import type { MatchSetupContext } from '../../engine/strategies/game-mode-strategy';

export type { CampaignResultMeta };

/**
 * useGameMatchLoop (Adapter Hook)
 * Cầu nối tinh gọn kết nối UI với AppFlowCoordinator và OfflineMatchDriver
 */
export function useGameMatchLoop() {
  // Settlement Hook
  const { campaignResultMeta, handleGameCompletion } = useMatchSettlement();

  // Đăng ký nhận sự kiện hoàn thành ván đấu từ Driver
  useEffect(() => {
    appFlowCoordinator.setMatchCompleteHandler((result) => {
      handleGameCompletion(result.engine);
    });
    return () => {
      appFlowCoordinator.setMatchCompleteHandler(null);
    };
  }, [handleGameCompletion]);

  // Hook Xếp bài thông minh & Gợi ý AI
  const { handleAutoSort } = useSmartHandSorting();
  const { handleApplyAiHint } = useMatchAIHints();

  // Ủy quyền khởi tạo trận đấu cho AppFlowCoordinator
  const startNewGame = useCallback((
    nextGameNumber = 1,
    setupContext?: Partial<MatchSetupContext>,
    preserveWinnerId?: string
  ) => {
    appFlowCoordinator.launchOfflineMatch(nextGameNumber, {
      playerCount: setupContext?.playerCount ?? 4,
      customRules: setupContext?.customRules ?? null,
      customSettings: setupContext?.customSettings ?? null,
      customBotPersonaIds: setupContext?.customBotPersonaIds ?? null,
      customBotConfigs: setupContext?.customBotConfigs ?? null,
      campaignChapter: setupContext?.campaignChapter ?? null,
      preserveWinnerId
    });
  }, []);

  const handleNextGame = useCallback(() => {
    appFlowCoordinator.nextGame(
      campaignResultMeta?.isUnlockedNext ? campaignResultMeta.nextChapter : null
    );
  }, [campaignResultMeta]);

  const handlePlaySelectedCards = useCallback(() => {
    return appFlowCoordinator.playSelectedCards();
  }, []);

  const handlePassTurn = useCallback(() => {
    return appFlowCoordinator.passTurn();
  }, []);

  const handleDealCard = useCallback((playerIndex: number, currentCardCount: number) => {
    appFlowCoordinator.dealCardStep(playerIndex, currentCardCount);
  }, []);

  const handleDealComplete = useCallback(() => {
    appFlowCoordinator.finishDealing();
  }, []);

  const handleForfeitMatch = useCallback(() => {
    appFlowCoordinator.forfeitMatch();
  }, []);

  const handleRequestReturnToLobby = useCallback(() => {
    appFlowCoordinator.returnToLobby();
  }, []);

  return {
    campaignResultMeta,
    startNewGame,
    handleNextGame,
    handlePlaySelectedCards,
    handlePassTurn,
    handleAutoSort,
    handleApplyAiHint,
    handleDealCard,
    handleDealComplete,
    handleForfeitMatch,
    handleRequestReturnToLobby
  };
}
