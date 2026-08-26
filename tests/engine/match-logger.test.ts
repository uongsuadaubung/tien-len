import { describe, it, expect, beforeEach } from 'bun:test';
import { MatchLogger, BotDecisionTelemetry } from '../../src/engine/match-logger';
import { GameEngine } from '../../src/engine/game';
import { createDefaultGameRules, Player } from '../../src/engine/types';
import { getBotConfig } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';

describe('MatchLogger & Bot Reasoning Telemetry', () => {
  beforeEach(() => {
    // Reset logger singleton before each test
  });

  it('should initialize a new match log and capture initial hands for all players', () => {
    const logger = MatchLogger.getInstance();
    const mockPlayers: Player[] = [
      {
        id: 'p0',
        name: 'Người Chơi',
        avatar: '🤠',
        isBot: false,
        botPersonaId: null,
        hand: [
          { id: '3S', rank: 3, suit: 'SPADES', code: '3♠', weight: 30 },
          { id: '4H', rank: 4, suit: 'HEARTS', code: '4♥', weight: 43 }
        ],
        playedCards: [],
        score: 50000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        rankPosition: null,
        instantWinType: null
      },
      {
        id: 'bot1',
        name: 'Bot Cao Thủ',
        avatar: '🤖',
        isBot: true,
        botPersonaId: 'PRO_01',
        hand: [
          { id: '5D', rank: 5, suit: 'DIAMONDS', code: '5♦', weight: 52 },
          { id: '2H', rank: 15, suit: 'HEARTS', code: '2♥', weight: 153 }
        ],
        playedCards: [],
        score: 50000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false,
        rankPosition: null,
        instantWinType: null
      }
    ];

    logger.startNewMatch({
      gameNumber: 1,
      gameMode: 'TRADITIONAL',
      rules: createDefaultGameRules(),
      players: mockPlayers
    });

    const telemetry: BotDecisionTelemetry = {
      chosenReason: 'Đánh lẻ 5♦ tẩu rác',
      strategyUsed: 'HEURISTIC_EVALUATION',
      heuristicScore: 85,
      evaluatedCandidatesCount: 2,
      topCandidates: [
        {
          cards: [{ id: '5D', rank: 5, suit: 'DIAMONDS', code: '5♦', weight: 52 }],
          combinationType: 'SINGLE',
          score: 85,
          reasons: ['Điểm cơ bản +50', 'Tẩu rác lẻ']
        }
      ],
      mctsWinRate: 0.65,
      mctsSimulations: 50,
      handStrengthTwoCount: 1,
      handStrengthTrashCount: 1,
      remainingOpponentCards: { p0: 2 }
    };

    logger.recordTurn({
      roundNumber: 1,
      playerId: 'bot1',
      playerName: 'Bot Cao Thủ',
      isBot: true,
      botPersonaId: 'PRO_01',
      action: 'PLAY',
      cardsPlayed: [{ id: '5D', rank: 5, suit: 'DIAMONDS', code: '5♦', weight: 52 }],
      combination: { type: 'SINGLE', cards: [{ id: '5D', rank: 5, suit: 'DIAMONDS', code: '5♦', weight: 52 }], length: 1, highestCard: { id: '5D', rank: 5, suit: 'DIAMONDS', code: '5♦', weight: 52 } },
      handBeforeTurn: mockPlayers[1].hand,
      handAfterTurn: [{ id: '2H', rank: 15, suit: 'HEARTS', code: '2♥', weight: 153 }],
      leadingMoveBeforeTurn: null,
      isLeadMove: true,
      isChop: false,
      choppedPlayerId: null,
      penaltyAmount: null,
      botDecision: telemetry
    });

    const report = logger.finalizeMatch({
      players: mockPlayers,
      winners: [mockPlayers[1], mockPlayers[0]],
      payouts: { bot1: 10000, p0: -10000 },
      isThreeSpadesWin: false,
      instantWinType: null,
      loanDeduction: 0,
      eloDelta: 0
    });

    expect(report).toBeDefined();
    expect(report.turns.length).toBe(1);
    expect(report.turns[0].botDecision).not.toBeNull();
    expect(report.turns[0].botDecision?.chosenReason).toBe('Đánh lẻ 5♦ tẩu rác');
    expect(report.turns[0].botDecision?.heuristicScore).toBe(85);
    expect(report.turns[0].botDecision?.mctsWinRate).toBe(0.65);
    expect(report.winner?.id).toBe('bot1');

    // Test Export JSON & Text
    const jsonOutput = logger.exportToJsonString();
    expect(jsonOutput).toContain('"matchId"');
    expect(jsonOutput).toContain('"chosenReason": "Đánh lẻ 5♦ tẩu rác"');

    const textOutput = logger.exportToTextString();
    expect(textOutput).toContain('NHẬT KÝ VÁN ĐẤU TIẾN LÊN MIỀN NAM');
    expect(textOutput).toContain('Bot Cao Thủ');
    expect(textOutput).toContain('Đánh lẻ 5♦ tẩu rác');
  });

  it('should seamlessly log whole simulated match in GameEngine with bot telemetry', () => {
    const players: Player[] = [
      { id: 'p0', name: 'User', avatar: '🤠', isBot: true, botPersonaId: null, hand: [], playedCards: [], score: 50000, isPassedCurrentRound: false, hasPlayedFirstCard: false, rankPosition: null, instantWinType: null },
      { id: 'bot1', name: 'Bot 1', avatar: '🤖', isBot: true, botPersonaId: null, hand: [], playedCards: [], score: 50000, isPassedCurrentRound: false, hasPlayedFirstCard: false, rankPosition: null, instantWinType: null },
      { id: 'bot2', name: 'Bot 2', avatar: '🤖', isBot: true, botPersonaId: null, hand: [], playedCards: [], score: 50000, isPassedCurrentRound: false, hasPlayedFirstCard: false, rankPosition: null, instantWinType: null },
      { id: 'bot3', name: 'Bot 3', avatar: '🤖', isBot: true, botPersonaId: null, hand: [], playedCards: [], score: 50000, isPassedCurrentRound: false, hasPlayedFirstCard: false, rankPosition: null, instantWinType: null }
    ];
    const engine = new GameEngine(players, createDefaultGameRules());

    engine.startNewGame(1);

    const botConfig = getBotConfig('master', { id: 'bot1' });
    const tracker = new CardTracker([], 1.0);

    let maxSafety = 50;
    while (!engine.isGameOver && maxSafety > 0) {
      maxSafety--;
      const cur = engine.getCurrentPlayer();
      if (!cur) break;
      engine.executeBotTurn(botConfig, tracker);
    }

    const report = MatchLogger.getInstance().finalizeMatch({
      players: engine.players,
      winners: engine.winners,
      payouts: { p0: 0, bot1: 0, bot2: 0, bot3: 0 },
      isThreeSpadesWin: engine.isThreeSpadesWin,
      instantWinType: null,
      loanDeduction: 0,
      eloDelta: 0
    });

    expect(report.turns.length).toBeGreaterThan(0);
    // Every bot turn must have populated telemetry
    const botTurns = report.turns.filter(t => t.isBot);
    expect(botTurns.length).toBeGreaterThan(0);
    for (const bt of botTurns) {
      expect(bt.botDecision).not.toBeNull();
      expect(bt.botDecision?.chosenReason).toBeDefined();
      expect(bt.botDecision?.strategyUsed).toBeDefined();
    }
  });
});
