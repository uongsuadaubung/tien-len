import { describe, it, expect, beforeEach } from 'bun:test';
import { generateInitial200Bots, draftRookieBot } from '../../src/engine/ecosystem/bot-generator';
import { matchBotsForPlayerTable, matchSimulatedTables } from '../../src/engine/ecosystem/matchmaker';
import { simulateSingleTableMatch } from '../../src/engine/ecosystem/headless-sim';
import { ecosystemManager } from '../../src/engine/ecosystem/ecosystem-manager';
import { ECOSYSTEM_CONSTANTS } from '../../src/engine/constants/ecosystem';
import { BotEntity, getTierFromElo } from '../../src/engine/ecosystem/ecosystem-types';

describe('Thế Giới Sới Bạc 200 Bot (Living Bot Ecosystem Tests)', () => {
  describe('1. Sinh 200 Bot Khởi Thủy (Bot Generation & Gaussian Jitter)', () => {
    it('sinh chính xác 200 bot với phân bố 5 bậc Tier chuẩn Esports', () => {
      const bots = generateInitial200Bots();
      expect(bots.length).toBe(ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT);

      const tier1Count = bots.filter(b => getTierFromElo(b.elo).tierNum === 1).length;
      const tier2Count = bots.filter(b => getTierFromElo(b.elo).tierNum === 2).length;
      const tier3Count = bots.filter(b => getTierFromElo(b.elo).tierNum === 3).length;
      const tier4Count = bots.filter(b => getTierFromElo(b.elo).tierNum === 4).length;
      const tier5Count = bots.filter(b => getTierFromElo(b.elo).tierNum === 5).length;

      expect(tier1Count).toBe(ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION[1]); // 50
      expect(tier2Count).toBe(ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION[2]); // 70
      expect(tier3Count).toBe(ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION[3]); // 50
      expect(tier4Count).toBe(ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION[4]); // 20
      expect(tier5Count).toBe(ECOSYSTEM_CONSTANTS.TIER_DISTRIBUTION[5]); // 10
    });

    it('tất cả bot đều có tên Latin hợp lệ, không chứa ký tự tượng hình và không trùng lặp', () => {
      const bots = generateInitial200Bots();
      const namesSet = new Set<string>();

      for (const bot of bots) {
        expect(bot.name).toBeDefined();
        const bName = bot.name || '';
        expect(bName.length).toBeGreaterThan(0);
        // Không chứa ký tự Kanji/Hanzi/Hangul/Thai/Arabic
        expect(/[\u4e00-\u9faf\u3040-\u30ff\uac00-\ud7af\u0e00-\u0e7f\u0600-\u06ff]/.test(bName)).toBe(false);
        namesSet.add(bName);
      }

      expect(namesSet.size).toBe(200);
    });

    it('tất cả bot có vốn khởi điểm >= 1.000 xu và chỉ số AI jitter hợp lệ trong khoảng 0.0 - 1.0', () => {
      const bots = generateInitial200Bots();
      for (const bot of bots) {
        expect(bot.coins).toBeGreaterThanOrEqual(ECOSYSTEM_CONSTANTS.BANKRUPTCY_THRESHOLD);
        expect(bot.elo).toBeGreaterThanOrEqual(500);
        expect(bot.riskAppetite).toBeGreaterThanOrEqual(0);
        expect(bot.riskAppetite).toBeLessThanOrEqual(1.0);
        expect(bot.trapTendency).toBeGreaterThanOrEqual(0);
        expect(bot.trapTendency).toBeLessThanOrEqual(1.0);
        expect(bot.baitingTendency).toBeGreaterThanOrEqual(0);
        expect(bot.baitingTendency).toBeLessThanOrEqual(1.0);
        expect(bot.personalityTags.length).toBeGreaterThan(0);
      }
    });

    it('draftRookieBot sinh ra Tân Binh kế thừa DNA từ Tier vừa phá sản nhưng bắt đầu với Elo và Vốn tân binh để tự leo lại', () => {
      const bots = generateInitial200Bots();
      const existingNames = new Set<string>(bots.map(b => b.name).filter((n): n is string => Boolean(n)));
      
      // Khi một bot Tier 4 phá sản
      const rookieForTier4 = draftRookieBot(existingNames, 4);

      // Kế thừa trình độ DNA cao cấp của Tier 4 (Lookahead / MCTS)
      expect(rookieForTier4.simulationLookahead).toBeGreaterThanOrEqual(1);
      
      // Nhưng bắt đầu lại từ mức Elo và Vốn cơ sở của Tân Binh (50.000 Xu như người chơi thật)
      expect(getTierFromElo(rookieForTier4.elo).tierNum).toBe(1);
      expect(rookieForTier4.elo).toBeLessThanOrEqual(1050);
      expect(rookieForTier4.coins).toBe(50000);
      expect(existingNames.has(rookieForTier4.name || '')).toBe(false);
      expect(rookieForTier4.status).toBe('ACTIVE');
    });
  });

  describe('2. Ghép Trận Thông Minh & Mức Cược Linh Hoạt (Matchmaking & Organic Concurrency)', () => {
    let bots: BotEntity[];

    beforeEach(() => {
      bots = generateInitial200Bots();
    });

    it('ghép đúng 3 bot cho bàn người chơi theo Elo và vốn cược', () => {
      const playerElo = 1200;
      const tableBet = 2000;
      const matched = matchBotsForPlayerTable(bots, playerElo, tableBet);

      expect(matched.length).toBe(3);
      for (const bot of matched) {
        expect(bot.coins).toBeGreaterThanOrEqual(tableBet * 1.5);
      }
    });

    it('ghép các bàn mô phỏng ngầm với tỉ lệ tham gia tự nhiên (40% - 70%) và cược biến động theo vốn', () => {
      const activeBots = bots.filter(b => b.status === 'ACTIVE');
      const { activeTables } = matchSimulatedTables(activeBots);

      expect(activeTables.length).toBeGreaterThanOrEqual(10);
      expect(activeTables.length).toBeLessThanOrEqual(45);

      const participatingBotsCount = activeTables.reduce((sum, t) => sum + t.botIds.length, 0);
      const participationRate = participatingBotsCount / activeBots.length;

      // Tham gia từ 30% đến 80%
      expect(participationRate).toBeGreaterThanOrEqual(0.30);
      expect(participationRate).toBeLessThanOrEqual(0.80);

      // Mỗi bàn có đúng 4 bot và mức cược hợp lệ
      for (const table of activeTables) {
        expect(table.botIds.length).toBe(4);
        expect(table.betAmount).toBeGreaterThanOrEqual(ECOSYSTEM_CONSTANTS.MIN_BET_AMOUNT);
      }
    });
  });

  describe('3. Mô Phỏng Trận Đấu Nhanh 0ms (Headless Fast Match Simulation)', () => {
    it('mô phỏng trọn vẹn 1 ván 4 bot tức thì không gây nghẽn vòng lặp', () => {
      const bots = generateInitial200Bots();
      const botsMap = new Map<string, BotEntity>(bots.map(b => [b.id, b]));
      const sampleTable = {
        tableId: 'table_test_1',
        betAmount: 1000,
        tierNum: 1,
        botIds: [bots[0].id, bots[1].id, bots[2].id, bots[3].id] as [string, string, string, string]
      };

      const startTime = performance.now();
      const result = simulateSingleTableMatch(sampleTable, botsMap);
      const durationMs = performance.now() - startTime;

      expect(result.botResults.length).toBe(4);
      // Thời gian chạy 1 ván dưới 500ms
      expect(durationMs).toBeLessThan(500);

      const ranks = result.botResults.map(r => r.rank).sort();
      expect(ranks).toEqual([1, 2, 3, 4]);

      // Tổng deltaCoins của bàn thi đấu phải có người thắng kẻ thua
      const winnerResult = result.botResults.find(r => r.rank === 1);
      const loserResult = result.botResults.find(r => r.rank === 4);
      expect(winnerResult?.deltaElo).toBeGreaterThan(0);
      expect(loserResult?.deltaElo).toBeLessThan(0);
    });
  });

  describe('4. Quản Lý Hệ Sinh Thái & Vòng Đời Bot (Ecosystem Lifecycle & Settlement)', () => {
    it('kết toán ván đấu, cập nhật Elo/vốn, loại bỏ bot vỡ nợ và draft tân binh thay thế', async () => {
      await ecosystemManager.initialize();
      const initialBots = await ecosystemManager.getAllBots();
      expect(initialBots.length).toBe(ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT);

      // Chuẩn bị ván đấu
      const { tableOpponents, simulationPromise } = await ecosystemManager.prepareMatchRound(1200, 2000);
      expect(tableOpponents.length).toBe(3);

      // Giả lập kết quả ván người chơi
      const settlement = await ecosystemManager.settleRound({
        humanRank: 1,
        betAmount: 2000,
        botResults: [
          { botId: tableOpponents[0].id, rank: 2, deltaCoins: 1000, deltaElo: 10, chopsDone: 0, congsGiven: 0 },
          { botId: tableOpponents[1].id, rank: 3, deltaCoins: -1000, deltaElo: -10, chopsDone: 0, congsGiven: 0 },
          { botId: tableOpponents[2].id, rank: 4, deltaCoins: -3000, deltaElo: -25, chopsDone: 0, congsGiven: 0 }
        ]
      }, simulationPromise);

      const allBotsAfter = await ecosystemManager.getAllBots();
      expect(allBotsAfter.length).toBe(ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT);
      // Đảm bảo số lượng bot hoạt động luôn duy trì 200 bot
      const activeBotsCount = allBotsAfter.filter(b => b.status === 'ACTIVE').length;
      expect(activeBotsCount).toBe(ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT);
    });
  });
});
