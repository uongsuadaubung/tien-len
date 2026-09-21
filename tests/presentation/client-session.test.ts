import { describe, it, expect } from 'bun:test';
import { ClientSession } from '../../src/engine/presentation/client-session';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createDefaultGameRules } from '../../src/engine/types';
import { createCard } from '../../src/engine/card';
import type { ClientToHostPacket } from '../../src/engine/transport/transport.interface';
import type { AudioCue, TableRenderFrame } from '../../src/engine/presentation/frame-types';

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
});
