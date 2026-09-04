import React, { useState } from 'react';
import { Player } from '../../../engine/types';
import { getBotConfig } from '../../../ai/bot-factory';
import { Trophy, Coins } from 'lucide-react';
import { Badge } from '../../primitives';
import { MoveHint } from '../../../ai/hint-engine';
import { AIAssistantMascot } from '../../components/AIAssistantMascot';

import { BotConfig } from '../../../ai/types';
import { useUserStore } from '../../../stores/useUserStore';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';
import { useGameStore } from '../../../stores/useGameStore';
import { useI18n } from '../../../locales';

interface LeftMatchHUDProps {
  players: Player[];
  currentTurnPlayerId: string;
  leadPlayerId: string;
  gameNumber: number;
  betAmount: number;
  isDealing: boolean;
  dealtCounts: { [playerId: string]: number };
  aiHint: MoveHint | null;
  isHumanTurn: boolean;
  aiHintEnabled: boolean;
  customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>] | null;
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
  customBotConfigs
}) => {
  const [isOpen] = useState<boolean>(true);
  const { t } = useI18n();
  const { profile } = useUserStore();
  const ecosystemBots = useEcosystemStore(state => state.bots);
  const { myPlayerId } = useGameStore();

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
      <div className="w-[280px] sm:w-[310px] bg-[var(--bg-container)] border border-[var(--border-container)] rounded-2xl shadow-2xl p-3 text-[var(--text-primary)] flex flex-col gap-2.5">
        {/* Header HUD */}
        <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[var(--color-gold)]" />
            <span className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">
              {t('hud.gameNumber', { number: gameNumber })}
            </span>
          </div>
          <Badge variant="gold" size="sm">
            <Coins className="w-3.5 h-3.5 text-[#0a0c0e]" />
            <span>{betAmount.toLocaleString()} {t('common.coins')}</span>
          </Badge>
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
                  : (p.hand && p.hand.length > 0 ? p.hand.length : (dealtCounts[p.id] ?? 0));
                const isOneCardLeft = !isDealing && cardCount === 1 && !p.rankPosition;
                const botIdx = parseInt(p.id.replace('p', '')) - 1;
                const botOverride = customBotConfigs && botIdx >= 0 && botIdx < customBotConfigs.length ? customBotConfigs[botIdx] : undefined;
                const cfg = p.isBot ? getBotConfig(p.botPersonaId || 'BOT_ELO_1150', botOverride) : null;
                const liveBot = p.isBot ? ecosystemBots.find(b => b.id === p.botPersonaId || b.id === p.id || b.name === p.name) : null;
                const displayElo = isMe ? profile.elo : (liveBot?.elo ?? botOverride?.elo ?? cfg?.elo ?? 1000);

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
                            ) : p.rankPosition ? (
                              <span className="text-[var(--color-gold)] font-bold">{t('hud.rankBadge', { rank: p.rankPosition })}</span>
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
                      {p.rankPosition ? (
                        <Badge variant="gold" size="sm">#{p.rankPosition}</Badge>
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
  );
};
