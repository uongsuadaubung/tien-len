import { describe, it, expect } from 'bun:test';
import { 
  mapMatchStateToSnapshot 
} from '../../src/engine/state-machine/match-state-machine';
import type { 
  MatchState,
  WaitingMatchState,
  DealingMatchState,
  PlayingTurnMatchState,
  InstantWinMatchState,
  RoundEndedMatchState,
  GameOverMatchState
} from '../../src/engine/state-machine/types';
import { createDefaultGameRules, Player } from '../../src/engine/types';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { OfflineMatchDriver } from '../../src/engine/offline-match-driver';

describe('Kiến Trúc State Pattern & Discriminated Unions (Game Engine State Machine)', () => {
  const defaultRules = createDefaultGameRules();
  const testPlayers: Player[] = [
    createPlayer({ id: 'p0', name: 'User', score: 10000 }),
    createBotPlayer('p1', 'BOT_ELO_850', { name: 'Bot 1', score: 5000 }),
    createBotPlayer('p2', 'BOT_ELO_1150', { name: 'Bot 2', score: 8000 }),
    createBotPlayer('p3', 'BOT_ELO_1450', { name: 'Bot 3', score: 12000 })
  ];

  describe('1. Type Narrowing & Thuộc Tính Đảm Bảo Tồn Tại (Guaranteed Non-Null)', () => {
    it('Trạng thái PLAYING: currentTurnPlayerId và leadPlayerId luôn là string, không bao giờ null', () => {
      const playingState: PlayingTurnMatchState = {
        status: 'PLAYING',
        gameNumber: 1,
        roundNumber: 1,
        players: testPlayers,
        currentTurnPlayerId: 'p0',
        leadPlayerId: 'p0',
        roundMoves: [],
        leadingMove: null,
        isLeadMove: true,
        isFirstMoveOfGame: true,
        passedPlayerIds: [],
        chopNotification: null,
        botThinkingThought: null,
        rules: defaultRules
      };

      const matchState: MatchState = playingState;

      if (matchState.status === 'PLAYING') {
        // TypeScript tự động narrow type sang PlayingTurnMatchState
        // Truy cập trực tiếp không cần optional chaining ?. hay check !== null
        expect(typeof matchState.currentTurnPlayerId).toBe('string');
        expect(matchState.currentTurnPlayerId.toUpperCase()).toBe('P0');
        expect(typeof matchState.leadPlayerId).toBe('string');
        expect(matchState.leadPlayerId).toBe('p0');
        expect(matchState.isLeadMove).toBe(true);
      } else {
        throw new Error('State phải là PLAYING!');
      }
    });

    it('Trạng thái INSTANT_WIN: instantWinner và instantWinType đảm bảo tồn tại không null', () => {
      const instantWinState: InstantWinMatchState = {
        status: 'INSTANT_WIN',
        gameNumber: 1,
        players: testPlayers,
        instantWinner: testPlayers[0],
        instantWinType: 'FOUR_TWOS',
        matchPayouts: { p0: 78000, p1: -26000, p2: -26000, p3: -26000 },
        eloDeltas: { p0: 32, p1: -12, p2: -10, p3: -10 },
        matchLogReport: null,
        rules: defaultRules
      };

      const matchState: MatchState = instantWinState;

      if (matchState.status === 'INSTANT_WIN') {
        expect(matchState.instantWinner.id).toBe('p0');
        expect(matchState.instantWinType).toBe('FOUR_TWOS');
        expect(matchState.matchPayouts['p0']).toBe(78000);
      } else {
        throw new Error('State phải là INSTANT_WIN!');
      }
    });

    it('Trạng thái GAME_OVER: winners và matchPayouts đảm bảo tồn tại không null', () => {
      const gameOverState: GameOverMatchState = {
        status: 'GAME_OVER',
        gameNumber: 1,
        players: testPlayers,
        winners: [testPlayers[0], testPlayers[1], testPlayers[2], testPlayers[3]],
        isThreeSpadesWin: false,
        matchPayouts: { p0: 15000, p1: 5000, p2: -5000, p3: -15000 },
        eloDeltas: { p0: 25, p1: 8, p2: -8, p3: -25 },
        matchLogReport: null,
        rules: defaultRules
      };

      const matchState: MatchState = gameOverState;

      if (matchState.status === 'GAME_OVER') {
        expect(matchState.winners.length).toBe(4);
        expect(matchState.winners[0].id).toBe('p0');
        expect(matchState.matchPayouts['p0']).toBe(15000);
      } else {
        throw new Error('State phải là GAME_OVER!');
      }
    });

    it('Trạng thái DEALING: dealtCounts và dealBanner đảm bảo có mặt trong state', () => {
      const dealingState: DealingMatchState = {
        status: 'DEALING',
        gameNumber: 1,
        players: testPlayers,
        dealtCounts: { p0: 5, p1: 5, p2: 5, p3: 5 },
        dealBanner: 'Đang chia bài...',
        totalCardsDealt: 20,
        rules: defaultRules
      };

      const matchState: MatchState = dealingState;

      if (matchState.status === 'DEALING') {
        expect(matchState.totalCardsDealt).toBe(20);
        expect(matchState.dealtCounts['p0']).toBe(5);
        expect(matchState.dealBanner).toBe('Đang chia bài...');
      } else {
        throw new Error('State phải là DEALING!');
      }
    });
  });

  describe('2. mapMatchStateToSnapshot: Ánh xạ chuẩn xác sang MatchSnapshot tương thích ngược', () => {
    it('Ánh xạ các trường trạng thái PLAYING sang snapshot', () => {
      const playingState: PlayingTurnMatchState = {
        status: 'PLAYING',
        gameNumber: 2,
        roundNumber: 3,
        players: testPlayers,
        currentTurnPlayerId: 'p2',
        leadPlayerId: 'p1',
        roundMoves: [],
        leadingMove: null,
        isLeadMove: false,
        isFirstMoveOfGame: false,
        passedPlayerIds: ['p0'],
        chopNotification: null,
        botThinkingThought: null,
        rules: defaultRules
      };

      const snapshot = mapMatchStateToSnapshot(playingState);
      expect(snapshot.gameNumber).toBe(2);
      expect(snapshot.currentTurnPlayerId).toBe('p2');
      expect(snapshot.leadPlayerId).toBe('p1');
      expect(snapshot.isDealing).toBe(false);
      expect(snapshot.isGameOver).toBe(false);
      expect(snapshot.isLeadMove).toBe(false);
    });
  });

  describe('3. Tích Hợp OfflineMatchDriver Với MatchState', () => {
    it('driver.getMatchState() trả về WAITING trước khi setup ván bài', () => {
      const driver = new OfflineMatchDriver();
      const state = driver.getMatchState();

      expect(state.status).toBe('WAITING');
      if (state.status === 'WAITING') {
        expect(state.players.length).toBe(0);
        expect(state.rules).toBeDefined();
      }
    });

    it('driver.subscribeMatchState phát sự kiện MatchState chuẩn mực', () => {
      const driver = new OfflineMatchDriver();
      let lastReceivedState: MatchState | null = null;

      const unsub = driver.subscribeMatchState((state) => {
        lastReceivedState = state;
      });

      expect(lastReceivedState).not.toBeNull();
      expect(lastReceivedState!.status).toBe('WAITING');
      unsub();
    });
  });
});
