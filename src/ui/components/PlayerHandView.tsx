import React from 'react';
import { Player } from '../../engine/types';
import { HandSortMode } from '../../stores/useGameStore';
import { getAvailableSmartVariants } from '../../engine/hand-sorter';
import { CardView } from './CardView';
import { Play, SkipForward, ArrowUpDown, ArrowDownToLine, Layers, Crosshair } from 'lucide-react';

interface HandCardStyle extends React.CSSProperties {
  '--rot-deg'?: string;
}

interface PlayerHandViewProps {
  player: Player | null;
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
  cardSize?: 'md' | 'mobile';
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
  if (!player) return null;

  const isMobileSize = cardSize === 'mobile';
  const visibleCardCount = isDealing && dealtCardsCount !== null && dealtCardsCount !== undefined ? dealtCardsCount : (player.hand?.length || 0);
  const hand = (player.hand || []).slice(0, visibleCardCount);
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

  // Xác định nhãn và icon của nút Xếp Bài khi xoay vòng
  let sortButtonLabel = 'Xếp Bộ';
  let sortButtonTitle = 'Tự động gom nhóm thông minh theo Sảnh, Đôi, Tứ Quý, Rác';
  let isNextSortNatural = false;

  if (totalVariants > 1) {
    if (!isSmartMode) {
      sortButtonLabel = 'Xếp Bộ 1';
      sortButtonTitle = `Chuyển sang phương án xếp bộ 1 (trong ${totalVariants} cách)`;
    } else if (variantIndex < totalVariants - 1) {
      sortButtonLabel = `Xếp Bộ ${variantIndex + 2}`;
      sortButtonTitle = `Chuyển sang phương án xếp bộ ${variantIndex + 2} (trong ${totalVariants} cách)`;
    } else {
      sortButtonLabel = 'Xếp Điểm';
      sortButtonTitle = 'Chuyển về xếp theo điểm từ bé đến lớn (3 -> 2)';
      isNextSortNatural = true;
    }
  } else {
    if (isSmartMode) {
      sortButtonLabel = 'Xếp Điểm';
      sortButtonTitle = 'Chuyển về xếp theo điểm từ bé đến lớn (3 -> 2)';
      isNextSortNatural = true;
    } else {
      sortButtonLabel = 'Xếp Bộ';
      sortButtonTitle = 'Tự động gom nhóm thông minh theo Sảnh, Đôi, Tứ Quý, Rác';
    }
  }

  const hasSelectedCards = selectedCardIds.size > 0;

  return (
    <div id="seat-p0" className="relative flex flex-col items-center justify-end w-full pb-0.5 z-30 select-none overflow-visible">
      {/* Thông báo hướng dẫn nước đi đầu tiên ván 1 */}
      {!isDealing && isCurrentTurn && isFirstMoveOfGame && has3S && (
        <div className="mb-1 animate-fade-in">
          {selectedCardIds.size > 0 && !isSelectedWith3S ? (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-950 border border-red-500/70 text-red-300 text-[10px] sm:text-[11px] font-bold shadow-xl">
              <span>⚠️</span>
              <span>Ván đầu tiên: Bắt buộc chọn tổ hợp có chứa lá 3 Bích ♠</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0c3327] border border-[#d4af37]/70 text-[#f3e5ab] text-[10px] sm:text-[11px] font-bold shadow-xl">
              <span>♠</span>
              <span>Bạn giữ 3 Bích và đi trước mở màn ván đấu!</span>
            </div>
          )}
        </div>
      )}

      {/* Bảng nút điều khiển hành động (Action Controls) - Z-Index 40, Tự động trượt lên khi chọn bài */}
      {!isDealing && (isCurrentTurn || hasSelectedCards) && (
        <div
          className={`flex items-center justify-center gap-2 sm:gap-3 mb-1 z-40 transition-transform duration-200 ${
            hasSelectedCards ? '-translate-y-5 sm:-translate-y-6' : 'translate-y-0'
          }`}
        >
          {/* Nhóm nút thao tác chính (Đánh bài, Bắt bài, Hạ bài, Xếp bài) */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0d1322] px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl border-2 border-amber-500/60 shadow-2xl">
            {/* Các nút hành động khi đến lượt đi */}
            {isCurrentTurn && (
              <>
                {/* Nút Đánh Bài */}
                <button
                  onClick={onPlaySelectedCards}
                  disabled={!canPlay}
                  className={`
                    flex items-center gap-1.5 px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 shadow-md
                    ${canPlay
                      ? 'bg-gradient-to-r from-[#f0cb64] via-[#d4af37] to-[#b08c23] hover:brightness-110 text-black hover:scale-105 shadow-[#d4af37]/40 cursor-pointer border border-amber-200'
                      : 'bg-[#182030] text-slate-500 cursor-not-allowed border border-white/5'
                    }
                  `}
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  <span>Đánh Bài</span>
                </button>

                {/* Nút Bắt Bài (Tự động chọn nhanh tổ hợp vừa khít để đè bài trên bàn) */}
                {onQuickSelect && (
                  <button
                    onClick={onQuickSelect}
                    disabled={!canQuickSelect}
                    className={`
                      flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold text-xs transition-all duration-150 shadow
                      ${canQuickSelect
                        ? 'bg-[#2e1808] hover:bg-[#40220a] text-amber-300 border border-amber-500/60 hover:border-amber-400 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-[#182030] text-slate-500 cursor-not-allowed border border-white/5 opacity-50'
                      }
                    `}
                    title={
                      canQuickSelect
                        ? `Tự động chọn bài để ${isLeader ? 'ra trước' : 'chặn bài'}${quickSelectCandidatesCount > 1 ? ` (${quickSelectCandidatesCount} lựa chọn, nhấn tiếp để đổi)` : ''}`
                        : 'Không có bài chặn được'
                    }
                  >
                    <Crosshair className="w-3.5 h-3.5 text-amber-300" />
                    <span>Bắt Bài</span>
                  </button>
                )}
              </>
            )}

            {/* Nút Hạ Bài (Xuất hiện khi có bài đang chọn) */}
            {hasSelectedCards && onClearCardSelection && (
              <button
                onClick={onClearCardSelection}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#1c2438] hover:bg-[#283450] text-[#f3e5ab] border border-amber-400/40 hover:scale-105 cursor-pointer font-bold text-xs shadow transition-all duration-150"
                title="Hạ toàn bộ các lá bài đang chọn xuống"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Hạ Bài {selectedCardIds.size > 1 ? `(${selectedCardIds.size})` : ''}</span>
              </button>
            )}

            {/* Nút Xếp Bài: Xoay vòng đa phương án Xếp Bộ và Xếp Điểm */}
            <button
              onClick={onAutoSort}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#1c2438] hover:bg-[#283450] text-slate-300 border border-white/10 hover:scale-105 cursor-pointer font-bold text-xs transition-all duration-150"
              title={sortButtonTitle}
            >
              {isNextSortNatural ? (
                <>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{sortButtonLabel}</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{sortButtonLabel}</span>
                </>
              )}
            </button>
          </div>

          {/* Nhóm nút Bỏ lượt riêng biệt - Nền đặc đỏ thẫm */}
          {isCurrentTurn && (
            <div className="bg-[#0d1322] px-1.5 py-1 sm:py-1.5 rounded-2xl border-2 border-red-500/50 shadow-2xl flex items-center">
              <button
                onClick={onPassTurn}
                disabled={!canPass}
                className={`
                  flex items-center gap-1 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold text-xs transition-all duration-150
                  ${canPass
                    ? 'bg-[#3b1219] hover:bg-[#521822] text-red-200 hover:text-white border border-red-500/70 hover:border-red-400 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    : 'bg-[#182030]/60 text-slate-600 cursor-not-allowed border border-white/5 opacity-50'
                  }
                `}
                title={canPass ? 'Bỏ lượt không đánh vòng này' : 'Không thể bỏ lượt khi đang cầm cái / ván đầu'}
              >
                <SkipForward className="w-3.5 h-3.5 text-red-400" />
                <span>Bỏ Lượt</span>
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
          {hand.map((card, index) => {
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

      {/* Thông tin người chơi (Bản thân) - Nền đặc phẳng lì */}
      <div className={`flex items-center gap-2 mt-0.5 bg-[#121826] ${isMobileSize ? 'px-3 py-0.5' : 'px-4 py-1.5'} rounded-full border border-[#d4af37]/35 shadow-lg`}>
        <div className={`${isMobileSize ? 'w-5 h-5 text-xs' : 'w-7 h-7 text-sm'} rounded-full bg-[#182030] border border-[#d4af37]/50 flex items-center justify-center shadow-inner`}>
          {player.avatar}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold text-[#f3e5ab] ${isMobileSize ? 'text-xs' : 'text-sm'}`}>
            {player.name}
          </span>
          <span className={`${isMobileSize ? 'text-[10px]' : 'text-xs'} text-slate-300 font-bold`}>
            {player.score.toLocaleString()} 🪙
          </span>
          {isLeader && (
            <span className="bg-[#d4af37] text-[#0a0d14] text-[9px] font-black px-1.5 py-0.2 rounded-sm shadow">
              CÁI
            </span>
          )}
          {player.isPassedCurrentRound && (
            <span className="bg-neutral-800 text-red-400 text-[9px] font-bold px-1.5 py-0.2 rounded-sm border border-red-500/40">
              ĐÃ BỎ LƯỢT
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
