import { create } from 'zustand';

export type ModalType = 
  | 'SETTINGS'
  | 'CUSTOM_GAME'
  | 'XRAY'
  | 'VICTORY'
  | 'QUEST'
  | 'WHEEL'
  | 'BANK'
  | 'SHOP'
  | 'CAMPAIGN'
  | 'UNDERGROUND';

interface ModalState {
  isSettingsOpen: boolean;
  isCustomGameModalOpen: boolean;
  isXRayOpen: boolean;
  isVictoryOpen: boolean;
  isQuestModalOpen: boolean;
  isLuckyWheelOpen: boolean;
  isBankLoanModalOpen: boolean;
  isShopModalOpen: boolean;
  isCampaignModalOpen: boolean;
  isUndergroundModalOpen: boolean;

  // Actions
  openModal: (type: ModalType) => void;
  closeModal: (type: ModalType) => void;
  closeAllModals: () => void;
  
  // Specific helper toggles
  setIsSettingsOpen: (open: boolean) => void;
  setIsCustomGameModalOpen: (open: boolean) => void;
  setIsXRayOpen: (open: boolean) => void;
  setIsVictoryOpen: (open: boolean) => void;
  setIsQuestModalOpen: (open: boolean) => void;
  setIsLuckyWheelOpen: (open: boolean) => void;
  setIsBankLoanModalOpen: (open: boolean) => void;
  setIsShopModalOpen: (open: boolean) => void;
  setIsCampaignModalOpen: (open: boolean) => void;
  setIsUndergroundModalOpen: (open: boolean) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isSettingsOpen: false,
  isCustomGameModalOpen: false,
  isXRayOpen: false,
  isVictoryOpen: false,
  isQuestModalOpen: false,
  isLuckyWheelOpen: false,
  isBankLoanModalOpen: false,
  isShopModalOpen: false,
  isCampaignModalOpen: false,
  isUndergroundModalOpen: false,

  openModal: (type: ModalType) => {
    switch (type) {
      case 'SETTINGS': set({ isSettingsOpen: true }); break;
      case 'CUSTOM_GAME': set({ isCustomGameModalOpen: true }); break;
      case 'XRAY': set({ isXRayOpen: true }); break;
      case 'VICTORY': set({ isVictoryOpen: true }); break;
      case 'QUEST': set({ isQuestModalOpen: true }); break;
      case 'WHEEL': set({ isLuckyWheelOpen: true }); break;
      case 'BANK': set({ isBankLoanModalOpen: true }); break;
      case 'SHOP': set({ isShopModalOpen: true }); break;
      case 'CAMPAIGN': set({ isCampaignModalOpen: true }); break;
      case 'UNDERGROUND': set({ isUndergroundModalOpen: true }); break;
    }
  },

  closeModal: (type: ModalType) => {
    switch (type) {
      case 'SETTINGS': set({ isSettingsOpen: false }); break;
      case 'CUSTOM_GAME': set({ isCustomGameModalOpen: false }); break;
      case 'XRAY': set({ isXRayOpen: false }); break;
      case 'VICTORY': set({ isVictoryOpen: false }); break;
      case 'QUEST': set({ isQuestModalOpen: false }); break;
      case 'WHEEL': set({ isLuckyWheelOpen: false }); break;
      case 'BANK': set({ isBankLoanModalOpen: false }); break;
      case 'SHOP': set({ isShopModalOpen: false }); break;
      case 'CAMPAIGN': set({ isCampaignModalOpen: false }); break;
      case 'UNDERGROUND': set({ isUndergroundModalOpen: false }); break;
    }
  },

  closeAllModals: () => set({
    isSettingsOpen: false,
    isCustomGameModalOpen: false,
    isXRayOpen: false,
    isVictoryOpen: false,
    isQuestModalOpen: false,
    isLuckyWheelOpen: false,
    isBankLoanModalOpen: false,
    isShopModalOpen: false,
    isCampaignModalOpen: false,
    isUndergroundModalOpen: false
  }),

  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setIsCustomGameModalOpen: (open) => set({ isCustomGameModalOpen: open }),
  setIsXRayOpen: (open) => set({ isXRayOpen: open }),
  setIsVictoryOpen: (open) => set({ isVictoryOpen: open }),
  setIsQuestModalOpen: (open) => set({ isQuestModalOpen: open }),
  setIsLuckyWheelOpen: (open) => set({ isLuckyWheelOpen: open }),
  setIsBankLoanModalOpen: (open) => set({ isBankLoanModalOpen: open }),
  setIsShopModalOpen: (open) => set({ isShopModalOpen: open }),
  setIsCampaignModalOpen: (open) => set({ isCampaignModalOpen: open }),
  setIsUndergroundModalOpen: (open) => set({ isUndergroundModalOpen: open })
}));
