import React from 'react';
import { Modal } from '../primitives/Modal';
import { Card as UICard } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { BotEntity } from '../../engine/ecosystem/ecosystem-types';
import { 
  Trophy, 
  Coins, 
  Flame, 
  Snowflake, 
  Swords, 
  Shield, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Award,
  Activity
} from 'lucide-react';

interface BotProfileModalProps {
  isOpen: boolean;
  bot: BotEntity | null;
  onClose: () => void;
}

export const BotProfileModal: React.FC<BotProfileModalProps> = ({
  isOpen,
  bot,
  onClose
}) => {
  if (!bot) return null;

  const winRate = bot.stats.gamesPlayed > 0
    ? Math.round((bot.stats.wins / bot.stats.gamesPlayed) * 100)
    : 0;

  const h2h = bot.headToHeadVsHuman || {
    games: 0,
    botWins: 0,
    humanWins: 0,
    netCoinsEarnedFromHuman: 0
  };

  const isStreakPositive = bot.currentStreak > 0;
  const isStreakNegative = bot.currentStreak < 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      height="auto"
      title={
        <div className="flex items-center gap-2">
          <span className="text-2xl">{bot.avatar || '🤖'}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-[var(--text-primary)]">{bot.name}</span>
              <Badge variant={bot.tierNum >= 4 ? 'gold' : 'neutral'}>
                {bot.rankBadge} {bot.tier}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{bot.title || 'Đối thủ Sới Bạc'}</p>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end w-full">
          <Button variant="surface" onClick={onClose} size="sm">
            Đóng Thẻ
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-1">
        {/* MÔ TẢ & TÍNH CÁCH */}
        <UICard variant="card" className="p-3 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl">
          <p className="text-xs text-[var(--text-secondary)] italic mb-2.5">
            "{bot.description}"
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bot.personalityTags?.map((tag, idx) => (
              <span 
                key={idx}
                className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                {tag}
              </span>
            ))}
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md flex items-center gap-1 ${
              bot.activityStatus === 'IN_MATCH' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' 
                : 'bg-slate-700/50 text-slate-300 border border-slate-600'
            }`}>
              <Activity className="w-3 h-3" />
              {bot.activityStatus === 'IN_MATCH' ? 'Đang Trong Trận' : 'Đang Nghỉ Ngơi'}
            </span>
          </div>
        </UICard>

        {/* CHỈ SỐ CỐT LÕI (ELO, VỐN, PHONG ĐỘ) */}
        <div className="grid grid-cols-3 gap-2.5">
          <UICard variant="nested" className="p-3 text-center bg-gradient-to-b from-amber-950/20 to-amber-900/10 border-amber-700/30">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Điểm Elo
            </span>
            <div className="text-lg font-black text-amber-300 mt-1">{bot.elo}</div>
            <span className="text-[10px] text-amber-400/80 font-medium">Bậc {bot.tierNum}</span>
          </UICard>

          <UICard variant="nested" className="p-3 text-center bg-gradient-to-b from-yellow-950/20 to-yellow-900/10 border-yellow-700/30">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> Tiền Vốn
            </span>
            <div className="text-lg font-black text-yellow-300 mt-1">{bot.coins.toLocaleString()}</div>
            <span className="text-[10px] text-[var(--text-muted)]">Xu sới bạc</span>
          </UICard>

          <UICard variant="nested" className="p-3 text-center bg-gradient-to-b from-rose-950/20 to-rose-900/10 border-rose-700/30">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1">
              {isStreakPositive ? <Flame className="w-3.5 h-3.5 text-orange-400" /> : <Snowflake className="w-3.5 h-3.5 text-cyan-400" />} Phong Độ
            </span>
            <div className={`text-lg font-black mt-1 ${isStreakPositive ? 'text-orange-400' : isStreakNegative ? 'text-cyan-400' : 'text-slate-400'}`}>
              {isStreakPositive ? `+${bot.currentStreak} Thắng` : isStreakNegative ? `${bot.currentStreak} Thua` : 'Cân Bằng'}
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Kỷ lục: {bot.highestStreak} ván</span>
          </UICard>
        </div>

        {/* THỐNG KÊ SỰ NGHIỆP */}
        <UICard variant="card" className="p-3 bg-[var(--bg-card)] border border-[var(--border-card)]">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" /> Thống Kê Sự Nghiệp
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
              <div className="text-[var(--text-muted)] text-[10px]">Tổng Ván</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">{bot.stats.gamesPlayed}</div>
            </div>
            <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
              <div className="text-[var(--text-muted)] text-[10px]">Tỉ Lệ Thắng</div>
              <div className="font-bold text-emerald-400 mt-0.5">{winRate}%</div>
            </div>
            <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
              <div className="text-[var(--text-muted)] text-[10px]">Chặt Heo</div>
              <div className="font-bold text-rose-400 mt-0.5">{bot.stats.chopsDone}</div>
            </div>
            <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
              <div className="text-[var(--text-muted)] text-[10px]">Cóng Gây Ra</div>
              <div className="font-bold text-amber-400 mt-0.5">{bot.stats.congsGiven}</div>
            </div>
          </div>
        </UICard>

        {/* LỊCH SỬ ĐỐI ĐẦU TRỰC TIẾP VỚI BẠN (HEAD TO HEAD) */}
        <UICard variant="card" className="p-3 bg-gradient-to-r from-purple-950/30 via-[var(--bg-card)] to-indigo-950/30 border border-purple-800/40">
          <div className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-purple-400" /> Mối Thù Sới Bạc (Đối Đầu Với Bạn)
          </div>
          {h2h.games === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-2">
              Bạn và {bot.name} chưa từng chạm trán trực tiếp ở bàn đấu nào.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold px-2 py-1.5 bg-purple-950/40 rounded-lg">
                <span className="text-emerald-400 font-bold">Bạn Thắng: {h2h.humanWins} ván</span>
                <span className="text-slate-400">|</span>
                <span className="text-rose-400 font-bold">Bot Thắng: {h2h.botWins} ván</span>
                <span className="text-slate-400">|</span>
                <span className="text-[var(--text-muted)]">Tổng: {h2h.games} ván</span>
              </div>
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-[var(--text-muted)]">Lãi / Lỗ Ròng Đối Đầu:</span>
                <span className={`font-black flex items-center gap-1 ${
                  h2h.netCoinsEarnedFromHuman < 0 ? 'text-emerald-400' : h2h.netCoinsEarnedFromHuman > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}>
                  {h2h.netCoinsEarnedFromHuman < 0 ? (
                    <>+{( -h2h.netCoinsEarnedFromHuman ).toLocaleString()} xu (Bạn Lời)</>
                  ) : h2h.netCoinsEarnedFromHuman > 0 ? (
                    <>-{h2h.netCoinsEarnedFromHuman.toLocaleString()} xu (Bạn Lỗ)</>
                  ) : (
                    <>0 xu (Hòa vốn)</>
                  )}
                </span>
              </div>
            </div>
          )}
        </UICard>
      </div>
    </Modal>
  );
};
