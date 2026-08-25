import React, { useEffect } from 'react';
import { LobbyHub } from './components/LobbyHub';
import { GameModals } from './components/GameModals';
import { FallingBlossoms } from './components/FallingBlossoms';
import { CustomGameModalConfig } from './components/CustomGameModal';
import { QuickSetupConfig } from './components/QuickSetupModal';
import { CampaignChapter } from '../engine/campaign';
import { useGameMatchLoop } from './hooks/useGameMatchLoop';
import { GameTableScreen } from './screens/GameTableScreen';
import { getRandomBotConfigsForTable } from '../ai/bot-factory';
import { 
  getActiveMatchSession, 
  clearActiveMatchSession, 
  savePlayerProfile 
} from '../engine/storage';
import { GameRulesBuilder } from '../engine/types';

// Stores
import { useModalStore } from '../stores/useModalStore';
import { useUserStore } from '../stores/useUserStore';
import { useGameStore } from '../stores/useGameStore';

export const App: React.FC = () => {
  const { openModal, closeModal, setF5PenaltyData } = useModalStore();
  const { profile, setProfile } = useUserStore();
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

  // Kiểm tra gián đoạn do F5 / Đóng ứng dụng khi mở trang
  useEffect(() => {
    const interruptedSession = getActiveMatchSession();
    if (interruptedSession) {
      clearActiveMatchSession();
      if (interruptedSession.isRanked) {
        const nextElo = Math.max(0, profile.elo - 30);
        const updatedProfile = {
          ...profile,
          elo: nextElo,
          stats: {
            ...profile.stats,
            gamesPlayed: profile.stats.gamesPlayed + 1,
            currentStreak: 0
          }
        };
        setProfile(updatedProfile);
        savePlayerProfile(updatedProfile);
        setF5PenaltyData({
          depositLost: 0,
          eloLost: 30,
          isRanked: true
        });
      } else {
        const updatedProfile = {
          ...profile,
          stats: {
            ...profile.stats,
            gamesPlayed: profile.stats.gamesPlayed + 1,
            currentStreak: 0
          }
        };
        setProfile(updatedProfile);
        savePlayerProfile(updatedProfile);
        setF5PenaltyData({
          depositLost: interruptedSession.depositAmount,
          eloLost: 0,
          isRanked: false
        });
      }
      openModal('F5_PENALTY_NOTICE');
    }
  }, []);

  // Kiểm tra nếu chưa đặt tên thì mở Modal tạo tên khởi nghiệp
  useEffect(() => {
    if (!profile.name || profile.name.trim() === '') {
      openModal('NAME_SETUP');
    }
  }, [profile.name, openModal]);

  // Khởi tạo game khi vào bàn (nếu chưa có engine)
  useEffect(() => {
    if (currentScreen === 'GAME_TABLE' && !engineRef.current) {
      startNewGame(1);
    }
  }, [currentScreen, startNewGame, engineRef]);

  // ==========================================================================
  // ĐIỀU HƯỚNG TỪ SẢNH VÀO CÁC CHẾ ĐỘ CHƠI (STRATEGY DISPATCH)
  // ==========================================================================

  const handleStartQuickGame = (config: QuickSetupConfig) => {
    closeModal('QUICK_SETUP');
    setActiveGameType('QUICK');
    setCurrentScreen('GAME_TABLE');

    // Ghép Bot hoàn toàn ngẫu nhiên từ kho 18+ Bot Personas
    const randomBots = getRandomBotConfigsForTable([1, 2, 3, 4, 5], 3);

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
      customBotPersonaIds: [
        randomBots[0]?.id || 'BOT_ELO_850',
        randomBots[1]?.id || 'BOT_ELO_1150',
        randomBots[2]?.id || 'BOT_ELO_1450'
      ],
      customBotConfigs: [
        randomBots[0] || {},
        randomBots[1] || {},
        randomBots[2] || {}
      ]
    });
  };

  const handleStartCustomGameWithConfig = (config: CustomGameModalConfig) => {
    setActiveGameType('QUICK');
    closeModal('CUSTOM_GAME');
    setCurrentScreen('GAME_TABLE');
    startNewGame(1, {
      customSettings: config.settings,
      customBotPersonaIds: config.botPersonaIds,
      customBotConfigs: config.customBotConfigs,
      playerCount: config.playerCount
    });
  };

  const handleStartRanked = () => {
    setActiveGameType('RANKED');
    setCurrentScreen('GAME_TABLE');
    startNewGame(1, {
      playerCount: 4
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

  return (
    <>
      {/* 1. MÀN HÌNH CHÍNH (SẢNH HOẶC BÀN ĐẤU) */}
      {currentScreen === 'LOBBY' ? (
        <>
          <FallingBlossoms />
          <LobbyHub
            profile={profile}
            onOpenQuickSetup={() => openModal('QUICK_SETUP')}
            onOpenCustomGameModal={() => openModal('CUSTOM_GAME')}
            onOpenRanked={handleStartRanked}
            onOpenCampaign={() => openModal('CAMPAIGN')}
            onOpenQuests={() => openModal('QUEST')}
            onOpenLuckyWheel={() => openModal('WHEEL')}
            onOpenBank={() => openModal('BANK')}
            onOpenSettings={() => openModal('SETTINGS')}
            onOpenNameSetup={() => openModal('NAME_SETUP')}
          />
        </>
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
        player0Tracker={trackersRef.current['p0']}
        onStartQuickGame={handleStartQuickGame}
        onStartCustomGame={handleStartCustomGameWithConfig}
        onSelectCampaignChapter={handleStartCampaignChapter}
        onConfirmForfeit={handleForfeitMatch}
        campaignResultMeta={campaignResultMeta}
        onOpenCampaignMap={() => {
          closeModal('VICTORY');
          openModal('CAMPAIGN');
        }}
        onNextGame={() => {
          closeModal('VICTORY');
          const betAmount = gameSettings.betAmount || 0;
          if (activeGameType !== 'RANKED' && activeGameType !== 'CAMPAIGN' && betAmount > 0 && profile.coins < betAmount) {
            openModal('BANK');
            return;
          }

          if (activeGameType === 'CAMPAIGN') {
            if (campaignResultMeta?.isUnlockedNext && campaignResultMeta.nextChapter) {
              startNewGame(1, { campaignChapter: campaignResultMeta.nextChapter });
            } else {
              startNewGame(gameNumber + 1);
            }
          } else if (activeGameType === 'RANKED') {
            // Chế độ Đấu Hạng (Ranked): Tìm đối thủ mới (tên, avatar, rank ngẫu nhiên) và mở màn ván 1 với 3 Bích
            startNewGame(1);
          } else {
            // Các chế độ còn lại: Ván tiếp theo trong cùng bàn, người về Nhất ván trước được quyền đi trước
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
