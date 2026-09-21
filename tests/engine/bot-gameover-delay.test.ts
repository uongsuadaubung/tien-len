import { describe, expect, it } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { createDefaultGameRules, createPlayedMove } from '../../src/engine/types';
import { createCard } from '../../src/engine/card';
import { CardTracker } from '../../src/ai/card-tracker';
import { UI_TIMINGS } from '../../src/ui/constants/ui-timings';
import { mapMatchStateToSnapshot } from '../../src/engine/state-machine/match-state-machine';
import { GameOverMatchState } from '../../src/engine/state-machine/types';
import { createPerspectiveSettlement } from '../../src/engine/settlement/perspective-settlement';

describe('Bot Winning Card Visibility & 2-Second Victory Modal Delay Tests', () => {
  it('1. UI_TIMINGS: GAME_OVER_MODAL_DELAY_MS được định nghĩa chính xác là 2000ms (2 giây)', () => {
    expect(UI_TIMINGS.GAME_OVER_MODAL_DELAY_MS).toBe(2000);
  });

  it('2. State Machine: GameOverMatchState lưu giữ leadingMove và map sang currentMove trong snapshot', () => {
    const mockCard = createCard(10, 'HEARTS');
    const winningMove = createPlayedMove('bot_1', {
      type: 'SINGLE',
      cards: [mockCard],
      highestCard: mockCard,
      length: 1
    });

    const botPlayer = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Bot Cao Thủ' });
    const mockSettlement = createPerspectiveSettlement({
      subjectPlayerId: 'bot_1',
      allPlayers: [botPlayer],
      winners: [botPlayer],
      payouts: { bot_1: 0 },
      eloDeltas: { bot_1: 0 },
      subjectEloDelta: 0,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: false,
      instantWinType: null,
      betAmount: 1000,
      subjectCoins: 50000,
      activeGameType: 'QUICK'
    });

    const gameOverState: GameOverMatchState = {
      status: 'GAME_OVER',
      gameNumber: 1,
      players: [botPlayer],
      winners: [botPlayer],
      winningMove,
      isThreeSpadesWin: false,
      matchPayouts: { bot_1: 0 },
      eloDeltas: { bot_1: 0 },
      settlement: mockSettlement,
      matchLogReport: null,
      rules: createDefaultGameRules(),
      leadingMove: winningMove
    };

    const snapshot = mapMatchStateToSnapshot(gameOverState);
    expect(snapshot.isGameOver).toBe(true);
    expect(snapshot.currentMove).not.toBeNull();
    expect(snapshot.currentMove?.playerId).toBe('bot_1');
    expect(snapshot.currentMove?.combination.cards[0].id).toBe(mockCard.id);
  });

  it('3. AuthoritativeMatchHost: Khi Bot đánh quân chốt hạ, bài hiển thị trên bàn và sync packet lưu giữ currentMoveCards', () => {
    const rules = createDefaultGameRules();
    rules.settlementRule = 'COUNT_CARDS'; // Đếm lá: ai hết bài trước thắng ngay

    const human = createPlayer({ id: 'human_0', name: 'Người Chơi', avatar: '🤠' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Bot Cao Thủ', avatar: '🤖' });

    const winningCard = createCard(14, 'HEARTS');
    bot.hand = [winningCard];
    human.hand = [
      createCard(4, 'SPADES'),
      createCard(5, 'SPADES'),
      createCard(6, 'SPADES'),
      createCard(7, 'SPADES'),
      createCard(8, 'SPADES')
    ];

    const host = new AuthoritativeMatchHost({
      rules,
      players: [human, bot],
      hostPlayerId: 'human_0'
    });
    host.startMatch(1);
    host.engine.isFirstMoveOfGame = false;
    host.engine.firstMoveRequiredCard = null;
    host.engine.currentRound.leadPlayerId = 'bot_1';
    host.engine.currentRound.currentTurnPlayerId = 'bot_1';
    host.engine.currentRound.moves = [];
    host.engine.players[0].hand = [...human.hand];
    host.engine.players[1].hand = [winningCard];

    let lastSyncPacket: any = null;
    host.registerClient('human_0', {
      isConnected: true,
      send: (msg: any) => {
        if (msg.type === 'TABLE_SYNC') {
          lastSyncPacket = msg.packet;
        }
      },
      onMessage: () => () => {},
      disconnect: () => {}
    });

    const botConfig = { memoryDepth: 1 };
    const tracker = new CardTracker(bot.hand, 1, 2);

    // Trigger bot turn
    const botRes = host.engine.executeBotTurn(botConfig as any, tracker);
    expect(botRes.action).toBe('PLAY');
    expect(host.engine.isGameOver).toBe(true);

    if (botRes.action === 'PLAY') {
      (host as any).lastPlayedMove = botRes.playedMove;
      host.broadcastTableSync();
    }

    expect(lastSyncPacket).not.toBeNull();
    expect(lastSyncPacket.isGameOver).toBe(true);
    expect(lastSyncPacket.currentMoveCards).toBeDefined();
    expect(lastSyncPacket.currentMoveCards[0].id).toBe(winningCard.id);
    expect(lastSyncPacket.currentMovePlayerId).toBe('bot_1');

    host.dispose();
  });

  it('4. AuthoritativeMatchHost: clearAllTimers dọn sạch gameOverTimer khi người chơi thoát bàn', () => {
    const host = new AuthoritativeMatchHost({
      rules: createDefaultGameRules(),
      players: [createPlayer({ id: 'p0', name: 'User' })],
      hostPlayerId: 'p0'
    });
    // Gán 1 timer giả lập
    (host as any).gameOverTimer = setTimeout(() => {}, 10000);
    expect((host as any).gameOverTimer).not.toBeNull();

    host.dispose();
    expect((host as any).gameOverTimer).toBeNull();
  });

  it('5. AuthoritativeMatchHost: Khi Người Chơi (Human) đánh quân chốt hạ qua playCards, cũng lưu giữ bài và đợi 2s', () => {
    const rules = createDefaultGameRules();
    rules.settlementRule = 'COUNT_CARDS';

    const human = createPlayer({ id: 'human_0', name: 'Người Chơi', avatar: '🤠' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Bot Cao Thủ', avatar: '🤖' });

    // Cấp cho Human đúng 1 lá bài 10 Cơ để chốt hạ
    const humanWinningCard = createCard(10, 'HEARTS');
    human.hand = [humanWinningCard];
    bot.hand = [createCard(4, 'SPADES'), createCard(5, 'SPADES')];

    let onGameOverCalled = false;
    const host = new AuthoritativeMatchHost({
      rules,
      players: [human, bot],
      hostPlayerId: 'human_0',
      onGameOver: () => {
        onGameOverCalled = true;
      }
    });

    host.startMatch(1);
    host.engine.isFirstMoveOfGame = false;
    host.engine.firstMoveRequiredCard = null;
    host.engine.currentRound.leadPlayerId = 'human_0';
    host.engine.currentRound.currentTurnPlayerId = 'human_0';
    host.engine.currentRound.moves = [];
    host.engine.players[0].hand = [humanWinningCard];
    host.engine.players[1].hand = [createCard(4, 'SPADES'), createCard(5, 'SPADES')];

    let lastSyncPacket: any = null;
    const clientTransport = {
      isConnected: true,
      send: (msg: any) => {
        if (msg.type === 'TABLE_SYNC') {
          lastSyncPacket = msg.packet;
        }
      },
      onMessage: () => () => {},
      disconnect: () => {}
    };
    host.registerClient('human_0', clientTransport);

    // Human đánh lá bài chốt hạ
    const playRes = host.playCards('human_0', [humanWinningCard]);
    expect(playRes.success).toBe(true);
    expect(host.engine.isGameOver).toBe(true);

    // Kích hoạt gameOver (mặc định đợi 2s)
    host.handleGameOver();

    // Chưa gọi onGameOver ngay lập tức (đang trong thời gian delay 2s)
    expect(onGameOverCalled).toBe(false);

    // Bài chốt hạ của human hiển thị trên bàn
    expect(lastSyncPacket).not.toBeNull();
    expect(lastSyncPacket.isGameOver).toBe(true);
    expect(lastSyncPacket.currentMoveCards).toBeDefined();
    expect(lastSyncPacket.currentMoveCards[0].id).toBe(humanWinningCard.id);
    expect(lastSyncPacket.currentMovePlayerId).toBe('human_0');

    // Timer gameOverTimer đang hoạt động
    expect((host as any).gameOverTimer).not.toBeNull();

    host.dispose();
  });
});
