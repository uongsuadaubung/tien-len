import type { MatchPlayer } from '../types';
import { cloneMatchPlayers } from '../player-factory';
import {
  type MatchState,
  assertNever
} from './types';
import type { MatchSnapshot } from '../session-types';

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
        currentMove: state.leadingMove,
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
        currentMove: state.winningMove ?? state.leadingMove ?? null,
        winners: [...state.winners],
        isGameOver: true,
        instantWinType: null,
        isDealing: false,
        dealtCounts: mapPlayersToDealtCounts(state.players),
        dealBanner: null,
        chopNotification: state.chopNotification ? { ...state.chopNotification } : null,
        botThinkingThought: null,
        isFirstMoveOfGame: false,
        isLeadMove: true
      };

    default:
      return assertNever(state);
  }
}

function mapPlayersToDealtCounts(players: readonly MatchPlayer[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of players) {
    counts[p.id] = p.cardCount;
  }
  return counts;
}

/* =================================================================================
 * CÁC HÀM CHUYỂN TRẠNG THÁI THUẦN TÚY (Pure State Transitions)
 * ================================================================================= */

import type { GameRules, Card, PlayedMove, InstantWinType } from '../types';
import type { MatchLogReport } from '../match-logger';
import type { PerspectiveMatchSettlement } from '../settlement/perspective-settlement';
import type {
  WaitingMatchState,
  DealingMatchState,
  PlayingTurnMatchState,
  RoundEndedMatchState,
  GameOverMatchState,
  InstantWinMatchState,
  ChopNotificationInfo,
  BotThinkingInfo
} from './types';
import { createPlayingTurnMatchState } from './types';

/**
 * 1. Chuyển sang trạng thái WAITING
 */
export function transitionToWaiting(params: {
  readonly gameNumber: number;
  readonly players: readonly MatchPlayer[];
  readonly rules: GameRules;
  readonly lastWinnerId?: string | null;
}): WaitingMatchState {
  return {
    status: 'WAITING',
    gameNumber: params.gameNumber,
    players: cloneMatchPlayers(params.players),
    rules: params.rules,
    lastWinnerId: params.lastWinnerId ?? null
  };
}

/**
 * 2. Chuyển sang trạng thái DEALING từ WAITING
 */
export function transitionToDealing(
  from: WaitingMatchState,
  params: {
    readonly dealtCounts: Readonly<Record<string, number>>;
    readonly dealBanner?: string | null;
  }
): DealingMatchState {
  const totalCardsDealt = Object.values(params.dealtCounts).reduce((sum, count) => sum + count, 0);
  return {
    status: 'DEALING',
    gameNumber: from.gameNumber,
    players: from.players,
    rules: from.rules,
    dealtCounts: params.dealtCounts,
    dealBanner: params.dealBanner ?? null,
    totalCardsDealt
  };
}

/**
 * 3. Cập nhật tiến trình DEALING
 */
export function updateDealingProgress(
  from: DealingMatchState,
  params: {
    readonly dealtCounts: Readonly<Record<string, number>>;
    readonly dealBanner?: string | null;
  }
): DealingMatchState {
  const totalCardsDealt = Object.values(params.dealtCounts).reduce((sum, count) => sum + count, 0);
  return {
    ...from,
    dealtCounts: params.dealtCounts,
    dealBanner: params.dealBanner !== undefined ? params.dealBanner : from.dealBanner,
    totalCardsDealt
  };
}

/**
 * 4. Chuyển sang trạng thái PLAYING (bắt đầu lượt đầu hoặc lượt bình thường)
 */
export function transitionToPlaying(
  from: DealingMatchState | WaitingMatchState | RoundEndedMatchState,
  params: {
    readonly gameNumber?: number;
    readonly roundNumber: number;
    readonly players: readonly MatchPlayer[];
    readonly currentTurnPlayerId: string;
    readonly leadPlayerId: string;
    readonly leadingMove: PlayedMove | null;
    readonly isLeadMove: boolean;
    readonly isFirstMoveOfGame: boolean;
    readonly firstMoveRequiredCard?: Card | null;
    readonly roundMoves?: readonly PlayedMove[];
    readonly passedPlayerIds?: readonly string[];
    readonly chopNotification?: ChopNotificationInfo | null;
    readonly botThinkingThought?: BotThinkingInfo | null;
  }
): PlayingTurnMatchState {
  return createPlayingTurnMatchState({
    status: 'PLAYING',
    gameNumber: params.gameNumber ?? from.gameNumber,
    roundNumber: params.roundNumber,
    players: cloneMatchPlayers(params.players),
    rules: from.rules,
    currentTurnPlayerId: params.currentTurnPlayerId,
    leadPlayerId: params.leadPlayerId,
    roundMoves: params.roundMoves ?? (params.leadingMove ? [params.leadingMove] : []),
    leadingMove: params.leadingMove,
    isLeadMove: params.isLeadMove,
    isFirstMoveOfGame: params.isFirstMoveOfGame,
    firstMoveRequiredCard: params.firstMoveRequiredCard,
    passedPlayerIds: params.passedPlayerIds ?? [],
    chopNotification: params.chopNotification ?? null,
    botThinkingThought: params.botThinkingThought ?? null
  });
}

/**
 * 5. Chuyển sang trạng thái ROUND_ENDED khi tất cả người chơi khác đã bỏ lượt
 */
export function transitionToRoundEnded(
  from: PlayingTurnMatchState,
  params: {
    readonly roundWinnerId: string;
    readonly nextLeadPlayerId: string;
    readonly chopNotification?: ChopNotificationInfo | null;
  }
): RoundEndedMatchState {
  return {
    status: 'ROUND_ENDED',
    gameNumber: from.gameNumber,
    roundNumber: from.roundNumber,
    players: from.players,
    rules: from.rules,
    roundWinnerId: params.roundWinnerId,
    nextLeadPlayerId: params.nextLeadPlayerId,
    lastRoundMoves: from.roundMoves,
    chopNotification: params.chopNotification ?? from.chopNotification
  };
}

/**
 * 6. Chuyển sang trạng thái INSTANT_WIN (Tới trắng)
 */
export function transitionToInstantWin(
  from: WaitingMatchState | DealingMatchState,
  params: {
    readonly instantWinner: MatchPlayer;
    readonly instantWinType: InstantWinType;
    readonly matchPayouts: Readonly<Record<string, number>>;
    readonly eloDeltas: Readonly<Record<string, number>>;
    readonly matchLogReport?: MatchLogReport | null;
  }
): InstantWinMatchState {
  return {
    status: 'INSTANT_WIN',
    gameNumber: from.gameNumber,
    players: from.players,
    rules: from.rules,
    instantWinner: params.instantWinner,
    instantWinType: params.instantWinType,
    matchPayouts: params.matchPayouts,
    eloDeltas: params.eloDeltas,
    matchLogReport: params.matchLogReport ?? null
  };
}

/**
 * 7. Chuyển sang trạng thái GAME_OVER
 */
export function transitionToGameOver(
  from: PlayingTurnMatchState | RoundEndedMatchState | WaitingMatchState,
  params: {
    readonly gameNumber?: number;
    readonly winners: readonly MatchPlayer[];
    readonly winningMove: PlayedMove | null;
    readonly settlement: PerspectiveMatchSettlement;
    readonly isThreeSpadesWin?: boolean;
    readonly matchPayouts?: Readonly<Record<string, number>>;
    readonly eloDeltas?: Readonly<Record<string, number>>;
    readonly matchLogReport?: MatchLogReport | null;
  }
): GameOverMatchState {
  return {
    status: 'GAME_OVER',
    gameNumber: params.gameNumber ?? from.gameNumber,
    players: from.players,
    rules: from.rules,
    winners: params.winners,
    winningMove: params.winningMove,
    isThreeSpadesWin: params.isThreeSpadesWin ?? false,
    matchPayouts: params.matchPayouts ?? {},
    eloDeltas: params.eloDeltas ?? {},
    settlement: params.settlement,
    matchLogReport: params.matchLogReport ?? null
  };
}

/* =================================================================================
 * REDUX/ACTOR REDUCER FOR MATCH STATE
 * ================================================================================= */

export type MatchEngineAction =
  | {
      readonly type: 'INIT_WAITING';
      readonly gameNumber: number;
      readonly players: readonly MatchPlayer[];
      readonly rules: GameRules;
      readonly lastWinnerId?: string | null;
    }
  | {
      readonly type: 'START_DEALING';
      readonly dealtCounts: Readonly<Record<string, number>>;
      readonly dealBanner?: string | null;
    }
  | {
      readonly type: 'START_PLAYING';
      readonly gameNumber?: number;
      readonly roundNumber: number;
      readonly players: readonly MatchPlayer[];
      readonly currentTurnPlayerId: string;
      readonly leadPlayerId: string;
      readonly leadingMove: PlayedMove | null;
      readonly isLeadMove: boolean;
      readonly isFirstMoveOfGame: boolean;
      readonly firstMoveRequiredCard?: Card | null;
      readonly roundMoves?: readonly PlayedMove[];
      readonly passedPlayerIds?: readonly string[];
      readonly chopNotification?: ChopNotificationInfo | null;
      readonly botThinkingThought?: BotThinkingInfo | null;
    }
  | {
      readonly type: 'UPDATE_TURN';
      readonly gameNumber?: number;
      readonly players?: readonly MatchPlayer[];
      readonly currentTurnPlayerId: string;
      readonly leadPlayerId: string;
      readonly leadingMove: PlayedMove | null;
      readonly isLeadMove: boolean;
      readonly isFirstMoveOfGame?: boolean;
      readonly firstMoveRequiredCard?: Card | null;
      readonly roundMoves?: readonly PlayedMove[];
      readonly passedPlayerIds?: readonly string[];
      readonly chopNotification?: ChopNotificationInfo | null;
      readonly botThinkingThought?: BotThinkingInfo | null;
    }
  | {
      readonly type: 'TRIGGER_INSTANT_WIN';
      readonly instantWinner: MatchPlayer;
      readonly instantWinType: InstantWinType;
      readonly matchPayouts: Readonly<Record<string, number>>;
      readonly eloDeltas: Readonly<Record<string, number>>;
      readonly matchLogReport?: MatchLogReport | null;
    }
  | {
      readonly type: 'FINISH_ROUND';
      readonly roundWinnerId: string;
      readonly nextLeadPlayerId: string;
      readonly chopNotification?: ChopNotificationInfo | null;
    }
  | {
      readonly type: 'END_GAME';
      readonly gameNumber?: number;
      readonly winners: readonly MatchPlayer[];
      readonly winningMove: PlayedMove | null;
      readonly settlement: PerspectiveMatchSettlement;
      readonly isThreeSpadesWin?: boolean;
      readonly matchPayouts?: Readonly<Record<string, number>>;
      readonly eloDeltas?: Readonly<Record<string, number>>;
      readonly matchLogReport?: MatchLogReport | null;
    };

/**
 * Pure Match Reducer: (State, Action) => NextState
 */
export function reduceMatchState(state: MatchState, action: MatchEngineAction): MatchState {
  switch (action.type) {
    case 'INIT_WAITING':
      return transitionToWaiting(action);

    case 'START_DEALING':
      if (state.status === 'WAITING') {
        return transitionToDealing(state, action);
      }
      return state;

    case 'START_PLAYING':
      if (state.status === 'DEALING' || state.status === 'WAITING' || state.status === 'ROUND_ENDED') {
        return transitionToPlaying(state, action);
      }
      return createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: action.gameNumber ?? state.gameNumber,
        roundNumber: action.roundNumber,
        players: cloneMatchPlayers(action.players),
        rules: state.rules,
        currentTurnPlayerId: action.currentTurnPlayerId,
        leadPlayerId: action.leadPlayerId,
        roundMoves: action.roundMoves ?? (action.leadingMove ? [action.leadingMove] : []),
        leadingMove: action.leadingMove,
        isLeadMove: action.isLeadMove,
        isFirstMoveOfGame: action.isFirstMoveOfGame,
        firstMoveRequiredCard: action.firstMoveRequiredCard,
        passedPlayerIds: action.passedPlayerIds ?? [],
        chopNotification: action.chopNotification ?? null,
        botThinkingThought: action.botThinkingThought ?? null
      });

    case 'UPDATE_TURN':
      if (state.status === 'PLAYING') {
        return createPlayingTurnMatchState({
          status: 'PLAYING',
          gameNumber: action.gameNumber ?? state.gameNumber,
          roundNumber: state.roundNumber,
          players: action.players
            ? cloneMatchPlayers(action.players)
            : state.players,
          rules: state.rules,
          currentTurnPlayerId: action.currentTurnPlayerId,
          leadPlayerId: action.leadPlayerId,
          roundMoves: action.roundMoves ?? state.roundMoves,
          leadingMove: action.leadingMove,
          isLeadMove: action.isLeadMove,
          isFirstMoveOfGame: action.isFirstMoveOfGame ?? false,
          firstMoveRequiredCard: action.firstMoveRequiredCard ?? null,
          passedPlayerIds: action.passedPlayerIds ?? state.passedPlayerIds,
          chopNotification: action.chopNotification !== undefined ? action.chopNotification : state.chopNotification,
          botThinkingThought: action.botThinkingThought !== undefined ? action.botThinkingThought : state.botThinkingThought
        });
      }
      return state;

    case 'TRIGGER_INSTANT_WIN':
      if (state.status === 'WAITING' || state.status === 'DEALING') {
        return transitionToInstantWin(state, action);
      }
      return state;

    case 'FINISH_ROUND':
      if (state.status === 'PLAYING') {
        return transitionToRoundEnded(state, action);
      }
      return state;

    case 'END_GAME':
      if (state.status === 'PLAYING' || state.status === 'ROUND_ENDED' || state.status === 'WAITING') {
        return transitionToGameOver(state, action);
      }
      return state;

    default:
      return state;
  }
}

