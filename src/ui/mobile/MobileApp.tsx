import React from 'react';
import { MobileLobbyScreen } from './screens/MobileLobbyScreen';
import { MobileGameTableScreen } from './screens/MobileGameTableScreen';
import { MobileGameSheets } from './sheets/MobileGameSheets';
import { QuickSetupConfig } from '../web/modals/QuickSetupModal';
import { CustomGameModalConfig } from '../web/modals/CustomGameModal';
import { CampaignChapter } from '../../engine/campaign';
import { useViewStore } from '../../stores/useViewStore';
import type { CampaignResultMeta } from '../../stores/useGameStore';

export interface MobileAppProps {
  campaignResultMeta?: CampaignResultMeta | null;
  handleNextGame: () => void;
  handlePlaySelectedCards: () => void;
  handlePassTurn: () => void;
  handleAutoSort: () => void;
  handleApplyAiHint: () => void;
  handleDealCard: (playerIndex: number, currentCardCount: number) => void;
  handleDealComplete: () => void;
  handleForfeitMatch: () => void;
  handleReturnToLobby: () => void;
  handleRequestExitTable?: () => void;
  handlePlayNowDefault: () => void;
  handleStartQuickGame: (config: QuickSetupConfig) => void;
  handleStartCustomGameWithConfig: (config: CustomGameModalConfig) => void;
  handleStartCampaignChapter: (chapter: CampaignChapter) => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({
  campaignResultMeta,
  handleNextGame,
  handlePlaySelectedCards,
  handlePassTurn,
  handleAutoSort,
  handleDealCard,
  handleDealComplete,
  handleForfeitMatch,
  handleReturnToLobby,
  handleRequestExitTable,
  handlePlayNowDefault,
  handleStartQuickGame,
  handleStartCustomGameWithConfig,
  handleStartCampaignChapter
}) => {
  const { currentScreen, openModal, closeModal } = useViewStore();

  return (
    <>
      {/* 1. MÀN HÌNH CHÍNH MOBILE: SẢNH HOẶC BÀN ĐẤU */}
      {currentScreen === 'LOBBY' ? (
        <MobileLobbyScreen
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
        <MobileGameTableScreen
          onPlaySelectedCards={handlePlaySelectedCards}
          onPassTurn={handlePassTurn}
          onAutoSort={handleAutoSort}
          onDealCard={handleDealCard}
          onDealComplete={handleDealComplete}
          onReturnToLobby={handleRequestExitTable || handleReturnToLobby}
        />
      )}

      {/* 2. TRANG CON TOÀN MÀN HÌNH & BOTTOM SHEETS CHO MOBILE */}
      <MobileGameSheets
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
