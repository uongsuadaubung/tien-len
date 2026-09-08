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

const quadruplets = getCombinations(BENCHMARK_BOTS, 4);
const wins = [0, 0, 0, 0, 0];
const lastPlaceCount = [0, 0, 0, 0, 0];
const rankSum = [0, 0, 0, 0, 0];
const totalCardsLeft = [0, 0, 0, 0, 0];
const games = [0, 0, 0, 0, 0];

console.log('>>> Chạy Benchmark Bàn 4 Người Full Permutation Duplicate (240 ván: 5 tổ hợp x 2 cỗ bài x 24 hoán vị)...');

for (let qIdx = 0; qIdx < quadruplets.length; qIdx++) {
  const quad = quadruplets[qIdx];
  const perms = getPermutations(quad);
  for (let board = 0; board < 2; board++) {
    const seed = 4000000 + qIdx * 1000 + board * 89;
    for (const seated of perms) {
      const players = seated.map(b => createBotPlayer(b.id, b.config.id, { name: b.name }));
      const g = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100, playerCount: 4 });
      const initRes = g.startNewGame(1, null, seed);
      if (initRes.instantWin && initRes.instantWinner) {
        const wIdx = BENCHMARK_BOTS.findIndex(b => b.id === initRes.instantWinner!.id);
        wins[wIdx]++;
        for (const b of seated) {
          const idx = BENCHMARK_BOTS.findIndex(bm => bm.id === b.id);
          games[idx]++;
        }
        continue;
      }
      const trackers: Record<string, CardTracker> = {};
      for (const b of seated) trackers[b.id] = new CardTracker(g.getPlayer(b.id)!.hand, b.config.memoryDepth, 4);

      while (!g.isGameOver) {
        const cur = g.getCurrentPlayer();
        if (!cur) break;
        const bObj = seated.find(b => b.id === cur.id)!;
        const t = trackers[cur.id];
        t.updateOwnHand(cur.hand);
        const res = g.executeBotTurn(bObj.config, t);
        if (res.action === 'PLAY' && res.playedMove) {
          for (const tr of Object.values(trackers)) tr.recordMove(res.playedMove);
        } else if (g.getLeadingMove()) {
          for (const tr of Object.values(trackers)) tr.recordPassWithDetails(cur.id, g.getLeadingMove()!.combination);
        }
      }
      const wId = g.winners[0]?.id;
      const wIdx = BENCHMARK_BOTS.findIndex(b => b.id === wId);
      if (wIdx >= 0) wins[wIdx]++;

      const rankOrder = g.winners.map(w => w.id);
      const losers = seated
        .filter(b => !rankOrder.includes(b.id))
        .sort((a, b) => (g.getPlayer(a.id)?.hand.length ?? 0) - (g.getPlayer(b.id)?.hand.length ?? 0))
        .map(b => b.id);
      const fullRank = [...rankOrder, ...losers];

      for (const b of seated) {
        const idx = BENCHMARK_BOTS.findIndex(bm => bm.id === b.id);
        games[idx]++;
        const finalRank = fullRank.indexOf(b.id) + 1;
        rankSum[idx] += finalRank;
        if (finalRank === 4) lastPlaceCount[idx]++;
        const p = g.getPlayer(b.id);
        if (p) totalCardsLeft[idx] += p.hand.length;
      }
    }
  }
}

console.log('\n--- KẾT QUẢ BÀN 4 NGƯỜI DUPLICATE ROTATION ---');
BENCHMARK_BOTS.forEach((b, i) => {
  const winRate = ((wins[i] / games[i]) * 100).toFixed(1);
  const avgRank = (rankSum[i] / games[i]).toFixed(2);
  const lastRate = ((lastPlaceCount[i] / games[i]) * 100).toFixed(1);
  const avgCards = (totalCardsLeft[i] / games[i]).toFixed(2);
  console.log(`T${b.tier} (${b.name.padEnd(16)} - Elo ${b.elo}): ${wins[i]}/${games[i]} (${winRate}%) | Hạng TB: ${avgRank} | Về Bét: ${lastRate}% | Lá tồn TB: ${avgCards}`);
});
const elos = BENCHMARK_BOTS.map(b => b.elo);
const winRates = BENCHMARK_BOTS.map((b, i) => (wins[i] / games[i]) * 100);
console.log('\nPearson r 4P:', calculatePearsonCorrelation(elos, winRates).toFixed(3));
