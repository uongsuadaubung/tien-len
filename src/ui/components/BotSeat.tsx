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
}

export const BotSeat: React.FC<BotSeatProps> = ({
  player,
  botConfig,
  isCurrentTurn,
  isLeader,
  displayCardCount,
  isDealing,
  thoughtText
}) => {
  if (!player) return null;

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
      {/* Bong bóng suy nghĩ động (Thought Bubble) */}
      {isCurrentTurn && !player.isPassedCurrentRound && !player.rankPosition && thoughtText && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#121724]/95 text-[#f3e5ab] text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full border border-[#d4af37] shadow-lg animate-pulse flex items-center gap-1 z-30 pointer-events-none">
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
            w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-xl transition-all duration-200 group-hover:scale-110 group-hover:border-amber-400
            ${
              isCurrentTurn
                ? 'ring-4 ring-[#d4af37] ring-offset-2 ring-offset-[#0a0d14] scale-105 bg-[#182030] shadow-[#d4af37]/30'
                : 'border border-[#d4af37]/35 bg-[#121724]'
            }
            ${player.isPassedCurrentRound ? 'opacity-50 grayscale' : ''}
          `}
        >
          <span>{botConfig?.avatar || player.avatar || '🤖'}</span>
        </div>

        {/* Huy hiệu Cái */}
        {isLeader && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#d4af37] to-[#aa8620] text-[#0a0d14] text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white/40 shadow">
            CÁI
          </div>
        )}

        {/* Trạng thái Bỏ lượt */}
        {player.isPassedCurrentRound && (
          <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center text-[10px] sm:text-xs font-black text-red-400">
            BỎ LƯỢT
          </div>
        )}

        {/* Thứ hạng Nhất/Nhì/Ba/Bét nếu đã hết bài */}
        {player.rankPosition && (
          <div
            className={`
              absolute -bottom-2 -right-2 text-xs font-black px-2 py-0.5 rounded-full border shadow-lg
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

      {/* Tên Bot */}
      <div className="flex flex-col items-center mt-0.5 text-center">
        <span className="text-xs font-bold text-[#f3e5ab] drop-shadow">
          {botConfig?.name || player.name}
        </span>
      </div>
    </div>
  );
};
