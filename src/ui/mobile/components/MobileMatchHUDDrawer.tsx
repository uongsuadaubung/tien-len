import React from 'react';
import { Player } from '../../../engine/types';
import { getBotConfig } from '../../../ai/bot-factory';
import { Trophy, X } from 'lucide-react';
import { Badge } from '../../primitives';
import { BotConfig } from '../../../ai/types';
import { useUserStore } from '../../../stores/useUserStore';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';

export interface MobileMatchHUDDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  gameNumber: number;
  betAmount: number;
  isDealing: boolean;
  dealtCounts: { [playerId: string]: number };
  customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>] | null;
}

export const MobileMatchHUDDrawer: React.FC<MobileMatchHUDDrawerProps> = ({
  isOpen,
  onClose,
  players,
  currentTurnPlayerId,
  leadPlayerId,
  gameNumber,
  betAmount,
  isDealing,
  dealtCounts,
  customBotConfigs
}) => {
  const { profile } = useUserStore();
  const ecosystemBots = useEcosystemStore(state => state.bots);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center sm:items-end justify-center bg-black/80 animate-fade-in p-2 sm:p-3 select-none">
      {/* Vùng bấm ra ngoài để đóng */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Tấm Bottom Sheet Drawer chính - Nền đặc phẳng lì #0e1422 */}
      <div 
        className="relative z-10 w-full max-w-md bg-[#0e1422] border border-[#2a3449] rounded-2xl shadow-2xl p-3 text-white flex flex-col gap-2 max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Thanh Header Drawer */}
        <div className="flex items-center justify-between border-b border-[#2a3449] pb-1.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[var(--color-gold)]" />
            <div>
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Bảng Chỉ Số Ván #{gameNumber}
              </h3>
              <span className="text-[10px] text-zinc-400">
                Mức cược: {betAmount.toLocaleString()} Xu / lá
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-[#182030] border border-[#2a3449] flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* BẢNG CHỈ SỐ NGƯỜI CHƠI (TỐI ƯU COMPACT HIỆN ĐỦ 4 NGƯỜI) */}
        <div className="overflow-hidden rounded-xl border border-[#2a3449] bg-[#090d16]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#141b2b] text-zinc-300 text-[9px] font-bold uppercase tracking-wider border-b border-[#2a3449]">
                <th className="py-1.5 px-2.5 border-r border-[#2a3449]">Người Chơi</th>
                <th className="py-1.5 px-2 text-center border-r border-[#2a3449] w-16">Bài Còn</th>
                <th className="py-1.5 px-2.5 text-right w-20">Điểm / Xu</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold divide-y divide-white/5">
              {players.map(p => {
                const isTurn = !isDealing && currentTurnPlayerId === p.id;
                const isLeader = leadPlayerId === p.id;
                const cardCount = isDealing && dealtCounts[p.id] !== undefined ? dealtCounts[p.id] : p.hand.length;
                const isOneCardLeft = !isDealing && cardCount === 1 && !p.rankPosition;
                const isHuman = p.id === 'p0';
                const botIdx = parseInt(p.id.replace('p', '')) - 1;
                const botOverride =
                  customBotConfigs && botIdx >= 0 && botIdx < customBotConfigs.length
                    ? customBotConfigs[botIdx]
                    : undefined;
                const cfg = p.isBot ? getBotConfig(p.botPersonaId || 'BOT_ELO_1150', botOverride) : null;
                const liveBot = p.isBot
                  ? ecosystemBots.find(b => b.id === p.botPersonaId || b.id === p.id || b.name === p.name)
                  : null;
                const displayElo = isHuman ? profile.elo : liveBot?.elo ?? botOverride?.elo ?? cfg?.elo ?? 1000;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isTurn
                        ? 'bg-[#1c2438] font-bold border-l-4 border-l-[var(--color-gold)]'
                        : p.isPassedCurrentRound
                        ? 'bg-[#090d16] opacity-40'
                        : 'bg-[#0e1422]'
                    }`}
                  >
                    {/* Người chơi */}
                    <td className="py-1.5 px-2.5 border-r border-[#2a3449]">
                      <div className="flex items-center gap-1.5">
                        <div className="relative shrink-0 flex items-center justify-center">
                          <span className="emoji-avatar text-sm">{p.avatar || '🤖'}</span>
                          {isLeader && (
                            <span className="absolute -top-1 -right-1 bg-[#d4af37] text-black text-[7px] font-black px-0.5 rounded-full shadow">
                              👑
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span
                            className={`truncate text-[11px] leading-tight ${
                              isHuman ? 'text-[#d4af37] font-bold' : 'text-zinc-100'
                            }`}
                          >
                            {p.name}
                          </span>

                          <span className="text-[9px] text-zinc-400 font-medium leading-tight">
                            {p.isPassedCurrentRound ? (
                              <span className="text-rose-400 font-bold">Bỏ Lượt</span>
                            ) : p.rankPosition ? (
                              <span className="text-amber-400 font-bold">Về #{p.rankPosition}</span>
                            ) : isTurn ? (
                              <span className="text-amber-300 font-bold">Đang Đánh</span>
                            ) : (
                              `${displayElo} Elo`
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Số lá bài */}
                    <td className="py-1.5 px-2 text-center border-r border-[#2a3449] font-mono">
                      {p.rankPosition ? (
                        <Badge variant="gold" size="sm">
                          #{p.rankPosition}
                        </Badge>
                      ) : isOneCardLeft ? (
                        <span className="bg-red-600 text-white font-bold px-1 py-0.2 rounded text-[9px] animate-pulse">
                          1 Lá
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-bold ${
                            cardCount <= 3 ? 'text-amber-400 font-black' : 'text-zinc-200'
                          }`}
                        >
                          {cardCount}
                        </span>
                      )}
                    </td>

                    {/* Điểm số */}
                    <td className="py-1.5 px-2.5 text-right font-mono text-[11px] text-zinc-300">
                      {p.score > 1000000
                        ? `${(p.score / 1000000).toFixed(1)}M`
                        : p.score > 1000
                        ? `${(p.score / 1000).toFixed(0)}k`
                        : p.score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
