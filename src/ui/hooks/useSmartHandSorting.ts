import { useCallback } from 'react';
import { GameEngine } from '../../engine/game';
import { sortCards } from '../../engine/card';
import { sortCardsSmart, getAvailableSmartVariants } from '../../engine/hand-sorter';
import { soundManager } from '../audio/sound-manager';
import { useGameStore } from '../../stores/useGameStore';

/**
 * Hook quản lý thuật toán xếp bài thông minh & xoay vòng các phương án bộ bài
 */
export function useSmartHandSorting(engineRef: React.MutableRefObject<GameEngine | null>) {
  const {
    handSortMode,
    smartVariantIndex,
    setHandSortMode,
    setSmartVariantIndex,
    setPlayers
  } = useGameStore();

  const handleAutoSort = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const p0 = engine.getPlayer('p0');
    if (p0) {
      const variants = getAvailableSmartVariants(p0.hand);

      if (handSortMode === 'NATURAL') {
        // Chuyển từ Điểm sang Bộ Phương Án 1 (index 0)
        setHandSortMode('SMART_GROUP');
        setSmartVariantIndex(0);
        p0.hand = sortCardsSmart(p0.hand, 0);
      } else {
        // Đang ở SMART_GROUP
        if (smartVariantIndex < variants.length - 1) {
          // Còn phương án bộ tiếp theo
          const nextIdx = smartVariantIndex + 1;
          setSmartVariantIndex(nextIdx);
          p0.hand = sortCardsSmart(p0.hand, nextIdx);
        } else {
          // Đã ở phương án bộ cuối -> Quay về Xếp Điểm (NATURAL)
          setHandSortMode('NATURAL');
          setSmartVariantIndex(0);
          p0.hand = sortCards(p0.hand);
        }
      }

      setPlayers([...engine.players]);
      soundManager.playCardDeal();
    }
  }, [engineRef, handSortMode, smartVariantIndex, setHandSortMode, setSmartVariantIndex, setPlayers]);

  return {
    handleAutoSort
  };
}
