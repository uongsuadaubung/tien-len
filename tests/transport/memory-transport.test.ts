import { describe, it, expect } from 'bun:test';
import { createMemoryDuplexTransport } from '../../src/engine/transport/memory-transport';
import type { HostToClientPacket, ClientToHostPacket } from '../../src/engine/transport/transport.interface';

describe('InMemoryTransport', () => {
  it('should transfer packets bi-directionally between host and client with zero delay', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport('HOST_1', 'CLIENT_1');

    const clientReceived: HostToClientPacket[] = [];
    const hostReceived: ClientToHostPacket[] = [];

    clientTransport.onMessage((msg) => clientReceived.push(msg));
    hostTransport.onMessage((msg) => hostReceived.push(msg));

    // Host sends to Client
    const hostPacket: HostToClientPacket = {
      type: 'DEAL_HAND',
      packet: {
        playerId: 'CLIENT_1',
        cards: [{ id: '3_SPADES', rank: 3, suit: 'SPADES' }],
        leadPlayerId: 'CLIENT_1',
        firstTurnPlayerId: 'CLIENT_1',
        gameNumber: 1
      }
    };
    hostTransport.send(hostPacket);

    expect(clientReceived).toHaveLength(1);
    expect(clientReceived[0]).toEqual(hostPacket);

    // Client sends to Host
    const clientPacket: ClientToHostPacket = {
      type: 'PLAYER_ACTION',
      packet: {
        type: 'PASS',
        playerId: 'CLIENT_1',
        timestamp: Date.now()
      }
    };
    clientTransport.send(clientPacket);

    expect(hostReceived).toHaveLength(1);
    expect(hostReceived[0]).toEqual(clientPacket);
  });

  it('should stop transmitting after disconnect is called', () => {
    const { hostTransport, clientTransport } = createMemoryDuplexTransport();
    let received = 0;
    clientTransport.onMessage(() => { received++; });

    hostTransport.send({
      type: 'DEAL_HAND',
      packet: { playerId: 'P1', cards: [], leadPlayerId: 'P1', firstTurnPlayerId: 'P1', gameNumber: 1 }
    });
    expect(received).toBe(1);

    clientTransport.disconnect();
    expect(clientTransport.isConnected).toBe(false);

    hostTransport.send({
      type: 'DEAL_HAND',
      packet: { playerId: 'P1', cards: [], leadPlayerId: 'P1', firstTurnPlayerId: 'P1', gameNumber: 1 }
    });
    expect(received).toBe(1); // Not incremented
  });
});
