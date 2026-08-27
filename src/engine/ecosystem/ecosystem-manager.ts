import { ECOSYSTEM_CONSTANTS } from '../constants/ecosystem';
import { 
  dbGetAllBots, 
  dbSaveBotsBatch, 
  dbDeleteBotsBatch,
  dbAddNewsBatch, 
  dbResetEcosystem 
} from '../db/indexed-db';
import { 
  BotEntity, 
  EcosystemNewsItem, 
  SimulatedTableResult,
  getTierFromElo
} from './ecosystem-types';
import { 
  generateInitial200Bots, 
  draftRookieBot,
  findUnderfilledTier,
  draftBotForTier
} from './bot-generator';
import { 
  matchBotsForPlayerTable, 
  matchSimulatedTables 
} from './matchmaker';
import { 
  runEcosystemSimulation 
} from './simulation-worker-client';

/**
 * ============================================================================
 * ECOSYSTEM MANAGER (BỘ ĐIỀU HÀNH HỆ SINH THÁI 200 BOT)
 * Quản lý vòng đời, điều phối ghép trận, chạy Web Worker mô phỏng ngầm,
 * đào thải bot phá sản và cập nhật cơ sở dữ liệu IndexedDB.
 * ============================================================================
 */

export interface HumanMatchSummary {
  botResults: {
    botId: string;
    rank: number; // 1, 2, 3, 4
    deltaCoins: number;
    deltaElo: number;
    chopsDone?: number;
    congsGiven?: number;
  }[];
  humanRank: number;
  betAmount: number;
}

class EcosystemManager {
  private static instance: EcosystemManager | null = null;
  private isInitialized = false;
  private activeBotsMap = new Map<string, BotEntity>();

  public static getInstance(): EcosystemManager {
    if (!EcosystemManager.instance) {
      EcosystemManager.instance = new EcosystemManager();
    }
    return EcosystemManager.instance;
  }

  /**
   * Khởi tạo hệ sinh thái từ IndexedDB:
   * - Tự động sinh 200 Bot nếu DB trống.
   * - Tự động phát hiện và bù đắp các Bậc Rank còn trống (từ Tier 9 xuống Tier 1) nếu database cũ bị thiếu.
   */
  public async initialize(): Promise<BotEntity[]> {
    try {
      const storedBots = await dbGetAllBots();

      if (storedBots && storedBots.length > 0) {
        // Lọc bỏ bot phá sản và nạp các bot ACTIVE
        const activeBots = storedBots.filter(b => b.status === 'ACTIVE' && b.coins >= ECOSYSTEM_CONSTANTS.BANKRUPTCY_THRESHOLD);
        
        this.activeBotsMap.clear();
        for (const b of activeBots) {
          this.activeBotsMap.set(b.id, b);
        }

        const existingNames = new Set<string>(
          Array.from(this.activeBotsMap.values())
            .map(b => b.name)
            .filter((n): n is string => Boolean(n))
        );

        let hasChanges = false;

        // Bù đắp cho đủ 200 Bot theo thứ tự ưu tiên từ Tier 9 Boss xuống Tier 1
        while (this.activeBotsMap.size < ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT) {
          const underfilledTier = findUnderfilledTier(Array.from(this.activeBotsMap.values()));
          const newBot = draftBotForTier(existingNames, underfilledTier);
          if (newBot.name) {
            existingNames.add(newBot.name);
          }
          this.activeBotsMap.set(newBot.id, newBot);
          hasChanges = true;
        }

        // Cắt bớt nếu dư > 200 bot
        if (this.activeBotsMap.size > ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT) {
          const allBots = Array.from(this.activeBotsMap.values()).slice(0, ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT);
          this.activeBotsMap.clear();
          for (const b of allBots) {
            this.activeBotsMap.set(b.id, b);
          }
          hasChanges = true;
        }

        // Xóa bot dư thừa khỏi DB nếu cần
        const validIds = new Set(this.activeBotsMap.keys());
        const excessIds = storedBots.filter(b => !validIds.has(b.id)).map(b => b.id);
        if (excessIds.length > 0) {
          await dbDeleteBotsBatch(excessIds);
        }

        if (hasChanges) {
          await dbSaveBotsBatch(Array.from(this.activeBotsMap.values()));
        }

        this.isInitialized = true;
        return Array.from(this.activeBotsMap.values());
      }

      // Chưa có Bot nào trong DB -> Sinh mới 200 Bot chuẩn 9 Tiers
      const initialBots = generateInitial200Bots();
      this.activeBotsMap.clear();
      for (const b of initialBots) {
        this.activeBotsMap.set(b.id, b);
      }

      await dbSaveBotsBatch(initialBots);

      // Thêm tin tức chào mừng sới bạc
      const welcomeNews: EcosystemNewsItem = {
        id: `news_welcome_${Date.now()}`,
        timestamp: Date.now(),
        type: 'ROOKIE_JOINED',
        botId: null,
        botName: null,
        avatar: null,
        amount: null,
        message: `🎉 Sới Bạc Quốc Tế chính thức khai trương với 200 cao thủ từ 9 bậc rank!`
      };
      await dbAddNewsBatch([welcomeNews]);

      this.isInitialized = true;
      return initialBots;
    } catch (e) {
      console.error('Lỗi khi khởi tạo EcosystemManager:', e);
      // Fallback in-memory nếu DB lỗi
      const fallback = generateInitial200Bots();
      this.activeBotsMap.clear();
      for (const b of fallback) {
        this.activeBotsMap.set(b.id, b);
      }
      this.isInitialized = true;
      return fallback;
    }
  }

  /**
   * Lấy danh sách toàn bộ 200 Bot hiện tại
   */
  public async getAllBots(): Promise<BotEntity[]> {
    if (!this.isInitialized || this.activeBotsMap.size === 0) {
      return this.initialize();
    }
    return Array.from(this.activeBotsMap.values());
  }

  /**
   * Chuẩn bị bàn đấu cho Người Chơi và khởi chạy mô phỏng ngầm song song
   */
  public async prepareMatchRound(
    playerElo: number,
    betAmount: number
  ): Promise<{
    tableOpponents: BotEntity[];
    simulationPromise: Promise<{
      tableResults: SimulatedTableResult[];
      highlightNews: EcosystemNewsItem[];
      executionTimeMs: number;
    }>;
  }> {
    const allBots = await this.getAllBots();

    // 1. Ghép 3 Bot phù hợp nhất cho bàn người chơi
    const tableOpponents = matchBotsForPlayerTable(allBots, playerElo, betAmount);

    // Đánh dấu 3 bot này đang bận chơi với Người Chơi
    for (const b of tableOpponents) {
      const entity = this.activeBotsMap.get(b.id);
      if (entity) {
        entity.activityStatus = 'IN_MATCH';
      }
    }

    // 2. Ghép các bàn đấu ngầm cho phần còn lại của sới bạc
    const candidateBotsForSim = allBots.filter(
      b => !tableOpponents.some(op => op.id === b.id)
    );
    const { activeTables, participatingBots, restingBots } = matchSimulatedTables(candidateBotsForSim);

    // Đánh dấu các bot tham gia bàn ngầm
    for (const b of participatingBots) {
      const entity = this.activeBotsMap.get(b.id);
      if (entity) {
        entity.activityStatus = 'IN_MATCH';
      }
    }
    for (const b of restingBots) {
      const entity = this.activeBotsMap.get(b.id);
      if (entity) {
        entity.activityStatus = 'RESTING';
      }
    }

    // 3. Khởi chạy Web Worker mô phỏng ngầm ở chế độ Non-blocking
    const simulationPromise = runEcosystemSimulation(activeTables, allBots);

    return {
      tableOpponents,
      simulationPromise
    };
  }

  /**
   * Kết toán ván đấu của Người Chơi và các bàn mô phỏng ngầm
   */
  public async settleRound(
    humanSummary: HumanMatchSummary,
    simulationPromise: Promise<{
      tableResults: SimulatedTableResult[];
      highlightNews: EcosystemNewsItem[];
      executionTimeMs: number;
    }>
  ): Promise<{
    updatedBots: BotEntity[];
    newsItems: EcosystemNewsItem[];
  }> {
    const simOutput = await simulationPromise;
    const newEvents: EcosystemNewsItem[] = [...simOutput.highlightNews];

    // 1. Cập nhật kết quả cho 3 Bot chơi với Người Chơi
    for (const res of humanSummary.botResults) {
      const bot = this.activeBotsMap.get(res.botId);
      if (!bot) continue;

      bot.coins = Math.max(0, bot.coins + res.deltaCoins);
      bot.elo = Math.max(ECOSYSTEM_CONSTANTS.MIN_ELO, Math.min(ECOSYSTEM_CONSTANTS.MAX_ELO, bot.elo + res.deltaElo));
      bot.stats.gamesPlayed++;
      bot.stats.totalEarned += Math.max(0, res.deltaCoins);

      if (res.rank === 1) {
        bot.stats.wins++;
        bot.currentStreak = bot.currentStreak > 0 ? bot.currentStreak + 1 : 1;
        bot.highestStreak = Math.max(bot.highestStreak, bot.currentStreak);
      } else {
        bot.currentStreak = bot.currentStreak < 0 ? bot.currentStreak - 1 : -1;
      }

      if (res.chopsDone) bot.stats.chopsDone += res.chopsDone;
      if (res.congsGiven) bot.stats.congsGiven += res.congsGiven;

      // Cập nhật lịch sử đối đầu với Người Chơi
      bot.headToHeadVsHuman.games++;
      if (res.rank < humanSummary.humanRank) {
        bot.headToHeadVsHuman.botWins++;
      } else if (res.rank > humanSummary.humanRank) {
        bot.headToHeadVsHuman.humanWins++;
      }
      bot.headToHeadVsHuman.netCoinsEarnedFromHuman += res.deltaCoins;

      this.activeBotsMap.set(bot.id, bot);
    }

    // 2. Cập nhật các Bot tham gia các bàn đấu ngầm
    for (const tableRes of simOutput.tableResults) {
      for (const res of tableRes.botResults) {
        const bot = this.activeBotsMap.get(res.botId);
        if (!bot) continue;

        bot.coins = Math.max(0, bot.coins + res.deltaCoins);
        bot.elo = Math.max(ECOSYSTEM_CONSTANTS.MIN_ELO, Math.min(ECOSYSTEM_CONSTANTS.MAX_ELO, bot.elo + res.deltaElo));
        bot.stats.gamesPlayed++;
        bot.stats.totalEarned += Math.max(0, res.deltaCoins);

        if (res.rank === 1) {
          bot.stats.wins++;
          bot.currentStreak = bot.currentStreak > 0 ? bot.currentStreak + 1 : 1;
          bot.highestStreak = Math.max(bot.highestStreak, bot.currentStreak);

          // Sự kiện chuỗi thắng ấn tượng
          if (bot.currentStreak >= 4) {
            newEvents.push({
              id: `news_streak_${bot.id}_${Date.now()}`,
              timestamp: Date.now(),
              type: 'WIN_STREAK',
              message: `🔥 ${bot.name} đang bốc hỏa với chuỗi ${bot.currentStreak} ván THẮNG liên tiếp!`,
              botId: bot.id,
              botName: bot.name,
              avatar: bot.avatar,
              amount: null
            });
          }
        } else {
          bot.currentStreak = bot.currentStreak < 0 ? bot.currentStreak - 1 : -1;
        }

        if (res.chopsCount) bot.stats.chopsDone += res.chopsCount;
        if (res.congsGivenCount) bot.stats.congsGiven += res.congsGivenCount;

        this.activeBotsMap.set(bot.id, bot);
      }
    }

    // 3. Kiểm tra Vỡ Nợ / Phá Sản và Bù đắp Bot theo thứ tự Tier từ CAO xuống THẤP (Top-down Tier Replenishment)
    let bankruptCount = 0;
    const existingNames = new Set<string>(
      Array.from(this.activeBotsMap.values())
        .map(b => b.name)
        .filter((n): n is string => Boolean(n))
    );

    const deletedBotIds: string[] = [];
    for (const [botId, bot] of this.activeBotsMap.entries()) {
      if (bot.coins <= ECOSYSTEM_CONSTANTS.BANKRUPTCY_THRESHOLD) {
        bankruptCount++;
        deletedBotIds.push(botId);
        // Đào thải bot cũ
        bot.status = 'BANKRUPT';

        // Xóa bot vỡ nợ khỏi map để tính toán đúng bậc thiếu hụt
        this.activeBotsMap.delete(botId);

        // Duyệt từ Tier 9 xuống Tier 1 xem bậc nào đang bị thiếu hụt để sinh bot bù đắp
        const underfilledTier = findUnderfilledTier(Array.from(this.activeBotsMap.values()));
        const replacementBot = draftBotForTier(existingNames, underfilledTier);
        if (replacementBot.name) {
          existingNames.add(replacementBot.name);
        }

        // Ghi nhận sự kiện phá sản & nhân tố mới gia nhập sới bạc
        const tierName = getTierFromElo(replacementBot.elo).label;
        newEvents.push({
          id: `news_bankrupt_${bot.id}_${Date.now()}`,
          timestamp: Date.now(),
          type: 'BANKRUPTCY',
          message: `🚨 ${bot.name} đã cháy túi và chính thức VỠ NỢ! Tay chơi mới ${replacementBot.name} (${tierName}) vừa gia nhập sới bạc!`,
          botId: bot.id,
          botName: bot.name,
          avatar: bot.avatar,
          amount: null
        });

        // Thay thế vị trí trong pool
        this.activeBotsMap.set(replacementBot.id, replacementBot);
      }
    }

    // Đặt lại trạng thái activityStatus về IDLE
    for (const bot of this.activeBotsMap.values()) {
      bot.activityStatus = 'IDLE';
    }

    // 4. Xóa vĩnh viễn bot vỡ nợ khỏi IndexedDB và lưu đồng bộ batch mới
    if (deletedBotIds.length > 0) {
      await dbDeleteBotsBatch(deletedBotIds);
    }
    await dbSaveBotsBatch(Array.from(this.activeBotsMap.values()));

    // 5. Lưu tin tức mới vào DB
    if (newEvents.length > 0) {
      await dbAddNewsBatch(newEvents);
    }

    return {
      updatedBots: Array.from(this.activeBotsMap.values()),
      newsItems: newEvents
    };
  }

  /**
   * Reset toàn bộ hệ sinh thái về trạng thái khởi thủy
   */
  public async reset(): Promise<BotEntity[]> {
    await dbResetEcosystem();
    this.isInitialized = false;
    this.activeBotsMap.clear();
    return this.initialize();
  }

  public async resetEcosystem(): Promise<BotEntity[]> {
    return this.reset();
  }
}

export const ecosystemManager = EcosystemManager.getInstance();
