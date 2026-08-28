import React from 'react';
import { useModalStore } from '../../../stores/useModalStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useGameStore } from '../../../stores/useGameStore';
import { MobileQuestsView } from '../views/MobileQuestsView';
import { MobileLuckyWheelView } from '../views/MobileLuckyWheelView';
import { MobileBankView } from '../views/MobileBankView';
import { MobileCampaignMapView } from '../views/MobileCampaignMapView';
import { MobileCustomGameView } from '../views/MobileCustomGameView';
import { CustomGameModalConfig } from '../../hooks/useCustomGame';
import { MobileQuickSetupSheet } from '../views/MobileQuickSetupSheet';
import { QuickSetupConfig } from '../../hooks/useQuickSetup';
import { MobileSettingsView } from '../views/MobileSettingsView';
import { XRayInspector } from '../../web/modals/XRayInspector';
import { MobileVictoryView } from '../views/MobileVictoryView';
import { ConfirmForfeitModal } from '../../web/modals/ConfirmForfeitModal';
import { F5PenaltyNoticeModal } from '../../web/modals/F5PenaltyNoticeModal';
import { MobileNameSetupView } from '../views/MobileNameSetupView';
import { MobileRulesView } from '../views/MobileRulesView';
import { MobileEcosystemView } from '../views/MobileEcosystemView';
import { BotProfileModal } from '../../web/modals/BotProfileModal';
import { MobileMatchmakingSheet } from './MobileMatchmakingSheet';
import { MobileSyncConflictView } from '../views/MobileSyncConflictView';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';
import { CardTracker } from '../../../ai/card-tracker';
import { CampaignChapter } from '../../../engine/campaign';
import { normalizePlayerCount } from '../../../engine/types';
import { BotConfig } from '../../../ai/types';

export interface MobileGameSheetsProps {
  player0Tracker: CardTracker | null;
  onStartQuickGame: (config: QuickSetupConfig) => void;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
  onSelectCampaignChapter: (chapter: CampaignChapter) => void;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onConfirmForfeit: () => void;
  campaignResultMeta: {
    isUnlockedNext: boolean;
    isAllCompleted: boolean;
    nextChapter: CampaignChapter | null;
    currentWins: number;
  } | null;
  onOpenCampaignMap: (() => void) | null;
  matchmakingData: {
    betAmount: number;
    modeName: string;
    botConfigs: Partial<BotConfig>[];
    playerCount?: number;
  } | null;
  onCancelMatchmaking: () => void;
  onMatchReady: () => void;
}

export const MobileGameSheets: React.FC<MobileGameSheetsProps> = ({
  player0Tracker,
  onStartQuickGame,
  onStartCustomGame,
  onSelectCampaignChapter,
  onNextGame,
  onReturnToLobby,
  onConfirmForfeit,
  campaignResultMeta,
  onOpenCampaignMap,
  matchmakingData,
  onCancelMatchmaking,
  onMatchReady
}) => {
  // Modal Store
  const {
    isSettingsOpen,
    isCustomGameModalOpen,
    isQuickSetupOpen,
    isMatchmakingOpen,
    isXRayOpen,
    isVictoryOpen,
    isQuestModalOpen,
    isLuckyWheelOpen,
    isBankLoanModalOpen,
    isCampaignModalOpen,
    isNameSetupOpen,
    isRulesOpen,
    isEcosystemOpen,
    isBotProfileOpen,
    isSyncConflictOpen,
    syncConflictData,
    openModal,
    closeModal
  } = useModalStore();

  const { selectedBot } = useEcosystemStore();

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
    lastEloDelta,
    allEloDeltas
  } = useGameStore();

  const p0 = players.find(p => p.id === 'p0');

  return (
    <>
      {/* 1. Trang Cài Đặt Native Mobile */}
      {isSettingsOpen && (
        <MobileSettingsView
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
      )}

      {/* 2. Trang Tùy Chỉnh Nâng Cao Sandbox (Native Mobile View) */}
      {isCustomGameModalOpen && (
        <MobileCustomGameView
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
      )}

      {/* 3. Ngăn Kéo Cấu Hình Nhanh (Native Mobile Sheet) */}
      {isQuickSetupOpen && (
        <MobileQuickSetupSheet
          isOpen={isQuickSetupOpen}
          onClose={() => closeModal('QUICK_SETUP')}
          playerCoins={profile.coins}
          onStartGame={onStartQuickGame}
        />
      )}

      {/* 4. Màn Hình Ghép Trận Đấu Radar Native Mobile */}
      {isMatchmakingOpen && (
        <MobileMatchmakingSheet
          isOpen={isMatchmakingOpen}
          onCancel={onCancelMatchmaking || (() => closeModal('MATCHMAKING'))}
          onMatchReady={onMatchReady || (() => {})}
          playerProfile={profile}
          betAmount={matchmakingData?.betAmount || 100}
          modeName={matchmakingData?.modeName || 'Tiến Lên Miền Nam'}
          matchedBots={matchmakingData?.botConfigs || []}
          playerCount={matchmakingData?.playerCount || 4}
        />
      )}

      {/* 5. Trang Soi Bài X-Ray (Full Screen Sheet) */}
      {isXRayOpen && (
        <XRayInspector
          isOpen={isXRayOpen}
          onClose={() => closeModal('XRAY')}
          tracker={player0Tracker || new CardTracker(p0?.hand || [], 1.0)}
          ownHand={p0?.hand || []}
          currentHint={currentHint}
        />
      )}

      {/* 6. Trang Tổng Kết Ván Đấu & Trao Thưởng (Native Mobile) */}
      {isVictoryOpen && (
        <MobileVictoryView
          isOpen={isVictoryOpen}
          onNextGame={onNextGame}
          onReturnToLobby={onReturnToLobby}
          onOpenCampaignMap={onOpenCampaignMap || (() => { closeModal('VICTORY'); openModal('CAMPAIGN'); })}
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
          allEloDeltas={allEloDeltas}
        />
      )}

      {/* 7. Trang Nhiệm Vụ & Thành Tựu Native Mobile */}
      {isQuestModalOpen && (
        <MobileQuestsView
          isOpen={isQuestModalOpen}
          profile={profile}
          onClose={() => closeModal('QUEST')}
          onUpdateProfile={setProfile}
        />
      )}

      {/* 8. Trang Vòng Quay May Mắn Native Mobile */}
      {isLuckyWheelOpen && (
        <MobileLuckyWheelView
          isOpen={isLuckyWheelOpen}
          profile={profile}
          onClose={() => closeModal('WHEEL')}
          onUpdateProfile={setProfile}
        />
      )}

      {/* 9. Trang Quỹ Cứu Trợ & Vay Vốn Native Mobile */}
      {isBankLoanModalOpen && (
        <MobileBankView
          isOpen={isBankLoanModalOpen}
          profile={profile}
          onClose={() => closeModal('BANK')}
          onUpdateProfile={setProfile}
        />
      )}

      {/* 10. Trang Bản Đồ Chiến Dịch Cốt Truyện Native Mobile */}
      {isCampaignModalOpen && (
        <MobileCampaignMapView
          isOpen={isCampaignModalOpen}
          profile={profile}
          onClose={() => closeModal('CAMPAIGN')}
          onSelectChapter={onSelectCampaignChapter}
        />
      )}

      {/* 11. Ngăn Kéo Xác Nhận Bỏ Cuộc Giữa Trận (Bottom Sheet) */}
      <ConfirmForfeitModal onConfirmForfeit={onConfirmForfeit} />

      {/* 12. Ngăn Kéo Thông Báo Phạt F5 (Bottom Sheet) */}
      <F5PenaltyNoticeModal />

      {/* 13. Màn Hình Đặt Tên & Cập Nhật Hồ Sơ Native Mobile */}
      {isNameSetupOpen && (
        <MobileNameSetupView
          isOpen={isNameSetupOpen}
          profile={profile}
          onClose={() => closeModal('NAME_SETUP')}
          onUpdateProfile={setProfile}
          isFirstTime={!profile.name || profile.name.trim() === ''}
        />
      )}

      {/* 14. Trang Hướng Dẫn Luật & Khắc Chế Native Mobile */}
      {isRulesOpen && (
        <MobileRulesView
          isOpen={isRulesOpen}
          onClose={() => closeModal('RULES')}
        />
      )}

      {/* 15. Trang Bảng Vàng Danh Vọng Toàn Server Native Mobile */}
      {isEcosystemOpen && (
        <MobileEcosystemView
          isOpen={isEcosystemOpen}
          onClose={() => closeModal('ECOSYSTEM')}
        />
      )}

      {/* 16. Trang Hồ Sơ Cao Thủ Bot */}
      {isBotProfileOpen && selectedBot && (
        <BotProfileModal
          isOpen={isBotProfileOpen}
          bot={selectedBot}
          onClose={() => closeModal('BOT_PROFILE')}
        />
      )}

      {/* 17. Trang Xử Lý Xung Đột Dữ Liệu Đồng Bộ Đám Mây (Native Mobile - Bắt buộc chọn) */}
      {isSyncConflictOpen && syncConflictData && (
        <MobileSyncConflictView
          isOpen={isSyncConflictOpen}
          conflictData={syncConflictData || null}
          onClose={() => closeModal('SYNC_CONFLICT')}
        />
      )}
    </>
  );
};
