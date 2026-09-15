import { describe, expect, it } from 'bun:test';
import { OfflineMatchDriver, MatchCompletionResult } from '../../src/engine/offline-match-driver';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { GameEngine } from '../../src/engine/game';
import { createDefaultGameRules, createPlayedMove } from '../../src/engine/types';
import { createCard } from '../../src/engine/card';
import { CardTracker } from '../../src/ai/card-tracker';
import { UI_TIMINGS } from '../../src/ui/constants/ui-timings';
import { mapMatchStateToSnapshot } from '../../src/engine/state-machine/match-state-machine';
import { GameOverMatchState } from '../../src/engine/state-machine/types';

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

    const gameOverState: GameOverMatchState = {
      status: 'GAME_OVER',
      gameNumber: 1,
      players: [],
      winners: [],
      isThreeSpadesWin: false,
      matchPayouts: {},
      eloDeltas: {},
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

  it('3. OfflineMatchDriver: Khi Bot đánh quân chốt hạ, bài hiển thị trên bàn và snapshot lưu giữ leadingMove', () => {
    const rules = createDefaultGameRules();
    rules.settlementRule = 'COUNT_CARDS'; // Đếm lá: ai hết bài trước thắng ngay

    const human = createPlayer({ id: 'human_0', name: 'Người Chơi', avatar: '🤠' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Bot Cao Thủ', avatar: '🤖' });

    // Cấp bài cho Bot: chỉ có đúng 1 lá Át cơ (để khi bot đánh là hết bài ngay)
    const winningCard = createCard(14, 'HEARTS');
    bot.hand = [winningCard];

    // Người chơi còn 5 lá
    human.hand = [
      createCard(4, 'SPADES'),
      createCard(5, 'SPADES'),
      createCard(6, 'SPADES'),
      createCard(7, 'SPADES'),
      createCard(8, 'SPADES')
    ];

    const engine = new GameEngine([human, bot], rules);
    engine.startCustomGame(1);

    // Set lượt hiện tại cho Bot cầm cái
    engine.currentRound.leadPlayerId = 'bot_1';
    engine.currentRound.currentTurnPlayerId = 'bot_1';
    engine.currentRound.moves = [];

    const driver = new OfflineMatchDriver();
    driver.engine = engine;
    driver.localPlayerId = 'human_0';
    driver.tableConfig = {
      gameType: 'QUICK',
      rules,
      settings: engine.settings,
      playerCount: 2,
      botPersonaIds: ['BOT_ELO_1150', 'BOT_ELO_850', 'BOT_ELO_1450'],
      customBotConfigs: [{}, {}, {}],
      campaignChapter: null
    };

    const botConfig = { memoryDepth: 1 };
    const tracker = new CardTracker(bot.hand, 1, 2);

    // Trigger bot turn
    const botRes = engine.executeBotTurn(botConfig as any, tracker);
    expect(botRes.action).toBe('PLAY');
    expect(engine.isGameOver).toBe(true);

    // Kiểm tra getMatchState() của driver lưu giữ leadingMove là lá bài bot vừa đánh
    const matchState = driver.getMatchState();
    expect(matchState.status).toBe('GAME_OVER');
    if (matchState.status === 'GAME_OVER') {
      expect(matchState.leadingMove).not.toBeNull();
      expect(matchState.leadingMove?.playerId).toBe('bot_1');
      expect(matchState.leadingMove?.combination.cards[0].id).toBe(winningCard.id);
    }

    // Kiểm tra snapshot cũng có currentMove là lá bài bot vừa đánh
    const snapshot = driver.getSnapshot();
    expect(snapshot.isGameOver).toBe(true);
    expect(snapshot.currentMove).not.toBeNull();
    expect(snapshot.currentMove?.playerId).toBe('bot_1');

    driver.cleanup();
  });

  it('4. OfflineMatchDriver: cleanupTimers dọn sạch gameOverTimer khi người chơi thoát bàn', () => {
    const driver = new OfflineMatchDriver();
    // Gán 1 timer giả lập
    (driver as any).gameOverTimer = setTimeout(() => {}, 10000);
    expect((driver as any).gameOverTimer).not.toBeNull();

    driver.cleanup();
    expect((driver as any).gameOverTimer).toBeNull();
  });

  it('5. OfflineMatchDriver: Khi Người Chơi (Human) đánh quân chốt hạ qua playCards, cũng lưu giữ bài và đợi 2s', () => {
    const rules = createDefaultGameRules();
    rules.settlementRule = 'COUNT_CARDS';

    const human = createPlayer({ id: 'human_0', name: 'Người Chơi', avatar: '🤠' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Bot Cao Thủ', avatar: '🤖' });

    // Cấp cho Human đúng 1 lá bài 10 Cơ để chốt hạ
    const humanWinningCard = createCard(10, 'HEARTS');
    human.hand = [humanWinningCard];
    bot.hand = [createCard(4, 'SPADES'), createCard(5, 'SPADES')];

    const engine = new GameEngine([human, bot], rules);
    engine.startCustomGame(1);

    engine.currentRound.leadPlayerId = 'human_0';
    engine.currentRound.currentTurnPlayerId = 'human_0';
    engine.currentRound.moves = [];

    const driver = new OfflineMatchDriver();
    driver.engine = engine;
    driver.localPlayerId = 'human_0';
    driver.tableConfig = {
      gameType: 'QUICK',
      rules,
      settings: engine.settings,
      playerCount: 2,
      botPersonaIds: ['BOT_ELO_1150', 'BOT_ELO_850', 'BOT_ELO_1450'],
      customBotConfigs: [{}, {}, {}],
      campaignChapter: null
    };

    let onCompleteCalled = false;
    driver.onComplete(() => {
      onCompleteCalled = true;
    });

    // Human đánh lá bài chốt hạ
    const playRes = driver.playCards('human_0', [humanWinningCard]);
    expect(playRes.success).toBe(true);
    expect(engine.isGameOver).toBe(true);

    // Chưa gọi onComplete ngay lập tức (đang trong thời gian delay 2s)
    expect(onCompleteCalled).toBe(false);

    // Bài chốt hạ của human hiển thị trên bàn
    const snapshot = driver.getSnapshot();
    expect(snapshot.isGameOver).toBe(true);
    expect(snapshot.currentMove).not.toBeNull();
    expect(snapshot.currentMove?.playerId).toBe('human_0');
    expect(snapshot.currentMove?.combination.cards[0].id).toBe(humanWinningCard.id);

    // Timer gameOverTimer đang hoạt động
    expect((driver as any).gameOverTimer).not.toBeNull();

    driver.cleanup();
  });
});
