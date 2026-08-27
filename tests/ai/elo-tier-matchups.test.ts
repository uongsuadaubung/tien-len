import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { GameEngine } from '../../src/engine/game';
import { BotConfig } from '../../src/ai/types';
import { Player } from '../../src/engine/types';

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

  const players: Player[] = botConfigs.map(b => ({
    id: b.id,
    name: b.name,
    avatar: b.config.avatar || '🤖',
    isBot: true,
    botPersonaId: b.config.id || null,
    hand: [],
    playedCards: [],
    score: 0,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false,
    rankPosition: null,
    instantWinType: null
  }));

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

describe('AI Elo Tier Matchup Tests (Kiểm Thử Tương Quan Kỹ Năng & Tỉ Lệ Thắng)', () => {
  test('Đối đầu 4 Bậc Elo khác nhau (Tier 1 vs Tier 2 vs Tier 3 vs Tier 5)', () => {
    const NUM_GAMES = 100;
    const botConfigs = [
      { id: 't1', name: 'Alex (Rookie - Elo 850)', config: BOT_PERSONAS.BOT_ELO_850 },
      { id: 't2', name: 'Kai (Challenger - Elo 1150)', config: BOT_PERSONAS.BOT_ELO_1150 },
      { id: 't3', name: 'Marcus (Veteran - Elo 1450)', config: BOT_PERSONAS.BOT_ELO_1450 },
      { id: 't5', name: 'Alpha-TL (Supreme AI - Elo 2500)', config: BOT_PERSONAS.BOT_ELO_2500 }
    ];

    const { winCounts, remainingCardsAvg } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- KẾT QUẢ ĐỐI ĐẦU 4 BẬC ELO (${NUM_GAMES} VÁN NGẪU NHIÊN) ---`);
    for (const b of botConfigs) {
      const wins = winCounts[b.id];
      const winPct = ((wins / NUM_GAMES) * 100).toFixed(1);
      const avgCards = remainingCardsAvg[b.id].toFixed(2);
      console.log(`${b.name}: ${wins} ván thắng (${winPct}%) | Số lá bài còn lại TB: ${avgCards}`);
    }
    console.log('======================================================\n');

    // Mong đợi: Nhóm trình độ cao (Tier 3 + Tier 5) có kết quả tốt hơn và giữ ít lá tồn hơn Tier 1
    expect(winCounts['t5'] + winCounts['t3']).toBeGreaterThanOrEqual(winCounts['t1']);
    expect(remainingCardsAvg['t5']).toBeLessThanOrEqual(remainingCardsAvg['t1'] + 2.0);
  }, 30000);

  test('1 Thần Bài (Tier 5) đối đầu 3 Tập Sự (Tier 1)', () => {
    const NUM_GAMES = 100;
    const botConfigs = [
      { id: 'boss', name: 'Alpha-TL (Supreme AI - Elo 2500)', config: BOT_PERSONAS.BOT_ELO_2500 },
      { id: 'novice1', name: 'Alex (Rookie - Elo 850)', config: BOT_PERSONAS.BOT_ELO_850 },
      { id: 'novice2', name: 'Leo (Rookie - Elo 900)', config: BOT_PERSONAS.BOT_ELO_900 },
      { id: 'novice3', name: 'Mia (Rookie - Elo 950)', config: BOT_PERSONAS.BOT_ELO_950 }
    ];

    const { winCounts, remainingCardsAvg } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- KẾT QUẢ 1 THẦN BÀI VS 3 TẬP SỰ (${NUM_GAMES} VÁN NGẪU NHIÊN) ---`);
    for (const b of botConfigs) {
      const wins = winCounts[b.id];
      const winPct = ((wins / NUM_GAMES) * 100).toFixed(1);
      console.log(`${b.name}: ${wins} ván thắng (${winPct}%) | Lá tồn TB: ${remainingCardsAvg[b.id].toFixed(2)}`);
    }
    console.log('======================================================\n');

    const avgNoviceCards = (remainingCardsAvg['novice1'] + remainingCardsAvg['novice2'] + remainingCardsAvg['novice3']) / 3;
    expect(winCounts['boss']).toBeGreaterThanOrEqual(12);
    expect(remainingCardsAvg['boss']).toBeLessThanOrEqual(avgNoviceCards + 0.5);
  });

  test('Đối đầu 1v1 Trực Diện: Tier 2 (Phong Trào) vs Tier 4 (Cao Thủ)', () => {
    const NUM_GAMES = 50;
    const botConfigs = [
      { id: 'amateur', name: 'Max (Challenger - Elo 1200)', config: BOT_PERSONAS.BOT_ELO_1200 },
      { id: 'pro', name: 'Drake (Master - Elo 1850)', config: BOT_PERSONAS.BOT_ELO_1850 }
    ];

    const { winCounts } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- ĐỐI ĐẦU 1V1: CAO THỦ (ELO 1850) VS PHONG TRÀO (ELO 1200) ---`);
    console.log(`Max: ${winCounts['amateur']} ván (${((winCounts['amateur'] / NUM_GAMES) * 100).toFixed(1)}%)`);
    console.log(`Drake: ${winCounts['pro']} ván (${((winCounts['pro'] / NUM_GAMES) * 100).toFixed(1)}%)`);
    console.log('======================================================\n');

    expect(winCounts['pro'] + winCounts['amateur']).toBe(NUM_GAMES);
    expect(winCounts['pro']).toBeGreaterThanOrEqual(10);
  });
});
