import { describe, it, expect } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { BotAgent } from '../../src/engine/server/bot-agent';
import { ClientSession } from '../../src/engine/presentation/client-session';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createDefaultGameRules } from '../../src/engine/types';
import type { MatchPlayer } from '../../src/engine/types';

describe('Unified Listen Server Architecture (Full End-to-End Simulation)', () => {
  it('should run a complete multi-turn offline match with 1 Local Human Client and 3 Bot Agents', async () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 4, betAmount: 1000, soundEnabled: true }
    });

    const humanId = 'HUMAN_ME';
    const bot1Id = 'BOT_EAST';
    const bot2Id = 'BOT_NORTH';
    const bot3Id = 'BOT_WEST';

    const players: MatchPlayer[] = [
      {
        id: humanId,
        name: 'Human Player',
        avatar: 'human.png',
        hand: [],
        cardCount: 0,
        playedCards: [],
        score: 5000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        isBot: false
      },
      {
        id: bot1Id,
        name: 'Bot East',
        avatar: 'b1.png',
        hand: [],
        cardCount: 0,
        playedCards: [],
        score: 5000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        isBot: true,
        botPersonaId: 'BOT_ELO_850'
      },
      {
        id: bot2Id,
        name: 'Bot North',
        avatar: 'b2.png',
        hand: [],
        cardCount: 0,
        playedCards: [],
        score: 5000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        isBot: true,
        botPersonaId: 'BOT_ELO_1150'
      },
      {
        id: bot3Id,
        name: 'Bot West',
        avatar: 'b3.png',
        hand: [],
        cardCount: 0,
        playedCards: [],
        score: 5000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        isBot: true,
        botPersonaId: 'BOT_ELO_1450'
      }
    ];

    // 1. Khởi tạo Host
    const host = new AuthoritativeMatchHost({
      rules,
      players,
      hostPlayerId: humanId,
      instantDelay: true
    });

    // 2. Tạo transport cho từng người
    const humanTransport = createMemoryDuplexTransport('HOST', humanId);
    const bot1Transport = createMemoryDuplexTransport('HOST', bot1Id);
    const bot2Transport = createMemoryDuplexTransport('HOST', bot2Id);
    const bot3Transport = createMemoryDuplexTransport('HOST', bot3Id);

    // 3. Kết nối vào Host
    host.registerClient(humanId, humanTransport.hostTransport);
    host.registerClient(bot1Id, bot1Transport.hostTransport);
    host.registerClient(bot2Id, bot2Transport.hostTransport);
    host.registerClient(bot3Id, bot3Transport.hostTransport);

    // 4. Khởi tạo Human ClientSession (cho Web UI)
    const humanSession = new ClientSession({
      localPlayerId: humanId,
      transport: humanTransport.clientTransport,
      gameRules: rules,
      initialPlayers: players
    });

    // 5. Khởi tạo 3 BotAgent
    const bot1 = new BotAgent({ botId: bot1Id, personaId: 'BOT_ELO_850', transport: bot1Transport.clientTransport, instantDelay: true });
    const bot2 = new BotAgent({ botId: bot2Id, personaId: 'BOT_ELO_1150', transport: bot2Transport.clientTransport, instantDelay: true });
    const bot3 = new BotAgent({ botId: bot3Id, personaId: 'BOT_ELO_1450', transport: bot3Transport.clientTransport, instantDelay: true });

    // 6. Bắt đầu trận đấu
    host.startMatch(1);

    // Kiểm tra tất cả người chơi đều nhận đúng 13 lá bài
    const humanFrame = humanSession.getLatestFrame();
    expect(humanFrame.myHand).toHaveLength(13);
    expect(bot1.getHand()).toHaveLength(13);
    expect(bot2.getHand()).toHaveLength(13);
    expect(bot3.getHand()).toHaveLength(13);

    // Kiểm tra Fog of War: Human UI thấy 3 đối thủ đều có cardCount = 13
    expect(humanFrame.seats).toHaveLength(4);
    const opponentSeats = humanFrame.seats.filter(s => !s.isLocal);
    expect(opponentSeats).toHaveLength(3);
    opponentSeats.forEach(seat => {
      expect(seat.cardCount).toBe(13);
    });

    // Cho game chạy một vài lượt để bot hoặc người đánh bài
    await new Promise(resolve => setTimeout(resolve, 50));

    // Nếu tới lượt người chơi, người chơi chọn bài và đánh
    let frame = humanSession.getLatestFrame();
    if (frame.controls.isMyTurn) {
      // Dùng quick select để chọn bài tự động
      humanSession.sendIntent({ type: 'TRIGGER_QUICK_SELECT' });
      frame = humanSession.getLatestFrame();
      if (frame.controls.canPlay) {
        humanSession.sendIntent({ type: 'SUBMIT_PLAY' });
      }
    }

    await new Promise(resolve => setTimeout(resolve, 50));

    // Kiểm tra bàn đấu đã có ít nhất một nước đi được đánh ra
    expect(host.engine.playedCardsInGame.length).toBeGreaterThan(0);

    // Cleanup
    bot1.dispose();
    bot2.dispose();
    bot3.dispose();
    humanSession.dispose();
    host.dispose();
  });
});
