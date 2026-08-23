import { describe, expect, test } from 'bun:test';
import { getRankTierByElo, calculateEloDelta, matchmakeRankedOpponents } from '../../src/engine/elo';

describe('Elo & Ranked Matchmaking System', () => {
  test('Phân hạng 7 bậc Rank chính xác theo mốc điểm Elo', () => {
    expect(getRankTierByElo(850).id).toBe('BRONZE');
    expect(getRankTierByElo(1100).id).toBe('SILVER');
    expect(getRankTierByElo(1350).id).toBe('GOLD');
    expect(getRankTierByElo(1600).id).toBe('PLATINUM');
    expect(getRankTierByElo(1850).id).toBe('DIAMOND');
    expect(getRankTierByElo(2150).id).toBe('MASTER');
    expect(getRankTierByElo(2400).id).toBe('GRANDMASTER');
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

  test('Matchmaking chọn đúng 3 bot có Elo tương đồng', () => {
    const playerElo = 1800; // Rank Kim Cương
    const matchedBots = matchmakeRankedOpponents(playerElo);

    expect(matchedBots.length).toBe(3);
    // Các bot không được trùng nhau
    const uniqueIds = new Set(matchedBots.map(b => b.id));
    expect(uniqueIds.size).toBe(3);
  });
});
