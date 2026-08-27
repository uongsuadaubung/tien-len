import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { GameEngine } from '../../src/engine/game';
import { BotConfig } from '../../src/ai/types';
import { Player } from '../../src/engine/types';
import { createBotPlayer } from '../../src/engine/player-factory';

/**
 * Hàm mô phỏng N ván đấu giữa các Bot được chỉ định với bộ bài chia hoàn toàn ngẫu nhiên
 */
function simulateMatchup(
  botConfigs: { id: string; name: string; config: BotConfig }[],
  numGames: number,
  baseSeed = 20260825
): { winCounts: Record<string, number>; remainingCardsAvg: Record<string, number> } {
  const winCounts: Record<string, number> = {};
  const totalCardsLeft: Record<string, number> = {};

  for (const b of botConfigs) {
    winCounts[b.id] = 0;
    totalCardsLeft[b.id] = 0;
  }

  const players: Player[] = botConfigs.map(b =>
    createBotPlayer(b.id, b.config.id || null, {
      name: b.name,
      avatar: b.config.avatar || '🤖',
      score: 0
    })
  );

  const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100 });

  for (let g = 1; g <= numGames; g++) {
    const initRes = game.startNewGame(g, undefined, baseSeed + g * 1013);

    if (initRes.instantWin && initRes.instantWinner) {
      winCounts[initRes.instantWinner.id]++;
      continue;
    }

    const trackers: Record<string, CardTracker> = {};
    for (const b of botConfigs) {
      const p = game.getPlayer(b.id)!;
      trackers[b.id] = new CardTracker(p.hand, b.config.memoryDepth);
    }

    let loopCount = 0;
    const MAX_LOOPS = 400;

    while (!game.isGameOver && loopCount < MAX_LOOPS) {
      loopCount++;
      const currentTurnPlayer = game.getCurrentPlayer();
      const botObj = botConfigs.find(b => b.id === currentTurnPlayer.id)!;
      const tracker = trackers[currentTurnPlayer.id];

      const result = game.executeBotTurn(botObj.config, tracker);

      if (result.action === 'PLAY' && result.playedMove) {
        for (const t of Object.values(trackers)) {
          t.recordMove(result.playedMove);
        }
      } else {
        const leading = game.getLeadingMove();
        if (leading) {
          for (const t of Object.values(trackers)) {
            t.recordPassWithDetails(currentTurnPlayer.id, leading.combination);
          }
        }
      }
    }

    if (game.winners.length > 0) {
      winCounts[game.winners[0].id]++;
    }

    for (const p of game.players) {
      totalCardsLeft[p.id] += p.hand.length;
    }
  }

  const remainingCardsAvg: Record<string, number> = {};
  for (const b of botConfigs) {
    remainingCardsAvg[b.id] = totalCardsLeft[b.id] / numGames;
  }

  return { winCounts, remainingCardsAvg };
}

describe('AI 9-Tier Elo Matchup Tests (Kiểm Thử Toàn Tuyến 9 Bậc Rank Esports Không Nhảy Cóc)', () => {
  test('1. Bàn Đấu 4 Người Tầng Dưới: Tier 1 vs Tier 2 vs Tier 3 vs Tier 4 (40 ván)', () => {
    const NUM_GAMES = 40;
    const botConfigs = [
      { id: 't1', name: 'Tí Chuột (Tier 1: Tân Thủ - 700)', config: BOT_PERSONAS.BOT_ELO_700 },
      { id: 't2', name: 'Bảy Xe Lôi (Tier 2: Tập Sự - 950)', config: BOT_PERSONAS.BOT_ELO_950 },
      { id: 't3', name: 'Chú Tư Cờ (Tier 3: Phong Trào - 1250)', config: BOT_PERSONAS.BOT_ELO_1250 },
      { id: 't4', name: 'Elena (Tier 4: Lão Luyện - 1550)', config: BOT_PERSONAS.BOT_ELO_1550 }
    ];

    const { winCounts, remainingCardsAvg } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- KẾT QUẢ TẦNG DƯỚI (TIER 1 -> TIER 4) ---`);
    for (const b of botConfigs) {
      const wins = winCounts[b.id];
      const winPct = ((wins / NUM_GAMES) * 100).toFixed(1);
      console.log(`${b.name}: ${wins} ván (${winPct}%) | Lá tồn TB: ${remainingCardsAvg[b.id].toFixed(2)}`);
    }
    console.log('======================================================\n');

    expect(winCounts['t1'] + winCounts['t2'] + winCounts['t3'] + winCounts['t4']).toBe(NUM_GAMES);
  });

  test('2. Bàn Đấu 4 Người Tầng Giữa: Tier 4 vs Tier 5 vs Tier 6 vs Tier 7 (40 ván)', () => {
    const NUM_GAMES = 40;
    const botConfigs = [
      { id: 't4', name: 'Elena (Tier 4: Lão Luyện - 1550)', config: BOT_PERSONAS.BOT_ELO_1550 },
      { id: 't5', name: 'Thiếu Gia Ken (Tier 5: Tinh Anh - 1750)', config: BOT_PERSONAS.BOT_ELO_1750 },
      { id: 't6', name: 'Raven Ảo Ảnh (Tier 6: Cao Thủ - 1950)', config: BOT_PERSONAS.BOT_ELO_1950 },
      { id: 't7', name: 'Nova Legend (Tier 7: Đại Cao Thủ - 2300)', config: BOT_PERSONAS.BOT_ELO_2300 }
    ];

    const { winCounts, remainingCardsAvg } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- KẾT QUẢ TẦNG GIỮA (TIER 4 -> TIER 7) ---`);
    for (const b of botConfigs) {
      const wins = winCounts[b.id];
      const winPct = ((wins / NUM_GAMES) * 100).toFixed(1);
      console.log(`${b.name}: ${wins} ván (${winPct}%) | Lá tồn TB: ${remainingCardsAvg[b.id].toFixed(2)}`);
    }
    console.log('======================================================\n');

    expect(winCounts['t4'] + winCounts['t5'] + winCounts['t6'] + winCounts['t7']).toBe(NUM_GAMES);
  }, 30000);

  test('3. Bàn Đấu 4 Người Tầng Đỉnh Cao: Tier 6 vs Tier 7 vs Tier 8 vs Tier 9 (40 ván)', () => {
    const NUM_GAMES = 40;
    const botConfigs = [
      { id: 't6', name: 'Ghost Bóng Đêm (Tier 6: Cao Thủ - 2050)', config: BOT_PERSONAS.BOT_ELO_2050 },
      { id: 't7', name: 'Alpha-TL Master (Tier 7: Đại Cao Thủ - 2500)', config: BOT_PERSONAS.BOT_ELO_2500 },
      { id: 't8', name: 'Oracle Tiên Tri (Tier 8: Thần Bài - 2750)', config: BOT_PERSONAS.BOT_ELO_2750 },
      { id: 't9', name: 'Alpha Mind (Tier 9: Siêu Trí Tuệ - 3200)', config: BOT_PERSONAS.BOT_ELO_3200 }
    ];

    const { winCounts, remainingCardsAvg } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- KẾT QUẢ TẦNG ĐỈNH CAO (TIER 6 -> TIER 9) ---`);
    for (const b of botConfigs) {
      const wins = winCounts[b.id];
      const winPct = ((wins / NUM_GAMES) * 100).toFixed(1);
      console.log(`${b.name}: ${wins} ván (${winPct}%) | Lá tồn TB: ${remainingCardsAvg[b.id].toFixed(2)}`);
    }
    console.log('======================================================\n');

    expect(winCounts['t6'] + winCounts['t7'] + winCounts['t8'] + winCounts['t9']).toBe(NUM_GAMES);
  }, 30000);

  test('4. Boss Raid: 1 Siêu Trí Tuệ Boss (Tier 9 Elo 3200) vs 3 Tân Thủ (Tier 1)', () => {
    const NUM_GAMES = 50;
    const botConfigs = [
      { id: 'boss', name: 'Alpha Mind (Tier 9 Boss - Elo 3200)', config: BOT_PERSONAS.BOT_ELO_3200 },
      { id: 'novice1', name: 'Alex (Tier 1 - Elo 700)', config: BOT_PERSONAS.BOT_ELO_700 },
      { id: 'novice2', name: 'Leo (Tier 1 - Elo 750)', config: BOT_PERSONAS.BOT_ELO_750 },
      { id: 'novice3', name: 'Dan (Tier 2 - Elo 950)', config: BOT_PERSONAS.BOT_ELO_950 }
    ];

    const { winCounts, remainingCardsAvg } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- KẾT QUẢ 1 SIÊU TRÍ TUỆ BOSS VS 3 TÂN THỦ (${NUM_GAMES} VÁN) ---`);
    for (const b of botConfigs) {
      const wins = winCounts[b.id];
      const winPct = ((wins / NUM_GAMES) * 100).toFixed(1);
      console.log(`${b.name}: ${wins} ván (${winPct}%) | Lá tồn TB: ${remainingCardsAvg[b.id].toFixed(2)}`);
    }
    console.log('======================================================\n');

    expect(winCounts['boss']).toBeGreaterThanOrEqual(8);
  }, 30000);

  test('5. Chuỗi Đấu Tay Đôi 1v1 Toàn Tuyến: Thần Bài (Tier 8) vs Siêu Trí Tuệ (Tier 9) & Tập Sự (Tier 2) vs Boss (Tier 9)', () => {
    const NUM_GAMES = 40;

    // Trận 1: Tier 8 vs Tier 9
    const match1Configs = [
      { id: 't8', name: 'Oracle (Tier 8 Thần Bài - 2750)', config: BOT_PERSONAS.BOT_ELO_2750 },
      { id: 't9', name: 'Alpha Mind (Tier 9 Boss - 3200)', config: BOT_PERSONAS.BOT_ELO_3200 }
    ];
    const res1 = simulateMatchup(match1Configs, NUM_GAMES, 12345);

    // Trận 2: Tier 2 vs Tier 9
    const match2Configs = [
      { id: 't2', name: 'Mia (Tier 2 Tập Sự - 950)', config: BOT_PERSONAS.BOT_ELO_950 },
      { id: 't9', name: 'Alpha Mind (Tier 9 Boss - 3200)', config: BOT_PERSONAS.BOT_ELO_3200 }
    ];
    const res2 = simulateMatchup(match2Configs, NUM_GAMES, 67890);

    console.log('\n======================================================');
    console.log(`--- 1V1 SOLO: TIER 8 (${res1.winCounts['t8']} ván) VS TIER 9 (${res1.winCounts['t9']} ván) ---`);
    console.log(`--- 1V1 SOLO: TIER 2 (${res2.winCounts['t2']} ván) VS TIER 9 (${res2.winCounts['t9']} ván) ---`);
    console.log('======================================================\n');

    expect(res1.winCounts['t8'] + res1.winCounts['t9']).toBe(NUM_GAMES);
    expect(res2.winCounts['t2'] + res2.winCounts['t9']).toBe(NUM_GAMES);
  }, 30000);
});
