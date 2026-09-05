/**
 * ============================================================================
 * BENCHMARK SCRIPT: ĐO ĐẠC TƯƠNG QUAN ELO TOÀN DIỆN (1v1, 3P & 4P)
 * ============================================================================
 * Chạy độc lập: bun run benchmark:ai
 * 
 * Cấu trúc 3 Giai đoạn:
 * 1. Giai đoạn 1 (Solo 1v1): Ma trận đối đầu chéo 9x9 (72 cặp x 100 ván = 7,200 ván).
 * 2. Giai đoạn 2 (Bàn 3 Người - 3P): C(9, 3) = 84 tổ hợp x 30 ván = 2,520 ván (xoay 3 ghế).
 * 3. Giai đoạn 3 (Bàn 4 Người - 4P): C(9, 4) = 126 tổ hợp x 20 ván = 2,520 ván (xoay 4 ghế).
 * 4. Bảng Tổng Hợp So Sánh Tương Quan (1v1 vs 3P vs 4P).
 */

import { GameEngine } from '../src/engine/game';
import { CardTracker } from '../src/ai/card-tracker';
import { BOT_PERSONAS } from '../src/ai/bot-factory';
import { Player } from '../src/engine/types';
import { createBotPlayer } from '../src/engine/player-factory';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function calculateSpearmanCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n <= 1 || n !== y.length) return 0;

  const getRanks = (arr: number[]): number[] => {
    const indexed = arr.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);
    const ranks = new Array<number>(n);
    for (let r = 0; r < n; r++) {
      ranks[indexed[r].idx] = r + 1;
    }
    return ranks;
  };

  const rankX = getRanks(x);
  const rankY = getRanks(y);
  return calculatePearsonCorrelation(rankX, rankY);
}

function getCombinations<T>(array: T[], k: number): T[][] {
  const result: T[][] = [];
  function backtrack(start: number, combo: T[]) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      combo.push(array[i]);
      backtrack(i + 1, combo);
      combo.pop();
    }
  }
  backtrack(0, []);
  return result;
}

const BENCHMARK_BOTS = [
  { tier: 1, id: 'bot_t1', name: 'Tí Chuột', elo: 700, config: BOT_PERSONAS.BOT_ELO_700 },
  { tier: 2, id: 'bot_t2', name: 'Năm Xích Lô', elo: 1000, config: BOT_PERSONAS.BOT_ELO_1000 },
  { tier: 3, id: 'bot_t3', name: 'Zane Bạc', elo: 1350, config: BOT_PERSONAS.BOT_ELO_1350 },
  { tier: 4, id: 'bot_t4', name: 'Bác Sáu Vàng', elo: 1600, config: BOT_PERSONAS.BOT_ELO_1600 },
  { tier: 5, id: 'bot_t5', name: 'Đại Gia Long', elo: 1850, config: BOT_PERSONAS.BOT_ELO_1850 },
  { tier: 6, id: 'bot_t6', name: 'Bạch Hổ KC', elo: 2050, config: BOT_PERSONAS.BOT_ELO_2050 },
  { tier: 7, id: 'bot_t7', name: 'Alpha-TL Master', elo: 2500, config: BOT_PERSONAS.BOT_ELO_2500 },
  { tier: 8, id: 'bot_t8', name: 'Chronos Thần Bài', elo: 2750, config: BOT_PERSONAS.BOT_ELO_2750 },
  { tier: 9, id: 'bot_t9', name: 'Alpha Mind Boss', elo: 3200, config: BOT_PERSONAS.BOT_ELO_3200 }
];

function simulateSingleMatch(
  bots: typeof BENCHMARK_BOTS,
  playerCount: 2 | 3 | 4,
  gameNumber: number,
  seed: number
): {
  winnerId: string;
  rankOrder: string[];
  cardsLeft: Record<string, number>;
} {
  const players: Player[] = bots.map((b) => createBotPlayer(b.id, b.config.id, {
    name: b.name
  }));

  const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100, playerCount });
  const initRes = game.startNewGame(gameNumber, null, seed);

  if (initRes.instantWin && initRes.instantWinner) {
    const cardsLeft: Record<string, number> = {};
    for (const p of game.players) {
      cardsLeft[p.id] = p.hand.length;
    }
    return {
      winnerId: initRes.instantWinner.id,
      rankOrder: [initRes.instantWinner.id],
      cardsLeft
    };
  }

  const trackers: Record<string, CardTracker> = {};
  for (const b of bots) {
    const p = game.getPlayer(b.id)!;
    trackers[b.id] = new CardTracker(p.hand, b.config.memoryDepth, playerCount);
  }

  let loopCount = 0;
  const MAX_LOOPS = 250;

  while (!game.isGameOver && loopCount < MAX_LOOPS) {
    loopCount++;
    const currentTurnPlayer = game.getCurrentPlayer();
    if (!currentTurnPlayer) break;
    const botObj = bots.find(b => b.id === currentTurnPlayer.id)!;
    const tracker = trackers[currentTurnPlayer.id];
    tracker.updateOwnHand(currentTurnPlayer.hand);

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

  const cardsLeft: Record<string, number> = {};
  for (const p of game.players) {
    cardsLeft[p.id] = p.hand.length;
  }

  const winnerId = game.winners.length > 0 ? game.winners[0].id : game.players[0].id;
  const rankOrder = game.winners.map(w => w.id);

  const losers = game.players
    .filter(p => !rankOrder.includes(p.id))
    .sort((a, b) => a.hand.length - b.hand.length)
    .map(p => p.id);

  return {
    winnerId,
    rankOrder: [...rankOrder, ...losers],
    cardsLeft
  };
}

interface MultiPlayerStats {
  firstPlaceWins: number;
  lastPlaceCount: number;
  rankSum: number;
  totalCardsLeft: number;
  totalGames: number;
}

async function runBenchmark() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       HỆ THỐNG BENCHMARK AI TIẾN LÊN MIỀN NAM: TOÀN DIỆN 1v1, 3P & 4P (9 TIER)      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

  const numBots = BENCHMARK_BOTS.length; // 9

  // =========================================================================
  // GIAI ĐOẠN 1: SOLO 1v1 (MA TRẬN ĐỐI ĐẦU CHÉO 9x9 - 7,200 VÁN)
  // =========================================================================
  const GAMES_PER_MATCHUP_1V1 = 100;
  const TOTAL_GAMES_1V1 = numBots * (numBots - 1) * GAMES_PER_MATCHUP_1V1; // 7,200

  console.log('========================================================================================');
  console.log(`>>> [GIAI ĐOẠN 1] MA TRẬN ĐỐI ĐẦU CHÉO SOLO 1v1 (${GAMES_PER_MATCHUP_1V1} VÁN / CẶP)...`);
  console.log(`- 9 Bậc Elo x 8 đối thủ = 72 cặp đấu x ${GAMES_PER_MATCHUP_1V1} ván = ${TOTAL_GAMES_1V1.toLocaleString()} ván.`);
  console.log('----------------------------------------------------------------------------------------');

  const matrixWins1v1: number[][] = Array.from({ length: numBots }, () => Array(numBots).fill(0));
  const botWins1v1: number[] = Array(numBots).fill(0);
  const botGames1v1: number[] = Array(numBots).fill(0);
  const botCards1v1: number[] = Array(numBots).fill(0);

  let higherEloWins1v1 = 0;
  let higherEloGames1v1 = 0;

  const start1v1 = performance.now();

  for (let i = 0; i < numBots; i++) {
    const botA = BENCHMARK_BOTS[i];
    for (let j = 0; j < numBots; j++) {
      if (i === j) continue;
      const botB = BENCHMARK_BOTS[j];
      let aWins = 0;
      let aCards = 0;

      for (let g = 0; g < GAMES_PER_MATCHUP_1V1; g++) {
        const gameSeed = 2000000 + (i * numBots + j) * 1000 + g * 37;
        const seatAFirst = g % 2 === 0;
        const matchupBots = seatAFirst ? [botA, botB] : [botB, botA];

        const res = simulateSingleMatch(matchupBots, 2, g + 1, gameSeed);
        if (res.winnerId === botA.id) {
          aWins++;
        }
        aCards += res.cardsLeft[botA.id] ?? 0;
      }

      matrixWins1v1[i][j] = aWins;
      botWins1v1[i] += aWins;
      botGames1v1[i] += GAMES_PER_MATCHUP_1V1;
      botCards1v1[i] += aCards;

      if (botA.elo > botB.elo) {
        higherEloWins1v1 += aWins;
        higherEloGames1v1 += GAMES_PER_MATCHUP_1V1;
      }
    }
    const rate = (botWins1v1[i] / botGames1v1[i]) * 100;
    console.log(`[Tier ${botA.tier}] ${botA.name.padEnd(16)} (Elo ${botA.elo}): Thắng 1v1 ${botWins1v1[i]}/${botGames1v1[i]} (${rate.toFixed(1)}%) | Lá tồn TB: ${(botCards1v1[i] / botGames1v1[i]).toFixed(2)}`);
  }

  const duration1v1 = performance.now() - start1v1;
  const eloList1v1 = BENCHMARK_BOTS.map(b => b.elo);
  const winRateList1v1 = botWins1v1.map((w, idx) => (w / botGames1v1[idx]) * 100);
  const pearsonR1v1 = calculatePearsonCorrelation(eloList1v1, winRateList1v1);
  const spearmanRho1v1 = calculateSpearmanCorrelation(eloList1v1, winRateList1v1);

  // In ma trận 9x9 trực quan cho 1v1
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║                        MA TRẬN TỶ LỆ THẮNG ĐỐI ĐẦU CHÉO 9 BẬC ELO (${GAMES_PER_MATCHUP_1V1} VÁN / CẶP ĐẤU)                                 ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ Bot (Hàng) vs Đối thủ (Cột)    T1      T2      T3      T4      T5      T6      T7      T8      T9   | Tổng Thắng | Tỷ lệ TB  ║');
  console.log('╟──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╢');
  for (let i = 0; i < numBots; i++) {
    const b = BENCHMARK_BOTS[i];
    let rowStr = `║ Tier ${b.tier} | ${b.name.padEnd(16)} `;
    for (let j = 0; j < numBots; j++) {
      if (i === j) {
        rowStr += '   -    ';
      } else {
        const r = (matrixWins1v1[i][j] / GAMES_PER_MATCHUP_1V1) * 100;
        rowStr += `${r.toFixed(1).padStart(5)}%  `;
      }
    }
    rowStr += `| ${String(botWins1v1[i]).padStart(4)}/${botGames1v1[i]} |  ${winRateList1v1[i].toFixed(1).padStart(5)}%  ║`;
    console.log(rowStr);
  }
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`✓ Hoàn thành 1v1 trong ${(duration1v1 / 1000).toFixed(1)}s | Pearson r = ${pearsonR1v1.toFixed(3)} | Spearman ρ = ${spearmanRho1v1.toFixed(3)}\n`);

  // =========================================================================
  // GIAI ĐOẠN 2: BÀN 3 NGƯỜI (3P - C(9, 3) = 84 TỔ HỢP x 30 VÁN = 2,520 VÁN)
  // =========================================================================
  console.log('========================================================================================');
  const triplets = getCombinations(BENCHMARK_BOTS, 3); // 84 bộ ba
  const GAMES_PER_TRIPLET = 30; // 10 ván mỗi vị trí ghế (xoay 3 ghế)
  const TOTAL_GAMES_3P = triplets.length * GAMES_PER_TRIPLET; // 2,520 ván

  console.log(`>>> [GIAI ĐOẠN 2] BÀN 3 NGƯỜI: ${triplets.length} TỔ HỢP BỘ BA x ${GAMES_PER_TRIPLET} VÁN = ${TOTAL_GAMES_3P.toLocaleString()} VÁN...`);
  console.log('- Luân phiên 3 vị trí ghế (10 ván/ghế) để đảm bảo công bằng vị trí.');
  console.log('----------------------------------------------------------------------------------------');

  const stats3P: MultiPlayerStats[] = Array.from({ length: numBots }, () => ({
    firstPlaceWins: 0,
    lastPlaceCount: 0,
    rankSum: 0,
    totalCardsLeft: 0,
    totalGames: 0
  }));

  const start3P = performance.now();

  for (let c = 0; c < triplets.length; c++) {
    const trio = triplets[c];
    for (let g = 0; g < GAMES_PER_TRIPLET; g++) {
      const seed = 3000000 + c * 1000 + g * 43;
      const seatOffset = g % 3;
      const matchupBots = [
        trio[seatOffset],
        trio[(seatOffset + 1) % 3],
        trio[(seatOffset + 2) % 3]
      ];

      const res = simulateSingleMatch(matchupBots, 3, g + 1, seed);

      for (const bot of matchupBots) {
        const botIdx = BENCHMARK_BOTS.findIndex(b => b.id === bot.id);
        const rank = res.rankOrder.indexOf(bot.id) + 1; // 1, 2, 3

        stats3P[botIdx].totalGames++;
        stats3P[botIdx].rankSum += rank;
        stats3P[botIdx].totalCardsLeft += res.cardsLeft[bot.id] ?? 0;
        if (rank === 1) stats3P[botIdx].firstPlaceWins++;
        if (rank === 3) stats3P[botIdx].lastPlaceCount++;
      }
    }
  }

  const duration3P = performance.now() - start3P;

  // In bảng kết quả Bàn 3 Người
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║           KẾT QUẢ BÀN 3 NGƯỜI (3P - ${triplets.length} TỔ HỢP x ${GAMES_PER_TRIPLET} VÁN = ${TOTAL_GAMES_3P.toLocaleString()} VÁN | BASELINE: 33.3%)          ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ Tier | Tên Bot          |  Elo  | Số Ván | Về Nhất (%) | Hạng TB | Về Bét (%) | Lá Tồn TB║');
  console.log('╟──────────────────────────────────────────────────────────────────────────────────────────────╢');

  const winRates3P: number[] = [];
  const avgRanks3P: number[] = [];

  for (let i = 0; i < numBots; i++) {
    const b = BENCHMARK_BOTS[i];
    const s = stats3P[i];
    const winRate = (s.firstPlaceWins / s.totalGames) * 100;
    const avgRank = s.rankSum / s.totalGames;
    const lastRate = (s.lastPlaceCount / s.totalGames) * 100;
    const avgCards = s.totalCardsLeft / s.totalGames;

    winRates3P.push(winRate);
    avgRanks3P.push(avgRank);

    console.log(
      `║ Tier ${b.tier} | ${b.name.padEnd(16)} | ${String(b.elo).padStart(5)} | ` +
      `${String(s.totalGames).padStart(6)} |  ${winRate.toFixed(1).padStart(5)}%   |  ` +
      `${avgRank.toFixed(2).padStart(4)}   |  ${lastRate.toFixed(1).padStart(5)}%   |  ` +
      `${avgCards.toFixed(2).padStart(5)}   ║`
    );
  }
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝');

  const pearsonR3P = calculatePearsonCorrelation(eloList1v1, winRates3P);
  const spearmanRho3P = calculateSpearmanCorrelation(eloList1v1, winRates3P);
  console.log(`✓ Hoàn thành Bàn 3P trong ${(duration3P / 1000).toFixed(1)}s | Pearson r = ${pearsonR3P.toFixed(3)} | Spearman ρ = ${spearmanRho3P.toFixed(3)}\n`);

  // =========================================================================
  // GIAI ĐOẠN 3: BÀN 4 NGƯỜI (4P CHUẨN 52 LÁ - C(9, 4) = 126 TỔ HỢP x 20 VÁN = 2,520 VÁN)
  // =========================================================================
  console.log('========================================================================================');
  const quadruplets = getCombinations(BENCHMARK_BOTS, 4); // 126 bộ bốn
  const GAMES_PER_QUAD = 20; // 5 ván mỗi vị trí ghế (xoay 4 ghế)
  const TOTAL_GAMES_4P = quadruplets.length * GAMES_PER_QUAD; // 2,520 ván

  console.log(`>>> [GIAI ĐOẠN 3] BÀN 4 NGƯỜI (CHUẨN 52 LÁ): ${quadruplets.length} TỔ HỢP BỘ BỐN x ${GAMES_PER_QUAD} VÁN = ${TOTAL_GAMES_4P.toLocaleString()} VÁN...`);
  console.log('- Không có lá nọc bỏ ngoài. Đầy đủ 52 lá. Luân phiên 4 vị trí ghế (5 ván/ghế).');
  console.log('----------------------------------------------------------------------------------------');

  const stats4P: MultiPlayerStats[] = Array.from({ length: numBots }, () => ({
    firstPlaceWins: 0,
    lastPlaceCount: 0,
    rankSum: 0,
    totalCardsLeft: 0,
    totalGames: 0
  }));

  const start4P = performance.now();

  for (let c = 0; c < quadruplets.length; c++) {
    const quad = quadruplets[c];
    for (let g = 0; g < GAMES_PER_QUAD; g++) {
      const seed = 4000000 + c * 1000 + g * 53;
      const seatOffset = g % 4;
      const matchupBots = [
        quad[seatOffset],
        quad[(seatOffset + 1) % 4],
        quad[(seatOffset + 2) % 4],
        quad[(seatOffset + 3) % 4]
      ];

      const res = simulateSingleMatch(matchupBots, 4, g + 1, seed);

      for (const bot of matchupBots) {
        const botIdx = BENCHMARK_BOTS.findIndex(b => b.id === bot.id);
        const rank = res.rankOrder.indexOf(bot.id) + 1; // 1, 2, 3, 4

        stats4P[botIdx].totalGames++;
        stats4P[botIdx].rankSum += rank;
        stats4P[botIdx].totalCardsLeft += res.cardsLeft[bot.id] ?? 0;
        if (rank === 1) stats4P[botIdx].firstPlaceWins++;
        if (rank === 4) stats4P[botIdx].lastPlaceCount++;
      }
    }
  }

  const duration4P = performance.now() - start4P;

  // In bảng kết quả Bàn 4 Người
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║     KẾT QUẢ BÀN 4 NGƯỜI (4P CHUẨN 52 LÁ - ${quadruplets.length} TỔ HỢP x ${GAMES_PER_QUAD} VÁN = ${TOTAL_GAMES_4P.toLocaleString()} VÁN | BASELINE: 25.0%)    ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ Tier | Tên Bot          |  Elo  | Số Ván | Về Nhất (%) | Hạng TB | Về Bét (%) | Lá Tồn TB║');
  console.log('╟──────────────────────────────────────────────────────────────────────────────────────────────╢');

  const winRates4P: number[] = [];
  const avgRanks4P: number[] = [];

  for (let i = 0; i < numBots; i++) {
    const b = BENCHMARK_BOTS[i];
    const s = stats4P[i];
    const winRate = (s.firstPlaceWins / s.totalGames) * 100;
    const avgRank = s.rankSum / s.totalGames;
    const lastRate = (s.lastPlaceCount / s.totalGames) * 100;
    const avgCards = s.totalCardsLeft / s.totalGames;

    winRates4P.push(winRate);
    avgRanks4P.push(avgRank);

    console.log(
      `║ Tier ${b.tier} | ${b.name.padEnd(16)} | ${String(b.elo).padStart(5)} | ` +
      `${String(s.totalGames).padStart(6)} |  ${winRate.toFixed(1).padStart(5)}%   |  ` +
      `${avgRank.toFixed(2).padStart(4)}   |  ${lastRate.toFixed(1).padStart(5)}%   |  ` +
      `${avgCards.toFixed(2).padStart(5)}   ║`
    );
  }
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝');

  const pearsonR4P = calculatePearsonCorrelation(eloList1v1, winRates4P);
  const spearmanRho4P = calculateSpearmanCorrelation(eloList1v1, winRates4P);
  console.log(`✓ Hoàn thành Bàn 4P trong ${(duration4P / 1000).toFixed(1)}s | Pearson r = ${pearsonR4P.toFixed(3)} | Spearman ρ = ${spearmanRho4P.toFixed(3)}\n`);

  // =========================================================================
  // BẢNG TỔNG HỢP SO SÁNH TƯƠNG QUAN 3 THỂ THỨC (1v1 vs 3P vs 4P)
  // =========================================================================
  console.log('========================================================================================');
  console.log('🎉 BẢNG TỔNG HỢP SO SÁNH TỶ LỆ VỀ NHẤT (%) TRÊN CẢ 3 THỂ THỨC THI ĐẤU:');
  console.log('========================================================================================');
  console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Tier | Tên Bot          |  Elo  | Solo 1v1 (%) | Bàn 3P (%)  | Bàn 4P (%)  | Hạng TB 4P ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════════════╣');
  for (let i = 0; i < numBots; i++) {
    const b = BENCHMARK_BOTS[i];
    console.log(
      `║ Tier ${b.tier} | ${b.name.padEnd(16)} | ${String(b.elo).padStart(5)} | ` +
      `   ${winRateList1v1[i].toFixed(1).padStart(5)}%   |   ${winRates3P[i].toFixed(1).padStart(5)}%   |   ${winRates4P[i].toFixed(1).padStart(5)}%   |    ${avgRanks4P[i].toFixed(2)}    ║`
    );
  }
  console.log('╠══════════════════════════════════════════════════════════════════════════════════════╣');
  console.log(
    `║ HỆ SỐ TƯƠNG QUAN PEARSON r (Elo vs Tỷ lệ Nhất)  |    ${pearsonR1v1.toFixed(3).padStart(5)}     |    ${pearsonR3P.toFixed(3).padStart(5)}    |    ${pearsonR4P.toFixed(3).padStart(5)}    |            ║`
  );
  console.log(
    `║ HỆ SỐ TƯƠNG QUAN THỨ HẠNG SPEARMAN ρ            |    ${spearmanRho1v1.toFixed(3).padStart(5)}     |    ${spearmanRho3P.toFixed(3).padStart(5)}    |    ${spearmanRho4P.toFixed(3).padStart(5)}    |            ║`
  );
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

  const totalTimeSec = (duration1v1 + duration3P + duration4P) / 1000;
  console.log(`✓ TỔNG VÁN ĐẤU THỰC HIỆN: ${(TOTAL_GAMES_1V1 + TOTAL_GAMES_3P + TOTAL_GAMES_4P).toLocaleString()} ván (7,200 ván 1v1 + 2,520 ván 3P + 2,520 ván 4P).`);
  console.log(`✓ TỔNG THỜI GIAN CHẠY: ${totalTimeSec.toFixed(1)} giây.`);
  console.log('========================================================================================\n');

  assert(higherEloWins1v1 >= 50.0, `Bậc Elo cao hơn 1v1 phải có tỷ lệ thắng >= 50%`);
  assert(pearsonR1v1 >= 0.15, `Pearson r 1v1 phải >= 0.15`);
}

runBenchmark().catch(err => {
  console.error('Lỗi khi chạy benchmark:', err);
  process.exit(1);
});
