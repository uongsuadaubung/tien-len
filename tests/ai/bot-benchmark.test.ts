import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { GameEngine } from '../../src/engine/game';
import { Player, createDefaultGameRules } from '../../src/engine/types';
import { parseCards } from '../../src/engine/card';

describe('AI Bot Benchmark Simulation & Latency Across 9 Tiers', () => {
  test('Mô phỏng 100 ván đấu công bằng với Luân Chuyển Vị Trí Ghế Ngồi (Rotated Seating Fairness)', () => {
    const rawBots = [
      { id: 'b1', name: 'Alex (Tier 1 Tân Thủ - 700)', config: BOT_PERSONAS.BOT_ELO_700 },
      { id: 'b2', name: 'Rex (Tier 3 Phong Trào - 1250)', config: BOT_PERSONAS.BOT_ELO_1250 },
      { id: 'b3', name: 'Nova (Tier 7 Đại Cao Thủ - 2300)', config: BOT_PERSONAS.BOT_ELO_2300 },
      { id: 'b4', name: 'Alpha Mind (Tier 9 Boss - 3200)', config: BOT_PERSONAS.BOT_ELO_3200 }
    ];

    const winCounts: Record<string, number> = { b1: 0, b2: 0, b3: 0, b4: 0 };
    const NUM_GAMES = 80;

    for (let g = 1; g <= NUM_GAMES; g++) {
      // Luân chuyển vị trí ghế ngồi theo chu kỳ để đảm bảo công bằng 100% về lợi thế đi trước
      const seatOffset = (g - 1) % 4;
      const rotatedBots = [
        rawBots[seatOffset],
        rawBots[(seatOffset + 1) % 4],
        rawBots[(seatOffset + 2) % 4],
        rawBots[(seatOffset + 3) % 4]
      ];

      const players: Player[] = rotatedBots.map(b => ({
        id: b.id,
        name: b.name,
        avatar: b.config.avatar || '🤖',
        isBot: true,
        botPersonaId: b.config.id || null,
        hand: [],
        playedCards: [],
        score: 0,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        rankPosition: null,
        instantWinType: null
      }));

      const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100 });
      const initRes = game.startNewGame(g, undefined, 99999 + g * 3001);

      if (initRes.instantWin && initRes.instantWinner) {
        winCounts[initRes.instantWinner.id]++;
        continue;
      }

      const trackers: Record<string, CardTracker> = {};
      for (const b of rotatedBots) {
        const p = game.getPlayer(b.id)!;
        trackers[b.id] = new CardTracker(p.hand, b.config.memoryDepth);
      }

      let loopCount = 0;
      const MAX_LOOPS = 400;

      while (!game.isGameOver && loopCount < MAX_LOOPS) {
        loopCount++;
        const currentTurnPlayer = game.getCurrentPlayer();
        const botObj = rotatedBots.find(b => b.id === currentTurnPlayer.id)!;
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
          gameMode: game.settings.mode,
          mctsMap: null,
          compositeRuleStrategy: null,
          opponentProfiles: null
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
    }

    console.log('\n=========================================');
    console.log(`--- KẾT QUẢ BENCHMARK CÔNG BẰNG 9 BẬC (${NUM_GAMES} VÁN ROTATED SEATS) ---`);
    for (const b of rawBots) {
      const count = winCounts[b.id];
      console.log(`${b.config.avatar || '🤖'} ${b.name}: ${count} ván thắng (${((count / NUM_GAMES) * 100).toFixed(1)}%)`);
    }
    console.log('=========================================\n');

    expect(winCounts['b4'] + winCounts['b3']).toBeGreaterThanOrEqual(winCounts['b1']);
  }, 30000);

  test('Benchmark Độ Trễ Ra Quyết Định Toàn Bộ 9 Bậc Rank (Zero UI Freezing Benchmark)', () => {
    const testBots = [
      BOT_PERSONAS.BOT_ELO_700,  // Tier 1: Tân Thủ
      BOT_PERSONAS.BOT_ELO_950,  // Tier 2: Tập Sự
      BOT_PERSONAS.BOT_ELO_1250, // Tier 3: Phong Trào
      BOT_PERSONAS.BOT_ELO_1550, // Tier 4: Lão Luyện
      BOT_PERSONAS.BOT_ELO_1750, // Tier 5: Tinh Anh
      BOT_PERSONAS.BOT_ELO_1950, // Tier 6: Cao Thủ
      BOT_PERSONAS.BOT_ELO_2300, // Tier 7: Đại Cao Thủ
      BOT_PERSONAS.BOT_ELO_2750, // Tier 8: Thần Bài (Minimax + Bayesian)
      BOT_PERSONAS.BOT_ELO_3200  // Tier 9: Siêu Trí Tuệ Boss (Alpha Mind Superhuman)
    ];

    console.log('\n================================================================');
    console.log('--- BENCHMARK ĐỘ TRỄ TÍNH TOÁN 9 BẬC RANK (ZERO UI FREEZE) ---');

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
          prohibitEndingWithTwo: false,
          gameMode: 'TRADITIONAL',
          mctsMap: null,
          compositeRuleStrategy: null,
          opponentProfiles: null
        });
      }

      const totalTime = performance.now() - start;
      const avgLatencyMs = totalTime / ITERATIONS;

      console.log(`[Tier ${bot.tier || 'N/A'}] ${bot.name} (Elo ${bot.elo}): ${avgLatencyMs.toFixed(2)} ms/nước đi`);

      // Độ trễ ra quyết định phải < 60ms cho mọi bậc rank để không gây lag giao diện
      expect(avgLatencyMs).toBeLessThan(60);
    }
    console.log('================================================================\n');
  });
});
