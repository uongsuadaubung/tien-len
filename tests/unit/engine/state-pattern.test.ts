import { describe, it, expect } from 'bun:test';
import { 
  createPlayer, 
  createBotPlayer, 
  createTestPlayers,
  createMatchPlayerFromProfile 
} from '../../../src/engine/player-factory';
import { 
  createCard 
} from '../../../src/engine/card';
import {
  createKnownHandState,
  createHiddenHandState,
  isKnownHandState,
  isHiddenHandState,
  getPlayerCardCount,
  createDefaultGameRules,
  createPlayedMove
} from '../../../src/engine/types';
import {
  type MatchState,
  isWaitingMatchState,
  isDealingMatchState,
  isPlayingMatchState,
  isLeadPlayingTurnMatchState,
  isOpeningFirstMovePlayingState,
  isNormalLeadPlayingTurnMatchState,
  isFollowPlayingTurnMatchState,
  isInstantWinMatchState,
  isRoundEndedMatchState,
  isGameOverMatchState,
  isTerminalMatchState,
  canPlayerPlayInMatchState,
  canPlayerPassInMatchState,
  getCurrentTurnPlayerIdFromMatchState,
  getLeadPlayerIdFromMatchState,
  getActiveLeadingMoveFromMatchState,
  getWinnersFromMatchState,
  isGameOverFromMatchState,
  createPlayingTurnMatchState
} from '../../../src/engine/state-machine/types';
import {
  transitionToWaiting,
  transitionToDealing,
  updateDealingProgress,
  transitionToPlaying,
  transitionToRoundEnded,
  transitionToGameOver,
  transitionToInstantWin,
  mapMatchStateToSnapshot
} from '../../../src/engine/state-machine/match-state-machine';
import { identifyCombination } from '../../../src/engine/combinations';
import { createPerspectiveSettlement } from '../../../src/engine/settlement/perspective-settlement';

describe('State Pattern & Zero-Fallback Architecture', () => {
  const defaultRules = createDefaultGameRules();
  const testPlayers = createTestPlayers(4);

  describe('1. HandState & Zero-Fallback Player Model', () => {
    it('creates KnownHandState with accurate count and cards', () => {
      const cards = [createCard(3, 'SPADES'), createCard(3, 'HEARTS')];
      const hand = createKnownHandState(cards);
      expect(hand.status).toBe('KNOWN');
      expect(hand.count).toBe(2);
      expect(hand.cards).toHaveLength(2);
      expect(isKnownHandState(hand)).toBe(true);
      expect(isHiddenHandState(hand)).toBe(false);
    });

    it('creates HiddenHandState without cards (Fog-of-War safe)', () => {
      const hand = createHiddenHandState(13);
      expect(hand.status).toBe('HIDDEN');
      expect(hand.count).toBe(13);
      expect(isKnownHandState(hand)).toBe(false);
      expect(isHiddenHandState(hand)).toBe(true);
    });

    it('guarantees BasePlayer.cardCount is strictly non-nullable and non-optional', () => {
      const player = createPlayer({ name: 'Human' });
      expect(typeof player.cardCount).toBe('number');
      expect(player.cardCount).toBe(0);

      const bot = createBotPlayer('bot1', 'BOT_ELO_1150', { hand: [createCard(3, 'SPADES')] });
      expect(bot.cardCount).toBe(1);
      expect(getPlayerCardCount(bot)).toBe(1);
    });

    it('accurately reports cardCount for Fog-of-War opponents with empty hands', () => {
      const opponent = createPlayer({
        id: 'opp_1',
        name: 'Opponent',
        hand: [], // Fog of War: cards are hidden
        cardCount: 13
      });
      expect(opponent.cardCount).toBe(13);
      expect(getPlayerCardCount(opponent)).toBe(13);
      expect(opponent.hand).toHaveLength(0);
    });

    it('cleanly converts PlayerProfile (Storage Entity) to MatchPlayer (In-Game Entity)', () => {
      const profile = {
        id: 'usr_abc123',
        name: 'Tiến Lên Master',
        avatar: '🤠',
        coins: 150000,
        elo: 1650,
        campaignUnlockedChapter: 3,
        campaignChapterWins: { 1: 3, 2: 3, 3: 0, 4: 0, 5: 0 },
        loans: 0,
        activeLoan: null,
        dailyReliefClaimedCount: 0,
        lastDailyResetTimestamp: Date.now(),
        lastDailyResetDate: '2026-09-21',
        dailyQuests: [],
        achievements: [],
        dailyMilestonesClaimed: { 1: false, 3: false, 5: false },
        stats: {
          gamesPlayed: 50,
          wins: 35,
          chopsDone: 10,
          congsGiven: 2,
          totalEarned: 250000,
          highestStreak: 7,
          currentStreak: 2
        }
      };

      const matchPlayer = createMatchPlayerFromProfile(profile);

      // In-game entity properties
      expect(matchPlayer.id).toBe(profile.id);
      expect(matchPlayer.name).toBe(profile.name);
      expect(matchPlayer.avatar).toBe(profile.avatar);
      expect(matchPlayer.score).toBe(profile.coins); // coins mapped to in-game table score
      expect(matchPlayer.cardCount).toBe(0);
      expect(matchPlayer.hand).toHaveLength(0);
      expect(matchPlayer.playedCards).toHaveLength(0);
      expect(matchPlayer.isPassedCurrentRound).toBe(false);
      expect(matchPlayer.hasPlayedFirstCard).toBe(false);
      expect(matchPlayer.isBot).toBe(false);

      // Storage-only properties should not pollute in-game MatchPlayer
      expect('stats' in matchPlayer).toBe(false);
      expect('achievements' in matchPlayer).toBe(false);
      expect('dailyQuests' in matchPlayer).toBe(false);
      expect('activeLoan' in matchPlayer).toBe(false);
    });
  });

  describe('2. State Machine Type Guards', () => {
    it('accurately identifies WaitingMatchState', () => {
      const waiting = transitionToWaiting({
        gameNumber: 1,
        players: testPlayers,
        rules: defaultRules
      });
      expect(isWaitingMatchState(waiting)).toBe(true);
      expect(isDealingMatchState(waiting)).toBe(false);
      expect(isPlayingMatchState(waiting)).toBe(false);
      expect(isTerminalMatchState(waiting)).toBe(false);
    });

    it('accurately identifies DealingMatchState', () => {
      const waiting = transitionToWaiting({ gameNumber: 1, players: testPlayers, rules: defaultRules });
      const dealing = transitionToDealing(waiting, { dealtCounts: { p0: 13, p1: 13, p2: 13, p3: 13 } });
      expect(isDealingMatchState(dealing)).toBe(true);
      expect(isWaitingMatchState(dealing)).toBe(false);
      expect(isPlayingMatchState(dealing)).toBe(false);
    });

    it('accurately differentiates OpeningFirstMove, NormalLead, and Follow PlayingTurn states', () => {
      const threeSpades = createCard(3, 'SPADES');

      // Opening first move state
      const openingState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: 1,
        roundNumber: 1,
        players: testPlayers,
        rules: defaultRules,
        currentTurnPlayerId: 'p0',
        leadPlayerId: 'p0',
        roundMoves: [],
        leadingMove: null,
        isLeadMove: true,
        isFirstMoveOfGame: true,
        firstMoveRequiredCard: threeSpades,
        passedPlayerIds: [],
        chopNotification: null,
        botThinkingThought: null
      });

      expect(isPlayingMatchState(openingState)).toBe(true);
      expect(isLeadPlayingTurnMatchState(openingState)).toBe(true);
      expect(isOpeningFirstMovePlayingState(openingState)).toBe(true);
      expect(isNormalLeadPlayingTurnMatchState(openingState)).toBe(false);
      expect(isFollowPlayingTurnMatchState(openingState)).toBe(false);
      expect(openingState.firstMoveRequiredCard).toEqual(threeSpades);

      // Normal lead state (new round, not first move of game)
      const normalLeadState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: 1,
        roundNumber: 2,
        players: testPlayers,
        rules: defaultRules,
        currentTurnPlayerId: 'p1',
        leadPlayerId: 'p1',
        roundMoves: [],
        leadingMove: null,
        isLeadMove: true,
        isFirstMoveOfGame: false,
        firstMoveRequiredCard: null,
        passedPlayerIds: [],
        chopNotification: null,
        botThinkingThought: null
      });

      expect(isLeadPlayingTurnMatchState(normalLeadState)).toBe(true);
      expect(isOpeningFirstMovePlayingState(normalLeadState)).toBe(false);
      expect(isNormalLeadPlayingTurnMatchState(normalLeadState)).toBe(true);
      expect(isFollowPlayingTurnMatchState(normalLeadState)).toBe(false);

      // Follow turn state (someone already played, next player must respond)
      const moveCombo = identifyCombination([createCard(4, 'CLUBS')]);
      if (!moveCombo) throw new Error('Expected combination');
      const leadingMove = createPlayedMove('p1', moveCombo);

      const followState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: 1,
        roundNumber: 2,
        players: testPlayers,
        rules: defaultRules,
        currentTurnPlayerId: 'p2',
        leadPlayerId: 'p1',
        roundMoves: [leadingMove],
        leadingMove,
        isLeadMove: false,
        isFirstMoveOfGame: false,
        firstMoveRequiredCard: null,
        passedPlayerIds: [],
        chopNotification: null,
        botThinkingThought: null
      });

      expect(isLeadPlayingTurnMatchState(followState)).toBe(false);
      expect(isFollowPlayingTurnMatchState(followState)).toBe(true);
      expect(followState.leadingMove).toBe(leadingMove);
    });

    it('accurately identifies RoundEndedMatchState and GameOverMatchState', () => {
      const waiting = transitionToWaiting({ gameNumber: 1, players: testPlayers, rules: defaultRules });
      const dealing = transitionToDealing(waiting, { dealtCounts: {} });
      const playing = transitionToPlaying(dealing, {
        roundNumber: 1,
        players: testPlayers,
        currentTurnPlayerId: 'p0',
        leadPlayerId: 'p0',
        leadingMove: null,
        isLeadMove: true,
        isFirstMoveOfGame: false
      });

      const roundEnded = transitionToRoundEnded(playing, {
        roundWinnerId: 'p0',
        nextLeadPlayerId: 'p0'
      });
      expect(isRoundEndedMatchState(roundEnded)).toBe(true);
      expect(isPlayingMatchState(roundEnded)).toBe(false);
      expect(isGameOverMatchState(roundEnded)).toBe(false);

      const settlement = createPerspectiveSettlement({
        subjectPlayerId: 'p0',
        allPlayers: testPlayers,
        winners: [testPlayers[0]],
        payouts: { p0: 3000, p1: -1000, p2: -1000, p3: -1000 },
        eloDeltas: { p0: 25, p1: -8, p2: -8, p3: -9 },
        subjectEloDelta: 25,
        subjectEloBreakdown: null,
        loanDeduction: 0,
        isThreeSpadesWin: false,
        instantWinType: null,
        activeGameType: 'QUICK',
        betAmount: 1000,
        subjectCoins: 50000
      });

      const gameOver = transitionToGameOver(roundEnded, {
        winners: [testPlayers[0]],
        winningMove: null,
        settlement,
        matchPayouts: { p0: 3000, p1: -1000, p2: -1000, p3: -1000 },
        eloDeltas: { p0: 25, p1: -8, p2: -8, p3: -9 }
      });
      expect(isGameOverMatchState(gameOver)).toBe(true);
      expect(isTerminalMatchState(gameOver)).toBe(true);
    });
  });

  describe('3. State Behavior Queries (Zero-Fallback)', () => {
    it('strictly enforces canPlayerPlayInMatchState', () => {
      const waiting = transitionToWaiting({ gameNumber: 1, players: testPlayers, rules: defaultRules });
      expect(canPlayerPlayInMatchState(waiting, 'p0')).toBe(false);

      const playing = transitionToPlaying(waiting, {
        roundNumber: 1,
        players: testPlayers,
        currentTurnPlayerId: 'p0',
        leadPlayerId: 'p0',
        leadingMove: null,
        isLeadMove: true,
        isFirstMoveOfGame: true,
        firstMoveRequiredCard: createCard(3, 'SPADES'),
        passedPlayerIds: ['p1']
      });

      expect(canPlayerPlayInMatchState(playing, 'p0')).toBe(true);
      expect(canPlayerPlayInMatchState(playing, 'p1')).toBe(false); // passed
      expect(canPlayerPlayInMatchState(playing, 'p2')).toBe(false); // not their turn
    });

    it('strictly enforces canPlayerPassInMatchState', () => {
      const threeSpades = createCard(3, 'SPADES');
      const openingState = transitionToPlaying(
        transitionToWaiting({ gameNumber: 1, players: testPlayers, rules: defaultRules }),
        {
          roundNumber: 1,
          players: testPlayers,
          currentTurnPlayerId: 'p0',
          leadPlayerId: 'p0',
          leadingMove: null,
          isLeadMove: true,
          isFirstMoveOfGame: true,
          firstMoveRequiredCard: threeSpades
        }
      );

      // Cấm bỏ lượt ở nước mở màn đầu ván (3 Bích)
      expect(canPlayerPassInMatchState(openingState, 'p0')).toBe(false);

      // Cấm bỏ lượt ở lượt tự do dẫn đầu vòng (isLeadMove = true)
      const leadState = transitionToPlaying(
        transitionToWaiting({ gameNumber: 1, players: testPlayers, rules: defaultRules }),
        {
          roundNumber: 2,
          players: testPlayers,
          currentTurnPlayerId: 'p0',
          leadPlayerId: 'p0',
          leadingMove: null,
          isLeadMove: true,
          isFirstMoveOfGame: false
        }
      );
      expect(canPlayerPassInMatchState(leadState, 'p0')).toBe(false);

      // Cho phép bỏ lượt khi là follow move
      const combo = identifyCombination([createCard(5, 'HEARTS')]);
      if (!combo) throw new Error('Expected combination');
      const followState = transitionToPlaying(
        transitionToWaiting({ gameNumber: 1, players: testPlayers, rules: defaultRules }),
        {
          roundNumber: 2,
          players: testPlayers,
          currentTurnPlayerId: 'p1',
          leadPlayerId: 'p0',
          leadingMove: createPlayedMove('p0', combo),
          isLeadMove: false,
          isFirstMoveOfGame: false
        }
      );
      expect(canPlayerPassInMatchState(followState, 'p1')).toBe(true);
      expect(canPlayerPassInMatchState(followState, 'p0')).toBe(false); // Not current turn
    });

    it('extracts query properties accurately across all states', () => {
      const waiting = transitionToWaiting({ gameNumber: 1, players: testPlayers, rules: defaultRules });
      expect(getCurrentTurnPlayerIdFromMatchState(waiting)).toBeNull();
      expect(getLeadPlayerIdFromMatchState(waiting)).toBeNull();
      expect(getActiveLeadingMoveFromMatchState(waiting)).toBeNull();
      expect(getWinnersFromMatchState(waiting)).toHaveLength(0);
      expect(isGameOverFromMatchState(waiting)).toBe(false);

      const playing = transitionToPlaying(waiting, {
        roundNumber: 1,
        players: testPlayers,
        currentTurnPlayerId: 'p0',
        leadPlayerId: 'p0',
        leadingMove: null,
        isLeadMove: true,
        isFirstMoveOfGame: false
      });
      expect(getCurrentTurnPlayerIdFromMatchState(playing)).toBe('p0');
      expect(getLeadPlayerIdFromMatchState(playing)).toBe('p0');
      expect(getActiveLeadingMoveFromMatchState(playing)).toBeNull();
    });
  });

  describe('4. State Machine Snapshot Mapper Fog-of-War Invariance', () => {
    it('preserves cardCount accurately in mapMatchStateToSnapshot without dropping to 0', () => {
      const fogPlayers = testPlayers.map(p => ({
        ...p,
        hand: [], // Fog-of-War hidden hand
        cardCount: 13
      }));

      const waiting = transitionToWaiting({ gameNumber: 1, players: fogPlayers, rules: defaultRules });
      const playing = transitionToPlaying(waiting, {
        roundNumber: 1,
        players: fogPlayers,
        currentTurnPlayerId: 'p0',
        leadPlayerId: 'p0',
        leadingMove: null,
        isLeadMove: true,
        isFirstMoveOfGame: false
      });

      const snapshot = mapMatchStateToSnapshot(playing);
      expect(snapshot.dealtCounts['p0']).toBe(13);
      expect(snapshot.dealtCounts['p1']).toBe(13);
      expect(snapshot.dealtCounts['p2']).toBe(13);
      expect(snapshot.dealtCounts['p3']).toBe(13);
    });
  });
});
