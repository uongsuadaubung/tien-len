import type { Card } from '../types';
import type { MoveHint } from '../../ai/hint-engine';
import type { OpeningReason, LastAction } from '../network/network.schema';

export type HandSortMode = 'NATURAL' | 'SMART_GROUP' | 'BY_SUIT' | 'TWO_PRESERVE';

/**
 * HandCardRenderModel
 * Đại diện cho 1 lá bài hiển thị trên tay người chơi cục bộ
 */
export interface HandCardRenderModel {
  card: Card;
  isSelected: boolean;
  isPlayable: boolean;
}

/**
 * SeatRenderModel
 * Thông tin ghế ngồi và đối thủ quanh bàn đấu (đã qua Fog of War che bài)
 */
export interface SeatRenderModel {
  seatIndex: number; // 0: Bottom (Local), 1: Right, 2: Top, 3: Left
  playerId: string;
  name: string;
  avatar: string;
  cardCount: number;
  isCurrentTurn: boolean;
  isPassed: boolean;
  isLocal: boolean;
  isBot: boolean;
  botPersonaId: string | null;
  statusText: string | null;
  score: number;
}

/**
 * DiscardPileRenderModel
 * Cụm bài đang được đánh ra giữa bàn (Lượt dẫn bài hiện tại)
 */
export interface DiscardPileRenderModel {
  cards: Card[];
  playedByPlayerId: string;
  combinationName: string;
  isChop: boolean;
  chopChainCount: number;
}

/**
 * ControlsRenderModel
 * Quyền điều khiển các nút bấm tương tác - Do Engine quyết định 100%
 */
export interface ControlsRenderModel {
  isMyTurn: boolean;
  canPlay: boolean;
  canPass: boolean;
  canQuickSelect: boolean;
  quickSelectCandidatesCount: number;
  playButtonLabel: string;
}

/**
 * ActiveBannerRenderModel
 * Banner thông báo trạng thái hoặc hiệu ứng đặc biệt
 */
export type ActiveBannerRenderModel =
  | { readonly type: 'CHOP'; readonly message: string; readonly amount: number }
  | { readonly type: 'DEALING' | 'CONG' | 'VICTORY' | 'INFO'; readonly message: string; readonly amount: null };

/**
 * TableRenderFrame
 * Toàn bộ dữ liệu của một khung hình bàn đấu mà Web UI nhận được để render
 */
export interface TableRenderFrame {
  readonly gameNumber: number;
  readonly status: 'WAITING' | 'DEALING' | 'PLAYING' | 'ROUND_ENDED' | 'GAME_OVER' | 'INSTANT_WIN';
  readonly betAmount: number;
  readonly localPlayerId: string;
  readonly seats: readonly SeatRenderModel[];
  readonly myHand: readonly HandCardRenderModel[];
  readonly discardPile: DiscardPileRenderModel | null;
  readonly controls: ControlsRenderModel;
  readonly activeBanner: ActiveBannerRenderModel | null;
  readonly dealBanner: string | null;
  readonly isDealing: boolean;
  readonly dealtCounts: Readonly<Record<string, number>>;
  readonly isGameOver: boolean;
  readonly winners: readonly { id: string; name: string }[];
  readonly aiHint: MoveHint | null;
  readonly botThinkingThought: { botId: string; text: string } | null;
  readonly turnDeadline: number | null;
  readonly openingReason: OpeningReason | null;
  readonly lastAction: LastAction | null;
}

/**
 * UserIntent
 * Các thao tác thô người dùng gửi vào Engine từ Web UI
 */
export type UserIntent =
  | { type: 'TOGGLE_CARD_SELECT'; cardId: string }
  | { type: 'SET_SELECTED_CARDS'; cardIds: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SUBMIT_PLAY' }
  | { type: 'SUBMIT_PASS' }
  | { type: 'TRIGGER_QUICK_SELECT' }
  | { type: 'SORT_HAND'; mode?: HandSortMode }
  | { type: 'REORDER_HAND'; newHand: Card[] }
  | { type: 'APPLY_HINT' };

/**
 * AudioCue
 * Tín hiệu âm thanh Engine phát ra cho tầng Web Audio kích hoạt
 */
export type AudioCue =
  | 'CARD_SLIDE'
  | 'CARD_PLAY'
  | 'CHOP'
  | 'PASS'
  | 'VICTORY'
  | 'DEFEAT'
  | 'DEAL_START'
  | 'DEAL_STEP'
  | 'NOTIFICATION';
