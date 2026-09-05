import { useCallback } from 'react';
import { useSmartHandSorting } from './useSmartHandSorting';
import { useGameStore, type CampaignResultMeta } from '../../stores/useGameStore';
import { useMatchAIHints } from './useMatchAIHints';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';
import { getActiveMatchSession } from '../../engine/storage';
import { useViewStore } from '../../stores/useViewStore';
import { ECONOMY_CONSTANTS } from '../../engine/constants/economy';

export type { CampaignResultMeta };

/**
 * useGameMatchLoop (Adapter Hook)
 * Cầu nối tinh gọn kết nối UI với AppFlowCoordinator và OfflineMatchDriver
 */
export function useGameMatchLoop() {
  const { campaignResultMeta } = useGameStore();

  // Hook Xếp bài thông minh & Gợi ý AI
  const { handleAutoSort } = useSmartHandSorting();
  const { handleApplyAiHint } = useMatchAIHints();

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

  const handleReturnToLobby = useCallback(() => {
    appFlowCoordinator.returnToLobby();
  }, []);

  /**
   * Xử lý yêu cầu thoát bàn chơi khi đang trong game (Bấm nút Home / Thoát trận):
   * Nếu ván đấu đang diễn ra, bắt buộc hiển thị modal CONFIRM_FORFEIT cảnh báo mất cọc và điểm Elo.
   */
  const handleRequestExitTable = useCallback(() => {
    const session = getActiveMatchSession();
    const gameStore = useGameStore.getState();
    const isPlaying = gameStore.matchState.status === 'PLAYING' || gameStore.matchState.status === 'DEALING';

    if (isPlaying || session) {
      const depositAmount = session?.depositAmount ?? gameStore.gameSettings.betAmount;
      const isRanked = session?.isRanked ?? (gameStore.activeGameType === 'QUICK');
      const eloPenalty = isRanked ? ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY : 0;

      useViewStore.getState().openModal({
        type: 'CONFIRM_FORFEIT',
        data: {
          depositAmount,
          isRanked,
          eloPenalty
        }
      });
      return;
    }

    appFlowCoordinator.returnToLobby();
  }, []);

  return {
    campaignResultMeta,
    handleNextGame,
    handlePlaySelectedCards,
    handlePassTurn,
    handleAutoSort,
    handleApplyAiHint,
    handleDealCard,
    handleDealComplete,
    handleForfeitMatch,
    handleReturnToLobby,
    handleRequestExitTable
  };
}
