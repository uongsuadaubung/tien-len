import React from 'react';
import { Player } from '../../engine/types';
import { BotConfig } from '../../ai/types';

interface BotSeatProps {
  player?: Player | null;
  botConfig?: BotConfig;
  isCurrentTurn: boolean;
  position: 'left' | 'top' | 'right';
  isLeader?: boolean;
  displayCardCount?: number;
  isDealing?: boolean;
}

export const BotSeat: React.FC<BotSeatProps> = ({
  player,
  botConfig,
  isCurrentTurn,
  position,
  isLeader,
  displayCardCount,
  isDealing
}) => {
  if (!player) return null;

  const cardCount = isDealing && displayCardCount !== undefined ? displayCardCount : (player.hand?.length || 0);
  const visibleCards = Math.min(13, cardCount);

  return (
    <div
      id={`seat-${player.id}`}
      className="relative flex flex-col items-center justify-center z-20 select-none"
    >
      {/* Avatar Bot */}
      <div className="relative group">
        <div
          className={`
            w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl shadow-xl transition-all duration-300
            ${
              isCurrentTurn
                ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#2e080d] scale-110 shadow-yellow-500/50 bg-[#4a0a12]'
                : 'border-2 border-[#f9b208]/60 bg-[#3a0910]'
            }
            ${player.isPassedCurrentRound ? 'opacity-50 grayscale' : ''}
          `}
        >
          <span>{botConfig?.avatar || player.avatar || '🤖'}</span>
        </div>

        {/* Huy hiệu Cái */}
        {isLeader && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-600 to-amber-500 text-yellow-100 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-yellow-300 shadow-md">
            CÁI
          </div>
        )}

        {/* Trạng thái Bỏ lượt */}
        {player.isPassedCurrentRound && (
          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-red-400">
            BỎ LƯỢT
          </div>
        )}

        {/* Thứ hạng Nhất/Nhì/Ba/Bét nếu đã hết bài */}
        {player.rankPosition && (
          <div
            className={`
              absolute -bottom-2 -right-2 text-xs font-black px-2 py-0.5 rounded-full border shadow-lg
              ${player.rankPosition === 1 ? 'bg-amber-400 text-red-950 border-yellow-200' : ''}
              ${player.rankPosition === 2 ? 'bg-slate-300 text-slate-900 border-white' : ''}
              ${player.rankPosition === 3 ? 'bg-amber-700 text-white border-amber-500' : ''}
              ${player.rankPosition === 4 ? 'bg-slate-800 text-red-400 border-red-500' : ''}
            `}
          >
            {player.rankPosition === 1
              ? '🥇 NHẤT'
              : player.rankPosition === 2
              ? '🥈 NHÌ'
              : player.rankPosition === 3
              ? '🥉 BA'
              : 'BÉT'}
          </div>
        )}
      </div>

      {/* MÔ PHỎNG DÃY BÀI ÚP ĐANG CẦM TRÊN TAY CỦA BOT */}
      {cardCount > 0 && !player.rankPosition && (
        <div
          className={`bot-hand-fan ${
            isCurrentTurn ? 'scale-110 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]' : ''
          }`}
          title={`${botConfig?.name || player.name} đang cầm ${cardCount} lá bài`}
        >
          {Array.from({ length: visibleCards }).map((_, i) => {
            const rot = (i - (visibleCards - 1) / 2) * 4;
            const translateY = Math.abs(rot) * 0.25;
            return (
              <div
                key={i}
                className="bot-mini-card"
                style={{
                  transform: `rotate(${rot}deg) translateY(${translateY}px)`,
                  zIndex: i + 1
                }}
              />
            );
          })}
        </div>
      )}

      {/* Tên Bot tối giản */}
      <div className="flex flex-col items-center mt-0.5 text-center">
        <span className="text-xs font-bold text-yellow-200 drop-shadow-md">
          {botConfig?.name || player.name}
        </span>
      </div>
    </div>
  );
};
