import { describe, test, expect } from 'bun:test';
import { RANK_TIERS, getRankTierByElo } from '../../src/engine/elo';
import { getTierFromElo } from '../../src/engine/ecosystem/ecosystem-types';
import { ECOSYSTEM_CONSTANTS } from '../../src/engine/constants/ecosystem';
import { generateInitial200Bots } from '../../src/engine/ecosystem/bot-generator';
import { getBotConfig } from '../../src/ai/bot-factory';

describe('9 Esports Tiers & Boss Bot Verification Unit Tests', () => {
  test('1. Đúng 9 bậc Rank trong RANK_TIERS với mốc điểm chuẩn Esports', () => {
    expect(RANK_TIERS.length).toBe(9);
    expect(RANK_TIERS[0].id).toBe('IRON');
    expect(RANK_TIERS[0].name).toBe('Sắt');
    expect(RANK_TIERS[1].id).toBe('BRONZE');
    expect(RANK_TIERS[1].name).toBe('Đồng');
    expect(RANK_TIERS[2].id).toBe('SILVER');
    expect(RANK_TIERS[2].name).toBe('Bạc');
    expect(RANK_TIERS[3].id).toBe('GOLD');
    expect(RANK_TIERS[3].name).toBe('Vàng');
    expect(RANK_TIERS[4].id).toBe('PLATINUM');
    expect(RANK_TIERS[4].name).toBe('Bạch Kim');
    expect(RANK_TIERS[5].id).toBe('DIAMOND');
    expect(RANK_TIERS[5].name).toBe('Kim Cương');
    expect(RANK_TIERS[6].id).toBe('MASTER');
    expect(RANK_TIERS[6].name).toBe('Cao Thủ');
    expect(RANK_TIERS[7].id).toBe('GRANDMASTER');
    expect(RANK_TIERS[7].name).toBe('Đại Cao Thủ');
    expect(RANK_TIERS[8].id).toBe('CHALLENGER');
    expect(RANK_TIERS[8].name).toBe('Thách Đấu');
  });

  test('2. getTierFromElo ánh xạ chính xác 9 bậc cho mọi mốc điểm', () => {
    expect(getTierFromElo(700).label).toBe('Sắt');
    expect(getTierFromElo(1000).label).toBe('Đồng');
    expect(getTierFromElo(1300).label).toBe('Bạc');
    expect(getTierFromElo(1600).label).toBe('Vàng');
    expect(getTierFromElo(1900).label).toBe('Bạch Kim');
    expect(getTierFromElo(2200).label).toBe('Kim Cương');
    expect(getTierFromElo(2500).label).toBe('Cao Thủ');
    expect(getTierFromElo(2800).label).toBe('Đại Cao Thủ');
    expect(getTierFromElo(3200).label).toBe('Thách Đấu');
  });

  test('3. Tier 9 Boss Bots: Có đầy đủ 3 Boss với cấu hình Superhuman AI', () => {
    const bossConfig = getBotConfig('BOT_ELO_3200');
    expect(bossConfig.elo).toBe(3200);
    expect(bossConfig.useMinimaxEndgame).toBe(true);
    expect(bossConfig.useBayesianInference).toBe(true);
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
