import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { GameEngine } from '../../src/engine/game';
import { BotConfig } from '../../src/ai/types';
import { Player } from '../../src/engine/types';

/**
 * Hàm mô phỏng N ván đấu 4 người (chuẩn bàn Tiến Lên Miền Nam 52 lá)
 * Giữa 2 nhóm Elo (2 Bot Tier A vs 2 Bot Tier B)
 */
function runTierTableMatchup(
  tierA: { name: string; bots: { id: string; name: string; config: BotConfig }[] },
  tierB: { name: string; bots: { id: string; name: string; config: BotConfig }[] },
  numGames: number
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
    avatar: b.config.avatar,
    isBot: true,
    hand: [],
    playedCards: [],
    score: 0,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  }));

  const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100 });

  for (let g = 1; g <= numGames; g++) {
    const initRes = game.startNewGame(g);

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
      tracker.updateOwnHand(currentTurnPlayer.hand);

      const remainingCardsMap: Record<string, number> = {};
      for (const p of game.players) {
        remainingCardsMap[p.id] = p.hand.length;
      }

      const isLead = game.isRoundLeadMove();

      const decision = makeBotDecision({
        hand: currentTurnPlayer.hand,
        currentRoundLeadingMove: game.getLeadingMove(),
        isFirstMoveOfGame: game.isFirstMoveOfGame,
        isLeadMove: isLead,
        tracker,
        config: botObj.config,
        remainingPlayerCards: remainingCardsMap
      });

      if (decision.type === 'PLAY' && decision.cards) {
        const moveRes = game.playMove(currentTurnPlayer.id, decision.cards);
        if (moveRes.success) {
          const lastMove = game.getLeadingMove();
          if (lastMove) {
            for (const t of Object.values(trackers)) {
              t.recordMove(lastMove);
            }
          }
        } else {
          if (isLead) {
            game.playMove(currentTurnPlayer.id, [currentTurnPlayer.hand[0]]);
          } else {
            game.passTurn(currentTurnPlayer.id);
          }
        }
      } else {
        if (isLead) {
          game.playMove(currentTurnPlayer.id, [currentTurnPlayer.hand[0]]);
        } else {
          game.passTurn(currentTurnPlayer.id);
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
  const NUM_GAMES = 40;

  const TIER_1 = {
    name: 'Tier 1 (Tập Sự - Elo 850-1000)',
    bots: [
      { id: 't1_1', name: 'Bé Năm (850)', config: BOT_PERSONAS.BE_NAM },
      { id: 't1_2', name: 'Cu Tí (900)', config: BOT_PERSONAS.CU_TI }
    ]
  };

  const TIER_2 = {
    name: 'Tier 2 (Phong Trào - Elo 1150-1350)',
    bots: [
      { id: 't2_1', name: 'Chú Bảy (1150)', config: BOT_PERSONAS.CHU_BAY },
      { id: 't2_2', name: 'Anh Ba Xị (1200)', config: BOT_PERSONAS.BA_XI }
    ]
  };

  const TIER_3 = {
    name: 'Tier 3 (Kinh Nghiệm - Elo 1450-1650)',
    bots: [
      { id: 't3_1', name: 'Bác Tư (1450)', config: BOT_PERSONAS.BAC_TU },
      { id: 't3_2', name: 'Cậu Út (1550)', config: BOT_PERSONAS.CAU_UT }
    ]
  };

  const TIER_4 = {
    name: 'Tier 4 (Cao Thủ - Elo 1750-1950)',
    bots: [
      { id: 't4_1', name: 'Cô Ba (1750)', config: BOT_PERSONAS.CO_BA },
      { id: 't4_2', name: 'Anh Hai (1850)', config: BOT_PERSONAS.ANH_HAI }
    ]
  };

  const TIER_5 = {
    name: 'Tier 5 (Thần Bài - Elo 2050-2500)',
    bots: [
      { id: 't5_1', name: 'Cô Sáu (2300)', config: BOT_PERSONAS.CO_SAU },
      { id: 't5_2', name: 'Alpha-TL (2500)', config: BOT_PERSONAS.ALPHA_TL }
    ]
  };

  test('1. Tier 1 (Tập Sự) vs Tier 2 (Phong Trào)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_2, NUM_GAMES);
    console.log(`[T1 vs T2] Tier 1: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 2: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins - 8);
  });

  test('2. Tier 1 (Tập Sự) vs Tier 3 (Kinh Nghiệm)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_3, NUM_GAMES);
    console.log(`[T1 vs T3] Tier 1: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 3: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierBWins).toBeGreaterThan(res.tierAWins);
    expect(res.tierBAvgCards).toBeLessThan(res.tierAAvgCards);
  });

  test('3. Tier 1 (Tập Sự) vs Tier 4 (Cao Thủ)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_4, NUM_GAMES);
    console.log(`[T1 vs T4] Tier 1: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 4: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierBWins).toBeGreaterThan(res.tierAWins);
    expect(res.tierBAvgCards).toBeLessThan(res.tierAAvgCards);
  });

  test('4. Tier 1 (Tập Sự) vs Tier 5 (Thần Bài Tối Thượng)', () => {
    const res = runTierTableMatchup(TIER_1, TIER_5, NUM_GAMES);
    console.log(`[T1 vs T5] Tier 1: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 5: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierBWins).toBeGreaterThan(res.tierAWins);
    expect(res.tierBAvgCards).toBeLessThan(res.tierAAvgCards);
  });

  test('5. Tier 2 (Phong Trào) vs Tier 3 (Kinh Nghiệm)', () => {
    const res = runTierTableMatchup(TIER_2, TIER_3, NUM_GAMES);
    console.log(`[T2 vs T3] Tier 2: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 3: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins);
  });

  test('6. Tier 2 (Phong Trào) vs Tier 4 (Cao Thủ)', () => {
    const res = runTierTableMatchup(TIER_2, TIER_4, NUM_GAMES);
    console.log(`[T2 vs T4] Tier 2: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 4: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierBWins).toBeGreaterThan(res.tierAWins);
  });

  test('7. Tier 2 (Phong Trào) vs Tier 5 (Thần Bài Tối Thượng)', () => {
    const res = runTierTableMatchup(TIER_2, TIER_5, NUM_GAMES);
    console.log(`[T2 vs T5] Tier 2: ${res.tierAWins} ván (Lá tồn TB: ${res.tierAAvgCards.toFixed(1)}) vs Tier 5: ${res.tierBWins} ván (Lá tồn TB: ${res.tierBAvgCards.toFixed(1)})`);
    expect(res.tierBWins).toBeGreaterThan(res.tierAWins);
  });

  test('8. Tier 3 (Kinh Nghiệm) vs Tier 4 (Cao Thủ)', () => {
    const res = runTierTableMatchup(TIER_3, TIER_4, NUM_GAMES);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins - 12);
  });

  test('9. Tier 3 (Kinh Nghiệm) vs Tier 5 (Thần Bài Tối Thượng)', () => {
    const res = runTierTableMatchup(TIER_3, TIER_5, NUM_GAMES);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins - 12);
  });

  test('10. Tier 4 (Cao Thủ) vs Tier 5 (Thần Bài Tối Thượng)', () => {
    const res = runTierTableMatchup(TIER_4, TIER_5, NUM_GAMES);
    expect(res.tierAWins + res.tierBWins).toBe(NUM_GAMES);
    expect(res.tierBWins).toBeGreaterThanOrEqual(res.tierAWins - 12);
  });

  test('11. Bảng Tổng Kết Ma Trận Toàn Bộ 5 Nhóm Elo (Master Tournament Matrix)', () => {
    const allTiers = [TIER_1, TIER_2, TIER_3, TIER_4, TIER_5];
    const tierStats: Record<string, { wins: number; totalGames: number; totalCardsLeft: number }> = {};
    const GAMES_PER_PAIR = 15;

    for (const t of allTiers) {
      tierStats[t.name] = { wins: 0, totalGames: 0, totalCardsLeft: 0 };
    }

    for (let i = 0; i < allTiers.length - 1; i++) {
      for (let j = i + 1; j < allTiers.length; j++) {
        const tA = allTiers[i];
        const tB = allTiers[j];
        const res = runTierTableMatchup(tA, tB, GAMES_PER_PAIR);

        tierStats[tA.name].wins += res.tierAWins;
        tierStats[tA.name].totalGames += GAMES_PER_PAIR;
        tierStats[tA.name].totalCardsLeft += res.tierAAvgCards * GAMES_PER_PAIR;

        tierStats[tB.name].wins += res.tierBWins;
        tierStats[tB.name].totalGames += GAMES_PER_PAIR;
        tierStats[tB.name].totalCardsLeft += res.tierBAvgCards * GAMES_PER_PAIR;
      }
    }

    console.log('\n========================================================================================');
    console.log('--- BẢNG XẾP HẠNG TỔNG KẾT MA TRẬN 5 NHÓM ELO (FULL MATRIX 10 MATCHUPS / 250 VÁN) ---');
    console.log('----------------------------------------------------------------------------------------');

    const sorted = [...allTiers].sort((a, b) => {
      const winPctA = tierStats[a.name].wins / tierStats[a.name].totalGames;
      const winPctB = tierStats[b.name].wins / tierStats[b.name].totalGames;
      return winPctB - winPctA;
    });

    for (let rank = 0; rank < sorted.length; rank++) {
      const t = sorted[rank];
      const s = tierStats[t.name];
      const winPct = ((s.wins / s.totalGames) * 100).toFixed(1);
      const avgCards = (s.totalCardsLeft / s.totalGames).toFixed(2);
      console.log(`Hạng ${rank + 1} | ${t.name}: ${s.wins}/${s.totalGames} thắng (${winPct}%) | Lá tồn TB: ${avgCards}`);
    }
    console.log('========================================================================================\n');

    expect(tierStats[TIER_5.name].wins).toBeGreaterThan(tierStats[TIER_1.name].wins);
    expect(tierStats[TIER_4.name].wins).toBeGreaterThan(tierStats[TIER_1.name].wins);
  });
});
