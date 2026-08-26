import React, { useState } from 'react';
import { PlayerProfile } from '../../engine/storage';
import { CAMPAIGN_CHAPTERS, CampaignChapter } from '../../engine/campaign';
import { Lock, CheckCircle2, Award, Swords, MapPin } from 'lucide-react';
import { Modal, Card, Badge, Button } from '../primitives';

interface CampaignMapModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onSelectChapter: (chapter: CampaignChapter) => void;
}

export const CampaignMapModal: React.FC<CampaignMapModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSelectChapter
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<number>(profile.campaignUnlockedChapter || 1);

  if (!isOpen) return null;

  const currentChapter = CAMPAIGN_CHAPTERS.find(c => c.id === selectedChapterId) || CAMPAIGN_CHAPTERS[0];
  const isUnlocked = selectedChapterId <= profile.campaignUnlockedChapter;
  const chapterWins = profile.campaignChapterWins[selectedChapterId] || 0;
  const isCompleted = chapterWins >= currentChapter.requiredWins;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bản Đồ Chiến Dịch Cốt Truyện"
      subtitle="Vượt qua các sới bạc lừng danh để trở thành Thần Bài Tối Thượng"
      icon={<MapPin className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="4xl"
      height="h-[92vh] sm:h-[680px]"
      headerRight={
        <Badge variant="gold" size="md">
          Tiến Độ: {profile.campaignUnlockedChapter}/5 Chương
        </Badge>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-muted)]">
            Điều kiện qua màn: <strong className="text-[var(--text-primary)]">Thắng {chapterWins}/{currentChapter.requiredWins} ván</strong>
          </span>

          <div className="flex items-center gap-2">
            <Button variant="surface" size="md" onClick={onClose}>
              Đóng
            </Button>
            <Button
              variant={isUnlocked ? 'gold' : 'surface'}
              size="md"
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onSelectChapter(currentChapter)}
              leftIcon={<Swords className="w-4 h-4" />}
            >
              <span>{isUnlocked ? 'Khiêu Chiến Ngay' : 'Chưa Mở Khóa'}</span>
            </Button>
          </div>
        </div>
      }
    >
      {/* BẢN ĐỒ 5 CHƯƠNG THEO HÀNG NGANG */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-4">
        {CAMPAIGN_CHAPTERS.map(ch => {
          const unlocked = ch.id <= profile.campaignUnlockedChapter;
          const isSelected = selectedChapterId === ch.id;
          const wins = profile.campaignChapterWins[ch.id] || 0;
          const done = wins >= ch.requiredWins;

          return (
            <button
              key={ch.id}
              onClick={() => setSelectedChapterId(ch.id)}
              className={`relative flex flex-col items-center p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-center ${
                isSelected
                  ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] shadow-md scale-105'
                  : unlocked
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
                {done ? (
                  <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                    Đã Vượt
                  </Badge>
                ) : unlocked ? (
                  <Badge variant="gold" size="sm">
                    {wins}/{ch.requiredWins}
                  </Badge>
                ) : (
                  <Badge variant="dark" size="sm" icon={<Lock className="w-3 h-3" />}>
                    Khóa
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
              <span className="text-xs text-[var(--text-muted)]">Tiền cược:</span>
              <Badge variant="gold" size="md">
                🪙 {currentChapter.betAmount.toLocaleString()} Xu
              </Badge>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
            {currentChapter.description}
          </p>

          {/* DANH SÁCH 3 BOT TRÙM TRONG CHƯƠNG */}
          <div className="mb-4">
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block mb-2">
              Danh Sách 3 Đối Thủ Trong Chương:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {currentChapter.bots.map(bot => (
                <div
                  key={bot.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-sm"
                >
                  <span className="text-2xl">{bot.avatar || '🤖'}</span>
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-[var(--text-primary)] truncate">
                      {bot.name || bot.tier || 'Bot'}
                    </h5>
                    <span className="text-[10px] text-[var(--color-gold)] font-bold block">
                      Elo {bot.elo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PHẦN THƯỞNG KHI HOÀN THÀNH CHƯƠNG */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--color-gold-border)] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <Award className="w-6 h-6 text-[var(--color-gold)] flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">Phần Thưởng Hoàn Thành:</span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Nhận ngay <strong className="text-[var(--color-gold)]">+{currentChapter.rewardCoins.toLocaleString()} Xu</strong>
                  {currentChapter.rewardTitle && (
                    <> + Danh hiệu <strong className="text-[var(--text-primary)]">"{currentChapter.rewardTitle}"</strong></>
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
    </Modal>
  );
};
