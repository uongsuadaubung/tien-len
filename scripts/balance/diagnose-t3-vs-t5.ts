import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { GameEngine } from '../../src/engine/game';
import { CardTracker } from '../../src/ai/card-tracker';
import { createBotPlayer } from '../../src/engine/player-factory';

const t3 = { tier: 3, id: 'bot_t3', name: 'Bác Sáu Vàng', elo: 1600, config: BOT_PERSONAS.BOT_ELO_1600 };
const t5 = { tier: 5, id: 'bot_t5', name: 'Alpha Mind Boss', elo: 3200, config: BOT_PERSONAS.BOT_ELO_3200 };

let t3Wins = 0;
let t5Wins = 0;

console.log('>>> Chạy Kiểm Tra Đối Đầu Trực Tiếp Tier 3 (1600) vs Tier 5 (3200) - 50 Ván Duplicate...');

for (let b = 0; b < 25; b++) {
  const boardSeed = 2000000 + (2 * 5 + 4) * 1000 + b * 79;
  for (let rot = 0; rot < 2; rot++) {
    const pA = rot === 0 ? t3 : t5;
    const pB = rot === 0 ? t5 : t3;
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
      const bObj = cur.id === t3.id ? t3 : t5;
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
    if (winner.id === t3.id) {
      t3Wins++;
    } else {
      t5Wins++;
    }
  }
}

console.log(`\nKết quả đối đầu trực tiếp:`);
console.log(`T3 (${t3.name}): ${t3Wins}/50 (${((t3Wins / 50) * 100).toFixed(1)}%)`);
console.log(`T5 (${t5.name}): ${t5Wins}/50 (${((t5Wins / 50) * 100).toFixed(1)}%)`);
