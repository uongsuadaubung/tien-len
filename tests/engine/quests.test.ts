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

  test('CampaignAllClearAchievementEvaluator: Chỉ tăng đúng 1 tiến độ khi xong Chương 1, chỉ hoàn thành khi xong đủ 5 chương', () => {
    const { CampaignAllClearAchievementEvaluator } = require('../../src/engine/evaluators/progress-evaluators');
    const { DEFAULT_PROFILE } = require('../../src/engine/storage');
    const evaluator = new CampaignAllClearAchievementEvaluator();

    const dummyEvent = {
      type: 'MATCH_COMPLETED',
      activeGameType: 'CAMPAIGN',
      isHumanWinner: true
    };

    // 1. Chỉ mới hoàn thành Chương 1 (2/2 ván, mở khóa ải 2)
    const profileChapter1 = {
      ...DEFAULT_PROFILE,
      campaignUnlockedChapter: 2,
      campaignChapterWins: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
    const count1 = evaluator.evaluate(dummyEvent, 0, 5, profileChapter1);
    expect(count1).toBe(1); // Chỉ mới xong 1 chương (1/5), KHÔNG được hoàn thành 5/5

    // 2. Hoàn thành Chương 1, 2, 3 (mở khóa ải 4)
    const profileChapter3 = {
      ...DEFAULT_PROFILE,
      campaignUnlockedChapter: 4,
      campaignChapterWins: { 1: 2, 2: 3, 3: 3, 4: 0, 5: 0 }
    };
    const count3 = evaluator.evaluate(dummyEvent, 1, 5, profileChapter3);
    expect(count3).toBe(3); // Xong 3 chương (3/5)

    // 3. Hoàn thành toàn bộ 5 Chương (5/5)
    const profileChapter5 = {
      ...DEFAULT_PROFILE,
      campaignUnlockedChapter: 6,
      campaignChapterWins: { 1: 2, 2: 3, 3: 3, 4: 4, 5: 5 }
    };
    const count5 = evaluator.evaluate(dummyEvent, 4, 5, profileChapter5);
    expect(count5).toBe(5); // Hoàn thành 5/5
  });

  test('loadPlayerProfile: Tự động sửa lỗi ach_campaign_all_clear nếu profile cũ bị đánh dấu hoàn thành sai khi mới chỉ xong chương 1', () => {
    const { loadPlayerProfile, savePlayerProfile, DEFAULT_PROFILE } = require('../../src/engine/storage');

    // Lưu profile bị sai (chỉ thắng chương 1 nhưng ach_campaign_all_clear bị completed)
    const corruptedProfile = {
      ...DEFAULT_PROFILE,
      name: 'Tester',
      coins: 50000,
      campaignUnlockedChapter: 2,
      campaignChapterWins: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 },
      achievements: [
        {
          id: 'ach_campaign_all_clear',
          title: 'Thần Bài Tối Thượng 5 Ải',
          description: 'Đánh bại toàn bộ Trùm Sòng và hoàn thành 5 Chương Chiến Dịch.',
          rewardCoins: 500000,
          icon: '🌟',
          targetCount: 5,
          currentCount: 5,
          isCompleted: true,
          isClaimed: false,
          category: 'SPECIAL'
        }
      ]
    };

    savePlayerProfile(corruptedProfile);

    const loaded = loadPlayerProfile();
    const campaignAch = loaded.achievements.find((a: any) => a.id === 'ach_campaign_all_clear');
    expect(campaignAch).toBeDefined();
    // Tự động chuẩn hóa về đúng tiến độ thực tế: 1/5 và isCompleted = false
    expect(campaignAch.currentCount).toBe(1);
    expect(campaignAch.isCompleted).toBe(false);
    expect(campaignAch.isClaimed).toBe(false);
  });
});
