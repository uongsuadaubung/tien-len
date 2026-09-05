/**
 * ============================================================================
 * BENCHMARK SCRIPT: ĐO ĐẠC TƯƠNG QUAN TỶ LỆ THẮNG & STRESS TEST 9 BẬC ELO
 * ============================================================================
 * Chạy độc lập theo yêu cầu: bun run benchmark:ai
 * Không bị chạy tự động khi gõ `bun test` thông thường.
 *
 * Bao gồm:
 * 1. 10,000 tình huống Stress Test bất biến logic & luật chơi trên bàn 2, 3, 4 người.
 * 2. 1,000 ván đấu thực nghiệm Bàn 2 Người (Solo 1v1 - 26 lá nọc).
 * 3. 1,000 ván đấu thực nghiệm Bàn 3 Người (13 lá nọc).
 * 4. 1,000 ván đấu thực nghiệm Bàn 4 Người (Chuẩn 52 lá không nọc).
 */

import { GameEngine } from '../src/engine/game';
import { CardTracker } from '../src/ai/card-tracker';
import { BOT_PERSONAS } from '../src/ai/bot-factory';
import { Card, PlayedMove, Player, createDefaultGameRules } from '../src/engine/types';
import { createDeck } from '../src/engine/deck';
import { sortCards } from '../src/engine/card';
import { isValidMove, canBeat } from '../src/engine/validator';
import { makeBotDecision, createDecisionContext } from '../src/ai/decision-maker';
import { createBotPlayer } from '../src/engine/player-factory';
import { identifyCombination } from '../src/engine/combinations';

// --- HÀM ASSERT ĐƠN GIẢN ---
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

// --- BỘ TẠO SỐ NGẪU NHIÊN DETERMINISTIC ---
function createMulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleDeck(cards: Card[], rng: () => number): Card[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

function extractValidMoveFromCards(cards: Card[], rng: () => number): Card[] {
  if (cards.length === 0) return [];
  const single = [cards[Math.floor(rng() * cards.length)]];
  return single;
}

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

async function runBenchmark() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        HỆ THỐNG BENCHMARK AI TIẾN LÊN MIỀN NAM: 9 BẬC ELO & 3 QUY MÔ BÀN          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

  // =========================================================================
  // PHẦN 1: 10,000 TÌNH HUỐNG DECISION STRESS TEST
  // =========================================================================
  console.log('>>> [PHẦN 1] BẮT ĐẦU 10,000 TÌNH HUỐNG STRESS TEST BẤT BIẾN LOGIC...');
  const TOTAL_TEST_CASES = 10000;
  let playCount = 0;
  let passCount = 0;
  const allPersonas = Object.values(BOT_PERSONAS);
  const start1 = performance.now();

  for (let i = 0; i < TOTAL_TEST_CASES; i++) {
    const rng = createMulberry32(20260905 + i * 41);
    const botConfig = allPersonas[i % allPersonas.length];
    const playerCount = (i % 3) + 2;

    const deck = shuffleDeck(createDeck(), rng);
    const handSize = (i % 13) + 1;
    const hand = sortCards(deck.slice(0, handSize));
    const remainingPool = deck.slice(handSize);

    const remainingPlayerCards: Record<string, number> = { 'bot_tester': handSize };
    for (let p = 1; p < playerCount; p++) {
      remainingPlayerCards[`opp_${p}`] = Math.max(1, Math.floor(rng() * 13) + 1);
    }

    const isLead = (i % 2 === 0);
    const hasThreeOfSpades = hand.some(c => c.rank === 3 && c.suit === 'SPADES');
    const isFirstMoveOfGame = isLead && hasThreeOfSpades && (i % 10 === 0);
    let currentRoundLeadingMove: PlayedMove | null = null;

    if (!isLead) {
      const targetCards = extractValidMoveFromCards(remainingPool, rng);
      if (targetCards.length > 0) {
        const combo = identifyCombination(targetCards);
        if (combo) {
          currentRoundLeadingMove = {
            playerId: 'opp_prev',
            combination: combo,
            timestamp: Date.now(),
            isChop: false
          };
        }
      }
    }

    const tracker = new CardTracker(hand, botConfig.memoryDepth, playerCount);
    const decisionContext = createDecisionContext({
      hand,
      currentRoundLeadingMove: currentRoundLeadingMove ?? null,
      isFirstMoveOfGame,
      isLeadMove: isLead || !currentRoundLeadingMove,
      tracker,
      config: botConfig,
      remainingPlayerCards,
      nextPlayerId: 'opp_1',
      rules: createDefaultGameRules({
        settlementRule: (['COUNT_CARDS', 'TRADITIONAL', 'WINNER_TAKES_ALL'] as const)[i % 3],
        gameFlow: { prohibitEndingWithTwo: false }
      }),
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: false,
      prohibitEndingWithTwo: false,
      gameMode: (['COUNT_CARDS', 'TRADITIONAL', 'WINNER_TAKES_ALL'] as const)[i % 3],
      mctsMap: null,
      compositeRuleStrategy: null,
      opponentProfiles: null
    });

    const decision = makeBotDecision(decisionContext);

    if (decision.type === 'PLAY') {
      playCount++;
      const playedCards = decision.cards || [];
      assert(playedCards.length > 0, `Nước đi PLAY phải có ít nhất 1 lá`);
      for (const c of playedCards) {
        assert(hand.some(h => h.id === c.id), `Lá bài ${c.id} không thuộc bài trên tay bot`);
      }
      const valRes = isValidMove({
        cards: [...playedCards],
        target: currentRoundLeadingMove?.combination || null,
        isFirstMoveOfGame,
        isLeadMove: isLead || !currentRoundLeadingMove,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: playedCards.length === hand.length,
        prohibitEndingWithTwo: false
      });
      assert(valRes.valid, `Nước đi không hợp lệ theo luật Tiến Lên: ${valRes.reason}`);

      if (currentRoundLeadingMove && valRes.combination) {
        const beatRes = canBeat(valRes.combination, currentRoundLeadingMove.combination);
        assert(beatRes.valid, `Bài đánh ra (${valRes.combination.type}) không chặt được bài trên bàn`);
      }
    } else {
      passCount++;
      assert(!isLead, `Cầm cái dẫn đầu vòng chơi TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ LƯỢT`);
    }
  }

  const time1 = performance.now() - start1;
  console.log(`✓ Hoàn tất 10,000 tình huống trong ${time1.toFixed(1)} ms (${(time1 / TOTAL_TEST_CASES).toFixed(3)} ms/nước đi)`);
  console.log(`  - Tỷ lệ ra bài (PLAY): ${playCount}/${TOTAL_TEST_CASES} (${((playCount / TOTAL_TEST_CASES) * 100).toFixed(1)}%)`);
  console.log(`  - Tỷ lệ nhịn bài (PASS): ${passCount}/${TOTAL_TEST_CASES} (${((passCount / TOTAL_TEST_CASES) * 100).toFixed(1)}%)\n`);

  // =========================================================================
  // PHẦN 2: 1,000 TRẬN ĐẤU BÀN 2 NGƯỜI (SOLO 1V1)
  // =========================================================================
  console.log('========================================================================================');
  console.log('>>> [PHẦN 2] KHỞI CHẠY 1,000 TRẬN ĐẤU BÀN 2 NGƯỜI (SOLO 1V1 - 125 VÁN / CẶP)...');
  console.log('----------------------------------------------------------------------------------------');
  const TOTAL_GAMES_1V1 = 1000;
  const PAIRS_COUNT = 8;
  const GAMES_PER_PAIR = Math.floor(TOTAL_GAMES_1V1 / PAIRS_COUNT);

  const deltaEloList: number[] = [];
  const winRateList: number[] = [];
  const start2 = performance.now();
  const botBaseline = BENCHMARK_BOTS[0]; // Tier 1

  for (let p = 1; p <= PAIRS_COUNT; p++) {
    const botHigh = BENCHMARK_BOTS[p];
    let highWins = 0;
    let highTotalCards = 0;
    let lowTotalCards = 0;

    for (let g = 0; g < GAMES_PER_PAIR; g++) {
      const gameSeed = 1000000 + p * 20000 + g * 31;
      const seatHighFirst = g % 2 === 0;
      const matchupBots = seatHighFirst ? [botHigh, botBaseline] : [botBaseline, botHigh];

      const res = simulateSingleMatch(matchupBots, 2, g + 1, gameSeed);

      if (res.winnerId === botHigh.id) highWins++;
      highTotalCards += res.cardsLeft[botHigh.id] ?? 0;
      lowTotalCards += res.cardsLeft[botBaseline.id] ?? 0;
    }

    const deltaElo = botHigh.elo - botBaseline.elo;
    const empiricalWinRate = (highWins / GAMES_PER_PAIR) * 100;
    const theoreticalWinRate = (1 / (1 + Math.pow(10, -deltaElo / 400))) * 100;

    deltaEloList.push(deltaElo);
    winRateList.push(empiricalWinRate);

    const highAvgCards = highTotalCards / GAMES_PER_PAIR;
    const lowAvgCards = lowTotalCards / GAMES_PER_PAIR;

    console.log(`[Cặp ${p}] Tier ${botBaseline.tier} (${botBaseline.elo}) vs Tier ${botHigh.tier} (${botHigh.elo}) | ΔElo: +${deltaElo} | Thắng: ${highWins}/${GAMES_PER_PAIR} (${empiricalWinRate.toFixed(1)}%) | Lý thuyết Elo: ${theoreticalWinRate.toFixed(1)}% | Lá tồn: ${highAvgCards.toFixed(2)} vs ${lowAvgCards.toFixed(2)}`);
  }

  const time2 = performance.now() - start2;
  const avgWinRate1v1 = winRateList.reduce((a, b) => a + b, 0) / winRateList.length;
  const totalHighWins = Math.round((avgWinRate1v1 / 100) * TOTAL_GAMES_1V1);

  console.log('----------------------------------------------------------------------------------------');
  console.log(`✓ Hoàn thành 1,000 ván Solo 1v1 trong ${time2.toFixed(1)} ms (${(time2 / TOTAL_GAMES_1V1).toFixed(2)} ms/ván)`);
  console.log(`  - Tỷ lệ thắng trung bình của Bot bậc cao trước Tier 1: ${avgWinRate1v1.toFixed(1)}%`);
  console.log(`  - Tổng số ván thắng của Bot bậc cao: ${totalHighWins}/${TOTAL_GAMES_1V1} (${((totalHighWins / TOTAL_GAMES_1V1) * 100).toFixed(1)}%)\n`);

  assert(totalHighWins >= 500, `Bot bậc cao phải thắng đa số trận`);
  assert(avgWinRate1v1 >= 51.0, `Tỷ lệ thắng trung bình của bậc cao phải >= 51%`);

  // =========================================================================
  // PHẦN 3: 1,000 TRẬN ĐẤU BÀN 3 NGƯỜI
  // =========================================================================
  console.log('========================================================================================');
  console.log('>>> [PHẦN 3] KHỞI CHẠY 1,000 TRẬN ĐẤU BÀN 3 NGƯỜI (13 LÁ NỌC - 9 BẬC XOAY VÒNG)...');
  console.log('----------------------------------------------------------------------------------------');
  const TOTAL_GAMES_3P = 1000;
  const stats3P: Record<string, { games: number; firstWins: number; secondWins: number; thirdWins: number; totalCardsLeft: number }> = {};
  for (const b of BENCHMARK_BOTS) {
    stats3P[b.id] = { games: 0, firstWins: 0, secondWins: 0, thirdWins: 0, totalCardsLeft: 0 };
  }

  const start3 = performance.now();
  for (let g = 0; g < TOTAL_GAMES_3P; g++) {
    const seed = 3000000 + g * 37;
    const rng = createMulberry32(seed);
    const shuffled = [...BENCHMARK_BOTS].sort(() => rng() - 0.5);
    const tableBots = shuffled.slice(0, 3);

    const res = simulateSingleMatch(tableBots, 3, g + 1, seed);

    for (let rank = 0; rank < res.rankOrder.length; rank++) {
      const pid = res.rankOrder[rank];
      if (stats3P[pid]) {
        stats3P[pid].games++;
        if (rank === 0) stats3P[pid].firstWins++;
        else if (rank === 1) stats3P[pid].secondWins++;
        else stats3P[pid].thirdWins++;
        stats3P[pid].totalCardsLeft += res.cardsLeft[pid] ?? 0;
      }
    }
  }

  const time3 = performance.now() - start3;
  const tierList3P: number[] = [];
  const winRateList3P: number[] = [];

  BENCHMARK_BOTS.forEach(b => {
    const data = stats3P[b.id];
    const winRate = data.games > 0 ? (data.firstWins / data.games) * 100 : 0;
    const secondRate = data.games > 0 ? (data.secondWins / data.games) * 100 : 0;
    const thirdRate = data.games > 0 ? (data.thirdWins / data.games) * 100 : 0;
    const avgCards = data.games > 0 ? data.totalCardsLeft / data.games : 0;

    tierList3P.push(b.tier);
    winRateList3P.push(winRate);

    console.log(`Tier ${b.tier} | ${b.name.padEnd(16)} (Elo ${b.elo}): ${data.firstWins}/${data.games} Nhất (${winRate.toFixed(1)}%) | Nhì: ${secondRate.toFixed(1)}% | Ba: ${thirdRate.toFixed(1)}% | Lá tồn TB: ${avgCards.toFixed(2)}`);
  });

  const spearmanRho3P = calculateSpearmanCorrelation(tierList3P, winRateList3P);
  console.log('----------------------------------------------------------------------------------------');
  console.log(`✓ Hoàn thành 1,000 ván bàn 3 người trong ${time3.toFixed(1)} ms (${(time3 / TOTAL_GAMES_3P).toFixed(2)} ms/ván)`);
  console.log(`  - Hệ số tương quan thứ hạng Spearman: ρ = ${spearmanRho3P.toFixed(3)}\n`);

  assert(spearmanRho3P >= 0.30, `Spearman rho bàn 3 người phải >= 0.30`);

  // =========================================================================
  // PHẦN 4: 1,000 TRẬN ĐẤU BÀN 4 NGƯỜI
  // =========================================================================
  console.log('========================================================================================');
  console.log('>>> [PHẦN 4] KHỞI CHẠY 1,000 TRẬN ĐẤU BÀN 4 NGƯỜI (CHUẨN 52 LÁ - 9 BẬC XOAY VÒNG)...');
  console.log('----------------------------------------------------------------------------------------');
  const TOTAL_GAMES_4P = 1000;
  const stats4P: Record<string, { games: number; rank1: number; rank2: number; rank3: number; rank4: number; totalCardsLeft: number }> = {};
  for (const b of BENCHMARK_BOTS) {
    stats4P[b.id] = { games: 0, rank1: 0, rank2: 0, rank3: 0, rank4: 0, totalCardsLeft: 0 };
  }

  const start4 = performance.now();
  for (let g = 0; g < TOTAL_GAMES_4P; g++) {
    const seed = 4000000 + g * 47;
    const rng = createMulberry32(seed);
    const shuffled = [...BENCHMARK_BOTS].sort(() => rng() - 0.5);
    const tableBots = shuffled.slice(0, 4);

    const res = simulateSingleMatch(tableBots, 4, g + 1, seed);

    for (let rank = 0; rank < res.rankOrder.length; rank++) {
      const pid = res.rankOrder[rank];
      if (stats4P[pid]) {
        stats4P[pid].games++;
        if (rank === 0) stats4P[pid].rank1++;
        else if (rank === 1) stats4P[pid].rank2++;
        else if (rank === 2) stats4P[pid].rank3++;
        else stats4P[pid].rank4++;
        stats4P[pid].totalCardsLeft += res.cardsLeft[pid] ?? 0;
      }
    }
  }

  const time4 = performance.now() - start4;
  const eloList4P: number[] = [];
  const winRateList4P: number[] = [];
  const avgRankList4P: number[] = [];

  BENCHMARK_BOTS.forEach(b => {
    const data = stats4P[b.id];
    const winRate = data.games > 0 ? (data.rank1 / data.games) * 100 : 0;
    const r2Rate = data.games > 0 ? (data.rank2 / data.games) * 100 : 0;
    const r3Rate = data.games > 0 ? (data.rank3 / data.games) * 100 : 0;
    const r4Rate = data.games > 0 ? (data.rank4 / data.games) * 100 : 0;
    const avgPlacement = data.games > 0
      ? (data.rank1 * 1 + data.rank2 * 2 + data.rank3 * 3 + data.rank4 * 4) / data.games
      : 4.0;
    const avgCards = data.games > 0 ? data.totalCardsLeft / data.games : 0;

    eloList4P.push(b.elo);
    winRateList4P.push(winRate);
    avgRankList4P.push(avgPlacement);

    console.log(`Tier ${b.tier} | ${b.name.padEnd(16)} (Elo ${b.elo}): ${data.rank1}/${data.games} Nhất (${winRate.toFixed(1)}%) | Nhì: ${r2Rate.toFixed(1)}% | Ba: ${r3Rate.toFixed(1)}% | Bét: ${r4Rate.toFixed(1)}% | Thứ hạng TB: ${avgPlacement.toFixed(2)} | Lá tồn: ${avgCards.toFixed(2)}`);
  });

  const pearsonR4P = calculatePearsonCorrelation(eloList4P, winRateList4P);
  const spearmanRho4P = calculateSpearmanCorrelation(eloList4P, winRateList4P);

  console.log('----------------------------------------------------------------------------------------');
  console.log(`✓ Hoàn thành 1,000 ván bàn 4 người trong ${time4.toFixed(1)} ms (${(time4 / TOTAL_GAMES_4P).toFixed(2)} ms/ván)`);
  console.log(`  - Hệ số tương quan Pearson giữa Elo và Tỷ lệ về Nhất: r = ${pearsonR4P.toFixed(3)}`);
  console.log(`  - Hệ số tương quan thứ hạng Spearman: ρ = ${spearmanRho4P.toFixed(3)}\n`);

  assert(pearsonR4P >= 0.20, `Pearson r bàn 4 người phải >= 0.20`);
  assert(spearmanRho4P >= 0.20, `Spearman rho bàn 4 người phải >= 0.20`);

  const bottomAvgRank = (avgRankList4P[0] + avgRankList4P[1] + avgRankList4P[2]) / 3;
  const topAvgRank = (avgRankList4P[3] + avgRankList4P[4] + avgRankList4P[5] + avgRankList4P[6] + avgRankList4P[7] + avgRankList4P[8]) / 6;
  assert(topAvgRank < bottomAvgRank, `Thứ hạng trung bình của Top Elo phải tốt hơn Bottom Elo`);

  const totalTime = time1 + time2 + time3 + time4;
  console.log('========================================================================================');
  console.log(`🎉 BENCHMARK HOÀN TẤT THÀNH CÔNG!`);
  console.log(`- Tổng số: 10,000 Stress tests + 3,000 Ván đấu Full Game hoàn chỉnh.`);
  console.log(`- Tổng thời gian thực thi: ${(totalTime / 1000).toFixed(1)} giây.`);
  console.log('========================================================================================\n');
}

runBenchmark().catch(err => {
  console.error('Lỗi khi chạy benchmark:', err);
  process.exit(1);
});
