import { useCallback } from 'react';
import { Card } from '../../engine/types';
import { useGameStore } from '../../stores/useGameStore';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';

/**
 * Hook quản lý áp dụng gợi ý nước đi tối ưu của Quân Sư AI
 */
export function useMatchAIHints(onPassTurn?: () => void) {
  const { currentHint, setSelectedCardIds } = useGameStore();

  const handleApplyAiHint = useCallback(() => {
    if (!currentHint || currentHint.action === 'PASS') {
      if (onPassTurn) {
        onPassTurn();
      } else {
        appFlowCoordinator.passTurn();
      }
      return;
    }
    if (currentHint.cards) {
      const ids = new Set<string>(currentHint.cards.map((c: Card) => c.id));
      setSelectedCardIds(ids);
    }
  }, [currentHint, onPassTurn, setSelectedCardIds]);

  return {
    currentHint,
    handleApplyAiHint
  };
}
