import { describe, test, expect } from 'bun:test';
import { BotThinkingPhaseStateMachine } from '../../src/ai/thinking-phases/phase-state-machine';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { CardTracker } from '../../src/ai/card-tracker';
import { getBotConfig } from '../../src/ai/bot-factory';
import { createCard } from '../../src/engine/card';
import { createDefaultGameRules } from '../../src/engine/types';
import type { DecisionContext } from '../../src/ai/decision-types';

describe('BotThinkingPhaseStateMachine & Bot Thinking Phases FSM (Kiểm Thử State Pattern Nhận Thức Bot AI)', () => {
  const rules = createDefaultGameRules();
  const config = getBotConfig('BOT_ELO_1150');

  function createBaseContext(cardsCount: number = 10): DecisionContext {
    const cards = [
      createCard(3, 'SPADES'),
      createCard(3, 'HEARTS'),
      createCard(4, 'CLUBS'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'SPADES'),
      createCard(7, 'HEARTS'),
      createCard(8, 'CLUBS'),
      createCard(9, 'DIAMONDS'),
      createCard(10, 'SPADES'),
      createCard(11, 'HEARTS'),
      createCard(12, 'CLUBS'),
      createCard(13, 'DIAMONDS'),
      createCard(15, 'SPADES')
    ].slice(0, cardsCount);

    return {
      hand: cards,
      currentRoundLeadingMove: null,
      isFirstMoveOfGame: false,
      isLeadMove: true,
      tracker: new CardTracker(),
      config,
      remainingPlayerCards: { p0: 13, p1: 13, p2: 13, p3: 13 },
      nextPlayerId: 'p1',
      rules,
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: false,
      gameMode: 'COUNT_CARDS',
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    };
  }

  test('1. Nhận diện trạng thái OPENING (Khai Cuộc) khi bài còn > 8 lá', () => {
    const fsm = new BotThinkingPhaseStateMachine();
    const context = createBaseContext(10);

    const state = fsm.transitionToPhase(context);
    expect(state.phase).toBe('OPENING');
    expect(fsm.currentPhase).toBe('OPENING');
  });

  test('2. Nhận diện trạng thái MID_GAME (Trung Cuộc) khi bài còn 4-8 lá', () => {
    const fsm = new BotThinkingPhaseStateMachine();
    const context = createBaseContext(6);

    const state = fsm.transitionToPhase(context);
    expect(state.phase).toBe('MID_GAME');
    expect(fsm.currentPhase).toBe('MID_GAME');
  });

  test('3. Nhận diện trạng thái END_GAME (Cờ Tàn) khi bài còn <= 3 lá', () => {
    const fsm = new BotThinkingPhaseStateMachine();
    const context = createBaseContext(3);

    const state = fsm.transitionToPhase(context);
    expect(state.phase).toBe('END_GAME');
    expect(fsm.currentPhase).toBe('END_GAME');
  });

  test('4. Nhận diện trạng thái END_GAME (Cờ Tàn) khi có đối thủ sắp về (còn <= 2 lá)', () => {
    const fsm = new BotThinkingPhaseStateMachine();
    const context = createBaseContext(7);
    context.remainingPlayerCards = { p0: 2, p1: 7, p2: 10, p3: 8 };

    const state = fsm.transitionToPhase(context);
    expect(state.phase).toBe('END_GAME');
    expect(fsm.currentPhase).toBe('END_GAME');
  });

  test('5. Nhận diện trạng thái EMERGENCY_RESCUE khi chưa ra bài và đối thủ sắp hết bài (Nguy cơ Cóng)', () => {
    const fsm = new BotThinkingPhaseStateMachine();
    const context = createBaseContext(13);
    context.hasPlayedFirstCard = false;
    context.remainingPlayerCards = { p0: 1, p1: 13, p2: 10, p3: 8 };

    const state = fsm.transitionToPhase(context);
    expect(state.phase).toBe('EMERGENCY_RESCUE');
    expect(fsm.currentPhase).toBe('EMERGENCY_RESCUE');
  });

  test('6. Nhận diện trạng thái EMERGENCY_RESCUE khi người kế tiếp còn 1 lá và đang Lead (Chống Đền Bài)', () => {
    const fsm = new BotThinkingPhaseStateMachine();
    const context = createBaseContext(5);
    context.isNextPlayerOneCard = true;
    context.isLeadMove = true;

    const state = fsm.transitionToPhase(context);
    expect(state.phase).toBe('EMERGENCY_RESCUE');
    expect(fsm.currentPhase).toBe('EMERGENCY_RESCUE');
  });

  test('7. makeBotDecision tích hợp thinkingPhase vào telemetry', () => {
    const context = createBaseContext(11);
    const decision = makeBotDecision(context);

    expect(decision.type).toBe('PLAY');
    expect(decision.telemetry).not.toBeNull();
    expect(decision.telemetry?.thinkingPhase).toBe('OPENING');

    // Type Narrowing: Khi decision.type === 'PLAY', cards và combination đảm bảo không null
    if (decision.type === 'PLAY') {
      expect(decision.cards.length).toBeGreaterThan(0);
      expect(decision.combination).toBeDefined();
      expect(decision.combination.type).toBeDefined();
    }
  });
});
