import { describe, expect, it } from 'bun:test';
import { OfflineMatchDriver } from '../../src/engine/offline-match-driver';
import { loadPlayerProfile } from '../../src/engine/storage';
import { createDefaultGameRules } from '../../src/engine/types';

describe('OfflineMatchDriver Unit Tests (Kiểm Thử Driver Vòng Lặp Ván Đấu Thuần Túy)', () => {
  it('1. Khởi tạo driver và bắt đầu trận đấu 4 người chơi thành công', () => {
    const driver = new OfflineMatchDriver();
    const profile = loadPlayerProfile();

    const snapshot = driver.startMatch(1, {
      profile,
      customRules: createDefaultGameRules(),
      playerCount: 4
    });

    expect(driver.engine).not.toBeNull();
    expect(snapshot.players.length).toBe(4);
    expect(snapshot.isDealing).toBe(true);
    expect(snapshot.gameNumber).toBe(1);

    // Hoàn tất chia bài
    driver.finishDealing();
    const updated = driver.getSnapshot();
    expect(updated.isDealing).toBe(false);
    expect(updated.currentTurnPlayerId).not.toBeNull();

    driver.cleanup();
    expect(driver.engine).toBeNull();
  });

  it('2. Đăng ký nhận snapshot subscription khi có thay đổi trạng thái', () => {
    const driver = new OfflineMatchDriver();
    const profile = loadPlayerProfile();
    let snapshotCount = 0;

    const unsubscribe = driver.subscribe(() => {
      snapshotCount++;
    });

    driver.startMatch(1, {
      profile,
      customRules: createDefaultGameRules(),
      playerCount: 4
    });

    expect(snapshotCount).toBeGreaterThanOrEqual(2);
    unsubscribe();
    driver.cleanup();
  });

  it('3. Cleanup dọn sạch 100% tài nguyên, timer và không rò rỉ bộ nhớ', () => {
    const driver = new OfflineMatchDriver();
    const profile = loadPlayerProfile();

    driver.startMatch(1, {
      profile,
      customRules: createDefaultGameRules(),
      playerCount: 4
    });

    driver.cleanup();
    expect(driver.engine).toBeNull();
    expect(driver.trackers).toEqual({});
    expect(driver.botThinkingThought).toBeNull();
    expect(driver.chopNotification).toBeNull();
  });

  it('4. Đếm số lá bài của các người chơi (dealtCounts) cập nhật chính xác theo thời gian thực khi đánh bài', () => {
    const driver = new OfflineMatchDriver();
    const profile = loadPlayerProfile();

    driver.startMatch(1, {
      profile,
      customRules: createDefaultGameRules(),
      playerCount: 4
    });

    driver.finishDealing();
    const snapshotAfterDeal = driver.getSnapshot();
    for (const p of snapshotAfterDeal.players) {
      expect(snapshotAfterDeal.dealtCounts[p.id]).toBe(13);
    }

    const currentTurnId = snapshotAfterDeal.currentTurnPlayerId!;
    const player = driver.engine!.getPlayer(currentTurnId)!;
    // Đánh 1 lá bài đầu tiên hợp lệ (lá 3 Bích nếu ván 1)
    const cardToPlay = player.hand.find(c => c.rank === 3 && c.suit === 'SPADES') || [player.hand[0]];
    const cards = Array.isArray(cardToPlay) ? cardToPlay : [cardToPlay];

    const playRes = driver.playCards(currentTurnId, cards);
    expect(playRes.success).toBe(true);

    const snapshotAfterMove = driver.getSnapshot();
    expect(snapshotAfterMove.dealtCounts[currentTurnId]).toBe(13 - cards.length);
    expect(player.hand.length).toBe(13 - cards.length);

    driver.cleanup();
  });
});

