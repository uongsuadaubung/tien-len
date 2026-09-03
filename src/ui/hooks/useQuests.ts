import { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { DAILY_MILESTONES, DailyMilestoneReward, Quest, Achievement } from '../../engine/quests';
import { soundManager } from '../audio/sound-manager';
import confetti from 'canvas-confetti';

import { useUserStore } from '../../stores/useUserStore';

export type QuestTabType = 'DAILY' | 'ACHIEVEMENTS';
export type AchievementCategoryFilter = 'ALL' | 'CHOP' | 'VICTORY' | 'WEALTH' | 'SPECIAL';

export interface UseQuestsResult {
  tab: QuestTabType;
  setTab: (tab: QuestTabType) => void;
  achCategory: AchievementCategoryFilter;
  setAchCategory: (category: AchievementCategoryFilter) => void;
  completedDailyCount: number;
  completedAchCount: number;
  dailyUnclaimedCount: number;
  achUnclaimedCount: number;
  currentTabClaimableCoins: number;
  hasCurrentTabClaimable: boolean;
  sortedDailyQuests: readonly Quest[];
  sortedAchievements: readonly Achievement[];
  handleClaimQuest: (questId: string) => void;
  handleClaimAchievement: (achId: string) => void;
  handleClaimMilestone: (milestone: DailyMilestoneReward) => void;
  handleClaimAllCurrentTab: () => void;
}

function getQuestSortWeight(item: { isCompleted: boolean; isClaimed: boolean }): number {
  if (item.isCompleted && !item.isClaimed) return 0;
  if (!item.isCompleted) return 1;
  return 2;
}

export function useQuests(): UseQuestsResult {
  const { profile, setProfile: onUpdateProfile } = useUserStore();
  const [tab, setTab] = useState<QuestTabType>('DAILY');
  const [achCategory, setAchCategory] = useState<AchievementCategoryFilter>('ALL');

  const completedDailyCount = profile.dailyQuests.filter(q => q.isCompleted).length;
  const completedAchCount = profile.achievements.filter(a => a.isCompleted).length;

  // 1. Tính toán riêng cho Tab Nhiệm Vụ Ngày (Quests + Milestones)
  const unclaimedDailyQuests = profile.dailyQuests.filter(q => q.isCompleted && !q.isClaimed);
  const claimableMilestones = DAILY_MILESTONES.filter(m => {
    const isReached = completedDailyCount >= m.requiredCount;
    const isClaimed = !!profile.dailyMilestonesClaimed[m.requiredCount];
    return isReached && !isClaimed;
  });

  const dailyTabClaimableCoins = 
    unclaimedDailyQuests.reduce((sum, q) => sum + q.rewardCoins, 0) +
    claimableMilestones.reduce((sum, m) => sum + m.rewardCoins, 0);

  const dailyUnclaimedCount = unclaimedDailyQuests.length + claimableMilestones.length;

  // 2. Tính toán riêng cho Tab Thành Tựu
  const unclaimedAchievements = profile.achievements.filter(a => a.isCompleted && !a.isClaimed);
  const achTabClaimableCoins = unclaimedAchievements.reduce((sum, a) => sum + a.rewardCoins, 0);
  const achUnclaimedCount = unclaimedAchievements.length;

  // 3. Xu có thể nhận của đúng Tab đang mở
  const currentTabClaimableCoins = tab === 'DAILY' ? dailyTabClaimableCoins : achTabClaimableCoins;
  const hasCurrentTabClaimable = currentTabClaimableCoins > 0;

  // Sắp xếp Nhiệm Vụ Ngày
  const sortedDailyQuests = [...profile.dailyQuests].sort((a, b) => {
    const weightA = getQuestSortWeight(a);
    const weightB = getQuestSortWeight(b);
    if (weightA !== weightB) return weightA - weightB;
    if (!a.isCompleted && !b.isCompleted) {
      const pctA = a.currentCount / a.targetCount;
      const pctB = b.currentCount / b.targetCount;
      return pctB - pctA;
    }
    return 0;
  });

  // Lọc danh sách thành tựu theo danh mục & Sắp xếp hoàn thành lên đầu
  const filteredAchievements = profile.achievements.filter(ach => {
    if (achCategory === 'ALL') return true;
    return ach.category === achCategory;
  });

  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    const weightA = getQuestSortWeight(a);
    const weightB = getQuestSortWeight(b);
    if (weightA !== weightB) return weightA - weightB;
    if (!a.isCompleted && !b.isCompleted) {
      const pctA = a.currentCount / a.targetCount;
      const pctB = b.currentCount / b.targetCount;
      return pctB - pctA;
    }
    return 0;
  });

  // Nhận lẻ 1 nhiệm vụ ngày
  const handleClaimQuest = (questId: string) => {
    const quest = profile.dailyQuests.find(q => q.id === questId);
    if (!quest || !quest.isCompleted || quest.isClaimed) return;

    soundManager.playVictory();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });

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

  // Nhận lẻ 1 thành tựu
  const handleClaimAchievement = (achId: string) => {
    const ach = profile.achievements.find(a => a.id === achId);
    if (!ach || !ach.isCompleted || ach.isClaimed) return;

    soundManager.playVictory();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

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

  // Nhận Hòm Cột Mốc Ngày
  const handleClaimMilestone = (milestone: DailyMilestoneReward) => {
    if (completedDailyCount < milestone.requiredCount) return;
    if (profile.dailyMilestonesClaimed[milestone.requiredCount]) return;

    soundManager.playVictory();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 }
    });

    const updatedMilestones = {
      ...profile.dailyMilestonesClaimed,
      [milestone.requiredCount]: true
    };

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + milestone.rewardCoins,
      dailyMilestonesClaimed: updatedMilestones
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
  };

  // Nhận Tất Cả Thưởng theo Tab hiện tại
  const handleClaimAllCurrentTab = () => {
    if (!hasCurrentTabClaimable) return;

    soundManager.playVictory();
    confetti({
      particleCount: 160,
      spread: 100,
      origin: { y: 0.5 }
    });

    if (tab === 'DAILY') {
      let extraCoins = 0;

      // 1. Quests
      const updatedDailyQuests = profile.dailyQuests.map(q => {
        if (q.isCompleted && !q.isClaimed) {
          extraCoins += q.rewardCoins;
          return { ...q, isClaimed: true };
        }
        return q;
      });

      // 2. Milestones
      const updatedMilestones = { ...profile.dailyMilestonesClaimed };
      for (const m of DAILY_MILESTONES) {
        if (completedDailyCount >= m.requiredCount && !updatedMilestones[m.requiredCount]) {
          extraCoins += m.rewardCoins;
          updatedMilestones[m.requiredCount] = true;
        }
      }

      const updated: PlayerProfile = {
        ...profile,
        coins: profile.coins + extraCoins,
        dailyQuests: updatedDailyQuests,
        dailyMilestonesClaimed: updatedMilestones
      };

      savePlayerProfile(updated);
      onUpdateProfile(updated);
    } else {
      // Tab ACHIEVEMENTS
      let extraCoins = 0;
      const updatedAchievements = profile.achievements.map(a => {
        if (a.isCompleted && !a.isClaimed) {
          extraCoins += a.rewardCoins;
          return { ...a, isClaimed: true };
        }
        return a;
      });

      const updated: PlayerProfile = {
        ...profile,
        coins: profile.coins + extraCoins,
        achievements: updatedAchievements
      };

      savePlayerProfile(updated);
      onUpdateProfile(updated);
    }
  };

  return {
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
  };
}
