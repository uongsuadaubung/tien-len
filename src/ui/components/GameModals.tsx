import React from 'react';
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { ShopModal } from './ShopModal';
import { QuestsModal } from './QuestsModal';
import { LuckyWheelModal } from './LuckyWheelModal';
import { BankruptcyModal } from './BankruptcyModal';
import { UndergroundCasinoModal } from './UndergroundCasinoModal';
import { CampaignMapModal } from './CampaignMapModal';
import { CustomGameModal, CustomGameModalConfig } from './CustomGameModal';
import { SettingsModal } from './SettingsModal';
import { XRayInspector } from './XRayInspector';
import { VictoryModal } from './VictoryModal';
import { CardTracker } from '../../ai/card-tracker';
import { CampaignChapter } from '../../engine/campaign';

interface GameModalsProps {
  player0Tracker?: CardTracker;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
  onSelectUndergroundTable: (betAmount: number) => void;
  onSelectCampaignChapter: (chapter: CampaignChapter) => void;
  onNextGame: () => void;
  onReturnToLobby: () => void;
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
  onStartCustomGame,
  onSelectUndergroundTable,
  onSelectCampaignChapter,
  onNextGame,
  onReturnToLobby,
  campaignResultMeta,
  onOpenCampaignMap
}) => {
  // Modal Store
  const {
    isSettingsOpen,
    isCustomGameModalOpen,
    isXRayOpen,
    isVictoryOpen,
    isQuestModalOpen,
    isLuckyWheelOpen,
    isBankLoanModalOpen,
    isShopModalOpen,
    isCampaignModalOpen,
    isUndergroundModalOpen,
    openModal,
    closeModal
  } = useModalStore();

  // User Store
  const { profile, setProfile } = useUserStore();

  // Settings Store
  const {
    soundEnabled,
    blossomEnabled,
    autoSortEnabled,
    aiHintEnabled,
    xrayEnabled,
    toggleSound,
    toggleBlossom,
    toggleAutoSort,
    toggleAiHint,
    toggleXRay
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
    matchPayouts,
    loanDeductionAmount,
    lastEloDelta
  } = useGameStore();

  const p0 = players.find(p => p.id === 'p0');

  return (
    <>
      {/* 1. Shop Modal */}
      <ShopModal
        isOpen={isShopModalOpen}
        profile={profile}
        onClose={() => closeModal('SHOP')}
        onUpdateProfile={setProfile}
      />

      {/* 2. Quests & Achievements Modal */}
      <QuestsModal
        isOpen={isQuestModalOpen}
        profile={profile}
        onClose={() => closeModal('QUEST')}
        onUpdateProfile={setProfile}
      />

      {/* 3. Lucky Wheel Modal */}
      <LuckyWheelModal
        isOpen={isLuckyWheelOpen}
        profile={profile}
        onClose={() => closeModal('WHEEL')}
        onUpdateProfile={setProfile}
      />

      {/* 4. Bank Loan / Relief Modal */}
      <BankruptcyModal
        isOpen={isBankLoanModalOpen}
        profile={profile}
        onClose={() => closeModal('BANK')}
        onUpdateProfile={setProfile}
      />

      {/* 5. Underground Casino Modal */}
      <UndergroundCasinoModal
        isOpen={isUndergroundModalOpen}
        profile={profile}
        onClose={() => closeModal('UNDERGROUND')}
        onSelectTable={onSelectUndergroundTable}
      />

      {/* 6. Campaign Map Modal */}
      <CampaignMapModal
        isOpen={isCampaignModalOpen}
        profile={profile}
        onClose={() => closeModal('CAMPAIGN')}
        onSelectChapter={onSelectCampaignChapter}
      />

      {/* 7. Custom Game Config Modal */}
      <CustomGameModal
        isOpen={isCustomGameModalOpen}
        onClose={() => closeModal('CUSTOM_GAME')}
        playerCoins={profile.coins}
        initialConfig={{
          selectedModeId: gameSettings.mode === 'COUNT_CARDS' ? 'COUNT_CARDS' : gameSettings.mode === 'WINNER_TAKES_ALL' ? 'WINNER_TAKES_ALL' : 'TRADITIONAL',
          settings: gameSettings,
          botPersonaIds,
          customBotConfigs,
          playerCount: playerCount as 2 | 3 | 4
        }}
        onStartCustomGame={onStartCustomGame}
      />

      {/* 8. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => closeModal('SETTINGS')}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        blossomEnabled={blossomEnabled}
        onToggleBlossom={toggleBlossom}
        autoSortEnabled={autoSortEnabled}
        onToggleAutoSort={toggleAutoSort}
        aiHintEnabled={aiHintEnabled}
        onToggleAiHint={toggleAiHint}
        xrayEnabled={xrayEnabled}
        onToggleXRay={toggleXRay}
      />

      {/* 9. X-Ray Inspector */}
      <XRayInspector
        isOpen={isXRayOpen}
        onClose={() => closeModal('XRAY')}
        tracker={player0Tracker || new CardTracker(p0?.hand || [], 1.0)}
        ownHand={p0?.hand || []}
        currentHint={currentHint}
      />

      {/* 10. Victory Modal */}
      <VictoryModal
        isOpen={isVictoryOpen}
        onNextGame={onNextGame}
        onReturnToLobby={onReturnToLobby}
        onOpenCampaignMap={onOpenCampaignMap || (() => { closeModal('VICTORY'); openModal('CAMPAIGN'); })}
        onOpenUndergroundModal={() => { closeModal('VICTORY'); openModal('UNDERGROUND'); }}
        onOpenCustomGameModal={() => { closeModal('VICTORY'); openModal('CUSTOM_GAME'); }}
        onOpenBankLoanModal={() => { closeModal('VICTORY'); openModal('BANK'); }}
        winners={winners}
        allPlayers={players}
        betAmount={gameSettings.betAmount}
        instantWinType={instantWinType}
        payouts={matchPayouts}
        loanDeduction={loanDeductionAmount}
        eloDelta={lastEloDelta}
        playerElo={profile.elo}
        activeGameType={activeGameType}
        campaignChapter={currentCampaignChapter}
        chapterWins={campaignResultMeta?.currentWins ?? (profile.campaignChapterWins[currentCampaignChapter?.id || 1] || 0)}
        isChapterUnlockedNext={campaignResultMeta?.isUnlockedNext}
        isAllCampaignCompleted={campaignResultMeta?.isAllCompleted}
        nextChapter={campaignResultMeta?.nextChapter}
        playerCoins={profile.coins}
      />
    </>
  );
};
