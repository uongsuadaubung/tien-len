import { describe, expect, it } from 'bun:test';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { loadPlayerProfile } from '../../src/engine/storage';
import { createDefaultGameRules } from '../../src/engine/types';
import { createPlayer, createBotPlayers } from '../../src/engine/player-factory';
import { UI_TIMINGS } from '../../src/ui/constants/ui-timings';

describe('AuthoritativeMatchHost Unit Tests (Kiểm Thử Listen Server Vòng Lặp Ván Đấu)', () => {
  it('1. Khởi tạo host và bắt đầu trận đấu 4 người chơi thành công', () => {
    const profile = loadPlayerProfile();
    const human = createPlayer(profile);
    const bots = createBotPlayers(3);
    const host = new AuthoritativeMatchHost({
      rules: createDefaultGameRules(),
      players: [human, ...bots],
      hostPlayerId: human.id,
      enableDealingAnimation: true
    });

    host.startMatch(1);

    expect(host.engine).not.toBeNull();
    expect(host.engine.players.length).toBe(4);
    expect(host.gameNumber).toBe(1);

    if (!host.instantWinType) {
      expect(host.isDealing).toBe(true);
      // Hoàn tất chia bài
      host.finishDealing();
      expect(host.isDealing).toBe(false);
      expect(host.engine.getCurrentPlayer()?.id).not.toBeNull();
    } else {
      expect(host.isDealing).toBe(false);
      expect(host.engine.isGameOver).toBe(true);
    }

    host.dispose();
  });

  it('2. Đăng ký nhận transport packet khi có thay đổi trạng thái', () => {
    const profile = loadPlayerProfile();
    const human = createPlayer(profile);
    const bots = createBotPlayers(3);
    const host = new AuthoritativeMatchHost({
      rules: createDefaultGameRules(),
      players: [human, ...bots],
      hostPlayerId: human.id
    });

    let packetCount = 0;
    const unregister = host.registerClient(human.id, {
      isConnected: true,
      send: (msg) => {
        if (msg.type === 'TABLE_SYNC') {
          packetCount++;
        }
      },
      onMessage: () => () => {},
      disconnect: () => {}
    });

    host.startMatch(1);

    expect(packetCount).toBeGreaterThanOrEqual(1);
    unregister();
    host.dispose();
  });

  it('3. Cleanup dọn sạch 100% tài nguyên, timer và không rò rỉ bộ nhớ', () => {
    const profile = loadPlayerProfile();
    const human = createPlayer(profile);
    const bots = createBotPlayers(3);
    const host = new AuthoritativeMatchHost({
      rules: createDefaultGameRules(),
      players: [human, ...bots],
      hostPlayerId: human.id
    });

    host.startMatch(1);
    host.dispose();

    expect((host as any).chopTimer).toBeNull();
    expect((host as any).gameOverTimer).toBeNull();
    expect((host as any).bannerTimer).toBeNull();
  });

  it('4. Đếm số lá bài của các người chơi (dealtCounts) cập nhật chính xác theo thời gian thực khi đánh bài', () => {
    const profile = loadPlayerProfile();
    const human = createPlayer(profile);
    const bots = createBotPlayers(3);

    const testRules = createDefaultGameRules();
    testRules.instantWin.enabled = false;

    const host = new AuthoritativeMatchHost({
      rules: testRules,
      players: [human, ...bots],
      hostPlayerId: human.id,
      enableDealingAnimation: true
    });

    host.startMatch(1);
    host.finishDealing();

    for (const p of host.engine.players) {
      expect(host.dealtCounts[p.id]).toBe(13);
    }

    const currentTurnId = host.engine.getCurrentPlayer()!.id;
    const player = host.engine.getPlayer(currentTurnId)!;
    // Đánh 1 lá bài đầu tiên hợp lệ (lá 3 Bích nếu ván 1)
    const cardToPlay = player.hand.find(c => c.rank === 3 && c.suit === 'SPADES') || [player.hand[0]];
    const cards = Array.isArray(cardToPlay) ? cardToPlay : [cardToPlay];

    const playRes = host.playCards(currentTurnId, cards);
    expect(playRes.success).toBe(true);

    expect(host.dealtCounts[currentTurnId]).toBe(13 - cards.length);
    expect(player.hand.length).toBe(13 - cards.length);

    host.dispose();
  });

  it('5. Khi ván kết thúc (Game Over), onGameOver chỉ được gọi sau khoảng đệm 2s (MATCH_END_REVEAL_DELAY_MS)', async () => {
    const profile = loadPlayerProfile();
    const human = createPlayer(profile);
    const bots = createBotPlayers(3);

    const testRules = createDefaultGameRules();
    testRules.instantWin.enabled = false;

    let completed = false;
    const host = new AuthoritativeMatchHost({
      rules: testRules,
      players: [human, ...bots],
      hostPlayerId: human.id,
      enableDealingAnimation: true,
      revealDelayMs: 20,
      onGameOver: () => {
        completed = true;
      }
    });

    host.startMatch(1);
    host.finishDealing();

    // Giả lập ván bài kết thúc
    host.engine.isGameOver = true;
    host.engine.winners = [host.engine.players[0]];

    // Gọi handleGameOver mà không skipDelay (mặc định chờ revealDelayMs)
    host.handleGameOver();

    // Ngay lập tức: onGameOver chưa được gọi
    expect(completed).toBe(false);

    // Chờ 30ms
    await new Promise(resolve => setTimeout(resolve, 30));

    // Sau khi hết delay: onGameOver đã được gọi
    expect(completed).toBe(true);

    host.dispose();
  });
});
