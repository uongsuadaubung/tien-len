import React from 'react';
import { Card, Player } from '../../engine/types';
import { CardView } from './CardView';
import { Play, SkipForward, Sparkles, Wand2, ArrowUpDown } from 'lucide-react';

interface PlayerHandViewProps {
  player: Player;
  selectedCardIds: Set<string>;
  onToggleCardSelect: (cardId: string) => void;
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
}

export const PlayerHandView: React.FC<PlayerHandViewProps> = ({
  player,
  selectedCardIds,
  onToggleCardSelect,
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onGetAiHint,
  isCurrentTurn,
  canPlay,
  canPass,
  isLeader,
  isDealing = false,
  dealtCardsCount
}) => {
  const visibleCardCount = isDealing && dealtCardsCount !== undefined ? dealtCardsCount : player.hand.length;
  const hand = player.hand.slice(0, visibleCardCount);

  return (
    <div id="seat-p0" className="relative flex flex-col items-center justify-end w-full pb-1 z-30">
      {/* Bảng nút điều khiển hành động (Action Controls) - Ẩn khi đang chia bài */}
      {!isDealing && isCurrentTurn && (
        <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 bg-black/75 backdrop-blur-md px-4 sm:px-5 py-1.5 sm:py-2 rounded-2xl border-2 border-yellow-500/60 shadow-2xl animate-fade-in">
          {/* Nút Đánh Bài */}
          <button
            onClick={onPlaySelectedCards}
            disabled={!canPlay}
            className={`
              flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-lg
              ${canPlay
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-red-950 hover:scale-105 shadow-yellow-500/50 cursor-pointer border border-yellow-200'
                : 'bg-neutral-700/60 text-neutral-400 cursor-not-allowed border border-neutral-600/30'
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
              flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200
              ${canPass
                ? 'bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-500/40 hover:scale-105 cursor-pointer shadow-md'
                : 'bg-neutral-800/40 text-neutral-500 cursor-not-allowed border border-neutral-700/20'
              }
            `}
          >
            <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Bỏ Lượt</span>
          </button>

          {/* Nút Gợi Ý AI */}
          <button
            onClick={onGetAiHint}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-purple-100 border border-purple-400/50 hover:scale-105 cursor-pointer font-bold text-xs sm:text-sm shadow-md transition-all duration-200"
            title="Thần bài gợi ý nước đi tối ưu"
          >
            <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300" />
            <span>Gợi Ý AI</span>
          </button>

          {/* Nút Xếp Bài */}
          <button
            onClick={onAutoSort}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-yellow-300 border border-yellow-500/30 hover:scale-105 cursor-pointer font-bold text-xs sm:text-sm transition-all duration-200"
            title="Xếp bài từ bé đến lớn"
          >
            <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Xếp Bài</span>
          </button>
        </div>
      )}

      {/* Dãy bài trên tay người chơi */}
      <div className="relative flex items-center justify-center -space-x-8 max-w-full overflow-x-visible px-4 py-1">
        {hand.map((card, index) => {
          const isSelected = selectedCardIds.has(card.id);
          const rot = (index - (hand.length - 1) / 2) * 2;
          return (
            <div
              key={card.id}
              className="zingplay-card-fan"
              style={{
                zIndex: 10 + index,
                ['--rot-deg' as string]: `${rot}deg`,
                animationDelay: `${index * 25}ms`
              }}
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
      <div className="flex items-center gap-3 mt-1 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-yellow-500/40 shadow-lg">
        <div className="w-7 h-7 rounded-full bg-red-800 border border-yellow-400 flex items-center justify-center text-sm">
          {player.avatar}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-yellow-300 text-sm">
            {player.name}
          </span>
          <span className="text-xs text-amber-300/80 font-bold">
            {player.score.toLocaleString()} 🧧
          </span>
          {isLeader && (
            <span className="bg-red-600 text-yellow-200 text-[10px] font-black px-1.5 py-0.2 rounded-sm border border-yellow-400">
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
