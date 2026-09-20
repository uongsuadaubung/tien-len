import type { Card } from './types';

import type { CardTracker } from '../ai/card-tracker';
import type { MoveHint } from '../ai/hint-engine';

export type DriverActionResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

/**
 * IMatchDriver
 * Hợp đồng điều khiển bàn đấu thống nhất cho cả OfflineMatchDriver, HostEngineDriver và GuestEngineDriver
 */
export interface IMatchDriver {
  readonly gameNumber: number;
  playCards(playerId: string, cards: Card[]): DriverActionResult;
  passTurn(playerId: string): DriverActionResult;
  reorderPlayerHand(playerId: string, newHand: Card[]): boolean;
  getTracker(playerId: string): CardTracker | null;
  getAiHint(playerId: string): MoveHint | null;
  handleGameOver(options?: { skipDelay?: boolean }): void;
  cleanup(): void;
}

