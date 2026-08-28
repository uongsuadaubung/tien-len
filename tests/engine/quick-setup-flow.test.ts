import { describe, test, expect } from 'bun:test';
import { GameEngine } from '../../src/engine/game';
import { Player, createDefaultGameRules } from '../../src/engine/types';
import { getRandomBotConfigsForTable, generateRealisticBotBankroll } from '../../src/ai/bot-factory';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { PlayerProfile } from '../../src/engine/storage';
import { 
  CountCardsModeStrategy, 
  TraditionalModeStrategy, 
  WinnerTakesAllModeStrategy 
} from '../../src/engine/strategies/game-mode-strategy';

describe('Luồng Chơi Nhanh (Quick Setup Flow & Random Matchmaking)', () => {
  const mockProfile: PlayerProfile = {
    name: 'Người Chơi',
    avatar: '🤠',
    coins: 50000,
    loans: 0,
    elo: 1200,
    campaignUnlockedChapter: 1,
    campaignChapterWins: {},
    dailyReliefClaimedCount: 0,
    lastDailyResetTimestamp: Date.now(),
    lastDailyResetDate: '2026-08-26',
    stats: {
      gamesPlayed: 10,
      wins: 5,
      currentStreak: 1,
      highestStreak: 3,
      totalEarned: 2000,
      chopsDone: 2,
      congsGiven: 0
    },
    dailyQuests: [],
    achievements: [],
    dailyMilestonesClaimed: { 1: false, 3: false, 5: false }
  };

  test('1. Bàn Chơi Nhanh: 4 Người, Đếm Lá, Cược 500 Xu, Phạt Chặt x2', () => {
    const strategy = new CountCardsModeStrategy();
    const randomBots = getRandomBotConfigsForTable([1, 2, 3, 4, 5], 3);

    const setup = strategy.setupMatch({
      profile: mockProfile,
      playerCount: 4,
      customRules: {
        settlementRule: 'COUNT_CARDS',
        chopping: {
          multiplier: 2,
          allowFourPairsCutAnytime: true,
          allowThreePairsCutTwo: true,
          allowFourOfAKindCutPairsOfTwos: true
        },
        cong: {
          multiplier: 2,
          penaltyCards: 26,
          enabled: true
        },
        gameFlow: {
          prohibitEndingWithTwo: true
        },
        table: {
          playerCount: 4,
          betAmount: 500,
          soundEnabled: true
        }
      },
      customSettings: null,
      campaignChapter: null,
      customBotPersonaIds: [randomBots[0].id, randomBots[1].id, randomBots[2].id],
      customBotConfigs: [randomBots[0], randomBots[1], randomBots[2]]
    });

    expect(setup.playerCount).toBe(4);
    expect(setup.rules.table.betAmount).toBe(500);
    expect(setup.rules.settlementRule).toBe('COUNT_CARDS');
    expect(setup.rules.chopping.multiplier).toBe(2);
    expect(setup.rules.cong.multiplier).toBe(2);
    expect(setup.rules.gameFlow.prohibitEndingWithTwo).toBe(true);

    // Kiểm tra Bot có thông tin ngẫu nhiên và số tiền hợp lý với mức cược 500
    expect(setup.initialPlayers.length).toBe(4);
    expect(setup.initialPlayers[1].score).toBeGreaterThanOrEqual(15000); // 30x of 500
  });

  test('2. Bàn Chơi Nhanh Solo 1v1: 2 Người, Truyền Thống, Cược 200 Xu', () => {
    const strategy = new TraditionalModeStrategy();
    const randomBots = getRandomBotConfigsForTable([1, 2, 3, 4, 5], 1);

    const setup = strategy.setupMatch({
      profile: mockProfile,
      playerCount: 2,
      customRules: {
        settlementRule: 'TRADITIONAL',
        table: {
          playerCount: 2,
          betAmount: 200,
          soundEnabled: true
        }
      },
      customSettings: null,
      campaignChapter: null,
      customBotPersonaIds: [randomBots[0].id, 'BOT_ELO_1150', 'BOT_ELO_1450'],
      customBotConfigs: [randomBots[0], {}, {}]
    });

    expect(setup.playerCount).toBe(2);
    expect(setup.initialPlayers.length).toBe(2);
    expect(setup.rules.settlementRule).toBe('TRADITIONAL');
    expect(setup.rules.table.betAmount).toBe(200);
  });

  test('3. Bàn Chơi Nhanh 3 Người: Nhất Ăn Tất, Cược 1000 Xu', () => {
    const strategy = new WinnerTakesAllModeStrategy();
    const randomBots = getRandomBotConfigsForTable([1, 2, 3, 4, 5], 2);

    const setup = strategy.setupMatch({
      profile: mockProfile,
      playerCount: 3,
      customRules: {
        settlementRule: 'WINNER_TAKES_ALL',
        table: {
          playerCount: 3,
          betAmount: 1000,
          soundEnabled: true
        }
      },
      customSettings: null,
      campaignChapter: null,
      customBotPersonaIds: [randomBots[0].id, randomBots[1].id, 'BOT_ELO_1450'],
      customBotConfigs: [randomBots[0], randomBots[1], {}]
    });

    expect(setup.playerCount).toBe(3);
    expect(setup.initialPlayers.length).toBe(3);
    expect(setup.rules.settlementRule).toBe('WINNER_TAKES_ALL');
    expect(setup.rules.table.betAmount).toBe(1000);
    expect(setup.initialPlayers[1].score).toBeGreaterThanOrEqual(30000); // 30x of 1000
  });

  test('4. GameEngine Vận Hành với Cấu Hình Quick Setup', () => {
    const rules = createDefaultGameRules({
      settlementRule: 'COUNT_CARDS',
      chopping: { multiplier: 2, allowFourPairsCutAnytime: true, allowThreePairsCutTwo: true, allowFourOfAKindCutPairsOfTwos: true },
      cong: { multiplier: 2, enabled: true },
      gameFlow: { prohibitEndingWithTwo: true },
      table: { playerCount: 4, betAmount: 500, soundEnabled: true }
    });

    const p0: Player = createPlayer({ id: 'p0', name: 'Bạn', avatar: '🤠', score: 50000 });
    const p1: Player = createBotPlayer('p1', null, { name: 'Bot 1', avatar: '🤖', score: 35000 });
    const p2: Player = createBotPlayer('p2', null, { name: 'Bot 2', avatar: '🤖', score: 40000 });
    const p3: Player = createBotPlayer('p3', null, { name: 'Bot 3', avatar: '🤖', score: 65000 });

    const engine = new GameEngine([p0, p1, p2, p3], rules);
    engine.startNewGame(1);

    expect(engine.players.length).toBe(4);
    expect(engine.rules.settlementRule).toBe('COUNT_CARDS');
    expect(engine.rules.table.betAmount).toBe(500);
    expect(engine.rules.chopping.multiplier).toBe(2);
    expect(engine.gameNumber).toBe(1);
    expect(engine.isFirstMoveOfGame).toBe(true);
  });

  test('5. Sát Phạt Cực Nặng: Hệ Số Nhân Phạt x3 và x4', () => {
    const { calculateCountCardsSettlement, calculateChopPenalty, calculateCongPenalty } = require('../../src/engine/economy');
    const bet = 100;

    // 1. Phạt Cóng ở x1 vs x4
    const congX1 = calculateCongPenalty(bet, 1);
    const congX4 = calculateCongPenalty(bet, 4);
    expect(congX1).toBe(2600);
    expect(congX4).toBe(2600 * 4); // 10,400 xu

    // 2. Chặt Heo Đỏ ở x1 vs x3
    const redTwo = { id: '2H', rank: 15, suit: 'HEARTS', weight: 63, code: '2H' };
    const chopTarget = { type: 'SINGLE', cards: [redTwo], highestCard: redTwo, rankValue: 15 };
    const chopCand = { type: 'FOUR_OF_A_KIND', cards: [], highestCard: redTwo, rankValue: 8 };
    
    const chopX1 = calculateChopPenalty(chopTarget, chopCand, bet, 1);
    const chopX3 = calculateChopPenalty(chopTarget, chopCand, bet, 3);
    expect(chopX1.amount).toBe(200);
    expect(chopX3.amount).toBe(600);

    // 3. Kết toán đếm lá ở x4
    const loser: Player = createBotPlayer('p1', null, {
      name: 'Bot',
      avatar: '🤖',
      hand: [
        { id: '4S', rank: 4, suit: 'SPADES', weight: 16, code: '4S' },
        { id: '5S', rank: 5, suit: 'SPADES', weight: 20, code: '5S' }
      ],
      score: 5000,
      hasPlayedFirstCard: true
    });
    const winner: Player = createPlayer({
      id: 'p0',
      name: 'Bạn',
      avatar: '🤠',
      score: 5000,
      hasPlayedFirstCard: true
    });

    const settlementX4 = calculateCountCardsSettlement([winner, loser], 'p0', bet, 4);
    // 2 lá * 100 * 4 = 800 xu
    expect(settlementX4['p1']).toBe(-800);
    expect(settlementX4['p0']).toBe(800);
  });
});
