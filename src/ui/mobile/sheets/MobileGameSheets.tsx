import React from 'react';
import { useViewStore } from '../../../stores/useViewStore';
import { useGameStore, type CampaignResultMeta } from '../../../stores/useGameStore';
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
import { useOnlineStore } from '../../../stores/useOnlineStore';
import { CampaignChapter } from '../../../engine/campaign';
import { normalizePlayerCount } from '../../../engine/types';
import { useMatchmakingStore } from '../../../stores/useMatchmakingStore';

export interface MobileGameSheetsProps {
  onStartQuickGame: (config: QuickSetupConfig) => void;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
  onSelectCampaignChapter: (chapter: CampaignChapter) => void;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onConfirmForfeit: () => void;
  campaignResultMeta?: CampaignResultMeta | null;
  onOpenCampaignMap: (() => void) | null;
}

export const MobileGameSheets: React.FC<MobileGameSheetsProps> = ({
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
    isEcosystemOpen,
    isOnlineRoomOpen,
    openModal,
    closeModal
  } = useViewStore();

  const { disbandNotice, clearDisbandNotice } = useOnlineStore();

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
            congMultiplier: quickTableConfig.congMultiplier,
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
      {activeModal?.type === 'MATCHMAKING' && (
        <MobileMatchmakingSheet
          match={activeModal.match}
          onCancel={cancelMatchmaking}
          onMatchReady={executeMatch}
        />
      )}

      {/* 5. Trang Soi Bài X-Ray (Full Screen Sheet) */}
      {activeModal?.type === 'XRAY' && (
        <XRayInspector
          isOpen={true}
          onClose={() => closeModal('XRAY')}
          tracker={activeModal.tracker}
          ownHand={activeModal.ownHand}
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
      {activeModal?.type === 'CONFIRM_FORFEIT' && (
        <ConfirmForfeitModal
          data={activeModal.data}
          onClose={() => closeModal('CONFIRM_FORFEIT')}
          onConfirmForfeit={onConfirmForfeit}
        />
      )}

      {/* 12. Ngăn Kéo Thông Báo Phạt F5 (Bottom Sheet) */}
      {activeModal?.type === 'F5_PENALTY_NOTICE' && (
        <F5PenaltyNoticeModal
          data={activeModal.data}
          onClose={() => closeModal('F5_PENALTY_NOTICE')}
        />
      )}

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
      {activeModal?.type === 'BOT_PROFILE' && (
        <BotProfileModal
          isOpen={true}
          bot={activeModal.bot}
          onClose={() => closeModal('BOT_PROFILE')}
        />
      )}

      {/* 17. Trang Xử Lý Xung Đột Dữ Liệu Đồng Bộ Đám Mây (Native Mobile - Bắt buộc chọn) */}
      {activeModal?.type === 'SYNC_CONFLICT' && (
        <MobileSyncConflictView
          conflictData={activeModal.data}
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
