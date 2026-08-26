import { describe, expect, test } from 'bun:test';
import { 
  INITIAL_DAILY_QUESTS, 
  INITIAL_ACHIEVEMENTS, 
  MASTER_DAILY_QUESTS_POOL, 
  DAILY_MILESTONES,
  generateDailyQuestsForDate,
  hashDateStringToSeed
} from '../../src/engine/quests';

describe('Quests & Achievements Data', () => {
  test('Có đúng 5 Nhiệm Vụ Ngày ban đầu được kích hoạt', () => {
    expect(INITIAL_DAILY_QUESTS.length).toBe(5);
    for (const q of INITIAL_DAILY_QUESTS) {
      expect(q.rewardCoins).toBeGreaterThan(0);
      expect(q.targetCount).toBeGreaterThan(0);
      expect(q.isCompleted).toBe(false);
      expect(q.isClaimed).toBe(false);
    }
  });

  test('Hòm Thưởng Cột Mốc Ngày (Daily Milestone Chests) đầy đủ các mốc 1, 3, 5', () => {
    expect(DAILY_MILESTONES.length).toBe(3);
    expect(DAILY_MILESTONES[0].requiredCount).toBe(1);
    expect(DAILY_MILESTONES[1].requiredCount).toBe(3);
    expect(DAILY_MILESTONES[2].requiredCount).toBe(5);
  });

  test('Kho Master Daily Quests có đủ 30+ nhiệm vụ đa dạng', () => {
    expect(MASTER_DAILY_QUESTS_POOL.length).toBeGreaterThanOrEqual(30);
    const ids = new Set(MASTER_DAILY_QUESTS_POOL.map(q => q.id));
    expect(ids.size).toBe(MASTER_DAILY_QUESTS_POOL.length); // Đảm bảo không trùng ID
  });

  test('Thuật toán băm ngày trả về đúng 5 nhiệm vụ không trùng lặp và nhất quán', () => {
    const questsDay1 = generateDailyQuestsForDate('2026-08-26');
    const questsDay1Again = generateDailyQuestsForDate('2026-08-26');
    const questsDay2 = generateDailyQuestsForDate('2026-08-27');

    expect(questsDay1.length).toBe(5);
    expect(new Set(questsDay1.map(q => q.id)).size).toBe(5);

    // Cùng 1 ngày phải trả về danh sách y hệt nhau
    expect(questsDay1.map(q => q.id)).toEqual(questsDay1Again.map(q => q.id));

    // Khác ngày phải có sự thay đổi
    expect(questsDay1.map(q => q.id)).not.toEqual(questsDay2.map(q => q.id));
  });

  test('Có đủ 25+ Thành Tựu Trọn Đời với các phân loại khác nhau', () => {
    expect(INITIAL_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(25);
    const categories = new Set(INITIAL_ACHIEVEMENTS.map(a => a.category));
    expect(categories.has('CHOP')).toBe(true);
    expect(categories.has('VICTORY')).toBe(true);
    expect(categories.has('WEALTH')).toBe(true);
    expect(categories.has('SPECIAL')).toBe(true);
  });
});
