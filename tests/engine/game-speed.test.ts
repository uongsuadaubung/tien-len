import { describe, expect, test } from 'bun:test';
import { calculateDynamicBotDelay, GameSpeedMode, BotThinkingContext } from '../../src/engine/game-speed';
import { parseCard, parseCards } from '../../src/engine/card';
import { PlayedMove } from '../../src/engine/types';

describe('Game Speed & Dynamic Bot Thinking Timing (Giả lập thời gian suy nghĩ động)', () => {
  const normalMove: PlayedMove = {
    playerId: 'p0',
    combination: {
      type: 'SINGLE',
      cards: parseCards('9S'),
      highestCard: parseCard('9S')!,
      length: 1
    },
    timestamp: Date.now(),
    isChop: false
  };

  const heoMove: PlayedMove = {
    playerId: 'p0',
    combination: {
      type: 'SINGLE',
      cards: parseCards('2H'),
      highestCard: parseCard('2H')!,
      length: 1
    },
    timestamp: Date.now(),
    isChop: false
  };

  test('1. Chế độ FAST (Siêu Nhanh): Mọi lượt đều đi siêu tốc (350ms - 600ms)', () => {
    const context: BotThinkingContext = {
      isLead: false,
      leadingMove: normalMove,
      botHandLength: 10,
      isNextOneCard: false,
      hasValidMoves: true,
      isFacingHeoOrChop: false
    };

    const result = calculateDynamicBotDelay(context, 'FAST');
    expect(result.delayMs).toBeGreaterThanOrEqual(350);
    expect(result.delayMs).toBeLessThanOrEqual(600);
    expect(result.thoughtText).toContain('⚡');
  });

  test('2. Chế độ DELIBERATE (Cân Não): Suy nghĩ lâu và đắn đo (2.5s - 3.5s)', () => {
    const context: BotThinkingContext = {
      isLead: true,
      leadingMove: null,
      botHandLength: 8,
      isNextOneCard: false,
      hasValidMoves: true,
      isFacingHeoOrChop: false
    };

    const result = calculateDynamicBotDelay(context, 'DELIBERATE');
    expect(result.delayMs).toBeGreaterThanOrEqual(2500);
    expect(result.delayMs).toBeLessThanOrEqual(3300);
    expect(result.thoughtText).toBe('🤔 Đang suy nghĩ...');
  });

  test('3. Chế độ REALISTIC (Chân Thực): Bỏ lượt dứt khoát nhanh chóng (550ms - 800ms)', () => {
    const context: BotThinkingContext = {
      isLead: false,
      leadingMove: normalMove,
      botHandLength: 10,
      isNextOneCard: false,
      hasValidMoves: false, // Bị kẹt không có bài bắt
      isFacingHeoOrChop: false
    };

    const result = calculateDynamicBotDelay(context, 'REALISTIC');
    expect(result.delayMs).toBeGreaterThanOrEqual(550);
    expect(result.delayMs).toBeLessThanOrEqual(800);
    expect(result.thoughtText).toBe('🤔 Đang suy nghĩ...');
  });

  test('4. Chế độ REALISTIC (Chân Thực): Cực kỳ căng thẳng khi gặp Heo/Hàng (2.4s - 3.1s)', () => {
    const context: BotThinkingContext = {
      isLead: false,
      leadingMove: heoMove,
      botHandLength: 6,
      isNextOneCard: false,
      hasValidMoves: true,
      isFacingHeoOrChop: true // Đang đối mặt với Heo
    };

    const result = calculateDynamicBotDelay(context, 'REALISTIC');
    expect(result.delayMs).toBeGreaterThanOrEqual(2400);
    expect(result.delayMs).toBeLessThanOrEqual(3100);
    expect(result.thoughtText).toBe('🤔 Đang suy nghĩ...');
  });

  test('5. Chế độ REALISTIC (Chân Thực): Cân não chặn đầu khi người kế bên còn 1 lá (2.2s - 2.8s)', () => {
    const context: BotThinkingContext = {
      isLead: false,
      leadingMove: normalMove,
      botHandLength: 5,
      isNextOneCard: true, // Người kế bên còn đúng 1 lá
      hasValidMoves: true,
      isFacingHeoOrChop: false
    };

    const result = calculateDynamicBotDelay(context, 'REALISTIC');
    expect(result.delayMs).toBeGreaterThanOrEqual(2200);
    expect(result.delayMs).toBeLessThanOrEqual(2800);
    expect(result.thoughtText).toBe('🤔 Đang suy nghĩ...');
  });

  test('6. Chế độ REALISTIC (Chân Thực): Lượt mở màn ván / cầm cái (1.1s - 1.6s)', () => {
    const context: BotThinkingContext = {
      isLead: true,
      leadingMove: null,
      botHandLength: 13,
      isNextOneCard: false,
      hasValidMoves: true,
      isFacingHeoOrChop: false
    };

    const result = calculateDynamicBotDelay(context, 'REALISTIC');
    expect(result.delayMs).toBeGreaterThanOrEqual(1100);
    expect(result.delayMs).toBeLessThanOrEqual(1600);
    expect(result.thoughtText).toBe('🤔 Đang suy nghĩ...');
  });
});
