import type { MatchPlayer, PlayedMove, InstantWinType, GameRules, Card } from '../types';
import type { MatchLogReport } from '../match-logger';
import type { PerspectiveMatchSettlement } from '../settlement/perspective-settlement';

export type MatchStatus =
  | 'WAITING'
  | 'DEALING'
  | 'PLAYING'
  | 'INSTANT_WIN'
  | 'ROUND_ENDED'
  | 'GAME_OVER';

export interface ChopNotificationInfo {
  readonly visible: boolean;
  readonly chopperName: string;
  readonly targetName: string;
  readonly amount: number;
  readonly isCascade: boolean;
  readonly chainCount: number;
}

export interface BotThinkingInfo {
  readonly botId: string;
  readonly text: string;
}

/**
 * 1. Trạng thái chờ khởi động ván bài (Phòng chờ / Chưa chia bài)
 * Không có lượt đi, không có bài chia trên bàn.
 */
export interface WaitingMatchState {
  readonly status: 'WAITING';
  readonly gameNumber: number;
  readonly players: readonly MatchPlayer[];
  readonly rules: GameRules;
  readonly lastWinnerId: string | null;
}

/**
 * 2. Trạng thái đang chia bài (Có thông tin đếm bài & animation banner)
 * Cấm tuyệt đối đánh bài hay bỏ lượt.
 */
export interface DealingMatchState {
  readonly status: 'DEALING';
  readonly gameNumber: number;
  readonly players: readonly MatchPlayer[];
  readonly dealtCounts: Readonly<Record<string, number>>;
  readonly dealBanner: string | null;
  readonly totalCardsDealt: number;
  readonly rules: GameRules;
}

/**
 * 3. Trạng thái đang chơi lượt bình thường
 * currentTurnPlayerId và leadPlayerId BẢO ĐẢM 100% LÀ STRING (Không bao giờ null/undefined).
 */
export interface BasePlayingTurnMatchState {
  readonly status: 'PLAYING';
  readonly gameNumber: number;
  readonly roundNumber: number;
  readonly players: readonly MatchPlayer[];
  readonly currentTurnPlayerId: string; // ✅ Chắc chắn tồn tại
  readonly leadPlayerId: string;        // ✅ Chắc chắn tồn tại
  readonly roundMoves: readonly PlayedMove[];
  readonly isFirstMoveOfGame: boolean;
  readonly passedPlayerIds: readonly string[];
  readonly chopNotification: ChopNotificationInfo | null;
  readonly botThinkingThought: BotThinkingInfo | null;
  readonly rules: GameRules;
}

export interface OpeningFirstMovePlayingState extends BasePlayingTurnMatchState {
  readonly isLeadMove: true;
  readonly leadingMove: null;
  readonly isFirstMoveOfGame: true;
  readonly firstMoveRequiredCard: Card; // ✅ Non-nullable khi là lượt mở màn ván đầu tiên!
}

export interface NormalLeadPlayingTurnMatchState extends BasePlayingTurnMatchState {
  readonly isLeadMove: true;
  readonly leadingMove: null;
  readonly isFirstMoveOfGame: false;
  readonly firstMoveRequiredCard: null;
}

export interface FollowPlayingTurnMatchState extends BasePlayingTurnMatchState {
  readonly isLeadMove: false;
  readonly leadingMove: PlayedMove; // ✅ BẢO ĐẢM 100% NON-NULLABLE KHI ĐÈ BÀI
  readonly isFirstMoveOfGame: false;
  readonly firstMoveRequiredCard: null;
}

export type LeadPlayingTurnMatchState = OpeningFirstMovePlayingState | NormalLeadPlayingTurnMatchState;
export type PlayingTurnMatchState = LeadPlayingTurnMatchState | FollowPlayingTurnMatchState;

/**
 * Factory tại State Boundary chuẩn hóa việc tạo PlayingTurnMatchState
 */
export function createPlayingTurnMatchState(params: BasePlayingTurnMatchState & {
  isLeadMove: boolean;
  leadingMove: PlayedMove | null;
  firstMoveRequiredCard?: Card | null;
}): PlayingTurnMatchState {
  if (params.isFirstMoveOfGame && (params.isLeadMove || !params.leadingMove)) {
    const requiredCard = params.firstMoveRequiredCard ?? (params.players.find(p => p.id === params.currentTurnPlayerId)?.hand[0] ?? null);
    if (requiredCard) {
      return {
        ...params,
        isLeadMove: true,
        leadingMove: null,
        isFirstMoveOfGame: true,
        firstMoveRequiredCard: requiredCard
      };
    }
    return {
      ...params,
      isLeadMove: true,
      leadingMove: null,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null
    };
  }

  if (params.isLeadMove || !params.leadingMove) {
    return {
      ...params,
      isLeadMove: true,
      leadingMove: null,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null
    };
  }

  return {
    ...params,
    isLeadMove: false,
    leadingMove: params.leadingMove,
    isFirstMoveOfGame: false,
    firstMoveRequiredCard: null
  };
}

/**
 * 4. Trạng thái Tới Trắng (sau khi chia bài phát hiện người tới trắng ngay lập tức)
 * instantWinner và instantWinType BẢO ĐẢM 100% TỒN TẠI VÀ KHÔNG NULL.
 */
export interface InstantWinMatchState {
  readonly status: 'INSTANT_WIN';
  readonly gameNumber: number;
  readonly players: readonly MatchPlayer[];
  readonly instantWinner: MatchPlayer;             // ✅ Chắc chắn có người thắng tới trắng
  readonly instantWinType: InstantWinType;    // ✅ Chắc chắn có loại tới trắng
  readonly matchPayouts: Readonly<Record<string, number>>; // ✅ Bảng tiền đã kết toán
  readonly eloDeltas: Readonly<Record<string, number>>;
  readonly matchLogReport: MatchLogReport | null;
  readonly rules: GameRules;
}

/**
 * 5. Trạng thái Vòng chơi kết thúc (Mọi đối thủ đã pass lượt)
 * roundWinnerId và nextLeadPlayerId BẢO ĐẢM 100% LÀ STRING.
 */
export interface RoundEndedMatchState {
  readonly status: 'ROUND_ENDED';
  readonly gameNumber: number;
  readonly roundNumber: number;
  readonly players: readonly MatchPlayer[];
  readonly roundWinnerId: string;             // ✅ Người thắng vòng bài này
  readonly nextLeadPlayerId: string;          // ✅ Người sẽ dẫn đầu vòng tiếp theo
  readonly lastRoundMoves: readonly PlayedMove[];
  readonly chopNotification: ChopNotificationInfo | null;
  readonly rules: GameRules;
}

/**
 * 6. Trạng thái Ván đấu kết thúc (Hạ màn, có danh sách thứ tự xếp hạng và bảng tiền)
 * winners và matchPayouts BẢO ĐẢM 100% TỒN TẠI.
 */
export interface GameOverMatchState {
  readonly status: 'GAME_OVER';
  readonly gameNumber: number;
  readonly players: readonly MatchPlayer[];
  readonly winners: readonly MatchPlayer[];        // ✅ Danh sách xếp hạng Nhất, Nhì, Ba, Bét
  readonly winningMove: PlayedMove | null;    // ✅ Nước bài dứt điểm chiến thắng ván đấu (giữ trên bàn 2s)
  readonly isThreeSpadesWin: boolean;
  readonly matchPayouts: Readonly<Record<string, number>>; // ✅ Bảng kết toán tiền
  readonly eloDeltas: Readonly<Record<string, number>>;    // ✅ Điểm Elo biến động
  readonly settlement: PerspectiveMatchSettlement;        // ✅ Authoritative Perspective Settlement (Non-nullable)
  readonly matchLogReport: MatchLogReport | null;
  readonly rules: GameRules;
  readonly leadingMove?: PlayedMove | null;
  readonly chopNotification?: ChopNotificationInfo | null;
}

/**
 * Discriminated Union tổng hợp đại diện cho toàn bộ trạng thái của một ván bài
 */
export type MatchState =
  | WaitingMatchState
  | DealingMatchState
  | PlayingTurnMatchState
  | InstantWinMatchState
  | RoundEndedMatchState
  | GameOverMatchState;

/**
 * Hàm kiểm tra vét cạn (Exhaustive Check) bảo đảm TypeScript compiler
 * sẽ phát hiện ngay lập tức nếu thiếu bất kỳ State nào trong switch/case
 */
export function assertNever(x: never, message: string = 'Unhandled MatchState status'): never {
  throw new Error(`${message}: ${JSON.stringify(x)}`);
}

/* =================================================================================
 * BỘ STATE TYPE GUARDS (Zero-Any, Zero-Shortcut, Strict State Pattern)
 * ================================================================================= */

export function isWaitingMatchState(state: MatchState): state is WaitingMatchState {
  return state.status === 'WAITING';
}

export function isDealingMatchState(state: MatchState): state is DealingMatchState {
  return state.status === 'DEALING';
}

export function isPlayingMatchState(state: MatchState): state is PlayingTurnMatchState {
  return state.status === 'PLAYING';
}

export function isLeadPlayingTurnMatchState(state: MatchState): state is LeadPlayingTurnMatchState {
  return isPlayingMatchState(state) && state.isLeadMove;
}

export function isOpeningFirstMovePlayingState(state: MatchState): state is OpeningFirstMovePlayingState {
  return isPlayingMatchState(state) && state.isLeadMove && state.isFirstMoveOfGame;
}

export function isNormalLeadPlayingTurnMatchState(state: MatchState): state is NormalLeadPlayingTurnMatchState {
  return isPlayingMatchState(state) && state.isLeadMove && !state.isFirstMoveOfGame;
}

export function isFollowPlayingTurnMatchState(state: MatchState): state is FollowPlayingTurnMatchState {
  return isPlayingMatchState(state) && !state.isLeadMove;
}

export function isInstantWinMatchState(state: MatchState): state is InstantWinMatchState {
  return state.status === 'INSTANT_WIN';
}

export function isRoundEndedMatchState(state: MatchState): state is RoundEndedMatchState {
  return state.status === 'ROUND_ENDED';
}

export function isGameOverMatchState(state: MatchState): state is GameOverMatchState {
  return state.status === 'GAME_OVER';
}

export function isTerminalMatchState(state: MatchState): state is GameOverMatchState | InstantWinMatchState {
  return state.status === 'GAME_OVER' || state.status === 'INSTANT_WIN';
}

/* =================================================================================
 * STATE BEHAVIOR QUERIES (Truy vấn nghiệp vụ cốt lõi không dùng Fallback)
 * ================================================================================= */

/**
 * Kiểm tra xem một người chơi có quyền đánh bài trong trạng thái hiện tại hay không
 */
export function canPlayerPlayInMatchState(state: MatchState, playerId: string): boolean {
  if (!isPlayingMatchState(state)) return false;
  if (state.currentTurnPlayerId !== playerId) return false;
  return !state.passedPlayerIds.includes(playerId);
}

/**
 * Kiểm tra xem một người chơi có quyền bỏ lượt trong trạng thái hiện tại hay không
 * (Cấm bỏ lượt khi là nước đi mở màn đầu tiên của ván hoặc lượt mở vòng mới)
 */
export function canPlayerPassInMatchState(state: MatchState, playerId: string): boolean {
  if (!isPlayingMatchState(state)) return false;
  if (state.currentTurnPlayerId !== playerId) return false;
  if (state.isFirstMoveOfGame) return false;
  if (state.isLeadMove) return false;
  return !state.passedPlayerIds.includes(playerId);
}

/**
 * Lấy ID người chơi đang có lượt đánh
 */
export function getCurrentTurnPlayerIdFromMatchState(state: MatchState): string | null {
  if (isPlayingMatchState(state)) {
    return state.currentTurnPlayerId;
  }
  return null;
}

/**
 * Lấy ID người chơi dẫn đầu vòng hiện tại
 */
export function getLeadPlayerIdFromMatchState(state: MatchState): string | null {
  if (isPlayingMatchState(state)) {
    return state.leadPlayerId;
  }
  if (isRoundEndedMatchState(state)) {
    return state.nextLeadPlayerId;
  }
  return null;
}

/**
 * Lấy nước bài dẫn đầu đang có hiệu lực trên bàn đấu
 */
export function getActiveLeadingMoveFromMatchState(state: MatchState): PlayedMove | null {
  if (isFollowPlayingTurnMatchState(state)) {
    return state.leadingMove;
  }
  if (isGameOverMatchState(state)) {
    return state.winningMove ?? state.leadingMove ?? null;
  }
  if (isRoundEndedMatchState(state) && state.lastRoundMoves.length > 0) {
    return state.lastRoundMoves[state.lastRoundMoves.length - 1];
  }
  return null;
}

/**
 * Lấy danh sách người chiến thắng theo thứ hạng
 */
export function getWinnersFromMatchState(state: MatchState): readonly MatchPlayer[] {
  if (isGameOverMatchState(state)) {
    return state.winners;
  }
  if (isInstantWinMatchState(state)) {
    return [state.instantWinner];
  }
  return [];
}

/**
 * Kiểm tra xem ván đấu đã kết thúc hay chưa (GAME_OVER hoặc INSTANT_WIN)
 */
export function isGameOverFromMatchState(state: MatchState): boolean {
  return isTerminalMatchState(state);
}

