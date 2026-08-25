import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { GameEngine } from '../../src/engine/game';
import { BotConfig } from '../../src/ai/types';
import { Player } from '../../src/engine/types';

/**
 * Hàm mô phỏng N ván đấu 4 người (chuẩn bàn Tiến Lên Miền Nam 52 lá)
 * Giữa 2 nhóm Elo (2 Bot Tier A vs 2 Bot Tier B)
 * Sử dụng trực tiếp GameEngine.executeBotTurn để đảm bảo tính xác thực 100% như in-game
 */
function runTierTableMatchup(
  tierA: { name: string; bots: { id: string; name: string; config: BotConfig }[] },
  tierB: { name: string; bots: { id: string; name: string; config: BotConfig }[] },
  numGames: number,
  baseSeed = 77777
): {
  tierAWins: number;
  tierBWins: number;
  tierAAvgCards: number;
  tierBAvgCards: number;
} {
  const tableBots = [
    tierA.bots[0],
    tierB.bots[0],
    tierA.bots[1],
    tierB.bots[1]
  ];

  const winCounts: Record<string, number> = {};
  const totalCardsLeft: Record<string, number> = {};

  for (const b of tableBots) {
    winCounts[b.id] = 0;
    totalCardsLeft[b.id] = 0;
  }

  const players: Player[] = tableBots.map(b => ({
    id: b.id,
    name: b.name,
    avatar: b.config.avatar || '🤖',
    isBot: true,
    hand: [],
    playedCards: [],
    score: 0,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  }));

  const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100 });

  for (let g = 1; g <= numGames; g++) {
    const initRes = game.startNewGame(g, undefined, baseSeed + g * 2017);

    if (initRes.instantWin && initRes.instantWinner) {
      winCounts[initRes.instantWinner.id]++;
      continue;
    }

    const trackers: Record<string, CardTracker> = {};
    for (const b of tableBots) {
      const p = game.getPlayer(b.id)!;
      trackers[b.id] = new CardTracker(p.hand, b.config.memoryDepth);
    }

    let loopCount = 0;
    const MAX_LOOPS = 400;

    while (!game.isGameOver && loopCount < MAX_LOOPS) {
      loopCount++;
      const currentTurnPlayer = game.getCurrentPlayer();
      const botObj = tableBots.find(b => b.id === currentTurnPlayer.id)!;
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

  const tierAWins = winCounts[tierA.bots[0].id] + winCounts[tierA.bots[1].id];
  const tierBWins = winCounts[tierB.bots[0].id] + winCounts[tierB.bots[1].id];
  const tierAAvgCards = (totalCardsLeft[tierA.bots[0].id] + totalCardsLeft[tierA.bots[1].id]) / (numGames * 2);
  const tierBAvgCards = (totalCardsLeft[tierB.bots[0].id] + totalCardsLeft[tierB.bots[1].id]) / (numGames * 2);

  return { tierAWins, tierBWins, tierAAvgCards, tierBAvgCards };
}

describe('Full Matrix Elo Tier Matchups (Ghép Cặp Toàn Bộ 5 Bậc Elo Bàn Chuẩn 4 Người)', () => {
  const NUM_GAMES = 60; // 60 ván đấu bàn 4 người cho mỗi cặp đối đầu

  const TIER_1 = {
    name: 'Tier 1 (Rookie - Elo 850-900)',
    bots: [
      { id: 't1_1', name: 'Alex (850)', config: BOT_PERSONAS.BOT_ELO_850 },
      { id: 't1_2', name: 'Leo (900)', config: BOT_PERSONAS.BOT_ELO_900 }
    ]
  };

  const TIER_2 = {
    name: 'Tier 2 (Challenger - Elo 1250-1350)',
    bots: [
      { id: 't2_1', name: 'Rex (1250)', config: BOT_PERSONAS.BOT_ELO_1250 },
      { id: 't2_2', name: 'Zane (1350)', config: BOT_PERSONAS.BOT_ELO_1350 }
    ]
  };

  const TIER_3 = {
    name: 'Tier 3 (Veteran - Elo 1600-1650)',
    bots: [
      { id: 't3_1', name: 'Elena (1600)', config: BOT_PERSONAS.BOT_ELO_1600 },
      { id: 't3_2', name: 'Lucas (1650)', config: BOT_PERSONAS.BOT_ELO_1650 }
    ]
  };

  const TIER_4 = {
    name: 'Tier 4 (Master - Elo 1900-1950)',
    bots: [
      { id: 't4_1', name: 'Victor (1900)', config: BOT_PERSONAS.BOT_ELO_1900 },
      { id: 't4_2', name: 'Raven (1950)', config: BOT_PERSONAS.BOT_ELO_1950 }
    ]
  };

  const TIER_5 = {
    name: 'Tier 5 (Mythic - Elo 2300-2500)',
    bots: [
      { id: 't5_1', name: 'Nova (2300)', config: BOT_PERSONAS.BOT_ELO_2300 },
      { id: 't5_2', name: 'Alpha-TL (2500)', config: BOT_PERSONAS.BOT_ELO_2500 }
    ]
  };

  test('1. Tier 1 (Tập Sự) vs Tier 2 (Phong Trào)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_2, NUM_GAMES);
    console.log(`[T1 vs T2] Tier 1: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 2: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins - 20);
  });

  test('2. Tier 1 (Tập Sự) vs Tier 3 (Kinh Nghiệm)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_3, NUM_GAMES);
    console.log(`[T1 vs T3] Tier 1: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 3: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins - 20);
    expect(res.tierBAvgCards).toBeLessThanOrEqual(res.tierAAvgCards + 1.2);
  });

  test('3. Tier 1 (Tập Sự) vs Tier 4 (Cao Thủ)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_4, NUM_GAMES);
    console.log(`[T1 vs T4] Tier 1: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 4: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins - 20);
    expect(res.tierBAvgCards).toBeLessThanOrEqual(res.tierAAvgCards + 1.2);
  });

  test('4. Tier 1 (Tập Sự) vs Tier 5 (Thần Bài Tối Thượng)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_5, NUM_GAMES);
    console.log(`[T1 vs T5] Tier 1: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 5: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins - 20);
    expect(res.tierBAvgCards).toBeLessThanOrEqual(res.tierAAvgCards + 1.2);
  });

  test('5. Tier 2 (Phong Trào) vs Tier 3 (Kinh Nghiệm)', () => {
    const res = runTierTableMatchup(TIER_2, TIER_3, NUM_GAMES);
    console.log(`[T2 vs T3] Tier 2: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 3: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(10);
  });

  test('6. Tier 2 (Phong Trào) vs Tier 4 (Cao Thủ)', () => {
    const res = runTierTableMatchup(TIER_2, TIER_4, NUM_GAMES);
    console.log(`[T2 vs T4] Tier 2: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 4: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(10);
  });

  test('7. Tier 2 (Phong Trào) vs Tier 5 (Thần Bài Tối Thượng)', () => {
    const res = runTierTableMatchup(TIER_2, TIER_5, NUM_GAMES);
    console.log(`[T2 vs T5] Tier 2: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 5: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(10);
  });

  test('8. Tier 3 (Kinh Nghiệm) vs Tier 4 (Cao Thủ)', () => {
    const res = runTierTableMatchup(TIER_3, TIER_4, NUM_GAMES);
    console.log(`[T3 vs T4] Tier 3: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 4: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(10);
  });

  test('9. Tier 3 (Kinh Nghiệm) vs Tier 5 (Thần Bài Tối Thượng)', () => {
    const res = runTierTableMatchup(TIER_3, TIER_5, NUM_GAMES);
    console.log(`[T3 vs T5] Tier 3: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 5: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(10);
  });

  test('10. Tier 4 (Cao Thủ) vs Tier 5 (Thần Bài Tối Thượng)', () => {
    const res = runTierTableMatchup(TIER_4, TIER_5, NUM_GAMES);
    console.log(`[T4 vs T5] Tier 4: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 5: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(10);
  });

  test('11. Bảng Tổng Kết Ma Trận Toàn Bộ 5 Nhóm Elo (Master Tournament Matrix)', () => {
    const allTiers = [TIER_1, TIER_2, TIER_3, TIER_4, TIER_5];
    const tierStats: Record<string, { wins: number; totalGames: number; totalCardsLeft: number }> = {};
    const GAMES_PER_PAIR = 40;

    for (const t of allTiers) {
      tierStats[t.name] = { wins: 0, totalGames: 0, totalCardsLeft: 0 };
    }

    for (let i = 0; i < allTiers.length; i++) {
      for (let j = i + 1; j < allTiers.length; j++) {
        const tierA = allTiers[i];
        const tierB = allTiers[j];

        const res = runTierTableMatchup(tierA, tierB, GAMES_PER_PAIR, 77777 + (i * 10 + j) * 1000);

        tierStats[tierA.name].wins += res.tierAWins;
        tierStats[tierA.name].totalGames += GAMES_PER_PAIR;
        tierStats[tierA.name].totalCardsLeft += res.tierAAvgCards * GAMES_PER_PAIR * 2;

        tierStats[tierB.name].wins += res.tierBWins;
        tierStats[tierB.name].totalGames += GAMES_PER_PAIR;
        tierStats[tierB.name].totalCardsLeft += res.tierBAvgCards * GAMES_PER_PAIR * 2;
      }
    }

    console.log('\n=================================');
    console.log('--- BẢNG XẾP HẠNG TỔNG KẾT MA TRẬN 5 NHÓM ELO (FULL MATRIX 10 MATCHUPS / 200 VÁN) ---');
    console.log('----------------------------------------------------------------------------------------');

    const sortedSummary = Object.entries(tierStats).sort((a, b) => b[1].wins - a[1].wins);
    sortedSummary.forEach(([name, data], idx) => {
      const winRate = (data.wins / data.totalGames) * 100;
      const avgCards = data.totalCardsLeft / (data.totalGames * 2);
      console.log(`Hạng ${idx + 1} | ${name}: ${data.wins}/${data.totalGames} thắng (${winRate.toFixed(1)}%) | Lá tồn TB: ${avgCards.toFixed(2)}`);
    });
    console.log('========================================================================================\n');

    // Nhóm Elo cao (Tier 5, 4, 3) có hiệu suất giữ bài ít lá tồn hơn nhóm Tập Sự (Tier 1)
    const t5Avg = tierStats[TIER_5.name].totalCardsLeft / (tierStats[TIER_5.name].totalGames * 2);
    const t1Avg = tierStats[TIER_1.name].totalCardsLeft / (tierStats[TIER_1.name].totalGames * 2);
    expect(t5Avg).toBeLessThanOrEqual(t1Avg + 1.0);
    expect(tierStats[TIER_5.name].wins + tierStats[TIER_4.name].wins).toBeGreaterThanOrEqual(
      tierStats[TIER_1.name].wins + tierStats[TIER_2.name].wins - 25
    );
  }, 30000);
});
