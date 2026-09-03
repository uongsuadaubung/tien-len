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
  | 'COINS_CHANGED'
  | 'WHEEL_SPUN';

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
  isCascadeChop: boolean;
  chopChainCount: number;
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
  isThreeSpadesWin: boolean;
  playerCount: number;
  congsGivenCount: number;
  cascadeChopCount: number;
  loanDeduction: number;
  instantWinType: string | null;
}

export interface CoinsChangedEvent {
  type: 'COINS_CHANGED';
  playerId: string;
  delta: number;
  newBalance: number;
}

export interface WheelSpunEvent {
  type: 'WHEEL_SPUN';
  prizeValue: number;
}

export type GameEvent =
  | CardPlayedEvent
  | TurnPassedEvent
  | RoundWonEvent
  | ChopExecutedEvent
  | InstantWinEvent
  | MatchCompletedEvent
  | CoinsChangedEvent
  | WheelSpunEvent;

export type GameEventMap = {
  CARD_PLAYED: CardPlayedEvent;
  TURN_PASSED: TurnPassedEvent;
  ROUND_WON: RoundWonEvent;
  CHOP_EXECUTED: ChopExecutedEvent;
  INSTANT_WIN: InstantWinEvent;
  MATCH_COMPLETED: MatchCompletedEvent;
  COINS_CHANGED: CoinsChangedEvent;
  WHEEL_SPUN: WheelSpunEvent;
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
   * Đăng ký lắng nghe sự kiện
   */
  public subscribe<K extends GameEventType>(
    eventType: K,
    listener: EventListener<GameEventMap[K]>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const set = this.listeners.get(eventType)!;
    const genericListener: GenericEventListener = (event: GameEvent) => {
      if (isMatchingEvent(eventType, event)) {
        listener(event);
      }
    };
    set.add(genericListener);

    return () => {
      set.delete(genericListener);
      if (set.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  /**
   * Phát đi một sự kiện tới các listeners
   */
  public publish(event: GameEvent): void {
    const set = this.listeners.get(event.type);
    if (!set || set.size === 0) return;

    for (const listener of set) {
      try {
        listener(event);
      } catch (err) {
        console.error(`[GameEventBus] Error executing listener for event ${event.type}:`, err);
      }
    }
  }

  /**
   * Bí danh ngắn gọn cho publish
   */
  public emit(event: GameEvent): void {
    this.publish(event);
  }

  /**
   * Xóa toàn bộ listeners (phục vụ reset/testing)
   */
  public clear(): void {
    this.listeners.clear();
  }
}
