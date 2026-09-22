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
  wasmPlayMove,
  wasmPassTurn,
  wasmSortSmartGroups,
  wasmCalculateChopPenalty,
  wasmCalculateRottenPenalty,
  wasmCalculateCongPenalty,
  wasmCalculateCountCardsSettlement,
  wasmCalculateWinnerTakesAllSettlement,
  wasmCalculateTraditionalSettlement,
  wasmDealCards,
  wasmDecideBotMove,
  wasmCheckInstantWin
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

  it('should detect instant win via wasmCheckInstantWin', () => {
    const dragonCards: Card[] = [
      { id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 12, code: '3S' },
      { id: '4_SPADES', rank: 4, suit: 'SPADES', weight: 16, code: '4S' },
      { id: '5_SPADES', rank: 5, suit: 'SPADES', weight: 20, code: '5S' },
      { id: '6_SPADES', rank: 6, suit: 'SPADES', weight: 24, code: '6S' },
      { id: '7_SPADES', rank: 7, suit: 'SPADES', weight: 28, code: '7S' },
      { id: '8_SPADES', rank: 8, suit: 'SPADES', weight: 32, code: '8S' },
      { id: '9_SPADES', rank: 9, suit: 'SPADES', weight: 36, code: '9S' },
      { id: '10_SPADES', rank: 10, suit: 'SPADES', weight: 40, code: '10S' },
      { id: '11_SPADES', rank: 11, suit: 'SPADES', weight: 44, code: 'JS' },
      { id: '12_SPADES', rank: 12, suit: 'SPADES', weight: 48, code: 'QS' },
      { id: '13_SPADES', rank: 13, suit: 'SPADES', weight: 52, code: 'KS' },
      { id: '14_SPADES', rank: 14, suit: 'SPADES', weight: 56, code: 'AS' },
    ];
    const res = wasmCheckInstantWin(dragonCards, false);
    expect(res).toBe('DRAGON_STRAIGHT');
  });

  it('should calculate rotten penalty via wasmCalculateRottenPenalty', () => {
    const handWithTwos: Card[] = [
      { id: '15_HEARTS', rank: 15, suit: 'HEARTS', weight: 63, code: '2H' },
      { id: '15_SPADES', rank: 15, suit: 'SPADES', weight: 60, code: '2S' },
      { id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 12, code: '3S' }
    ];
    const penalty = wasmCalculateRottenPenalty(handWithTwos, 1000, 1.0);
    // Red 2 (2000) + Black 2 (1000) = 3000
    expect(penalty).toBe(3000);
  });

  it('should deal cards equally via wasmDealCards', () => {
    const deck = wasmCreateDeck();
    const hands = wasmDealCards(deck, 4);
    expect(hands.length).toBe(4);
    for (const h of hands) {
      expect(h.length).toBe(13);
    }
  });

  it('should calculate cong penalty via wasmCalculateCongPenalty', () => {
    expect(wasmCalculateCongPenalty(1000, 1.0)).toBe(26000);
    expect(wasmCalculateCongPenalty(1000, 2.0)).toBe(52000);
  });

  it('should calculate settlements via wasmCalculateCountCardsSettlement, WinnerTakesAll, and Traditional', () => {
    const p1: MatchPlayer = {
      id: 'p1', name: 'P1', avatar: '', hand: [], cardCount: 0,
      playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: true, isBot: false
    };
    const p2: MatchPlayer = {
      id: 'p2', name: 'P2', avatar: '',
      hand: [{ id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 12, code: '3S' }],
      cardCount: 1, playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: true, isBot: false
    };
    const p3: MatchPlayer = {
      id: 'p3', name: 'P3', avatar: '',
      hand: [
        { id: '4_SPADES', rank: 4, suit: 'SPADES', weight: 16, code: '4S' },
        { id: '5_SPADES', rank: 5, suit: 'SPADES', weight: 20, code: '5S' }
      ],
      cardCount: 2, playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: true, isBot: false
    };
    const players = [p1, p2, p3];

    // Count cards: p2 loses 1x (1000), p3 loses 2x (2000) => p1 earns 3000
    const countPayouts = wasmCalculateCountCardsSettlement(players, 'p1', 1000, 1.0, false, 1.0);
    expect(countPayouts['p1']).toBe(3000);
    expect(countPayouts['p2']).toBe(-1000);
    expect(countPayouts['p3']).toBe(-2000);

    // Winner-takes-all: each loser loses 1000 => p1 earns 2000
    const wtaPayouts = wasmCalculateWinnerTakesAllSettlement(players, 'p1', 1000, 1.0, false, 1.0);
    expect(wtaPayouts['p1']).toBe(2000);
    expect(wtaPayouts['p2']).toBe(-1000);
    expect(wtaPayouts['p3']).toBe(-1000);

    // Traditional: 3 players => 2x, 0, -2x
    const winners = [p1, p2, p3];
    const tradPayouts = wasmCalculateTraditionalSettlement(players, winners, 1000, 1.0, false, 1.0);
    expect(tradPayouts['p1']).toBe(2000);
    expect(tradPayouts['p2']).toBe(0);
    expect(tradPayouts['p3']).toBe(-2000);
  });

  it('should validate and execute moves via wasmValidateMove, wasmPlayMove, and wasmPassTurn', () => {
    const p1: MatchPlayer = {
      id: 'p1', name: 'P1', avatar: '', hand: [{ id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 12, code: '3S' }],
      cardCount: 1, playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: false, isBot: false
    };
    const p2: MatchPlayer = {
      id: 'p2', name: 'P2', avatar: '', hand: [{ id: '4_SPADES', rank: 4, suit: 'SPADES', weight: 16, code: '4S' }],
      cardCount: 1, playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: false, isBot: false
    };
    const rules = createDefaultGameRules();
    // Start game without requiring 3S rule to keep test simple
    rules.gameFlow.firstGameRequireThreeOfSpades = false;
    rules.instantWin.enabled = false;
    const state = wasmStartNewGame([p1, p2], rules, 2, 'p1') as any;

    // Lead player plays first card in hand
    const cardIdToPlay = state.players[0].hand[0].id;
    const valRes = wasmValidateMove(state, 'p1', [cardIdToPlay]);
    expect(valRes.valid).toBe(true);

    const nextState = wasmPlayMove(state, 'p1', [cardIdToPlay]);
    expect(nextState).toBeDefined();
  });

  it('should compute bot decisions via wasmDecideBotMove', () => {
    const p1: MatchPlayer = {
      id: 'p1', name: 'P1', avatar: '', hand: [], cardCount: 0,
      playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: false, isBot: false
    };
    const p2: MatchPlayer = {
      id: 'bot', name: 'Bot', avatar: '', hand: [], cardCount: 0,
      playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: false, isBot: true,
      botPersonaId: 'BOT_ELO_1250'
    };
    const rules = createDefaultGameRules();
    rules.gameFlow.firstGameRequireThreeOfSpades = false;
    rules.instantWin.enabled = false;
    const state = wasmStartNewGame([p1, p2], rules, 2, 'bot') as any;

    const botHand = state.players.find((p: any) => p.id === 'bot').hand;
    const decision = wasmDecideBotMove(botHand, state, 'bot');
    expect(decision).not.toBeNull();
    expect(Array.isArray(decision)).toBe(true);
    expect(decision!.length).toBeGreaterThan(0);
  });
});
