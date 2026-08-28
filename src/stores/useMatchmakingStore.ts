import { create } from 'zustand';
import type { BotConfig } from '../ai/types';
import { useModalStore } from './useModalStore';

export interface MatchmakingData {
  betAmount: number;
  modeName: string;
  botConfigs: Partial<BotConfig>[];
  playerCount: number;
  onStart: () => void;
}

export interface MatchmakingState {
  isSearching: boolean;
  pendingMatch: MatchmakingData | null;
  
  // Actions
  setPendingMatch: (match: MatchmakingData | null) => void;
  startMatchmaking: (match: MatchmakingData) => void;
  cancelMatchmaking: () => void;
  executeMatch: () => void;
  resetMatchmaking: () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set, get) => ({
  isSearching: false,
  pendingMatch: null,

  setPendingMatch: (match) => {
    set({ pendingMatch: match, isSearching: match !== null });
  },

  startMatchmaking: (match) => {
    set({ pendingMatch: match, isSearching: true });
    useModalStore.getState().openModal('MATCHMAKING');
  },

  cancelMatchmaking: () => {
    useModalStore.getState().closeModal('MATCHMAKING');
    set({ pendingMatch: null, isSearching: false });
  },

  executeMatch: () => {
    const { pendingMatch } = get();
    if (!pendingMatch) return;
    
    useModalStore.getState().closeModal('MATCHMAKING');
    set({ isSearching: false });
    
    const onStart = pendingMatch.onStart;
    set({ pendingMatch: null });
    onStart();
  },

  resetMatchmaking: () => {
    set({ pendingMatch: null, isSearching: false });
  }
}));
