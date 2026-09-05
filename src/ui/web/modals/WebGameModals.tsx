import React from 'react';
import { useViewStore } from '../../../stores/useViewStore';
import { useGameStore, type CampaignResultMeta } from '../../../stores/useGameStore';
import { QuestsModal } from './QuestsModal';
import { LuckyWheelModal } from './LuckyWheelModal';
import { BankruptcyModal } from './BankruptcyModal';
import { CampaignMapModal } from './CampaignMapModal';
import { CustomGameModal, CustomGameModalConfig } from './CustomGameModal';
import { QuickSetupModal, QuickSetupConfig } from './QuickSetupModal';
import { SettingsModal } from './SettingsModal';
import { XRayInspector } from './XRayInspector';
import { VictoryModal } from './VictoryModal';
import { ConfirmForfeitModal } from './ConfirmForfeitModal';
import { F5PenaltyNoticeModal } from './F5PenaltyNoticeModal';
import { NameSetupModal } from './NameSetupModal';
import { RulesModal } from './RulesModal';
import { EcosystemModal } from './EcosystemModal';
import { BotProfileModal } from './BotProfileModal';
import { MatchmakingModal } from './MatchmakingModal';
import { SyncConflictModal } from './SyncConflictModal';
import { OnlineRoomModal } from './OnlineRoomModal';
import { OnlineDisbandModal } from '../../components/OnlineDisbandModal';
import { CampaignChapter } from '../../../engine/campaign';
import { normalizePlayerCount } from '../../../engine/types';
import { useMatchmakingStore } from '../../../stores/useMatchmakingStore';

export interface WebGameModalsProps {
  onStartQuickGame: (config: QuickSetupConfig) => void;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
  onSelectCampaignChapter: (chapter: CampaignChapter) => void;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onConfirmForfeit: () => void;
  campaignResultMeta?: CampaignResultMeta | null;
  onOpenCampaignMap: (() => void) | null;
}

export const WebGameModals: React.FC<WebGameModalsProps> = ({
  onStartQuickGame,
  onStartCustomGame,
  onSelectCampaignChapter,
  onNextGame,
  onReturnToLobby,
  onConfirmForfeit,
  campaignResultMeta,
  onOpenCampaignMap
}) => {
  const { cancelMatchmaking, executeMatch } = useMatchmakingStore();
  // Modal Store
  const {
    activeModal,
    isSettingsOpen,
    isCustomGameModalOpen,
    isQuickSetupOpen,
    isVictoryOpen,
    isQuestModalOpen,
    isLuckyWheelOpen,
    isBankLoanModalOpen,
    isCampaignModalOpen,
    isNameSetupOpen,
    isRulesOpen,
    openModal,
    closeModal
  } = useViewStore();

  // Game Store
  const {
    gameSettings,
    quickTableConfig,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    currentHint
  } = useGameStore();

  return (
    <>
      {/* 1. Quests & Achievements Modal */}
      <QuestsModal
        isOpen={isQuestModalOpen}
        onClose={() => closeModal('QUEST')}
      />

      {/* 2. Lucky Wheel Modal */}
      <LuckyWheelModal
        isOpen={isLuckyWheelOpen}
        onClose={() => closeModal('WHEEL')}
      />

      {/* 3. Bank Loan / Relief Modal */}
      <BankruptcyModal
        isOpen={isBankLoanModalOpen}
        onClose={() => closeModal('BANK')}
      />

      {/* 4. Campaign Map Modal */}
      <CampaignMapModal
        isOpen={isCampaignModalOpen}
        onClose={() => closeModal('CAMPAIGN')}
        onSelectChapter={onSelectCampaignChapter}
      />

      {/* 5. Quick Setup Modal (Chơi Nhanh) */}
      <QuickSetupModal
        isOpen={isQuickSetupOpen}
        onClose={() => closeModal('QUICK_SETUP')}
        initialConfig={{
          playerCount: quickTableConfig.playerCount,
          mode: quickTableConfig.settlementRule,
          betAmount: quickTableConfig.betAmount,
          choppingMultiplier: quickTableConfig.choppingMultiplier,
          congEnabled: quickTableConfig.congEnabled,
          prohibitEndingWithTwo: quickTableConfig.prohibitEndingWithTwo,
          allowFourPairsCutAnytime: quickTableConfig.allowFourPairsCutAnytime,
          threeSpadesEndingBonus: quickTableConfig.threeSpadesEndingBonus,
          cascadeChopEnabled: quickTableConfig.cascadeChopEnabled
        }}
        onStartGame={onStartQuickGame}
      />

      {/* 5.1. Matchmaking Modal (Giả Lập Ghép Trận Online) */}
      {activeModal?.type === 'MATCHMAKING' && (
        <MatchmakingModal
          match={activeModal.match}
          onCancel={cancelMatchmaking}
          onMatchReady={executeMatch}
        />
      )}

      {/* 6. Custom Game Config Modal */}
      <CustomGameModal
        isOpen={isCustomGameModalOpen}
        onClose={() => closeModal('CUSTOM_GAME')}
        initialConfig={{
          selectedModeId: gameSettings.mode === 'COUNT_CARDS' ? 'COUNT_CARDS' : gameSettings.mode === 'WINNER_TAKES_ALL' ? 'WINNER_TAKES_ALL' : 'TRADITIONAL',
          settings: gameSettings,
          playerCount: normalizePlayerCount(playerCount),
          botPersonaIds: botPersonaIds,
          customBotConfigs: customBotConfigs
        }}
        onStartCustomGame={onStartCustomGame}
      />

      {/* 7. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => closeModal('SETTINGS')}
      />

      {/* 8. X-Ray Inspector */}
      {activeModal?.type === 'XRAY' && (
        <XRayInspector
          isOpen={true}
          onClose={() => closeModal('XRAY')}
          tracker={activeModal.tracker}
          ownHand={activeModal.ownHand}
          currentHint={currentHint}
        />
      )}

      {/* 9. Victory Modal */}
      <VictoryModal
        isOpen={isVictoryOpen}
        onNextGame={onNextGame}
        onReturnToLobby={onReturnToLobby}
        onOpenCampaignMap={onOpenCampaignMap || (() => { closeModal('VICTORY'); openModal('CAMPAIGN'); })}
        campaignResultMeta={campaignResultMeta}
      />

      {/* 10. Confirm Forfeit Modal */}
      {activeModal?.type === 'CONFIRM_FORFEIT' && (
        <ConfirmForfeitModal
          data={activeModal.data}
          onClose={() => closeModal('CONFIRM_FORFEIT')}
          onConfirmForfeit={onConfirmForfeit}
        />
      )}

      {/* 11. F5 Penalty Notice Modal */}
      {activeModal?.type === 'F5_PENALTY_NOTICE' && (
        <F5PenaltyNoticeModal
          data={activeModal.data}
          onClose={() => closeModal('F5_PENALTY_NOTICE')}
        />
      )}

      {/* 12. Name Setup Modal */}
      <NameSetupModal
        isOpen={isNameSetupOpen}
        onClose={() => closeModal('NAME_SETUP')}
      />

      {/* 13. Rules & Counter Matrix Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => closeModal('RULES')}
      />

      {/* 14. Ecosystem & Leaderboard 200 Bot Modal */}
      <EcosystemModal />

      {/* 15. Bot Profile Card Modal */}
      {activeModal?.type === 'BOT_PROFILE' && (
        <BotProfileModal
          isOpen={true}
          bot={activeModal.bot}
          onClose={() => closeModal('BOT_PROFILE')}
        />
      )}

      {/* 16. Sync Conflict Resolution Modal */}
      {activeModal?.type === 'SYNC_CONFLICT' && (
        <SyncConflictModal
          conflictData={activeModal.data}
          onClose={() => closeModal('SYNC_CONFLICT')}
        />
      )}

      {/* 17. Online P2P Multiplayer Room Modal */}
      <OnlineRoomModal />

      {/* 18. Online Disband & Kick Notice Modal */}
      <OnlineDisbandModal />
    </>
  );
};
