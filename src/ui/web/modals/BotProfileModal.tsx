import React from 'react';
import { Modal, Card, Badge, Button } from '../../primitives';
import { BotEntity, getTierFromElo } from '../../../engine/ecosystem/ecosystem-types';
import { useI18n } from '../../../locales';
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
  const { t } = useI18n();
  if (!bot) return null;

  const tierInfo = getTierFromElo(bot.elo);

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
      subtitle={bot.title || t('botProfile.subtitleDefault')}
      icon={<span className="emoji-avatar text-xl">{bot.avatar}</span>}
      headerRight={
        <Badge variant={tierInfo.tierNum >= 4 ? 'gold' : 'neutral'} size="md">
          {tierInfo.rankBadge} {tierInfo.tier}
        </Badge>
      }
      footer={
        <div className="flex justify-end w-full">
          <Button variant="surface" onClick={onClose} size="sm">
            {t('common.close')}
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
              {bot.activityStatus === 'IN_MATCH' ? t('ecosystem.statusInMatch') : t('ecosystem.statusOnline')}
            </Badge>
          </div>
        </Card>

        {/* CHỈ SỐ CỐT LÕI (ELO, VỐN, PHONG ĐỘ) */}
        <div className="grid grid-cols-3 gap-2.5">
          <Card variant="nested" className="p-3 text-center border-[var(--color-gold-border)]">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1 font-semibold">
              <Trophy className="w-3.5 h-3.5 text-[var(--color-gold)]" /> {t('botProfile.eloPoints')}
            </span>
            <div className="text-lg font-black text-[var(--color-gold)] mt-1">{bot.elo}</div>
            <span className="text-[10px] text-[var(--text-muted)]">{t('botProfile.tierLabel', { num: tierInfo.tierNum, name: tierInfo.label })}</span>
          </Card>

          <Card variant="nested" className="p-3 text-center">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1 font-semibold">
              <Coins className="w-3.5 h-3.5 text-[var(--color-gold)]" /> {t('botProfile.capital')}
            </span>
            <div className="text-lg font-black text-[var(--text-primary)] mt-1">{bot.coins.toLocaleString()}</div>
            <span className="text-[10px] text-[var(--text-muted)]">{t('common.coins')}</span>
          </Card>

          <Card variant="nested" className="p-3 text-center">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1 font-semibold">
              {isStreakPositive ? <Flame className="w-3.5 h-3.5 text-orange-400" /> : <Snowflake className="w-3.5 h-3.5 text-[var(--color-sapphire-text)]" />} {t('botProfile.form')}
            </span>
            <div className={`text-lg font-black mt-1 ${isStreakPositive ? 'text-orange-400' : isStreakNegative ? 'text-[var(--color-sapphire-text)]' : 'text-[var(--text-muted)]'}`}>
              {isStreakPositive ? t('botProfile.winStreak', { count: bot.currentStreak }) : isStreakNegative ? t('botProfile.loseStreak', { count: -bot.currentStreak }) : t('botProfile.balancedStreak')}
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">{t('botProfile.recordStreak', { count: bot.highestStreak })}</span>
          </Card>
        </div>

        {/* THỐNG KÊ SỰ NGHIỆP */}
        <Card variant="card" className="p-3.5">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[var(--color-gold)]" /> {t('botProfile.statsTitle')}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border-container)]">
              <div className="text-[var(--text-muted)] text-[10px] font-semibold">{t('botProfile.gamesPlayed')}</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">{bot.stats.gamesPlayed}</div>
            </div>
            <div className="bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border-container)]">
              <div className="text-[var(--text-muted)] text-[10px] font-semibold">{t('botProfile.winRate')}</div>
              <div className="font-bold text-[var(--color-emerald-text)] mt-0.5">{winRate}%</div>
            </div>
            <div className="bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border-container)]">
              <div className="text-[var(--text-muted)] text-[10px] font-semibold">{t('botProfile.chopsDone')}</div>
              <div className="font-bold text-[var(--color-ruby-text)] mt-0.5">{bot.stats.chopsDone}</div>
            </div>
            <div className="bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border-container)]">
              <div className="text-[var(--text-muted)] text-[10px] font-semibold">{t('botProfile.congsInflicted')}</div>
              <div className="font-bold text-[var(--color-gold)] mt-0.5">{bot.stats.congsGiven}</div>
            </div>
          </div>
        </Card>

        {/* LỊCH SỬ ĐỐI ĐẦU TRỰC TIẾP VỚI BẠN (HEAD TO HEAD) */}
        <Card variant="nested" className="p-3.5 border-[var(--color-sapphire-border)]/50">
          <div className="text-xs font-bold text-[var(--color-sapphire-text)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-[var(--color-sapphire-text)]" /> {t('botProfile.headToHeadTitle')}
          </div>
          {h2h.games === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-2">
              {t('botProfile.noH2hYet', { name: bot.name })}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold px-3 py-2 bg-[var(--bg-input)] rounded-xl border border-[var(--border-container)]">
                <span className="text-[var(--color-emerald-text)] font-bold">{t('botProfile.h2hHumanWins')}: {h2h.humanWins}</span>
                <span className="text-[var(--text-dim)]">|</span>
                <span className="text-[var(--color-ruby-text)] font-bold">{t('botProfile.h2hBotWins', { name: bot.name })}: {h2h.botWins}</span>
                <span className="text-[var(--text-dim)]">|</span>
                <span className="text-[var(--text-muted)]">{t('botProfile.totalGames', { count: h2h.games })}</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[var(--text-muted)]">{t('botProfile.netProfitLoss')}</span>
                <span className={`font-bold flex items-center gap-1 ${
                  h2h.netCoinsEarnedFromHuman < 0 ? 'text-[var(--color-emerald-text)]' : h2h.netCoinsEarnedFromHuman > 0 ? 'text-[var(--color-ruby-text)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {h2h.netCoinsEarnedFromHuman < 0 ? (
                    <>+{( -h2h.netCoinsEarnedFromHuman ).toLocaleString()} {t('botProfile.youProfit')}</>
                  ) : h2h.netCoinsEarnedFromHuman > 0 ? (
                    <>-{h2h.netCoinsEarnedFromHuman.toLocaleString()} {t('botProfile.youLoss')}</>
                  ) : (
                    <>0 {t('botProfile.breakeven')}</>
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

