import { describe, it, expect } from 'bun:test';
import { TableSessionFactory } from '../../src/engine/session/table-session-factory';
import { createDefaultGameRules } from '../../src/engine/types';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';

describe('TableSessionFactory Architecture Tests', () => {
  const localPlayerId = 'usr_tester';
  const rules = createDefaultGameRules();
  const mockPlayers = [
    createPlayer({ id: localPlayerId, name: 'Tester', avatar: '🤠', score: 50000 }),
    createBotPlayer('bot_1', 'BOT_ELO_1150', { name: 'Bot 1', avatar: '🤖', score: 50000 }),
    createBotPlayer('bot_2', 'BOT_ELO_1350', { name: 'Bot 2', avatar: '🦊', score: 50000 })
  ];

  it('should cleanly create host, session, bots, and composite disposable', () => {
    const bundle = TableSessionFactory.createOfflineTableSession({
      localPlayerId,
      initialPlayers: mockPlayers,
      rules,
      activeGameType: 'QUICK',
      enableDealingAnimation: false,
      instantDelay: true
    });

    expect(bundle).toBeDefined();
    expect(bundle.host).toBeDefined();
    expect(bundle.session).toBeDefined();
    expect(bundle.bots).toHaveLength(2);
    expect(bundle.disposables).toBeDefined();
    expect(bundle.disposables.size).toBeGreaterThan(0);

    // Disposing the bundle should dispose all underlying instances cleanly
    bundle.disposables.dispose();
    expect(bundle.disposables.disposed).toBe(true);
  });
});
