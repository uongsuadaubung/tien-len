import { describe, test, expect } from 'bun:test';
import { GameEventBus } from '../../src/engine/events/game-event-bus';
import { AudioEventObserver, initAudioEventObserver } from '../../src/ui/audio/audio-event-observer';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';

describe('AudioEventObserver & GameEventBus (Observer Pattern Decoupling Engine Khỏi Audio)', () => {
  test('1. Khởi tạo và đăng ký observer thành công', () => {
    const observer = AudioEventObserver.getInstance();
    expect(observer.active).toBe(false);

    const cleanup = initAudioEventObserver();
    expect(observer.active).toBe(true);

    cleanup();
    expect(observer.active).toBe(false);
  });

  test('2. Lắng nghe và xử lý các sự kiện CARD_PLAYED, CHOP_EXECUTED, TURN_PASSED từ EventBus', () => {
    const bus = GameEventBus.getInstance();
    const cleanup = initAudioEventObserver();

    const card = createCard(3, 'SPADES');
    const combo = identifyCombination([card])!;

    let receivedCardPlayed = false;
    let receivedChop = false;
    let receivedTurnPassed = false;

    bus.subscribe('CARD_PLAYED', () => {
      receivedCardPlayed = true;
    });

    bus.subscribe('CHOP_EXECUTED', () => {
      receivedChop = true;
    });

    bus.subscribe('TURN_PASSED', () => {
      receivedTurnPassed = true;
    });

    bus.emit({
      type: 'CARD_PLAYED',
      playerId: 'p0',
      cards: [card],
      combination: combo,
      remainingCardsCount: 12
    });

    bus.emit({
      type: 'CHOP_EXECUTED',
      chopperPlayerId: 'p0',
      victimPlayerId: 'p1',
      penaltyAmount: 2000,
      choppingCards: [card],
      isCascadeChop: false,
      chopChainCount: 1
    });

    bus.emit({
      type: 'TURN_PASSED',
      playerId: 'p1'
    });

    expect(receivedCardPlayed).toBe(true);
    expect(receivedChop).toBe(true);
    expect(receivedTurnPassed).toBe(true);

    cleanup();
  });
});
