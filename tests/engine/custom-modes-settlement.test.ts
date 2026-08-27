import { describe, expect, test } from 'bun:test';
import { 
  GAME_MODE_REGISTRY, 
  getGameModeDefinition, 
  getAllGameModeDefinitions 
} from '../../src/engine/game-modes';
import { 
  calculateCountCardsSettlement, 
  calculateWinnerTakesAllSettlement, 
  calculateTraditionalSettlement,
  calculateRottenPenalty,
  calculateCongPenalty
} from '../../src/engine/economy';
import { GameEngine } from '../../src/engine/game';
import { Player } from '../../src/engine/types';
import { parseCards } from '../../src/engine/card';
import { createPlayer } from '../../src/engine/player-factory';

describe('Extensible Game Modes & Settlement Engine Tests', () => {
  const BET = 500;

  const makeTestPlayer = (p: Partial<Player> & { id: string; name: string }): Player =>
    createPlayer({
      avatar: '🤖',
      isBot: p.id !== 'p0',
      score: 10000,
      hasPlayedFirstCard: true,
      ...p
    });

  test('1. Extensible Game Mode Registry: Kiểm tra cấu hình các chế độ mở rộng', () => {
    const allModes = getAllGameModeDefinitions();
    expect(allModes.length).toBeGreaterThanOrEqual(5);

    const traditional = getGameModeDefinition('TRADITIONAL');
    expect(traditional.defaultSettings.mode).toBe('TRADITIONAL');
    expect(traditional.defaultSettings.playerCount).toBe(4);

    const countCards = getGameModeDefinition('COUNT_CARDS');
    expect(countCards.defaultSettings.mode).toBe('COUNT_CARDS');
    expect(countCards.defaultSettings.settlementType).toBe('CARD_COUNT');

    const winnerTakesAll = getGameModeDefinition('WINNER_TAKES_ALL');
    expect(winnerTakesAll.defaultSettings.mode).toBe('WINNER_TAKES_ALL');
    expect(winnerTakesAll.defaultSettings.settlementType).toBe('WINNER_TAKES_ALL');

    const solo1v1 = getGameModeDefinition('SOLO_1V1');
    expect(solo1v1.defaultSettings.playerCount).toBe(2);

    const customSandbox = getGameModeDefinition('CUSTOM_SANDBOX');
    expect(customSandbox.allowedCustomizations.canChangeRules).toBe(true);
    expect(customSandbox.allowedCustomizations.canChangePlayerCount).toBe(true);
  });

  test('2. Chế độ Đếm Lá (COUNT_CARDS) Bàn thường: 1 người về Nhất ăn theo số lá bài còn lại của đối thủ', () => {
    const players: Player[] = [
      makeTestPlayer({
        id: 'p0',
        name: 'Người Chơi',
        avatar: '🤠',
        isBot: false,
        hand: [], // Về Nhất (0 lá)
        playedCards: parseCards('3S 4S 5S 6S 7S 8S 9S 10S JS QS KS AS 2S')
      }),
      makeTestPlayer({
        id: 'p1',
        name: 'Bot 1',
        avatar: '🧒',
        hand: parseCards('4D 5D 6D') // Còn 3 lá (không thối)
      }),
      makeTestPlayer({
        id: 'p2',
        name: 'Bot 2',
        avatar: '🤠',
        hand: parseCards('7D 8D 2H') // Còn 3 lá (thối 1 heo đỏ)
      }),
      makeTestPlayer({
        id: 'p3',
        name: 'Bot 3',
        avatar: '👑',
        hand: parseCards('3D 4C 5C 6C 7C 8C 9C 10C JC QC KC AC 2D'), // Cóng
        hasPlayedFirstCard: false
      })
    ];

    const payouts = calculateCountCardsSettlement(players, 'p0', BET, false);

    // Bot 1: 3 lá x 500 = -1,500
    expect(payouts['p1']).toBe(-1500);

    // Bot 2: 3 lá x 500 (1,500) + thối heo đỏ (2 x 500 = 1,000) = -2,500
    expect(payouts['p2']).toBe(-2500);

    // Bot 3: Cóng (26 x 500 = 13,000) + thối heo đỏ (1,000) = -14,000
    expect(payouts['p3']).toBe(-14000);

    // Người chơi (p0): Nhận trọn vẹn 1,500 + 2,500 + 14,000 = +18,000
    expect(payouts['p0']).toBe(18000);
  });

  test('3. Đếm lá sát phạt hệ số nhân x2: Phạt nhân đôi lá và thối heo x2', () => {
    const players: Player[] = [
      makeTestPlayer({
        id: 'p0',
        name: 'Người Chơi',
        avatar: '🤠',
        isBot: false,
        hand: [], // Về Nhất
        score: 50000
      }),
      makeTestPlayer({
        id: 'p1',
        name: 'Trùm Sòng',
        avatar: '🕶️',
        hand: parseCards('4D 5D'), // Còn 2 lá (x2 = 4 lá phạt = 4 x 500 = 2,000)
        score: 50000
      }),
      makeTestPlayer({
        id: 'p2',
        name: 'Cô Sáu',
        avatar: '👑',
        hand: parseCards('2S'), // 1 lá heo đen (2 lá x 500 = 1,000 + thối heo đen x2 = 1,000 = 2,000)
        score: 50000
      }),
      makeTestPlayer({
        id: 'p3',
        name: 'Bà Son',
        avatar: '🦹‍♀️',
        hand: parseCards('3D 4C 5C 6C 7C 8C 9C 10C JC QC KC AC 2D'), // Cóng hệ số x2: 52 x 500 = 26,000 + thối heo đỏ x2 = 2,000 = 28,000
        score: 50000,
        hasPlayedFirstCard: false
      })
    ];

    const payouts = calculateCountCardsSettlement(players, 'p0', BET, 2);

    expect(payouts['p1']).toBe(-2000);
    expect(payouts['p2']).toBe(-2000);
    expect(payouts['p3']).toBe(-28000);
    expect(payouts['p0']).toBe(32000);
  });

  test('4. Chế độ Nhất Ăn Tất (WINNER_TAKES_ALL): Người về Nhất ăn trọn tiền cược cơ bản từ tất cả người thua', () => {
    const players: Player[] = [
      makeTestPlayer({
        id: 'p0',
        name: 'Người Chơi',
        avatar: '🤠',
        isBot: false,
        hand: []
      }),
      makeTestPlayer({
        id: 'p1',
        name: 'Bot 1',
        avatar: '🧒',
        hand: parseCards('4D 5D 6D')
      }),
      makeTestPlayer({
        id: 'p2',
        name: 'Bot 2',
        avatar: '🤠',
        hand: parseCards('7D 8D 2S') // 1 cược + thối heo đen (500) = -1,000
      }),
      makeTestPlayer({
        id: 'p3',
        name: 'Bot 3',
        avatar: '👑',
        hand: parseCards('9D 10D')
      })
    ];

    const payouts = calculateWinnerTakesAllSettlement(players, 'p0', BET, false);
    expect(payouts['p1']).toBe(-500);
    expect(payouts['p2']).toBe(-1000);
    expect(payouts['p3']).toBe(-500);
    expect(payouts['p0']).toBe(2000);
  });

  test('5. GameEngine COUNT_CARDS: Kết thúc ván ngay khi 1 người đánh hết bài', () => {
    const initialPlayers: Player[] = [
      makeTestPlayer({
        id: 'p0',
        name: 'Bạn',
        avatar: '🤠',
        isBot: false,
        hand: parseCards('3S'), // Chỉ còn 1 lá 3 Bích
        score: 5000,
        hasPlayedFirstCard: false
      }),
      makeTestPlayer({
        id: 'p1',
        name: 'Bot 1',
        avatar: '🧒',
        hand: parseCards('4S 5S 6S'),
        score: 5000,
        hasPlayedFirstCard: false
      }),
      makeTestPlayer({
        id: 'p2',
        name: 'Bot 2',
        avatar: '🤠',
        hand: parseCards('7S 8S 9S'),
        score: 5000,
        hasPlayedFirstCard: false
      }),
      makeTestPlayer({
        id: 'p3',
        name: 'Bot 3',
        avatar: '👑',
        hand: parseCards('10S JS QS'),
        score: 5000,
        hasPlayedFirstCard: false
      })
    ];

    const engine = new GameEngine(initialPlayers, { mode: 'COUNT_CARDS', betAmount: 500 });
    engine.startCustomGame(1);

    const moveRes = engine.playMove('p0', [initialPlayers[0].hand[0]]);
    expect(moveRes.success).toBe(true);
    expect(moveRes.isGameOver).toBe(true);
    expect(engine.isGameOver).toBe(true);
    expect(engine.winners.length).toBe(1);
    expect(engine.winners[0].id).toBe('p0');
  });

  test('6. GameEngine Solo 1v1 (2 Người chơi): Kết thúc chuẩn mực', () => {
    const initialPlayers: Player[] = [
      makeTestPlayer({
        id: 'p0',
        name: 'Bạn',
        avatar: '🤠',
        isBot: false,
        hand: parseCards('3S'),
        score: 5000,
        hasPlayedFirstCard: false
      }),
      makeTestPlayer({
        id: 'p1',
        name: 'Alpha TL',
        avatar: '🤖',
        hand: parseCards('4S 5S 6S'),
        score: 5000,
        hasPlayedFirstCard: false
      })
    ];

    const engine = new GameEngine(initialPlayers, { mode: 'TRADITIONAL', betAmount: 500, playerCount: 2 });
    engine.startCustomGame(1);

    const moveRes = engine.playMove('p0', [initialPlayers[0].hand[0]]);
    expect(moveRes.success).toBe(true);
    expect(moveRes.isGameOver).toBe(true);
    expect(engine.isGameOver).toBe(true);
    expect(engine.winners.length).toBe(2); // p0 Nhất, p1 Bét
    expect(engine.winners[0].id).toBe('p0');
    expect(engine.winners[1].id).toBe('p1');
  });
});
