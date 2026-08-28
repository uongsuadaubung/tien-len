import React from 'react';
import { Player } from '../../engine/types';
import { BotConfig } from '../../ai/types';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useModalStore } from '../../stores/useModalStore';

interface BotSeatProps {
  player: Player | null;
  botConfig: BotConfig | null;
  isCurrentTurn: boolean;
  position: 'left' | 'top' | 'right';
  isLeader: boolean;
  displayCardCount: number | null;
  isDealing: boolean;
  thoughtText: string | null;
  size?: 'compact' | 'normal';
}

export const BotSeat: React.FC<BotSeatProps> = ({
  player,
  botConfig,
  isCurrentTurn,
  isLeader,
  displayCardCount,
  isDealing,
  thoughtText,
  size = 'normal'
}) => {
  if (!player) return null;

  const isCompact = size === 'compact';

  const handleInspectBot = () => {
    const allBots = useEcosystemStore.getState().bots;
    const targetId = player.botPersonaId || player.id;
    const targetBot = allBots.find(b => b.id === targetId || b.name === player.name) || null;
    if (targetBot) {
      useEcosystemStore.getState().setSelectedBot(targetBot);
      useModalStore.getState().openModal('BOT_PROFILE');
    }
  };

  const cardCount = isDealing && displayCardCount !== null && displayCardCount !== undefined ? displayCardCount : (player.hand?.length || 0);
  const visibleCards = Math.min(13, cardCount);

  return (
    <div
      id={`seat-${player.id}`}
      className="relative flex flex-col items-center justify-center z-20 select-none"
    >
      {/* Bong bóng suy nghĩ động (Thought Bubble) - Nền đặc không glass */}
      {isCurrentTurn && !player.isPassedCurrentRound && !player.rankPosition && thoughtText && (
        <div className={`absolute ${isCompact ? '-top-6' : '-top-7'} left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#121826] text-[#f3e5ab] ${isCompact ? 'text-[9px]' : 'text-[10px] sm:text-[11px]'} font-black px-2.5 py-0.5 rounded-full border border-[#d4af37] shadow-xl animate-pulse flex items-center gap-1 z-30 pointer-events-none`}>
          <span>{thoughtText}</span>
        </div>
      )}

      {/* Avatar Bot */}
      <div 
        onClick={handleInspectBot}
        className="relative group cursor-pointer"
        title={`Bấm để xem căn cước & lịch sử đối đầu của ${botConfig?.name || player.name}`}
      >
        <div
          className={`
            ${isCompact ? 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-xl' : 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-2xl sm:text-3xl'}
            flex items-center justify-center shadow-xl transition-all duration-200 group-hover:scale-110 group-hover:border-amber-400
            ${
              isCurrentTurn
                ? 'ring-4 ring-[#d4af37] ring-offset-2 ring-offset-[#0a0d14] scale-105 bg-[#182030] shadow-[#d4af37]/30'
                : 'border border-[#d4af37]/35 bg-[#121826]'
            }
            ${player.isPassedCurrentRound ? 'opacity-50 grayscale' : ''}
          `}
        >
          <span>{botConfig?.avatar || player.avatar || '🤖'}</span>
        </div>

        {/* Huy hiệu Cái */}
        {isLeader && (
          <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-[#d4af37] to-[#aa8620] text-[#0a0d14] text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white/40 shadow">
            CÁI
          </div>
        )}

        {/* Trạng thái Bỏ lượt */}
        {player.isPassedCurrentRound && (
          <div className={`absolute inset-0 bg-black/80 ${isCompact ? 'rounded-xl text-[9px]' : 'rounded-2xl text-[10px] sm:text-xs'} flex items-center justify-center font-black text-red-400`}>
            BỎ LƯỢT
          </div>
        )}

        {/* Thứ hạng Nhất/Nhì/Ba/Bét nếu đã hết bài */}
        {player.rankPosition && (
          <div
            className={`
              absolute -bottom-1.5 -right-1.5 text-[9px] font-black px-1.5 py-0.2 rounded-full border shadow-lg
              ${player.rankPosition === 1 ? 'bg-[#d4af37] text-[#0a0d14] border-white' : ''}
              ${player.rankPosition === 2 ? 'bg-slate-300 text-slate-900 border-white' : ''}
              ${player.rankPosition === 3 ? 'bg-amber-800 text-white border-amber-500' : ''}
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
            isCurrentTurn ? 'scale-105 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : ''
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

      {/* Tên Bot & Số Lá - Nền đặc */}
      <div className="flex flex-col items-center mt-0.5 text-center">
        <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-bold text-[#f3e5ab] drop-shadow leading-tight truncate max-w-[80px]`}>
          {botConfig?.name || player.name}
        </span>
        {isCompact && cardCount > 0 && !player.rankPosition && (
          <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-full border mt-0.5 ${
            cardCount === 1 
              ? 'bg-red-950 text-red-300 border-red-500 animate-bounce' 
              : 'bg-[#182030] text-amber-300 border-amber-500/30'
          }`}>
            {cardCount} Lá
          </span>
        )}
      </div>
    </div>
  );
};
