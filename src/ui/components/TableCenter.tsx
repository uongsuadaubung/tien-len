import React from 'react';
import { PlayedMove, Combination, CombinationType } from '../../engine/types';
import { CardView } from './CardView';
import { Sparkles } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { useI18n, type I18nKeyPath, type I18nParams } from '../../locales';

import type { ChopNotificationInfo } from '../../engine/state-machine/types';

interface TableCenterProps {
  currentMove: PlayedMove | null;
  isLeadMove?: boolean;
  chopNotification?: ChopNotificationInfo | null;
  isDealing: boolean;
  cardSize?: 'md' | 'table';
  isGameOver?: boolean;
}

const COMBO_I18N_KEY_MAP: Record<CombinationType, I18nKeyPath> = {
  SINGLE: 'combinations.single',
  PAIR: 'combinations.pair',
  TRIPLE: 'combinations.triple',
  STRAIGHT: 'combinations.straight',
  THREE_PAIRS_SEQUENTIAL: 'combinations.threePairs',
  FOUR_OF_A_KIND: 'combinations.fourOfAKind',
  FOUR_PAIRS_SEQUENTIAL: 'combinations.fourPairs',
  FIVE_PAIRS_SEQUENTIAL: 'combinations.threePairs',
  SIX_PAIRS: 'combinations.pair',
  DRAGON_STRAIGHT: 'combinations.straight',
  SAME_COLOR_13: 'combinations.single',
  FOUR_TWOS: 'combinations.fourOfAKind',
  FIRST_ROUND_FOUR_THREES: 'combinations.fourOfAKind'
};

function formatCombinationDisplayName(
  combo: Combination,
  t: (key: I18nKeyPath, params?: I18nParams | null) => string
): string {
  const key = COMBO_I18N_KEY_MAP[combo.type] || 'combinations.single';
  if (combo.type === 'STRAIGHT') {
    return t(key, { length: combo.length });
  }
  return t(key);
}

const TableCenterComponent: React.FC<TableCenterProps> = ({
  currentMove,
  isDealing,
  cardSize = 'md'
}) => {
  const { t } = useI18n();
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const playerIds = useGameStore(useShallow(s => s.players.map(p => p.id)));

  const getSlideAnimationClass = (playerId?: string) => {
    if (!playerId) return 'card-slide-bottom';
    const numPlayers = playerIds.length || 4;
    const myIndex = Math.max(0, playerIds.indexOf(myPlayerId));
    const targetIndex = playerIds.indexOf(playerId);
    
    if (targetIndex === -1 || targetIndex === myIndex) return 'card-slide-bottom';
    
    if (numPlayers === 2) return 'card-slide-top';
    if (numPlayers === 3) {
      const relIdx = (targetIndex - myIndex + 3) % 3;
      return relIdx === 1 ? 'card-slide-left' : 'card-slide-top';
    }
    const relIdx = (targetIndex - myIndex + 4) % 4;
    if (relIdx === 1) return 'card-slide-left';
    if (relIdx === 2) return 'card-slide-top';
    return 'card-slide-right';
  };

  const isMobileSize = cardSize === 'md';
  const scaleClass = isMobileSize ? 'scale-90 sm:scale-100' : 'scale-100 md:scale-110';
  const spacingClass = isMobileSize ? '-space-x-5 sm:-space-x-6' : '-space-x-6 md:-space-x-8';
  const rotFactor = isMobileSize ? 3 : 4;

  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none select-none z-10 w-full min-h-[140px]">
      {/* Hiển thị bài vừa đánh */}
      {!isDealing && currentMove && currentMove.combination.cards.length > 0 ? (() => {
        const moveKey = `${currentMove.playerId}-${currentMove.combination.cards.map(c => c.id).join('_')}`;
        return (
          <div className={`flex flex-col items-center justify-center pointer-events-auto overflow-visible ${scaleClass}`}>
            <div
              key={moveKey}
              className={`flex items-center justify-center ${spacingClass} overflow-visible ${getSlideAnimationClass(currentMove.playerId)}`}
            >
              {currentMove.combination.cards.map((card, idx) => (
                <CardView
                  key={card.id}
                  card={card}
                  disabled
                  size="table"
                  style={{
                    transform: `rotate(${(idx - (currentMove.combination.cards.length - 1) / 2) * rotFactor}deg)`,
                    zIndex: 30 + idx
                  }}
                />
              ))}
            </div>
            <div
              key={`badge-${moveKey}`}
              className={`mt-1.5 bg-[#0e1422] px-2.5 py-0.5 rounded-full border border-amber-400/60 text-amber-300 ${isMobileSize ? 'text-[10px]' : 'text-xs'} font-bold flex items-center gap-1.5 shadow-xl animate-fade-in`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{formatCombinationDisplayName(currentMove.combination, t)}</span>
            </div>
          </div>
        );
      })() : (
        <div id="table-center-anchor" className="w-[68px] h-[98px] flex items-center justify-center pointer-events-none" />
      )}
    </div>
  );
};

export const TableCenter = React.memo(TableCenterComponent);
