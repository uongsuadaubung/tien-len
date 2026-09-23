import React, { useState } from 'react';
import { MatchPlayer } from '../../../engine/types';
import { getBotConfig } from '../../../ai/bot-factory';
import { isBotConfig } from '../../../ai/types';
import { Trophy, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../../primitives';
import { MoveHint } from '../../../ai/hint-engine';
import { AIAssistantMascot } from '../../components/AIAssistantMascot';

import { useUserStore } from '../../../stores/useUserStore';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';
import { useGameStore } from '../../../stores/useGameStore';
import { useI18n } from '../../../locales';

interface LeftMatchHUDProps {
  players: MatchPlayer[];
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  gameNumber: number;
  betAmount: number;
  isDealing: boolean;
  dealtCounts: { [playerId: string]: number };
  aiHint: MoveHint | null;
  isHumanTurn: boolean;
  aiHintEnabled: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const LeftMatchHUD: React.FC<LeftMatchHUDProps> = ({
  players,
  currentTurnPlayerId,
  leadPlayerId,
  gameNumber,
  betAmount,
  isDealing,
  dealtCounts,
  aiHint,
  isHumanTurn = false,
  aiHintEnabled = true,
  isOpen: isOpenProp,
  onToggle: onToggleProp
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(true);
  const isOpen = isOpenProp !== undefined ? isOpenProp : internalOpen;
  const handleToggle = onToggleProp || (() => setInternalOpen(prev => !prev));

  const { t } = useI18n();
  const profileElo = useUserStore(s => s.profile.elo);
  const ecosystemBots = useEcosystemStore(state => state.bots);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const winners = useGameStore(s => s.winners);

  return (
    <div
      className={`left-match-hud-container ${isOpen ? '' : 'collapsed'}`}
      style={{
        top: '50%',
        left: '12px',
        transform: isOpen ? 'translateY(-50%)' : 'translate(calc(-100% + 36px), -50%)'
      }}
    >
      {/* KHỐI NỘI DUNG PANEL TRÁI (BẢNG THỐNG KÊ + TRỢ LÝ AI) */}
      <div 
        className="flex flex-col gap-2.5 max-h-[88vh] overflow-y-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* BẢNG TABLE HUD CHÍNH */}
        <div className="w-[280px] sm:w-[310px] bg-[var(--bg-container)] border border-[var(--border-container)] rounded-2xl shadow-2xl p-3 text-[var(--text-primary)] flex flex-col gap-2.5">
          {/* Header HUD */}
          <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2 px-0.5">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[var(--color-gold)]" />
              <span className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">
                {t('hud.gameNumber', { number: gameNumber })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="gold" size="sm">
                <Coins className="w-3.5 h-3.5 text-[#0a0c0e]" />
                <span>{betAmount.toLocaleString()} {t('common.coins')}</span>
              </Badge>
              <button
                onClick={handleToggle}
                className="p-1 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--color-gold)] transition-colors cursor-pointer"
                title={t('hud.collapseHud')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* BẢNG TABLE KẺ CỘT */}
        <div className="overflow-hidden rounded-xl border border-[var(--border-container)] bg-[var(--bg-canvas)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-card)] text-[var(--text-primary)] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-[var(--border-container)]">
                <th className="py-2 px-2.5 border-r border-[var(--border-container)]">{t('hud.colPlayer')}</th>
                <th className="py-2 px-2 text-center border-r border-[var(--border-container)] w-16">{t('hud.colCards')}</th>
                <th className="py-2 px-2.5 text-right w-18">{t('hud.colScore')}</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold divide-y divide-white/5">
              {players.map((p) => {
                const isTurn = !isDealing && currentTurnPlayerId === p.id;
                const isLeader = leadPlayerId === p.id;
                const isMe = p.id === myPlayerId;
                const cardCount = isDealing 
                  ? (dealtCounts[p.id] ?? 0) 
                  : p.cardCount;
                const rankIndex = winners.findIndex(w => w.id === p.id);
                const rankPosition = rankIndex >= 0 ? rankIndex + 1 : 0;
                const isOneCardLeft = !isDealing && cardCount === 1 && rankPosition === 0;
                const cfg = p.isBot 
                  ? (isBotConfig(p.customBotConfig) ? p.customBotConfig : getBotConfig(p.botPersonaId, p.customBotConfig)) 
                  : null;
                const liveBot = p.isBot ? ecosystemBots.find(b => b.id === p.botPersonaId || b.id === p.id || b.name === p.name) : null;
                const displayElo = isMe ? profileElo : (liveBot ? liveBot.elo : (cfg ? cfg.elo : 1000));

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors duration-150 ${
                      isTurn
                        ? 'bg-[var(--bg-card-active)] font-bold border-l-2 border-l-[var(--color-gold)]'
                        : p.isPassedCurrentRound
                        ? 'bg-[var(--bg-canvas)] opacity-40'
                        : 'bg-[var(--bg-container)]/50'
                    }`}
                  >
                    {/* Cột 1: Thông tin người chơi & Trạng thái */}
                    <td className="py-2 px-2.5 border-r border-[var(--border-container)]">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <span className="text-sm">{p.avatar || (p.isBot ? '🤖' : '🤠')}</span>
                          {isLeader && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-gold)] text-[#0a0c0e] text-[7px] font-black px-0.5 rounded-full shadow">
                              👑
                            </span>
                          )}
                        </div>

                        {/* Tên & Tag */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`truncate text-xs ${isMe ? 'text-[var(--color-gold)] font-bold' : 'text-[var(--text-primary)]'}`}>
                              {isMe ? `${p.name} ${t('hud.you')}` : p.name}
                            </span>
                          </div>

                          {/* Bậc Rank hoặc Trạng thái Bỏ Lượt */}
                          <div className="flex items-center gap-1 text-[9px]">
                            {p.isPassedCurrentRound ? (
                              <span className="text-red-400 font-bold">{t('hud.turnPassed')}</span>
                            ) : rankPosition > 0 ? (
                              <span className="text-[var(--color-gold)] font-bold">{t('hud.rankBadge', { rank: rankPosition })}</span>
                            ) : isTurn ? (
                              <span className="text-[var(--color-gold)] font-bold">{t('hud.turnPlaying')}</span>
                            ) : (
                              <span className="text-[var(--text-muted)] font-medium">{displayElo} Elo</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Số lá bài còn lại */}
                    <td className="py-2 px-2 text-center border-r border-[var(--border-container)] font-mono">
                      {rankPosition > 0 ? (
                        <Badge variant="gold" size="sm">#{rankPosition}</Badge>
                      ) : isOneCardLeft ? (
                        <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] animate-pulse">
                          {t('hud.oneCardAlert')}
                        </span>
                      ) : (
                        <span className={`text-xs font-bold ${cardCount <= 3 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                          {cardCount}
                        </span>
                      )}
                    </td>

                    {/* Cột 3: Điểm số / Xu */}
                    <td className="py-2 px-2.5 text-right font-mono text-[11px] text-[var(--text-secondary)]">
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

      {/* TRỢ LÝ AI (NGAY BÊN DƯỚI BẢNG HUD) */}
      {aiHintEnabled && (
        <AIAssistantMascot
          hint={aiHint || null}
          isHumanTurn={isHumanTurn}
          enabled={aiHintEnabled}
        />
      )}
      </div>

      {/* NÚT TAY CẦM MỞ / ĐÓNG HUD BÊN PHẢI PANEL */}
      <button
        onClick={handleToggle}
        className="flex flex-col items-center justify-center py-3 px-1.5 bg-[var(--bg-container)] border border-[var(--border-container)] rounded-r-xl shadow-2xl hover:bg-[var(--bg-card-active)] transition-all cursor-pointer select-none text-[var(--color-gold)] group z-50 ml-[-1px]"
        title={isOpen ? t('hud.collapseHud') : t('hud.expandMatchHud')}
      >
        <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform text-[var(--color-gold)]" />
        <span className="text-[9px] font-extrabold uppercase mt-1 [writing-mode:vertical-lr] tracking-widest text-[var(--text-primary)]">
          {isOpen ? t('hud.collapseHud') : t('hud.expandMatchHud')}
        </span>
        <div className="mt-1 text-[var(--text-muted)] group-hover:text-[var(--color-gold)]">
          {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>
    </div>
  );
};
