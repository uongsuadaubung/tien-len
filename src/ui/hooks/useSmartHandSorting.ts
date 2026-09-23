import { useCallback } from 'react';
import { sortCards } from '../../engine/card';
import { getAvailableSmartVariants } from '../../engine/hand-sorter';
import { soundManager } from '../audio/sound-manager';
import { useGameStore } from '../../stores/useGameStore';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';
import { updatePlayersHand } from '../../engine/player-factory';
import type { Card } from '../../engine/types';

/**
 * Hook quản lý thuật toán xếp bài thông minh & xoay vòng các phương án bộ bài
 */
export function useSmartHandSorting() {
  const handleAutoSort = useCallback(() => {
    const {
      handSortMode,
      smartVariantIndex,
      players,
      myPlayerId,
      setHandSortMode,
      setSmartVariantIndex,
      setPlayers
    } = useGameStore.getState();

    const localPlayer = players.find(p => p.id === myPlayerId) ?? null;
    if (!localPlayer || localPlayer.hand.length === 0) return;

    const variants = getAvailableSmartVariants(localPlayer.hand);
    let nextSortedHand: Card[];

    if (handSortMode === 'NATURAL') {
      // Chuyển từ Điểm sang Bộ Phương Án 1 (index 0)
      setHandSortMode('SMART_GROUP');
      setSmartVariantIndex(0);
      nextSortedHand = variants[0] && variants[0].length > 0
        ? variants[0].flatMap(g => g.cards)
        : sortCards(localPlayer.hand);
    } else {
      // Đang ở SMART_GROUP
      if (smartVariantIndex < variants.length - 1) {
        // Còn phương án bộ tiếp theo
        const nextIdx = smartVariantIndex + 1;
        setSmartVariantIndex(nextIdx);
        nextSortedHand = variants[nextIdx] && variants[nextIdx].length > 0
          ? variants[nextIdx].flatMap(g => g.cards)
          : sortCards(localPlayer.hand);
      } else {
        // Đã ở phương án bộ cuối -> Quay về Xếp Điểm (NATURAL)
        setHandSortMode('NATURAL');
        setSmartVariantIndex(0);
        nextSortedHand = sortCards(localPlayer.hand);
      }
    }

    // Cập nhật bất biến vào useGameStore bằng single source helper
    const updatedPlayers = updatePlayersHand(players, localPlayer.id, nextSortedHand);
    setPlayers(updatedPlayers);

    // Đồng bộ an toàn vào Engine thông qua cổng Coordinator chuẩn mực
    appFlowCoordinator.reorderPlayerHand(localPlayer.id, nextSortedHand);

    soundManager.playCardDeal();
  }, []);

  return {
    handleAutoSort
  };
}
