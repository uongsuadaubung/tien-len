import { describe, expect, test } from 'bun:test';
import { parseCard, parseCards } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import { CardTracker } from '../../src/ai/card-tracker';
import { MctsSolver } from '../../src/ai/mcts-solver';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { createDefaultGameRules } from '../../src/engine/types';

describe('Information Set Monte Carlo Rollout Solver (ISMCTS)', () => {
  test('Chạy mô phỏng Rollout cho danh sách nước đi ứng viên và trả về Win Rate', () => {
    const botHand = parseCards('3S 4S 5S 2H');
    const tracker = new CardTracker(botHand, 1.0);

    const candidateMoves = [
      {
        cards: parseCards('3S 4S 5S'),
        combination: identifyCombination(parseCards('3S 4S 5S'))!,
        isChop: false
      },
      {
        cards: parseCards('3S'),
        combination: identifyCombination(parseCards('3S'))!,
        isChop: false
      },
      {
        cards: parseCards('2H'),
        combination: identifyCombination(parseCards('2H'))!,
        isChop: false
      }
    ];

    const evaluations = MctsSolver.evaluateCandidateMoves(
      'p1',
      botHand,
      candidateMoves,
      tracker,
      { p0: 5, p2: 5, p3: 5 },
      20
    );

    expect(evaluations.length).toBe(3);
    for (const ev of evaluations) {
      expect(ev.winRate).toBeGreaterThanOrEqual(0);
      expect(ev.winRate).toBeLessThanOrEqual(1);
      expect(ev.simulationsCount).toBe(20);
    }
  });

  test('Bot Cô Sáu (God Mode AI) đưa ra quyết định dựa trên MCTS & Tempo Control mượt mà', () => {
    const hand = parseCards('3S 4D 5C 6H 7D 2H');
    const tracker = new CardTracker(hand, 1.0);
    const config = BOT_PERSONAS.BOT_ELO_2300;

    const decision = makeBotDecision({
      hand,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker,
      config,
      remainingPlayerCards: { p0: 6, p2: 6, p3: 6 },
      nextPlayerId: 'p2',
      rules: createDefaultGameRules(),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: true,
      gameMode: 'TRADITIONAL'
    });

    expect(decision.type).toBe('PLAY');
    expect(decision.cards).toBeDefined();
    expect(decision.cards!.length).toBeGreaterThan(0);
  });
});
