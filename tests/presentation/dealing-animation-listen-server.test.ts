import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { ClientSession } from '../../src/engine/presentation/client-session';
import { BotAgent } from '../../src/engine/server/bot-agent';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { createDefaultGameRules, Card } from '../../src/engine/types';
import { DEFAULT_GAME_SETTINGS } from '../../src/stores/game/tableConfigSlice';
import type { HostToClientPacket } from '../../src/engine/transport/transport.interface';
import { useGameStore } from '../../src/stores/useGameStore';
import { bindSessionToGameStore } from '../../src/stores/game/session-store-bridge';
import { appFlowCoordinator } from '../../src/services/app-flow-coordinator';
import { useUserStore } from '../../src/stores/useUserStore';

import { loadPlayerProfile } from '../../src/engine/storage';
import { createTableStateSyncPacket } from '../../src/engine/network/packet-factory';

describe('Dealing Animation & Sound Coordination in Listen Server Architecture', () => {
  beforeEach(() => {
    useGameStore.getState().resetMatchState();
    useUserStore.getState().setProfile(loadPlayerProfile());
  });

  afterEach(() => {
    appFlowCoordinator.returnToLobby();
    useGameStore.getState().resetMatchState();
    useUserStore.getState().setProfile(loadPlayerProfile());
  });

  it('1. AuthoritativeMatchHost với enableDealingAnimation = true: Khởi đầu ở trạng thái isDealing = true và cấm đánh bài', () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true },
      instantWin: { enabled: false }
    });

    const p1 = createPlayer({ id: 'human_1', name: 'kk' });
    const p2 = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Daiki' });

    const host = new AuthoritativeMatchHost({
      rules,
      players: [p1, p2],
      hostPlayerId: p1.id,
      enableDealingAnimation: true
    });

    const p1Transports = createMemoryDuplexTransport('HOST', p1.id);
    host.registerClient(p1.id, p1Transports.hostTransport);

    const receivedPackets: HostToClientPacket[] = [];
    p1Transports.clientTransport.onMessage(msg => receivedPackets.push(msg));

    host.startMatch(1);

    // Host phải đang trong trạng thái chia bài
    expect(host.isDealing).toBe(true);
    expect(host.dealtCounts[p1.id]).toBe(0);
    expect(host.dealtCounts[p2.id]).toBe(0);

    // Gói DEAL_HAND phải đến Client với 13 lá
    const dealMsg = receivedPackets.find(p => p.type === 'DEAL_HAND');
    expect(dealMsg).toBeDefined();
    if (dealMsg && dealMsg.type === 'DEAL_HAND') {
      expect(dealMsg.packet.cards.length).toBe(13);
    }

    // Gói TABLE_SYNC phải phản ánh isDealing = true và remainingCardCounts = 0
    const syncMsg = receivedPackets.find(p => p.type === 'TABLE_SYNC');
    expect(syncMsg).toBeDefined();
    if (syncMsg && syncMsg.type === 'TABLE_SYNC') {
      expect(syncMsg.packet.isDealing).toBe(true);
      expect(syncMsg.packet.remainingCardCounts[p1.id]).toBe(0);
      expect(syncMsg.packet.remainingCardCounts[p2.id]).toBe(0);
    }

    // Thử gửi hành động đánh bài trong lúc đang chia bài -> Phải bị Host từ chối
    const humanHand = host.engine.players[0].hand;
    p1Transports.clientTransport.send({
      type: 'PLAYER_ACTION',
      packet: {
        type: 'PLAY',
        playerId: p1.id,
        cardIds: [humanHand[0].id],
        timestamp: Date.now()
      }
    });

    // Bàn đấu vẫn chưa có nước đi nào được đánh
    expect(host.engine.currentRound.moves.length).toBe(0);

    host.dispose();
  });

  it('2. dealCardStep & finishDealing cập nhật mượt mà số bài và phát sinh Banner mở màn', () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true },
      instantWin: { enabled: false }
    });

    const p1 = createPlayer({ id: 'human_1', name: 'kk' });
    const p2 = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Daiki' });

    const host = new AuthoritativeMatchHost({
      rules,
      players: [p1, p2],
      hostPlayerId: p1.id,
      enableDealingAnimation: true,
      instantDelay: true // Cho phép banner chạy ngay không cần setTimeout 2s
    });

    const p1Transports = createMemoryDuplexTransport('HOST', p1.id);
    host.registerClient(p1.id, p1Transports.hostTransport);

    const receivedPackets: HostToClientPacket[] = [];
    p1Transports.clientTransport.onMessage(msg => receivedPackets.push(msg));

    host.startMatch(1);
    expect(host.isDealing).toBe(true);

    // Mô phỏng từng lá bay tới ghế
    host.dealCardStep(0, 4);
    host.dealCardStep(1, 4);
    expect(host.dealtCounts[p1.id]).toBe(4);
    expect(host.dealtCounts[p2.id]).toBe(4);

    // Kết thúc chia bài
    host.finishDealing();
    expect(host.isDealing).toBe(false);
    expect(host.dealtCounts[p1.id]).toBe(13);
    expect(host.dealtCounts[p2.id]).toBe(13);

    // Banner mở màn phải xuất hiện thông báo ai giành quyền đi đầu
    expect(host.dealBanner).toBeTruthy();
    expect(host.dealBanner).toContain('giành quyền mở màn');

    host.dispose();
  });

  it('3. ClientSession chuyển đổi chính xác giữa DEALING và PLAYING, đồng bộ dealBanner vào Store', () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true }
    });

    const p1 = createPlayer({ id: 'human_1', name: 'kk' });
    const p2 = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Daiki' });

    const humanTransports = createMemoryDuplexTransport('HOST', p1.id);

    const session = new ClientSession({
      localPlayerId: p1.id,
      transport: humanTransports.clientTransport,
      gameRules: rules,
      initialPlayers: [p1, p2]
    });
    const unbindStore = bindSessionToGameStore(session);

    // Giả lập Host gửi DEAL_HAND
    humanTransports.hostTransport.send({
      type: 'DEAL_HAND',
      packet: {
        playerId: p1.id,
        cards: [
          { rank: 3, suit: 'SPADES', id: '3S' },
          { rank: 4, suit: 'CLUBS', id: '4C' }
        ],
        leadPlayerId: p1.id,
        firstTurnPlayerId: p1.id,
        gameNumber: 1
      }
    });

    // Giả lập Host gửi TABLE_SYNC với isDealing = true
    humanTransports.hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableStateSyncPacket({
        gameNumber: 1,
        seq: 1,
        roundNumber: 1,
        isGameOver: false,
        currentTurnPlayerId: null,
        leadPlayerId: null,
        remainingCardCounts: { [p1.id]: 0, [p2.id]: 0 },
        passedPlayerIds: [],
        winners: [],
        isChop: false,
        isCascadeChop: false,
        isDealing: true,
        dealtCounts: { [p1.id]: 0, [p2.id]: 0 },
        dealBanner: null,
        seats: [
          { playerId: p1.id, name: p1.name, avatar: 'avatar.png', cardCount: 0, score: 1000, isPassed: false, isCurrentTurn: false, isBot: false, wins: 0, initialScore: 1000 },
          { playerId: p2.id, name: p2.name, avatar: 'avatar.png', cardCount: 0, score: 1000, isPassed: false, isCurrentTurn: false, isBot: true, wins: 0, initialScore: 1000 }
        ]
      })
    });

    // ClientSession phải ở trạng thái isDealing = true
    const dealingFrame = session.getLatestFrame();
    expect(dealingFrame.isDealing).toBe(true);
    expect(useGameStore.getState().isDealing).toBe(true);

    // Cập nhật từng lá bay
    session.dealCardStep(0, 1);
    expect(session.getLatestFrame().dealtCounts[p1.id]).toBe(1);

    // Host gửi TABLE_SYNC với isDealing = false và dealBanner
    humanTransports.hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableStateSyncPacket({
        gameNumber: 1,
        seq: 2,
        roundNumber: 1,
        isGameOver: false,
        currentTurnPlayerId: p1.id,
        leadPlayerId: p1.id,
        remainingCardCounts: { [p1.id]: 2, [p2.id]: 2 },
        passedPlayerIds: [],
        winners: [],
        isChop: false,
        isCascadeChop: false,
        isDealing: false,
        dealBanner: 'Bạn giành quyền mở màn (3 Bích)!',
        seats: [
          { playerId: p1.id, name: p1.name, avatar: 'avatar.png', cardCount: 2, score: 1000, isPassed: false, isCurrentTurn: true, isBot: false, wins: 0, initialScore: 1000 },
          { playerId: p2.id, name: p2.name, avatar: 'avatar.png', cardCount: 2, score: 1000, isPassed: false, isCurrentTurn: false, isBot: true, wins: 0, initialScore: 1000 }
        ]
      })
    });

    const playingFrame = session.getLatestFrame();
    expect(playingFrame.isDealing).toBe(false);
    expect(playingFrame.dealBanner).toBe('Bạn giành quyền mở màn (3 Bích)!');
    expect(useGameStore.getState().isDealing).toBe(false);
    expect(useGameStore.getState().dealBanner).toBe('Bạn giành quyền mở màn (3 Bích)!');

    unbindStore();
    session.dispose();
  });

  it('4. BotAgent không bao giờ đánh bài khi isDealing = true hoặc khi dealBanner đang hiển thị', async () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true }
    });

    const botId = 'bot_1';
    const botTransports = createMemoryDuplexTransport('HOST', botId);

    const bot = new BotAgent({
      botId,
      personaId: 'BOT_ELO_1150',
      transport: botTransports.clientTransport,
      instantDelay: true // Nếu không bị chặn thì sẽ đánh ngay lập tức (0ms)
    });

    const botSentPackets: any[] = [];
    botTransports.hostTransport.onMessage(msg => botSentPackets.push(msg));

    // Chia bài cho bot
    botTransports.hostTransport.send({
      type: 'DEAL_HAND',
      packet: {
        playerId: botId,
        cards: [{ rank: 3, suit: 'SPADES', id: '3S' }],
        leadPlayerId: botId,
        firstTurnPlayerId: botId,
        gameNumber: 1
      }
    });

    // Gửi TABLE_SYNC nhưng isDealing = true
    botTransports.hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableStateSyncPacket({
        gameNumber: 1,
        seq: 1,
        roundNumber: 1,
        isGameOver: false,
        currentTurnPlayerId: botId,
        leadPlayerId: botId,
        remainingCardCounts: { [botId]: 1 },
        passedPlayerIds: [],
        winners: [],
        isChop: false,
        isCascadeChop: false,
        isDealing: true,
        dealBanner: null,
        seats: [
          { playerId: botId, name: 'Daiki', avatar: 'avatar.png', cardCount: 1, score: 1000, isPassed: false, isCurrentTurn: true, isBot: true, wins: 0, initialScore: 1000 }
        ]
      })
    });

    // Bot phải chờ, KHÔNG được gửi nước đi nào
    expect(botSentPackets.length).toBe(0);

    // Gửi TABLE_SYNC khi banner đang hiển thị
    botTransports.hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableStateSyncPacket({
        gameNumber: 1,
        seq: 2,
        roundNumber: 1,
        isGameOver: false,
        currentTurnPlayerId: botId,
        leadPlayerId: botId,
        remainingCardCounts: { [botId]: 1 },
        passedPlayerIds: [],
        winners: [],
        isChop: false,
        isCascadeChop: false,
        isDealing: false,
        dealBanner: 'Daiki giành quyền mở màn (3 Bích)!',
        seats: [
          { playerId: botId, name: 'Daiki', avatar: 'avatar.png', cardCount: 1, score: 1000, isPassed: false, isCurrentTurn: true, isBot: true, wins: 0, initialScore: 1000 }
        ]
      })
    });

    // Bot vẫn phải chờ banner kết thúc
    expect(botSentPackets.length).toBe(0);

    // Banner biến mất, chính thức vào lượt đánh
    botTransports.hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableStateSyncPacket({
        gameNumber: 1,
        seq: 3,
        roundNumber: 1,
        isGameOver: false,
        currentTurnPlayerId: botId,
        leadPlayerId: botId,
        remainingCardCounts: { [botId]: 1 },
        passedPlayerIds: [],
        winners: [],
        isChop: false,
        isCascadeChop: false,
        isDealing: false,
        dealBanner: null,
        seats: [
          { playerId: botId, name: 'Daiki', avatar: 'avatar.png', cardCount: 1, score: 1000, isPassed: false, isCurrentTurn: true, isBot: true, wins: 0, initialScore: 1000 }
        ]
      })
    });

    // Bây giờ Bot mới gửi nước đi (chờ nhịp async 20ms của instantDelay)
    await new Promise(r => setTimeout(r, 20));
    expect(botSentPackets.length).toBeGreaterThan(0);
    expect(botSentPackets[0].packet.type).toBe('PLAY');
    expect(botSentPackets[0].packet.cardIds).toEqual(['3_SPADES']);

    bot.dispose();
  });

  it('5. AppFlowCoordinator startTable khởi chạy ván đấu với hoạt ảnh chia bài đầy đủ', () => {
    const profile = {
      ...useUserStore.getState().profile,
      id: 'human_player_1',
      name: 'kk',
      coins: 50000
    };
    useUserStore.getState().setProfile(profile);

    appFlowCoordinator.startTable({
      gameType: 'QUICK',
      rules: createDefaultGameRules({ table: { playerCount: 2, betAmount: 1000 } }),
      settings: { ...DEFAULT_GAME_SETTINGS, betAmount: 1000, mode: 'COUNT_CARDS' },
      playerCount: 2,
      botPersonaIds: ['BOT_ELO_1150', 'BOT_ELO_1150', 'BOT_ELO_1150'],
      customBotConfigs: [{}, {}, {}],
      campaignChapter: null
    });

    // Kiểm tra state khởi đầu trong useGameStore
    const storeState = useGameStore.getState();
    expect(storeState.isDealing).toBe(true);
    expect(storeState.dealtCounts[profile.id]).toBe(0);

    // Mô phỏng chia bài bay
    appFlowCoordinator.dealCardStep(0, 5);
    expect(useGameStore.getState().dealtCounts[profile.id]).toBe(5);

    // Mô phỏng kết thúc chia bài
    appFlowCoordinator.finishDealing();
    expect(useGameStore.getState().isDealing).toBe(false);
    expect(useGameStore.getState().dealtCounts[profile.id]).toBe(13);
  });

  it('6. Host clears dealBanner immediately when any player plays a move, preventing persistent banner overlay', () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true },
      instantWin: { enabled: false }
    });

    const p1 = createPlayer({ id: 'human_1', name: 'kk' });
    const p2 = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Daiki' });

    const p1Transports = createMemoryDuplexTransport('HOST', p1.id);

    const host = new AuthoritativeMatchHost({
      rules,
      players: [p1, p2],
      hostPlayerId: p1.id,
      instantDelay: true,
      enableDealingAnimation: true
    });
    host.registerClient(p1.id, p1Transports.hostTransport);

    host.startMatch(1);
    host.finishDealing();

    // Deal banner ban đầu xuất hiện
    expect(host.dealBanner).toBeTruthy();

    // Người chơi đánh bài đầu tiên
    const currentLead = host.engine.getCurrentPlayer();
    expect(currentLead).toBeDefined();
    const playedCard = host.engine.firstMoveRequiredCard || currentLead!.hand[0];

    host.handleClientPacket(currentLead!.id, {
      type: 'PLAYER_ACTION',
      packet: {
        type: 'PLAY',
        playerId: currentLead!.id,
        cardIds: [playedCard.id],
        timestamp: Date.now()
      }
    });

    // Ngay khi có nước đánh, dealBanner phải bị xóa ngay lập tức (null)
    expect(host.dealBanner).toBeNull();

    host.dispose();
  });
});
