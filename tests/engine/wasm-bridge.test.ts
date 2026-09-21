import { describe, it, expect, beforeAll } from 'bun:test';
import {
  initWasmCore,
  isWasmReady,
  wasmCreateDeck,
  wasmIdentifyCombination,
  wasmCanBeat,
  wasmCanChop,
  wasmStartNewGame,
  wasmValidateMove,
  wasmSortSmartGroups,
  wasmCalculateChopPenalty
} from '../../src/engine/wasm-bridge';
import { createDefaultGameRules } from '../../src/engine/types';
import type { MatchPlayer, Card } from '../../src/engine/types';

describe('WasmBridge Rust Core Integration', () => {
  beforeAll(async () => {
    await initWasmCore();
  });

  it('should initialize Rust WebAssembly engine successfully', () => {
    expect(isWasmReady()).toBe(true);
  });

  it('should create standard 52-card deck via Rust WASM', () => {
    const deck = wasmCreateDeck();
    expect(deck.length).toBe(52);
    expect(deck.some(c => c.rank === 3 && c.suit === 'SPADES')).toBe(true);
    expect(deck.some(c => c.rank === 15 && c.suit === 'HEARTS')).toBe(true);
  });

  it('should identify combinations accurately via Rust WASM', () => {
    const cards: Card[] = [
      { id: '3-SPADES', rank: 3, suit: 'SPADES', weight: 13, code: '3S' },
      { id: '4-CLUBS', rank: 4, suit: 'CLUBS', weight: 18, code: '4C' },
      { id: '5-DIAMONDS', rank: 5, suit: 'DIAMONDS', weight: 23, code: '5D' }
    ];

    const combo = wasmIdentifyCombination(cards);
    expect(combo).not.toBeNull();
    expect(combo?.type).toBe('STRAIGHT');
    expect(combo?.length).toBe(3);
    expect(combo?.highestCard.rank).toBe(5);
  });

  it('should validate beat and chop relations via Rust WASM', () => {
    const combo2H = wasmIdentifyCombination([
      { id: '15-HEARTS', rank: 15, suit: 'HEARTS', weight: 64, code: '2H' }
    ]);
    const combo2S = wasmIdentifyCombination([
      { id: '15-SPADES', rank: 15, suit: 'SPADES', weight: 61, code: '2S' }
    ]);

    expect(combo2H).not.toBeNull();
    expect(combo2S).not.toBeNull();
    if (combo2H && combo2S) {
      expect(wasmCanBeat(combo2H, combo2S)).toBe(true);
      expect(wasmCanBeat(combo2S, combo2H)).toBe(false);
    }

    // 4-of-a-kind chops single 2
    const quad = wasmIdentifyCombination([
      { id: '7-SPADES', rank: 7, suit: 'SPADES', weight: 29, code: '7S' },
      { id: '7-CLUBS', rank: 7, suit: 'CLUBS', weight: 30, code: '7C' },
      { id: '7-DIAMONDS', rank: 7, suit: 'DIAMONDS', weight: 31, code: '7D' },
      { id: '7-HEARTS', rank: 7, suit: 'HEARTS', weight: 32, code: '7H' }
    ]);

    expect(quad).not.toBeNull();
    if (quad && combo2H) {
      expect(wasmCanChop(quad, combo2H)).toBe(true);
    }
  });

  it('should start game and partition hands via Rust WASM', () => {
    const players: MatchPlayer[] = [
      {
        id: 'p1',
        name: 'Player 1',
        avatar: 'a1',
        hand: [],
        cardCount: 0,
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        isBot: false
      },
      {
        id: 'p2',
        name: 'Player 2',
        avatar: 'a2',
        hand: [],
        cardCount: 0,
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        isBot: true,
        botPersonaId: 'bot-1'
      }
    ];

    const rules = createDefaultGameRules();
    const state = wasmStartNewGame(players, rules, 1, null);

    expect(state).toBeDefined();
    // Hand sorting test
    const testHand: Card[] = [
      { id: '3-SPADES', rank: 3, suit: 'SPADES', weight: 13, code: '3S' },
      { id: '4-CLUBS', rank: 4, suit: 'CLUBS', weight: 18, code: '4C' },
      { id: '5-DIAMONDS', rank: 5, suit: 'DIAMONDS', weight: 23, code: '5D' },
      { id: '9-HEARTS', rank: 9, suit: 'HEARTS', weight: 40, code: '9H' }
    ];

    const groups = wasmSortSmartGroups(testHand, 0);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.some(g => g.type === 'STRAIGHT')).toBe(true);
  });

  it('should calculate chop penalty via Rust WASM', () => {
    const combo2H = wasmIdentifyCombination([
      { id: '15-HEARTS', rank: 15, suit: 'HEARTS', weight: 64, code: '2H' }
    ]);
    const quad = wasmIdentifyCombination([
      { id: '7-SPADES', rank: 7, suit: 'SPADES', weight: 29, code: '7S' },
      { id: '7-CLUBS', rank: 7, suit: 'CLUBS', weight: 30, code: '7C' },
      { id: '7-DIAMONDS', rank: 7, suit: 'DIAMONDS', weight: 31, code: '7D' },
      { id: '7-HEARTS', rank: 7, suit: 'HEARTS', weight: 32, code: '7H' }
    ]);

    if (combo2H && quad) {
      const penalty = wasmCalculateChopPenalty(combo2H, quad, 1000, 1.0);
      expect(penalty).toBe(2000); // Red two = 2 * bet = 2000
    }
  });
});
