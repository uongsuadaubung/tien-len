import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { GameEngine } from '../../src/engine/game';
import { CardTracker } from '../../src/ai/card-tracker';
import { createBotPlayer } from '../../src/engine/player-factory';

function run1v1(botAConfig: any, botBConfig: any, label: string) {
  let aWins = 0;
  let bWins = 0;
  for (let b = 0; b < 25; b++) {
    const seed = 2000000 + (3 * 5 + 4) * 1000 + b * 79;
    for (let rot = 0; rot < 2; rot++) {
      const pA = rot === 0 ? { id: 'A', name: 'Bot A', config: botAConfig } : { id: 'B', name: 'Bot B', config: botBConfig };
      const pB = rot === 0 ? { id: 'B', name: 'Bot B', config: botBConfig } : { id: 'A', name: 'Bot A', config: botAConfig };

      const game = new GameEngine([
        createBotPlayer(pA.id, pA.config.id, { name: pA.name }),
        createBotPlayer(pB.id, pB.config.id, { name: pB.name })
      ], { mode: 'COUNT_CARDS', betAmount: 100, playerCount: 2 });
      game.startNewGame(1, null, seed);

      const trackers = {
        [pA.id]: new CardTracker(game.getPlayer(pA.id)!.hand, pA.config.memoryDepth, 2),
        [pB.id]: new CardTracker(game.getPlayer(pB.id)!.hand, pB.config.memoryDepth, 2)
      };

      while (!game.isGameOver) {
        const cur = game.getCurrentPlayer()!;
        const cfg = cur.id === 'A' ? botAConfig : botBConfig;
        trackers[cur.id].updateOwnHand(cur.hand);
        const res = game.executeBotTurn(cfg, trackers[cur.id]);
        if (res.action === 'PLAY' && res.playedMove) {
          trackers.A.recordMove(res.playedMove);
          trackers.B.recordMove(res.playedMove);
        } else if (game.getLeadingMove()) {
          trackers.A.recordPassWithDetails(cur.id, game.getLeadingMove()!.combination);
          trackers.B.recordPassWithDetails(cur.id, game.getLeadingMove()!.combination);
        }
      }
      if (game.winners[0]?.id === 'A') aWins++; else bWins++;
    }
  }
  console.log(`${label}: A thắng ${aWins}/50 (${((aWins / 50) * 100).toFixed(1)}%), B thắng ${bWins}/50 (${((bWins / 50) * 100).toFixed(1)}%)`);
}

console.log('--- ĐO ĐẠC TÁC ĐỘNG MCTS TRONG 1v1 (50 VÁN DUPLICATE) ---');
run1v1(BOT_PERSONAS.BOT_ELO_3200, { ...BOT_PERSONAS.BOT_ELO_3200, mctsSimulations: 0 }, 'T5 (MCTS 50) vs T5 (MCTS 0)');
run1v1(BOT_PERSONAS.BOT_ELO_2150, BOT_PERSONAS.BOT_ELO_3200, 'T4 (MCTS 0) vs T5 (MCTS 50)');
run1v1(BOT_PERSONAS.BOT_ELO_2150, { ...BOT_PERSONAS.BOT_ELO_3200, mctsSimulations: 0 }, 'T4 (MCTS 0) vs T5 (MCTS 0)');
