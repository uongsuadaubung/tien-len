import React from 'react';
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
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
import { CardTracker } from '../../ai/card-tracker';
import { CampaignChapter } from '../../engine/campaign';
import { normalizePlayerCount } from '../../engine/types';

interface GameModalsProps {
  player0Tracker?: CardTracker;
  onStartQuickGame: (config: QuickSetupConfig) => void;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
  onSelectCampaignChapter: (chapter: CampaignChapter) => void;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onConfirmForfeit: () => void;
  campaignResultMeta?: {
    isUnlockedNext: boolean;
    isAllCompleted: boolean;
    nextChapter: CampaignChapter | null;
    currentWins: number;
  } | null;
  onOpenCampaignMap?: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  player0Tracker,
  onStartQuickGame,
  onStartCustomGame,
  onSelectCampaignChapter,
  onNextGame,
  onReturnToLobby,
  onConfirmForfeit,
  campaignResultMeta,
  onOpenCampaignMap
}) => {
  // Modal Store
  const {
    isSettingsOpen,
    isCustomGameModalOpen,
    isQuickSetupOpen,
    isXRayOpen,
    isVictoryOpen,
    isQuestModalOpen,
    isLuckyWheelOpen,
    isBankLoanModalOpen,
    isCampaignModalOpen,
    isNameSetupOpen,
    isRulesOpen,
    openModal,
    closeModal
  } = useModalStore();

  // User Store
  const { profile, setProfile } = useUserStore();

  // Settings Store
  const {
    soundEnabled,
    autoSortEnabled,
    aiHintEnabled,
    quickResponseAssistEnabled,
    xrayEnabled,
    botReasoningLogEnabled,
    gameSpeed,
    toggleSound,
    toggleAutoSort,
    toggleAiHint,
    toggleQuickResponseAssist,
    toggleXRay,
    toggleBotReasoningLog,
    setGameSpeed
  } = useSettingsStore();

  // Game Store
  const {
    activeGameType,
    gameSettings,
    currentCampaignChapter,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    players,
    winners,
    currentHint,
    instantWinType,
    isThreeSpadesWin,
    matchPayouts,
    loanDeductionAmount,
    lastEloDelta
  } = useGameStore();

  const p0 = players.find(p => p.id === 'p0');

  return (
    <>
      {/* 1. Quests & Achievements Modal */}
      <QuestsModal
        isOpen={isQuestModalOpen}
        profile={profile}
        onClose={() => closeModal('QUEST')}
        onUpdateProfile={setProfile}
      />

      {/* 2. Lucky Wheel Modal */}
      <LuckyWheelModal
        isOpen={isLuckyWheelOpen}
        profile={profile}
        onClose={() => closeModal('WHEEL')}
        onUpdateProfile={setProfile}
      />

      {/* 3. Bank Loan / Relief Modal */}
      <BankruptcyModal
        isOpen={isBankLoanModalOpen}
        profile={profile}
        onClose={() => closeModal('BANK')}
        onUpdateProfile={setProfile}
      />

      {/* 4. Campaign Map Modal */}
      <CampaignMapModal
        isOpen={isCampaignModalOpen}
        profile={profile}
        onClose={() => closeModal('CAMPAIGN')}
        onSelectChapter={onSelectCampaignChapter}
      />

      {/* 5. Quick Setup Modal (Chơi Nhanh) */}
      <QuickSetupModal
        isOpen={isQuickSetupOpen}
        onClose={() => closeModal('QUICK_SETUP')}
        playerCoins={profile.coins}
        onStartGame={onStartQuickGame}
      />

      {/* 6. Custom Game Config Modal */}
      <CustomGameModal
        isOpen={isCustomGameModalOpen}
        onClose={() => closeModal('CUSTOM_GAME')}
        playerCoins={profile.coins}
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
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        autoSortEnabled={autoSortEnabled}
        onToggleAutoSort={toggleAutoSort}
        aiHintEnabled={aiHintEnabled}
        onToggleAiHint={toggleAiHint}
        quickResponseAssistEnabled={quickResponseAssistEnabled}
        onToggleQuickResponseAssist={toggleQuickResponseAssist}
        xrayEnabled={xrayEnabled}
        onToggleXRay={toggleXRay}
        botReasoningLogEnabled={botReasoningLogEnabled}
        onToggleBotReasoningLog={toggleBotReasoningLog}
        gameSpeed={gameSpeed}
        onSetGameSpeed={setGameSpeed}
      />

      {/* 8. X-Ray Inspector */}
      <XRayInspector
        isOpen={isXRayOpen}
        onClose={() => closeModal('XRAY')}
        tracker={player0Tracker || new CardTracker(p0?.hand || [], 1.0)}
        ownHand={p0?.hand || []}
        currentHint={currentHint}
      />

      {/* 9. Victory Modal */}
      <VictoryModal
        isOpen={isVictoryOpen}
        onNextGame={onNextGame}
        onReturnToLobby={onReturnToLobby}
        onOpenCampaignMap={onOpenCampaignMap || (() => { closeModal('VICTORY'); openModal('CAMPAIGN'); })}
        onOpenCustomGameModal={() => { closeModal('VICTORY'); openModal('CUSTOM_GAME'); }}
        onOpenBankLoanModal={() => { closeModal('VICTORY'); openModal('BANK'); }}
        winners={winners}
        allPlayers={players}
        betAmount={gameSettings.betAmount}
        instantWinType={instantWinType || null}
        isThreeSpadesWin={isThreeSpadesWin}
        payouts={matchPayouts}
        loanDeduction={loanDeductionAmount}
        eloDelta={lastEloDelta}
        playerElo={profile.elo}
        activeGameType={activeGameType}
        campaignChapter={currentCampaignChapter || null}
        chapterWins={campaignResultMeta?.currentWins ?? (profile.campaignChapterWins[currentCampaignChapter?.id || 1] || 0)}
        isChapterUnlockedNext={campaignResultMeta?.isUnlockedNext || false}
        isAllCampaignCompleted={campaignResultMeta?.isAllCompleted || false}
        nextChapter={campaignResultMeta?.nextChapter || null}
        playerCoins={profile.coins}
        botReasoningLogEnabled={botReasoningLogEnabled}
      />

      {/* 10. Confirm Forfeit Modal */}
      <ConfirmForfeitModal onConfirmForfeit={onConfirmForfeit} />

      {/* 11. F5 Penalty Notice Modal */}
      <F5PenaltyNoticeModal />

      {/* 12. Name Setup Modal */}
      <NameSetupModal
        isOpen={isNameSetupOpen}
        profile={profile}
        onClose={() => closeModal('NAME_SETUP')}
        onUpdateProfile={setProfile}
        isFirstTime={!profile.name || profile.name.trim() === ''}
      />

      {/* 13. Rules & Counter Matrix Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => closeModal('RULES')}
      />
    </>
  );
};
