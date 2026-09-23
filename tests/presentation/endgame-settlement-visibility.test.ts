import { describe, expect, it } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { ClientSession } from '../../src/engine/presentation/client-session';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { createCard } from '../../src/engine/card';
import { createDefaultGameRules } from '../../src/engine/types';
import { useGameStore } from '../../src/stores/useGameStore';
import { useUserStore } from '../../src/stores/useUserStore';

describe('Endgame Settlement & Remaining Cards Visibility Integration Tests', () => {
  it('Human wins vs Bot in 1v1 Traditional: payouts, elo, remaining cards, and name formatting are correct', () => {
    // 1. Setup profile and store
    const humanId = 'usr_human_kk';
    useUserStore.getState().setProfile({
      ...useUserStore.getState().profile,
      id: humanId,
      name: 'kk',
      avatar: '🤠',
      coins: 50000,
      elo: 1000,
      loans: 0
    });
    useGameStore.setState({ myPlayerId: humanId, activeGameType: 'QUICK' });

    const rules = createDefaultGameRules();
    rules.settlementRule = 'TRADITIONAL';
    rules.table.playerCount = 2;
    rules.table.betAmount = 1000;

    const human = createPlayer({ id: humanId, name: 'kk', avatar: '🤠' });
    const bot = createBotPlayer('bot_daiki', 'BOT_ELO_1000', { name: 'Daiki (Blitzer)', avatar: '🤖' });

    const winningCard = createCard(10, 'HEARTS');
    const botCard1 = createCard(4, 'SPADES');
    const botCard2 = createCard(5, 'SPADES');
    const botCard3 = createCard(6, 'CLUBS');

    human.hand = [winningCard];
    bot.hand = [botCard1, botCard2, botCard3];

    const host = new AuthoritativeMatchHost({
      rules,
      players: [human, bot],
      hostPlayerId: humanId,
      instantDelay: true // Skip 2s delay for instant settle execution
    });

    const humanTransport = createMemoryDuplexTransport('HOST', humanId);
    host.registerClient(humanId, humanTransport.hostTransport);

    const session = new ClientSession({
      localPlayerId: humanId,
      transport: humanTransport.clientTransport,
      gameRules: rules,
      initialPlayers: [human, bot],
      activeGameType: 'QUICK'
    });

    // Wire up frame subscription to mimic app-flow-coordinator
    session.subscribeFrame(frame => {
      const store = useGameStore.getState();
      const myCards = frame.myHand.map(h => h.card);
      store.setGameNumber(frame.gameNumber);
      store.setIsDealing(frame.isDealing);
      store.setDealtCounts(frame.dealtCounts);

      const matchState = session.getLatestMatchState();
      store.applyMatchState(matchState);

      store.setPlayers(prevPlayers => {
        return prevPlayers.map(p => {
          if (p.id === frame.localPlayerId) {
            return { ...p, hand: myCards };
          }
          if (matchState.status === 'GAME_OVER') {
            const revealedPlayer = matchState.players.find(mp => mp.id === p.id);
            if (revealedPlayer && revealedPlayer.hand && revealedPlayer.hand.length > 0 && revealedPlayer.hand.every(c => c !== null)) {
              return { ...p, hand: [...revealedPlayer.hand] };
            }
          }
          const seat = frame.seats.find(s => s.playerId === p.id);
          return {
            ...p,
            isPassedCurrentRound: seat?.isPassed ?? false,
            hand: new Array(seat?.cardCount ?? 0).fill(null) as any
          };
        });
      });
    });

    host.startMatch(1);

    // Setup match engine state
    host.engine.isGameOver = false;
    host.engine.instantWinType = null;
    host.engine.winners = [];
    host.instantWinType = null;
    host.engine.players[0].hand = [winningCard];
    host.engine.players[1].hand = [botCard1, botCard2, botCard3];
    host.engine.currentRound.leadPlayerId = humanId;
    host.engine.currentRound.currentTurnPlayerId = humanId;
    host.engine.currentRound.moves = [];
    host.engine.isFirstMoveOfGame = false;
    host.engine.firstMoveRequiredCard = null;

    humanTransport.hostTransport.send({
      type: 'DEAL_HAND',
      packet: {
        playerId: humanId,
        cards: [winningCard],
        leadPlayerId: humanId,
        firstTurnPlayerId: humanId,
        gameNumber: 1,
        isFirstMoveOfGame: false,
        firstMoveRequiredCard: null
      }
    });

    host.broadcastTableSync();

    // Human plays the winning card
    session.sendIntent({ type: 'SET_SELECTED_CARDS', cardIds: [winningCard.id] });
    session.sendIntent({ type: 'SUBMIT_PLAY' });

    expect(host.engine.isGameOver).toBe(true);

    // Check store perspectiveSettlement
    const storeState = useGameStore.getState();
    const settlement = storeState.perspectiveSettlement;
    expect(settlement).not.toBeNull();
    if (!settlement) return;

    expect(settlement.isWinner).toBe(true);
    expect(settlement.rank).toBe(1);
    expect(settlement.netPayout).toBeGreaterThan(0); // Human won coins! (Not +0)

    // Check settled players
    const humanView = settlement.players.find(p => p.id === humanId);
    const botView = settlement.players.find(p => p.id === 'bot_daiki');

    expect(humanView).toBeDefined();
    expect(botView).toBeDefined();

    // Human should have 0 remaining cards and positive payout
    expect(humanView?.isWinner).toBe(true);
    expect(humanView?.remainingCards.length).toBe(0);
    expect(humanView?.netPayout).toBe(1000);

    // Bot should have 3 remaining cards (botCard1, botCard2, botCard3) and negative payout!
    expect(botView?.isWinner).toBe(false);
    expect(botView?.rank).toBe(2);
    expect(botView?.netPayout).toBe(-1000);
    expect(botView?.remainingCards.length).toBe(3); // MUST NOT be 0!
    expect(botView?.remainingCards.map(c => c.id)).toContain(botCard1.id);
    expect(botView?.remainingCards.map(c => c.id)).toContain(botCard2.id);
    expect(botView?.remainingCards.map(c => c.id)).toContain(botCard3.id);

    // Check revealed hands in store
    const botInStore = storeState.players.find(p => p.id === 'bot_daiki');
    expect(botInStore?.hand.length).toBe(3);
    expect(botInStore?.hand.every(c => c !== null)).toBe(true);

    // Check name formatting test (prevent double parentheses)
    const rawHumanName = humanView!.name;
    const formattedHumanName = `${rawHumanName.replace(/\s*\((?:Bạn|You)\)\s*/gi, '').trim()} (Bạn)`;
    expect(formattedHumanName).toBe('kk (Bạn)');
    expect(formattedHumanName).not.toContain('((Bạn))');

    host.dispose();
    session.dispose();
    useGameStore.getState().resetMatchState();
  });
});
