import React from 'react';
import { MobileLobbyScreen } from './screens/MobileLobbyScreen';
import { MobileGameTableScreen } from './screens/MobileGameTableScreen';
import { MobileGameSheets } from './sheets/MobileGameSheets';
import { GameEngine } from '../../engine/game';
import { CardTracker } from '../../ai/card-tracker';
import { QuickSetupConfig } from '../web/modals/QuickSetupModal';
import { CustomGameModalConfig } from '../web/modals/CustomGameModal';
import { CampaignChapter } from '../../engine/campaign';
import { PlayerProfile } from '../../engine/storage';
import { useModalStore } from '../../stores/useModalStore';
import { useGameStore } from '../../stores/useGameStore';

export interface MobileAppProps {
  engineRef: React.RefObject<GameEngine | null>;
  trackersRef: React.RefObject<{ [playerId: string]: CardTracker }>;
  profile: PlayerProfile;
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

export const MobileApp: React.FC<MobileAppProps> = ({
  engineRef,
  trackersRef,
  profile,
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
  const { currentScreen } = useGameStore();

  return (
    <>
      {/* 1. MÀN HÌNH CHÍNH MOBILE: SẢNH HOẶC BÀN ĐẤU */}
      {currentScreen === 'LOBBY' ? (
        <MobileLobbyScreen
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
        <MobileGameTableScreen
          engineRef={engineRef}
          onPlaySelectedCards={handlePlaySelectedCards}
          onPassTurn={handlePassTurn}
          onAutoSort={handleAutoSort}
          onDealCard={handleDealCard}
          onDealComplete={handleDealComplete}
          onReturnToLobby={handleRequestReturnToLobby}
        />
      )}

      {/* 2. TRANG CON TOÀN MÀN HÌNH & BOTTOM SHEETS CHO MOBILE */}
      <MobileGameSheets
        player0Tracker={trackersRef.current['p0'] || null}
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
