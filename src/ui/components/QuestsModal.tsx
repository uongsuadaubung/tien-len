import React, { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { Target, Award, Sparkles } from 'lucide-react';
import { Modal, Tabs, Card, Badge, Button } from '../primitives';

interface QuestsModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

type QuestTabType = 'DAILY' | 'ACHIEVEMENTS';

const questTabs = [
  { id: 'DAILY' as QuestTabType, label: 'Nhiệm Vụ Hàng Ngày (24h)', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'ACHIEVEMENTS' as QuestTabType, label: 'Thành Tựu Danh Hiệu', icon: <Award className="w-4 h-4" /> }
];

export const QuestsModal: React.FC<QuestsModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const [tab, setTab] = useState<QuestTabType>('DAILY');

  if (!isOpen) return null;

  const handleClaimQuest = (questId: string) => {
    const quest = profile.dailyQuests.find(q => q.id === questId);
    if (!quest || !quest.isCompleted || quest.isClaimed) return;

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + quest.rewardCoins,
      dailyQuests: profile.dailyQuests.map(q =>
        q.id === questId ? { ...q, isClaimed: true } : q
      )
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
  };

  const handleClaimAchievement = (achId: string) => {
    const ach = profile.achievements.find(a => a.id === achId);
    if (!ach || !ach.isCompleted || ach.isClaimed) return;

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + ach.rewardCoins,
      achievements: profile.achievements.map(a =>
        a.id === achId ? { ...a, isClaimed: true } : a
      )
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhiệm Vụ & Thành Tựu"
      subtitle="Hoàn thành thử thách để nhận thưởng hàng ngàn Xu"
      icon={<Target className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="2xl"
      height="h-[88vh] sm:h-[640px]"
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <Button variant="surface" size="md" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {/* TABS */}
      <Tabs
        options={questTabs}
        activeId={tab}
        onChange={(id) => setTab(id as QuestTabType)}
        className="mb-4"
      />

      {/* DANH SÁCH NHIỆM VỤ / THÀNH TỰU */}
      <div className="space-y-2.5">
        {tab === 'DAILY' ? (
          profile.dailyQuests.map((quest) => {
            const progressPct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

            return (
              <Card
                key={quest.id}
                variant="card"
                className="flex items-center justify-between p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)] flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                    {quest.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">{quest.title}</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{quest.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-28 sm:w-40 h-1.5 bg-[var(--bg-canvas)] rounded-full overflow-hidden border border-[var(--border-container)]">
                        <div
                          className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {quest.currentCount}/{quest.targetCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[var(--color-gold)] hidden sm:inline">
                    +{quest.rewardCoins.toLocaleString()} 🪙
                  </span>
                  {quest.isClaimed ? (
                    <Badge variant="dark" size="md">
                      Đã Nhận
                    </Badge>
                  ) : quest.isCompleted ? (
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleClaimQuest(quest.id)}
                    >
                      Nhận Thưởng
                    </Button>
                  ) : (
                    <Badge variant="neutral" size="md">
                      Chưa Xong
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          profile.achievements.map((ach) => {
            const progressPct = Math.min(100, Math.round((ach.currentCount / ach.targetCount) * 100));

            return (
              <Card
                key={ach.id}
                variant="card"
                className="flex items-center justify-between p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)] flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                    {ach.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">{ach.title}</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{ach.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-28 sm:w-40 h-1.5 bg-[var(--bg-canvas)] rounded-full overflow-hidden border border-[var(--border-container)]">
                        <div
                          className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {ach.currentCount}/{ach.targetCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[var(--color-gold)] hidden sm:inline">
                    +{ach.rewardCoins.toLocaleString()} 🪙
                  </span>
                  {ach.isClaimed ? (
                    <Badge variant="dark" size="md">
                      Đã Nhận
                    </Badge>
                  ) : ach.isCompleted ? (
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleClaimAchievement(ach.id)}
                    >
                      Nhận Thưởng
                    </Button>
                  ) : (
                    <Badge variant="neutral" size="md">
                      Chưa Xong
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Modal>
  );
};
