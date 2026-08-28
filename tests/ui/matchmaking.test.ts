import { describe, expect, it, beforeEach } from 'bun:test';
import { useModalStore } from '../../src/stores/useModalStore';
import { matchBotsForPlayerTable } from '../../src/engine/ecosystem/matchmaker';
import { BotEntity } from '../../src/engine/ecosystem/ecosystem-types';
import { getBotConfig } from '../../src/ai/bot-factory';

describe('Kiểm Thử Giả Lập Ghép Trận Online (Matchmaking Simulation Tests)', () => {
  beforeEach(() => {
    useModalStore.getState().closeAllModals();
  });

  it('1. useModalStore: Bật/Tắt Modal MATCHMAKING', () => {
    const modalStore = useModalStore.getState();
    expect(modalStore.isMatchmakingOpen).toBe(false);

    modalStore.openModal('MATCHMAKING');
    expect(useModalStore.getState().isMatchmakingOpen).toBe(true);

    modalStore.closeModal('MATCHMAKING');
    expect(useModalStore.getState().isMatchmakingOpen).toBe(false);
  });

  it('2. Ghép trận: Quét tìm 3 đối thủ trong hệ sinh thái tương thích Elo và tiền cược', () => {
    const mockEcosystemBots: BotEntity[] = [
      {
        ...getBotConfig('BOT_ELO_1450'),
        id: 'BOT_1',
        dnaTier: 3,
        name: 'Hải Đồ Tể',
        avatar: '🔪',
        elo: 1450,
        coins: 50000,
        status: 'ACTIVE',
        activityStatus: 'IDLE',
        title: 'Cao Thủ',
        createdAt: Date.now(),
        currentStreak: 0,
        highestStreak: 2,
        personalityTags: ['Hổ Báo'],
        headToHeadVsHuman: { games: 0, botWins: 0, humanWins: 0, netCoinsEarnedFromHuman: 0 },
        stats: { gamesPlayed: 10, wins: 5, chopsDone: 2, congsGiven: 1, totalEarned: 50000 }
      },
      {
        ...getBotConfig('BOT_ELO_850'),
        id: 'BOT_2',
        dnaTier: 1,
        name: 'Bé Bông',
        avatar: '🌸',
        elo: 850,
        coins: 30000,
        status: 'ACTIVE',
        activityStatus: 'IDLE',
        title: 'Tập Sự',
        createdAt: Date.now(),
        currentStreak: 0,
        highestStreak: 1,
        personalityTags: ['Cẩn Thận'],
        headToHeadVsHuman: { games: 0, botWins: 0, humanWins: 0, netCoinsEarnedFromHuman: 0 },
        stats: { gamesPlayed: 10, wins: 2, chopsDone: 0, congsGiven: 0, totalEarned: 20000 }
      },
      {
        ...getBotConfig('BOT_ELO_1150'),
        id: 'BOT_3',
        dnaTier: 2,
        name: 'Chú Bảy',
        avatar: '☕',
        elo: 1100,
        coins: 40000,
        status: 'ACTIVE',
        activityStatus: 'IDLE',
        title: 'Phong Trào',
        createdAt: Date.now(),
        currentStreak: 0,
        highestStreak: 2,
        personalityTags: ['Linh Hoạt'],
        headToHeadVsHuman: { games: 0, botWins: 0, humanWins: 0, netCoinsEarnedFromHuman: 0 },
        stats: { gamesPlayed: 10, wins: 4, chopsDone: 1, congsGiven: 0, totalEarned: 35000 }
      }
    ];

    const playerElo = 1100;
    const betAmount = 500;
    const requiredCount = 3;

    const matched = matchBotsForPlayerTable(mockEcosystemBots, playerElo, betAmount, requiredCount);

    expect(matched.length).toBe(3);
    expect(matched.map(b => b.name)).toContain('Chú Bảy');
    expect(matched.map(b => b.name)).toContain('Hải Đồ Tể');
    expect(matched.map(b => b.name)).toContain('Bé Bông');
  });

  it('3. Ghép trận Solo 1v1 (2 người chơi): Quét tìm đúng 1 đối thủ gần Elo nhất', () => {
    const mockEcosystemBots: BotEntity[] = [
      {
        ...getBotConfig('BOT_ELO_1450'),
        id: 'BOT_1',
        dnaTier: 3,
        name: 'Hải Đồ Tể',
        avatar: '🔪',
        elo: 1450,
        coins: 50000,
        status: 'ACTIVE',
        activityStatus: 'IDLE',
        title: 'Cao Thủ',
        createdAt: Date.now(),
        currentStreak: 0,
        highestStreak: 2,
        personalityTags: ['Hổ Báo'],
        headToHeadVsHuman: { games: 0, botWins: 0, humanWins: 0, netCoinsEarnedFromHuman: 0 },
        stats: { gamesPlayed: 10, wins: 5, chopsDone: 2, congsGiven: 1, totalEarned: 50000 }
      },
      {
        ...getBotConfig('BOT_ELO_850'),
        id: 'BOT_2',
        dnaTier: 1,
        name: 'Bé Bông',
        avatar: '🌸',
        elo: 850,
        coins: 30000,
        status: 'ACTIVE',
        activityStatus: 'IDLE',
        title: 'Tập Sự',
        createdAt: Date.now(),
        currentStreak: 0,
        highestStreak: 1,
        personalityTags: ['Cẩn Thận'],
        headToHeadVsHuman: { games: 0, botWins: 0, humanWins: 0, netCoinsEarnedFromHuman: 0 },
        stats: { gamesPlayed: 10, wins: 2, chopsDone: 0, congsGiven: 0, totalEarned: 20000 }
      },
      {
        ...getBotConfig('BOT_ELO_1150'),
        id: 'BOT_3',
        dnaTier: 2,
        name: 'Chú Bảy',
        avatar: '☕',
        elo: 1100,
        coins: 40000,
        status: 'ACTIVE',
        activityStatus: 'IDLE',
        title: 'Phong Trào',
        createdAt: Date.now(),
        currentStreak: 0,
        highestStreak: 2,
        personalityTags: ['Linh Hoạt'],
        headToHeadVsHuman: { games: 0, botWins: 0, humanWins: 0, netCoinsEarnedFromHuman: 0 },
        stats: { gamesPlayed: 10, wins: 4, chopsDone: 1, congsGiven: 0, totalEarned: 35000 }
      }
    ];

    const playerElo = 1100;
    const betAmount = 500;
    const requiredCount = 1; // 2 players: 1 human + 1 bot

    const matched = matchBotsForPlayerTable(mockEcosystemBots, playerElo, betAmount, requiredCount);

    expect(matched.length).toBe(1);
    expect(['Chú Bảy', 'Hải Đồ Tể', 'Bé Bông']).toContain(matched[0].name!);
  });

  it('4. Kết toán Elo: Cập nhật biến động Elo trực tiếp cho các Bot tại bàn', async () => {
    const { useEcosystemStore } = await import('../../src/stores/useEcosystemStore');
    const { ecosystemManager } = await import('../../src/engine/ecosystem/ecosystem-manager');
    await useEcosystemStore.getState().initEcosystem();

    const botsBefore = await ecosystemManager.getAllBots();
    expect(botsBefore.length).toBeGreaterThan(0);

    const testBot = botsBefore[0];
    const initialElo = testBot.elo;

    await useEcosystemStore.getState().settleMatchEcosystem({
      humanRank: 2,
      betAmount: 100,
      botResults: [
        {
          botId: testBot.id,
          rank: 1,
          deltaCoins: 500,
          deltaElo: 28,
          chopsDone: 0,
          congsGiven: 0
        }
      ]
    });

    const botsAfter = useEcosystemStore.getState().bots;
    const updatedBot = botsAfter.find(b => b.id === testBot.id);
    expect(updatedBot).toBeDefined();
    expect(updatedBot!.elo).toBe(initialElo + 28);
  });

  it('5. useMatchmakingStore: Khởi tạo, hủy và thực thi trận đấu độc lập', async () => {
    const { useMatchmakingStore } = await import('../../src/stores/useMatchmakingStore');
    let started = false;

    useMatchmakingStore.getState().startMatchmaking({
      betAmount: 2000,
      modeName: 'Đếm Lá Siêu Tốc',
      botConfigs: [{ id: 'BOT_1', name: 'Bot 1' }],
      playerCount: 4,
      onStart: () => {
        started = true;
      }
    });

    expect(useMatchmakingStore.getState().isSearching).toBe(true);
    expect(useMatchmakingStore.getState().pendingMatch?.betAmount).toBe(2000);
    expect(useModalStore.getState().isMatchmakingOpen).toBe(true);

    // Test cancel
    useMatchmakingStore.getState().cancelMatchmaking();
    expect(useMatchmakingStore.getState().isSearching).toBe(false);
    expect(useMatchmakingStore.getState().pendingMatch).toBeNull();
    expect(useModalStore.getState().isMatchmakingOpen).toBe(false);

    // Test execute
    useMatchmakingStore.getState().startMatchmaking({
      betAmount: 5000,
      modeName: 'Nhất Ăn Tất',
      botConfigs: [],
      playerCount: 2,
      onStart: () => {
        started = true;
      }
    });

    useMatchmakingStore.getState().executeMatch();
    expect(started).toBe(true);
    expect(useMatchmakingStore.getState().isSearching).toBe(false);
    expect(useModalStore.getState().isMatchmakingOpen).toBe(false);
  });
});

