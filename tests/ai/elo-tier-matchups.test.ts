import { describe, expect, test } from 'bun:test';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision } from '../../src/ai/decision-maker';
import { GameEngine } from '../../src/engine/game';
import { BotConfig } from '../../src/ai/types';
import { Player } from '../../src/engine/types';

/**
 * Hàm mô phỏng N ván đấu giữa các Bot được chỉ định với bộ bài chia hoàn toàn ngẫu nhiên
 */
function simulateMatchup(
  botConfigs: { id: string; name: string; config: BotConfig }[],
  numGames: number
): { winCounts: Record<string, number>; remainingCardsAvg: Record<string, number> } {
  const winCounts: Record<string, number> = {};
  const totalCardsLeft: Record<string, number> = {};

  for (const b of botConfigs) {
    winCounts[b.id] = 0;
    totalCardsLeft[b.id] = 0;
  }

  const players: Player[] = botConfigs.map(b => ({
    id: b.id,
    name: b.name,
    avatar: b.config.avatar,
    isBot: true,
    hand: [],
    playedCards: [],
    score: 0,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  }));

  const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100 });

  for (let g = 1; g <= numGames; g++) {
    const initRes = game.startNewGame(g);

    if (initRes.instantWin && initRes.instantWinner) {
      winCounts[initRes.instantWinner.id]++;
      continue;
    }

    const trackers: Record<string, CardTracker> = {};
    for (const b of botConfigs) {
      const p = game.getPlayer(b.id)!;
      trackers[b.id] = new CardTracker(p.hand, b.config.memoryDepth);
    }

    let loopCount = 0;
    const MAX_LOOPS = 400;

    while (!game.isGameOver && loopCount < MAX_LOOPS) {
      loopCount++;
      const currentTurnPlayer = game.getCurrentPlayer();
      const botObj = botConfigs.find(b => b.id === currentTurnPlayer.id)!;
      const tracker = trackers[currentTurnPlayer.id];
      tracker.updateOwnHand(currentTurnPlayer.hand);

      const remainingCardsMap: Record<string, number> = {};
      for (const p of game.players) {
        remainingCardsMap[p.id] = p.hand.length;
      }

      const isLead = game.isRoundLeadMove();

      const decision = makeBotDecision({
        hand: currentTurnPlayer.hand,
        currentRoundLeadingMove: game.getLeadingMove(),
        isFirstMoveOfGame: game.isFirstMoveOfGame,
        isLeadMove: isLead,
        tracker,
        config: botObj.config,
        remainingPlayerCards: remainingCardsMap
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

    for (const p of game.players) {
      totalCardsLeft[p.id] += p.hand.length;
    }
  }

  const remainingCardsAvg: Record<string, number> = {};
  for (const b of botConfigs) {
    remainingCardsAvg[b.id] = totalCardsLeft[b.id] / numGames;
  }

  return { winCounts, remainingCardsAvg };
}

describe('AI Elo Tier Matchup Tests (Kiểm Thử Tương Quan Kỹ Năng & Tỉ Lệ Thắng)', () => {
  test('Đối đầu 4 Bậc Elo khác nhau (Tier 1 vs Tier 2 vs Tier 3 vs Tier 5)', () => {
    const NUM_GAMES = 60;
    const botConfigs = [
      { id: 't1', name: 'Bé Năm (Tập sự - Elo 850)', config: BOT_PERSONAS.BE_NAM },
      { id: 't2', name: 'Chú Bảy (Phong trào - Elo 1150)', config: BOT_PERSONAS.CHU_BAY },
      { id: 't3', name: 'Bác Tư (Kinh nghiệm - Elo 1450)', config: BOT_PERSONAS.BAC_TU },
      { id: 't5', name: 'Alpha-TL (Thần bài - Elo 2500)', config: BOT_PERSONAS.ALPHA_TL }
    ];

    const { winCounts, remainingCardsAvg } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- KẾT QUẢ ĐỐI ĐẦU 4 BẬC ELO (${NUM_GAMES} VÁN NGẪU NHIÊN) ---`);
    for (const b of botConfigs) {
      const wins = winCounts[b.id];
      const winPct = ((wins / NUM_GAMES) * 100).toFixed(1);
      const avgCards = remainingCardsAvg[b.id].toFixed(2);
      console.log(`${b.config.avatar} ${b.name}: ${wins} ván thắng (${winPct}%) | Số lá bài còn lại TB: ${avgCards}`);
    }
    console.log('======================================================\n');

    // Mong đợi: Nhóm trình độ cao (Tier 3 + Tier 5) có kết quả tốt hơn và giữ ít lá tồn hơn Tier 1
    expect(winCounts['t5'] + winCounts['t3']).toBeGreaterThanOrEqual(winCounts['t1']);
    expect(remainingCardsAvg['t5']).toBeLessThan(remainingCardsAvg['t1']);
  });

  test('1 Thần Bài (Tier 5) đối đầu 3 Tập Sự (Tier 1)', () => {
    const NUM_GAMES = 50;
    const botConfigs = [
      { id: 'boss', name: 'Cô Sáu (Thần Bài - Elo 2300)', config: BOT_PERSONAS.CO_SAU },
      { id: 'novice1', name: 'Cu Tí (Tập sự - Elo 900)', config: BOT_PERSONAS.CU_TI },
      { id: 'novice2', name: 'Út Nhỏ (Tập sự - Elo 950)', config: BOT_PERSONAS.UT_NHO },
      { id: 'novice3', name: 'Em Ba (Tập sự - Elo 1000)', config: BOT_PERSONAS.EM_BA }
    ];

    const { winCounts, remainingCardsAvg } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- KẾT QUẢ 1 THẦN BÀI VS 3 TẬP SỰ (${NUM_GAMES} VÁN NGẪU NHIÊN) ---`);
    for (const b of botConfigs) {
      const wins = winCounts[b.id];
      const winPct = ((wins / NUM_GAMES) * 100).toFixed(1);
      console.log(`${b.config.avatar} ${b.name}: ${wins} ván thắng (${winPct}%) | Lá tồn TB: ${remainingCardsAvg[b.id].toFixed(2)}`);
    }
    console.log('======================================================\n');

    // Thần Bài có số trận thắng vượt trội so với mức trung bình của nhóm tập sự
    const avgNoviceWins = (winCounts['novice1'] + winCounts['novice2'] + winCounts['novice3']) / 3;
    expect(winCounts['boss']).toBeGreaterThan(avgNoviceWins);
    expect(remainingCardsAvg['boss']).toBeLessThanOrEqual(3.5);
  });

  test('Đối đầu 1v1 Trực Diện: Tier 2 (Phong Trào) vs Tier 4 (Cao Thủ)', () => {
    const NUM_GAMES = 40;
    const botConfigs = [
      { id: 'amateur', name: 'Anh Ba Xị (Phong Trào - Elo 1200)', config: BOT_PERSONAS.BA_XI },
      { id: 'pro', name: 'Anh Hai (Cao Thủ - Elo 1850)', config: BOT_PERSONAS.ANH_HAI }
    ];

    const { winCounts } = simulateMatchup(botConfigs, NUM_GAMES);

    console.log('\n======================================================');
    console.log(`--- ĐỐI ĐẦU 1V1: CAO THỦ (ELO 1850) VS PHONG TRÀO (ELO 1200) ---`);
    console.log(`Anh Ba Xị: ${winCounts['amateur']} ván (${((winCounts['amateur'] / NUM_GAMES) * 100).toFixed(1)}%)`);
    console.log(`Anh Hai: ${winCounts['pro']} ván (${((winCounts['pro'] / NUM_GAMES) * 100).toFixed(1)}%)`);
    console.log('======================================================\n');

    // Cao thủ phải thắng nhiều hơn phong trào trong đối đầu 1v1
    expect(winCounts['pro']).toBeGreaterThan(winCounts['amateur']);
  });
});
