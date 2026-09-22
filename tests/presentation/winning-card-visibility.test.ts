import { describe, expect, it } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { ClientSession } from '../../src/engine/presentation/client-session';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { createCard } from '../../src/engine/card';
import { createDefaultGameRules } from '../../src/engine/types';
import { useGameStore } from '../../src/stores/useGameStore';
import { bindSessionToGameStore } from '../../src/stores/game/session-store-bridge';

describe('Winning Move Card Visibility on Table Tests', () => {
  it('1. Human plays winning card: winningMove is preserved in session and frame discardPile', () => {
    const rules = createDefaultGameRules();
    rules.settlementRule = 'COUNT_CARDS';

    const human = createPlayer({ id: 'human_0', name: 'kk', avatar: '🤠' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Renata', avatar: '🤖' });

    const winningCard = createCard(10, 'HEARTS');
    human.hand = [winningCard];
    bot.hand = [createCard(4, 'SPADES'), createCard(5, 'SPADES')];

    const host = new AuthoritativeMatchHost({
      rules,
      players: [human, bot],
      hostPlayerId: 'human_0'
    });

    const humanTransport = createMemoryDuplexTransport('HOST', 'human_0');
    host.registerClient('human_0', humanTransport.hostTransport);

    const session = new ClientSession({
      localPlayerId: 'human_0',
      transport: humanTransport.clientTransport,
      gameRules: rules,
      initialPlayers: [human, bot]
    });
    const unbindStore = bindSessionToGameStore(session);

    host.startMatch(1);

    // Override hands on engine and send DEAL_HAND
    host.engine.isGameOver = false;
    host.engine.instantWinType = null;
    host.engine.winners = [];
    host.instantWinType = null;
    host.engine.players[0].hand = [winningCard];
    host.engine.players[1].hand = [createCard(4, 'SPADES'), createCard(5, 'SPADES')];
    host.engine.currentRound.leadPlayerId = 'human_0';
    host.engine.currentRound.currentTurnPlayerId = 'human_0';
    host.engine.currentRound.moves = [];
    host.engine.isFirstMoveOfGame = false;
    host.engine.firstMoveRequiredCard = null;

    // Send deal hand to human
    humanTransport.hostTransport.send({
      type: 'DEAL_HAND',
      packet: {
        playerId: 'human_0',
        cards: [winningCard],
        leadPlayerId: 'human_0',
        firstTurnPlayerId: 'human_0',
        gameNumber: 1,
        isFirstMoveOfGame: false,
        firstMoveRequiredCard: null
      }
    });

    // Sync initial state
    host.broadcastTableSync();

    // Human selects the winning card
    session.sendIntent({ type: 'SET_SELECTED_CARDS', cardIds: [winningCard.id] });

    // Human submits play
    session.sendIntent({ type: 'SUBMIT_PLAY' });

    expect(host.engine.isGameOver).toBe(true);

    const matchState = session.getLatestMatchState();
    expect(matchState.status).toBe('GAME_OVER');
    if (matchState.status === 'GAME_OVER') {
      expect(matchState.winningMove).not.toBeNull();
      expect(matchState.winningMove?.playerId).toBe('human_0');
      expect(matchState.winningMove?.combination.cards[0].id).toBe(winningCard.id);
    }

    const frame = (session as any).buildCurrentFrame();
    expect(frame.discardPile).not.toBeNull();
    expect(frame.discardPile?.playedByPlayerId).toBe('human_0');
    expect(frame.discardPile?.cards[0].id).toBe(winningCard.id);

    const storeState = useGameStore.getState();
    expect(storeState.currentMove).not.toBeNull();
    expect(storeState.currentMove?.playerId).toBe('human_0');
    expect(storeState.currentMove?.combination.cards[0].id).toBe(winningCard.id);

    host.dispose();
    unbindStore();
    session.dispose();
    useGameStore.getState().resetMatchState();
  });

  it('2. Bot plays winning card: winningMove is retained during reveal delay and after GAME_END', () => {
    const rules = createDefaultGameRules();
    rules.settlementRule = 'COUNT_CARDS';

    const human = createPlayer({ id: 'human_0', name: 'kk', avatar: '🤠' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Renata', avatar: '🤖' });

    const botWinningCard = createCard(14, 'HEARTS');
    human.hand = [createCard(4, 'SPADES'), createCard(5, 'SPADES')];
    bot.hand = [botWinningCard];

    const host = new AuthoritativeMatchHost({
      rules,
      players: [human, bot],
      hostPlayerId: 'human_0'
    });

    const humanTransport = createMemoryDuplexTransport('HOST', 'human_0');
    const botTransport = createMemoryDuplexTransport('HOST', 'bot_1');
    host.registerClient('human_0', humanTransport.hostTransport);
    host.registerClient('bot_1', botTransport.hostTransport);

    const session = new ClientSession({
      localPlayerId: 'human_0',
      transport: humanTransport.clientTransport,
      gameRules: rules,
      initialPlayers: [human, bot]
    });

    host.startMatch(1);

    host.engine.isGameOver = false;
    host.engine.instantWinType = null;
    host.engine.winners = [];
    host.instantWinType = null;
    host.engine.players[0].hand = [createCard(4, 'SPADES'), createCard(5, 'SPADES')];
    host.engine.players[1].hand = [botWinningCard];
    host.engine.currentRound.leadPlayerId = 'bot_1';
    host.engine.currentRound.currentTurnPlayerId = 'bot_1';
    host.engine.currentRound.moves = [];
    host.engine.isFirstMoveOfGame = false;
    host.engine.firstMoveRequiredCard = null;

    host.broadcastTableSync();

    // Bot plays winning card via host transport
    botTransport.clientTransport.send({
      type: 'PLAYER_ACTION',
      packet: {
        playerId: 'bot_1',
        type: 'PLAY',
        cardIds: [botWinningCard.id],
        timestamp: Date.now()
      }
    });

    const matchState = session.getLatestMatchState();
    expect(matchState.status).toBe('GAME_OVER');
    if (matchState.status === 'GAME_OVER') {
      expect(matchState.winningMove).not.toBeNull();
      expect(matchState.winningMove?.playerId).toBe('bot_1');
      expect(matchState.winningMove?.combination.cards[0].id).toBe(botWinningCard.id);
    }

    const frame = (session as any).buildCurrentFrame();
    expect(frame.discardPile).not.toBeNull();
    expect(frame.discardPile?.playedByPlayerId).toBe('bot_1');
    expect(frame.discardPile?.cards[0].id).toBe(botWinningCard.id);

    // Simulate GAME_END packet arriving
    humanTransport.hostTransport.send({
      type: 'GAME_END',
      packet: {
        winners: ['bot_1'],
        payouts: { bot_1: 1000, human_0: -1000 },
        eloDeltas: { bot_1: 15, human_0: -15 },
        playerScores: { bot_1: 51000, human_0: 49000 },
        allPlayerHands: {
          human_0: [createCard(4, 'SPADES'), createCard(5, 'SPADES')],
          bot_1: []
        },
        isThreeSpadesWin: false,
        instantWinType: null,
        loanDeduction: 0
      }
    });

    const stateAfterEnd = session.getLatestMatchState();
    expect(stateAfterEnd.status).toBe('GAME_OVER');
    expect((stateAfterEnd as any).winningMove).not.toBeNull();
    expect((stateAfterEnd as any).winningMove?.playerId).toBe('bot_1');
    expect((stateAfterEnd as any).winningMove?.combination.cards[0].id).toBe(botWinningCard.id);

    const frameAfterEnd = (session as any).buildCurrentFrame();
    expect(frameAfterEnd.discardPile).not.toBeNull();
    expect(frameAfterEnd.discardPile?.playedByPlayerId).toBe('bot_1');
    expect(frameAfterEnd.discardPile?.cards[0].id).toBe(botWinningCard.id);

    expect((stateAfterEnd as any).settlement).toBeDefined();
    expect((stateAfterEnd as any).settlement.players).toHaveLength(2);
    const settledHuman = (stateAfterEnd as any).settlement.players.find((p: any) => p.id === 'human_0');
    const settledBot = (stateAfterEnd as any).settlement.players.find((p: any) => p.id === 'bot_1');
    expect(settledBot?.isWinner).toBe(true);
    expect(settledBot?.netPayout).toBe(1000);
    expect(settledBot?.remainingCards).toHaveLength(0);
    expect(settledHuman?.isWinner).toBe(false);
    expect(settledHuman?.netPayout).toBe(-1000);
    expect(settledHuman?.remainingCards).toHaveLength(2);

    host.dispose();
    session.dispose();
    useGameStore.getState().resetMatchState();
  });
});
