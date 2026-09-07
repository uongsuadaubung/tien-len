import { describe, it, expect } from 'bun:test';
import { createCard } from '../../src/engine/card';
import { CardTracker } from '../../src/ai/card-tracker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { createDecisionContext } from '../../src/ai/decision-types';
import { TableScaleRuleStrategy, CountCardsSettlementStrategy } from '../../src/ai/rule-strategies';
import { createDefaultGameRules } from '../../src/engine/types';

describe('Table Scale Balance (2P, 3P & 4P)', () => {
  it('should return correct responding modifiers based on table playerCount', () => {
    const table2P = new TableScaleRuleStrategy({ playerCount: 2, betAmount: 100, soundEnabled: true });
    const table3P = new TableScaleRuleStrategy({ playerCount: 3, betAmount: 100, soundEnabled: true });
    const table4P = new TableScaleRuleStrategy({ playerCount: 4, betAmount: 100, soundEnabled: true });

    const dummyMove = { cards: [], combination: {} as any, isChop: false };
    const dummyContext = { antiLeaderAggression: 1.0 } as any;

    expect(table2P.getRespondingScoreModifier(dummyMove, 5, null, dummyContext)).toBe(90);
    expect(table3P.getRespondingScoreModifier(dummyMove, 5, null, dummyContext)).toBe(30);
    expect(table4P.getRespondingScoreModifier(dummyMove, 5, null, dummyContext)).toBe(0);

    const lead2P = table2P.contributeLeadPolicy({});
    expect(lead2P.aggressiveFinisherPush).toBe(true);
  });

  it('should not waste a Two on a small single in 1v1 when hand is large (> 5 cards)', () => {
    // Bot has 9 cards: [8S, 9S, 10S, JS, QS, KH, 2H, 3C, 4C]
    // Opponent plays single 5D. Bot should NOT burn 2H to beat 5D!
    const hand = [
      createCard(8, 'SPADES'),
      createCard(9, 'SPADES'),
      createCard(10, 'SPADES'),
      createCard(11, 'SPADES'),
      createCard(12, 'SPADES'),
      createCard(13, 'HEARTS'),
      createCard(15, 'HEARTS'), // 2 of Hearts
      createCard(3, 'CLUBS'),
      createCard(4, 'CLUBS')
    ];

    const tracker = new CardTracker(hand, 1.0, 2);
    const opponentCard = createCard(5, 'DIAMONDS');

    const context = createDecisionContext({
      hand,
      isFirstMoveOfGame: false,
      isLeadMove: false,
      currentRoundLeadingMove: {
        playerId: 'opp',
        combination: {
          type: 'SINGLE',
          cards: [opponentCard],
          highestCard: opponentCard,
          length: 1
        },
        isChop: false,
        timestamp: Date.now()
      },
      tracker,
      config: BOT_PERSONAS.BOT_ELO_2500,
      remainingPlayerCards: { bot_id: hand.length, opp: 9 },
      nextPlayerId: 'opp',
      rules: createDefaultGameRules({ table: { playerCount: 2, betAmount: 100, soundEnabled: true } }),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: true,
      gameMode: 'COUNT_CARDS',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    });

    const decision = makeBotDecision(context);

    // Bot can either play a non-Two card (like 8S or KH) or pass, but MUST NOT play 2H!
    if (decision.type === 'PLAY') {
      expect(decision.cards[0].rank).not.toBe(15);
    }
  });

  it('should not trigger BAITING_TRAP if no unseen Twos remain in 1v1', () => {
    // Hand has 4-of-a-kind 9s (Bomb) and single Ace of Hearts (AH), plus trashes
    const hand = [
      createCard(9, 'SPADES'),
      createCard(9, 'CLUBS'),
      createCard(9, 'DIAMONDS'),
      createCard(9, 'HEARTS'),
      createCard(14, 'HEARTS'), // AH
      createCard(4, 'SPADES'),
      createCard(5, 'CLUBS')
    ];

    const tracker = new CardTracker(hand, 1.0, 2);
    // Simulate that all 4 Twos have already been played!
    tracker.recordMove({
      playerId: 'opp',
      combination: {
        type: 'FOUR_OF_A_KIND',
        cards: [createCard(15, 'SPADES'), createCard(15, 'CLUBS'), createCard(15, 'DIAMONDS'), createCard(15, 'HEARTS')],
        highestCard: createCard(15, 'HEARTS'),
        length: 4
      },
      isChop: false,
      timestamp: Date.now()
    });

    const context = createDecisionContext({
      hand,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config: BOT_PERSONAS.BOT_ELO_2500,
      remainingPlayerCards: { bot_id: hand.length, opp: 7 },
      nextPlayerId: 'opp',
      rules: createDefaultGameRules({ table: { playerCount: 2, betAmount: 100, soundEnabled: true } }),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: true,
      gameMode: 'COUNT_CARDS',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    });

    const decision = makeBotDecision(context);
    expect(decision.type).toBe('PLAY');
    // Must NOT be BAITING_TRAP because there are 0 unseen Twos!
    expect(decision.strategyUsed).not.toBe('BAITING_TRAP');
  });

  it('should dump Two in Count Cards when an opponent has <= 6 cards left', () => {
    const strategy = new CountCardsSettlementStrategy();
    const twoMove = {
      cards: [createCard(15, 'HEARTS')],
      combination: {
        type: 'SINGLE' as const,
        cards: [createCard(15, 'HEARTS')],
        highestCard: createCard(15, 'HEARTS'),
        length: 1
      },
      isChop: false
    };

    // Case 1: Opponent has 3 cards left, bot has 8 cards
    const contextWithNearFinisher = {
      remainingPlayerCards: { bot: 8, opp1: 3, opp2: 9, opp3: 10 }
    } as any;

    const bonus = strategy.getRespondingScoreModifier(twoMove, 8, null, contextWithNearFinisher);
    // Should get +80 anti-thối-heo bonus!
    expect(bonus).toBeGreaterThanOrEqual(80);
  });
});
