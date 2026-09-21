import { describe, it, expect } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createDefaultGameRules } from '../../src/engine/types';
import { createCard } from '../../src/engine/card';
import type { HostToClientPacket } from '../../src/engine/transport/transport.interface';

describe('AuthoritativeMatchHost (Unified Listen Server)', () => {
  const p1Id = 'PLAYER_1';
  const p2Id = 'PLAYER_2';

  const getMockPlayers = () => [
    {
      id: p1Id,
      name: 'Player 1',
      avatar: 'av1.png',
      hand: [],
      cardCount: 0,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: false as const
    },
    {
      id: p2Id,
      name: 'Player 2',
      avatar: 'av2.png',
      hand: [],
      cardCount: 0,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: false as const
    }
  ];

  it('should deal private cards to each player and broadcast authoritative table sync', () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true }
    });

    const host = new AuthoritativeMatchHost({
      rules,
      players: getMockPlayers(),
      hostPlayerId: p1Id,
      instantDelay: true
    });

    const p1Transports = createMemoryDuplexTransport('HOST', p1Id);
    const p2Transports = createMemoryDuplexTransport('HOST', p2Id);

    host.registerClient(p1Id, p1Transports.hostTransport);
    host.registerClient(p2Id, p2Transports.hostTransport);

    const p1Packets: HostToClientPacket[] = [];
    const p2Packets: HostToClientPacket[] = [];
    p1Transports.clientTransport.onMessage(msg => p1Packets.push(msg));
    p2Transports.clientTransport.onMessage(msg => p2Packets.push(msg));

    host.startMatch(1);

    // Verify DealHand received by both players
    const p1Deal = p1Packets.find(p => p.type === 'DEAL_HAND');
    const p2Deal = p2Packets.find(p => p.type === 'DEAL_HAND');

    expect(p1Deal).toBeDefined();
    expect(p2Deal).toBeDefined();
    if (p1Deal && p1Deal.type === 'DEAL_HAND' && p2Deal && p2Deal.type === 'DEAL_HAND') {
      expect(p1Deal.packet.playerId).toBe(p1Id);
      expect(p1Deal.packet.cards.length).toBeGreaterThan(0);
      expect(p2Deal.packet.playerId).toBe(p2Id);
      expect(p2Deal.packet.cards.length).toBeGreaterThan(0);

      // Verify hands are different
      expect(p1Deal.packet.cards[0].id).not.toBe(p2Deal.packet.cards[0].id);
    }

    // Verify TableSync received
    const p1Sync = p1Packets.find(p => p.type === 'TABLE_SYNC');
    expect(p1Sync).toBeDefined();
    if (p1Sync && p1Sync.type === 'TABLE_SYNC') {
      expect(p1Sync.packet.isGameOver).toBe(false);
      expect(p1Sync.packet.currentTurnPlayerId).toBeDefined();
    }

    host.dispose();
  });

  it('should accept valid move action from the current player and update table state', () => {
    const rules = createDefaultGameRules({
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true }
    });

    const host = new AuthoritativeMatchHost({
      rules,
      players: getMockPlayers(),
      hostPlayerId: p1Id,
      instantDelay: true
    });

    const p1Transports = createMemoryDuplexTransport('HOST', p1Id);
    const p2Transports = createMemoryDuplexTransport('HOST', p2Id);
    host.registerClient(p1Id, p1Transports.hostTransport);
    host.registerClient(p2Id, p2Transports.hostTransport);

    let currentTurnId = '';
    let requiredCardId = '';
    let p1DealtCards: string[] = [];
    let p2DealtCards: string[] = [];

    p1Transports.clientTransport.onMessage(msg => {
      if (msg.type === 'DEAL_HAND') p1DealtCards = msg.packet.cards.map(c => c.id);
      if (msg.type === 'TABLE_SYNC') {
        if (msg.packet.currentTurnPlayerId) currentTurnId = msg.packet.currentTurnPlayerId;
        if (msg.packet.firstMoveRequiredCard) requiredCardId = msg.packet.firstMoveRequiredCard.id;
      }
    });
    p2Transports.clientTransport.onMessage(msg => {
      if (msg.type === 'DEAL_HAND') p2DealtCards = msg.packet.cards.map(c => c.id);
    });

    host.startMatch(1);

    // Current turn player plays their smallest card or required first card
    const turnPlayerBeforeMove = currentTurnId;
    const activeTransport = turnPlayerBeforeMove === p1Id ? p1Transports.clientTransport : p2Transports.clientTransport;
    const activeCards = turnPlayerBeforeMove === p1Id ? p1DealtCards : p2DealtCards;
    const cardToPlay = requiredCardId || (activeCards.includes('3_SPADES') ? '3_SPADES' : activeCards[0]);

    activeTransport.send({
      type: 'PLAYER_ACTION',
      packet: {
        playerId: turnPlayerBeforeMove,
        type: 'PLAY',
        cardIds: [cardToPlay],
        timestamp: Date.now()
      }
    });

    // Verify table updated
    const leadingMove = host.engine.getLeadingMove();
    expect(leadingMove).toBeDefined();
    expect(leadingMove?.playerId).toBe(turnPlayerBeforeMove);
    expect(leadingMove?.combination.cards[0].id).toBe(cardToPlay);

    host.dispose();
  });
});
