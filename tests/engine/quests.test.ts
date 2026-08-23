import { describe, expect, test } from 'bun:test';
import { INITIAL_DAILY_QUESTS, INITIAL_ACHIEVEMENTS } from '../../src/engine/quests';

describe('Quests & Achievements Data', () => {
  test('Có đủ 4 Nhiệm Vụ Ngày ban đầu', () => {
    expect(INITIAL_DAILY_QUESTS.length).toBe(4);
    for (const q of INITIAL_DAILY_QUESTS) {
      expect(q.rewardCoins).toBeGreaterThan(0);
      expect(q.targetCount).toBeGreaterThan(0);
      expect(q.isCompleted).toBe(false);
      expect(q.isClaimed).toBe(false);
    }
  });

  test('Có đủ Thành Tựu Trọn Đời với các phân loại khác nhau', () => {
    expect(INITIAL_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(6);
    const categories = new Set(INITIAL_ACHIEVEMENTS.map(a => a.category));
    expect(categories.has('CHOP')).toBe(true);
    expect(categories.has('VICTORY')).toBe(true);
    expect(categories.has('WEALTH')).toBe(true);
  });
});
