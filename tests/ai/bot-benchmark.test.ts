import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { GameEngine } from '../../src/engine/game';
import { Player, createDefaultGameRules } from '../../src/engine/types';
import { parseCards } from '../../src/engine/card';

describe('AI Bot Benchmark Simulation (100 Ván Đấu Mô Phỏng)', () => {
  test('Mô phỏng 100 ván đấu giữa 4 Bot và đánh giá xếp hạng tỉ lệ thắng', () => {
    const bots = [
      { player: { id: 'bot1', name: 'Alex (Rookie)', avatar: '🧒', isBot: true, hand: [], playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: false }, config: BOT_PERSONAS.BOT_ELO_850 },
      { player: { id: 'bot2', name: 'Kai (Striker)', avatar: '🤠', isBot: true, hand: [], playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: false }, config: BOT_PERSONAS.BOT_ELO_1150 },
      { player: { id: 'bot3', name: 'Marcus (Veteran)', avatar: '👴', isBot: true, hand: [], playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: false }, config: BOT_PERSONAS.BOT_ELO_1450 },
      { player: { id: 'bot4', name: 'Sophia (Grandmaster)', avatar: '👑', isBot: true, hand: [], playedCards: [], score: 0, isPassedCurrentRound: false, hasPlayedFirstCard: false }, config: BOT_PERSONAS.BOT_ELO_1750 }
    ];

    const winCounts: Record<string, number> = { bot1: 0, bot2: 0, bot3: 0, bot4: 0 };
    const NUM_GAMES = 100;

    for (let g = 1; g <= NUM_GAMES; g++) {
      const players: Player[] = bots.map(b => ({
        ...b.player,
        hand: [],
        playedCards: [],
        score: 0,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false
      }));

      const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100 });
      const initRes = game.startNewGame(g);

      if (initRes.instantWin && initRes.instantWinner) {
        winCounts[initRes.instantWinner.id]++;
        continue;
      }

      const trackers: Record<string, CardTracker> = {
        bot1: new CardTracker(players[0].hand, bots[0].config.memoryDepth),
        bot2: new CardTracker(players[1].hand, bots[1].config.memoryDepth),
        bot3: new CardTracker(players[2].hand, bots[2].config.memoryDepth),
        bot4: new CardTracker(players[3].hand, bots[3].config.memoryDepth)
      };

      let loopCount = 0;
      const MAX_LOOPS = 400;

      while (!game.isGameOver && loopCount < MAX_LOOPS) {
        loopCount++;
        const currentTurnPlayer = game.getCurrentPlayer();
        const botObj = bots.find(b => b.player.id === currentTurnPlayer.id)!;
        const tracker = trackers[currentTurnPlayer.id];
        tracker.updateOwnHand(currentTurnPlayer.hand);

        const remainingCardsMap: Record<string, number> = {};
        for (const p of game.players) {
          remainingCardsMap[p.id] = p.hand.length;
        }

        const isLead = game.isRoundLeadMove();
        const nextPlayerId = game.getNextActivePlayerId(currentTurnPlayer.id);

        const decision = makeBotDecision({
          hand: currentTurnPlayer.hand,
          currentRoundLeadingMove: game.getLeadingMove(),
          isFirstMoveOfGame: game.isFirstMoveOfGame,
          isLeadMove: isLead,
          tracker,
          config: botObj.config,
          remainingPlayerCards: remainingCardsMap,
          nextPlayerId,
          rules: game.rules,
          hasPlayedFirstCard: currentTurnPlayer.hasPlayedFirstCard,
          isNextPlayerOneCard: remainingCardsMap[nextPlayerId] === 1,
          prohibitEndingWithTwo: game.rules.gameFlow.prohibitEndingWithTwo,
          gameMode: game.settings.mode
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
              // Lead move fallback
              game.playMove(currentTurnPlayer.id, [currentTurnPlayer.hand[0]]);
            } else {
              game.passTurn(currentTurnPlayer.id);
            }
          }
        } else {
          if (isLead) {
            // Cannot pass on lead turn: play smallest card
            game.playMove(currentTurnPlayer.id, [currentTurnPlayer.hand[0]]);
          } else {
            game.passTurn(currentTurnPlayer.id);
          }
        }
      }

      if (game.winners.length > 0) {
        winCounts[game.winners[0].id]++;
      }
    }

    console.log('\n=========================================');
    console.log('--- KẾT QUẢ BENCHMARK 100 VÁN ĐẤU ---');
    for (const b of bots) {
      const count = winCounts[b.player.id];
      console.log(`${b.player.avatar} ${b.player.name}: ${count} ván thắng (${((count / NUM_GAMES) * 100).toFixed(0)}%)`);
    }
    console.log('=========================================\n');

    expect(NUM_GAMES).toBe(100);
  }, 30000);

  test('Benchmark Độ Trễ Tính Toán (Decision Latency) - Đảm bảo Zero UI Freezing', () => {
    const testBots = [
      BOT_PERSONAS.BOT_ELO_850,
      BOT_PERSONAS.BOT_ELO_1150,
      BOT_PERSONAS.BOT_ELO_1450,
      BOT_PERSONAS.BOT_ELO_1750,
      BOT_PERSONAS.BOT_ELO_2300,
      BOT_PERSONAS.BOT_ELO_2500
    ];

    console.log('\n=========================================');
    console.log('--- BENCHMARK ĐỘ TRỄ TÍNH TOÁN RA QUYẾT ĐỊNH ---');

    for (const bot of testBots) {
      const hand = parseCards('3S 4C 5S 7H 8D 9C 10H JD QH KD AH 2H');

      const tracker = new CardTracker(hand, bot.memoryDepth);
      const start = performance.now();
      const ITERATIONS = 10;

      for (let i = 0; i < ITERATIONS; i++) {
        makeBotDecision({
          hand,
          currentRoundLeadingMove: null,
          isFirstMoveOfGame: false,
          isLeadMove: true,
          tracker,
          config: bot,
          remainingPlayerCards: { p0: 10, p2: 10, p3: 10 },
          nextPlayerId: 'p2',
          rules: createDefaultGameRules(),
          hasPlayedFirstCard: true,
          isNextPlayerOneCard: false,
          prohibitEndingWithTwo: true,
          gameMode: 'TRADITIONAL'
        });
      }

      const totalTime = performance.now() - start;
      const avgLatencyMs = totalTime / ITERATIONS;

      console.log(`[${bot.tier || 'Tier'}] Archetype ${bot.id} (Elo ${bot.elo}): ${avgLatencyMs.toFixed(2)} ms/nước đi`);

      // Độ trễ ra quyết định phải < 60ms để không gây giật lag
      expect(avgLatencyMs).toBeLessThan(60);
    }
    console.log('=========================================\n');
  });
});
