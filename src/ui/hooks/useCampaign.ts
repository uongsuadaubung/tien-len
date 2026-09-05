import { useState, useCallback } from 'react';
import { 
  CAMPAIGN_CHAPTERS, 
  CampaignChapter, 
  CampaignBotConfig,
  createCampaignBotEntity 
} from '../../engine/campaign';
import { BotEntity } from '../../engine/ecosystem/ecosystem-types';
import { useViewStore } from '../../stores/useViewStore';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useUserStore } from '../../stores/useUserStore';

export interface ChapterStatusInfo {
  unlocked: boolean;
  wins: number;
  requiredWins: number;
  isCompleted: boolean;
  isSelected: boolean;
}

export interface UseCampaignProps {
  onSelectChapter: ((chapter: CampaignChapter) => void) | null;
  initialChapterId: number | null;
}

export interface UseCampaignReturn {
  selectedChapterId: number;
  setSelectedChapterId: (id: number) => void;
  currentChapter: CampaignChapter;
  chapters: readonly CampaignChapter[];
  unlockedChapterCount: number;
  totalChaptersCount: number;
  isUnlocked: boolean;
  chapterWins: number;
  isCompleted: boolean;
  getChapterStatus: (chapterId: number) => ChapterStatusInfo;
  handleOpenBossProfile: (botConfig: CampaignBotConfig) => void;
  handleStartChapter: (chapter: CampaignChapter | null) => void;
}

/**
 * Tương thích ngược: Ủy thác việc chuyển đổi cho hàm createCampaignBotEntity ở tầng Domain
 */
export function convertBotConfigToEntity(botConfig: CampaignBotConfig, ecosystemBots: BotEntity[]): BotEntity {
  return createCampaignBotEntity(botConfig, ecosystemBots);
}

/**
 * Hook dùng chung cho Bản Đồ Chiến Dịch Cốt Truyện 9 Chương (Web Modal & Mobile View)
 */
export function useCampaign(props: UseCampaignProps | null = null): UseCampaignReturn {
  const { profile } = useUserStore();
  const onSelectChapter = props?.onSelectChapter ?? null;
  const initialChapterId = props?.initialChapterId ?? null;

  const [selectedChapterId, setSelectedChapterId] = useState<number>(
    initialChapterId || profile.campaignUnlockedChapter || 1
  );

  const { openModal } = useViewStore();
  const { bots: ecosystemBots, setSelectedBot } = useEcosystemStore();

  const currentChapter = CAMPAIGN_CHAPTERS.find(c => c.id === selectedChapterId) || CAMPAIGN_CHAPTERS[0];
  const unlockedChapterCount = profile.campaignUnlockedChapter || 1;
  const totalChaptersCount = CAMPAIGN_CHAPTERS.length;
  const isUnlocked = selectedChapterId <= unlockedChapterCount;
  const chapterWins = profile.campaignChapterWins[selectedChapterId] || 0;
  const isCompleted = chapterWins >= currentChapter.requiredWins;

  const getChapterStatus = useCallback((chapterId: number): ChapterStatusInfo => {
    const ch = CAMPAIGN_CHAPTERS.find(c => c.id === chapterId) || CAMPAIGN_CHAPTERS[0];
    const unlocked = chapterId <= (profile.campaignUnlockedChapter || 1);
    const wins = profile.campaignChapterWins[chapterId] || 0;
    const completed = wins >= ch.requiredWins;
    const isSelected = selectedChapterId === chapterId;

    return {
      unlocked,
      wins,
      requiredWins: ch.requiredWins,
      isCompleted: completed,
      isSelected
    };
  }, [profile.campaignUnlockedChapter, profile.campaignChapterWins, selectedChapterId]);

  const handleOpenBossProfile = useCallback((botConfig: CampaignBotConfig) => {
    const botEntity = convertBotConfigToEntity(botConfig, ecosystemBots);
    setSelectedBot(botEntity);
    openModal({ type: 'BOT_PROFILE', bot: botEntity });
  }, [ecosystemBots, openModal, setSelectedBot]);

  const handleStartChapter = useCallback((chapter: CampaignChapter | null) => {
    const targetChapter = chapter || currentChapter;
    if (targetChapter.id <= (profile.campaignUnlockedChapter || 1)) {
      if (onSelectChapter !== null) {
        onSelectChapter(targetChapter);
      }
    }
  }, [currentChapter, onSelectChapter, profile.campaignUnlockedChapter]);

  return {
    selectedChapterId,
    setSelectedChapterId,
    currentChapter,
    chapters: CAMPAIGN_CHAPTERS,
    unlockedChapterCount,
    totalChaptersCount,
    isUnlocked,
    chapterWins,
    isCompleted,
    getChapterStatus,
    handleOpenBossProfile,
    handleStartChapter
  };
}
