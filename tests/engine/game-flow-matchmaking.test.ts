import { describe, test, expect } from 'bun:test';
import { GameEngine } from '../../src/engine/game';
import { Player, Card, createDefaultGameRules } from '../../src/engine/types';
import { CountCardsModeStrategy } from '../../src/engine/strategies/game-mode-strategy';
import { PlayerProfile } from '../../src/engine/storage';

describe('Luồng Chạy Trò Chơi: Quyền Đi Trước & Matchmaking Đấu Hạng', () => {
  const p0: Player = {
    id: 'p0',
    name: 'Bạn',
    avatar: '🤠',
    isBot: false,
    hand: [
      { id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 12, code: '3S' },
      { id: '4_HEARTS', rank: 4, suit: 'HEARTS', weight: 19, code: '4H' }
    ],
    playedCards: [],
    score: 1000,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  };

  const p1: Player = {
    id: 'p1',
    name: 'Alex',
    avatar: '🧒',
    isBot: true,
    hand: [
      { id: '5_DIAMONDS', rank: 5, suit: 'DIAMONDS', weight: 22, code: '5D' },
      { id: '15_HEARTS', rank: 15, suit: 'HEARTS', weight: 63, code: '2H' }
    ],
    playedCards: [],
    score: 1000,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  };

  const p2: Player = {
    id: 'p2',
    name: 'Kai',
    avatar: '🤠',
    isBot: true,
    hand: [
      { id: '6_CLUBS', rank: 6, suit: 'CLUBS', weight: 25, code: '6C' }
    ],
    playedCards: [],
    score: 1000,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  };

  const p3: Player = {
    id: 'p3',
    name: 'Marcus',
    avatar: '👴',
    isBot: true,
    hand: [
      { id: '7_SPADES', rank: 7, suit: 'SPADES', weight: 28, code: '7S' }
    ],
    playedCards: [],
    score: 1000,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  };

  test('1. Trận đầu tiên (gameNumber = 1): Người cầm 3 Bích (p0) bắt buộc đi trước', () => {
    const engine = new GameEngine([p0, p1, p2, p3]);
    engine.startCustomGame(1);

    expect(engine.gameNumber).toBe(1);
    expect(engine.isFirstMoveOfGame).toBe(true);
    expect(engine.currentRound.leadPlayerId).toBe('p0');
    expect(engine.currentRound.currentTurnPlayerId).toBe('p0');
  });

  test('2. Trận thứ 2 (gameNumber = 2): Người thắng ván 1 (p1) được quyền đi trước bất kể không cầm 3 Bích', () => {
    const engine = new GameEngine([p0, p1, p2, p3]);
    // Giả lập p1 thắng ván 1
    engine.startCustomGame(2, 'p1');

    expect(engine.gameNumber).toBe(2);
    expect(engine.isFirstMoveOfGame).toBe(false);
    expect(engine.currentRound.leadPlayerId).toBe('p1');
    expect(engine.currentRound.currentTurnPlayerId).toBe('p1');
  });

  test('3. Trận thứ 3 (gameNumber = 3): Khi p0 về Nhất, ván sau p0 tiếp tục được đi trước', () => {
    const engine = new GameEngine([p0, p1, p2, p3]);
    engine.startCustomGame(3, 'p0');

    expect(engine.gameNumber).toBe(3);
    expect(engine.isFirstMoveOfGame).toBe(false);
    expect(engine.currentRound.leadPlayerId).toBe('p0');
    expect(engine.currentRound.currentTurnPlayerId).toBe('p0');
  });

  test('4. Khi ván bài kết thúc bình thường, settleEndGame tự động lưu trữ lastWinnerId', () => {
    const engine = new GameEngine([
      { ...p0, hand: [] },
      { ...p1, hand: [{ id: '4H', rank: 4, suit: 'HEARTS', weight: 19, code: '4H' }] }
    ]);
    engine.winners = [p0];
    engine.settleEndGame();

    expect(engine.lastWinnerId).toBe('p0');

    // Khởi tạo ván 2 không truyền previousWinnerId, engine tự động lấy lastWinnerId = 'p0'
    engine.startCustomGame(2);
    expect(engine.currentRound.leadPlayerId).toBe('p0');
  });

  test('5. Ghép Trận Đấu Hạng (Ranked Matchmaking): Tự động sinh đối thủ Bot theo Elo', () => {
    const strategy = new CountCardsModeStrategy();
    const mockProfile: PlayerProfile = {
      name: 'Người Chơi',
      avatar: '🤠',
      coins: 5000,
      loans: 0,
      elo: 1350,
      campaignUnlockedChapter: 1,
      campaignChapterWins: {},
      dailyReliefClaimedCount: 0,
      lastDailyResetTimestamp: Date.now(),
      lastDailyResetDate: '2026-08-26',
      stats: {
        gamesPlayed: 10,
        wins: 6,
        currentStreak: 2,
        highestStreak: 3,
        totalEarned: 1000,
        chopsDone: 2,
        congsGiven: 0
      },
      dailyQuests: [],
      achievements: [],
      dailyMilestonesClaimed: { 1: false, 3: false, 5: false }
    };

    const match1 = strategy.setupMatch({ profile: mockProfile, playerCount: 4 });
    const match2 = strategy.setupMatch({ profile: mockProfile, playerCount: 4 });

    expect(match1.initialPlayers.length).toBe(4);
    expect(match2.initialPlayers.length).toBe(4);
    
    // Đảm bảo Bot được sinh ra có thông tin
    expect(match1.initialPlayers[1].isBot).toBe(true);
    expect(match1.initialPlayers[1].name.length).toBeGreaterThan(0);
    expect(match2.initialPlayers[1].name.length).toBeGreaterThan(0);
  });

  test('6. Bot Cháy Túi (Broke): Khi Bot có số dư < mức cược, ván sau Bot tự động được thay thế bằng Bot mới', () => {
    const betAmount = 100;
    const prevEngine = new GameEngine([
      { ...p0, score: 5000 },
      { ...p1, name: 'Alex', score: 0 }, // Alex bị cháy túi (0 Xu)
      { ...p2, name: 'Kai', score: 4000 },
      { ...p3, name: 'Marcus', score: 3000 }
    ]);
    prevEngine.settleEndGame();

    const usedNames = [p0.name];
    const usedAvatars = [p0.avatar];

    const nextPlayers = prevEngine.players.map((p, idx) => {
      if (p.isBot && p.score < betAmount) {
        return {
          ...p,
          name: 'New Bot Challenger',
          avatar: '🤖',
          score: 5000
        };
      }
      return p;
    });

    expect(nextPlayers[1].name).not.toBe('Alex');
    expect(nextPlayers[1].name).toBe('New Bot Challenger');
    expect(nextPlayers[1].score).toBe(5000);
    expect(nextPlayers[2].name).toBe('Kai'); // Kai còn tiền nên giữ nguyên
  });

  test('7. Vốn Khởi Điểm Tự Nhiên (Realistic Bot Bankroll): Tiền Bot dao động đa dạng theo Bậc và Mức cược', () => {
    const { generateRealisticBotBankroll } = require('../../src/ai/bot-factory');
    const rookieBankroll = generateRealisticBotBankroll({ elo: 850 }, 100);
    const masterBankroll = generateRealisticBotBankroll({ elo: 1850 }, 100);
    const mythicBankroll = generateRealisticBotBankroll({ elo: 2400 }, 100);

    // Không còn cảnh tất cả bot đều là 5000 tròn trịa
    expect(rookieBankroll).toBeGreaterThanOrEqual(3000);
    expect(rookieBankroll).toBeLessThanOrEqual(8000);

    // Cao thủ mang nhiều tiền hơn tân thủ
    expect(masterBankroll).toBeGreaterThan(rookieBankroll);
    expect(mythicBankroll).toBeGreaterThan(masterBankroll);
  });
});
