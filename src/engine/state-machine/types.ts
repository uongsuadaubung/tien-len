import type { Player, PlayedMove, InstantWinType, GameRules } from '../types';
import type { MatchLogReport } from '../match-logger';

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
  readonly players: readonly Player[];
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
  readonly players: readonly Player[];
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
  readonly players: readonly Player[];
  readonly currentTurnPlayerId: string; // ✅ Chắc chắn tồn tại
  readonly leadPlayerId: string;        // ✅ Chắc chắn tồn tại
  readonly roundMoves: readonly PlayedMove[];
  readonly isFirstMoveOfGame: boolean;
  readonly passedPlayerIds: readonly string[];
  readonly chopNotification: ChopNotificationInfo | null;
  readonly botThinkingThought: BotThinkingInfo | null;
  readonly rules: GameRules;
}

export interface LeadPlayingTurnMatchState extends BasePlayingTurnMatchState {
  readonly isLeadMove: true;
  readonly leadingMove: null;
}

export interface FollowPlayingTurnMatchState extends BasePlayingTurnMatchState {
  readonly isLeadMove: false;
  readonly leadingMove: PlayedMove; // ✅ BẢO ĐẢM 100% NON-NULLABLE KHI ĐÈ BÀI
}

export type PlayingTurnMatchState = LeadPlayingTurnMatchState | FollowPlayingTurnMatchState;

/**
 * Factory tại State Boundary chuẩn hóa việc tạo PlayingTurnMatchState
 */
export function createPlayingTurnMatchState(params: BasePlayingTurnMatchState & {
  isLeadMove: boolean;
  leadingMove: PlayedMove | null;
}): PlayingTurnMatchState {
  if (params.isLeadMove || !params.leadingMove) {
    return {
      ...params,
      isLeadMove: true,
      leadingMove: null
    };
  }
  return {
    ...params,
    isLeadMove: false,
    leadingMove: params.leadingMove
  };
}

/**
 * 4. Trạng thái Tới Trắng (sau khi chia bài phát hiện người tới trắng ngay lập tức)
 * instantWinner và instantWinType BẢO ĐẢM 100% TỒN TẠI VÀ KHÔNG NULL.
 */
export interface InstantWinMatchState {
  readonly status: 'INSTANT_WIN';
  readonly gameNumber: number;
  readonly players: readonly Player[];
  readonly instantWinner: Player;             // ✅ Chắc chắn có người thắng tới trắng
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
  readonly players: readonly Player[];
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
  readonly players: readonly Player[];
  readonly winners: readonly Player[];        // ✅ Danh sách xếp hạng Nhất, Nhì, Ba, Bét
  readonly isThreeSpadesWin: boolean;
  readonly matchPayouts: Readonly<Record<string, number>>; // ✅ Bảng kết toán tiền
  readonly eloDeltas: Readonly<Record<string, number>>;    // ✅ Điểm Elo biến động
  readonly matchLogReport: MatchLogReport | null;
  readonly rules: GameRules;
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
