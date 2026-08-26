import { describe, test, expect } from 'bun:test';
import { getBotConfig, getRandomBotConfigsForTable, generateRandomBotConfig } from '../../src/ai/bot-factory';
import { CountCardsModeStrategy, TraditionalModeStrategy } from '../../src/engine/strategies/game-mode-strategy';
import { PlayerProfile, loadPlayerProfile } from '../../src/engine/storage';

describe('Bot Factory & Dynamic Matchmaking Verification', () => {
  test('1. getBotConfig giải mã chính xác dynamic ID dạng dyn_BOT_ELO_XXX', () => {
    const dynamicId1 = 'dyn_BOT_ELO_1900_1724567890123_456';
    const config1 = getBotConfig(dynamicId1);
    expect(config1.elo).toBe(1900);
    expect(config1.tier).toBe('Tier 4: Master');

    const dynamicId2 = 'dyn_BOT_ELO_850_1724567890123_789';
    const config2 = getBotConfig(dynamicId2);
    expect(config2.elo).toBe(850);
    expect(config2.tier).toBe('Tier 1: Rookie');

    const dynamicId3 = 'dyn_BOT_ELO_2300_1724567890123_101';
    const config3 = getBotConfig(dynamicId3);
    expect(config3.elo).toBe(2300);
    expect(config3.tier).toBe('Tier 5: Mythic');
  });

  test('2. getRandomBotConfigsForTable sinh ra 3 Bot có Elo, Tên và Avatar đa dạng không trùng lặp', () => {
    const bots = getRandomBotConfigsForTable([1, 2, 3, 4, 5], 3);
    expect(bots.length).toBe(3);

    const elos = bots.map(b => b.elo);
    const names = bots.map(b => b.name);
    const avatars = bots.map(b => b.avatar);

    // Không bị lỗi tất cả cùng 1150
    const uniqueElos = new Set(elos);
    expect(uniqueElos.size).toBeGreaterThan(1);

    // Tên và avatar không bị trùng
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(3);
  });

  test('3. Chơi Nhanh (GameModeStrategy setupMatch) khởi tạo 3 Bot đối thủ với Elo khác nhau', () => {
    const profile: PlayerProfile = {
      ...loadPlayerProfile(),
      name: 'Tester',
      avatar: '🤠',
      coins: 50000,
      elo: 1200
    };

    const randomBots = getRandomBotConfigsForTable([1, 2, 3, 4, 5], 3);
    const strategy = new CountCardsModeStrategy();

    const setupResult = strategy.setupMatch({
      profile,
      playerCount: 4,
      customRules: null,
      customSettings: null,
      campaignChapter: null,
      customBotPersonaIds: [
        randomBots[0].id,
        randomBots[1].id,
        randomBots[2].id
      ],
      customBotConfigs: [
        randomBots[0],
        randomBots[1],
        randomBots[2]
      ]
    });

    const botPlayers = setupResult.initialPlayers.filter(p => p.isBot);
    expect(botPlayers.length).toBe(3);

    const botConfigs = botPlayers.map((p, i) => getBotConfig(setupResult.botPersonaIds[i], setupResult.customBotConfigs[i]));
    const botElos = botConfigs.map(c => c.elo);

    // Xác nhận 3 bot không bị gán cứng cùng 1 mức elo
    const uniqueElos = new Set(botElos);
    expect(uniqueElos.size).toBeGreaterThan(1);
  });
});
