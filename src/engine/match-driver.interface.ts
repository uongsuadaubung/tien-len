import type { Card } from './types';

export type DriverActionResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

/**
 * IMatchDriver
 * Hợp đồng điều khiển bàn đấu thống nhất cho cả OfflineMatchDriver và HostEngineDriver
 */
export interface IMatchDriver {
  readonly gameNumber: number;
  playCards(playerId: string, cards: Card[]): DriverActionResult;
  passTurn(playerId: string): DriverActionResult;
  cleanup(): void;
}
