import React from 'react';
import { PlayerProfile } from '../../../engine/storage';
import { DAILY_MILESTONES } from '../../../engine/quests';
import { Target, Award, Sparkles, Clock, CheckCircle, Gift, Layers, Flame, Trophy, Coins, Star } from 'lucide-react';
import { Modal, Tabs, Card, Badge, Button } from '../../primitives';
import { useQuests, QuestTabType, AchievementCategoryFilter } from '../../hooks/useQuests';

export interface QuestsModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

interface AchievementCategoryTab {
  id: AchievementCategoryFilter;
  label: string;
  icon: React.ReactNode;
}

const achievementCategoryTabs: AchievementCategoryTab[] = [
  { id: 'ALL', label: 'Tất Cả', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'CHOP', label: 'Chém Heo & Hàng', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'VICTORY', label: 'Chiến Thắng', icon: <Trophy className="w-3.5 h-3.5" /> },
  { id: 'WEALTH', label: 'Tài Sản & Đại Gia', icon: <Coins className="w-3.5 h-3.5" /> },
  { id: 'SPECIAL', label: 'Kỳ Tích & Elo', icon: <Star className="w-3.5 h-3.5" /> }
];

interface QuestTab {
  id: QuestTabType;
  label: string;
  icon: React.ReactNode;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const {
    tab,
    setTab,
    achCategory,
    setAchCategory,
    completedDailyCount,
    completedAchCount,
    dailyUnclaimedCount,
    achUnclaimedCount,
    currentTabClaimableCoins,
    hasCurrentTabClaimable,
    sortedDailyQuests,
    sortedAchievements,
    handleClaimQuest,
    handleClaimAchievement,
    handleClaimMilestone,
    handleClaimAllCurrentTab
  } = useQuests({ profile, onUpdateProfile });

  if (!isOpen) return null;

  // Tabs có hiển thị số lượng phần thưởng đang chờ nhận
  const questTabs: QuestTab[] = [
    { 
      id: 'DAILY', 
      label: `Nhiệm Vụ Hàng Ngày (5 Mục / 24h)${dailyUnclaimedCount > 0 ? ` [${dailyUnclaimedCount}]` : ''}`, 
      icon: <Sparkles className="w-4 h-4" /> 
    },
    { 
      id: 'ACHIEVEMENTS', 
      label: `Thành Tựu Danh Hiệu${achUnclaimedCount > 0 ? ` [${achUnclaimedCount}]` : ''}`, 
      icon: <Award className="w-4 h-4" /> 
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhiệm Vụ & Thành Tựu"
      subtitle="Hoàn thành các thử thách đa dạng để tích lũy hàng triệu Xu thưởng"
      icon={<Target className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="2xl"
      height="h-[90vh] sm:h-[680px]"
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)] truncate">
            {tab === 'DAILY' 
              ? `Tiến độ: ${completedDailyCount}/5 Nhiệm Vụ Hoàn Thành`
              : `Thành Tựu: ${completedAchCount}/${profile.achievements.length} Mốc`
            }
          </div>

          <div className="flex items-center gap-2">
            {hasCurrentTabClaimable && (
              <Button
                variant="gold"
                size="md"
                onClick={handleClaimAllCurrentTab}
                leftIcon={<Gift className="w-4 h-4 text-[#0a0c0e]" />}
              >
                <span>Nhận Tất Cả (+{currentTabClaimableCoins.toLocaleString()} Xu)</span>
              </Button>
            )}
            <Button variant="surface" size="md" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      {/* TABS CHÍNH */}
      <Tabs
        options={questTabs}
        activeId={tab}
        onChange={(id) => {
          if (id === 'DAILY' || id === 'ACHIEVEMENTS') {
            setTab(id);
          }
        }}
        className="mb-3"
      />

      {/* NỘI DUNG TAB 1: NHIỆM VỤ NGÀY & HÒM CỘT MỐC */}
      {tab === 'DAILY' && (
        <div className="space-y-3 mb-2">
          {/* THANH CỘT MỐC HÒM THƯỞNG NGÀY (DAILY MILESTONE CHESTS) */}
          <Card variant="container" className="p-3 bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-container)] border-[var(--color-gold-border)]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-[var(--color-gold)]" />
                <span>Hòm Thưởng Cột Mốc Ngày ({completedDailyCount}/5 Nhiệm Vụ)</span>
              </span>
              <span className="text-[11px] text-[var(--color-gold)] flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Làm mới 00:00</span>
              </span>
            </div>

            {/* CÁC MỐC HÒM THƯỞNG */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {DAILY_MILESTONES.map((milestone) => {
                const isReached = completedDailyCount >= milestone.requiredCount;
                const isClaimed = !!profile.dailyMilestonesClaimed[milestone.requiredCount];

                return (
                  <div
                    key={milestone.requiredCount}
                    className={`relative p-2 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                      isClaimed
                        ? 'bg-[var(--bg-canvas)]/40 border-[var(--border-container)] opacity-60'
                        : isReached
                        ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)] shadow-md animate-pulse'
                        : 'bg-[var(--bg-canvas)]/60 border-[var(--border-container)]'
                    }`}
                  >
                    <span className="text-xl my-0.5">{milestone.icon}</span>
                    <span className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">
                      Mốc {milestone.requiredCount}/5
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--color-gold)] my-0.5">
                      +{milestone.rewardCoins.toLocaleString()} Xu
                    </span>

                    {isClaimed ? (
                      <Badge variant="dark" size="sm" icon={<CheckCircle className="w-3 h-3 text-emerald-400" />}>
                        Đã Nhận
                      </Badge>
                    ) : isReached ? (
                      <Button
                        variant="gold"
                        size="sm"
                        className="w-full py-1 text-[10px] font-bold"
                        onClick={() => handleClaimMilestone(milestone)}
                      >
                        Mở Hòm
                      </Button>
                    ) : (
                      <span className="text-[9px] text-[var(--text-muted)] font-medium">
                        Cần {milestone.requiredCount} NV
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* BANNER THÔNG BÁO CHO TAB NHIỆM VỤ NGÀY */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
            <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
              <span>🎯</span>
              <span>5 nhiệm vụ ngẫu nhiên hôm nay:</span>
            </span>
          </div>

          {/* DANH SÁCH 5 NHIỆM VỤ NGÀY (ĐÃ SẮP XẾP) */}
          <div className="space-y-2">
            {sortedDailyQuests.map((quest) => {
              const progressPct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

              return (
                <Card
                  key={quest.id}
                  variant="card"
                  className={`flex items-center justify-between p-3 transition-all ${
                    quest.isCompleted && !quest.isClaimed
                      ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5 shadow-sm'
                      : ''
                  }`}
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
                          {quest.currentCount.toLocaleString()}/{quest.targetCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--color-gold)] hidden sm:inline">
                      +{quest.rewardCoins.toLocaleString()} 🪙
                    </span>
                    {quest.isClaimed ? (
                      <Badge variant="dark" size="md" icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}>
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
            })}
          </div>
        </div>
      )}

      {/* NỘI DUNG TAB 2: THÀNH TỰU DANH HIỆU */}
      {tab === 'ACHIEVEMENTS' && (
        <div className="space-y-2.5">
          {/* BỘ LỌC PHÂN LOẠI THÀNH TỰU */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {achievementCategoryTabs.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setAchCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  achCategory === cat.id
                    ? 'bg-[var(--color-gold)] text-[#0a0c0e] shadow-sm'
                    : 'bg-[var(--bg-container)] text-[var(--text-secondary)] border border-[var(--border-container)] hover:border-[var(--color-gold-border)]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* DANH SÁCH THÀNH TỰU ĐÃ LỌC & SẮP XẾP */}
          <div className="space-y-2">
            {sortedAchievements.map((ach) => {
              const progressPct = Math.min(100, Math.round((ach.currentCount / ach.targetCount) * 100));

              return (
                <Card
                  key={ach.id}
                  variant="card"
                  className={`flex items-center justify-between p-3 transition-all ${
                    ach.isCompleted && !ach.isClaimed
                      ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5 shadow-sm'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)] flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                      {ach.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">{ach.title}</h4>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-container)] border border-[var(--border-container)] text-[var(--text-muted)] uppercase font-mono">
                          {ach.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{ach.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-28 sm:w-40 h-1.5 bg-[var(--bg-canvas)] rounded-full overflow-hidden border border-[var(--border-container)]">
                          <div
                            className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          {ach.currentCount.toLocaleString()}/{ach.targetCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--color-gold)] hidden sm:inline">
                      +{ach.rewardCoins.toLocaleString()} 🪙
                    </span>
                    {ach.isClaimed ? (
                      <Badge variant="dark" size="md" icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}>
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
            })}
          </div>
        </div>
      )}
    </Modal>
  );
};
