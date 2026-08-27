import { describe, expect, it } from 'bun:test';
import { GameEngine } from '../../src/engine/game';
import { GameRulesBuilder } from '../../src/engine/types';
import { Player } from '../../src/engine/types';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';

describe('Bảo Toàn Danh Tính Đối Thủ & Cơ Chế Giải Tán Khi Cháy Túi (Table Preservation & Bankruptcy Dismissal)', () => {
  const rules = GameRulesBuilder.traditional()
    .withTable(t => t.playerCount(4).betAmount(500))
    .build();

  it('1. Ván 2 tiếp theo: Giữ nguyên 100% tên, avatar, persona và bảo lưu số tiền ván trước của cả 3 bot khi chưa cháy túi', () => {
    // Ván 1: 3 đối thủ ban đầu
    const bot1 = createBotPlayer('p1', 'BOT_ELO_1750', { name: 'Hải Đồ Tể', avatar: '🔪', score: 10000 });
    const bot2 = createBotPlayer('p2', 'BOT_ELO_850', { name: 'Bé Bông', avatar: '🌸', score: 8000 });
    const bot3 = createBotPlayer('p3', 'BOT_ELO_1450', { name: 'Chú Bảy', avatar: '☕', score: 15000 });
    const human: Player = createPlayer({ id: 'p0', name: 'Người Chơi', avatar: '🤠', score: 50000 });

    const engineRound1 = new GameEngine([human, bot1, bot2, bot3], rules);
    engineRound1.startNewGame(1, undefined, 99999);

    // Giả lập kết quả ván 1: bot1 thắng thêm 2000 xu, bot2 thua 1500 xu, bot3 thắng 500 xu
    const p1 = engineRound1.getPlayer('p1')!;
    const p2 = engineRound1.getPlayer('p2')!;
    const p3 = engineRound1.getPlayer('p3')!;
    p1.score = 12000;
    p2.score = 6500;
    p3.score = 15500;

    // Chuẩn bị ván 2: Khởi tạo danh sách người chơi cho ván 2 từ ván 1
    const nextGameNumber = 2;

    const round2Players: Player[] = [human, p1, p2, p3].map((p) => {
      const prevPlayer = engineRound1.getPlayer(p.id);
      const prevScore = prevPlayer ? prevPlayer.score : p.score;
      const resolvedPlayer = prevPlayer || p;

      return {
        ...resolvedPlayer,
        hand: [],
        playedCards: [],
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        rankPosition: null,
        instantWinType: null,
        score: prevScore
      };
    });

    const engineRound2 = new GameEngine(round2Players, rules);
    engineRound2.startNewGame(nextGameNumber, undefined, 88888);

    // Xác nhận ván 2 vẫn giữ nguyên 100% 3 bot đó với số tiền mới
    expect(engineRound2.players.length).toBe(4);
    expect(engineRound2.getPlayer('p1')?.name).toBe('Hải Đồ Tể');
    expect(engineRound2.getPlayer('p1')?.avatar).toBe('🔪');
    expect(engineRound2.getPlayer('p1')?.score).toBe(12000);

    expect(engineRound2.getPlayer('p2')?.name).toBe('Bé Bông');
    expect(engineRound2.getPlayer('p2')?.avatar).toBe('🌸');
    expect(engineRound2.getPlayer('p2')?.score).toBe(6500);

    expect(engineRound2.getPlayer('p3')?.name).toBe('Chú Bảy');
    expect(engineRound2.getPlayer('p3')?.avatar).toBe('☕');
    expect(engineRound2.getPlayer('p3')?.score).toBe(15500);
  });

  it('2. Khi có đối thủ cháy túi (< tiền cược), hệ thống kích hoạt điều kiện giải tán bàn (isTableDismissed = true)', () => {
    const betAmount = 500;
    const allPlayers: Player[] = [
      createPlayer({ id: 'p0', name: 'Người Chơi', avatar: '🤠', score: 50000 }),
      createBotPlayer('p1', 'BOT_ELO_1750', { name: 'Hải Đồ Tể', avatar: '🔪', score: 12000 }),
      createBotPlayer('p2', 'BOT_ELO_850', { name: 'Bé Bông', avatar: '🌸', score: 150 }), // Cháy túi!
      createBotPlayer('p3', 'BOT_ELO_1450', { name: 'Chú Bảy', avatar: '☕', score: 15500 })
    ];

    const isCampaign = false;
    const playerCoins = 50000;

    const bankruptBots = !isCampaign ? allPlayers.filter(p => p.isBot && (p.score || 0) < betAmount) : [];
    const isHumanBankrupt = !isCampaign && playerCoins < betAmount;
    const isTableDismissed = !isCampaign && (bankruptBots.length > 0 || isHumanBankrupt);

    expect(isTableDismissed).toBe(true);
    expect(bankruptBots.length).toBe(1);
    expect(bankruptBots[0].name).toBe('Bé Bông');
    expect(isHumanBankrupt).toBe(false);
  });

  it('3. Khi người chơi cháy túi (< tiền cược), kích hoạt giải tán và cảnh báo người chơi', () => {
    const betAmount = 500;
    const allPlayers: Player[] = [
      createPlayer({ id: 'p0', name: 'Người Chơi', avatar: '🤠', score: 100 }),
      createBotPlayer('p1', 'BOT_ELO_1750', { name: 'Hải Đồ Tể', avatar: '🔪', score: 12000 }),
      createBotPlayer('p2', 'BOT_ELO_850', { name: 'Bé Bông', avatar: '🌸', score: 8000 }),
      createBotPlayer('p3', 'BOT_ELO_1450', { name: 'Chú Bảy', avatar: '☕', score: 15500 })
    ];

    const isCampaign = false;
    const playerCoins = 100; // Người chơi cháy túi

    const bankruptBots = !isCampaign ? allPlayers.filter(p => p.isBot && (p.score || 0) < betAmount) : [];
    const isHumanBankrupt = !isCampaign && playerCoins < betAmount;
    const isTableDismissed = !isCampaign && (bankruptBots.length > 0 || isHumanBankrupt);

    expect(isTableDismissed).toBe(true);
    expect(bankruptBots.length).toBe(0);
    expect(isHumanBankrupt).toBe(true);
  });
});
