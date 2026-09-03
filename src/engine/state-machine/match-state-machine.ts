import type { Card, Player, PlayedMove } from '../types';
import {
  type MatchState,
  type MatchStatus,
  type WaitingMatchState,
  type DealingMatchState,
  type PlayingTurnMatchState,
  type InstantWinMatchState,
  type RoundEndedMatchState,
  type GameOverMatchState,
  assertNever
} from './types';
import type { IMatchStateBehavior, PassTurnBehaviorResult } from './behaviors';
import type { PlayMoveResult } from '../game';
import type { MatchSnapshot } from '../offline-match-driver';

export type MatchStateChangeListener = (state: MatchState) => void;

/**
 * Context của State Machine (Quản lý trạng thái trận đấu và điều phối transitions)
 */
export class MatchStateMachine {
  private currentBehavior: IMatchStateBehavior;
  private readonly listeners: Set<MatchStateChangeListener> = new Set();

  constructor(initialBehavior: IMatchStateBehavior) {
    this.currentBehavior = initialBehavior;
  }

  public get state(): MatchState {
    return this.currentBehavior.getState();
  }

  public get status(): MatchStatus {
    return this.currentBehavior.status;
  }

  public get behavior(): IMatchStateBehavior {
    return this.currentBehavior;
  }

  /**
   * Chuyển trạng thái (State Transition)
   */
  public transitionTo(nextBehavior: IMatchStateBehavior): void {
    this.currentBehavior = nextBehavior;
    this.notifyListeners();
  }

  /**
   * Đăng ký lắng nghe thay đổi trạng thái
   */
  public subscribe(listener: MatchStateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.state;
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  /**
   * Thực hiện đánh bài thông qua State Behavior hiện tại
   */
  public playMove(playerId: string, cards: readonly Card[]): PlayMoveResult {
    return this.currentBehavior.handlePlayMove(playerId, cards);
  }

  /**
   * Thực hiện bỏ lượt thông qua State Behavior hiện tại
   */
  public passTurn(playerId: string): PassTurnBehaviorResult {
    return this.currentBehavior.handlePassTurn(playerId);
  }

  /**
   * Chuyển đổi MatchState chuẩn mực sang MatchSnapshot để tương thích ngược 100%
   */
  public getSnapshot(): MatchSnapshot {
    return mapMatchStateToSnapshot(this.state);
  }
}

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
