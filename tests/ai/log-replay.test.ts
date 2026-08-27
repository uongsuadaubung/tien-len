import { describe, test, expect } from 'bun:test';
import { GameEngine } from '../../src/engine/game';
import { MatchLogger, MatchLogReport } from '../../src/engine/match-logger';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';
import { replayTurnDecisionFromLog } from '../../src/ai/log-replayer';
import { Card, createDefaultGameRules } from '../../src/engine/types';

describe('Log Replay & Deterministic Test Reproduction', () => {
  test('1. Chạy 1 ván đấu thực tế, xuất MatchLogReport JSON, và Import lại vào bài test để tái hiện từng quyết định', () => {
    // 1. Khởi tạo một ván đấu giữa 4 Bot AI
    const rules = createDefaultGameRules();
    const players = [
      { id: 'p0', name: 'Bot 1', avatar: '🤖', isBot: true, botPersonaId: 'BOT_ELO_1750', score: 0, elo: 1750, hand: [], playedCards: [], isPassedCurrentRound: false, hasPlayedFirstCard: false, rankPosition: null, instantWinType: null },
      { id: 'p1', name: 'Bot 2', avatar: '🤖', isBot: true, botPersonaId: 'BOT_ELO_1900', score: 0, elo: 1900, hand: [], playedCards: [], isPassedCurrentRound: false, hasPlayedFirstCard: false, rankPosition: null, instantWinType: null },
      { id: 'p2', name: 'Bot 3', avatar: '🤖', isBot: true, botPersonaId: 'BOT_ELO_2100', score: 0, elo: 2100, hand: [], playedCards: [], isPassedCurrentRound: false, hasPlayedFirstCard: false, rankPosition: null, instantWinType: null },
      { id: 'p3', name: 'Bot 4', avatar: '🤖', isBot: true, botPersonaId: 'BOT_ELO_2300', score: 0, elo: 2300, hand: [], playedCards: [], isPassedCurrentRound: false, hasPlayedFirstCard: false, rankPosition: null, instantWinType: null }
    ];
    const game = new GameEngine(players, rules);

    game.startNewGame(1, 12345);

    const trackers: Record<string, CardTracker> = {
      p0: new CardTracker(game.players[0].hand, 1.0),
      p1: new CardTracker(game.players[1].hand, 1.0),
      p2: new CardTracker(game.players[2].hand, 1.0),
      p3: new CardTracker(game.players[3].hand, 1.0),
    };

    // Vận hành game tự động cho đến khi kết thúc ván
    let safetyLoop = 0;
    while (!game.isGameOver && safetyLoop < 400) {
      safetyLoop++;
      const currentTurnPlayer = game.getCurrentPlayer();
      const botConfig = (BOT_PERSONAS as any)[currentTurnPlayer.botPersonaId || 'BOT_ELO_1750'] || BOT_PERSONAS.BOT_ELO_1750;
      game.executeBotTurn(botConfig, trackers[currentTurnPlayer.id]);
    }

    expect(game.isGameOver).toBe(true);

    // Finalize match để tạo report
    game.settleEndGame();
    MatchLogger.getInstance().finalizeMatch({
      players: game.players,
      winners: game.winners,
      payouts: {},
      isThreeSpadesWin: game.isThreeSpadesWin,
      instantWinType: game.instantWinner?.instantWinType || null,
      loanDeduction: 0,
      eloDelta: 0
    });

    // 2. Lấy MatchLogReport đã ghi nhận và Serialize sang JSON String (Mô phỏng thao tác người dùng xuất file JSON)
    const originalReport = MatchLogger.getInstance().getLatestFinalizedReport();
    expect(originalReport).not.toBeNull();

    const exportedJsonString = JSON.stringify(originalReport);
    expect(exportedJsonString.length).toBeGreaterThan(100);

    // 3. IMPORT file JSON vào bài Test để tái hiện (Deserialization)
    const importedReport: MatchLogReport = JSON.parse(exportedJsonString);
    expect(importedReport.turns.length).toBeGreaterThan(0);

    // 4. Chọn một lượt đấu bất kỳ của Bot và tái hiện quyết định với log-replayer
    // Tìm lượt đấu đầu tiên mà Bot thực hiện PLAY
    const firstPlayTurn = importedReport.turns.find(t => t.isBot && t.action === 'PLAY');
    expect(firstPlayTurn).toBeDefined();

    if (firstPlayTurn) {
      const replayResult = replayTurnDecisionFromLog(importedReport, firstPlayTurn.turnNumber);

      expect(replayResult.turnNumber).toBe(firstPlayTurn.turnNumber);
      expect(replayResult.playerId).toBe(firstPlayTurn.playerId);
      expect(replayResult.loggedAction).toBe('PLAY');
      expect(replayResult.reproducedDecision.type).toBe('PLAY');
      expect(replayResult.reproducedDecision.cards).not.toBeNull();
      
      // Khẳng định quyết định tái tạo hoàn toàn khớp với log thực tế
      expect(replayResult.isActionMatched).toBe(true);
    }
  });

  test('2. Tái hiện tình huống cụ thể từ dữ liệu Mock JSON để debug (Ví dụ: Bot có 2 và rác)', () => {
    // Giả lập dữ liệu một MatchLogReport thu thập được từ bug report của người dùng
    const mockReport: MatchLogReport = {
      matchId: 'match_debug_001',
      gameNumber: 2,
      gameMode: 'TRADITIONAL',
      rules: createDefaultGameRules(),
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 15000,
      players: [
        {
          id: 'p1',
          name: 'Bot Thần Sầu',
          avatar: '🤖',
          isBot: true,
          botPersonaId: 'BOT_ELO_2500',
          initialHand: [
            { id: '2_HEARTS', rank: 15, suit: 'HEARTS', weight: 60, code: '2H' },
            { id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 1, code: '3S' }
          ],
          finalHand: [],
          rankPosition: 1,
          scoreDelta: 1000
        },
        {
          id: 'p0',
          name: 'Người Chơi',
          avatar: '👤',
          isBot: false,
          botPersonaId: null,
          initialHand: [],
          finalHand: [],
          rankPosition: 2,
          scoreDelta: -1000
        }
      ],
      winner: { id: 'p1', name: 'Bot Thần Sầu', rankPosition: 1 },
      turns: [
        {
          turnNumber: 1,
          roundNumber: 1,
          timestamp: Date.now(),
          playerId: 'p1',
          playerName: 'Bot Thần Sầu',
          isBot: true,
          botPersonaId: 'BOT_ELO_2500',
          action: 'PLAY',
          cardsPlayed: [{ id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 1, code: '3S' }],
          combination: {
            type: 'SINGLE',
            cards: [{ id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 1, code: '3S' }],
            highestCard: { id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 1, code: '3S' },
            length: 1
          },
          handBeforeTurn: [
            { id: '2_HEARTS', rank: 15, suit: 'HEARTS', weight: 60, code: '2H' },
            { id: '3_SPADES', rank: 3, suit: 'SPADES', weight: 1, code: '3S' }
          ],
          handAfterTurn: [{ id: '2_HEARTS', rank: 15, suit: 'HEARTS', weight: 60, code: '2H' }],
          leadingMoveBeforeTurn: null,
          isLeadMove: true,
          isChop: false,
          choppedPlayerId: null,
          penaltyAmount: null,
          botDecision: {
            strategyUsed: 'ENDGAME_SMALL_LEAD',
            heuristicScore: null,
            chosenReason: 'Cờ tàn 2 lá: Đánh rác nhỏ trước, giữ Heo/bài to chốt hạ',
            evaluatedCandidatesCount: 2,
            topCandidates: [],
            mctsWinRate: null,
            mctsSimulations: null,
            handStrengthTwoCount: 1,
            handStrengthTrashCount: 1,
            remainingOpponentCards: { p0: 5 }
          }
        }
      ],
      settlements: {
        payouts: { p1: 1000, p0: -1000 },
        isThreeSpadesWin: false,
        instantWinType: null,
        loanDeduction: 0,
        eloDelta: 25
      }
    };

    // Chạy replay trực tiếp từ mock report
    const replayResult = replayTurnDecisionFromLog(mockReport, 1);

    expect(replayResult.reproducedDecision.type).toBe('PLAY');
    expect(replayResult.reproducedDecision.cards?.[0].rank).toBe(3); // Khẳng định Bot chọn 3S thay vì 2H
    expect(replayResult.reproducedDecision.strategyUsed).toBe('EMERGENCY_OVERRIDE');
  });
});
