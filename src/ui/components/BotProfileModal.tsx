import React from 'react';
import { Modal, Card, Badge, Button } from '../primitives';
import { BotEntity } from '../../engine/ecosystem/ecosystem-types';
import { 
  Trophy, 
  Coins, 
  Flame, 
  Snowflake, 
  Swords, 
  Zap, 
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
      title={bot.name}
      subtitle={bot.title || 'Cao Thủ Sới Bạc'}
      icon={<span className="text-xl">{bot.avatar || '🤠'}</span>}
      headerRight={
        <Badge variant={bot.tierNum >= 4 ? 'gold' : 'neutral'} size="md">
          {bot.rankBadge} {bot.tier}
        </Badge>
      }
      footer={
        <div className="flex justify-end w-full">
          <Button variant="surface" onClick={onClose} size="sm">
            Đóng Hồ Sơ
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 py-1">
        {/* MÔ TẢ & TÍNH CÁCH */}
        <Card variant="card" className="p-3.5">
          <p className="text-xs text-[var(--text-secondary)] italic mb-2.5 leading-relaxed">
            "{bot.description}"
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bot.personalityTags?.map((tag, idx) => (
              <Badge key={idx} variant="gold" size="sm" icon={<Zap className="w-3 h-3" />}>
                {tag}
              </Badge>
            ))}
            <Badge 
              variant={bot.activityStatus === 'IN_MATCH' ? 'emerald' : 'dark'} 
              size="sm"
              icon={<Activity className={`w-3 h-3 ${bot.activityStatus === 'IN_MATCH' ? 'animate-pulse' : ''}`} />}
            >
              {bot.activityStatus === 'IN_MATCH' ? 'Đang Trong Bàn' : 'Trực Tuyến'}
            </Badge>
          </div>
        </Card>

        {/* CHỈ SỐ CỐT LÕI (ELO, VỐN, PHONG ĐỘ) */}
        <div className="grid grid-cols-3 gap-2.5">
          <Card variant="nested" className="p-3 text-center border-[var(--color-gold-border)]">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1 font-semibold">
              <Trophy className="w-3.5 h-3.5 text-[var(--color-gold)]" /> Điểm Elo
            </span>
            <div className="text-lg font-black text-[var(--color-gold)] mt-1">{bot.elo}</div>
            <span className="text-[10px] text-[var(--text-muted)]">Bậc {bot.tierNum}</span>
          </Card>

          <Card variant="nested" className="p-3 text-center">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1 font-semibold">
              <Coins className="w-3.5 h-3.5 text-[var(--color-gold)]" /> Tiền Vốn
            </span>
            <div className="text-lg font-black text-[var(--text-primary)] mt-1">{bot.coins.toLocaleString()}</div>
            <span className="text-[10px] text-[var(--text-muted)]">Xu</span>
          </Card>

          <Card variant="nested" className="p-3 text-center">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1 font-semibold">
              {isStreakPositive ? <Flame className="w-3.5 h-3.5 text-orange-400" /> : <Snowflake className="w-3.5 h-3.5 text-[var(--color-sapphire-text)]" />} Phong Độ
            </span>
            <div className={`text-lg font-black mt-1 ${isStreakPositive ? 'text-orange-400' : isStreakNegative ? 'text-[var(--color-sapphire-text)]' : 'text-[var(--text-muted)]'}`}>
              {isStreakPositive ? `+${bot.currentStreak} Thắng` : isStreakNegative ? `${bot.currentStreak} Thua` : 'Cân Bằng'}
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Kỷ lục: {bot.highestStreak} ván</span>
          </Card>
        </div>

        {/* THỐNG KÊ SỰ NGHIỆP */}
        <Card variant="card" className="p-3.5">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[var(--color-gold)]" /> Thống Kê Sự Nghiệp
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border-container)]">
              <div className="text-[var(--text-muted)] text-[10px] font-semibold">Tổng Ván</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">{bot.stats.gamesPlayed}</div>
            </div>
            <div className="bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border-container)]">
              <div className="text-[var(--text-muted)] text-[10px] font-semibold">Tỉ Lệ Thắng</div>
              <div className="font-bold text-[var(--color-emerald-text)] mt-0.5">{winRate}%</div>
            </div>
            <div className="bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border-container)]">
              <div className="text-[var(--text-muted)] text-[10px] font-semibold">Chặt Heo</div>
              <div className="font-bold text-[var(--color-ruby-text)] mt-0.5">{bot.stats.chopsDone}</div>
            </div>
            <div className="bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border-container)]">
              <div className="text-[var(--text-muted)] text-[10px] font-semibold">Cóng Gây Ra</div>
              <div className="font-bold text-[var(--color-gold)] mt-0.5">{bot.stats.congsGiven}</div>
            </div>
          </div>
        </Card>

        {/* LỊCH SỬ ĐỐI ĐẦU TRỰC TIẾP VỚI BẠN (HEAD TO HEAD) */}
        <Card variant="nested" className="p-3.5 border-[var(--color-sapphire-border)]/50">
          <div className="text-xs font-bold text-[var(--color-sapphire-text)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-[var(--color-sapphire-text)]" /> Lịch Sử Chạm Trán Với Bạn
          </div>
          {h2h.games === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-2">
              Bạn và {bot.name} chưa từng chạm trán ở bàn đấu nào.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold px-3 py-2 bg-[var(--bg-input)] rounded-xl border border-[var(--border-container)]">
                <span className="text-[var(--color-emerald-text)] font-bold">Bạn Thắng: {h2h.humanWins} ván</span>
                <span className="text-[var(--text-dim)]">|</span>
                <span className="text-[var(--color-ruby-text)] font-bold">Đối Thủ Thắng: {h2h.botWins} ván</span>
                <span className="text-[var(--text-dim)]">|</span>
                <span className="text-[var(--text-muted)]">Tổng: {h2h.games} ván</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[var(--text-muted)]">Lãi / Lỗ Ròng Đối Đầu:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  h2h.netCoinsEarnedFromHuman < 0 ? 'text-[var(--color-emerald-text)]' : h2h.netCoinsEarnedFromHuman > 0 ? 'text-[var(--color-ruby-text)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {h2h.netCoinsEarnedFromHuman < 0 ? (
                    <>+{( -h2h.netCoinsEarnedFromHuman ).toLocaleString()} Xu (Bạn Lời)</>
                  ) : h2h.netCoinsEarnedFromHuman > 0 ? (
                    <>-{h2h.netCoinsEarnedFromHuman.toLocaleString()} Xu (Bạn Lỗ)</>
                  ) : (
                    <>0 Xu (Hòa vốn)</>
                  )}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Modal>
  );
};

