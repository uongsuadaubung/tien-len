import { describe, it, expect } from 'bun:test';
import { ClientSession } from '../../src/engine/presentation/client-session';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createDefaultGameRules } from '../../src/engine/types';
import { createCard } from '../../src/engine/card';
import { createTableSyncPacket, createGameEndPacket, createDealHandPacket } from '../../src/engine/network/packet-factory';
import type { ClientToHostPacket } from '../../src/engine/transport/transport.interface';
import type { AudioCue, TableRenderFrame } from '../../src/engine/presentation/frame-types';
import { bindSessionToGameStore } from '../../src/stores/game/session-store-bridge';
import { useGameStore } from '../../src/stores/useGameStore';

describe('ClientSession (Dumb View Presentation Controller)', () => {
  const localPlayerId = 'LOCAL_ME';
  const botId = 'OPPONENT_BOT';
  const rules = createDefaultGameRules();

  const mockPlayers = [
    {
      id: localPlayerId,
      name: 'Me',
      avatar: 'me.png',
      hand: [],
      cardCount: 0,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: false as const
    },
    {
      id: botId,
      name: 'Bot',
      avatar: 'bot.png',
      hand: [],
      cardCount: 0,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: true as const,
      botPersonaId: 'BOT_ELO_1150' as const
    }
  ];

  it('should accept dealt cards and push updated TableRenderFrame to subscribers', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    const receivedFrames: TableRenderFrame[] = [];
    const receivedCues: AudioCue[] = [];
    session.subscribeFrame(frame => receivedFrames.push(frame));
    session.subscribeAudioCue(cue => receivedCues.push(cue));

    // Deal cards from host
    const card3S = createCard(3, 'SPADES');
    const card4H = createCard(4, 'HEARTS');
    hostTransport.send({
      type: 'DEAL_HAND',
      packet: {
        playerId: localPlayerId,
        cards: [card3S, card4H],
        leadPlayerId: localPlayerId,
        firstTurnPlayerId: localPlayerId,
        gameNumber: 1
      }
    });

    expect(receivedFrames.length).toBeGreaterThan(1);
    const latest = session.getLatestFrame();
    expect(latest.myHand).toHaveLength(2);
    expect(latest.myHand.map(c => c.card.id)).toContain('3_SPADES');
    expect(receivedCues).toContain('DEAL_START');

    session.dispose();
  });

  it('should handle TOGGLE_CARD_SELECT and SUBMIT_PLAY intents and dispatch action to host', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    const hostReceived: ClientToHostPacket[] = [];
    hostTransport.onMessage(msg => hostReceived.push(msg));

    // Deal cards
    const card3S = createCard(3, 'SPADES');
    hostTransport.send({
      type: 'DEAL_HAND',
      packet: {
        playerId: localPlayerId,
        cards: [card3S],
        leadPlayerId: localPlayerId,
        firstTurnPlayerId: localPlayerId,
        gameNumber: 1
      }
    });

    // Toggle card selection
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: '3_SPADES' });
    let frame = session.getLatestFrame();
    expect(frame.myHand[0].isSelected).toBe(true);

    // Submit play
    session.sendIntent({ type: 'SUBMIT_PLAY' });

    expect(hostReceived).toHaveLength(1);
    expect(hostReceived[0].type).toBe('PLAYER_ACTION');
    if (hostReceived[0].type === 'PLAYER_ACTION') {
      expect(hostReceived[0].packet.type).toBe('PLAY');
      expect(hostReceived[0].packet.cardIds).toEqual(['3_SPADES']);
    }

    // Local hand should have removed the card
    frame = session.getLatestFrame();
    expect(frame.myHand).toHaveLength(0);

    session.dispose();
  });

  it('should handle SUBMIT_PASS intent and emit PASS audio cue', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    const hostReceived: ClientToHostPacket[] = [];
    const audioCues: AudioCue[] = [];
    hostTransport.onMessage(msg => hostReceived.push(msg));
    session.subscribeAudioCue(cue => audioCues.push(cue));

    session.sendIntent({ type: 'SUBMIT_PASS' });

    expect(hostReceived).toHaveLength(1);
    if (hostReceived[0].type === 'PLAYER_ACTION') {
      expect(hostReceived[0].packet.type).toBe('PASS');
    }
    expect(audioCues).toContain('PASS');

    session.dispose();
  });

  it('should properly reset isPassedCurrentRound and enable canPlay when starting a new round after passing', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    const cardJClubs = createCard(11, 'CLUBS');
    const cardJHearts = createCard(11, 'HEARTS');

    // 1. Deal cards to local player
    hostTransport.send({
      type: 'DEAL_HAND',
      packet: {
        playerId: localPlayerId,
        cards: [cardJClubs, cardJHearts],
        leadPlayerId: botId,
        firstTurnPlayerId: localPlayerId,
        gameNumber: 1
      }
    });

    // 2. Local player passes in Round 1
    session.sendIntent({ type: 'SUBMIT_PASS' });
    let frame = session.getLatestFrame();
    const localSeatAfterPass = frame.seats.find(s => s.playerId === localPlayerId);
    expect(localSeatAfterPass?.isPassed).toBe(true);
    expect(frame.controls.canPass).toBe(false);

    // 3. Opponent wins round 1 and opens Round 2 with Pair of 9s (passedPlayerIds is reset to [])
    hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableSyncPacket({
        gameNumber: 1,
        seq: 2,
        roundNumber: 2,
        isGameOver: false,
        currentTurnPlayerId: localPlayerId,
        leadPlayerId: botId,
        remainingCardCounts: { [localPlayerId]: 2, [botId]: 5 },
        passedPlayerIds: [],
        currentMoveCards: [createCard(9, 'CLUBS'), createCard(9, 'DIAMONDS')],
        currentMovePlayerId: botId,
        isChop: false,
        isCascadeChop: false,
        chopNotification: null,
        winners: [],
        isFirstMoveOfGame: false,
        firstMoveRequiredCard: null,
        isLeadMove: false,
        isDealing: false,
        seats: [
          {
            playerId: localPlayerId,
            name: 'Me',
            avatar: 'me.png',
            cardCount: 2,
            score: 1000,
            isPassed: false,
            isCurrentTurn: true,
            isBot: false
          },
          {
            playerId: botId,
            name: 'Bot',
            avatar: 'bot.png',
            cardCount: 5,
            score: 1000,
            isPassed: false,
            isCurrentTurn: false,
            isBot: true
          }
        ]
      })
    });

    frame = session.getLatestFrame();
    const localSeatInNewRound = frame.seats.find(s => s.playerId === localPlayerId);
    expect(localSeatInNewRound?.isPassed).toBe(false);
    expect(frame.controls.canPass).toBe(true);

    // 4. Select Pair of Jacks to beat Pair of 9s
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: '11_CLUBS' });
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: '11_HEARTS' });

    frame = session.getLatestFrame();
    expect(frame.controls.canPlay).toBe(true);
    expect(frame.controls.playButtonLabel).toBe('Đánh (2 lá)');

    session.dispose();
  });

  it('should update player scores in frame and seats when receiving TABLE_SYNC with seats and GAME_END with playerScores from host', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    // Verify initial scores
    let frame = session.getLatestFrame();
    expect(frame.seats.find(s => s.playerId === localPlayerId)?.score).toBe(1000);
    expect(frame.seats.find(s => s.playerId === botId)?.score).toBe(1000);

    // 1. Host sends TABLE_SYNC with updated seats scores
    hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableSyncPacket({
        seq: 1,
        currentTurnPlayerId: localPlayerId,
        leadPlayerId: localPlayerId,
        remainingCardCounts: { [localPlayerId]: 13, [botId]: 13 },
        seats: [
          {
            playerId: localPlayerId,
            name: 'Me',
            avatar: 'me.png',
            cardCount: 13,
            score: 15000,
            isPassed: false,
            isCurrentTurn: true,
            isBot: false
          },
          {
            playerId: botId,
            name: 'Bot',
            avatar: 'bot.png',
            cardCount: 13,
            score: 8500,
            isPassed: false,
            isCurrentTurn: false,
            isBot: true
          }
        ]
      })
    });

    frame = session.getLatestFrame();
    expect(frame.seats.find(s => s.playerId === localPlayerId)?.score).toBe(15000);
    expect(frame.seats.find(s => s.playerId === botId)?.score).toBe(8500);

    // 2. Host sends GAME_END with final playerScores
    hostTransport.send({
      type: 'GAME_END',
      packet: createGameEndPacket({
        winners: [localPlayerId],
        payouts: { [localPlayerId]: 20000, [botId]: -20000 },
        eloDeltas: { [localPlayerId]: 25, [botId]: -25 },
        playerScores: { [localPlayerId]: 35000, [botId]: 0 }
      })
    });

    frame = session.getLatestFrame();
    expect(frame.seats.find(s => s.playerId === localPlayerId)?.score).toBe(35000);
    expect(frame.seats.find(s => s.playerId === botId)?.score).toBe(0);

    session.dispose();
  });

  it('should preserve the exact ranking order of winners when opponent wins 1st place', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    // Host sends GAME_END with botId as 1st place, localPlayerId as 2nd place
    hostTransport.send({
      type: 'GAME_END',
      packet: createGameEndPacket({
        winners: [botId, localPlayerId],
        payouts: { [botId]: 20000, [localPlayerId]: -20000 }
      })
    });

    const matchState = session.getLatestMatchState();
    expect(matchState.status).toBe('GAME_OVER');
    if (matchState.status === 'GAME_OVER') {
      expect(matchState.winners[0]?.id).toBe(botId);
      expect(matchState.winners[1]?.id).toBe(localPlayerId);
    }

    session.dispose();
  });

  it('should emit PASS and PLAY audio cues directly from lastAction and project extended frame fields', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    const cues: AudioCue[] = [];
    session.subscribeAudioCue(cue => cues.push(cue));

    const deadline = Date.now() + 15000;
    hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableSyncPacket({
        turnDeadline: deadline,
        openingReason: 'THREE_SPADES',
        currentMoveCombinationName: 'Sảnh (3 lá)',
        lastAction: {
          playerId: botId,
          type: 'PLAY',
          summary: 'Bot đánh Sảnh (3 lá)'
        },
        seats: [
          {
            playerId: localPlayerId,
            name: 'Me',
            avatar: 'me.png',
            cardCount: 13,
            score: 50000,
            isPassed: false,
            isCurrentTurn: false,
            isBot: false
          },
          {
            playerId: botId,
            name: 'Bot',
            avatar: 'bot.png',
            cardCount: 10,
            score: 50000,
            isPassed: false,
            isCurrentTurn: true,
            isBot: true
          }
        ]
      })
    });

    expect(cues).toContain('CARD_PLAY');
    const frame = session.getLatestFrame();
    expect(frame.turnDeadline).toBe(deadline);
    expect(frame.openingReason).toBe('THREE_SPADES');
    expect(frame.lastAction?.summary).toBe('Bot đánh Sảnh (3 lá)');
    expect(frame.seats.find(s => s.playerId === botId)?.cardCount).toBe(10);

    // Host sends PASS action for bot
    hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableSyncPacket({
        lastAction: {
          playerId: botId,
          type: 'PASS',
          summary: 'Bot bỏ lượt'
        }
      })
    });
    expect(cues).toContain('PASS');

    session.dispose();
  });

  it('should preserve pre-selected cards when receiving opponent moves and table sync events', () => {
    useGameStore.getState().setMyPlayerId(localPlayerId);
    useGameStore.getState().setPlayers(mockPlayers);
    useGameStore.getState().resetMatchState();

    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    const unbind = bindSessionToGameStore(session);

    // Deal cards
    const card3S = createCard(3, 'SPADES');
    const card4H = createCard(4, 'HEARTS');
    const card5D = createCard(5, 'DIAMONDS');
    hostTransport.send({
      type: 'DEAL_HAND',
      packet: createDealHandPacket({
        playerId: localPlayerId,
        cards: [card3S, card4H, card5D],
        gameNumber: 1
      })
    });

    // Local player pre-selects 4_HEARTS and 5_DIAMONDS
    session.sendIntent({ type: 'SET_SELECTED_CARDS', cardIds: [card4H.id, card5D.id] });

    let latestFrame = session.getLatestFrame();
    expect(latestFrame.myHand.find(h => h.card.id === card4H.id)?.isSelected).toBe(true);
    expect(latestFrame.myHand.find(h => h.card.id === card5D.id)?.isSelected).toBe(true);
    expect(useGameStore.getState().selectedCardIds.has(card4H.id)).toBe(true);
    expect(useGameStore.getState().selectedCardIds.has(card5D.id)).toBe(true);

    // Opponent plays a card (e.g. 3_HEARTS)
    hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableSyncPacket({
        currentMovePlayerId: botId,
        currentMoveCards: [{ rank: 3, suit: 'HEARTS', id: '3_HEARTS' }],
        lastAction: {
          playerId: botId,
          type: 'PLAY',
          summary: 'Bot đánh 3 Cơ'
        }
      })
    });

    // The pre-selected cards MUST remain selected both in the session frame and in useGameStore
    latestFrame = session.getLatestFrame();
    expect(latestFrame.myHand.find(h => h.card.id === card4H.id)?.isSelected).toBe(true);
    expect(latestFrame.myHand.find(h => h.card.id === card5D.id)?.isSelected).toBe(true);
    expect(useGameStore.getState().selectedCardIds.has(card4H.id)).toBe(true);
    expect(useGameStore.getState().selectedCardIds.has(card5D.id)).toBe(true);

    // Opponent passes
    hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableSyncPacket({
        currentMovePlayerId: botId,
        lastAction: {
          playerId: botId,
          type: 'PASS',
          summary: 'Bot bỏ lượt'
        }
      })
    });

    // The pre-selected cards MUST STILL remain selected
    latestFrame = session.getLatestFrame();
    expect(latestFrame.myHand.find(h => h.card.id === card4H.id)?.isSelected).toBe(true);
    expect(latestFrame.myHand.find(h => h.card.id === card5D.id)?.isSelected).toBe(true);
    expect(useGameStore.getState().selectedCardIds.has(card4H.id)).toBe(true);
    expect(useGameStore.getState().selectedCardIds.has(card5D.id)).toBe(true);

    // Explicit clear selection drops them
    session.sendIntent({ type: 'CLEAR_SELECTION' });
    expect(useGameStore.getState().selectedCardIds.size).toBe(0);

    unbind();
    session.dispose();
  });

  it('should correctly select 3 4 5 6 and deselect 6 5 4 3 until all cards are lowered', () => {
    useGameStore.getState().setMyPlayerId(localPlayerId);
    useGameStore.getState().setPlayers(mockPlayers);
    useGameStore.getState().resetMatchState();

    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', localPlayerId);
    const session = new ClientSession({
      localPlayerId,
      transport: clientTransport,
      gameRules: rules,
      initialPlayers: mockPlayers
    });

    const unbind = bindSessionToGameStore(session);

    // Deal sảnh 3 4 5 6
    const c3 = createCard(3, 'SPADES');
    const c4 = createCard(4, 'CLUBS');
    const c5 = createCard(5, 'DIAMONDS');
    const c6 = createCard(6, 'HEARTS');

    hostTransport.send({
      type: 'DEAL_HAND',
      packet: createDealHandPacket({
        playerId: localPlayerId,
        cards: [c3, c4, c5, c6],
        gameNumber: 1
      })
    });

    // 1. Chọn lần lượt 3, 4, 5, 6
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: c3.id });
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: c4.id });
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: c5.id });
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: c6.id });

    expect(useGameStore.getState().selectedCardIds.size).toBe(4);
    let frame = session.getLatestFrame();
    expect(frame.myHand.every(h => h.isSelected)).toBe(true);

    // 2. Hạ lần lượt bài 6, 5, 4
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: c6.id });
    expect(useGameStore.getState().selectedCardIds.size).toBe(3);
    expect(useGameStore.getState().selectedCardIds.has(c6.id)).toBe(false);

    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: c5.id });
    expect(useGameStore.getState().selectedCardIds.size).toBe(2);
    expect(useGameStore.getState().selectedCardIds.has(c5.id)).toBe(false);

    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: c4.id });
    expect(useGameStore.getState().selectedCardIds.size).toBe(1);
    expect(useGameStore.getState().selectedCardIds.has(c4.id)).toBe(false);
    expect(useGameStore.getState().selectedCardIds.has(c3.id)).toBe(true);

    // 3. Hạ lá thứ 3 (lá số 3) còn lại cuối cùng: phải hạ được sạch sẽ
    session.sendIntent({ type: 'TOGGLE_CARD_SELECT', cardId: c3.id });
    expect(useGameStore.getState().selectedCardIds.size).toBe(0);
    expect(useGameStore.getState().selectedCardIds.has(c3.id)).toBe(false);

    frame = session.getLatestFrame();
    expect(frame.myHand.every(h => !h.isSelected)).toBe(true);

    unbind();
    session.dispose();
  });
});

