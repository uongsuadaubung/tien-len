import { create } from 'zustand';
import type { TienLenSaveData } from '../engine/sync/types';
import type { BotEntity } from '../engine/ecosystem/ecosystem-types';
import type { Card } from '../engine/types';
import type { CardTracker } from '../ai/card-tracker';
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

export interface MatchmakingData {
  betAmount: number;
  modeName: string;
  botConfigs: BotConfig[];
  playerCount: number;
  onStart: () => void;
}

export type ActiveModalDescriptor =
  | { readonly type: 'SETTINGS' }
  | { readonly type: 'CUSTOM_GAME' }
  | { readonly type: 'QUICK_SETUP' }
  | { readonly type: 'MATCHMAKING'; readonly match: MatchmakingData }
  | { readonly type: 'XRAY'; readonly tracker: CardTracker; readonly ownHand: readonly Card[] }
  | { readonly type: 'VICTORY' }
  | { readonly type: 'QUEST' }
  | { readonly type: 'WHEEL' }
  | { readonly type: 'BANK' }
  | { readonly type: 'CAMPAIGN' }
  | { readonly type: 'CONFIRM_FORFEIT'; readonly data: ForfeitData }
  | { readonly type: 'F5_PENALTY_NOTICE'; readonly data: F5PenaltyData }
  | { readonly type: 'NAME_SETUP' }
  | { readonly type: 'RULES' }
  | { readonly type: 'ECOSYSTEM' }
  | { readonly type: 'BOT_PROFILE'; readonly bot: BotEntity }
  | { readonly type: 'SYNC_CONFLICT'; readonly data: SyncConflictData }
  | { readonly type: 'ONLINE_ROOM' }
  | null;

export interface ViewState {
  currentScreen: ScreenType;
  activeModal: ActiveModalDescriptor;

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
  closeModal: (type: ModalType | null) => void;
  closeAllModals: () => void;
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
        case 'VICTORY': descriptor = { type: 'VICTORY' }; break;
        case 'QUEST': descriptor = { type: 'QUEST' }; break;
        case 'WHEEL': descriptor = { type: 'WHEEL' }; break;
        case 'BANK': descriptor = { type: 'BANK' }; break;
        case 'CAMPAIGN': descriptor = { type: 'CAMPAIGN' }; break;
        case 'NAME_SETUP': descriptor = { type: 'NAME_SETUP' }; break;
        case 'RULES': descriptor = { type: 'RULES' }; break;
        case 'ECOSYSTEM': descriptor = { type: 'ECOSYSTEM' }; break;
        case 'ONLINE_ROOM': descriptor = { type: 'ONLINE_ROOM' }; break;
        case 'MATCHMAKING':
          descriptor = {
            type: 'MATCHMAKING',
            match: {
              betAmount: 1000,
              modeName: 'Tiến Lên Miền Nam',
              botConfigs: [],
              playerCount: 4,
              onStart: () => {}
            }
          };
          break;
        case 'CONFIRM_FORFEIT':
          descriptor = {
            type: 'CONFIRM_FORFEIT',
            data: {
              depositAmount: 1000,
              eloPenalty: 30,
              isRanked: false
            }
          };
          break;
        case 'F5_PENALTY_NOTICE':
          descriptor = {
            type: 'F5_PENALTY_NOTICE',
            data: {
              depositLost: 0,
              eloLost: 30,
              isRanked: false
            }
          };
          break;
        case 'SYNC_CONFLICT':
        case 'BOT_PROFILE':
        case 'XRAY':
          // Các modal này yêu cầu đối tượng dữ liệu thực tế từ caller
          break;
      }
    } else {
      descriptor = modal;
    }

    if (descriptor) {
      set({
        activeModal: descriptor,
        ...deriveModalFlags(descriptor.type)
      });
    }
  },

  closeModal: (type: ModalType | null = null) => {
    const current = get().activeModal;
    if (type === null || current?.type === type) {
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
  }
}));
