import { create } from 'zustand';

export type ModalType = 
  | 'SETTINGS'
  | 'CUSTOM_GAME'
  | 'QUICK_SETUP'
  | 'XRAY'
  | 'VICTORY'
  | 'QUEST'
  | 'WHEEL'
  | 'BANK'
  | 'CAMPAIGN'
  | 'CONFIRM_FORFEIT'
  | 'F5_PENALTY_NOTICE'
  | 'NAME_SETUP'
  | 'RULES';

interface ModalState {
  isSettingsOpen: boolean;
  isCustomGameModalOpen: boolean;
  isQuickSetupOpen: boolean;
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

  forfeitData?: { depositAmount: number; eloPenalty: number; isRanked: boolean; };
  f5PenaltyData?: { depositLost: number; eloLost: number; isRanked: boolean; };

  // Actions
  openModal: (type: ModalType) => void;
  closeModal: (type: ModalType) => void;
  closeAllModals: () => void;
  
  // Specific helper toggles
  setIsSettingsOpen: (open: boolean) => void;
  setIsCustomGameModalOpen: (open: boolean) => void;
  setIsQuickSetupOpen: (open: boolean) => void;
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
  setForfeitData: (data?: { depositAmount: number; eloPenalty: number; isRanked: boolean; }) => void;
  setF5PenaltyData: (data?: { depositLost: number; eloLost: number; isRanked: boolean; }) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isSettingsOpen: false,
  isCustomGameModalOpen: false,
  isQuickSetupOpen: false,
  isXRayOpen: false,
  isVictoryOpen: false,
  isQuestModalOpen: false,
  isLuckyWheelOpen: false,
  isBankLoanModalOpen: false,
  isCampaignModalOpen: false,
  isConfirmForfeitOpen: false,
  isF5PenaltyNoticeOpen: false,
  isNameSetupOpen: false,
  isRulesOpen: false,
  forfeitData: undefined,
  f5PenaltyData: undefined,

  openModal: (type: ModalType) => {
    switch (type) {
      case 'SETTINGS': set({ isSettingsOpen: true }); break;
      case 'CUSTOM_GAME': set({ isCustomGameModalOpen: true }); break;
      case 'QUICK_SETUP': set({ isQuickSetupOpen: true }); break;
      case 'XRAY': set({ isXRayOpen: true }); break;
      case 'VICTORY': set({ isVictoryOpen: true }); break;
      case 'QUEST': set({ isQuestModalOpen: true }); break;
      case 'WHEEL': set({ isLuckyWheelOpen: true }); break;
      case 'BANK': set({ isBankLoanModalOpen: true }); break;
      case 'CAMPAIGN': set({ isCampaignModalOpen: true }); break;
      case 'CONFIRM_FORFEIT': set({ isConfirmForfeitOpen: true }); break;
      case 'F5_PENALTY_NOTICE': set({ isF5PenaltyNoticeOpen: true }); break;
      case 'NAME_SETUP': set({ isNameSetupOpen: true }); break;
      case 'RULES': set({ isRulesOpen: true }); break;
    }
  },

  closeModal: (type: ModalType) => {
    switch (type) {
      case 'SETTINGS': set({ isSettingsOpen: false }); break;
      case 'CUSTOM_GAME': set({ isCustomGameModalOpen: false }); break;
      case 'QUICK_SETUP': set({ isQuickSetupOpen: false }); break;
      case 'XRAY': set({ isXRayOpen: false }); break;
      case 'VICTORY': set({ isVictoryOpen: false }); break;
      case 'QUEST': set({ isQuestModalOpen: false }); break;
      case 'WHEEL': set({ isLuckyWheelOpen: false }); break;
      case 'BANK': set({ isBankLoanModalOpen: false }); break;
      case 'CAMPAIGN': set({ isCampaignModalOpen: false }); break;
      case 'CONFIRM_FORFEIT': set({ isConfirmForfeitOpen: false }); break;
      case 'F5_PENALTY_NOTICE': set({ isF5PenaltyNoticeOpen: false }); break;
      case 'NAME_SETUP': set({ isNameSetupOpen: false }); break;
      case 'RULES': set({ isRulesOpen: false }); break;
    }
  },

  closeAllModals: () => set({
    isSettingsOpen: false,
    isCustomGameModalOpen: false,
    isQuickSetupOpen: false,
    isXRayOpen: false,
    isVictoryOpen: false,
    isQuestModalOpen: false,
    isLuckyWheelOpen: false,
    isBankLoanModalOpen: false,
    isCampaignModalOpen: false,
    isConfirmForfeitOpen: false,
    isF5PenaltyNoticeOpen: false,
    isNameSetupOpen: false,
    isRulesOpen: false
  }),

  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setIsCustomGameModalOpen: (open) => set({ isCustomGameModalOpen: open }),
  setIsQuickSetupOpen: (open) => set({ isQuickSetupOpen: open }),
  setIsXRayOpen: (open) => set({ isXRayOpen: open }),
  setIsVictoryOpen: (open) => set({ isVictoryOpen: open }),
  setIsQuestModalOpen: (open) => set({ isQuestModalOpen: open }),
  setIsLuckyWheelOpen: (open) => set({ isLuckyWheelOpen: open }),
  setIsBankLoanModalOpen: (open) => set({ isBankLoanModalOpen: open }),
  setIsCampaignModalOpen: (open) => set({ isCampaignModalOpen: open }),
  setIsConfirmForfeitOpen: (open) => set({ isConfirmForfeitOpen: open }),
  setIsF5PenaltyNoticeOpen: (open) => set({ isF5PenaltyNoticeOpen: open }),
  setIsNameSetupOpen: (open) => set({ isNameSetupOpen: open }),
  setIsRulesOpen: (open) => set({ isRulesOpen: open }),
  setForfeitData: (data) => set({ forfeitData: data }),
  setF5PenaltyData: (data) => set({ f5PenaltyData: data })
}));
