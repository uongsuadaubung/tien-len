import { describe, it, expect } from 'bun:test';
import { BotAgent } from '../../src/engine/server/bot-agent';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import { createCard } from '../../src/engine/card';
import { createTableSyncPacket, createDealHandPacket } from '../../src/engine/network/packet-factory';
import type { ClientToHostPacket } from '../../src/engine/transport/transport.interface';

describe('BotAgent (Autonomous AI Player via Transport)', () => {
  it('should accept dealt cards and respond with an action when its turn comes', async () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST', 'BOT_1');
    const botAgent = new BotAgent({
      botId: 'BOT_1',
      personaId: 'BOT_ELO_1150',
      transport: clientTransport,
      instantDelay: true
    });

    const hostReceivedPackets: ClientToHostPacket[] = [];
    hostTransport.onMessage(msg => hostReceivedPackets.push(msg));

    // Deal cards to Bot
    const card3S = createCard(3, 'SPADES');
    const card4H = createCard(4, 'HEARTS');
    hostTransport.send({
      type: 'DEAL_HAND',
      packet: createDealHandPacket({
        playerId: 'BOT_1',
        cards: [card3S, card4H],
        leadPlayerId: 'BOT_1',
        firstTurnPlayerId: 'BOT_1'
      })
    });

    expect(botAgent.getHand()).toHaveLength(2);

    // Host sends TableSync: bot's turn with required 3 of Spades
    hostTransport.send({
      type: 'TABLE_SYNC',
      packet: createTableSyncPacket({
        seq: 1,
        currentTurnPlayerId: 'BOT_1',
        leadPlayerId: 'BOT_1',
        remainingCardCounts: { BOT_1: 2, HUMAN: 2 },
        isFirstMoveOfGame: true,
        firstMoveRequiredCard: card3S
      })
    });

    // Wait for microtask / instant timer
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(hostReceivedPackets).toHaveLength(1);
    const actionPacket = hostReceivedPackets[0];
    expect(actionPacket.type).toBe('PLAYER_ACTION');
    if (actionPacket.type === 'PLAYER_ACTION') {
      expect(actionPacket.packet.playerId).toBe('BOT_1');
      expect(actionPacket.packet.type).toBe('PLAY');
      // Should play 3 of Spades
      expect(actionPacket.packet.cardIds).toContain('3_SPADES');
    }

    botAgent.dispose();
  });
});
