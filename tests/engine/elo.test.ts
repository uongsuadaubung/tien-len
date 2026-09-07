import { describe, expect, test } from 'bun:test';
import { getRankTierByElo, calculateEloDelta, matchmakeRankedOpponents } from '../../src/engine/elo';

describe('Elo & Ranked Matchmaking System', () => {
  test('Phân hạng 5 bậc Rank chính xác theo mốc điểm Elo', () => {
    expect(getRankTierByElo(750).id).toBe('BEGINNER');
    expect(getRankTierByElo(750).name).toBe('Tân Thủ');
    expect(getRankTierByElo(1050).id).toBe('NOVICE');
    expect(getRankTierByElo(1050).name).toBe('Tập Sự');
    expect(getRankTierByElo(1450).id).toBe('SKILLED');
    expect(getRankTierByElo(1450).name).toBe('Lành Nghề');
    expect(getRankTierByElo(1850).id).toBe('MASTER');
    expect(getRankTierByElo(1850).name).toBe('Cao Thủ');
    expect(getRankTierByElo(2250).id).toBe('GRANDMASTER');
    expect(getRankTierByElo(2250).name).toBe('Thần Bài');
  });

  test('Tính toán biến động Elo sau ván đấu', () => {
    const playerElo = 1500;
    const oppAvg = 1500;

    // Về Nhất: Cộng khoảng 35 Elo
    const winRes = calculateEloDelta(1, playerElo, oppAvg);
    expect(winRes.delta).toBeGreaterThan(30);
    expect(winRes.newElo).toBe(playerElo + winRes.delta);

    // Về Nhì: Cộng nhẹ khoảng 12 Elo
    const secondRes = calculateEloDelta(2, playerElo, oppAvg);
    expect(secondRes.delta).toBeGreaterThan(0);

    // Về Ba: Trừ nhẹ khoảng 12 Elo
    const thirdRes = calculateEloDelta(3, playerElo, oppAvg);
    expect(thirdRes.delta).toBeLessThan(0);

    // Về Bét: Trừ nặng khoảng 35 Elo
    const lastRes = calculateEloDelta(4, playerElo, oppAvg);
    expect(lastRes.delta).toBeLessThan(-30);
  });

  test('Matchmaking chọn đúng 3 bot có Elo tương đồng ở mọi bậc rank', () => {
    // 1. Rookie / Bronze (Elo 850) -> Bot nằm ở nhóm dưới / trung
    const bronzeBots = matchmakeRankedOpponents(850);
    expect(bronzeBots.length).toBe(3);
    const bronzeIds = new Set(bronzeBots.map(b => b.id));
    expect(bronzeIds.size).toBe(3);
    bronzeBots.forEach(b => {
      expect(b.name).toBeDefined();
      expect(b.avatar).toBeDefined();
      expect(b.elo).toBeLessThanOrEqual(1600); // Không thể bị ghép nhầm với God Mode
    });

    // 2. Diamond / Master (Elo 1900) -> Bot nằm ở nhóm cao thủ
    const diamondBots = matchmakeRankedOpponents(1900);
    expect(diamondBots.length).toBe(3);
    const diamondIds = new Set(diamondBots.map(b => b.id));
    expect(diamondIds.size).toBe(3);
    diamondBots.forEach(b => {
      expect(b.name).toBeDefined();
      expect(b.avatar).toBeDefined();
      expect(b.elo).toBeGreaterThanOrEqual(1300); // Không bị ghép với Rookie 850
    });

    // 3. Grandmaster / God Mode (Elo 2450) -> Bot đẳng cấp cao nhất
    const gmBots = matchmakeRankedOpponents(2450);
    expect(gmBots.length).toBe(3);
    gmBots.forEach(b => {
      expect(b.elo).toBeGreaterThanOrEqual(1800);
    });
  });
});
