import { create } from 'zustand';
import { useViewStore, type MatchmakingData } from './useViewStore';

export type { MatchmakingData };

/**
 * Các trạng thái phiên ghép trận theo Type State Pattern (Discriminated Unions)
 */
export interface IdleMatchmakingSession {
  readonly status: 'IDLE';
  readonly isSearching: false;
  readonly pendingMatch: null;
}

export interface SearchingMatchmakingSession {
  readonly status: 'SEARCHING';
  readonly isSearching: true;
  readonly pendingMatch: MatchmakingData; // ✅ Non-nullable 100% khi đang ghép trận
}

export type MatchmakingSession = IdleMatchmakingSession | SearchingMatchmakingSession;

export interface MatchmakingState {
  readonly session: MatchmakingSession;
  readonly isSearching: boolean;
  readonly pendingMatch: MatchmakingData | null;
  
  // Actions
  setPendingMatch: (match: MatchmakingData | null) => void;
  startMatchmaking: (match: MatchmakingData) => void;
  cancelMatchmaking: () => void;
  executeMatch: () => void;
  resetMatchmaking: () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set, get) => ({
  session: {
    status: 'IDLE',
    isSearching: false,
    pendingMatch: null
  },
  isSearching: false,
  pendingMatch: null,

  setPendingMatch: (match) => {
    if (match !== null) {
      set({
        session: { status: 'SEARCHING', isSearching: true, pendingMatch: match },
        isSearching: true,
        pendingMatch: match
      });
    } else {
      set({
        session: { status: 'IDLE', isSearching: false, pendingMatch: null },
        isSearching: false,
        pendingMatch: null
      });
    }
  },

  startMatchmaking: (match) => {
    set({
      session: { status: 'SEARCHING', isSearching: true, pendingMatch: match },
      isSearching: true,
      pendingMatch: match
    });
    useViewStore.getState().openModal({
      type: 'MATCHMAKING',
      match
    });
  },

  cancelMatchmaking: () => {
    useViewStore.getState().closeModal('MATCHMAKING');
    set({
      session: { status: 'IDLE', isSearching: false, pendingMatch: null },
      isSearching: false,
      pendingMatch: null
    });
  },

  executeMatch: () => {
    const { session } = get();
    if (session.status === 'SEARCHING') {
      useViewStore.getState().closeModal('MATCHMAKING');
      set({
        session: { status: 'IDLE', isSearching: false, pendingMatch: null },
        isSearching: false,
        pendingMatch: null
      });
      // ✅ Dữ liệu onStart bảo đảm tồn tại non-nullable
      session.pendingMatch.onStart();
    }
  },

  resetMatchmaking: () => {
    set({
      session: { status: 'IDLE', isSearching: false, pendingMatch: null },
      isSearching: false,
      pendingMatch: null
    });
  }
}));
