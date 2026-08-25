import { Card, Combination, Player } from '../types';

/**
 * Các loại sự kiện chính trong vòng đời ván đấu
 */
export type GameEventType =
  | 'CARD_PLAYED'
  | 'TURN_PASSED'
  | 'ROUND_WON'
  | 'CHOP_EXECUTED'
  | 'INSTANT_WIN'
  | 'MATCH_COMPLETED'
  | 'COINS_CHANGED';

export interface CardPlayedEvent {
  type: 'CARD_PLAYED';
  playerId: string;
  cards: Card[];
  combination: Combination;
  remainingCardsCount: number;
}

export interface TurnPassedEvent {
  type: 'TURN_PASSED';
  playerId: string;
}

export interface RoundWonEvent {
  type: 'ROUND_WON';
  winnerPlayerId: string;
}

export interface ChopExecutedEvent {
  type: 'CHOP_EXECUTED';
  chopperPlayerId: string;
  victimPlayerId: string;
  penaltyAmount: number;
  choppingCards: Card[];
}

export interface InstantWinEvent {
  type: 'INSTANT_WIN';
  winnerPlayerId: string;
  instantWinType: string;
}

export interface MatchCompletedEvent {
  type: 'MATCH_COMPLETED';
  activeGameType: string;
  winnerPlayerId: string;
  isHumanWinner: boolean;
  winners: Player[];
  allPlayers: Player[];
  payouts: Record<string, number>;
  humanNetCoins: number;
  totalHumanCoins: number;
  betAmount: number;
}

export interface CoinsChangedEvent {
  type: 'COINS_CHANGED';
  playerId: string;
  delta: number;
  newBalance: number;
}

export type GameEvent =
  | CardPlayedEvent
  | TurnPassedEvent
  | RoundWonEvent
  | ChopExecutedEvent
  | InstantWinEvent
  | MatchCompletedEvent
  | CoinsChangedEvent;

export type GameEventMap = {
  CARD_PLAYED: CardPlayedEvent;
  TURN_PASSED: TurnPassedEvent;
  ROUND_WON: RoundWonEvent;
  CHOP_EXECUTED: ChopExecutedEvent;
  INSTANT_WIN: InstantWinEvent;
  MATCH_COMPLETED: MatchCompletedEvent;
  COINS_CHANGED: CoinsChangedEvent;
};

export type EventListener<T extends GameEvent = GameEvent> = (event: T) => void;
type GenericEventListener = (event: GameEvent) => void;

function isMatchingEvent<K extends GameEventType>(eventType: K, event: GameEvent): event is GameEventMap[K] {
  return event.type === eventType;
}

/**
 * Event Bus triển khai Observer Pattern cho toàn bộ sự kiện ván đấu
 */
export class GameEventBus {
  private static instance: GameEventBus;
  private listeners: Map<GameEventType, Set<GenericEventListener>> = new Map();

  public static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  /**
   * Đăng ký lắng nghe sự kiện (Subscribe) với kiểu dữ liệu chính xác cho từng loại sự kiện
   */
  public subscribe<K extends GameEventType>(eventType: K, listener: (event: GameEventMap[K]) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const set = this.listeners.get(eventType)!;
    const genericListener: GenericEventListener = (event) => {
      if (isMatchingEvent(eventType, event)) {
        listener(event);
      }
    };
    set.add(genericListener);

    // Trả về hàm Unsubscribe tiện lợi
    return () => {
      set.delete(genericListener);
    };
  }

  /**
   * Phát đi sự kiện tới tất cả Observers đã đăng ký (Publish)
   */
  public publish(event: GameEvent): void {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const listener of set) {
        try {
          listener(event);
        } catch (err) {
          console.error(`[GameEventBus] Error in listener for event ${event.type}:`, err);
        }
      }
    }
  }

  /**
   * Xóa toàn bộ listeners (dùng cho teardown / test)
   */
  public clear(): void {
    this.listeners.clear();
  }
}
