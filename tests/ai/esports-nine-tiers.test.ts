import { describe, test, expect } from 'bun:test';
import { RANK_TIERS, getRankTierByElo } from '../../src/engine/elo';
import { getTierFromElo } from '../../src/engine/ecosystem/ecosystem-types';
import { ECOSYSTEM_CONSTANTS } from '../../src/engine/constants/ecosystem';
import { generateInitial200Bots } from '../../src/engine/ecosystem/bot-generator';
import { getBotConfig } from '../../src/ai/bot-factory';

describe('9 Esports Tiers & Boss Bot Verification Unit Tests', () => {
  test('1. Đúng 9 bậc Rank trong RANK_TIERS với mốc điểm chuẩn Esports', () => {
    expect(RANK_TIERS.length).toBe(9);
    expect(RANK_TIERS[0].id).toBe('WOOD');
    expect(RANK_TIERS[1].id).toBe('BRONZE');
    expect(RANK_TIERS[2].id).toBe('SILVER');
    expect(RANK_TIERS[3].id).toBe('GOLD');
    expect(RANK_TIERS[4].id).toBe('PLATINUM');
    expect(RANK_TIERS[5].id).toBe('DIAMOND');
    expect(RANK_TIERS[6].id).toBe('MASTER');
    expect(RANK_TIERS[7].id).toBe('GRANDMASTER');
    expect(RANK_TIERS[8].id).toBe('CHALLENGER');
  });

  test('2. getTierFromElo ánh xạ chính xác 9 bậc cho mọi mốc điểm', () => {
    expect(getTierFromElo(700).tierNum).toBe(1);
    expect(getTierFromElo(1000).tierNum).toBe(2);
    expect(getTierFromElo(1300).tierNum).toBe(3);
    expect(getTierFromElo(1600).tierNum).toBe(4);
    expect(getTierFromElo(1900).tierNum).toBe(5);
    expect(getTierFromElo(2200).tierNum).toBe(6);
    expect(getTierFromElo(2500).tierNum).toBe(7);
    expect(getTierFromElo(2800).tierNum).toBe(8);
    expect(getTierFromElo(3200).tierNum).toBe(9);
  });

  test('3. Tier 9 Boss Bots: Có đầy đủ 3 Boss với cấu hình Superhuman AI', () => {
    const bossConfig = getBotConfig('BOT_ELO_3200');
    expect(bossConfig.elo).toBe(3200);
    expect(bossConfig.useMinimaxEndgame).toBe(true);
    expect(bossConfig.useBayesianInference).toBe(true);
    expect(bossConfig.useNashEquilibrium).toBe(true);
    expect(bossConfig.mctsSimulations).toBeGreaterThanOrEqual(30);
  });

  test('4. Phân bổ 200 Bot theo hình Kim Tự Tháp chuẩn xác', () => {
    const dist = ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(total).toBe(200);

    const bots = generateInitial200Bots();
    expect(bots.length).toBe(200);

    const tier9Bots = bots.filter(b => b.elo >= 3000);
    expect(tier9Bots.length).toBe(3);
    expect(tier9Bots.some(b => b.name?.includes('Alpha Mind'))).toBe(true);
  });
});
