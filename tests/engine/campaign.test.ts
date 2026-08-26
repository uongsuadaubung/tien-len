import { describe, expect, test } from 'bun:test';
import { CAMPAIGN_CHAPTERS } from '../../src/engine/campaign';

describe('Campaign Mode 5 Chapters', () => {
  test('Có đủ 5 Chương Ải theo thứ tự độ khó tăng dần', () => {
    expect(CAMPAIGN_CHAPTERS.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(CAMPAIGN_CHAPTERS[i].id).toBe(i + 1);
      expect(CAMPAIGN_CHAPTERS[i].bots.length).toBe(3);
    }
  });

  test('Phần thưởng và tiền cược tăng dần theo từng chương', () => {
    for (let i = 0; i < CAMPAIGN_CHAPTERS.length - 1; i++) {
      const current = CAMPAIGN_CHAPTERS[i];
      const next = CAMPAIGN_CHAPTERS[i + 1];

      expect(next.betAmount).toBeGreaterThan(current.betAmount);
      expect(next.rewardCoins).toBeGreaterThan(current.rewardCoins);
    }
  });

  test('Toàn bộ Bot Boss trong 5 Chương đều có định danh Tên, Avatar và Elo đồng bộ 100%', () => {
    for (const chapter of CAMPAIGN_CHAPTERS) {
      for (const bot of chapter.bots) {
        expect(bot.name).toBeDefined();
        expect(bot.name!.length).toBeGreaterThan(0);
        expect(bot.avatar).toBeDefined();
        expect(bot.elo).toBeGreaterThan(0);
        expect(bot.tier).toBeDefined();
      }
    }
  });
});
