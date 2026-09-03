import { create } from 'zustand';
import type { TienLenSaveData } from '../engine/sync/types';
import type { BotConfig } from '../ai/types';

export type ScreenType = 'LOBBY' | 'GAME_TABLE';

export type ModalType =
  | 'SETTINGS'
  | 'CUSTOM_GAME'
  | 'QUICK_SETUP'
  | 'MATCHMAKING'
  | 'XRAY'
  | 'VICTORY'
  | 'QUEST'
  | 'WHEEL'
  | 'BANK'
  | 'CAMPAIGN'
  | 'CONFIRM_FORFEIT'
  | 'F5_PENALTY_NOTICE'
  | 'NAME_SETUP'
  | 'RULES'
  | 'ECOSYSTEM'
  | 'BOT_PROFILE'
  | 'SYNC_CONFLICT'
  | 'ONLINE_ROOM';

export interface ForfeitData {
  depositAmount: number;
  eloPenalty: number;
  isRanked: boolean;
}

export interface F5PenaltyData {
  depositLost: number;
  eloLost: number;
  isRanked: boolean;
}

export interface SyncConflictData {
  localData: TienLenSaveData;
  cloudData: TienLenSaveData;
}

export type ActiveModalDescriptor =
  | { type: 'SETTINGS' }
  | { type: 'CUSTOM_GAME' }
  | { type: 'QUICK_SETUP' }
  | { type: 'MATCHMAKING' }
  | { type: 'XRAY' }
  | { type: 'VICTORY' }
  | { type: 'QUEST' }
  | { type: 'WHEEL' }
  | { type: 'BANK' }
  | { type: 'CAMPAIGN' }
  | { type: 'CONFIRM_FORFEIT'; data?: ForfeitData }
  | { type: 'F5_PENALTY_NOTICE'; data?: F5PenaltyData }
  | { type: 'NAME_SETUP' }
  | { type: 'RULES' }
  | { type: 'ECOSYSTEM' }
  | { type: 'BOT_PROFILE'; bot?: BotConfig }
  | { type: 'SYNC_CONFLICT'; data?: SyncConflictData }
  | { type: 'ONLINE_ROOM' }
  | null;

export interface ViewState {
  currentScreen: ScreenType;
  activeModal: ActiveModalDescriptor;
  forfeitData?: ForfeitData;
  f5PenaltyData?: F5PenaltyData;
  syncConflictData?: SyncConflictData | null;

  // Single Source of Truth for Modal Flags
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

  // Actions
  setScreen: (screen: ScreenType) => void;
  openModal: (modal: ModalType | ActiveModalDescriptor) => void;
  closeModal: (type?: ModalType) => void;
  closeAllModals: () => void;
  setForfeitData: (data?: ForfeitData) => void;
  setF5PenaltyData: (data?: F5PenaltyData) => void;
  setSyncConflictData: (data?: SyncConflictData | null) => void;

  // Direct boolean toggles for backward compatibility
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
}

export type ModalState = ViewState;

function deriveModalFlags(type?: string | null) {
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

export const useViewStore = create<ViewState>((set, get) => ({
  currentScreen: 'LOBBY',
  activeModal: null,
  forfeitData: undefined,
  f5PenaltyData: undefined,
  syncConflictData: null,
  ...deriveModalFlags(null),

  setScreen: (screen: ScreenType) => {
    set({ currentScreen: screen });
  },

  openModal: (modal) => {
    if (!modal) {
      set({ activeModal: null, ...deriveModalFlags(null) });
      return;
    }

    let descriptor: ActiveModalDescriptor = null;
    if (typeof modal === 'string') {
      switch (modal) {
        case 'SETTINGS': descriptor = { type: 'SETTINGS' }; break;
        case 'CUSTOM_GAME': descriptor = { type: 'CUSTOM_GAME' }; break;
        case 'QUICK_SETUP': descriptor = { type: 'QUICK_SETUP' }; break;
        case 'MATCHMAKING': descriptor = { type: 'MATCHMAKING' }; break;
        case 'XRAY': descriptor = { type: 'XRAY' }; break;
        case 'VICTORY': descriptor = { type: 'VICTORY' }; break;
        case 'QUEST': descriptor = { type: 'QUEST' }; break;
        case 'WHEEL': descriptor = { type: 'WHEEL' }; break;
        case 'BANK': descriptor = { type: 'BANK' }; break;
        case 'CAMPAIGN': descriptor = { type: 'CAMPAIGN' }; break;
        case 'CONFIRM_FORFEIT': descriptor = { type: 'CONFIRM_FORFEIT', data: get().forfeitData }; break;
        case 'F5_PENALTY_NOTICE': descriptor = { type: 'F5_PENALTY_NOTICE', data: get().f5PenaltyData }; break;
        case 'NAME_SETUP': descriptor = { type: 'NAME_SETUP' }; break;
        case 'RULES': descriptor = { type: 'RULES' }; break;
        case 'ECOSYSTEM': descriptor = { type: 'ECOSYSTEM' }; break;
        case 'BOT_PROFILE': descriptor = { type: 'BOT_PROFILE' }; break;
        case 'SYNC_CONFLICT': descriptor = { type: 'SYNC_CONFLICT', data: get().syncConflictData ?? undefined }; break;
        case 'ONLINE_ROOM': descriptor = { type: 'ONLINE_ROOM' }; break;
      }
    } else {
      descriptor = modal;
    }

    const stateUpdate: Partial<ViewState> = {
      activeModal: descriptor,
      ...deriveModalFlags(descriptor?.type)
    };

    if (descriptor && descriptor.type === 'CONFIRM_FORFEIT' && descriptor.data) {
      stateUpdate.forfeitData = descriptor.data;
    } else if (descriptor && descriptor.type === 'F5_PENALTY_NOTICE' && descriptor.data) {
      stateUpdate.f5PenaltyData = descriptor.data;
    } else if (descriptor && descriptor.type === 'SYNC_CONFLICT' && descriptor.data) {
      stateUpdate.syncConflictData = descriptor.data;
    }

    set(stateUpdate);
  },

  closeModal: (type?: ModalType) => {
    const current = get().activeModal;
    if (!type || (current && current.type === type)) {
      set({
        activeModal: null,
        ...deriveModalFlags(null)
      });
    }
  },

  closeAllModals: () => {
    set({
      activeModal: null,
      ...deriveModalFlags(null)
    });
  },

  setForfeitData: (data) => set({ forfeitData: data }),
  setF5PenaltyData: (data) => set({ f5PenaltyData: data }),
  setSyncConflictData: (data) => set({ syncConflictData: data }),

  setIsSettingsOpen: (open) => open ? get().openModal('SETTINGS') : get().closeModal('SETTINGS'),
  setIsCustomGameModalOpen: (open) => open ? get().openModal('CUSTOM_GAME') : get().closeModal('CUSTOM_GAME'),
  setIsQuickSetupOpen: (open) => open ? get().openModal('QUICK_SETUP') : get().closeModal('QUICK_SETUP'),
  setIsMatchmakingOpen: (open) => open ? get().openModal('MATCHMAKING') : get().closeModal('MATCHMAKING'),
  setIsXRayOpen: (open) => open ? get().openModal('XRAY') : get().closeModal('XRAY'),
  setIsVictoryOpen: (open) => open ? get().openModal('VICTORY') : get().closeModal('VICTORY'),
  setIsQuestModalOpen: (open) => open ? get().openModal('QUEST') : get().closeModal('QUEST'),
  setIsLuckyWheelOpen: (open) => open ? get().openModal('WHEEL') : get().closeModal('WHEEL'),
  setIsBankLoanModalOpen: (open) => open ? get().openModal('BANK') : get().closeModal('BANK'),
  setIsCampaignModalOpen: (open) => open ? get().openModal('CAMPAIGN') : get().closeModal('CAMPAIGN'),
  setIsConfirmForfeitOpen: (open) => open ? get().openModal('CONFIRM_FORFEIT') : get().closeModal('CONFIRM_FORFEIT'),
  setIsF5PenaltyNoticeOpen: (open) => open ? get().openModal('F5_PENALTY_NOTICE') : get().closeModal('F5_PENALTY_NOTICE'),
  setIsNameSetupOpen: (open) => open ? get().openModal('NAME_SETUP') : get().closeModal('NAME_SETUP'),
  setIsRulesOpen: (open) => open ? get().openModal('RULES') : get().closeModal('RULES'),
  setIsEcosystemOpen: (open) => open ? get().openModal('ECOSYSTEM') : get().closeModal('ECOSYSTEM'),
  setIsBotProfileOpen: (open) => open ? get().openModal('BOT_PROFILE') : get().closeModal('BOT_PROFILE'),
  setIsSyncConflictOpen: (open) => open ? get().openModal('SYNC_CONFLICT') : get().closeModal('SYNC_CONFLICT')
}));
