import { describe, test, expect } from 'bun:test';
import { 
  createPlayer, 
  createBotPlayer, 
  createTestPlayers, 
  createBotPlayers 
} from '../../src/engine/player-factory';

describe('Player & Bot Factory Helper Tests', () => {
  test('1. createPlayer: Khởi tạo người chơi mặc định với đầy đủ các thuộc tính chuẩn', () => {
    const player = createPlayer();
    expect(player.id.startsWith('usr_')).toBe(true);
    expect(player.name).toBe('Người Chơi');
    expect(player.avatar).toBe('🤠');
    expect(player.isBot).toBe(false);
    expect(player.botPersonaId).toBeUndefined();
    expect(player.hand).toEqual([]);
    expect(player.playedCards).toEqual([]);
    expect(player.score).toBe(50000);
    expect(player.isPassedCurrentRound).toBe(false);
    expect(player.hasPlayedFirstCard).toBe(false);
    expect(player.rankPosition).toBeNull();
    expect(player.instantWinType).toBeNull();
  });

  test('2. createPlayer: Hỗ trợ ghi đè (overrides) các thuộc tính linh hoạt', () => {
    const custom = createPlayer({
      id: 'custom_01',
      name: 'Cao Thủ',
      score: 100000,
      hasPlayedFirstCard: true
    });
    expect(custom.id).toBe('custom_01');
    expect(custom.name).toBe('Cao Thủ');
    expect(custom.score).toBe(100000);
    expect(custom.hasPlayedFirstCard).toBe(true);
    expect(custom.isBot).toBe(false);
  });

  test('3. createBotPlayer: Tự động gắn cờ isBot = true, avatar mặc định và parse id/name', () => {
    const bot1 = createBotPlayer(1);
    expect(bot1.id).toBe('p1');
    expect(bot1.name).toBe('Bot 1');
    expect(bot1.avatar).toBe('🤖');
    expect(bot1.isBot).toBe(true);
    expect(bot1.botPersonaId).toBe('BOT_ELO_1150');
    expect(bot1.score).toBe(1000);

    const botNamed = createBotPlayer('bot_custom', 'BOT_ELO_1450', { name: 'Thần Bài', score: 20000 });
    expect(botNamed.id).toBe('bot_custom');
    expect(botNamed.name).toBe('Thần Bài');
    expect(botNamed.botPersonaId).toBe('BOT_ELO_1450');
    expect(botNamed.score).toBe(20000);
    expect(botNamed.isBot).toBe(true);
  });

  test('4. createTestPlayers: Sinh bàn chơi 4 người (1 Người chơi + 3 Bot) chuẩn test', () => {
    const table = createTestPlayers(4, 5000, ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1450']);
    expect(table.length).toBe(4);

    expect(table[0].id).toBe('p0');
    expect(table[0].isBot).toBe(false);
    expect(table[0].score).toBe(5000);

    expect(table[1].id).toBe('p1');
    expect(table[1].isBot).toBe(true);
    expect(table[1].botPersonaId).toBe('BOT_ELO_850');
    expect(table[1].score).toBe(5000);

    expect(table[2].id).toBe('p2');
    expect(table[2].botPersonaId).toBe('BOT_ELO_1150');

    expect(table[3].id).toBe('p3');
    expect(table[3].botPersonaId).toBe('BOT_ELO_1450');
  });

  test('5. createBotPlayers: Sinh danh sách N bot mô phỏng đấu giải Bot vs Bot', () => {
    const bots = createBotPlayers(3, [
      { name: 'Alpha', score: 10000 },
      { name: 'Beta', score: 20000 },
      { name: 'Gamma', score: 30000 }
    ]);
    expect(bots.length).toBe(3);
    expect(bots.every(b => b.isBot)).toBe(true);
    expect(bots[0].name).toBe('Alpha');
    expect(bots[1].name).toBe('Beta');
    expect(bots[2].name).toBe('Gamma');
  });
});
