import React from 'react';
import { Player } from '../../engine/types';
import { HandSortMode } from '../../stores/useGameStore';
import { useUserStore } from '../../stores/useUserStore';
import { getAvailableSmartVariants } from '../../engine/hand-sorter';
import { resolveHandSortStrategy } from '../../engine/strategies/hand-sort-strategy';
import { useI18n } from '../../locales';
import { CardView } from './CardView';
import { Play, SkipForward, ArrowUpDown, ArrowDownToLine, Layers, Crosshair } from 'lucide-react';

interface HandCardStyle extends React.CSSProperties {
  '--rot-deg'?: string;
}

interface PlayerHandViewProps {
  player: Player;
  selectedCardIds: Set<string>;
  onToggleCardSelect: (cardId: string) => void;
  onClearCardSelection: (() => void) | null;
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
  onAutoSort: () => void;
  onQuickSelect: (() => void) | null;
  canQuickSelect: boolean;
  quickSelectCandidatesCount: number;
  isCurrentTurn: boolean;
  canPlay: boolean;
  canPass: boolean;
  isLeader: boolean;
  isDealing: boolean;
  dealtCardsCount: number | null;
  isFirstMoveOfGame: boolean;
  sortMode: HandSortMode;
  variantIndex: number;
  cardSize: 'sm' | 'md' | 'lg' | 'mobile' | null;
}

export const PlayerHandView: React.FC<PlayerHandViewProps> = ({
  player,
  selectedCardIds,
  onToggleCardSelect,
  onClearCardSelection,
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onQuickSelect,
  canQuickSelect = true,
  quickSelectCandidatesCount = 0,
  isCurrentTurn,
  canPlay,
  canPass,
  isLeader,
  isDealing = false,
  dealtCardsCount,
  isFirstMoveOfGame = false,
  sortMode = 'NATURAL',
  variantIndex = 0,
  cardSize = 'md'
}) => {
  const { t } = useI18n();

  const isMobileSize = cardSize === 'mobile';
  const visibleCardCount = isDealing ? (dealtCardsCount ?? 0) : player.hand.length;
  const hand = player.hand.slice(0, visibleCardCount);
  const has3S = hand.some(c => c.rank === 3 && c.suit === 'SPADES');
  const isSelectedWith3S = Array.from(selectedCardIds).some(id => {
    const c = hand.find(card => card.id === id);
    return c && c.rank === 3 && c.suit === 'SPADES';
  });

  const isSmartMode = sortMode === 'SMART_GROUP';
  const availableVariants = React.useMemo(() => {
    return getAvailableSmartVariants(hand);
  }, [hand]);

  const totalVariants = availableVariants.length;
  const smartGroups = React.useMemo(() => {
    if (!isSmartMode || availableVariants.length === 0) return [];
    const safeIdx = Math.max(0, Math.min(variantIndex, availableVariants.length - 1));
    return availableVariants[safeIdx];
  }, [isSmartMode, variantIndex, availableVariants]);

  // Áp dụng Strategy Pattern để sắp xếp danh sách lá bài hiển thị
  const sortedHand = React.useMemo(() => {
    const strategy = resolveHandSortStrategy(sortMode);
    return strategy.sort(hand);
  }, [hand, sortMode]);

  const currentStrategy = resolveHandSortStrategy(sortMode);
  // Xác định nhãn và tooltip của nút Xếp Bài khi xoay vòng:
  // Nếu có nhiều phương án xếp bộ (totalVariants > 1), hiển thị "Bộ 1", "Bộ 2", "Bộ 3",...
  // Nếu chỉ có 1 phương án xếp bộ, hiển thị "Xếp Bộ"
  let sortButtonLabel: string;
  let sortButtonTitle: string;

  if (isSmartMode) {
    if (totalVariants > 1) {
      sortButtonLabel = t('sort.comboVariant', { index: variantIndex + 1 });
      sortButtonTitle = t('sort.comboVariantTitle', { index: variantIndex + 1, total: totalVariants });
    } else {
      sortButtonLabel = t('sort.smartGroupLabel');
      sortButtonTitle = t('sort.smartGroupDesc');
    }
  } else {
    sortButtonLabel = currentStrategy.label;
    sortButtonTitle = currentStrategy.description;
  }

  const hasSelectedCards = selectedCardIds.size > 0;

  return (
    <div id={`seat-${player.id}`} className="relative flex flex-col items-center justify-end w-full pb-0.5 z-30 select-none overflow-visible">
      {/* Thông báo hướng dẫn nước đi đầu tiên ván 1 */}
      {!isDealing && isCurrentTurn && isFirstMoveOfGame && has3S && (
        <div className="mb-1 animate-fade-in">
          {selectedCardIds.size > 0 && !isSelectedWith3S ? (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-950 border border-red-500/70 text-red-300 text-[10px] sm:text-[11px] font-bold shadow-xl">
              <span>⚠️</span>
              <span>{t('game.firstMoveWarning')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0c3327] border border-[#d4af37]/70 text-[#f3e5ab] text-[10px] sm:text-[11px] font-bold shadow-xl">
              <span>♠</span>
              <span>{t('game.firstMoveInstruction')}</span>
            </div>
          )}
        </div>
      )}

      {/* Bảng nút điều khiển hành động (Action Controls) - Z-Index 40, Tự động trượt lên khi chọn bài */}
      {!isDealing && (isCurrentTurn || hasSelectedCards) && (
        <div
          className={`flex items-center justify-center gap-1.5 sm:gap-2 mb-1 z-40 transition-transform duration-200 ${
            hasSelectedCards ? '-translate-y-3.5 sm:-translate-y-4' : 'translate-y-0'
          }`}
        >
          {/* Nhóm nút thao tác chính (Đánh bài, Bắt bài, Hạ bài, Xếp bài) */}
          <div className={`flex items-center ${isMobileSize ? 'gap-1 px-1.5 py-0.5 rounded-xl border border-amber-500/50' : 'gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl border-2 border-amber-500/60'} bg-[#0d1322] shadow-xl`}>
            {/* Các nút hành động khi đến lượt đi */}
            {isCurrentTurn && (
              <>
                {/* Nút Đánh Bài */}
                <button
                  onClick={onPlaySelectedCards}
                  disabled={!canPlay}
                  className={`
                    flex items-center gap-1 ${isMobileSize ? 'px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px]' : 'px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm'} font-black uppercase tracking-wider transition-all duration-150 shadow-md
                    ${canPlay
                      ? 'bg-gradient-to-r from-[#f0cb64] via-[#d4af37] to-[#b08c23] hover:brightness-110 text-black hover:scale-105 shadow-[#d4af37]/40 cursor-pointer border border-amber-200'
                      : 'bg-[#182030] text-slate-500 cursor-not-allowed border border-white/5'
                    }
                  `}
                >
                  <Play className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} fill-current`} />
                  <span>{t('game.playCard')}</span>
                </button>

                {/* Nút Bắt Bài (Tự động chọn nhanh tổ hợp vừa khít để đè bài trên bàn) */}
                {onQuickSelect && (
                  <button
                    onClick={onQuickSelect}
                    disabled={!canQuickSelect}
                    className={`
                      flex items-center gap-1 ${isMobileSize ? 'px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs'} font-bold transition-all duration-150 shadow
                      ${canQuickSelect
                        ? 'bg-[#2e1808] hover:bg-[#40220a] text-amber-300 border border-amber-500/60 hover:border-amber-400 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-[#182030] text-slate-500 cursor-not-allowed border border-white/5 opacity-50'
                      }
                    `}
                    title={
                      canQuickSelect
                        ? `${t('game.quickSelectTooltipReady', { action: isLeader ? t('game.quickSelectActionLead') : t('game.quickSelectActionBeat') })}${quickSelectCandidatesCount > 1 ? ` (${quickSelectCandidatesCount})` : ''}`
                        : t('game.quickSelectTooltipEmpty')
                    }
                  >
                    <Crosshair className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-amber-300`} />
                    <span>{t('game.quickSelect')}</span>
                  </button>
                )}
              </>
            )}

            {/* Nút Hạ Bài (Xuất hiện khi có bài đang chọn) */}
            {hasSelectedCards && onClearCardSelection && (
              <button
                onClick={onClearCardSelection}
                className={`flex items-center gap-1 ${isMobileSize ? 'px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs'} bg-[#1c2438] hover:bg-[#283450] text-[#f3e5ab] border border-amber-400/40 hover:scale-105 cursor-pointer font-bold shadow transition-all duration-150`}
                title={t('game.clearSelectionTooltip')}
              >
                <ArrowDownToLine className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-[#d4af37]`} />
                <span>{t('game.clearSelection')} {selectedCardIds.size > 1 ? `(${selectedCardIds.size})` : ''}</span>
              </button>
            )}

            {/* Nút Xếp Bài: Xoay vòng đa phương án Xếp Bộ và Xếp Điểm */}
            <button
              onClick={onAutoSort}
              className={`flex items-center gap-1 ${isMobileSize ? 'px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs'} bg-[#1c2438] hover:bg-[#283450] text-slate-300 border border-white/10 hover:scale-105 cursor-pointer font-bold transition-all duration-150`}
              title={sortButtonTitle}
            >
              {sortMode === 'NATURAL' ? (
                <>
                  <ArrowUpDown className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-[#d4af37]`} />
                  <span>{sortButtonLabel}</span>
                </>
              ) : (
                <>
                  <Layers className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-[#d4af37]`} />
                  <span>{sortButtonLabel}</span>
                </>
              )}
            </button>
          </div>

          {/* Nhóm nút Bỏ lượt riêng biệt - Nền đặc đỏ thẫm */}
          {isCurrentTurn && (
            <div className={`bg-[#0d1322] ${isMobileSize ? 'px-1 py-0.5 rounded-xl border border-red-500/50' : 'px-1.5 py-1 sm:py-1.5 rounded-2xl border-2 border-red-500/50'} shadow-2xl flex items-center`}>
              <button
                onClick={onPassTurn}
                disabled={!canPass}
                className={`
                  flex items-center gap-1 ${isMobileSize ? 'px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs'} font-bold transition-all duration-150
                  ${canPass
                    ? 'bg-[#3b1219] hover:bg-[#521822] text-red-200 hover:text-white border border-red-500/70 hover:border-red-400 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    : 'bg-[#182030]/60 text-slate-600 cursor-not-allowed border border-white/5 opacity-50'
                  }
                `}
                title={canPass ? t('game.passTurn') : ''}
              >
                <SkipForward className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-red-400`} />
                <span>{t('game.passTurn')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dãy bài trên tay người chơi (Giữ nguyên z-index tự nhiên từ trái sang phải: 10 + index, Tự động scale vừa khít màn hình khi xếp nhiều bộ) */}
      {isSmartMode && smartGroups.length > 0 ? (
        <div className="w-full max-w-full flex items-end justify-center px-1 overflow-visible">
          <div 
            className={`
              relative flex items-center justify-center max-w-full transition-transform duration-200
              ${isMobileSize
                ? smartGroups.length >= 7
                  ? 'gap-1 scale-[0.82] sm:scale-[0.88] origin-bottom'
                  : smartGroups.length === 6
                    ? 'gap-1 sm:gap-1.5 scale-[0.88] sm:scale-[0.93] origin-bottom'
                    : smartGroups.length === 5
                      ? 'gap-1.5 sm:gap-2 scale-[0.94] sm:scale-100 origin-bottom'
                      : 'gap-2 sm:gap-3 scale-100 origin-bottom'
                : 'gap-3 sm:gap-5 scale-100 origin-bottom'
              }
            `}
          >
            {smartGroups.map((group, groupIdx) => (
              <div 
                key={group.id} 
                className={`
                  relative flex items-center shrink-0
                  ${isMobileSize 
                    ? smartGroups.length >= 5 
                      ? '-space-x-7 sm:-space-x-7.5' 
                      : '-space-x-6.5 sm:-space-x-7' 
                    : '-space-x-8'
                  }
                `}
              >
                {group.cards.map((card, cardIndex) => {
                  const isSelected = selectedCardIds.has(card.id);
                  const isKey3S = isFirstMoveOfGame && isCurrentTurn && card.rank === 3 && card.suit === 'SPADES';
                  const rot = (cardIndex - (group.cards.length - 1) / 2) * 2;
                  const cardStyle: HandCardStyle = {
                    zIndex: 10 + cardIndex,
                    '--rot-deg': `${rot}deg`,
                    animationDelay: `${groupIdx * 40 + cardIndex * 20}ms`
                  };
                  return (
                    <div
                      key={card.id}
                      className={`zingplay-card-fan relative ${isKey3S && !isSelected ? 'ring-2 ring-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.8)] rounded-lg' : ''}`}
                      style={cardStyle}
                    >
                      <CardView
                        card={card}
                        isSelected={isSelected}
                        isPlayable={isCurrentTurn}
                        onClick={() => onToggleCardSelect(card.id)}
                        size={isMobileSize ? 'mobile' : 'md'}
                        style={{
                          transform: `rotate(${rot}deg)`
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`relative flex items-center justify-center ${isMobileSize ? '-space-x-6 sm:-space-x-6.5' : '-space-x-8'} max-w-full overflow-x-visible px-2 py-0.5`}>
          {sortedHand.map((card, index) => {
            const isSelected = selectedCardIds.has(card.id);
            const isKey3S = isFirstMoveOfGame && isCurrentTurn && card.rank === 3 && card.suit === 'SPADES';
            const rot = (index - (hand.length - 1) / 2) * 2;
            const cardStyle: HandCardStyle = {
              zIndex: 10 + index,
              '--rot-deg': `${rot}deg`,
              animationDelay: `${index * 25}ms`
            };
            return (
              <div
                key={card.id}
                className={`zingplay-card-fan relative ${isKey3S && !isSelected ? 'ring-2 ring-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.8)] rounded-lg' : ''}`}
                style={cardStyle}
              >
                <CardView
                  card={card}
                  isSelected={isSelected}
                  isPlayable={isCurrentTurn}
                  onClick={() => onToggleCardSelect(card.id)}
                  size={isMobileSize ? 'mobile' : 'md'}
                  style={{
                    transform: `rotate(${rot}deg)`
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Thông tin người chơi (Bản thân) - Hiển thị Avatar & Tên Vàng Sang Trọng */}
      {(() => {
        const userProfile = useUserStore.getState().profile;
        const playerAvatar = player.avatar || userProfile?.avatar || '🤠';

        return (
          <div className={`flex items-center gap-2 ${isMobileSize ? 'mt-0.5 px-2.5 py-0.5 rounded-full border border-[#d4af37]/60 text-xs' : 'mt-1 px-4 py-1 rounded-full border-2 border-[#d4af37]/60'} bg-[#121826]/95 backdrop-blur-sm shadow-xl`}>
            {/* Avatar Vòng Tròn To Rõ Rệt */}
            <div className={`${isMobileSize ? 'w-6 h-6 sm:w-7 sm:h-7 text-sm sm:text-base' : 'w-8 h-8 sm:w-9 sm:h-9 text-lg sm:text-xl'} rounded-full bg-[#182030] border-2 border-[#d4af37] flex items-center justify-center leading-none shadow-md shrink-0`}>
              <span className="emoji-avatar">{playerAvatar}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`font-black text-[#f3e5ab] ${isMobileSize ? 'text-[11px] sm:text-xs' : 'text-sm'} truncate max-w-[90px] sm:max-w-[120px]`}>
                {player.name}
              </span>
              <span className={`${isMobileSize ? 'text-[10px] sm:text-[11px]' : 'text-xs'} text-[var(--color-gold)] font-mono font-bold shrink-0`}>
                {player.score.toLocaleString()} 🪙
              </span>
              {isLeader && (
                <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[8px] font-black px-1.5 py-0.2 rounded-full shadow shrink-0">
                  {t('bot.leader')}
                </span>
              )}
              {player.isPassedCurrentRound && (
                <span className="bg-rose-950 text-rose-300 text-[8px] font-bold px-1.5 py-0.2 rounded-full border border-rose-500/60 shrink-0">
                  {t('bot.passed')}
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
