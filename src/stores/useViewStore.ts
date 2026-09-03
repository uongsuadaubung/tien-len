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

  // Actions
  setScreen: (screen: ScreenType) => void;
  openModal: (modal: ModalType | ActiveModalDescriptor) => void;
  closeModal: (type?: ModalType) => void;
  closeAllModals: () => void;
  setForfeitData: (data?: ForfeitData) => void;
  setF5PenaltyData: (data?: F5PenaltyData) => void;
  setSyncConflictData: (data?: SyncConflictData | null) => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  currentScreen: 'LOBBY',
  activeModal: null,
  forfeitData: undefined,
  f5PenaltyData: undefined,
  syncConflictData: null,

  setScreen: (screen: ScreenType) => {
    set({ currentScreen: screen });
  },

  openModal: (modal) => {
    if (!modal) {
      set({ activeModal: null });
      return;
    }

    if (typeof modal === 'string') {
      switch (modal) {
        case 'SETTINGS': set({ activeModal: { type: 'SETTINGS' } }); break;
        case 'CUSTOM_GAME': set({ activeModal: { type: 'CUSTOM_GAME' } }); break;
        case 'QUICK_SETUP': set({ activeModal: { type: 'QUICK_SETUP' } }); break;
        case 'MATCHMAKING': set({ activeModal: { type: 'MATCHMAKING' } }); break;
        case 'XRAY': set({ activeModal: { type: 'XRAY' } }); break;
        case 'VICTORY': set({ activeModal: { type: 'VICTORY' } }); break;
        case 'QUEST': set({ activeModal: { type: 'QUEST' } }); break;
        case 'WHEEL': set({ activeModal: { type: 'WHEEL' } }); break;
        case 'BANK': set({ activeModal: { type: 'BANK' } }); break;
        case 'CAMPAIGN': set({ activeModal: { type: 'CAMPAIGN' } }); break;
        case 'CONFIRM_FORFEIT': set({ activeModal: { type: 'CONFIRM_FORFEIT', data: get().forfeitData } }); break;
        case 'F5_PENALTY_NOTICE': set({ activeModal: { type: 'F5_PENALTY_NOTICE', data: get().f5PenaltyData } }); break;
        case 'NAME_SETUP': set({ activeModal: { type: 'NAME_SETUP' } }); break;
        case 'RULES': set({ activeModal: { type: 'RULES' } }); break;
        case 'ECOSYSTEM': set({ activeModal: { type: 'ECOSYSTEM' } }); break;
        case 'BOT_PROFILE': set({ activeModal: { type: 'BOT_PROFILE' } }); break;
        case 'SYNC_CONFLICT': set({ activeModal: { type: 'SYNC_CONFLICT', data: get().syncConflictData ?? undefined } }); break;
        case 'ONLINE_ROOM': set({ activeModal: { type: 'ONLINE_ROOM' } }); break;
      }
    } else {
      set({ activeModal: modal });
      if (modal.type === 'CONFIRM_FORFEIT' && modal.data) {
        set({ forfeitData: modal.data });
      } else if (modal.type === 'F5_PENALTY_NOTICE' && modal.data) {
        set({ f5PenaltyData: modal.data });
      } else if (modal.type === 'SYNC_CONFLICT' && modal.data) {
        set({ syncConflictData: modal.data });
      }
    }
  },

  closeModal: (type?: ModalType) => {
    const current = get().activeModal;
    if (!type || (current && current.type === type)) {
      set({ activeModal: null });
    }
  },

  closeAllModals: () => {
    set({ activeModal: null });
  },

  setForfeitData: (data) => set({ forfeitData: data }),
  setF5PenaltyData: (data) => set({ f5PenaltyData: data }),
  setSyncConflictData: (data) => set({ syncConflictData: data })
}));
