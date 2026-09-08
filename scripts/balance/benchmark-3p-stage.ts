import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { GameEngine } from '../../src/engine/game';
import { CardTracker } from '../../src/ai/card-tracker';
import { createBotPlayer } from '../../src/engine/player-factory';

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX, dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function calculateSpearmanRankCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const getRanks = (arr: number[]): number[] => {
    const sorted = arr.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
    const ranks = new Array<number>(arr.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length - 1 && sorted[j + 1].val === sorted[j].val) {
        j++;
      }
      const avgRank = 1 + (i + j) / 2;
      for (let k = i; k <= j; k++) {
        ranks[sorted[k].idx] = avgRank;
      }
      i = j + 1;
    }
    return ranks;
  };

  const rankX = getRanks(x);
  const rankY = getRanks(y);
  return calculatePearsonCorrelation(rankX, rankY);
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  function backtrack(s: number, cur: T[]) {
    if (cur.length === k) { res.push([...cur]); return; }
    for (let i = s; i < arr.length; i++) {
      cur.push(arr[i]);
      backtrack(i + 1, cur);
      cur.pop();
    }
  }
  backtrack(0, []);
  return res;
}

function getPermutations<T>(array: T[]): T[][] {
  const result: T[][] = [];
  function permute(arr: T[], m: T[] = []) {
    if (arr.length === 0) {
      result.push(m);
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice();
        const next = curr.splice(i, 1);
        permute(curr.slice(), m.concat(next));
      }
    }
  }
  permute(array);
  return result;
}

const BENCHMARK_BOTS = [
  { tier: 1, id: 'bot_t1', name: 'Tí Chuột', elo: 700, config: BOT_PERSONAS.BOT_ELO_700 },
  { tier: 2, id: 'bot_t2', name: 'Năm Xích Lô', elo: 1150, config: BOT_PERSONAS.BOT_ELO_1150 },
  { tier: 3, id: 'bot_t3', name: 'Bác Sáu Vàng', elo: 1600, config: BOT_PERSONAS.BOT_ELO_1600 },
  { tier: 4, id: 'bot_t4', name: 'Bạch Hổ KC', elo: 2150, config: BOT_PERSONAS.BOT_ELO_2150 },
  { tier: 5, id: 'bot_t5', name: 'Alpha Mind Boss', elo: 3200, config: BOT_PERSONAS.BOT_ELO_3200 }
];

const triplets = getCombinations(BENCHMARK_BOTS, 3);
const stats: Record<string, { wins: number; games: number; cardsLeft: number; rottenTwos: number; rankSum: number; lastPlaces: number }> = {};
for (const b of BENCHMARK_BOTS) {
  stats[b.id] = { wins: 0, games: 0, cardsLeft: 0, rottenTwos: 0, rankSum: 0, lastPlaces: 0 };
}

console.log('>>> Chạy Benchmark Bàn 3 Người Full Permutation Duplicate (300 ván: 10 tổ hợp x 5 cỗ bài x 6 hoán vị)...');

for (let t = 0; t < triplets.length; t++) {
  const trip = triplets[t];
  const perms = getPermutations(trip);
  for (let g = 0; g < 5; g++) {
    const boardSeed = 6000000 + t * 1000 + g * 97;
    for (const rotated of perms) {
      const game = new GameEngine(
        rotated.map(b => createBotPlayer(b.id, b.config.id, { name: b.name })),
        { mode: 'COUNT_CARDS', betAmount: 100, playerCount: 3 }
      );
      const initRes = game.startNewGame(1, null, boardSeed);
      if (initRes.instantWin && initRes.instantWinner) {
        stats[initRes.instantWinner.id].wins++;
        for (const b of rotated) stats[b.id].games++;
        continue;
      }

      const trackers: Record<string, CardTracker> = {};
      for (const b of rotated) trackers[b.id] = new CardTracker(game.getPlayer(b.id)!.hand, b.config.memoryDepth, 3);

      while (!game.isGameOver) {
        const cur = game.getCurrentPlayer();
        if (!cur) break;
        const bObj = rotated.find(b => b.id === cur.id)!;
        const trk = trackers[cur.id];
        trk.updateOwnHand(cur.hand);
        const res = game.executeBotTurn(bObj.config, trk);
        if (res.action === 'PLAY' && res.playedMove) {
          for (const tr of Object.values(trackers)) tr.recordMove(res.playedMove);
        } else if (game.getLeadingMove()) {
          for (const tr of Object.values(trackers)) tr.recordPassWithDetails(cur.id, game.getLeadingMove()!.combination);
        }
      }

      const winnerId = game.winners[0]?.id;
      if (winnerId) stats[winnerId].wins++;

      // Finish order ranking
      const finishOrder = [...game.winners.map(w => w.id)];
      const losers = rotated.filter(b => !finishOrder.includes(b.id))
        .sort((a, b) => (game.getPlayer(a.id)?.hand.length ?? 0) - (game.getPlayer(b.id)?.hand.length ?? 0));
      for (const l of losers) finishOrder.push(l.id);

      for (let rankIdx = 0; rankIdx < finishOrder.length; rankIdx++) {
        const pId = finishOrder[rankIdx];
        stats[pId].rankSum += (rankIdx + 1);
        if (rankIdx === finishOrder.length - 1) {
          stats[pId].lastPlaces++;
        }
      }

      for (const b of rotated) {
        stats[b.id].games++;
        const p = game.getPlayer(b.id)!;
        stats[b.id].cardsLeft += p.hand.length;
        const hasRottenTwo = p.hand.some(c => c.rank === 15);
        if (hasRottenTwo) stats[b.id].rottenTwos++;
      }
    }
  }
}

console.log('\n========================================================================================');
console.log('                      KẾT QUẢ BENCHMARK BÀN 3 NGƯỜI (300 VÁN)                           ');
console.log('========================================================================================');
console.log('Tier | Tên Bot          | Elo  | Số ván | Thắng (Win%) | Hạng TB | Lá tồn TB | Thối 2 | Đứng Chót%');
console.log('----------------------------------------------------------------------------------------');

const elos: number[] = [];
const winRates: number[] = [];

for (const b of BENCHMARK_BOTS) {
  const s = stats[b.id];
  const winRate = (s.wins / s.games) * 100;
  const avgRank = s.rankSum / s.games;
  const avgCards = s.cardsLeft / s.games;
  const lastRate = (s.lastPlaces / s.games) * 100;
  elos.push(b.elo);
  winRates.push(winRate);

  console.log(
    `T${b.tier}   | ${b.name.padEnd(16)} | ${b.elo.toString().padEnd(4)} | ${s.games.toString().padEnd(6)} | ` +
    `${s.wins.toString().padStart(3)} (${winRate.toFixed(1).padStart(4)}%) | ` +
    `${avgRank.toFixed(2).padStart(7)} | ` +
    `${avgCards.toFixed(2).padStart(9)} | ` +
    `${s.rottenTwos.toString().padStart(6)} | ` +
    `${lastRate.toFixed(1).padStart(5)}%`
  );
}

const pearson = calculatePearsonCorrelation(elos, winRates);
const spearman = calculateSpearmanRankCorrelation(elos, winRates);

console.log('----------------------------------------------------------------------------------------');
console.log(`Pearson Correlation (Elo vs WinRate):  r = ${pearson.toFixed(4)}`);
console.log(`Spearman Rank Correlation:            rho = ${spearman.toFixed(4)}`);
console.log('========================================================================================\n');
