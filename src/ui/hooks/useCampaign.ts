import { useState, useCallback } from 'react';
import { PlayerProfile } from '../../engine/storage';
import { CAMPAIGN_CHAPTERS, CampaignChapter } from '../../engine/campaign';
import { BotEntity, getTierFromElo } from '../../engine/ecosystem/ecosystem-types';
import { BotConfig } from '../../ai/types';
import { useModalStore } from '../../stores/useModalStore';
import { useEcosystemStore } from '../../stores/useEcosystemStore';

export interface ChapterStatusInfo {
  unlocked: boolean;
  wins: number;
  requiredWins: number;
  isCompleted: boolean;
  isSelected: boolean;
}

export interface UseCampaignProps {
  profile: PlayerProfile;
  onSelectChapter?: (chapter: CampaignChapter) => void;
  initialChapterId?: number;
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
  handleOpenBossProfile: (botConfig: BotConfig) => void;
  handleStartChapter: (chapter?: CampaignChapter) => void;
}

/**
 * Chuyển đổi BotConfig từ Campaign sang BotEntity đầy đủ để hiển thị trong BotProfileModal
 */
export function convertBotConfigToEntity(botConfig: BotConfig, ecosystemBots: BotEntity[]): BotEntity {
  const existing = ecosystemBots.find(b => b.id === botConfig.id || (botConfig.name && b.name === botConfig.name));
  if (existing) return existing;

  const tierInfo = getTierFromElo(botConfig.elo);
  return {
    id: botConfig.id || `bot_${botConfig.elo}`,
    name: botConfig.name || tierInfo.label || 'Trùm Sòng',
    avatar: botConfig.avatar || '🤖',
    elo: botConfig.elo,
    coins: botConfig.elo * 150,
    description: botConfig.description || `Cao Thủ Sới Bạc với mức Elo ${botConfig.elo}.`,
    personalityTags: [
      tierInfo.label,
      botConfig.useMinimaxEndgame ? 'Minimax AI' : 'Chiến Thuật',
      botConfig.riskAppetite > 0.7 ? 'Liều Lĩnh' : 'Chặt Chẽ'
    ],
    title: `Trùm ${tierInfo.label}`,
    status: 'ACTIVE',
    activityStatus: 'IN_MATCH',
    createdAt: Date.now(),
    memoryDepth: botConfig.memoryDepth || 0.5,
    riskAppetite: botConfig.riskAppetite || 0.5,
    trapTendency: botConfig.trapTendency || 0.5,
    baitingTendency: botConfig.baitingTendency || 0.5,
    antiLeaderAggression: botConfig.antiLeaderAggression || 1.0,
    tempoControl: botConfig.tempoControl || 0.5,
    damageControl: botConfig.damageControl || 0.5,
    turnsToWinLookahead: botConfig.turnsToWinLookahead || 0.5,
    dynamicHandSacrifice: botConfig.dynamicHandSacrifice || 0.5,
    bombInferenceRate: botConfig.bombInferenceRate || 0.5,
    semiCooperativeCooperation: botConfig.semiCooperativeCooperation || 0.5,
    positionalAwareness: botConfig.positionalAwareness || 0.5,
    inMatchAdaptationRate: botConfig.inMatchAdaptationRate || 0.5,
    mctsSimulations: botConfig.mctsSimulations || 0,
    handPartitioningOptimality: botConfig.handPartitioningOptimality || 0.5,
    simulationLookahead: botConfig.simulationLookahead || 1,
    useMinimaxEndgame: botConfig.useMinimaxEndgame || false,
    useBayesianInference: botConfig.useBayesianInference || false,
    useNashEquilibrium: botConfig.useNashEquilibrium || false,
    useDynamicRepartitioning: botConfig.useDynamicRepartitioning || false,
    currentStreak: 2,
    highestStreak: 6,
    stats: {
      gamesPlayed: 120,
      wins: 72,
      chopsDone: 35,
      congsGiven: 18,
      totalEarned: botConfig.elo * 600
    },
    headToHeadVsHuman: {
      games: 0,
      botWins: 0,
      humanWins: 0,
      netCoinsEarnedFromHuman: 0
    }
  };
}

/**
 * Hook dùng chung cho Bản Đồ Chiến Dịch Cốt Truyện 9 Chương (Web Modal & Mobile View)
 */
export function useCampaign({
  profile,
  onSelectChapter,
  initialChapterId
}: UseCampaignProps): UseCampaignReturn {
  const [selectedChapterId, setSelectedChapterId] = useState<number>(
    initialChapterId || profile.campaignUnlockedChapter || 1
  );

  const { openModal } = useModalStore();
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

  const handleOpenBossProfile = useCallback((botConfig: BotConfig) => {
    const botEntity = convertBotConfigToEntity(botConfig, ecosystemBots);
    setSelectedBot(botEntity);
    openModal('BOT_PROFILE');
  }, [ecosystemBots, openModal, setSelectedBot]);

  const handleStartChapter = useCallback((chapter?: CampaignChapter) => {
    const targetChapter = chapter || currentChapter;
    if (targetChapter.id <= (profile.campaignUnlockedChapter || 1)) {
      onSelectChapter?.(targetChapter);
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
