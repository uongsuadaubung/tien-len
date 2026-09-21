import { create } from 'zustand';
import type { MatchPlayer, PlayedMove } from '../engine/types';
import type { MatchState } from '../engine/state-machine/types';
import type { GameStoreState } from './game/types';
import { createTableConfigSlice } from './game/tableConfigSlice';
import { createPlayerHandSlice } from './game/playerHandSlice';
import { createMatchStateSlice } from './game/matchStateSlice';

// Re-export all domain types for 100% backward compatibility
export * from './game/types';
export { DEFAULT_QUICK_TABLE_CONFIG } from './game/tableConfigSlice';
export { DEFAULT_PLAYERS, DEFAULT_MATCH_STATE } from './game/matchStateSlice';

export type GameState = GameStoreState;

/**
 * useGameStore (Composed Store Facade)
 * Kết hợp 3 slice độc lập: TableConfigSlice, PlayerHandSlice, MatchStateSlice
 * theo chuẩn Domain Slice Pattern của Zustand.
 */
export const useGameStore = create<GameStoreState>()((...a) => ({
  ...createTableConfigSlice(...a),
  ...createPlayerHandSlice(...a),
  ...createMatchStateSlice(...a)
}));

// ============================================================================
// DERIVED SELECTORS (Trích xuất dữ liệu trực tiếp từ MatchState Single Source of Truth)
// ============================================================================
export const selectMatchState = (state: GameStoreState): MatchState => state.matchState;
export const selectCurrentTurnPlayerId = (state: GameStoreState): string | null =>
  state.matchState.status === 'PLAYING' ? state.matchState.currentTurnPlayerId : null;
export const selectLeadPlayerId = (state: GameStoreState): string | null =>
  state.matchState.status === 'PLAYING' ? state.matchState.leadPlayerId : null;
export const selectCurrentMove = (state: GameStoreState): PlayedMove | null =>
  state.matchState.status === 'PLAYING'
    ? state.matchState.leadingMove
    : (state.matchState.status === 'GAME_OVER'
        ? state.matchState.winningMove
        : (state.matchState.status === 'ROUND_ENDED' && state.matchState.lastRoundMoves.length > 0
            ? state.matchState.lastRoundMoves[state.matchState.lastRoundMoves.length - 1]
            : null));
export const selectWinners = (state: GameStoreState): readonly MatchPlayer[] =>
  state.matchState.status === 'GAME_OVER'
    ? state.matchState.winners
    : (state.matchState.status === 'INSTANT_WIN' ? [state.matchState.instantWinner] : []);
export const selectIsGameOver = (state: GameStoreState): boolean =>
  state.matchState.status === 'GAME_OVER' || state.matchState.status === 'INSTANT_WIN';
export const selectIsDealing = (state: GameStoreState): boolean =>
  state.matchState.status === 'DEALING';
export const selectDealBanner = (state: GameStoreState): string | null =>
  state.matchState.status === 'DEALING' ? state.matchState.dealBanner : null;
