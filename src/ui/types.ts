import type { CampaignChapter } from '../engine/campaign';
import type { CampaignResultMeta } from '../stores/useGameStore';
import type { QuickSetupConfig } from './web/modals/QuickSetupModal';
import type { CustomGameModalConfig } from './hooks/useCustomGame';

export interface AppScreenProps {
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

export type WebAppProps = AppScreenProps;
export type MobileAppProps = AppScreenProps;

export interface GameModalsProps {
  onStartQuickGame: (config: QuickSetupConfig) => void;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
  onSelectCampaignChapter: (chapter: CampaignChapter) => void;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onConfirmForfeit: () => void;
  campaignResultMeta?: CampaignResultMeta | null;
  onOpenCampaignMap: (() => void) | null;
}

export type WebGameModalsProps = GameModalsProps;
export type MobileGameSheetsProps = GameModalsProps;

