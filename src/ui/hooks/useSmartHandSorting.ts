import { useCallback } from 'react';
import { sortCards } from '../../engine/card';
import { sortCardsSmart, getAvailableSmartVariants } from '../../engine/hand-sorter';
import { soundManager } from '../audio/sound-manager';
import { useGameStore } from '../../stores/useGameStore';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';
import type { Card } from '../../engine/types';

/**
 * Hook quản lý thuật toán xếp bài thông minh & xoay vòng các phương án bộ bài
 */
export function useSmartHandSorting() {
  const {
    handSortMode,
    smartVariantIndex,
    players,
    myPlayerId,
    setHandSortMode,
    setSmartVariantIndex,
    setPlayers
  } = useGameStore();

  const handleAutoSort = useCallback(() => {
    const localPlayer = players.find(p => p.id === myPlayerId) || players[0];
    if (!localPlayer || localPlayer.hand.length === 0) return;

    const variants = getAvailableSmartVariants(localPlayer.hand);
    let nextSortedHand: Card[];

    if (handSortMode === 'NATURAL') {
      // Chuyển từ Điểm sang Bộ Phương Án 1 (index 0)
      setHandSortMode('SMART_GROUP');
      setSmartVariantIndex(0);
      nextSortedHand = sortCardsSmart(localPlayer.hand, 0);
    } else {
      // Đang ở SMART_GROUP
      if (smartVariantIndex < variants.length - 1) {
        // Còn phương án bộ tiếp theo
        const nextIdx = smartVariantIndex + 1;
        setSmartVariantIndex(nextIdx);
        nextSortedHand = sortCardsSmart(localPlayer.hand, nextIdx);
      } else {
        // Đã ở phương án bộ cuối -> Quay về Xếp Điểm (NATURAL)
        setHandSortMode('NATURAL');
        setSmartVariantIndex(0);
        nextSortedHand = sortCards(localPlayer.hand);
      }
    }

    // Cập nhật bất biến vào useGameStore
    const updatedPlayers = players.map(p => {
      if (p.id === localPlayer.id) {
        return {
          ...p,
          hand: nextSortedHand
        };
      }
      return p;
    });
    setPlayers(updatedPlayers);

    // Đồng bộ an toàn vào Engine thông qua cổng Coordinator chuẩn mực
    appFlowCoordinator.reorderPlayerHand(localPlayer.id, nextSortedHand);

    soundManager.playCardDeal();
  }, [handSortMode, smartVariantIndex, players, myPlayerId, setHandSortMode, setSmartVariantIndex, setPlayers]);

  return {
    handleAutoSort
  };
}
