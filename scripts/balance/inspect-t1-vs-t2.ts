import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { GameEngine } from '../../src/engine/game';
import { CardTracker } from '../../src/ai/card-tracker';
import { createBotPlayer } from '../../src/engine/player-factory';

const botA = { tier: 1, id: 'bot_t1', name: 'Tí Chuột', elo: 700, config: BOT_PERSONAS.BOT_ELO_700 };
const botB = { tier: 2, id: 'bot_t2', name: 'Năm Xích Lô', elo: 1150, config: BOT_PERSONAS.BOT_ELO_1150 };

let aWins = 0;
let bWins = 0;

console.log('>>> Chạy Kiểm Tra Đối Đầu Trực Tiếp Tier 1 (700) vs Tier 2 (1150) - 50 Ván Duplicate...');

for (let b = 0; b < 25; b++) {
  const boardSeed = 2000000 + (0 * 5 + 1) * 1000 + b * 79;
  for (let rot = 0; rot < 2; rot++) {
    const pA = rot === 0 ? botA : botB;
    const pB = rot === 0 ? botB : botA;
    const players = [
      createBotPlayer(pA.id, pA.config.id, { name: pA.name }),
      createBotPlayer(pB.id, pB.config.id, { name: pB.name })
    ];
    const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100, playerCount: 2 });
    game.startNewGame(1, null, boardSeed);

    const trackers: Record<string, CardTracker> = {
      [pA.id]: new CardTracker(game.getPlayer(pA.id)!.hand, pA.config.memoryDepth, 2),
      [pB.id]: new CardTracker(game.getPlayer(pB.id)!.hand, pB.config.memoryDepth, 2)
    };

    while (!game.isGameOver) {
      const cur = game.getCurrentPlayer();
      if (!cur) break;
      const bObj = cur.id === botA.id ? botA : botB;
      const t = trackers[cur.id];
      t.updateOwnHand(cur.hand);
      const res = game.executeBotTurn(bObj.config, t);
      if (res.action === 'PLAY' && res.playedMove) {
        for (const tr of Object.values(trackers)) tr.recordMove(res.playedMove);
      } else {
        const lead = game.getLeadingMove();
        if (lead) {
          for (const tr of Object.values(trackers)) tr.recordPassWithDetails(cur.id, lead.combination);
        }
      }
    }

    const winner = game.winners[0];
    if (winner.id === botA.id) {
      aWins++;
    } else {
      bWins++;
    }
  }
}

console.log(`\nKết quả đối đầu trực tiếp:`);
console.log(`T1 (${botA.name}): ${aWins}/50 (${((aWins / 50) * 100).toFixed(1)}%)`);
console.log(`T2 (${botB.name}): ${bWins}/50 (${((bWins / 50) * 100).toFixed(1)}%)`);
