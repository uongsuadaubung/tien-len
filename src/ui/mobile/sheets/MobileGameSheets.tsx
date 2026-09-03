import React from 'react';
import { useModalStore } from '../../../stores/useModalStore';
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
import { MobileOnlineRoomView } from '../views/MobileOnlineRoomView';
import { MobileOnlineDisbandView } from '../views/MobileOnlineDisbandView';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';
import { useOnlineStore } from '../../../stores/useOnlineStore';
import { CardTracker } from '../../../ai/card-tracker';
import { CampaignChapter } from '../../../engine/campaign';
import { normalizePlayerCount } from '../../../engine/types';
import { useMatchmakingStore } from '../../../stores/useMatchmakingStore';
import { appFlowCoordinator } from '../../../services/app-flow-coordinator';

export interface MobileGameSheetsProps {
  player0Tracker?: CardTracker | null;
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
  onOpenCampaignMap
}) => {
  const { pendingMatch, cancelMatchmaking, executeMatch } = useMatchmakingStore();
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
    isOnlineRoomOpen,
    syncConflictData,
    openModal,
    closeModal
  } = useModalStore();

  const { selectedBot } = useEcosystemStore();
  const { disbandNotice, clearDisbandNotice } = useOnlineStore();

  // Game Store
  const {
    gameSettings,
    quickTableConfig,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    players,
    currentHint,
    myPlayerId
  } = useGameStore();

  const localPlayer = players.find(p => p.id === myPlayerId) || players[0];

  return (
    <>
      {/* 1. Trang Cài Đặt Native Mobile */}
      {isSettingsOpen && (
        <MobileSettingsView
          isOpen={isSettingsOpen}
          onClose={() => closeModal('SETTINGS')}
        />
      )}

      {/* 2. Trang Tùy Chỉnh Nâng Cao Sandbox (Native Mobile View) */}
      {isCustomGameModalOpen && (
        <MobileCustomGameView
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
      )}

      {/* 3. Ngăn Kéo Cấu Hình Nhanh (Native Mobile Sheet) */}
      {isQuickSetupOpen && (
        <MobileQuickSetupSheet
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
      )}

      {/* 4. Màn Hình Ghép Trận Đấu Radar Native Mobile */}
      {isMatchmakingOpen && (
        <MobileMatchmakingSheet
          isOpen={isMatchmakingOpen}
          onCancel={cancelMatchmaking}
          onMatchReady={executeMatch}
          betAmount={pendingMatch?.betAmount || 100}
          modeName={pendingMatch?.modeName || 'Tiến Lên Miền Nam'}
          matchedBots={pendingMatch?.botConfigs || []}
          playerCount={pendingMatch?.playerCount || 4}
        />
      )}

      {/* 5. Trang Soi Bài X-Ray (Full Screen Sheet) */}
      {isXRayOpen && (
        <XRayInspector
          isOpen={isXRayOpen}
          onClose={() => closeModal('XRAY')}
          tracker={player0Tracker || appFlowCoordinator.getPlayerTracker('p0') || new CardTracker(localPlayer?.hand || [], 1.0)}
          ownHand={localPlayer?.hand || []}
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
          campaignResultMeta={campaignResultMeta}
        />
      )}

      {/* 7. Trang Nhiệm Vụ & Thành Tựu Native Mobile */}
      {isQuestModalOpen && (
        <MobileQuestsView
          isOpen={isQuestModalOpen}
          onClose={() => closeModal('QUEST')}
        />
      )}

      {/* 8. Trang Vòng Quay May Mắn Native Mobile */}
      {isLuckyWheelOpen && (
        <MobileLuckyWheelView
          isOpen={isLuckyWheelOpen}
          onClose={() => closeModal('WHEEL')}
        />
      )}

      {/* 9. Trang Quỹ Cứu Trợ & Vay Vốn Native Mobile */}
      {isBankLoanModalOpen && (
        <MobileBankView
          isOpen={isBankLoanModalOpen}
          onClose={() => closeModal('BANK')}
        />
      )}

      {/* 10. Trang Bản Đồ Chiến Dịch Cốt Truyện Native Mobile */}
      {isCampaignModalOpen && (
        <MobileCampaignMapView
          isOpen={isCampaignModalOpen}
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
          onClose={() => closeModal('NAME_SETUP')}
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

      {/* 18. Trang Chơi Online P2P Bạn Bè Native Mobile */}
      {isOnlineRoomOpen && (
        <MobileOnlineRoomView
          isOpen={isOnlineRoomOpen}
          onClose={() => closeModal('ONLINE_ROOM')}
        />
      )}

      {/* 19. Trang Thông Báo Bàn Chơi Giải Tán (Native Mobile) */}
      <MobileOnlineDisbandView
        isOpen={disbandNotice !== null}
        onClose={clearDisbandNotice}
      />
    </>
  );
};
