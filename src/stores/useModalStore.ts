import { create } from 'zustand';
import { 
  useViewStore, 
  type ModalType, 
  type ForfeitData, 
  type F5PenaltyData, 
  type SyncConflictData, 
  type ActiveModalDescriptor 
} from './useViewStore';

export type { ModalType };

export interface ModalState {
  isSettingsOpen: boolean;
  isCustomGameModalOpen: boolean;
  isQuickSetupOpen: boolean;
  isMatchmakingOpen: boolean;
  isXRayOpen: boolean;
  isVictoryOpen: boolean;
  isQuestModalOpen: boolean;
  isLuckyWheelOpen: boolean;
  isBankLoanModalOpen: boolean;
  isCampaignModalOpen: boolean;
  isConfirmForfeitOpen: boolean;
  isF5PenaltyNoticeOpen: boolean;
  isNameSetupOpen: boolean;
  isRulesOpen: boolean;
  isEcosystemOpen: boolean;
  isBotProfileOpen: boolean;
  isSyncConflictOpen: boolean;
  isOnlineRoomOpen: boolean;

  forfeitData?: ForfeitData;
  f5PenaltyData?: F5PenaltyData;
  syncConflictData?: SyncConflictData | null;

  // Actions (ủy quyền 100% về useViewStore)
  openModal: (type: ModalType) => void;
  closeModal: (type?: ModalType) => void;
  closeAllModals: () => void;

  // Specific helper toggles
  setIsSettingsOpen: (open: boolean) => void;
  setIsCustomGameModalOpen: (open: boolean) => void;
  setIsQuickSetupOpen: (open: boolean) => void;
  setIsMatchmakingOpen: (open: boolean) => void;
  setIsXRayOpen: (open: boolean) => void;
  setIsVictoryOpen: (open: boolean) => void;
  setIsQuestModalOpen: (open: boolean) => void;
  setIsLuckyWheelOpen: (open: boolean) => void;
  setIsBankLoanModalOpen: (open: boolean) => void;
  setIsCampaignModalOpen: (open: boolean) => void;
  setIsConfirmForfeitOpen: (open: boolean) => void;
  setIsF5PenaltyNoticeOpen: (open: boolean) => void;
  setIsNameSetupOpen: (open: boolean) => void;
  setIsRulesOpen: (open: boolean) => void;
  setIsEcosystemOpen: (open: boolean) => void;
  setIsBotProfileOpen: (open: boolean) => void;
  setIsSyncConflictOpen: (open: boolean) => void;
  setForfeitData: (data?: ForfeitData) => void;
  setF5PenaltyData: (data?: F5PenaltyData) => void;
  setSyncConflictData: (data?: SyncConflictData | null) => void;
}

function deriveModalFlags(activeModal: ActiveModalDescriptor) {
  const type = activeModal?.type;
  return {
    isSettingsOpen: type === 'SETTINGS',
    isCustomGameModalOpen: type === 'CUSTOM_GAME',
    isQuickSetupOpen: type === 'QUICK_SETUP',
    isMatchmakingOpen: type === 'MATCHMAKING',
    isXRayOpen: type === 'XRAY',
    isVictoryOpen: type === 'VICTORY',
    isQuestModalOpen: type === 'QUEST',
    isLuckyWheelOpen: type === 'WHEEL',
    isBankLoanModalOpen: type === 'BANK',
    isCampaignModalOpen: type === 'CAMPAIGN',
    isConfirmForfeitOpen: type === 'CONFIRM_FORFEIT',
    isF5PenaltyNoticeOpen: type === 'F5_PENALTY_NOTICE',
    isNameSetupOpen: type === 'NAME_SETUP',
    isRulesOpen: type === 'RULES',
    isEcosystemOpen: type === 'ECOSYSTEM',
    isBotProfileOpen: type === 'BOT_PROFILE',
    isSyncConflictOpen: type === 'SYNC_CONFLICT',
    isOnlineRoomOpen: type === 'ONLINE_ROOM'
  };
}

export const useModalStore = create<ModalState>((set) => {
  // Tự động đồng bộ cờ boolean từ useViewStore (Single Source of Truth)
  useViewStore.subscribe((viewState) => {
    const flags = deriveModalFlags(viewState.activeModal);
    set({
      ...flags,
      forfeitData: viewState.forfeitData,
      f5PenaltyData: viewState.f5PenaltyData,
      syncConflictData: viewState.syncConflictData
    });
  });

  return {
    ...deriveModalFlags(useViewStore.getState().activeModal),
    forfeitData: useViewStore.getState().forfeitData,
    f5PenaltyData: useViewStore.getState().f5PenaltyData,
    syncConflictData: useViewStore.getState().syncConflictData,

    openModal: (type: ModalType) => {
      useViewStore.getState().openModal(type);
    },

    closeModal: (type?: ModalType) => {
      useViewStore.getState().closeModal(type);
    },

    closeAllModals: () => {
      useViewStore.getState().closeAllModals();
    },

    setIsSettingsOpen: (open) => open ? useViewStore.getState().openModal('SETTINGS') : useViewStore.getState().closeModal('SETTINGS'),
    setIsCustomGameModalOpen: (open) => open ? useViewStore.getState().openModal('CUSTOM_GAME') : useViewStore.getState().closeModal('CUSTOM_GAME'),
    setIsQuickSetupOpen: (open) => open ? useViewStore.getState().openModal('QUICK_SETUP') : useViewStore.getState().closeModal('QUICK_SETUP'),
    setIsMatchmakingOpen: (open) => open ? useViewStore.getState().openModal('MATCHMAKING') : useViewStore.getState().closeModal('MATCHMAKING'),
    setIsXRayOpen: (open) => open ? useViewStore.getState().openModal('XRAY') : useViewStore.getState().closeModal('XRAY'),
    setIsVictoryOpen: (open) => open ? useViewStore.getState().openModal('VICTORY') : useViewStore.getState().closeModal('VICTORY'),
    setIsQuestModalOpen: (open) => open ? useViewStore.getState().openModal('QUEST') : useViewStore.getState().closeModal('QUEST'),
    setIsLuckyWheelOpen: (open) => open ? useViewStore.getState().openModal('WHEEL') : useViewStore.getState().closeModal('WHEEL'),
    setIsBankLoanModalOpen: (open) => open ? useViewStore.getState().openModal('BANK') : useViewStore.getState().closeModal('BANK'),
    setIsCampaignModalOpen: (open) => open ? useViewStore.getState().openModal('CAMPAIGN') : useViewStore.getState().closeModal('CAMPAIGN'),
    setIsConfirmForfeitOpen: (open) => open ? useViewStore.getState().openModal('CONFIRM_FORFEIT') : useViewStore.getState().closeModal('CONFIRM_FORFEIT'),
    setIsF5PenaltyNoticeOpen: (open) => open ? useViewStore.getState().openModal('F5_PENALTY_NOTICE') : useViewStore.getState().closeModal('F5_PENALTY_NOTICE'),
    setIsNameSetupOpen: (open) => open ? useViewStore.getState().openModal('NAME_SETUP') : useViewStore.getState().closeModal('NAME_SETUP'),
    setIsRulesOpen: (open) => open ? useViewStore.getState().openModal('RULES') : useViewStore.getState().closeModal('RULES'),
    setIsEcosystemOpen: (open) => open ? useViewStore.getState().openModal('ECOSYSTEM') : useViewStore.getState().closeModal('ECOSYSTEM'),
    setIsBotProfileOpen: (open) => open ? useViewStore.getState().openModal('BOT_PROFILE') : useViewStore.getState().closeModal('BOT_PROFILE'),
    setIsSyncConflictOpen: (open) => open ? useViewStore.getState().openModal('SYNC_CONFLICT') : useViewStore.getState().closeModal('SYNC_CONFLICT'),

    setForfeitData: (data) => {
      useViewStore.getState().setForfeitData(data);
    },
    setF5PenaltyData: (data) => {
      useViewStore.getState().setF5PenaltyData(data);
    },
    setSyncConflictData: (data) => {
      useViewStore.getState().setSyncConflictData(data);
    }
  };
});
