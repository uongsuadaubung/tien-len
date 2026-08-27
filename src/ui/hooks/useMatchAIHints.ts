import { useCallback } from 'react';
import { GameEngine } from '../../engine/game';
import { CardTracker } from '../../ai/card-tracker';
import { getOptimalMoveHint } from '../../ai/hint-engine';
import { Card } from '../../engine/types';
import { useGameStore } from '../../stores/useGameStore';

/**
 * Hook quản lý gợi ý nước đi tối ưu của Quân Sư AI và áp dụng tự động
 */
export function useMatchAIHints(
  engineRef: React.MutableRefObject<GameEngine | null>,
  trackersRef: React.MutableRefObject<Record<string, CardTracker>>,
  onPassTurn: () => void
) {
  const { currentHint, setCurrentHint, setSelectedCardIds } = useGameStore();

  const updatePlayerAiHint = useCallback((engine: GameEngine) => {
    const p0 = engine.getPlayer('p0');
    if (!p0) return;
    const tracker = trackersRef.current['p0'] || new CardTracker(p0.hand, 1.0);
    const remainingCounts = engine.players.reduce((acc, p) => ({ ...acc, [p.id]: p.hand.length }), {});
    const nextPlayerId = engine.getNextActivePlayerId('p0');
    const nextPlayer = engine.getPlayer(nextPlayerId);
    const isNextPlayerOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;

    const hint = getOptimalMoveHint(
      p0.hand,
      engine.getLeadingMove(),
      engine.isFirstMoveOfGame,
      engine.isRoundLeadMove(),
      tracker,
      remainingCounts,
      nextPlayerId,
      isNextPlayerOneCard,
      engine.rules.gameFlow.prohibitEndingWithTwo
    );
    setCurrentHint(hint);
  }, [setCurrentHint, trackersRef]);

  const handleApplyAiHint = useCallback(() => {
    if (!currentHint || currentHint.action === 'PASS') {
      onPassTurn();
      return;
    }
    if (currentHint.cards) {
      const ids = new Set<string>(currentHint.cards.map((c: Card) => c.id));
      setSelectedCardIds(ids);
    }
  }, [currentHint, onPassTurn, setSelectedCardIds]);

  return {
    currentHint,
    updatePlayerAiHint,
    handleApplyAiHint
  };
}
