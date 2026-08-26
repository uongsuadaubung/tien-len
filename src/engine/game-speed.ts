import { PlayedMove } from './types';

export type GameSpeedMode = 'FAST' | 'REALISTIC' | 'DELIBERATE';

export interface BotThinkingContext {
  isLead: boolean;
  leadingMove: PlayedMove | null;
  botHandLength: number;
  isNextOneCard: boolean;
  hasValidMoves: boolean;
  isFacingHeoOrChop: boolean;
}

export interface BotThinkingDelayResult {
  delayMs: number;
  thoughtText: string;
}

/**
 * Tính toán thời gian suy nghĩ động và biểu cảm tâm lý của Bot
 * - FAST (Siêu Nhanh): 350ms - 600ms (dành cho cày cuốc).
 * - REALISTIC (Chân Thực - Mặc định):
 *   + Không có bài (bỏ lượt): 500ms - 800ms
 *   + Nước thường / theo vòng: 800ms - 1.3s
 *   + Lượt mở đầu (cầm cái): 1.1s - 1.6s
 *   + Căng thẳng (chặn người 1 lá): 2.2s - 2.8s
 *   + Cực kỳ căng thẳng (chặt Heo / chặt Hàng): 2.4s - 3.2s
 * - DELIBERATE (Cân Não): 2.2s - 3.5s cho mọi tình huống.
 */
export function calculateDynamicBotDelay(
  context: BotThinkingContext,
  speedMode: GameSpeedMode = 'REALISTIC'
): BotThinkingDelayResult {
  if (speedMode === 'FAST') {
    return {
      delayMs: 350 + Math.floor(Math.random() * 250),
      thoughtText: '⚡ Đánh nhanh...'
    };
  }

  if (speedMode === 'DELIBERATE') {
    if (!context.hasValidMoves && !context.isLead) {
      return { delayMs: 1200, thoughtText: '❌ Không theo...' };
    }
    return {
      delayMs: 2500 + Math.floor(Math.random() * 800),
      thoughtText: '🧠 Cân não tính toán...'
    };
  }

  // REALISTIC (Chân Thực - Mặc định)
  // 1. Không có bài bắt (Forced Pass): dứt khoát bỏ lượt nhanh
  if (!context.hasValidMoves && !context.isLead) {
    return {
      delayMs: 550 + Math.floor(Math.random() * 250),
      thoughtText: '🙅 Bỏ lượt'
    };
  }

  // 2. Căng thẳng: Đối thủ đánh Heo / Hàng -> Cân nhắc chặt
  if (context.isFacingHeoOrChop) {
    return {
      delayMs: 2400 + Math.floor(Math.random() * 700),
      thoughtText: '🔥 Cân nhắc chặt Heo...'
    };
  }

  // 3. Căng thẳng: Người kế tiếp còn 1 lá -> Cân nhắc chặn đầu
  if (context.isNextOneCard) {
    return {
      delayMs: 2200 + Math.floor(Math.random() * 600),
      thoughtText: '⚠️ Chặn người 1 lá...'
    };
  }

  // 4. Lượt mở đầu (Lead move)
  if (context.isLead) {
    return {
      delayMs: 1100 + Math.floor(Math.random() * 500),
      thoughtText: '🎯 Chọn bài mở đầu...'
    };
  }

  // 5. Nước đi thường
  return {
    delayMs: 900 + Math.floor(Math.random() * 400),
    thoughtText: '🤔 Đang tính nước...'
  };
}
