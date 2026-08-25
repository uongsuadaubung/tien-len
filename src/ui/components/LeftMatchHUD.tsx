import React, { useState } from 'react';
import { Player } from '../../engine/types';
import { getBotConfig } from '../../ai/bot-factory';
import { ChevronLeft, ChevronRight, Trophy, Coins } from 'lucide-react';

interface LeftMatchHUDProps {
  players: Player[];
  currentTurnPlayerId: string;
  leadPlayerId: string;
  gameNumber: number;
  betAmount: number;
  isDealing: boolean;
  dealtCounts: { [playerId: string]: number };
}

export const LeftMatchHUD: React.FC<LeftMatchHUDProps> = ({
  players,
  currentTurnPlayerId,
  leadPlayerId,
  gameNumber,
  betAmount,
  isDealing,
  dealtCounts
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <div
      className={`left-match-hud-container ${isOpen ? '' : 'collapsed'}`}
      style={{
        top: '50%',
        left: '12px',
        transform: isOpen ? 'translateY(-50%)' : 'translate(calc(-100% + 14px), -50%)'
      }}
    >
      {/* BẢNG TABLE HUD CHÍNH */}
      <div className="w-[280px] sm:w-[310px] bg-[#101522] border border-[#d4af37]/40 rounded-2xl shadow-2xl p-2.5 text-white flex flex-col gap-2">
        {/* Header HUD: Ván & Mức Cược */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-1.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#d4af37]" />
            <span className="font-black text-xs text-[#f3e5ab] uppercase tracking-wider">
              Ván {gameNumber}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-[#182030] px-2 py-0.5 rounded-full border border-[#d4af37]/30">
            <Coins className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="text-xs font-black text-[#f3e5ab]">
              {betAmount} 🪙
            </span>
          </div>
        </div>

        {/* BẢNG TABLE KẺ CỘT RÕ RÀNG */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0d14]/70">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#182030] text-[#f3e5ab] text-[10px] sm:text-[11px] font-black uppercase tracking-wider border-b border-white/10">
                <th className="py-1.5 px-2 border-r border-white/10">Người Chơi</th>
                <th className="py-1.5 px-2 text-center border-r border-white/10 w-14">Lá Bài</th>
                <th className="py-1.5 px-2 text-right w-16">Tiền 🪙</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold divide-y divide-white/5">
              {players.map((p, index) => {
                const isTurn = !isDealing && currentTurnPlayerId === p.id;
                const isLeader = leadPlayerId === p.id;
                const cardCount = isDealing && dealtCounts[p.id] !== undefined ? dealtCounts[p.id] : p.hand.length;
                const isOneCardLeft = !isDealing && cardCount === 1 && !p.rankPosition;
                const cfg = p.isBot ? getBotConfig(p.botPersonaId || 'BOT_ELO_1150') : null;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors duration-150 ${
                      isTurn
                        ? 'bg-[#182030] font-bold border-l-2 border-l-[#d4af37]'
                        : p.isPassedCurrentRound
                        ? 'bg-black/40 opacity-60'
                        : index % 2 === 0
                        ? 'bg-[#121724]/40'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* Cột 1: Thông tin người chơi & Trạng thái */}
                    <td className="py-1.5 px-2 border-r border-white/10">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <span className="text-sm">{p.avatar || '🤖'}</span>
                          {isLeader && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[#d4af37] text-[#0a0d14] text-[7px] font-black px-0.5 rounded-full shadow">
                              👑
                            </span>
                          )}
                        </div>

                        {/* Tên & Tag */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`text-[11px] font-bold truncate ${isTurn ? 'text-[#f3e5ab]' : 'text-slate-200'}`}>
                              {p.isBot ? p.name : 'Bạn'}
                            </span>
                            {p.isBot && cfg?.elo && (
                              <span className="text-[8px] font-black text-[#d4af37] bg-[#0a0d14] px-1 rounded border border-[#d4af37]/20">
                                {cfg.elo}
                              </span>
                            )}
                          </div>

                          {/* Trạng thái chi tiết */}
                          <div className="flex items-center gap-1">
                            {p.rankPosition ? (
                              <span className={`text-[8px] font-black px-1 rounded ${
                                p.rankPosition === 1 ? 'bg-[#d4af37] text-[#0a0d14]' : p.rankPosition === 2 ? 'bg-slate-300 text-slate-900' : p.rankPosition === 3 ? 'bg-amber-800 text-white' : 'bg-neutral-800 text-red-400'
                              }`}>
                                {p.rankPosition === 1 ? '🥇 Nhất' : p.rankPosition === 2 ? '🥈 Nhì' : p.rankPosition === 3 ? '🥉 Ba' : 'Bét'}
                              </span>
                            ) : p.isPassedCurrentRound ? (
                              <span className="text-[8px] font-bold text-red-400 bg-red-950/80 px-1 rounded border border-red-500/30">
                                Đã bỏ lượt
                              </span>
                            ) : isTurn ? (
                              <span className="text-[8px] font-black text-[#f3e5ab] bg-[#182030] px-1 rounded border border-[#d4af37]/50">
                                Đang đánh
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Số lá bài còn lại */}
                    <td className="py-1.5 px-2 text-center border-r border-white/10">
                      <div className="flex flex-col items-center justify-center">
                        <span
                          className={`font-black text-xs px-1.5 py-0.5 rounded ${
                            isOneCardLeft
                              ? 'bg-red-600 text-white animate-bounce'
                              : isTurn
                              ? 'text-[#f3e5ab] font-extrabold'
                              : 'text-slate-300'
                          }`}
                        >
                          {cardCount}
                        </span>
                        {isOneCardLeft && (
                          <span className="text-[7px] font-black text-red-400 tracking-tighter uppercase">
                            Báo 1!
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 3: Số tiền */}
                    <td className="py-1.5 px-2 text-right font-bold text-[11px] text-[#f3e5ab]">
                      {p.score.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NÚT THU GỌN / MỞ RỘNG (TOGGLE BUTTON) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#101522] hover:bg-[#182030] text-[#f3e5ab] border border-l-0 border-[#d4af37]/40 py-3 px-1 rounded-r-xl shadow-xl transition-all cursor-pointer flex items-center justify-center"
        title={isOpen ? 'Thu gọn bảng HUD' : 'Mở rộng bảng HUD'}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
};
