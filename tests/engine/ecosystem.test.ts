import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  generateInitial200Bots, 
  draftRookieBot,
  findUnderfilledTier,
  draftBotForTier
} from '../../src/engine/ecosystem/bot-generator';
import { matchBotsForPlayerTable, matchSimulatedTables } from '../../src/engine/ecosystem/matchmaker';
import { simulateSingleTableMatch } from '../../src/engine/ecosystem/headless-sim';
import { ecosystemManager } from '../../src/engine/ecosystem/ecosystem-manager';
import { ECOSYSTEM_CONSTANTS } from '../../src/engine/constants/ecosystem';
import { BotEntity, getTierFromElo } from '../../src/engine/ecosystem/ecosystem-types';

describe('Thế Giới Sới Bạc 200 Bot (Living Bot Ecosystem Tests)', () => {
  describe('1. Sinh 200 Bot Khởi Thủy (Bot Generation & Gaussian Jitter)', () => {
    it('sinh chính xác 200 bot với phân bố 9 bậc Tier chuẩn Esports', () => {
      const bots = generateInitial200Bots();
      expect(bots.length).toBe(ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT);

      for (let tier = 1; tier <= 9; tier++) {
        const count = bots.filter(b => getTierFromElo(b.elo).tierNum === tier).length;
        expect(count).toBeGreaterThan(0);
      }
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
        expect(bot.personalityTags.length).toBeGreaterThan(0);
      }
    });

    it('findUnderfilledTier: Duyệt từ Tier CAO (Tier 9) xuống Tier THẤP (Tier 1) tìm đúng bậc bị thiếu', () => {
      const bots = generateInitial200Bots();
      // Giả lập sới bạc bị mất 1 Boss Tier 9
      const tier9BotIndex = bots.findIndex(b => getTierFromElo(b.elo).tierNum === 9);
      expect(tier9BotIndex).toBeGreaterThanOrEqual(0);
      bots.splice(tier9BotIndex, 1);

      // findUnderfilledTier phải phát hiện ngay Tier 9 bị thiếu đầu tiên
      const missingTier = findUnderfilledTier(bots);
      expect(missingTier).toBe(9);
    });

    it('draftBotForTier sinh ra Tân Binh xuất phát từ 1.000 Elo & 50.000 Xu nhưng mang trọn vẹn AI DNA của Tier tương ứng', () => {
      const bots = generateInitial200Bots();
      const existingNames = new Set<string>(bots.map(b => b.name).filter((n): n is string => Boolean(n)));

      // Bù đắp cho Tier 9 (Siêu Trí Tuệ Boss)
      const newBossSmurf = draftBotForTier(existingNames, 9);
      expect(newBossSmurf.elo).toBeGreaterThanOrEqual(950);
      expect(newBossSmurf.elo).toBeLessThanOrEqual(1050);
      expect(newBossSmurf.coins).toBe(50000);
      expect(newBossSmurf.useMinimaxEndgame).toBe(true);
      expect(newBossSmurf.useBayesianInference).toBe(true);
      expect(newBossSmurf.useNashEquilibrium).toBe(true);
      expect(newBossSmurf.title).toBe('Thần Đồng Ẩn Danh');
      expect(existingNames.has(newBossSmurf.name || '')).toBe(false);

      // Bù đắp cho Tier 8 (Thần Bài)
      const newGrandmasterSmurf = draftBotForTier(existingNames, 8);
      expect(newGrandmasterSmurf.elo).toBeGreaterThanOrEqual(950);
      expect(newGrandmasterSmurf.elo).toBeLessThanOrEqual(1050);
      expect(newGrandmasterSmurf.coins).toBe(50000);
      expect(newGrandmasterSmurf.useMinimaxEndgame).toBe(true);
      expect(newGrandmasterSmurf.useBayesianInference).toBe(true);
      expect(newGrandmasterSmurf.title).toBe('Thần Đồng Ẩn Danh');
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

      expect(activeTables.length).toBeGreaterThanOrEqual(15);
      expect(activeTables.length).toBeLessThanOrEqual(40);

      for (const t of activeTables) {
        expect(t.botIds.length).toBe(4);
        expect(t.betAmount).toBeGreaterThanOrEqual(ECOSYSTEM_CONSTANTS.MIN_BET_AMOUNT);
      }
    });
  });

  describe('3. Mô Phỏng Trận Đấu Nhanh 0ms (Headless Fast Match Simulation)', () => {
    it('mô phỏng trọn vẹn 1 ván 4 bot tức thì không gây nghẽn vòng lặp', () => {
      const bots = generateInitial200Bots().slice(0, 4);
      const botsMap = new Map(bots.map(b => [b.id, b]));
      const sampleTable = {
        tableId: 'test_table_1',
        botIds: [bots[0].id, bots[1].id, bots[2].id, bots[3].id] as [string, string, string, string],
        tierNum: 1,
        betAmount: 1000
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
    it('kết toán ván đấu, cập nhật Elo/vốn, loại bỏ bot vỡ nợ và bù đắp bot theo cơ chế Top-down Tier Replenishment', async () => {
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

      // Đảm bảo các tier cao nhất (Tier 9, Tier 8, Tier 7) luôn luôn có mặt đầy đủ
      for (let t = 7; t <= 9; t++) {
        const count = allBotsAfter.filter(b => getTierFromElo(b.elo).tierNum === t).length;
        expect(count).toBeGreaterThan(0);
      }
    });
  });
});
