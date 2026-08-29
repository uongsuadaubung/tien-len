import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { GameEngine } from '../../src/engine/game';
import { BotConfig } from '../../src/ai/types';
import { Player } from '../../src/engine/types';
import { createBotPlayer } from '../../src/engine/player-factory';

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

  const players: Player[] = tableBots.map(b =>
    createBotPlayer(b.id, b.config.id || null, {
      name: b.name,
      avatar: b.config.avatar || '🤖',
      score: 0
    })
  );

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

describe('Full Matrix 9 Esports Tiers Matchups (Đấu Trường 9 Bậc Rank Esports Không Nhảy Bậc)', () => {
  const NUM_GAMES = 30; // 30 ván đấu cho mỗi cặp đối đầu liền kề

  const TIER_1 = {
    name: 'Tier 1 (Tân Thủ - Elo 700-750)',
    bots: [
      { id: 't1_1', name: 'Tí Chuột (700)', config: BOT_PERSONAS.BOT_ELO_700 },
      { id: 't1_2', name: 'Tèo Bờ Rào (750)', config: BOT_PERSONAS.BOT_ELO_750 }
    ]
  };

  const TIER_2 = {
    name: 'Tier 2 (Tập Sự - Elo 950-1000)',
    bots: [
      { id: 't2_1', name: 'Bảy Xe Lôi (950)', config: BOT_PERSONAS.BOT_ELO_950 },
      { id: 't2_2', name: 'Năm Xích Lô (1000)', config: BOT_PERSONAS.BOT_ELO_1000 }
    ]
  };

  const TIER_3 = {
    name: 'Tier 3 (Phong Trào - Elo 1250-1350)',
    bots: [
      { id: 't3_1', name: 'Chú Tư Cờ (1250)', config: BOT_PERSONAS.BOT_ELO_1250 },
      { id: 't3_2', name: 'Zane (1350)', config: BOT_PERSONAS.BOT_ELO_1350 }
    ]
  };

  const TIER_4 = {
    name: 'Tier 4 (Lão Luyện - Elo 1550-1600)',
    bots: [
      { id: 't4_1', name: 'Elena (1550)', config: BOT_PERSONAS.BOT_ELO_1550 },
      { id: 't4_2', name: 'Bác Sáu (1600)', config: BOT_PERSONAS.BOT_ELO_1600 }
    ]
  };

  const TIER_5 = {
    name: 'Tier 5 (Tinh Anh - Elo 1750-1850)',
    bots: [
      { id: 't5_1', name: 'Thiếu Gia Ken (1750)', config: BOT_PERSONAS.BOT_ELO_1750 },
      { id: 't5_2', name: 'Đại Gia Long (1850)', config: BOT_PERSONAS.BOT_ELO_1850 }
    ]
  };

  const TIER_6 = {
    name: 'Tier 6 (Cao Thủ - Elo 1950-2050)',
    bots: [
      { id: 't6_1', name: 'Madam Ruby (1950)', config: BOT_PERSONAS.BOT_ELO_1950 },
      { id: 't6_2', name: 'Ghost Bóng Đêm (2050)', config: BOT_PERSONAS.BOT_ELO_2050 }
    ]
  };

  const TIER_7 = {
    name: 'Tier 7 (Đại Cao Thủ - Elo 2300-2500)',
    bots: [
      { id: 't7_1', name: 'Phantom Apex (2300)', config: BOT_PERSONAS.BOT_ELO_2300 },
      { id: 't7_2', name: 'Alpha-TL Master (2500)', config: BOT_PERSONAS.BOT_ELO_2500 }
    ]
  };

  const TIER_8 = {
    name: 'Tier 8 (Thần Bài - Elo 2750)',
    bots: [
      { id: 't8_1', name: 'Oracle Tiên Tri (2750)', config: BOT_PERSONAS.BOT_ELO_2750 },
      { id: 't8_2', name: 'Chronos Bất Tử (2750)', config: BOT_PERSONAS.BOT_ELO_2750 }
    ]
  };

  const TIER_9 = {
    name: 'Tier 9 (Siêu Trí Tuệ Boss - Elo 3200)',
    bots: [
      { id: 't9_1', name: 'Alpha Mind (3200)', config: BOT_PERSONAS.BOT_ELO_3200 },
      { id: 't9_2', name: 'Zero Defeat (3200)', config: BOT_PERSONAS.BOT_ELO_3200 }
    ]
  };

  test('1. Tier 1 (Tân Thủ) vs Tier 2 (Tập Sự)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_2, NUM_GAMES);
    console.log(`[T1 vs T2] Tier 1: ${res.tierAWins} ván (Lá tồn: ${res.tierAAvgCards.toFixed(1)}) vs Tier 2: ${res.tierBWins} ván (Lá tồn: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
  });

  test('2. Tier 2 (Tập Sự) vs Tier 3 (Phong Trào)', () => {
    const res = runTierTableMatchup(TIER_2, TIER_3, NUM_GAMES);
    console.log(`[T2 vs T3] Tier 2: ${res.tierAWins} ván (Lá tồn: ${res.tierAAvgCards.toFixed(1)}) vs Tier 3: ${res.tierBWins} ván (Lá tồn: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
  });

  test('3. Tier 3 (Phong Trào) vs Tier 4 (Lão Luyện)', () => {
    const res = runTierTableMatchup(TIER_3, TIER_4, NUM_GAMES);
    console.log(`[T3 vs T4] Tier 3: ${res.tierAWins} ván (Lá tồn: ${res.tierAAvgCards.toFixed(1)}) vs Tier 4: ${res.tierBWins} ván (Lá tồn: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
  });

  test('4. Tier 4 (Lão Luyện) vs Tier 5 (Tinh Anh)', () => {
    const res = runTierTableMatchup(TIER_4, TIER_5, NUM_GAMES);
    console.log(`[T4 vs T5] Tier 4: ${res.tierAWins} ván (Lá tồn: ${res.tierAAvgCards.toFixed(1)}) vs Tier 5: ${res.tierBWins} ván (Lá tồn: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
  });

  test('5. Tier 5 (Tinh Anh) vs Tier 6 (Cao Thủ)', () => {
    const res = runTierTableMatchup(TIER_5, TIER_6, NUM_GAMES);
    console.log(`[T5 vs T6] Tier 5: ${res.tierAWins} ván (Lá tồn: ${res.tierAAvgCards.toFixed(1)}) vs Tier 6: ${res.tierBWins} ván (Lá tồn: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
  });

  test('6. Tier 6 (Cao Thủ) vs Tier 7 (Đại Cao Thủ)', () => {
    const res = runTierTableMatchup(TIER_6, TIER_7, NUM_GAMES);
    console.log(`[T6 vs T7] Tier 6: ${res.tierAWins} ván (Lá tồn: ${res.tierAAvgCards.toFixed(1)}) vs Tier 7: ${res.tierBWins} ván (Lá tồn: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
  });

  test('7. Tier 7 (Đại Cao Thủ) vs Tier 8 (Thần Bài Minimax)', () => {
    const res = runTierTableMatchup(TIER_7, TIER_8, NUM_GAMES);
    console.log(`[T7 vs T8] Tier 7: ${res.tierAWins} ván (Lá tồn: ${res.tierAAvgCards.toFixed(1)}) vs Tier 8: ${res.tierBWins} ván (Lá tồn: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
  });

  test('8. Tier 8 (Thần Bài) vs Tier 9 (Siêu Trí Tuệ Challenger Boss)', () => {
    const res = runTierTableMatchup(TIER_8, TIER_9, NUM_GAMES);
    console.log(`[T8 vs T9] Tier 8: ${res.tierAWins} ván (Lá tồn: ${res.tierAAvgCards.toFixed(1)}) vs Tier 9: ${res.tierBWins} ván (Lá tồn: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
  }, 15000);

  test('9. Bảng Tổng Kết Trọn Vẹn 9 Bậc Rank Esports (Full Ladder Matrix)', () => {
    const allNineTiers = [TIER_1, TIER_2, TIER_3, TIER_4, TIER_5, TIER_6, TIER_7, TIER_8, TIER_9];
    const tierStats: Record<string, { wins: number; totalGames: number; totalCardsLeft: number }> = {};
    const GAMES_PER_CONSECUTIVE = 20;

    for (const t of allNineTiers) {
      tierStats[t.name] = { wins: 0, totalGames: 0, totalCardsLeft: 0 };
    }

    // Đấu xoay vòng toàn bộ các cặp liền kề từ T1->T2, T2->T3 ... T8->T9
    for (let i = 0; i < allNineTiers.length - 1; i++) {
      const tierA = allNineTiers[i];
      const tierB = allNineTiers[i + 1];

      const res = runTierTableMatchup(tierA, tierB, GAMES_PER_CONSECUTIVE, 99999 + i * 1000);

      tierStats[tierA.name].wins += res.tierAWins;
      tierStats[tierA.name].totalGames += GAMES_PER_CONSECUTIVE;
      tierStats[tierA.name].totalCardsLeft += res.tierAAvgCards * GAMES_PER_CONSECUTIVE * 2;

      tierStats[tierB.name].wins += res.tierBWins;
      tierStats[tierB.name].totalGames += GAMES_PER_CONSECUTIVE;
      tierStats[tierB.name].totalCardsLeft += res.tierBAvgCards * GAMES_PER_CONSECUTIVE * 2;
    }

    console.log('\n========================================================================================');
    console.log('--- BẢNG XẾP HẠNG TOÀN DIỆN 9 BẬC RANK ESPORTS (ĐẦY ĐỦ TỪ TIER 1 ĐẾN TIER 9) ---');
    console.log('----------------------------------------------------------------------------------------');

    allNineTiers.forEach((t, idx) => {
      const data = tierStats[t.name];
      const winRate = data.totalGames > 0 ? (data.wins / data.totalGames) * 100 : 0;
      const avgCards = data.totalGames > 0 ? data.totalCardsLeft / (data.totalGames * 2) : 0;
      console.log(`Tier ${idx + 1} | ${t.name}: ${data.wins}/${data.totalGames} thắng (${winRate.toFixed(1)}%) | Lá tồn TB: ${avgCards.toFixed(2)}`);
    });
    console.log('========================================================================================\n');

    expect(allNineTiers.length).toBe(9);
  }, 30000);
});
