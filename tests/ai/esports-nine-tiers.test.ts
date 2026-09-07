import { describe, test, expect } from 'bun:test';
import { RANK_TIERS, getRankTierByElo } from '../../src/engine/elo';
import { getTierFromElo } from '../../src/engine/ecosystem/ecosystem-types';
import { ECOSYSTEM_CONSTANTS } from '../../src/engine/constants/ecosystem';
import { generateInitial200Bots } from '../../src/engine/ecosystem/bot-generator';
import { getBotConfig } from '../../src/ai/bot-factory';

describe('5 Unified Esports Tiers & Boss Bot Verification Unit Tests', () => {
  test('1. Đúng 5 bậc Rank trong RANK_TIERS với mốc điểm chuẩn Esports', () => {
    expect(RANK_TIERS.length).toBe(5);
    expect(RANK_TIERS[0].id).toBe('BEGINNER');
    expect(RANK_TIERS[0].name).toBe('Tân Thủ');
    expect(RANK_TIERS[0].rankBadge).toBe('⚙️');

    expect(RANK_TIERS[1].id).toBe('NOVICE');
    expect(RANK_TIERS[1].name).toBe('Tập Sự');
    expect(RANK_TIERS[1].rankBadge).toBe('🥉');

    expect(RANK_TIERS[2].id).toBe('SKILLED');
    expect(RANK_TIERS[2].name).toBe('Lành Nghề');
    expect(RANK_TIERS[2].rankBadge).toBe('🥈');

    expect(RANK_TIERS[3].id).toBe('MASTER');
    expect(RANK_TIERS[3].name).toBe('Cao Thủ');
    expect(RANK_TIERS[3].rankBadge).toBe('🥇');

    expect(RANK_TIERS[4].id).toBe('GRANDMASTER');
    expect(RANK_TIERS[4].name).toBe('Thần Bài');
    expect(RANK_TIERS[4].rankBadge).toBe('👑');
  });

  test('2. getTierFromElo ánh xạ chính xác 5 bậc cho mọi mốc điểm', () => {
    expect(getTierFromElo(700).label).toBe('Tân Thủ');
    expect(getTierFromElo(1000).label).toBe('Tập Sự');
    expect(getTierFromElo(1400).label).toBe('Lành Nghề');
    expect(getTierFromElo(1800).label).toBe('Cao Thủ');
    expect(getTierFromElo(2200).label).toBe('Thần Bài');
    expect(getTierFromElo(2800).label).toBe('Thần Bài');
    expect(getTierFromElo(3200).label).toBe('Thần Bài');
  });

  test('3. Tier 5 Boss Bots: Có đầy đủ Boss với cấu hình Superhuman AI', () => {
    const bossConfig = getBotConfig('BOT_ELO_3200');
    expect(bossConfig.elo).toBe(3200);
    expect(bossConfig.useMinimaxEndgame).toBe(true);
    expect(bossConfig.useBayesianInference).toBe(true);
    expect(bossConfig.mctsSimulations).toBeGreaterThanOrEqual(30);
  });

  test('4. Phân bổ 200 Bot theo hình Kim Tự Tháp 5 bậc chuẩn xác', () => {
    const dist = ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(total).toBe(200);

    const bots = generateInitial200Bots();
    expect(bots.length).toBe(200);

    // Kiểm tra định mức theo 5 bậc: 50, 60, 46, 30, 14
    expect(bots.filter(b => b.dnaTier === 1).length).toBe(50);
    expect(bots.filter(b => b.dnaTier === 2).length).toBe(60);
    expect(bots.filter(b => b.dnaTier === 3).length).toBe(46);
    expect(bots.filter(b => b.dnaTier === 4).length).toBe(30);
    expect(bots.filter(b => b.dnaTier === 5).length).toBe(14);

    const tier5Bots = bots.filter(b => b.dnaTier === 5);
    expect(tier5Bots.length).toBe(14);
    expect(tier5Bots.some(b => b.name?.includes('Alpha Mind') || b.description?.includes('Alpha Mind') || b.id.includes('bot_eco_t5'))).toBe(true);
  });
});
