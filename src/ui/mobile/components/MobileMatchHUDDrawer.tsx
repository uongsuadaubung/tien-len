import React from 'react';
import { Player } from '../../../engine/types';
import { getBotConfig } from '../../../ai/bot-factory';
import { Trophy, Coins, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 animate-fade-in p-2 sm:p-4 select-none">
      {/* Vùng bấm ra ngoài để đóng */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Tấm Bottom Sheet Drawer chính - Nền đặc phẳng lì #0e1422 */}
      <div 
        className="relative z-10 w-full max-w-lg bg-[#0e1422] border-2 border-[#2a3449] rounded-3xl shadow-2xl p-4 text-white flex flex-col gap-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Thanh cầm kéo / Header Drawer */}
        <div className="flex items-center justify-between border-b border-[#2a3449] pb-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--color-gold)]" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Bảng Chỉ Số Ván #{gameNumber}
              </h3>
              <span className="text-[11px] text-zinc-400">
                Mức cược: {betAmount.toLocaleString()} Xu / lá
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="gold" size="sm">
              <Coins className="w-3.5 h-3.5 text-[#0a0c0e]" />
              <span>{betAmount.toLocaleString()} Xu</span>
            </Badge>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#182030] border border-[#2a3449] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BẢNG CHỈ SỐ NGƯỜI CHƠI */}
        <div className="overflow-hidden rounded-2xl border border-[#2a3449] bg-[#090d16]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#141b2b] text-zinc-300 text-[10px] font-bold uppercase tracking-wider border-b border-[#2a3449]">
                <th className="py-2.5 px-3 border-r border-[#2a3449]">Người Chơi</th>
                <th className="py-2.5 px-2 text-center border-r border-[#2a3449] w-20">Bài Còn</th>
                <th className="py-2.5 px-3 text-right w-24">Điểm / Xu</th>
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
                    <td className="py-2.5 px-3 border-r border-[#2a3449]">
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <span className="text-base">{p.avatar || '🤖'}</span>
                          {isLeader && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[#d4af37] text-black text-[8px] font-black px-1 rounded-full shadow">
                              👑
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span
                              className={`truncate text-xs ${
                                isHuman ? 'text-[#d4af37] font-bold' : 'text-zinc-100'
                              }`}
                            >
                              {p.name}
                            </span>
                          </div>

                          <span className="text-[10px] text-zinc-400 font-medium">
                            {p.isPassedCurrentRound ? (
                              <span className="text-red-400 font-bold">Bỏ Lượt</span>
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
                    <td className="py-2.5 px-2 text-center border-r border-[#2a3449] font-mono">
                      {p.rankPosition ? (
                        <Badge variant="gold" size="sm">
                          #{p.rankPosition}
                        </Badge>
                      ) : isOneCardLeft ? (
                        <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] animate-pulse">
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
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-zinc-300">
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
