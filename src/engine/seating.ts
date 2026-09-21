import type { MatchPlayer } from './types';

export interface Solo1v1TableSeats {
  readonly isSolo1v1: true;
  readonly playerCount: 2;
  readonly topPlayer: MatchPlayer;
  readonly leftPlayer: null;
  readonly rightPlayer: null;
}

export interface ThreePlayerTableSeats {
  readonly isSolo1v1: false;
  readonly playerCount: 3;
  readonly topPlayer: MatchPlayer;
  readonly leftPlayer: MatchPlayer;
  readonly rightPlayer: null;
}

export interface FourPlayerTableSeats {
  readonly isSolo1v1: false;
  readonly playerCount: 4;
  readonly topPlayer: MatchPlayer;
  readonly leftPlayer: MatchPlayer;
  readonly rightPlayer: MatchPlayer;
}

export type RelativeTableSeats = Solo1v1TableSeats | ThreePlayerTableSeats | FourPlayerTableSeats;

/**
 * Tính toán vị trí ghế tương đối theo chiều kim đồng hồ quanh bàn chơi
 * dựa trên góc nhìn (perspective) của localPlayerId.
 * Áp dụng Discriminated Union: Bàn 4 người bảo đảm 100% cả 3 vị trí (Top, Left, Right) là MatchPlayer non-nullable.
 */
export function computeRelativeTableSeats(
  localPlayerId: string,
  players: readonly MatchPlayer[]
): RelativeTableSeats {
  const numPlayers = players.length;
  if (numPlayers !== 2 && numPlayers !== 3 && numPlayers !== 4) {
    throw new Error(`[computeRelativeTableSeats] Invariant violated: Unsupported player count "${numPlayers}". Expected 2, 3, or 4.`);
  }

  const myIndex = players.findIndex(p => p.id === localPlayerId);
  if (myIndex === -1) {
    throw new Error(`[computeRelativeTableSeats] Invariant violated: localPlayerId "${localPlayerId}" does not exist in players.`);
  }

  if (numPlayers === 2) {
    const top = players[(myIndex + 1) % 2];
    return {
      isSolo1v1: true,
      playerCount: 2,
      topPlayer: top,
      leftPlayer: null,
      rightPlayer: null
    };
  }

  if (numPlayers === 3) {
    const left = players[(myIndex + 1) % 3];
    const top = players[(myIndex + 2) % 3];
    return {
      isSolo1v1: false,
      playerCount: 3,
      topPlayer: top,
      leftPlayer: left,
      rightPlayer: null
    };
  }

  // numPlayers === 4
  const left = players[(myIndex + 1) % 4];
  const top = players[(myIndex + 2) % 4];
  const right = players[(myIndex + 3) % 4];
  return {
    isSolo1v1: false,
    playerCount: 4,
    topPlayer: top,
    leftPlayer: left,
    rightPlayer: right
  };
}
