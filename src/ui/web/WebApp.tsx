import React from 'react';
import { WebLobbyScreen } from './screens/WebLobbyScreen';
import { WebGameTableScreen } from './screens/WebGameTableScreen';
import { WebGameModals } from './modals/WebGameModals';
import { QuickSetupConfig } from './modals/QuickSetupModal';
import { CustomGameModalConfig } from './modals/CustomGameModal';
import { CampaignChapter } from '../../engine/campaign';
import { useModalStore } from '../../stores/useModalStore';
import { useViewStore } from '../../stores/useViewStore';
import { appFlowCoordinator } from '../../services/app-flow-coordinator';

export interface WebAppProps {
  campaignResultMeta: {
    isUnlockedNext: boolean;
    isAllCompleted: boolean;
    nextChapter: CampaignChapter | null;
    currentWins: number;
  } | null;
  startNewGame: (nextGameNumber: number, options?: { playerCount?: number; campaignChapter?: CampaignChapter }) => void;
  handleNextGame: () => void;
  handlePlaySelectedCards: () => void;
  handlePassTurn: () => void;
  handleAutoSort: () => void;
  handleApplyAiHint: () => void;
  handleDealCard: (playerIndex: number, currentCardCount: number) => void;
  handleDealComplete: () => void;
  handleForfeitMatch: () => void;
  handleRequestReturnToLobby: () => void;
  handleReturnToLobby: () => void;
  handlePlayNowDefault: () => void;
  handleStartQuickGame: (config: QuickSetupConfig) => void;
  handleStartCustomGameWithConfig: (config: CustomGameModalConfig) => void;
  handleStartCampaignChapter: (chapter: CampaignChapter) => void;
}

export const WebApp: React.FC<WebAppProps> = ({
  campaignResultMeta,
  handleNextGame,
  handlePlaySelectedCards,
  handlePassTurn,
  handleAutoSort,
  handleDealCard,
  handleDealComplete,
  handleForfeitMatch,
  handleRequestReturnToLobby,
  handleReturnToLobby,
  handlePlayNowDefault,
  handleStartQuickGame,
  handleStartCustomGameWithConfig,
  handleStartCampaignChapter
}) => {
  const { openModal, closeModal } = useModalStore();
  const { currentScreen } = useViewStore();

  return (
    <>
      {/* 1. MÀN HÌNH CHÍNH DESKTOP: SẢNH HOẶC BÀN ĐẤU */}
      {currentScreen === 'LOBBY' ? (
        <WebLobbyScreen
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
        <WebGameTableScreen
          onPlaySelectedCards={handlePlaySelectedCards}
          onPassTurn={handlePassTurn}
          onAutoSort={handleAutoSort}
          onDealCard={handleDealCard}
          onDealComplete={handleDealComplete}
          onReturnToLobby={handleRequestReturnToLobby}
        />
      )}

      {/* 2. MODALS TẬP TRUNG CHO WEB DESKTOP */}
      <WebGameModals
        player0Tracker={appFlowCoordinator.getPlayerTracker('p0')}
        onStartQuickGame={handleStartQuickGame}
        onStartCustomGame={handleStartCustomGameWithConfig}
        onSelectCampaignChapter={handleStartCampaignChapter}
        onConfirmForfeit={handleForfeitMatch}
        campaignResultMeta={campaignResultMeta}
        onOpenCampaignMap={() => {
          closeModal('VICTORY');
          openModal('CAMPAIGN');
        }}
        onNextGame={handleNextGame}
        onReturnToLobby={() => {
          closeModal('VICTORY');
          handleReturnToLobby();
        }}
      />
    </>
  );
};
