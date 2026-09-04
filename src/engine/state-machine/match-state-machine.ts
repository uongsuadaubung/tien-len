import type { Player } from '../types';
import {
  type MatchState,
  assertNever
} from './types';
import type { MatchSnapshot } from '../offline-match-driver';

/**
 * Hàm mapper thuần khiết chuyển từ Type-Safe MatchState sang MatchSnapshot
 */
export function mapMatchStateToSnapshot(state: MatchState): MatchSnapshot {
  switch (state.status) {
    case 'WAITING':
      return {
        gameNumber: state.gameNumber,
        players: [...state.players],
        currentTurnPlayerId: null,
        leadPlayerId: null,
        currentMove: null,
        winners: [],
        isGameOver: false,
        instantWinType: null,
        isDealing: false,
        dealtCounts: {},
        dealBanner: null,
        chopNotification: null,
        botThinkingThought: null,
        isFirstMoveOfGame: false,
        isLeadMove: true
      };

    case 'DEALING':
      return {
        gameNumber: state.gameNumber,
        players: [...state.players],
        currentTurnPlayerId: null,
        leadPlayerId: null,
        currentMove: null,
        winners: [],
        isGameOver: false,
        instantWinType: null,
        isDealing: true,
        dealtCounts: { ...state.dealtCounts },
        dealBanner: state.dealBanner,
        chopNotification: null,
        botThinkingThought: null,
        isFirstMoveOfGame: false,
        isLeadMove: true
      };

    case 'PLAYING':
      return {
        gameNumber: state.gameNumber,
        players: [...state.players],
        currentTurnPlayerId: state.currentTurnPlayerId,
        leadPlayerId: state.leadPlayerId,
        currentMove: state.leadingMove ? { ...state.leadingMove } : null,
        winners: [],
        isGameOver: false,
        instantWinType: null,
        isDealing: false,
        dealtCounts: mapPlayersToDealtCounts(state.players),
        dealBanner: null,
        chopNotification: state.chopNotification ? { ...state.chopNotification } : null,
        botThinkingThought: state.botThinkingThought ? { ...state.botThinkingThought } : null,
        isFirstMoveOfGame: state.isFirstMoveOfGame,
        isLeadMove: state.isLeadMove
      };

    case 'INSTANT_WIN':
      return {
        gameNumber: state.gameNumber,
        players: [...state.players],
        currentTurnPlayerId: null,
        leadPlayerId: null,
        currentMove: null,
        winners: [state.instantWinner],
        isGameOver: true,
        instantWinType: state.instantWinType,
        isDealing: false,
        dealtCounts: mapPlayersToDealtCounts(state.players),
        dealBanner: null,
        chopNotification: null,
        botThinkingThought: null,
        isFirstMoveOfGame: false,
        isLeadMove: true
      };

    case 'ROUND_ENDED':
      return {
        gameNumber: state.gameNumber,
        players: [...state.players],
        currentTurnPlayerId: state.nextLeadPlayerId,
        leadPlayerId: state.nextLeadPlayerId,
        currentMove: null,
        winners: [],
        isGameOver: false,
        instantWinType: null,
        isDealing: false,
        dealtCounts: mapPlayersToDealtCounts(state.players),
        dealBanner: null,
        chopNotification: state.chopNotification ? { ...state.chopNotification } : null,
        botThinkingThought: null,
        isFirstMoveOfGame: false,
        isLeadMove: true
      };

    case 'GAME_OVER':
      return {
        gameNumber: state.gameNumber,
        players: [...state.players],
        currentTurnPlayerId: null,
        leadPlayerId: null,
        currentMove: null,
        winners: [...state.winners],
        isGameOver: true,
        instantWinType: null,
        isDealing: false,
        dealtCounts: mapPlayersToDealtCounts(state.players),
        dealBanner: null,
        chopNotification: null,
        botThinkingThought: null,
        isFirstMoveOfGame: false,
        isLeadMove: false
      };

    default:
      return assertNever(state);
  }
}

function mapPlayersToDealtCounts(players: readonly Player[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of players) {
    counts[p.id] = p.hand.length;
  }
  return counts;
}
