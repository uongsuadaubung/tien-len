import { describe, expect, test } from 'bun:test';
import { CAMPAIGN_CHAPTERS } from '../../src/engine/campaign';
import { getTierFromElo } from '../../src/engine/ecosystem/ecosystem-types';

describe('Campaign Mode 5 Chapters & Grand Finale', () => {
  test('1. Có đủ 5 Chương Ải tương ứng 5 Bậc Rank theo thứ tự độ khó tăng dần', () => {
    expect(CAMPAIGN_CHAPTERS.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(CAMPAIGN_CHAPTERS[i].id).toBe(i + 1);
      expect(CAMPAIGN_CHAPTERS[i].bots.length).toBe(3);
    }
  });

  test('2. Phần thưởng và tiền cược tăng tiến vượt trội theo từng chương', () => {
    for (let i = 0; i < CAMPAIGN_CHAPTERS.length - 1; i++) {
      const current = CAMPAIGN_CHAPTERS[i];
      const next = CAMPAIGN_CHAPTERS[i + 1];

      expect(next.betAmount).toBeGreaterThan(current.betAmount);
      expect(next.rewardCoins).toBeGreaterThan(current.rewardCoins);
    }

    // Phần thưởng chương 5 cao nhất: 3.000.000 Xu
    expect(CAMPAIGN_CHAPTERS[4].rewardCoins).toBe(3000000);
    expect(CAMPAIGN_CHAPTERS[4].rewardTitle).toBe('Bá Chủ Thần Bài Tối Thượng');
  });

  test('3. Toàn bộ Bot trong 5 Chương đều có định danh Tên, Avatar và Elo đồng bộ chuẩn', () => {
    for (const chapter of CAMPAIGN_CHAPTERS) {
      for (const bot of chapter.bots) {
        expect(bot.name).toBeDefined();
        expect(bot.name!.length).toBeGreaterThan(0);
        expect(bot.avatar).toBeDefined();
        expect(bot.elo).toBeGreaterThanOrEqual(700);
        expect(getTierFromElo(bot.elo).label).toBeDefined();
      }
    }
  });

  test('4. Chương 5 trang bị AI Đỉnh Cao (Minimax, Bayesian, MCTS)', () => {
    const chapter5Bots = CAMPAIGN_CHAPTERS[4].bots;

    // Chương 5 (Thần Bài & Boss Tối Thượng)
    const alphaMind = chapter5Bots.find(b => b.elo === 3200);
    expect(alphaMind).toBeDefined();
    expect(alphaMind!.useMinimaxEndgame).toBe(true);
    expect(alphaMind!.useBayesianInference).toBe(true);
    expect(alphaMind!.mctsSimulations).toBeGreaterThanOrEqual(30);
  });
});
