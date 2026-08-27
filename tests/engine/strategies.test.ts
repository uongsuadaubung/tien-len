import { describe, expect, test } from 'bun:test';
import { 
  TraditionalModeStrategy,
  CountCardsModeStrategy,
  CampaignModeStrategy,
  WinnerTakesAllModeStrategy,
  resolveStrategyForMatch,
  getGameModeStrategy
} from '../../src/engine/strategies/game-mode-strategy';
import { Player } from '../../src/engine/types';
import { parseCards } from '../../src/engine/card';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';

describe('Game Mode Strategy Pattern Unit Tests (Kiểm Thử Mẫu Chiến Lược)', () => {
  const BET = 500;

  const createSamplePlayers = (): Player[] => [
    createPlayer({
      id: 'p0',
      name: 'Người Chơi',
      avatar: '🤠',
      hand: [], // Về Nhất
      score: 10000,
      hasPlayedFirstCard: true
    }),
    createBotPlayer('p1', null, {
      name: 'Bot 1',
      avatar: '🧒',
      hand: parseCards('4D 5D'), // 2 lá
      score: 10000,
      hasPlayedFirstCard: true
    }),
    createBotPlayer('p2', null, {
      name: 'Bot 2',
      avatar: '🤠',
      hand: parseCards('7D 8D 2S'), // 3 lá (thối heo đen)
      score: 10000,
      hasPlayedFirstCard: true
    }),
    createBotPlayer('p3', null, {
      name: 'Bot 3',
      avatar: '👑',
      hand: parseCards('9D 10D JD QD KD AD 2D 3C 4C 5C 6C 7C 8C'), // Cóng 13 lá + thối heo đỏ
      score: 10000,
      hasPlayedFirstCard: false
    })
  ];

  test('1. TraditionalModeStrategy: Đánh đến áp chót, chia tiền 4 người Nhất Nhì Ba Bét', () => {
    const strategy = new TraditionalModeStrategy();
    const players = createSamplePlayers();
    const winners = [players[0], players[1], players[2], players[3]]; // Thứ tự 1, 2, 3, 4

    const result = strategy.settleMatch({
      players,
      winners,
      betAmount: BET,
      playerElo: 1000,
      isBankLoanActive: false,
      campaignReward: null,
      penaltyMultiplier: 1,
      isThreeSpadesWin: false
    });

    // 4 người: Nhất (+1,500) + thối heo Bot 2 (500) + cóng Bot 3 (13,000) + thối heo Bot 3 (1,000) = +16,000
    expect(result.payouts['p0']).toBe(16000);
    expect(result.payouts['p1']).toBe(500);
    expect(result.payouts['p2']).toBe(-1000);
    expect(result.payouts['p3']).toBe(-15500);
    expect(result.isVictoryModalRanked).toBe(true);
    expect(result.eloDelta).toBeGreaterThan(0);
  });

  test('2. CountCardsModeStrategy: 1 người hết bài là dừng, đếm lá thường', () => {
    const strategy = new CountCardsModeStrategy();
    const players = createSamplePlayers();
    const winners = [players[0]]; // p0 về Nhất

    const result = strategy.settleMatch({
      players,
      winners,
      betAmount: BET,
      playerElo: 1000,
      isBankLoanActive: false,
      campaignReward: null,
      penaltyMultiplier: 1,
      isThreeSpadesWin: false
    });

    // Bot 1: 2 lá x 500 = -1,000
    expect(result.payouts['p1']).toBe(-1000);
    // Bot 2: 3 lá x 500 + thối heo đen (500) = -2,000
    expect(result.payouts['p2']).toBe(-2000);
    // Bot 3: Cóng 26 x 500 (13,000) + thối heo đỏ (1,000) = -14,000
    expect(result.payouts['p3']).toBe(-14000);
    // p0: Ăn trọn 1,000 + 2,000 + 14,000 = +17,000
    expect(result.payouts['p0']).toBe(17000);
    expect(result.isVictoryModalRanked).toBe(true);
    expect(result.eloDelta).toBeGreaterThan(0);
  });

  test('3. CampaignModeStrategy: 1 người hết bài là dừng, 0 phạt đếm lá, nhận thưởng chương khi thắng', () => {
    const strategy = new CampaignModeStrategy();
    const players = createSamplePlayers();
    const winners = [players[0]]; // p0 về Nhất

    const result = strategy.settleMatch({
      players,
      winners,
      betAmount: BET,
      playerElo: 1000,
      isBankLoanActive: false,
      campaignReward: 5000,
      penaltyMultiplier: 1,
      isThreeSpadesWin: false
    });

    // Các bot không bị trừ tiền đếm lá
    expect(result.payouts['p1']).toBe(0);
    expect(result.payouts['p2']).toBe(0);
    expect(result.payouts['p3']).toBe(0);
    // p0 nhận thưởng ải
    expect(result.payouts['p0']).toBe(5000);
    expect(result.campaignReward).toBe(5000);
  });

  test('4. WinnerTakesAllModeStrategy: 1 người về Nhất gom trọn cược cơ bản của cả bàn', () => {
    const strategy = new WinnerTakesAllModeStrategy();
    const players = createSamplePlayers();
    const winners = [players[0]];

    const result = strategy.settleMatch({
      players,
      winners,
      betAmount: BET,
      playerElo: 1000,
      isBankLoanActive: false,
      campaignReward: null,
      penaltyMultiplier: 1,
      isThreeSpadesWin: false
    });

    expect(result.isVictoryModalRanked).toBe(true);
    expect(result.eloDelta).toBeGreaterThan(0);

    // Bot 1: -500
    expect(result.payouts['p1']).toBe(-500);
    // Bot 2: -500 + thối heo đen (-500) = -1,000
    expect(result.payouts['p2']).toBe(-1000);
    // Bot 3: -500 + cóng (-13,000) + thối heo đỏ (-1,000) = -14,500
    expect(result.payouts['p3']).toBe(-14500);
    // p0: Ăn trọn 500 + 1,000 + 14,500 = +16,000
    expect(result.payouts['p0']).toBe(16000);
  });

  test('5. Strategy Resolver Factory: Định vị đúng Strategy cho từng chế độ game', () => {
    expect(resolveStrategyForMatch('CAMPAIGN').id).toBe('CAMPAIGN');
    expect(resolveStrategyForMatch('QUICK', 'COUNT_CARDS').id).toBe('COUNT_CARDS');
    expect(resolveStrategyForMatch('QUICK', 'WINNER_TAKES_ALL').id).toBe('WINNER_TAKES_ALL');
    expect(resolveStrategyForMatch('QUICK', 'TRADITIONAL').id).toBe('TRADITIONAL');
  });

  test('6. Strategy Setup Match: Khởi tạo chính xác cấu hình, bot và người chơi cho từng chế độ', () => {
    const mockProfile = {
      name: 'Cao Thủ Sài Gòn',
      avatar: '🤠',
      coins: 50000,
      elo: 1450,
      campaignUnlockedChapter: 1,
      campaignChapterWins: {},
      loans: 0,
      dailyReliefClaimedCount: 0,
      lastDailyResetTimestamp: Date.now(),
      lastDailyResetDate: '2026-08-26',
      dailyQuests: [],
      achievements: [],
      stats: {
        gamesPlayed: 0,
        wins: 0,
        chopsDone: 0,
        congsGiven: 0,
        totalEarned: 0,
        highestStreak: 0,
        currentStreak: 0
      },
      dailyMilestonesClaimed: { 1: false, 3: false, 5: false }
    };

    const makeTestPlayer = (p: Partial<Player> & { id: string; name: string }): Player =>
      createPlayer({
        avatar: '🤖',
        isBot: p.id !== 'p0',
        score: 10000,
        hasPlayedFirstCard: true,
        ...p
      });

    // 1. Traditional Quick Setup
    const tradStrat = new TraditionalModeStrategy();
    const tradSetup = tradStrat.setupMatch({
      profile: mockProfile,
      customRules: null,
      customSettings: { betAmount: 2000 },
      customBotPersonaIds: null,
      customBotConfigs: null,
      campaignChapter: null,
      playerCount: null
    });
    expect(tradSetup.settings.mode).toBe('TRADITIONAL');
    expect(tradSetup.settings.betAmount).toBe(2000);
    expect(tradSetup.playerCount).toBe(4);
    expect(tradSetup.initialPlayers.length).toBe(4);
    expect(tradSetup.initialPlayers[0].name).toBe('Cao Thủ Sài Gòn');
    expect(tradSetup.botPersonaIds.length).toBe(3);

    // 2. Count Cards Mode Setup (Solo 1v1)
    const countCardsStrat = new CountCardsModeStrategy();
    const ccSetup = countCardsStrat.setupMatch({
      profile: mockProfile,
      customRules: null,
      playerCount: 2,
      customSettings: { betAmount: 1000 },
      customBotPersonaIds: null,
      customBotConfigs: null,
      campaignChapter: null
    });
    expect(ccSetup.settings.mode).toBe('COUNT_CARDS');
    expect(ccSetup.settings.betAmount).toBe(1000);
    expect(ccSetup.playerCount).toBe(2);
    expect(ccSetup.initialPlayers.length).toBe(2);
  });

  test('7. GameEngine Lifecycle: Bot về Nhất trong Đếm Lá kết thúc ván ngay lập tức', () => {
    const { GameEngine } = require('../../src/engine/game');
    
    const makeTestPlayer = (p: Partial<Player> & { id: string; name: string }): Player =>
      createPlayer({
        avatar: '🤖',
        isBot: p.id !== 'p0',
        score: 10000,
        hasPlayedFirstCard: true,
        ...p
      });

    // --- KỊCH BẢN 1: ĐẾM LÁ (COUNT_CARDS) ---
    const ugPlayers: Player[] = [
      makeTestPlayer({ id: 'p0', name: 'Player', avatar: '🤠', isBot: false, hand: parseCards('4D 5D 6D') }),
      makeTestPlayer({ id: 'p1', name: 'Bot 1', hand: parseCards('9S') }),
      makeTestPlayer({ id: 'p2', name: 'Bot 2', hand: parseCards('7D 8D 2S') }),
      makeTestPlayer({ id: 'p3', name: 'Bot 3', hand: parseCards('10D JD QD') })
    ];

    const ugEngine = new GameEngine(ugPlayers, { mode: 'COUNT_CARDS', betAmount: 1000 }, 'QUICK');
    ugEngine.startCustomGame(2);
    ugEngine.isFirstMoveOfGame = false;
    ugEngine.currentRound.currentTurnPlayerId = 'p1';
    ugEngine.currentRound.leadPlayerId = 'p1';

    // Bot 1 đánh lá cuối cùng (9S)
    const botMoveRes = ugEngine.playMove('p1', parseCards('9S'));
    expect(botMoveRes.success).toBe(true);
    expect(botMoveRes.isGameOver).toBe(true);
    expect(ugEngine.isGameOver).toBe(true);
    expect(ugEngine.winners.length).toBe(1);
    expect(ugEngine.winners[0].id).toBe('p1');

    // --- KỊCH BẢN 2: CHIẾN DỊCH (CAMPAIGN) ---
    const campPlayers: Player[] = [
      makeTestPlayer({ id: 'p0', name: 'Player', avatar: '🤠', isBot: false, hand: parseCards('4D 5D') }),
      makeTestPlayer({ id: 'p1', name: 'Bot 1', hand: parseCards('KS') }),
      makeTestPlayer({ id: 'p2', name: 'Bot 2', hand: parseCards('7D 8D') }),
      makeTestPlayer({ id: 'p3', name: 'Bot 3', hand: parseCards('10D JD') })
    ];

    const campEngine = new GameEngine(campPlayers, { mode: 'COUNT_CARDS', betAmount: 100 }, 'CAMPAIGN');
    campEngine.startCustomGame(2);
    campEngine.isFirstMoveOfGame = false;
    campEngine.currentRound.currentTurnPlayerId = 'p1';
    campEngine.currentRound.leadPlayerId = 'p1';

    // Bot 1 đánh lá cuối cùng (KS) trong Campaign
    const campMoveRes = campEngine.playMove('p1', parseCards('KS'));
    expect(campMoveRes.success).toBe(true);
    expect(campMoveRes.isGameOver).toBe(true);
    expect(campEngine.isGameOver).toBe(true);
    expect(campEngine.winners[0].id).toBe('p1');

    // --- KỊCH BẢN 3: NHẤT ĂN TẤT (WINNER_TAKES_ALL) ---
    const wtaPlayers: Player[] = [
      makeTestPlayer({ id: 'p0', name: 'Player', avatar: '🤠', isBot: false, hand: parseCards('4D 5D') }),
      makeTestPlayer({ id: 'p1', name: 'Bot 1', hand: parseCards('AS') }),
      makeTestPlayer({ id: 'p2', name: 'Bot 2', hand: parseCards('7D 8D') }),
      makeTestPlayer({ id: 'p3', name: 'Bot 3', hand: parseCards('10D JD') })
    ];

    const wtaEngine = new GameEngine(wtaPlayers, { mode: 'WINNER_TAKES_ALL', betAmount: 500 }, 'WINNER_TAKES_ALL');
    wtaEngine.startCustomGame(2);
    wtaEngine.isFirstMoveOfGame = false;
    wtaEngine.currentRound.currentTurnPlayerId = 'p1';
    wtaEngine.currentRound.leadPlayerId = 'p1';

    const wtaMoveRes = wtaEngine.playMove('p1', parseCards('AS'));
    expect(wtaMoveRes.success).toBe(true);
    expect(wtaMoveRes.isGameOver).toBe(true);
    expect(wtaEngine.isGameOver).toBe(true);

    // --- KỊCH BẢN 4: TRUYỀN THỐNG (TRADITIONAL) - 1 người hết bài thì ván CHƯA dừng ---
    const tradPlayers: Player[] = [
      makeTestPlayer({ id: 'p0', name: 'Player', avatar: '🤠', isBot: false, hand: parseCards('4D 5D') }),
      makeTestPlayer({ id: 'p1', name: 'Bot 1', hand: parseCards('QS') }),
      makeTestPlayer({ id: 'p2', name: 'Bot 2', hand: parseCards('7D 8D') }),
      makeTestPlayer({ id: 'p3', name: 'Bot 3', hand: parseCards('10D JD') })
    ];

    const tradEngine = new GameEngine(tradPlayers, { mode: 'TRADITIONAL', betAmount: 100 }, 'TRADITIONAL');
    tradEngine.startCustomGame(2);
    tradEngine.isFirstMoveOfGame = false;
    tradEngine.currentRound.currentTurnPlayerId = 'p1';
    tradEngine.currentRound.leadPlayerId = 'p1';

    const tradMoveRes = tradEngine.playMove('p1', parseCards('QS'));
    expect(tradMoveRes.success).toBe(true);
    expect(tradMoveRes.isGameOver).toBe(false); // Chưa dừng, 3 người còn lại tiếp tục đấu!
    expect(tradEngine.isGameOver).toBe(false);
    expect(tradEngine.winners.length).toBe(1);
  });

  test('8. Modular Composable Rules: Tự do kết hợp các module luật độc lập', () => {
    const { GameEngine } = require('../../src/engine/game');
    const { createDefaultGameRules } = require('../../src/engine/types');

    // Tổ hợp 1: Luật Đếm Lá + Bàn 2 Người (Solo) + Phạt Chặt x2
    const soloCustomRules = createDefaultGameRules({
      settlementRule: 'CARD_COUNT',
      chopping: {
        allowFourPairsCutAnytime: true,
        allowThreePairsCutTwo: true,
        allowFourOfAKindCutPairsOfTwos: true,
        multiplier: 2
      },
      table: {
        playerCount: 2,
        betAmount: 2000,
        soundEnabled: true
      }
    });

    const soloPlayers: Player[] = [
      createPlayer({ id: 'p0', name: 'Player', avatar: '🤠', hand: parseCards('4D 5D'), score: 10000, hasPlayedFirstCard: true }),
      createBotPlayer('p1', null, { name: 'Bot 1', avatar: '🤖', hand: parseCards('9S'), score: 10000, hasPlayedFirstCard: true })
    ];

    const soloEngine = new GameEngine(soloPlayers, soloCustomRules);
    soloEngine.startCustomGame(2);
    soloEngine.isFirstMoveOfGame = false;
    soloEngine.currentRound.currentTurnPlayerId = 'p1';
    soloEngine.currentRound.leadPlayerId = 'p1';

    const res = soloEngine.playMove('p1', parseCards('9S'));
    expect(res.success).toBe(true);
    expect(res.isGameOver).toBe(true);
    expect(soloEngine.isGameOver).toBe(true);
    expect(soloEngine.rules.settlementRule).toBe('CARD_COUNT');
    expect(soloEngine.rules.chopping.multiplier).toBe(2);
    expect(soloEngine.rules.table.playerCount).toBe(2);

    // Tổ hợp 2: Luật Nhất Ăn Tất + Tắt Tới Trắng + Cược 5,000
    const wtaCustomRules = createDefaultGameRules({
      settlementRule: 'WINNER_TAKES_ALL',
      instantWin: {
        enabled: false,
        payoutMultiplier: 26
      },
      table: {
        playerCount: 4,
        betAmount: 5000,
        soundEnabled: true
      }
    });

    expect(wtaCustomRules.settlementRule).toBe('WINNER_TAKES_ALL');
    expect(wtaCustomRules.instantWin.enabled).toBe(false);
    expect(wtaCustomRules.table.betAmount).toBe(5000);
  });
});
