import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { getTierFromElo } from '../../src/engine/ecosystem/ecosystem-types';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { GameEngine } from '../../src/engine/game';
import { MatchPlayer, createDefaultGameRules } from '../../src/engine/types';
import { createBotPlayer } from '../../src/engine/player-factory';
import { parseCards } from '../../src/engine/card';
import { wasmSimulateMatchSeries } from '../../src/engine/wasm-bridge';

describe('AI Bot Benchmark Simulation & Latency Across 9 Tiers', () => {
  test('Mô phỏng 100 ván đấu công bằng với Luân Chuyển Vị Trí Ghế Ngồi (Rotated Seating Fairness)', () => {
    const bots = [
      { id: 'b1', name: 'Alex (Tier 1 Sắt - 700)', avatar: '🤠', elo: 700 },
      { id: 'b2', name: 'Rex (Tier 3 Bạc - 1250)', avatar: '🧔', elo: 1250 },
      { id: 'b3', name: 'Nova (Tier 6 Kim Cương - 2300)', avatar: '👑', elo: 2300 },
      { id: 'b4', name: 'Alpha Mind (Tier 9 Thách Đấu - 3200)', avatar: '🧠', elo: 3200 }
    ];

    const NUM_GAMES = 100;
    const start = performance.now();
    const result = wasmSimulateMatchSeries(NUM_GAMES, 12345, null, bots, true);
    const duration = performance.now() - start;

    console.log('\n=========================================');
    console.log(`--- KẾT QUẢ BENCHMARK CÔNG BẰNG 9 BẬC (${NUM_GAMES} VÁN ROTATED SEATS QUA RUST WASM) ---`);
    for (const b of bots) {
      const count = result.winCounts[b.id] || 0;
      console.log(`${b.avatar} ${b.name}: ${count} ván thắng (${((count / NUM_GAMES) * 100).toFixed(1)}%)`);
    }
    console.log(`⚡ Tổng thời gian chạy 100 ván trong Rust WASM: ${duration.toFixed(2)} ms`);
    console.log('=========================================\n');

    expect((result.winCounts['b4'] || 0) + (result.winCounts['b3'] || 0)).toBeGreaterThanOrEqual(result.winCounts['b1'] || 0);
  }, 60000);

  test('Benchmark Độ Trễ Ra Quyết Định Toàn Bộ 9 Bậc Rank (Zero UI Freezing Benchmark)', () => {
    const testBots = [
      BOT_PERSONAS.BOT_ELO_700,  // Tier 1: Tân Thủ
      BOT_PERSONAS.BOT_ELO_950,  // Tier 2: Tập Sự
      BOT_PERSONAS.BOT_ELO_1250, // Tier 3: Phong Trào
      BOT_PERSONAS.BOT_ELO_1550, // Tier 4: Lão Luyện
      BOT_PERSONAS.BOT_ELO_1750, // Tier 5: Tinh Anh
      BOT_PERSONAS.BOT_ELO_1950, // Tier 6: Cao Thủ
      BOT_PERSONAS.BOT_ELO_2300, // Tier 7: Đại Cao Thủ
      BOT_PERSONAS.BOT_ELO_2750, // Tier 8: Thần Bài (Minimax + Bayesian)
      BOT_PERSONAS.BOT_ELO_3200  // Tier 9: Siêu Trí Tuệ Boss (Alpha Mind Superhuman)
    ];

    console.log('\n================================================================');
    console.log('--- BENCHMARK ĐỘ TRỄ TÍNH TOÁN 9 BẬC RANK (ZERO UI FREEZE) ---');

    for (const bot of testBots) {
      const hand = parseCards('3S 4C 5S 7H 8D 9C 10H JD QH KD AH 2H');
      const tracker = new CardTracker(hand, bot.memoryDepth);
      const start = performance.now();
      const ITERATIONS = 10;

      for (let i = 0; i < ITERATIONS; i++) {
        makeBotDecision({
          hand,
          currentRoundLeadingMove: null,
          isFirstMoveOfGame: false,
          isLeadMove: true,
          tracker,
          config: bot,
          remainingPlayerCards: { p0: 10, p2: 10, p3: 10 },
          nextPlayerId: 'p2',
          rules: createDefaultGameRules(),
          hasPlayedFirstCard: true,
          isNextPlayerOneCard: false,
          prohibitEndingWithTwo: false,
          gameMode: 'TRADITIONAL',
          mctsMap: null,
          compositeRuleStrategy: null,
          opponentProfiles: null
        });
      }

      const totalTime = performance.now() - start;
      const avgLatencyMs = totalTime / ITERATIONS;

      console.log(`[Tier ${getTierFromElo(bot.elo).label}] ${bot.name} (Elo ${bot.elo}): ${avgLatencyMs.toFixed(2)} ms/nước đi`);

      // Độ trễ ra quyết định phải < 100ms cho mọi bậc rank để không gây lag giao diện (đảm bảo ổn định khi test song song)
      expect(avgLatencyMs).toBeLessThan(100);
    }
    console.log('================================================================\n');
  });

  test('Mô phỏng 100 ván đấu siêu tốc bằng Rust WASM Native (Sub-second High-Performance Engine)', () => {
    const bots = [
      { id: 'b1', name: 'Alex (Tier 1 Sắt - 700)', avatar: '🤠', elo: 700 },
      { id: 'b2', name: 'Rex (Tier 3 Bạc - 1250)', avatar: '🧔', elo: 1250 },
      { id: 'b3', name: 'Nova (Tier 6 Kim Cương - 2300)', avatar: '👑', elo: 2300 },
      { id: 'b4', name: 'Alpha Mind (Tier 9 Thách Đấu - 3200)', avatar: '🧠', elo: 3200 }
    ];

    const start = performance.now();
    const result = wasmSimulateMatchSeries(100, 12345, null, bots, true);
    const duration = performance.now() - start;

    console.log('\n================================================================');
    console.log(`--- KẾT QUẢ MÔ PHỎNG RUST WASM NATIVE (100 VÁN CHỈ MẤT ${duration.toFixed(2)}ms) ---`);
    for (const b of bots) {
      const count = result.winCounts[b.id] || 0;
      console.log(`${b.avatar} ${b.name}: ${count} ván thắng (${((count / 100) * 100).toFixed(1)}%)`);
    }
    console.log(`Tổng lượt đánh: ${result.totalTurns} lượt | Tới trắng: ${result.instantWins} ván`);
    console.log('================================================================\n');

    expect(result.numGames).toBe(100);
    expect(result.totalTurns).toBeGreaterThan(1000);
    // 100 ván trong Rust WASM phải hoàn tất dưới 1.5 giây (< 1500ms)
    expect(duration).toBeLessThan(1500);
  });
});

