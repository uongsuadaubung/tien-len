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
      <div className="w-[280px] sm:w-[310px] bg-[#1a0205]/95 backdrop-blur-md border-2 border-yellow-500/60 rounded-2xl shadow-2xl p-2.5 text-white flex flex-col gap-2">
        {/* Header HUD: Ván & Mức Cược */}
        <div className="flex items-center justify-between border-b-2 border-yellow-500/40 pb-1.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="font-black text-xs text-yellow-200 uppercase tracking-wider">
              Ván {gameNumber}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-yellow-500/40">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-black text-yellow-300">
              {betAmount} 🧧
            </span>
          </div>
        </div>

        {/* BẢNG TABLE KẺ CỘT RÕ RÀNG */}
        <div className="overflow-hidden rounded-xl border border-yellow-500/40 bg-black/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-red-950 via-amber-950 to-red-950 text-yellow-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider border-b border-yellow-500/40">
                <th className="py-1.5 px-2 border-r border-yellow-500/30">Người Chơi</th>
                <th className="py-1.5 px-2 text-center border-r border-yellow-500/30 w-14">Lá Bài</th>
                <th className="py-1.5 px-2 text-right w-16">Tiền 🧧</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold divide-y divide-yellow-500/20">
              {players.map((p, index) => {
                const isTurn = !isDealing && currentTurnPlayerId === p.id;
                const isLeader = leadPlayerId === p.id;
                const cardCount = isDealing && dealtCounts[p.id] !== undefined ? dealtCounts[p.id] : p.hand.length;
                const isOneCardLeft = !isDealing && cardCount === 1 && !p.rankPosition;
                const cfg = p.isBot ? getBotConfig(p.botPersonaId || 'CHU_BAY') : null;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors duration-150 ${
                      isTurn
                        ? 'bg-amber-500/30 font-bold border-l-4 border-l-yellow-400'
                        : p.isPassedCurrentRound
                        ? 'bg-black/40 opacity-60'
                        : index % 2 === 0
                        ? 'bg-red-950/20'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* Cột 1: Thông tin người chơi & Trạng thái */}
                    <td className="py-1.5 px-2 border-r border-yellow-500/30">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <span className="text-sm">{p.avatar || '🤖'}</span>
                          {isLeader && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-yellow-100 text-[7px] font-black px-0.5 rounded-full border border-yellow-300">
                              👑
                            </span>
                          )}
                        </div>

                        {/* Tên & Tag */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`text-[11px] font-bold truncate ${isTurn ? 'text-yellow-200' : 'text-slate-200'}`}>
                              {p.isBot ? (cfg?.name || p.name) : 'Bạn'}
                            </span>
                            {p.isBot && cfg?.elo && (
                              <span className="text-[8px] font-black text-amber-400 bg-black/60 px-1 rounded border border-yellow-500/20">
                                {cfg.elo}
                              </span>
                            )}
                          </div>

                          {/* Trạng thái chi tiết */}
                          <div className="flex items-center gap-1">
                            {p.rankPosition ? (
                              <span className={`text-[8px] font-black px-1 rounded ${
                                p.rankPosition === 1 ? 'bg-amber-400 text-red-950' : p.rankPosition === 2 ? 'bg-slate-300 text-slate-900' : p.rankPosition === 3 ? 'bg-amber-700 text-white' : 'bg-neutral-800 text-red-400'
                              }`}>
                                {p.rankPosition === 1 ? '🥇 Nhất' : p.rankPosition === 2 ? '🥈 Nhì' : p.rankPosition === 3 ? '🥉 Ba' : 'Bét'}
                              </span>
                            ) : p.isPassedCurrentRound ? (
                              <span className="text-[8px] font-bold text-red-400 bg-red-950/80 px-1 rounded border border-red-500/30">
                                Đã bỏ lượt
                              </span>
                            ) : isTurn ? (
                              <span className="text-[8px] font-black text-yellow-300 bg-yellow-950/90 px-1 rounded border border-yellow-400 animate-pulse">
                                Đang đánh
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Số lá bài còn lại */}
                    <td className="py-1.5 px-2 text-center border-r border-yellow-500/30">
                      <div className="flex flex-col items-center justify-center">
                        <span
                          className={`font-black text-xs px-1.5 py-0.5 rounded ${
                            isOneCardLeft
                              ? 'bg-red-600 text-white animate-bounce'
                              : isTurn
                              ? 'text-yellow-200 font-extrabold'
                              : 'text-yellow-300'
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
                    <td className="py-1.5 px-2 text-right font-bold text-[11px] text-amber-300/90">
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
        className="bg-[#2a060c]/95 hover:bg-[#3a0810] text-yellow-300 border-2 border-l-0 border-yellow-500/50 hover:border-yellow-300 py-3 px-1 rounded-r-xl shadow-2xl transition-all duration-150 cursor-pointer backdrop-blur-md flex items-center justify-center"
        title={isOpen ? 'Thu gọn bảng HUD' : 'Mở rộng bảng HUD'}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
};
