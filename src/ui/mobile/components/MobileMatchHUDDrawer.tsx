import React from 'react';
import { Player } from '../../../engine/types';
import { getBotConfig } from '../../../ai/bot-factory';
import { Trophy, Coins, X, Swords, Crown, ShieldAlert, Ban, AlertTriangle, Sparkles, Bot, Check } from 'lucide-react';
import { Badge, Button } from '../../primitives';
import { MoveHint, HintType } from '../../../ai/hint-engine';
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
  aiHint: MoveHint | null;
  isHumanTurn: boolean;
  aiHintEnabled: boolean;
  onApplyHint: (() => void) | null;
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
  aiHint,
  isHumanTurn,
  aiHintEnabled,
  onApplyHint,
  customBotConfigs
}) => {
  const { profile } = useUserStore();
  const ecosystemBots = useEcosystemStore(state => state.bots);

  if (!isOpen) return null;

  const getThemeConfig = (type: HintType | null) => {
    switch (type) {
      case 'DANGER_WARNING':
        return {
          badgeBg: 'bg-rose-500/20 border-rose-500/50 text-rose-400',
          bubbleBorder: 'border-rose-500/50 shadow-rose-500/10',
          titleColor: 'text-rose-400',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
        };
      case 'TACTICAL_PASS':
        return {
          badgeBg: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
          bubbleBorder: 'border-blue-500/40 shadow-blue-500/10',
          titleColor: 'text-blue-400',
          icon: <ShieldAlert className="w-4 h-4 text-blue-400" />
        };
      case 'FORCED_PASS':
        return {
          badgeBg: 'bg-zinc-700/40 border-zinc-600/50 text-zinc-300',
          bubbleBorder: 'border-zinc-700/60 shadow-black/40',
          titleColor: 'text-zinc-300',
          icon: <Ban className="w-4 h-4 text-zinc-400" />
        };
      case 'WIN_OPPORTUNITY':
        return {
          badgeBg: 'bg-amber-500/20 border-amber-400/60 text-amber-300',
          bubbleBorder: 'border-amber-400/60 shadow-amber-500/20',
          titleColor: 'text-amber-300',
          icon: <Crown className="w-4 h-4 text-amber-300 animate-bounce" />
        };
      case 'LEAD_OPENING':
        return {
          badgeBg: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
          bubbleBorder: 'border-emerald-500/40 shadow-emerald-500/10',
          titleColor: 'text-emerald-300',
          icon: <Sparkles className="w-4 h-4 text-emerald-300" />
        };
      case 'BEAT_MOVE':
      default:
        return {
          badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
          bubbleBorder: 'border-amber-500/40 shadow-amber-500/10',
          titleColor: 'text-[var(--color-gold)]',
          icon: <Swords className="w-4 h-4 text-[var(--color-gold)]" />
        };
    }
  };

  const hintTheme = getThemeConfig(aiHint ? aiHint.type : null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-2 sm:p-4 select-none">
      {/* Vùng bấm ra ngoài để đóng */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Tấm Bottom Sheet Drawer chính */}
      <div 
        className="relative z-10 w-full max-w-lg bg-[var(--bg-container)] border border-[var(--border-container)] rounded-3xl shadow-2xl p-4 text-[var(--text-primary)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Thanh cầm kéo / Header Drawer */}
        <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--color-gold)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Bảng Điểm Ván #{gameNumber}
              </h3>
              <span className="text-[11px] text-[var(--text-muted)]">
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
              className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BẢNG ĐIỂM NGƯỜI CHƠI */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border-container)] bg-[var(--bg-canvas)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-card)] text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-wider border-b border-[var(--border-container)]">
                <th className="py-2 px-3 border-r border-[var(--border-container)]">Người Chơi</th>
                <th className="py-2 px-2 text-center border-r border-[var(--border-container)] w-16">Bài Còn</th>
                <th className="py-2 px-3 text-right w-20">Điểm / Xu</th>
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
                        ? 'bg-[var(--bg-card-active)] font-bold border-l-4 border-l-[var(--color-gold)]'
                        : p.isPassedCurrentRound
                        ? 'bg-[var(--bg-canvas)] opacity-40'
                        : 'bg-[var(--bg-container)]/50'
                    }`}
                  >
                    {/* Người chơi */}
                    <td className="py-2.5 px-3 border-r border-[var(--border-container)]">
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <span className="text-base">{p.avatar || '🤖'}</span>
                          {isLeader && (
                            <span className="absolute -top-1 -right-1 bg-[var(--color-gold)] text-[#0a0c0e] text-[8px] font-black px-0.5 rounded-full shadow">
                              👑
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`truncate text-xs ${
                              isHuman ? 'text-[var(--color-gold)] font-bold' : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {p.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {p.isPassedCurrentRound ? (
                              <span className="text-red-400 font-bold">Bỏ Lượt</span>
                            ) : p.rankPosition ? (
                              <span className="text-[var(--color-gold)] font-bold">Về #{p.rankPosition}</span>
                            ) : isTurn ? (
                              <span className="text-[var(--color-gold)] font-bold">Đang Đánh</span>
                            ) : (
                              `${displayElo} Elo`
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Số lá bài */}
                    <td className="py-2.5 px-2 text-center border-r border-[var(--border-container)] font-mono">
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
                            cardCount <= 3 ? 'text-amber-400 font-black' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {cardCount}
                        </span>
                      )}
                    </td>

                    {/* Điểm số */}
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-[var(--text-secondary)]">
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

        {/* QUÂN SƯ THẦN BÀI (AI ASSISTANT) */}
        {aiHintEnabled && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-3 flex flex-col gap-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-wide">
                    Quân Sư Thần Bài
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {isHumanTurn ? 'Lời khuyên chiến thuật' : 'Đang phân tích thế trận...'}
                  </span>
                </div>
              </div>

              {isHumanTurn && aiHint && (
                <div className={`p-1 px-2 rounded border text-[10px] font-bold flex items-center gap-1 ${hintTheme.badgeBg}`}>
                  {hintTheme.icon}
                  <span>{aiHint.title}</span>
                </div>
              )}
            </div>

            {isHumanTurn && aiHint ? (
              <div className="flex flex-col gap-2 bg-[var(--bg-canvas)]/80 p-2.5 rounded-xl border border-white/5">
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                  {aiHint.message}
                </p>

                {aiHint.cards && aiHint.cards.length > 0 && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--color-gold)]">
                      <span>Nước đi:</span>
                      <strong>{aiHint.cards.map(c => `${c.rank}${c.suit[0]}`).join(', ')}</strong>
                    </div>

                    {onApplyHint && (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => {
                          onApplyHint();
                          onClose();
                        }}
                        leftIcon={<Check className="w-3.5 h-3.5 text-[#0a0c0e]" />}
                      >
                        Chọn Hộ Tôi
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)] italic text-center py-1">
                {isHumanTurn
                  ? 'Chưa có lời khuyên cụ thể cho lượt này.'
                  : 'Hãy quan sát các đối thủ đánh bài để đón đầu nước đi.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
