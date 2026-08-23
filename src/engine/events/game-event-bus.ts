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

export type EventListener<T extends GameEvent = GameEvent> = (event: T) => void;

/**
 * Event Bus triển khai Observer Pattern cho toàn bộ sự kiện ván đấu
 */
export class GameEventBus {
  private static instance: GameEventBus;
  private listeners: Map<GameEventType, Set<EventListener<any>>> = new Map();

  public static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  /**
   * Đăng ký lắng nghe sự kiện (Subscribe)
   */
  public subscribe<T extends GameEvent>(eventType: GameEventType, listener: EventListener<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const set = this.listeners.get(eventType)!;
    set.add(listener as EventListener<any>);

    // Trả về hàm Unsubscribe tiện lợi
    return () => {
      set.delete(listener as EventListener<any>);
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
