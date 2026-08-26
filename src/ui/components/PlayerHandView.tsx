import React from 'react';
import { Card, Player } from '../../engine/types';
import { HandSortMode } from '../../stores/useGameStore';
import { getAvailableSmartVariants, getSmartHandGroups } from '../../engine/hand-sorter';
import { CardView } from './CardView';
import { Play, SkipForward, Wand2, ArrowUpDown, ArrowDownToLine, Layers } from 'lucide-react';

interface HandCardStyle extends React.CSSProperties {
  '--rot-deg'?: string;
}

interface PlayerHandViewProps {
  player?: Player;
  selectedCardIds: Set<string>;
  onToggleCardSelect: (cardId: string) => void;
  onClearCardSelection?: () => void;
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
  onAutoSort: () => void;
  onGetAiHint: () => void;
  isCurrentTurn: boolean;
  canPlay: boolean;
  canPass: boolean;
  isLeader: boolean;
  isDealing?: boolean;
  dealtCardsCount?: number;
  aiHintEnabled?: boolean;
  isFirstMoveOfGame?: boolean;
  sortMode?: HandSortMode;
  variantIndex?: number;
}

export const PlayerHandView: React.FC<PlayerHandViewProps> = ({
  player,
  selectedCardIds,
  onToggleCardSelect,
  onClearCardSelection,
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onGetAiHint,
  isCurrentTurn,
  canPlay,
  canPass,
  isLeader,
  isDealing = false,
  dealtCardsCount,
  aiHintEnabled = false,
  isFirstMoveOfGame = false,
  sortMode = 'NATURAL',
  variantIndex = 0
}) => {
  if (!player) return null;

  const visibleCardCount = isDealing && dealtCardsCount !== undefined ? dealtCardsCount : (player.hand?.length || 0);
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

  return (
    <div id="seat-p0" className="relative flex flex-col items-center justify-end w-full pb-1 z-30 select-none">
      {/* Thông báo hướng dẫn nước đi đầu tiên ván 1 */}
      {!isDealing && isCurrentTurn && isFirstMoveOfGame && has3S && (
        <div className="mb-1.5 animate-fade-in">
          {selectedCardIds.size > 0 && !isSelectedWith3S ? (
            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-950/90 border border-red-500/60 text-red-300 text-[11px] font-bold shadow-lg">
              <span>⚠️</span>
              <span>Ván đầu tiên: Bắt buộc chọn tổ hợp có chứa lá 3 Bích ♠</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#0c4031]/95 border border-[#d4af37]/60 text-[#f3e5ab] text-[11px] font-bold shadow-lg">
              <span>♠</span>
              <span>Bạn giữ 3 Bích và đi trước mở màn ván đấu!</span>
            </div>
          )}
        </div>
      )}

      {/* Bảng nút điều khiển hành động (Action Controls) */}
      {!isDealing && (isCurrentTurn || selectedCardIds.size > 0) && (
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-1.5 sm:mb-2 flex-wrap">
          {/* Nhóm nút thao tác chính (Đánh bài, Gợi ý, Hạ bài, Xếp bài) - Nằm bên trái */}
          <div className="flex items-center gap-2 sm:gap-3 bg-[#121724]/95 px-4 sm:px-5 py-1.5 sm:py-2 rounded-2xl border border-[#d4af37]/40 shadow-2xl backdrop-blur-sm">
            {/* Các nút hành động khi đến lượt đi */}
            {isCurrentTurn && (
              <>
                {/* Nút Đánh Bài */}
                <button
                  onClick={onPlaySelectedCards}
                  disabled={!canPlay}
                  className={`
                    flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 shadow-md
                    ${canPlay
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#aa8620] hover:from-[#e5c158] hover:to-[#be982d] text-[#0a0d14] hover:scale-105 shadow-[#d4af37]/30 cursor-pointer border border-[#d4af37]'
                      : 'bg-[#182030] text-slate-500 cursor-not-allowed border border-white/5'
                    }
                  `}
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  <span>Đánh Bài</span>
                </button>

                {/* Nút Gợi Ý AI */}
                {aiHintEnabled && (
                  <button
                    onClick={onGetAiHint}
                    className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 hover:scale-105 cursor-pointer font-bold text-xs sm:text-sm shadow transition-all duration-150"
                    title="Thần bài gợi ý nước đi tối ưu"
                  >
                    <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
                    <span>Gợi Ý AI</span>
                  </button>
                )}
              </>
            )}

            {/* Nút Hạ Bài (Xuất hiện khi có bài đang chọn) */}
            {selectedCardIds.size > 0 && onClearCardSelection && (
              <button
                onClick={onClearCardSelection}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-[#f3e5ab] border border-[#d4af37]/30 hover:scale-105 cursor-pointer font-bold text-xs sm:text-sm shadow transition-all duration-150"
                title="Hạ toàn bộ các lá bài đang chọn xuống"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
                <span>Hạ Bài {selectedCardIds.size > 1 ? `(${selectedCardIds.size})` : ''}</span>
              </button>
            )}

            {/* Nút Xếp Bài: Xoay vòng đa phương án Xếp Bộ và Xếp Điểm */}
            <button
              onClick={onAutoSort}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-300 border border-white/10 hover:scale-105 cursor-pointer font-bold text-xs sm:text-sm transition-all duration-150"
              title={sortButtonTitle}
            >
              {isNextSortNatural ? (
                <>
                  <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
                  <span>{sortButtonLabel}</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
                  <span>{sortButtonLabel}</span>
                </>
              )}
            </button>
          </div>

          {/* Nhóm nút Bỏ lượt riêng biệt - Nằm bên phải để tránh ấn nhầm */}
          {isCurrentTurn && (
            <div className="bg-[#121724]/95 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl border border-red-500/30 shadow-2xl backdrop-blur-sm flex items-center">
              <button
                onClick={onPassTurn}
                disabled={!canPass}
                className={`
                  flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150
                  ${canPass
                    ? 'bg-red-950/50 hover:bg-red-900/90 text-red-200 hover:text-white border border-red-500/50 hover:border-red-400 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    : 'bg-[#182030]/60 text-slate-600 cursor-not-allowed border border-white/5 opacity-50'
                  }
                `}
                title={canPass ? 'Bỏ lượt không đánh vòng này' : 'Không thể bỏ lượt khi đang cầm cái / ván đầu'}
              >
                <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                <span>Bỏ Lượt</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dãy bài trên tay người chơi */}
      {isSmartMode && smartGroups.length > 0 ? (
        <div className="relative flex items-center justify-center max-w-full overflow-x-visible px-4 py-1 gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
          {smartGroups.map((group, groupIdx) => (
            <div key={group.id} className="relative flex items-center -space-x-8">
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
      ) : (
        <div className="relative flex items-center justify-center -space-x-8 max-w-full overflow-x-visible px-4 py-1">
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
                  style={{
                    transform: `rotate(${rot}deg)`
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Thông tin người chơi (Bản thân) */}
      <div className="flex items-center gap-3 mt-1 bg-[#121724]/95 px-4 py-1.5 rounded-full border border-[#d4af37]/35 shadow-lg">
        <div className="w-7 h-7 rounded-full bg-[#182030] border border-[#d4af37]/50 flex items-center justify-center text-sm shadow-inner">
          {player.avatar}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-[#f3e5ab] text-sm">
            {player.name}
          </span>
          <span className="text-xs text-slate-300 font-bold">
            {player.score.toLocaleString()} 🪙
          </span>
          {isLeader && (
            <span className="bg-[#d4af37] text-[#0a0d14] text-[10px] font-black px-1.5 py-0.2 rounded-sm shadow">
              CÁI
            </span>
          )}
          {player.isPassedCurrentRound && (
            <span className="bg-neutral-800 text-red-400 text-[10px] font-bold px-1.5 py-0.2 rounded-sm border border-red-500/40">
              ĐÃ BỎ LƯỢT
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
