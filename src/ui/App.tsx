import React, { useEffect } from 'react';
import { LobbyHub } from './components/LobbyHub';
import { GameModals } from './components/GameModals';
import { FallingBlossoms } from './components/FallingBlossoms';
import { CustomGameModalConfig } from './components/CustomGameModal';
import { CampaignChapter } from '../engine/campaign';
import { useGameMatchLoop } from './hooks/useGameMatchLoop';
import { GameTableScreen } from './screens/GameTableScreen';

// Stores
import { useModalStore } from '../stores/useModalStore';
import { useUserStore } from '../stores/useUserStore';
import { useGameStore } from '../stores/useGameStore';

export const App: React.FC = () => {
  const { openModal, closeModal } = useModalStore();
  const { profile } = useUserStore();
  const {
    currentScreen,
    activeGameType,
    gameNumber,
    playerCount,
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
    handleDealComplete
  } = useGameMatchLoop();

  // Khởi tạo game khi vào bàn (nếu chưa có engine)
  useEffect(() => {
    if (currentScreen === 'GAME_TABLE' && !engineRef.current) {
      startNewGame(1);
    }
  }, [currentScreen, startNewGame, engineRef]);

  // ==========================================================================
  // ĐIỀU HƯỚNG TỪ SẢNH VÀO CÁC CHẾ ĐỘ CHƠI (STRATEGY DISPATCH)
  // ==========================================================================

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

  const handleStartSolo1v1 = () => {
    setActiveGameType('QUICK');
    setCurrentScreen('GAME_TABLE');
    startNewGame(1, {
      playerCount: 2,
      customSettings: {
        mode: 'TRADITIONAL',
        playerCount: 2,
        betAmount: 200
      }
    });
  };

  const handleStartCountCards = () => {
    setActiveGameType('QUICK');
    setCurrentScreen('GAME_TABLE');
    startNewGame(1, {
      playerCount: 4,
      customSettings: {
        mode: 'COUNT_CARDS',
        playerCount: 4,
        betAmount: 100
      }
    });
  };

  const handleStartWinnerTakesAll = () => {
    setActiveGameType('QUICK');
    setCurrentScreen('GAME_TABLE');
    startNewGame(1, {
      playerCount: 4,
      customSettings: {
        mode: 'WINNER_TAKES_ALL',
        playerCount: 4,
        betAmount: 150
      }
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

  const handleStartUndergroundTable = (betAmount: number) => {
    setActiveGameType('UNDERGROUND');
    closeModal('UNDERGROUND');
    setCurrentScreen('GAME_TABLE');
    startNewGame(1, {
      undergroundBetAmount: betAmount,
      playerCount: 4
    });
  };

  const handleReturnToLobby = () => {
    engineRef.current = null;
    setCurrentScreen('LOBBY');
  };

  return (
    <>
      {/* 1. MÀN HÌNH CHÍNH (SẢNH HOẶC BÀN ĐẤU) */}
      {currentScreen === 'LOBBY' ? (
        <>
          <FallingBlossoms />
          <LobbyHub
            profile={profile}
            onOpenCustomGameModal={() => openModal('CUSTOM_GAME')}
            onOpenRanked={handleStartRanked}
            onOpenCampaign={() => openModal('CAMPAIGN')}
            onOpenUnderground={() => openModal('UNDERGROUND')}
            onStartSolo1v1={handleStartSolo1v1}
            onStartCountCards={handleStartCountCards}
            onStartWinnerTakesAll={handleStartWinnerTakesAll}
            onOpenShop={() => openModal('SHOP')}
            onOpenQuests={() => openModal('QUEST')}
            onOpenLuckyWheel={() => openModal('WHEEL')}
            onOpenBank={() => openModal('BANK')}
            onOpenSettings={() => openModal('SETTINGS')}
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
          onReturnToLobby={handleReturnToLobby}
        />
      )}

      {/* 2. MODALS TẬP TRUNG TOÀN ỨNG DỤNG */}
      <GameModals
        player0Tracker={trackersRef.current['p0']}
        onStartCustomGame={handleStartCustomGameWithConfig}
        onSelectUndergroundTable={handleStartUndergroundTable}
        onSelectCampaignChapter={handleStartCampaignChapter}
        campaignResultMeta={campaignResultMeta}
        onOpenCampaignMap={() => {
          closeModal('VICTORY');
          openModal('CAMPAIGN');
        }}
        onNextGame={() => {
          closeModal('VICTORY');
          if (activeGameType === 'CAMPAIGN') {
            if (campaignResultMeta?.isUnlockedNext && campaignResultMeta.nextChapter) {
              startNewGame(1, { campaignChapter: campaignResultMeta.nextChapter });
            } else {
              startNewGame(gameNumber + 1);
            }
          } else {
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
