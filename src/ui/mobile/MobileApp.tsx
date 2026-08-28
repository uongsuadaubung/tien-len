import React from 'react';
import { MobileLobbyScreen } from './screens/MobileLobbyScreen';
import { MobileGameTableScreen } from './screens/MobileGameTableScreen';
import { MobileGameSheets } from './sheets/MobileGameSheets';
import { GameEngine } from '../../engine/game';
import { CardTracker } from '../../ai/card-tracker';
import { QuickSetupConfig } from '../web/modals/QuickSetupModal';
import { CustomGameModalConfig } from '../web/modals/CustomGameModal';
import { CampaignChapter } from '../../engine/campaign';
import { BotConfig } from '../../ai/types';
import { PlayerProfile } from '../../engine/storage';
import { useModalStore } from '../../stores/useModalStore';
import { useGameStore } from '../../stores/useGameStore';
import { useUserStore } from '../../stores/useUserStore';

export interface MobileAppProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  trackersRef: React.MutableRefObject<{ [playerId: string]: CardTracker }>;
  profile: PlayerProfile;
  campaignResultMeta: {
    isUnlockedNext: boolean;
    isAllCompleted: boolean;
    nextChapter: CampaignChapter | null;
    currentWins: number;
  } | null;
  pendingMatch: {
    betAmount: number;
    modeName: string;
    botConfigs: Partial<BotConfig>[];
    playerCount: number | null;
    onStart: () => void;
  } | null;
  startNewGame: (nextGameNumber: number, options?: { playerCount?: number; campaignChapter?: CampaignChapter }) => void;
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
  handleCancelMatchmaking: () => void;
  handleExecuteMatch: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({
  engineRef,
  trackersRef,
  profile,
  campaignResultMeta,
  pendingMatch,
  startNewGame,
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
  handleStartCampaignChapter,
  handleCancelMatchmaking,
  handleExecuteMatch
}) => {
  const { openModal, closeModal } = useModalStore();
  const { currentScreen, activeGameType, gameNumber, playerCount, gameSettings } = useGameStore();

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
        matchmakingData={
          pendingMatch
            ? {
                betAmount: pendingMatch.betAmount,
                modeName: pendingMatch.modeName,
                botConfigs: pendingMatch.botConfigs,
                playerCount: pendingMatch.playerCount || 4
              }
            : null
        }
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
