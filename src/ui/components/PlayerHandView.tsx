import React from 'react';
import { Card, Player } from '../../engine/types';
import { CardView } from './CardView';
import { Play, SkipForward, Wand2, ArrowUpDown, ArrowDownToLine } from 'lucide-react';

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
  aiHintEnabled = false
}) => {
  if (!player) return null;

  const visibleCardCount = isDealing && dealtCardsCount !== undefined ? dealtCardsCount : (player.hand?.length || 0);
  const hand = (player.hand || []).slice(0, visibleCardCount);

  return (
    <div id="seat-p0" className="relative flex flex-col items-center justify-end w-full pb-1 z-30 select-none">
      {/* Bảng nút điều khiển hành động (Action Controls) */}
      {!isDealing && (isCurrentTurn || selectedCardIds.size > 0) && (
        <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 bg-[#121724]/95 px-4 sm:px-5 py-1.5 sm:py-2 rounded-2xl border border-[#d4af37]/40 shadow-2xl">
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
                    ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa8620] text-[#0a0d14] hover:scale-105 shadow-[#d4af37]/30 cursor-pointer border border-[#ffe699]'
                    : 'bg-[#182030] text-slate-500 cursor-not-allowed border border-white/5'
                  }
                `}
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                <span>Đánh Bài</span>
              </button>

              {/* Nút Bỏ Lượt */}
              <button
                onClick={onPassTurn}
                disabled={!canPass}
                className={`
                  flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150
                  ${canPass
                    ? 'bg-[#1e2638] hover:bg-red-950/90 text-slate-200 hover:text-red-200 border border-white/10 hover:border-red-500/40 hover:scale-105 cursor-pointer shadow'
                    : 'bg-[#182030]/60 text-slate-600 cursor-not-allowed border border-white/5'
                  }
                `}
              >
                <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Bỏ Lượt</span>
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

          {/* Nút Xếp Bài */}
          <button
            onClick={onAutoSort}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-300 border border-white/10 hover:scale-105 cursor-pointer font-bold text-xs sm:text-sm transition-all duration-150"
            title="Xếp bài từ bé đến lớn"
          >
            <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
            <span>Xếp Bài</span>
          </button>
        </div>
      )}

      {/* Dãy bài trên tay người chơi */}
      <div className="relative flex items-center justify-center -space-x-8 max-w-full overflow-x-visible px-4 py-1">
        {hand.map((card, index) => {
          const isSelected = selectedCardIds.has(card.id);
          const rot = (index - (hand.length - 1) / 2) * 2;
          const cardStyle: HandCardStyle = {
            zIndex: 10 + index,
            '--rot-deg': `${rot}deg`,
            animationDelay: `${index * 25}ms`
          };
          return (
            <div
              key={card.id}
              className="zingplay-card-fan"
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
