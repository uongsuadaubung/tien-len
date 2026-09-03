import React, { useEffect, useState } from 'react';
import { WebApp } from './web/WebApp';
import { MobileApp } from './mobile/MobileApp';
import { SplashScreen } from './components/SplashScreen';
import { CustomGameModalConfig } from './web/modals/CustomGameModal';
import { QuickSetupConfig } from './web/modals/QuickSetupModal';
import { CampaignChapter } from '../engine/campaign';
import { useGameMatchLoop } from './hooks/useGameMatchLoop';
import { useIsMobile } from './hooks/useIsMobile';
import { 
  clearActiveMatchSession, 
  savePlayerProfile,
  hydrateStorageFromIndexedDB
} from '../engine/storage';
import { dbGetGameSettings, dbGetQuickTableConfig } from '../engine/db/indexed-db';
import { ECONOMY_CONSTANTS } from '../engine/constants/economy';
import { smartSync } from '../engine/sync/sync-service';

// Stores
import { useViewStore } from '../stores/useViewStore';
import { useUserStore } from '../stores/useUserStore';
import { useGameStore } from '../stores/useGameStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useOnlineStore } from '../stores/useOnlineStore';
import { appFlowCoordinator } from '../services/app-flow-coordinator';

export const App: React.FC = () => {
  const { currentScreen, openModal, setF5PenaltyData } = useViewStore();
  const { profile, setProfile, hydrateProfile } = useUserStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasEnteredGame, setHasEnteredGame] = useState(false);
  const { isMobile } = useIsMobile();
  const { activeGameType } = useGameStore();

  const {
    campaignResultMeta,
    handleNextGame,
    handlePlaySelectedCards,
    handlePassTurn,
    handleAutoSort,
    handleApplyAiHint,
    handleDealCard,
    handleDealComplete,
    handleForfeitMatch,
    handleReturnToLobby
  } = useGameMatchLoop();

  // Khởi động nạp dữ liệu từ Dexie IndexedDB thuần túy (Tối thiểu 2s)
  useEffect(() => {
    const minDelay = new Promise(resolve => setTimeout(resolve, 2000));

    Promise.all([
      hydrateStorageFromIndexedDB(),
      dbGetGameSettings(),
      dbGetQuickTableConfig(),
      minDelay
    ]).then(async ([hydrated, savedSettings, savedTableConfig]) => {
      if (hydrated.profile) {
        hydrateProfile(hydrated.profile);
      }
      if (savedSettings) {
        useSettingsStore.getState().hydrateSettings(savedSettings);
      }
      if (savedTableConfig) {
        useGameStore.getState().hydrateQuickTableConfig(savedTableConfig);
      }

      // Tự động đồng bộ với GitHub Gist khi vào game nếu có Token và bật autoSyncOnStartup
      const settings = useSettingsStore.getState();
      if (settings.githubToken && settings.autoSyncOnStartup) {
        try {
          const syncResult = await smartSync();
          if (syncResult.type === 'conflict') {
            useViewStore.getState().setSyncConflictData({
              localData: syncResult.localData,
              cloudData: syncResult.cloudData
            });
            useViewStore.getState().openModal('SYNC_CONFLICT');
          }
        } catch (err: unknown) {
          console.warn('[AutoSyncOnStartup] Tự động đồng bộ khi mở game gặp sự cố:', err);
        }
      }

      // Xử lý gián đoạn do F5 / Đóng ứng dụng khi đang chơi dở
      if (hydrated.activeSession) {
        clearActiveMatchSession();
        const isQuickOrRanked = hydrated.activeSession.gameType === 'QUICK' || hydrated.activeSession.isRanked;
        const eloLost = isQuickOrRanked ? ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY : 0;
        const depositLost = hydrated.activeSession.depositAmount || 0;
        const latestProfile = useUserStore.getState().profile;
        const nextElo = isQuickOrRanked ? Math.max(0, latestProfile.elo - ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY) : latestProfile.elo;

        const updatedProfile = {
          ...latestProfile,
          elo: nextElo,
          stats: {
            ...latestProfile.stats,
            gamesPlayed: (latestProfile.stats?.gamesPlayed || 0) + 1,
            currentStreak: 0
          }
        };
        setProfile(updatedProfile);
        savePlayerProfile(updatedProfile);
        setF5PenaltyData({
          depositLost,
          eloLost,
          isRanked: isQuickOrRanked
        });
        openModal('F5_PENALTY_NOTICE');
      }

      setIsHydrated(true);
    });
  }, [hydrateProfile, setProfile, openModal, setF5PenaltyData]);

  // Kiểm tra nếu chưa đặt tên thì mở Modal tạo tên khởi nghiệp (chỉ chạy SAU KHI đã nạp xong từ Dexie)
  useEffect(() => {
    if (!isHydrated) return;
    if (!profile.name || profile.name.trim() === '') {
      openModal('NAME_SETUP');
    }
  }, [isHydrated, profile.name, openModal]);

  // Tự động nhận diện và gia nhập phòng khi người chơi mở Link mời (#room=TL-xxxx)
  useEffect(() => {
    if (!isHydrated) return;
    const hash = window.location.hash;
    if (hash.startsWith('#room=')) {
      const code = hash.replace('#room=', '').toUpperCase().trim();
      if (code) {
        useSettingsStore.getState().setOnlineMultiplayerBetaEnabled(true);
        useOnlineStore.getState().joinRoom(profile, code);
        openModal('ONLINE_ROOM');
      }
    }
  }, [isHydrated, profile, openModal]);

  // Nếu ở màn hình GAME_TABLE mà không có bàn đấu nào đang hoạt động -> Quay về Sảnh
  useEffect(() => {
    if (currentScreen === 'GAME_TABLE' && !appFlowCoordinator.hasActiveMatch() && activeGameType !== 'ONLINE') {
      appFlowCoordinator.returnToLobby();
    }
  }, [currentScreen, activeGameType]);

  // ==========================================================================
  // ĐIỀU HƯỚNG TỪ SẢNH VÀO CÁC CHẾ ĐỘ CHƠI (STRATEGY DISPATCH)
  // ==========================================================================

  const handleStartQuickGame = async (config: QuickSetupConfig) => {
    await appFlowCoordinator.enterQuickMatch(config);
  };

  const handleStartCustomGameWithConfig = async (config: CustomGameModalConfig) => {
    await appFlowCoordinator.enterCustomMatch(config);
  };

  const handlePlayNowDefault = () => {
    const savedConfig = useGameStore.getState().quickTableConfig;
    void appFlowCoordinator.enterQuickMatch(savedConfig);
  };

  const handleStartCampaignChapter = (chapter: CampaignChapter) => {
    appFlowCoordinator.enterCampaignMatch(chapter);
  };

  // Màn hình Loading Gate khởi động (Kích hoạt Xoay Ngang & Âm Thanh tại First-Touch trên Mobile, tự động vào trên Web)
  if (!isHydrated || !hasEnteredGame) {
    return (
      <SplashScreen 
        isMobile={isMobile}
        isHydrated={isHydrated}
        onStart={() => {
          setHasEnteredGame(true);
        }}
      />
    );
  }

  const appProps = {
    campaignResultMeta,
    handleNextGame,
    handlePlaySelectedCards,
    handlePassTurn,
    handleAutoSort,
    handleApplyAiHint,
    handleDealCard,
    handleDealComplete,
    handleForfeitMatch,
    handleReturnToLobby,
    handlePlayNowDefault,
    handleStartQuickGame,
    handleStartCustomGameWithConfig,
    handleStartCampaignChapter
  };

  // ĐIỀU PHỐI GIAO DIỆN CHÍNH: MOBILE NATIVE-STYLE HOẶC WEB DESKTOP
  if (isMobile) {
    return <MobileApp {...appProps} />;
  }

  return <WebApp {...appProps} />;
};
