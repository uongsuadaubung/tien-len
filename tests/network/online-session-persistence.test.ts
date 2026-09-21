import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  saveActiveOnlineSession, 
  getActiveOnlineSession, 
  clearActiveOnlineSession,
  type ActiveOnlineRoomSession 
} from '../../src/engine/storage';

describe('Online Session Persistence & Auto-Reconnect Storage', () => {
  beforeEach(() => {
    clearActiveOnlineSession();
  });

  it('saves, retrieves, and clears active online session from storage', () => {
    expect(getActiveOnlineSession()).toBeNull();

    const session: ActiveOnlineRoomSession = {
      roomCode: 'TL-7777',
      playerId: 'guest_user_123',
      savedAt: Date.now()
    };

    saveActiveOnlineSession(session);
    const retrieved = getActiveOnlineSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.roomCode).toBe('TL-7777');
    expect(retrieved?.playerId).toBe('guest_user_123');
    expect(retrieved?.savedAt).toBe(session.savedAt);

    clearActiveOnlineSession();
    expect(getActiveOnlineSession()).toBeNull();
  });

  it('detects valid grace period when elapsed time is within 25 seconds', () => {
    const now = Date.now();
    const session: ActiveOnlineRoomSession = {
      roomCode: 'TL-8888',
      playerId: 'player_f5',
      savedAt: now - 10000 // 10 giây trước
    };

    saveActiveOnlineSession(session);
    const loaded = getActiveOnlineSession();
    expect(loaded).not.toBeNull();

    const elapsed = Date.now() - loaded!.savedAt;
    const isWithinGracePeriod = elapsed < 25000;
    expect(isWithinGracePeriod).toBe(true);
  });

  it('identifies expired session when elapsed time exceeds 25 seconds', () => {
    const now = Date.now();
    const expiredSession: ActiveOnlineRoomSession = {
      roomCode: 'TL-9999',
      playerId: 'player_too_late',
      savedAt: now - 26000 // 26 giây trước
    };

    saveActiveOnlineSession(expiredSession);
    const loaded = getActiveOnlineSession();
    expect(loaded).not.toBeNull();

    const elapsed = Date.now() - loaded!.savedAt;
    const isWithinGracePeriod = elapsed < 25000;
    expect(isWithinGracePeriod).toBe(false);
  });
});
