import { useState, useEffect, useMemo, useCallback } from 'react';
import { getRankTierByElo, RANK_TIERS, type RankTierInfo } from '../../engine/elo';
import { useViewStore } from '../../stores/useViewStore';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useGameStore } from '../../stores/useGameStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUserStore } from '../../stores/useUserStore';
import { isFullScreen, toggleFullScreen, lockToLandscape } from '../utils/fullscreen';
import { useI18n } from '../../locales';
import type { GameMode, GameSettlementRule } from '../../engine/types';

export interface UseLobbyLogicResult {
  t: ReturnType<typeof useI18n>['t'];
  profile: ReturnType<typeof useUserStore.getState>['profile'];
  openModal: ReturnType<typeof useViewStore.getState>['openModal'];
  newsfeed: ReturnType<typeof useEcosystemStore.getState>['newsfeed'];
  quickTableConfig: ReturnType<typeof useGameStore.getState>['quickTableConfig'];
  onlineMultiplayerBetaEnabled: boolean;
  isFullscreenState: boolean;
  currentRank: RankTierInfo;
  nextTier: RankTierInfo | undefined;
  eloProgress: number;
  claimableQuestsCount: number;
  getSettlementLabel: (rule?: GameSettlementRule | GameMode) => string;
  handleToggleFullScreen: (isMobile?: boolean) => Promise<void>;
}

export function useLobbyLogic(): UseLobbyLogicResult {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const { openModal } = useViewStore();
  const { newsfeed, initEcosystem } = useEcosystemStore();
  const { quickTableConfig } = useGameStore();
  const { onlineMultiplayerBetaEnabled } = useSettingsStore();
  const [isFullscreenState, setIsFullscreenState] = useState<boolean>(isFullScreen());

  const getSettlementLabel = useCallback((rule?: GameSettlementRule | GameMode): string => {
    switch (rule) {
      case 'WINNER_TAKES_ALL': return t('modes.winnerTakesAll');
      case 'TRADITIONAL': return t('modes.traditional');
      case 'COUNT_CARDS':
      default: return t('modes.countCards');
    }
  }, [t]);

  useEffect(() => {
    initEcosystem();
  }, [initEcosystem]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreenState(isFullScreen());
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const currentRank = useMemo(() => getRankTierByElo(profile.elo), [profile.elo]);

  const { nextTier, eloProgress } = useMemo(() => {
    const currentTierIndex = RANK_TIERS.findIndex(tier => tier.id === currentRank.id);
    const next = RANK_TIERS[currentTierIndex + 1];
    let progress = 100;
    if (next) {
      const tierSpan = next.minElo - currentRank.minElo;
      const progressInTier = profile.elo - currentRank.minElo;
      progress = Math.min(100, Math.max(0, Math.round((progressInTier / tierSpan) * 100)));
    }
    return { nextTier: next, eloProgress: progress };
  }, [currentRank, profile.elo]);

  const claimableQuestsCount = useMemo(() => {
    const dailyCount = (profile.dailyQuests || []).filter(q => q.isCompleted && !q.isClaimed).length;
    const achCount = (profile.achievements || []).filter(a => a.isCompleted && !a.isClaimed).length;
    return dailyCount + achCount;
  }, [profile.dailyQuests, profile.achievements]);

  const handleToggleFullScreen = useCallback(async (isMobileMode?: boolean) => {
    if (isMobileMode) {
      if (isFullscreenState) {
        await toggleFullScreen();
        setIsFullscreenState(false);
      } else {
        await lockToLandscape();
        setIsFullscreenState(isFullScreen());
      }
    } else {
      await toggleFullScreen();
      setIsFullscreenState(isFullScreen());
    }
  }, [isFullscreenState]);

  return {
    t,
    profile,
    openModal,
    newsfeed,
    quickTableConfig,
    onlineMultiplayerBetaEnabled,
    isFullscreenState,
    currentRank,
    nextTier,
    eloProgress,
    claimableQuestsCount,
    getSettlementLabel,
    handleToggleFullScreen
  };
}
