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

const BENCHMARK_BOTS = [
  { tier: 1, id: 'bot_t1', name: 'Tí Chuột', elo: 700, config: BOT_PERSONAS.BOT_ELO_700 },
  { tier: 2, id: 'bot_t2', name: 'Năm Xích Lô', elo: 1150, config: BOT_PERSONAS.BOT_ELO_1150 },
  { tier: 3, id: 'bot_t3', name: 'Bác Sáu Vàng', elo: 1600, config: BOT_PERSONAS.BOT_ELO_1600 },
  { tier: 4, id: 'bot_t4', name: 'Bạch Hổ KC', elo: 2150, config: BOT_PERSONAS.BOT_ELO_2150 },
  { tier: 5, id: 'bot_t5', name: 'Alpha Mind Boss', elo: 3200, config: BOT_PERSONAS.BOT_ELO_3200 }
];

const numBots = BENCHMARK_BOTS.length;
const matrixWins: number[][] = Array.from({ length: numBots }, () => Array(numBots).fill(0));
const botWins: number[] = Array(numBots).fill(0);
const botGames: number[] = Array(numBots).fill(0);

console.log('>>> Chạy Ma Trận Đối Đầu Chéo Solo 1v1 (500 ván Duplicate Hand Swap)...');

for (let i = 0; i < numBots; i++) {
  const botA = BENCHMARK_BOTS[i];
  for (let j = i + 1; j < numBots; j++) {
    const botB = BENCHMARK_BOTS[j];
    let aW = 0, bW = 0;
    for (let b = 0; b < 25; b++) {
      const seed = 2000000 + (i * numBots + j) * 1000 + b * 79;
      // Round 1
      const g1 = new GameEngine([
        createBotPlayer(botA.id, botA.config.id, { name: botA.name }),
        createBotPlayer(botB.id, botB.config.id, { name: botB.name })
      ], { mode: 'COUNT_CARDS', betAmount: 100, playerCount: 2 });
      g1.startNewGame(1, null, seed);
      const t1 = {
        [botA.id]: new CardTracker(g1.getPlayer(botA.id)!.hand, botA.config.memoryDepth, 2),
        [botB.id]: new CardTracker(g1.getPlayer(botB.id)!.hand, botB.config.memoryDepth, 2)
      };
      while (!g1.isGameOver) {
        const cur = g1.getCurrentPlayer()!;
        const cfg = cur.id === botA.id ? botA.config : botB.config;
        t1[cur.id].updateOwnHand(cur.hand);
        const res = g1.executeBotTurn(cfg, t1[cur.id]);
        if (res.action === 'PLAY' && res.playedMove) {
          t1[botA.id].recordMove(res.playedMove);
          t1[botB.id].recordMove(res.playedMove);
        } else if (g1.getLeadingMove()) {
          t1[botA.id].recordPassWithDetails(cur.id, g1.getLeadingMove()!.combination);
          t1[botB.id].recordPassWithDetails(cur.id, g1.getLeadingMove()!.combination);
        }
      }
      if (g1.winners[0]?.id === botA.id) aW++; else bW++;

      // Round 2 (swap)
      const g2 = new GameEngine([
        createBotPlayer(botB.id, botB.config.id, { name: botB.name }),
        createBotPlayer(botA.id, botA.config.id, { name: botA.name })
      ], { mode: 'COUNT_CARDS', betAmount: 100, playerCount: 2 });
      g2.startNewGame(1, null, seed);
      const t2 = {
        [botA.id]: new CardTracker(g2.getPlayer(botA.id)!.hand, botA.config.memoryDepth, 2),
        [botB.id]: new CardTracker(g2.getPlayer(botB.id)!.hand, botB.config.memoryDepth, 2)
      };
      while (!g2.isGameOver) {
        const cur = g2.getCurrentPlayer()!;
        const cfg = cur.id === botA.id ? botA.config : botB.config;
        t2[cur.id].updateOwnHand(cur.hand);
        const res = g2.executeBotTurn(cfg, t2[cur.id]);
        if (res.action === 'PLAY' && res.playedMove) {
          t2[botA.id].recordMove(res.playedMove);
          t2[botB.id].recordMove(res.playedMove);
        } else if (g2.getLeadingMove()) {
          t2[botA.id].recordPassWithDetails(cur.id, g2.getLeadingMove()!.combination);
          t2[botB.id].recordPassWithDetails(cur.id, g2.getLeadingMove()!.combination);
        }
      }
      if (g2.winners[0]?.id === botA.id) aW++; else bW++;
    }
    matrixWins[i][j] = aW;
    matrixWins[j][i] = bW;
    botWins[i] += aW;
    botWins[j] += bW;
    botGames[i] += 50;
    botGames[j] += 50;
  }
}

console.log('\n--- KẾT QUẢ MA TRẬN 1v1 DUPLICATE HAND SWAP ---');
BENCHMARK_BOTS.forEach((b, i) => {
  const rate = (botWins[i] / botGames[i]) * 100;
  console.log(`T${b.tier} (${b.name.padEnd(16)} - Elo ${b.elo}): ${botWins[i]}/${botGames[i]} (${rate.toFixed(1)}%) | Đối đầu: ${matrixWins[i].map((w, idx) => i === idx ? ' -  ' : `${w}/50`).join(' ')}`);
});
const elos = BENCHMARK_BOTS.map(b => b.elo);
const rates = botWins.map((w, i) => (w / botGames[i]) * 100);
console.log('\nPearson r 1v1:', calculatePearsonCorrelation(elos, rates).toFixed(3));
