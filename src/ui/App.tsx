import React, { useEffect, useState } from 'react';
import { LobbyHub } from './components/LobbyHub';
import { GameModals } from './components/GameModals';
import { SplashScreen } from './components/SplashScreen';
import { CustomGameModalConfig } from './components/CustomGameModal';
import { QuickSetupConfig } from './components/QuickSetupModal';
import { CampaignChapter } from '../engine/campaign';
import { useGameMatchLoop } from './hooks/useGameMatchLoop';
import { GameTableScreen } from './screens/GameTableScreen';
import { getRandomBotConfigsForTable } from '../ai/bot-factory';
import { 
  clearActiveMatchSession, 
  savePlayerProfile,
  hydrateStorageFromIndexedDB
} from '../engine/storage';
import { dbGetGameSettings } from '../engine/db/indexed-db';
import { GameRulesBuilder } from '../engine/types';
import { ECONOMY_CONSTANTS } from '../engine/constants/economy';
import { matchBotsForPlayerTable } from '../engine/ecosystem/matchmaker';

// Stores
import { useModalStore } from '../stores/useModalStore';
import { useUserStore } from '../stores/useUserStore';
import { useGameStore } from '../stores/useGameStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useEcosystemStore } from '../stores/useEcosystemStore';
import { BotConfig } from '../ai/types';

export const App: React.FC = () => {
  const { openModal, closeModal, setF5PenaltyData } = useModalStore();
  const { profile, setProfile, hydrateProfile } = useUserStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const {
    currentScreen,
    activeGameType,
    gameNumber,
    playerCount,
    gameSettings,
    setCurrentScreen,
    setActiveGameType,
    setCurrentCampaignChapter
  } = useGameStore();

  const {
    engineRef,
    trackersRef,
    campaignResultMeta,
    startNewGame,
    handlePlaySelectedCards,
    handlePassTurn,
    handleAutoSort,
    handleApplyAiHint,
    handleDealCard,
    handleDealComplete,
    handleForfeitMatch,
    handleRequestReturnToLobby
  } = useGameMatchLoop();

  // Khởi động nạp dữ liệu từ Dexie IndexedDB thuần túy (Tối thiểu 3s)
  useEffect(() => {
    const minDelay = new Promise(resolve => setTimeout(resolve, 3000));

    Promise.all([
      hydrateStorageFromIndexedDB(),
      dbGetGameSettings(),
      minDelay
    ]).then(([hydrated, savedSettings]) => {
      let currentProfile = profile;
      if (hydrated.profile) {
        currentProfile = hydrated.profile;
        hydrateProfile(hydrated.profile);
      }
      if (savedSettings) {
        useSettingsStore.getState().hydrateSettings(savedSettings);
      }

      // Xử lý gián đoạn do F5 / Đóng ứng dụng khi đang chơi dở
      if (hydrated.activeSession) {
        clearActiveMatchSession();
        const isQuickOrRanked = hydrated.activeSession.gameType === 'QUICK' || hydrated.activeSession.isRanked;
        const eloLost = isQuickOrRanked ? ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY : 0;
        const depositLost = hydrated.activeSession.depositAmount || 0;
        const nextElo = isQuickOrRanked ? Math.max(0, currentProfile.elo - ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY) : currentProfile.elo;

        const updatedProfile = {
          ...currentProfile,
          elo: nextElo,
          stats: {
            ...currentProfile.stats,
            gamesPlayed: (currentProfile.stats?.gamesPlayed || 0) + 1,
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

  // Khởi tạo game khi vào bàn (nếu chưa có engine)
  useEffect(() => {
    if (currentScreen === 'GAME_TABLE' && !engineRef.current) {
      startNewGame(1);
    }
  }, [currentScreen, startNewGame, engineRef]);

  const [pendingMatch, setPendingMatch] = useState<{
    betAmount: number;
    modeName: string;
    botConfigs: Partial<BotConfig>[];
    playerCount?: number;
    onStart: () => void;
  } | null>(null);

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

    closeModal('QUICK_SETUP');

    // 2. Ghép Bot trực tiếp từ Hệ Sinh Thái 200 Bot & Kích hoạt Web Worker mô phỏng ngầm
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

    setPendingMatch({
      betAmount: config.betAmount,
      modeName: config.settlementRule === 'CARD_COUNT' ? 'Đếm Lá (Đấu Hạng)' : 'Tiến Lên Miền Nam',
      botConfigs,
      playerCount: config.playerCount,
      onStart: () => {
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
    openModal('MATCHMAKING');
  };

  const handleStartCustomGameWithConfig = async (config: CustomGameModalConfig) => {
    // 1. Kiểm tra số dư tối thiểu của người chơi trước khi vào tìm trận
    const liveProfile = useUserStore.getState().profile;
    if (liveProfile.coins < config.settings.betAmount) {
      openModal('BANK');
      return;
    }

    closeModal('CUSTOM_GAME');

    // Kích hoạt mô phỏng ngầm song song
    try {
      await useEcosystemStore.getState().prepareMatchEcosystem(liveProfile.elo, config.settings.betAmount);
    } catch {}

    const modeTitle = config.settings.mode === 'COUNT_CARDS'
      ? 'Đếm Lá Tùy Chỉnh'
      : config.settings.mode === 'WINNER_TAKES_ALL'
        ? 'Nhất Ăn Tất Tùy Chỉnh'
        : 'Truyền Thống Tùy Chỉnh';

    setPendingMatch({
      betAmount: config.settings.betAmount,
      modeName: modeTitle,
      botConfigs: config.customBotConfigs,
      playerCount: config.playerCount,
      onStart: () => {
        startNewGame(1, {
          customSettings: config.settings,
          customBotPersonaIds: config.botPersonaIds,
          customBotConfigs: config.customBotConfigs,
          playerCount: config.playerCount
        });
      }
    });
    openModal('MATCHMAKING');
  };

  const handleExecuteMatch = () => {
    if (!pendingMatch) return;
    closeModal('MATCHMAKING');
    setActiveGameType('QUICK');
    setCurrentScreen('GAME_TABLE');
    pendingMatch.onStart();
    setPendingMatch(null);
  };

  const handleCancelMatchmaking = () => {
    closeModal('MATCHMAKING');
    setPendingMatch(null);
  };

  const handlePlayNowDefault = () => {
    const liveCoins = useUserStore.getState().profile.coins;
    const defaultBet = ECONOMY_CONSTANTS.DEFAULT_QUICK_BET;

    // Nếu không đủ mức cược tiêu chuẩn (1.000 Xu), không cho chơi nhanh và mở Ngân Hàng / Cứu trợ
    if (liveCoins < defaultBet) {
      openModal('BANK');
      return;
    }

    handleStartQuickGame({
      playerCount: 4,
      betAmount: defaultBet,
      settlementRule: 'CARD_COUNT',
      choppingMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    });
  };

  const handleStartCampaignChapter = (chapter: CampaignChapter) => {
    setCurrentCampaignChapter(chapter);
    setActiveGameType('CAMPAIGN');
    closeModal('CAMPAIGN');
    setCurrentScreen('GAME_TABLE');
    startNewGame(1, {
      campaignChapter: chapter,
      playerCount: 4
    });
  };

  const handleReturnToLobby = () => {
    handleRequestReturnToLobby();
  };

  // Màn hình Loading Gate khởi động (Tối thiểu 3s)
  if (!isHydrated) {
    return <SplashScreen />;
  }

  return (
    <>
      {/* 1. MÀN HÌNH CHÍNH (SẢNH HOẶC BÀN ĐẤU) */}
      {currentScreen === 'LOBBY' ? (
        <LobbyHub
          profile={profile}
            onPlayNow={handlePlayNowDefault}
            onOpenQuickSetup={() => openModal('QUICK_SETUP')}
            onOpenCustomGameModal={() => openModal('CUSTOM_GAME')}
            onOpenCampaign={() => openModal('CAMPAIGN')}
            onOpenQuests={() => openModal('QUEST')}
            onOpenLuckyWheel={() => openModal('WHEEL')}
            onOpenBank={() => openModal('BANK')}
            onOpenSettings={() => openModal('SETTINGS')}
            onOpenRules={() => openModal('RULES')}
            onOpenNameSetup={() => openModal('NAME_SETUP')}
          />
      ) : (
        <GameTableScreen
          engineRef={engineRef}
          onPlaySelectedCards={handlePlaySelectedCards}
          onPassTurn={handlePassTurn}
          onAutoSort={handleAutoSort}
          onApplyAiHint={handleApplyAiHint}
          onDealCard={handleDealCard}
          onDealComplete={handleDealComplete}
          onResetMatch={() => startNewGame(1, { playerCount })}
          onReturnToLobby={handleRequestReturnToLobby}
        />
      )}

      {/* 2. MODALS TẬP TRUNG TOÀN ỨNG DỤNG */}
      <GameModals
        player0Tracker={trackersRef.current['p0'] || null}
        onStartQuickGame={handleStartQuickGame}
        onStartCustomGame={handleStartCustomGameWithConfig}
        onSelectCampaignChapter={handleStartCampaignChapter}
        onConfirmForfeit={handleForfeitMatch}
        campaignResultMeta={campaignResultMeta}
        matchmakingData={pendingMatch}
        onCancelMatchmaking={handleCancelMatchmaking}
        onMatchReady={handleExecuteMatch}
        onOpenCampaignMap={() => {
          closeModal('VICTORY');
          openModal('CAMPAIGN');
        }}
        onNextGame={() => {
          closeModal('VICTORY');
          const betAmount = gameSettings.betAmount || 0;
          const liveCoins = useUserStore.getState().profile.coins;
          if (activeGameType !== 'CAMPAIGN' && betAmount > 0 && liveCoins < betAmount) {
            openModal('BANK');
            return;
          }

          if (activeGameType === 'CAMPAIGN') {
            if (campaignResultMeta?.isUnlockedNext && campaignResultMeta.nextChapter) {
              startNewGame(1, { campaignChapter: campaignResultMeta.nextChapter });
            } else {
              startNewGame(gameNumber + 1);
            }
          } else {
            // Ván tiếp theo trong bàn, người về Nhất ván trước được quyền đi trước
            startNewGame(gameNumber + 1);
          }
        }}
        onReturnToLobby={() => {
          closeModal('VICTORY');
          handleReturnToLobby();
        }}
      />
    </>
  );
};
