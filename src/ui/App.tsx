import React, { useEffect, useState } from 'react';
import { WebApp } from './web/WebApp';
import { MobileApp } from './mobile/MobileApp';
import { SplashScreen } from './components/SplashScreen';
import { CustomGameModalConfig } from './web/modals/CustomGameModal';
import { QuickSetupConfig } from './web/modals/QuickSetupModal';
import { CampaignChapter } from '../engine/campaign';
import { useGameMatchLoop } from './hooks/useGameMatchLoop';
import { useIsMobile } from './hooks/useIsMobile';
import { getRandomBotConfigsForTable } from '../ai/bot-factory';
import { 
  clearActiveMatchSession, 
  savePlayerProfile,
  hydrateStorageFromIndexedDB
} from '../engine/storage';
import { dbGetGameSettings, dbGetQuickTableConfig } from '../engine/db/indexed-db';
import { GameRulesBuilder } from '../engine/types';
import { ECONOMY_CONSTANTS } from '../engine/constants/economy';
import { matchBotsForPlayerTable } from '../engine/ecosystem/matchmaker';
import { smartSync } from '../engine/sync/sync-service';

// Stores
import { useModalStore } from '../stores/useModalStore';
import { useUserStore } from '../stores/useUserStore';
import { useGameStore } from '../stores/useGameStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useEcosystemStore } from '../stores/useEcosystemStore';
import { useMatchmakingStore } from '../stores/useMatchmakingStore';
import { useOnlineStore } from '../stores/useOnlineStore';
import { BotConfig } from '../ai/types';

export const App: React.FC = () => {
  const { openModal, setF5PenaltyData } = useModalStore();
  const { profile, setProfile, hydrateProfile } = useUserStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasEnteredGame, setHasEnteredGame] = useState(false);
  const { isMobile } = useIsMobile();
  const {
    currentScreen,
    activeGameType,
    setActiveGameType,
    setCurrentScreen,
    setCurrentCampaignChapter
  } = useGameStore();

  const {
    engineRef,
    trackersRef,
    campaignResultMeta,
    startNewGame,
    handleNextGame,
    handlePlaySelectedCards,
    handlePassTurn,
    handleAutoSort,
    handleApplyAiHint,
    handleDealCard,
    handleDealComplete,
    handleForfeitMatch,
    handleRequestReturnToLobby
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
            useModalStore.getState().setSyncConflictData({
              localData: syncResult.localData,
              cloudData: syncResult.cloudData
            });
            useModalStore.getState().openModal('SYNC_CONFLICT');
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
        useOnlineStore.getState().joinRoom(profile, code);
        openModal('ONLINE_ROOM');
      }
    }
  }, [isHydrated, profile, openModal]);

  // Khởi tạo game khi vào bàn (nếu chưa có engine và không phải trận Online P2P)
  useEffect(() => {
    if (currentScreen === 'GAME_TABLE' && !engineRef.current && activeGameType !== 'ONLINE') {
      startNewGame(1);
    }
  }, [currentScreen, startNewGame, engineRef, activeGameType]);

  // ==========================================================================
  // ĐIỀU HƯỚNG TỪ SẢNH VÀO CÁC CHẾ ĐỘ CHƠI (STRATEGY DISPATCH)
  // ==========================================================================

  const handleStartQuickGame = async (config: QuickSetupConfig) => {
    // 1. Kiểm tra số dư tối thiểu của người chơi trước khi vào tìm trận
    const liveProfile = useUserStore.getState().profile;
    if (liveProfile.coins < config.betAmount) {
      openModal('BANK');
      return;
    }

    useModalStore.getState().closeModal('QUICK_SETUP');

    // 2. Ghép Bot trực tiếp từ Hệ Sinh Thái 200 Bot
    const requiredCount = (config.playerCount || 4) - 1;
    let botConfigs: Partial<BotConfig>[] = [];
    let botIds: string[] = [];

    try {
      const tableOpponents = await useEcosystemStore.getState().prepareMatchEcosystem(liveProfile.elo, config.betAmount);
      if (tableOpponents && tableOpponents.length > 0) {
        const chosen = tableOpponents.slice(0, requiredCount);
        botConfigs = chosen;
        botIds = chosen.map(b => b.id);
      }
    } catch {
      const ecosystemBots = useEcosystemStore.getState().bots;
      if (ecosystemBots.length > 0) {
        const matched = matchBotsForPlayerTable(ecosystemBots, liveProfile.elo, config.betAmount, requiredCount);
        botConfigs = matched;
        botIds = matched.map(b => b.id);
      }
    }

    if (botConfigs.length < requiredCount) {
      const fallbacks = getRandomBotConfigsForTable([1, 2, 3, 4, 5], requiredCount);
      botConfigs = fallbacks;
      botIds = fallbacks.map(b => b.id || 'BOT_ELO_1150');
    }

    // Lưu cấu hình bàn chơi vĩnh viễn vào DB & Store
    useGameStore.getState().setQuickTableConfig(config);

    useMatchmakingStore.getState().startMatchmaking({
      betAmount: config.betAmount,
      modeName: config.settlementRule === 'COUNT_CARDS' ? 'Đếm Lá (Đấu Hạng)' : config.settlementRule === 'WINNER_TAKES_ALL' ? 'Nhất Ăn Tất (Đấu Hạng)' : 'Tiến Lên Miền Nam',
      botConfigs,
      playerCount: config.playerCount ?? 4,
      onStart: () => {
        setActiveGameType('QUICK');
        setCurrentScreen('GAME_TABLE');
        const customRules = new GameRulesBuilder()
          .withSettlement(config.settlementRule)
          .withChopping(c => c
            .multiplier(config.choppingMultiplier)
            .allowFourPairsCutAnytime(config.allowFourPairsCutAnytime)
            .allowThreePairsCutTwo(true)
            .allowFourOfAKindCutPairsOfTwos(true)
          )
          .withCong(cg => cg
            .enabled(config.congEnabled)
            .penaltyCards(config.congEnabled ? 26 : 0)
            .multiplier(config.choppingMultiplier)
          )
          .withGameFlow(f => f
            .prohibitEndingWithTwo(config.prohibitEndingWithTwo)
          )
          .withTable(t => t
            .playerCount(config.playerCount)
            .betAmount(config.betAmount)
          )
          .build();

        startNewGame(1, {
          playerCount: config.playerCount,
          customRules,
          customBotPersonaIds: botIds,
          customBotConfigs: botConfigs
        });
      }
    });
  };

  const handleStartCustomGameWithConfig = async (config: CustomGameModalConfig) => {
    // 1. Kiểm tra số dư tối thiểu của người chơi trước khi vào tìm trận
    const liveProfile = useUserStore.getState().profile;
    if (liveProfile.coins < config.settings.betAmount) {
      openModal('BANK');
      return;
    }

    useModalStore.getState().closeModal('CUSTOM_GAME');

    // Kích hoạt mô phỏng ngầm song song
    try {
      await useEcosystemStore.getState().prepareMatchEcosystem(liveProfile.elo, config.settings.betAmount);
    } catch {}

    const modeTitle = config.settings.mode === 'COUNT_CARDS'
      ? 'Đếm Lá Tùy Chỉnh'
      : config.settings.mode === 'WINNER_TAKES_ALL'
        ? 'Nhất Ăn Tất Tùy Chỉnh'
        : 'Truyền Thống Tùy Chỉnh';

    useMatchmakingStore.getState().startMatchmaking({
      betAmount: config.settings.betAmount,
      modeName: modeTitle,
      botConfigs: config.customBotConfigs,
      playerCount: config.playerCount ?? 4,
      onStart: () => {
        setActiveGameType('QUICK');
        setCurrentScreen('GAME_TABLE');
        startNewGame(1, {
          customSettings: config.settings,
          customBotPersonaIds: config.botPersonaIds,
          customBotConfigs: config.customBotConfigs,
          playerCount: config.playerCount
        });
      }
    });
  };

  const handlePlayNowDefault = () => {
    const liveCoins = useUserStore.getState().profile.coins;
    const savedConfig = useGameStore.getState().quickTableConfig;

    // Nếu không đủ mức cược của bàn đã lưu, mở Ngân Hàng / Cứu trợ
    if (liveCoins < savedConfig.betAmount) {
      openModal('BANK');
      return;
    }

    handleStartQuickGame(savedConfig);
  };

  const handleStartCampaignChapter = (chapter: CampaignChapter) => {
    setCurrentCampaignChapter(chapter);
    setActiveGameType('CAMPAIGN');
    useModalStore.getState().closeModal('CAMPAIGN');
    setCurrentScreen('GAME_TABLE');
    startNewGame(1, {
      campaignChapter: chapter,
      playerCount: 4
    });
  };

  const handleReturnToLobby = () => {
    handleRequestReturnToLobby();
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
    engineRef,
    trackersRef,
    profile,
    campaignResultMeta,
    startNewGame,
    handleNextGame,
    handlePlaySelectedCards,
    handlePassTurn,
    handleAutoSort,
    handleApplyAiHint,
    handleDealCard,
    handleDealComplete,
    handleForfeitMatch,
    handleRequestReturnToLobby,
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
