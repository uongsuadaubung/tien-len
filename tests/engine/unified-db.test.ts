import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  TienLenDatabase, 
  getGameDB,
  memoryStore, 
  dbGetPlayer, 
  dbSavePlayer,
  dbGetPlayerProfile,
  dbSavePlayerProfile, 
  dbGetAllBots,
  dbSaveBotsBatch, 
  dbUpdatePlayerMatchResult,
  type PlayerRecord 
} from '../../src/engine/db/indexed-db';
import { generateInitial200Bots } from '../../src/engine/ecosystem/bot-generator';

describe('Cơ Sở Dữ Liệu Tinh Khiết Mới (Pure Unified Database Tests)', () => {
  beforeEach(() => {
    memoryStore.players.clear();
  });

  it('1. Quản lý hồ sơ Người chơi thuần túy thông qua bảng players', async () => {
    const humanRecord: PlayerRecord = {
      id: 'usr_clean_101',
      name: 'Người Chơi Mới',
      avatar: '👤',
      coins: 100000,
      elo: 1200,
      status: 'ACTIVE',
      stats: {
        gamesPlayed: 5,
        wins: 3,
        chopsDone: 1,
        congsGiven: 0,
        totalEarned: 30000,
        highestStreak: 2,
        currentStreak: 2
      },
      updatedAt: Date.now()
    };

    // Lưu người chơi vào database
    await dbSavePlayer(humanRecord);

    // Truy vấn thông qua ID
    const retrieved = await dbGetPlayer('usr_clean_101');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('usr_clean_101');
    expect(retrieved?.name).toBe('Người Chơi Mới');
    expect(retrieved?.coins).toBe(100000);
    expect(retrieved?.elo).toBe(1200);

    // dbGetPlayerProfile cũng trả về đúng hồ sơ người chơi từ bảng players
    const profile = await dbGetPlayerProfile();
    expect(profile).toBeDefined();
    expect(profile?.id).toBe('usr_clean_101');
  });

  it('2. Quản lý danh sách Bot sới bạc hoàn toàn trên cùng bảng players', async () => {
    const bots = generateInitial200Bots().slice(0, 5);
    await dbSaveBotsBatch(bots);

    const storedBots = await dbGetAllBots();
    expect(storedBots.length).toBe(5);
    expect(storedBots[0].id.startsWith('bot_')).toBe(true);

    // Kiểm tra trực tiếp bằng dbGetPlayer với id của bot
    const firstBot = await dbGetPlayer(bots[0].id);
    expect(firstBot).toBeDefined();
    expect(firstBot?.name).toBe(bots[0].name);
    expect(firstBot?.coins).toBe(bots[0].coins);
  });

  it('3. Cập nhật kết quả trận đấu đồng nhất cho cả Người lẫn Bot trên cùng 1 bảng players', async () => {
    // 1 người chơi và 1 bot
    const human: PlayerRecord = {
      id: 'usr_match_1',
      name: 'Chiến Binh',
      avatar: '⚔️',
      coins: 50000,
      elo: 1000,
      status: 'ACTIVE',
      stats: { gamesPlayed: 0, wins: 0, chopsDone: 0, congsGiven: 0, totalEarned: 0, highestStreak: 0, currentStreak: 0 },
      updatedAt: Date.now()
    };
    const bot = generateInitial200Bots()[0];
    bot.id = 'bot_match_1';
    bot.coins = 50000;
    bot.elo = 1000;

    await dbSavePlayer(human);
    await dbSaveBotsBatch([bot]);

    // Người chơi thắng ván đấu (+10.000 xu, +25 elo)
    const updatedHuman = await dbUpdatePlayerMatchResult('usr_match_1', {
      deltaCoins: 10000,
      deltaElo: 25,
      isWin: true,
      chopsDone: 1
    });

    // Bot thua ván đấu (-10.000 xu, -25 elo)
    const updatedBot = await dbUpdatePlayerMatchResult('bot_match_1', {
      deltaCoins: -10000,
      deltaElo: -25,
      isWin: false
    });

    expect(updatedHuman?.coins).toBe(60000);
    expect(updatedHuman?.elo).toBe(1025);
    expect(updatedHuman?.stats.wins).toBe(1);
    expect(updatedHuman?.stats.chopsDone).toBe(1);

    expect(updatedBot?.coins).toBe(40000);
    expect(updatedBot?.elo).toBe(975);
    expect(updatedBot?.stats.wins).toBe(0);
  });
});
