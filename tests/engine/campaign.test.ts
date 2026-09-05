import { describe, expect, test } from 'bun:test';
import { CAMPAIGN_CHAPTERS } from '../../src/engine/campaign';
import { getTierFromElo } from '../../src/engine/ecosystem/ecosystem-types';

describe('Campaign Mode 9 Esports Chapters & Grand Finale', () => {
  test('1. Có đủ 9 Chương Ải tương ứng 9 Bậc Rank Esports theo thứ tự độ khó tăng dần', () => {
    expect(CAMPAIGN_CHAPTERS.length).toBe(9);
    for (let i = 0; i < 9; i++) {
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

    // Phần thưởng chương 9 cao nhất: 3.000.000 Xu
    expect(CAMPAIGN_CHAPTERS[8].rewardCoins).toBe(3000000);
    expect(CAMPAIGN_CHAPTERS[8].rewardTitle).toBe('Bá Chủ Thần Bài Tối Thượng');
  });

  test('3. Toàn bộ Bot trong 9 Chương đều có định danh Tên, Avatar và Elo đồng bộ chuẩn', () => {
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

  test('4. Chương 8 & Chương 9 trang bị AI Đỉnh Cao (Minimax, Bayesian, MCTS)', () => {
    const chapter8Bots = CAMPAIGN_CHAPTERS[7].bots;
    const chapter9Bots = CAMPAIGN_CHAPTERS[8].bots;

    // Chương 8 (Thần Bài - Elo 2750)
    for (const bot of chapter8Bots) {
      expect(bot.elo).toBe(2750);
      expect(bot.useMinimaxEndgame).toBe(true);
      expect(bot.useBayesianInference).toBe(true);
    }

    // Chương 9 (Siêu Trí Tuệ Boss - Elo 3200)
    for (const bot of chapter9Bots) {
      expect(bot.elo).toBe(3200);
      expect(bot.useMinimaxEndgame).toBe(true);
      expect(bot.useBayesianInference).toBe(true);
      expect(bot.mctsSimulations).toBeGreaterThanOrEqual(30);
    }
  });
});
