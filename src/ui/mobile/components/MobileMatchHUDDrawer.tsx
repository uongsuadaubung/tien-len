import React from 'react';
import { Player } from '../../../engine/types';
import { getBotConfig } from '../../../ai/bot-factory';
import { Trophy, X } from 'lucide-react';
import { Badge } from '../../primitives';
import { BotConfig } from '../../../ai/types';
import { useUserStore } from '../../../stores/useUserStore';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';
import { useGameStore } from '../../../stores/useGameStore';
import { useI18n } from '../../../locales';

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
  const { t } = useI18n();
  const { profile } = useUserStore();
  const ecosystemBots = useEcosystemStore(state => state.bots);
  const { myPlayerId } = useGameStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      {/* Vùng bấm ra ngoài để đóng */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="w-full max-w-lg bg-[#0e1422] border-t-2 border-[#2a3449] rounded-t-3xl p-4 shadow-2xl flex flex-col gap-3 max-h-[85vh] overflow-y-auto z-10" onClick={e => e.stopPropagation()}>
        {/* HEADER DRAWER */}
        <div className="flex items-center justify-between border-b border-[#2a3449] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {t('hud.gameNumber', { number: gameNumber })}
              </h3>
              <span className="text-[10px] text-zinc-400 font-semibold">
                {t('victory.betAmountLabel', { amount: betAmount.toLocaleString() })}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#182030] border border-[#2a3449] flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BẢNG CHỈ SỐ NGƯỜI CHƠI */}
        <div className="overflow-hidden rounded-xl border border-[#2a3449] bg-[#090d16]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#141b2b] text-zinc-300 text-[9px] font-bold uppercase tracking-wider border-b border-[#2a3449]">
                <th className="py-1.5 px-2.5 border-r border-[#2a3449]">{t('hud.colPlayer')}</th>
                <th className="py-1.5 px-2 text-center border-r border-[#2a3449] w-16">{t('hud.colCards')}</th>
                <th className="py-1.5 px-2.5 text-right w-20">{t('hud.colScore')}</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold divide-y divide-white/5">
              {players.map(p => {
                const isTurn = !isDealing && currentTurnPlayerId === p.id;
                const isLeader = leadPlayerId === p.id;
                const isMe = p.id === myPlayerId;
                const cardCount = isDealing 
                  ? (dealtCounts[p.id] ?? 0) 
                  : (p.hand?.length ?? 0);
                const isOneCardLeft = !isDealing && cardCount === 1 && !p.rankPosition;
                const botIdx = parseInt(p.id.replace('p', '')) - 1;
                const botOverride =
                  customBotConfigs && botIdx >= 0 && botIdx < customBotConfigs.length
                    ? customBotConfigs[botIdx]
                    : undefined;
                const cfg = p.isBot ? getBotConfig(p.botPersonaId || 'BOT_ELO_1150', botOverride) : null;
                const liveBot = p.isBot
                  ? ecosystemBots.find(b => b.id === p.botPersonaId || b.id === p.id || b.name === p.name)
                  : null;
                const displayElo = isMe ? profile.elo : (liveBot?.elo ?? botOverride?.elo ?? cfg?.elo ?? 1000);

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
                          <span className="emoji-avatar text-sm">{p.avatar || (p.isBot ? '🤖' : '🤠')}</span>
                          {isLeader && (
                            <span className="absolute -top-1 -right-1 bg-[#d4af37] text-black text-[7px] font-black px-0.5 rounded-full shadow">
                              👑
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span
                            className={`truncate text-[11px] leading-tight ${
                              isMe ? 'text-[#d4af37] font-bold' : 'text-zinc-100'
                            }`}
                          >
                            {isMe ? `${p.name} ${t('hud.you')}` : p.name}
                          </span>

                          <span className="text-[9px] text-zinc-400 font-medium leading-tight">
                            {p.isPassedCurrentRound ? (
                              <span className="text-rose-400 font-bold">{t('hud.turnPassed')}</span>
                            ) : p.rankPosition ? (
                              <span className="text-amber-400 font-bold">{t('hud.rankBadge', { rank: p.rankPosition })}</span>
                            ) : isTurn ? (
                              <span className="text-amber-300 font-bold">{t('hud.turnPlaying')}</span>
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
                          {t('hud.oneCardAlert')}
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
