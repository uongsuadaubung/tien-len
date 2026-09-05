import React from 'react';
import { CampaignChapter } from '../../../engine/campaign';
import { Lock, CheckCircle2, Award, Swords, MapPin, Eye } from 'lucide-react';
import { Card, Badge, Button } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { useCampaign } from '../../hooks/useCampaign';
import { useI18n } from '../../../locales';

export interface MobileCampaignMapViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChapter: (chapter: CampaignChapter) => void;
}

export const MobileCampaignMapView: React.FC<MobileCampaignMapViewProps> = ({
  isOpen,
  onClose,
  onSelectChapter
}) => {
  const {
    setSelectedChapterId,
    currentChapter,
    chapters,
    unlockedChapterCount,
    totalChaptersCount,
    isUnlocked,
    chapterWins,
    isCompleted,
    getChapterStatus,
    handleOpenBossProfile,
    handleStartChapter
  } = useCampaign({ onSelectChapter, initialChapterId: null });
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t('campaign.mapTitle')}
      subtitle={t('campaign.mapSubtitle')}
      icon={<MapPin className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={
        <Badge variant="gold" size="md">
          {t('campaign.progress', { unlocked: unlockedChapterCount, total: totalChaptersCount })}
        </Badge>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-2 text-xs">
          <span className="text-xs text-[var(--text-muted)] truncate">
            {t('campaign.condition')} <strong className="text-[var(--text-primary)]">{t('campaign.conditionDetail', { wins: chapterWins, required: currentChapter.requiredWins })}</strong>
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={isUnlocked ? 'gold' : 'surface'}
              size="md"
              disabled={!isUnlocked}
              onClick={() => handleStartChapter(currentChapter)}
              leftIcon={<Swords className="w-4 h-4" />}
            >
              <span>{isCompleted ? t('campaign.replayChapter') : isUnlocked ? t('campaign.challengeNow') : t('campaign.locked')}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pb-4 select-none">
        {/* BẢN ĐỒ 9 CHƯƠNG DẠNG TRACK CUỘN NGANG */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-thin">
          {chapters.map(ch => {
            const status = getChapterStatus(ch.id);

            return (
              <button
                key={ch.id}
                onClick={() => setSelectedChapterId(ch.id)}
                className={`relative flex flex-col items-center flex-shrink-0 w-[105px] sm:w-[125px] p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-center ${
                  status.isSelected
                    ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] shadow-lg scale-105 z-10'
                    : status.unlocked
                    ? 'bg-[var(--bg-card)] border-[var(--border-card)] hover:border-[var(--border-gold)] hover:bg-[var(--bg-card-hover)]'
                    : 'bg-[var(--bg-container)] border-white/5 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-1">{ch.icon}</div>
                <h4 className="font-bold text-xs text-[var(--text-primary)] truncate w-full">
                  {ch.name}
                </h4>
                <span className="text-[10px] text-[var(--text-muted)] truncate w-full">
                  {ch.venueName}
                </span>

                {/* Huy hiệu */}
                <div className="mt-2">
                  {status.isCompleted ? (
                    <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                      {t('campaign.completed')}
                    </Badge>
                  ) : status.unlocked ? (
                    <Badge variant="gold" size="sm">
                      {status.wins}/{status.requiredWins}
                    </Badge>
                  ) : (
                    <Badge variant="dark" size="sm" icon={<Lock className="w-3 h-3" />}>
                      {t('campaign.locked')}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* CHI TIẾT CHƯƠNG ĐANG CHỌN */}
        <Card variant="container" className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[11px] font-bold text-[var(--color-gold)] uppercase tracking-wider">
                  {currentChapter.name}: {currentChapter.subtitle}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-0.5">
                  {currentChapter.venueName}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">{t('campaign.betAmountLabel')}</span>
                <Badge variant="gold" size="md">
                  🪙 {currentChapter.betAmount.toLocaleString()} {t('common.coins')}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              {currentChapter.description}
            </p>

            {/* DANH SÁCH 3 BOT TRÙM TRONG CHƯƠNG */}
            <div className="mb-4">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block mb-2">
                {t('campaign.bossListTitle')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {currentChapter.bots.slice(0, 3).map((bot, idx) => (
                  <div
                    key={`ch_${currentChapter.id}_bot_${bot.id}_${idx}`}
                    onClick={() => handleOpenBossProfile(bot)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--color-gold-border)] transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{bot.avatar}</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-[var(--text-primary)] truncate">
                          {bot.name}
                        </h5>
                        <span className="text-[10px] text-[var(--color-gold)] font-bold block">
                          Elo {bot.elo}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="surface"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] shrink-0 opacity-80 group-hover:opacity-100 font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBossProfile(bot);
                      }}
                      leftIcon={<Eye className="w-3 h-3 text-[var(--color-gold)]" />}
                    >
                      {t('campaign.profile')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* PHẦN THƯỞNG KHI HOÀN THÀNH CHƯƠNG */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--color-gold-border)] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <Award className="w-6 h-6 text-[var(--color-gold)] flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{t('campaign.rewardTitle')}</span>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    <strong className="text-[var(--color-gold)]">{t('campaign.rewardCoins', { amount: currentChapter.rewardCoins.toLocaleString() })}</strong>
                    {currentChapter.rewardTitle && (
                      <span className="text-[var(--text-primary)]">{t('campaign.rewardTitleSuffix', { title: currentChapter.rewardTitle })}</span>
                    )}
                  </p>
                </div>
              </div>

              <Badge variant="gold" size="md">
                +{currentChapter.rewardCoins.toLocaleString()} 🪙
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </MobileScreenWrapper>
  );
};
