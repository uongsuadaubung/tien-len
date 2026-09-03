import type { Card } from '../types';
import type {
  MatchState,
  MatchStatus,
  WaitingMatchState,
  DealingMatchState,
  PlayingTurnMatchState,
  InstantWinMatchState,
  RoundEndedMatchState,
  GameOverMatchState
} from './types';
import type { PlayMoveResult } from '../game';

export interface PassTurnBehaviorResult {
  readonly success: boolean;
  readonly isRoundOver: boolean;
  readonly nextTurnPlayerId: string | null;
  readonly error: string | null;
}

/**
 * Interface cơ sở cho hành vi của một State (State Pattern GoF)
 */
export interface IMatchStateBehavior {
  readonly status: MatchStatus;
  getState(): MatchState;
  canPlayMove(): boolean;
  canPass(): boolean;
  handlePlayMove(playerId: string, cards: readonly Card[]): PlayMoveResult;
  handlePassTurn(playerId: string): PassTurnBehaviorResult;
}

/**
 * Hành vi tại trạng thái WAITING
 */
export class WaitingStateBehavior implements IMatchStateBehavior {
  public readonly status: MatchStatus = 'WAITING';

  constructor(private readonly state: WaitingMatchState) {}

  public getState(): WaitingMatchState {
    return this.state;
  }

  public canPlayMove(): boolean {
    return false;
  }

  public canPass(): boolean {
    return false;
  }

  public handlePlayMove(): PlayMoveResult {
    return {
      success: false,
      isChop: null,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null,
      playedMove: null,
      error: 'Không thể đánh bài khi trận đấu đang ở trạng thái chờ!',
      isGameOver: false
    };
  }

  public handlePassTurn(): PassTurnBehaviorResult {
    return {
      success: false,
      isRoundOver: false,
      nextTurnPlayerId: null,
      error: 'Không thể bỏ lượt khi trận đấu chưa bắt đầu!'
    };
  }
}

/**
 * Hành vi tại trạng thái DEALING
 */
export class DealingStateBehavior implements IMatchStateBehavior {
  public readonly status: MatchStatus = 'DEALING';

  constructor(private readonly state: DealingMatchState) {}

  public getState(): DealingMatchState {
    return this.state;
  }

  public canPlayMove(): boolean {
    return false;
  }

  public canPass(): boolean {
    return false;
  }

  public handlePlayMove(): PlayMoveResult {
    return {
      success: false,
      isChop: null,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null,
      playedMove: null,
      error: 'Đang trong quá trình chia bài, chưa thể đánh bài!',
      isGameOver: false
    };
  }

  public handlePassTurn(): PassTurnBehaviorResult {
    return {
      success: false,
      isRoundOver: false,
      nextTurnPlayerId: null,
      error: 'Đang trong quá trình chia bài, không thể bỏ lượt!'
    };
  }
}

/**
 * Hành vi tại trạng thái PLAYING (Lượt chơi bình thường)
 */
export class PlayingTurnStateBehavior implements IMatchStateBehavior {
  public readonly status: MatchStatus = 'PLAYING';

  constructor(
    private readonly state: PlayingTurnMatchState,
    private readonly playMoveHandler: (playerId: string, cards: readonly Card[]) => PlayMoveResult,
    private readonly passTurnHandler: (playerId: string) => PassTurnBehaviorResult
  ) {}

  public getState(): PlayingTurnMatchState {
    return this.state;
  }

  public canPlayMove(): boolean {
    return true;
  }

  public canPass(): boolean {
    return !this.state.isLeadMove;
  }

  public handlePlayMove(playerId: string, cards: readonly Card[]): PlayMoveResult {
    if (playerId !== this.state.currentTurnPlayerId) {
      return {
        success: false,
        isChop: null,
        choppedPlayerId: null,
        penaltyAmount: null,
        isCascadeChop: null,
        chopChainCount: null,
        chopChainTotalAmount: null,
        playedMove: null,
        error: `Chưa tới lượt của người chơi ${playerId}! Hiện tại là lượt của ${this.state.currentTurnPlayerId}.`,
        isGameOver: false
      };
    }
    return this.playMoveHandler(playerId, cards);
  }

  public handlePassTurn(playerId: string): PassTurnBehaviorResult {
    if (playerId !== this.state.currentTurnPlayerId) {
      return {
        success: false,
        isRoundOver: false,
        nextTurnPlayerId: null,
        error: `Chưa tới lượt của người chơi ${playerId}! Hiện tại là lượt của ${this.state.currentTurnPlayerId}.`
      };
    }
    if (this.state.isLeadMove) {
      return {
        success: false,
        isRoundOver: false,
        nextTurnPlayerId: null,
        error: 'Người dẫn đầu vòng (Lead) bắt buộc phải ra bài, không được bỏ lượt!'
      };
    }
    return this.passTurnHandler(playerId);
  }
}

/**
 * Hành vi tại trạng thái INSTANT_WIN
 */
export class InstantWinStateBehavior implements IMatchStateBehavior {
  public readonly status: MatchStatus = 'INSTANT_WIN';

  constructor(private readonly state: InstantWinMatchState) {}

  public getState(): InstantWinMatchState {
    return this.state;
  }

  public canPlayMove(): boolean {
    return false;
  }

  public canPass(): boolean {
    return false;
  }

  public handlePlayMove(): PlayMoveResult {
    return {
      success: false,
      isChop: null,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null,
      playedMove: null,
      error: `Ván đấu đã kết thúc do ${this.state.instantWinner.name} Tới Trắng (${this.state.instantWinType})!`,
      isGameOver: true
    };
  }

  public handlePassTurn(): PassTurnBehaviorResult {
    return {
      success: false,
      isRoundOver: false,
      nextTurnPlayerId: null,
      error: 'Ván đấu đã kết thúc do Tới Trắng!'
    };
  }
}

/**
 * Hành vi tại trạng thái ROUND_ENDED
 */
export class RoundEndedStateBehavior implements IMatchStateBehavior {
  public readonly status: MatchStatus = 'ROUND_ENDED';

  constructor(private readonly state: RoundEndedMatchState) {}

  public getState(): RoundEndedMatchState {
    return this.state;
  }

  public canPlayMove(): boolean {
    return false;
  }

  public canPass(): boolean {
    return false;
  }

  public handlePlayMove(): PlayMoveResult {
    return {
      success: false,
      isChop: null,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null,
      playedMove: null,
      error: 'Vòng bài đã kết thúc! Đang chờ khởi động vòng bài mới.',
      isGameOver: false
    };
  }

  public handlePassTurn(): PassTurnBehaviorResult {
    return {
      success: false,
      isRoundOver: true,
      nextTurnPlayerId: null,
      error: 'Vòng bài đã kết thúc!'
    };
  }
}

/**
 * Hành vi tại trạng thái GAME_OVER
 */
export class GameOverStateBehavior implements IMatchStateBehavior {
  public readonly status: MatchStatus = 'GAME_OVER';

  constructor(private readonly state: GameOverMatchState) {}

  public getState(): GameOverMatchState {
    return this.state;
  }

  public canPlayMove(): boolean {
    return false;
  }

  public canPass(): boolean {
    return false;
  }

  public handlePlayMove(): PlayMoveResult {
    return {
      success: false,
      isChop: null,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null,
      playedMove: null,
      error: 'Ván đấu đã kết thúc! Hãy bắt đầu ván mới để tiếp tục.',
      isGameOver: true
    };
  }

  public handlePassTurn(): PassTurnBehaviorResult {
    return {
      success: false,
      isRoundOver: false,
      nextTurnPlayerId: null,
      error: 'Ván đấu đã kết thúc!'
    };
  }
}
