import { ECOSYSTEM_CONSTANTS } from '../constants/ecosystem';
import { 
  dbGetAllBots, 
  dbSaveBotsBatch, 
  dbAddNewsBatch, 
  dbGetNewsfeed,
  dbResetEcosystem 
} from '../db/indexed-db';
import { 
  BotEntity, 
  TableGroup, 
  EcosystemNewsItem, 
  SimulatedTableResult,
  BotMatchResult 
} from './ecosystem-types';
import { 
  generateInitial200Bots, 
  draftRookieBot 
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
   * Khởi tạo hệ sinh thái từ IndexedDB (Tự động sinh 200 Bot nếu DB trống)
   */
  public async initialize(): Promise<BotEntity[]> {
    try {
      const storedBots = await dbGetAllBots();

      if (storedBots && storedBots.length >= ECOSYSTEM_CONSTANTS.MAX_BOT_COUNT) {
        this.activeBotsMap.clear();
        for (const b of storedBots) {
          this.activeBotsMap.set(b.id, b);
        }
        this.isInitialized = true;
        return Array.from(this.activeBotsMap.values());
      }

      // Chưa đủ 200 Bot -> Sinh mới 200 Bot theo chuẩn
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
        message: `🎉 Sới Bạc Quốc Tế chính thức khai trương với 200 cao thủ từ khắp nơi trên thế giới!`
      };
      await dbAddNewsBatch([welcomeNews]);

      this.isInitialized = true;
      return initialBots;
    } catch (e) {
      console.warn('Lỗi khi khởi tạo Ecosystem, fallback in-memory:', e);
      const initialBots = generateInitial200Bots();
      this.activeBotsMap.clear();
      for (const b of initialBots) {
        this.activeBotsMap.set(b.id, b);
      }
      this.isInitialized = true;
      return initialBots;
    }
  }

  /**
   * Lấy toàn bộ danh sách Bot hiện tại
   */
  public async getAllBots(): Promise<BotEntity[]> {
    if (!this.isInitialized || this.activeBotsMap.size === 0) {
      return this.initialize();
    }
    return Array.from(this.activeBotsMap.values());
  }

  /**
   * Chuẩn bị ván đấu: Chọn 3 bot cho người chơi và kích hoạt chạy Web Worker mô phỏng ngầm
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

    // 1. Chọn 3 bot cho Bàn Người Chơi
    const tableOpponents = matchBotsForPlayerTable(allBots, playerElo, betAmount, 3);
    const chosenIds = new Set(tableOpponents.map(b => b.id));

    // Đánh dấu trạng thái IN_MATCH cho 3 bot này
    for (const opp of tableOpponents) {
      opp.activityStatus = 'IN_MATCH';
      this.activeBotsMap.set(opp.id, opp);
    }

    // 2. Gom các bot còn lại cho các bàn giả lập
    const remainingBots = allBots.filter(b => !chosenIds.has(b.id));
    const { activeTables, participatingBots, restingBots } = matchSimulatedTables(remainingBots);

    for (const b of participatingBots) {
      b.activityStatus = 'IN_MATCH';
      this.activeBotsMap.set(b.id, b);
    }
    for (const b of restingBots) {
      b.activityStatus = 'RESTING';
      this.activeBotsMap.set(b.id, b);
    }

    // 3. Khởi chạy Web Worker mô phỏng ngầm song song (0% lag UI)
    const simulationPromise = runEcosystemSimulation(activeTables, Array.from(this.activeBotsMap.values()));

    return {
      tableOpponents,
      simulationPromise
    };
  }

  /**
   * Kết toán ván đấu của Người Chơi kết hợp với kết quả của Web Worker
   */
  public async settleRound(
    humanSummary: HumanMatchSummary,
    simulationPromise: Promise<{
      tableResults: SimulatedTableResult[];
      highlightNews: EcosystemNewsItem[];
      executionTimeMs: number;
    }>
  ): Promise<{
    allNews: EcosystemNewsItem[];
    bankruptCount: number;
  }> {
    const simOutput = await simulationPromise;
    const newEvents: EcosystemNewsItem[] = [...(simOutput.highlightNews || [])];

    // 1. Cập nhật 3 Bot ở Bàn Người Chơi
    for (const res of humanSummary.botResults) {
      const bot = this.activeBotsMap.get(res.botId);
      if (!bot) continue;

      bot.coins = Math.max(0, bot.coins + res.deltaCoins);
      bot.elo = Math.max(800, Math.min(2600, bot.elo + res.deltaElo));
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
        bot.elo = Math.max(800, Math.min(2600, bot.elo + res.deltaElo));
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

    // 3. Kiểm tra Vỡ Nợ / Phá Sản và Draft Tân Binh mới
    let bankruptCount = 0;
    const existingNames = new Set<string>(
      Array.from(this.activeBotsMap.values())
        .map(b => b.name)
        .filter((n): n is string => Boolean(n))
    );

    for (const [botId, bot] of this.activeBotsMap.entries()) {
      if (bot.coins <= ECOSYSTEM_CONSTANTS.BANKRUPTCY_THRESHOLD) {
        bankruptCount++;
        // Đào thải bot cũ
        bot.status = 'BANKRUPT';

        // Draft tân binh mới thế chỗ kế thừa trình độ AI của bot vừa vỡ nợ
        const rookie = draftRookieBot(existingNames, bot.tierNum);
        if (rookie.name) {
          existingNames.add(rookie.name);
        }

        // Ghi nhận sự kiện phá sản & tân binh gia nhập
        newEvents.push({
          id: `news_bankrupt_${bot.id}_${Date.now()}`,
          timestamp: Date.now(),
          type: 'BANKRUPTCY',
          message: `🚨 ${bot.name} đã cháy túi và chính thức VỠ NỢ! Tân binh ${rookie.name} vừa gia nhập sới bạc!`,
          botId: bot.id,
          botName: bot.name,
          avatar: bot.avatar,
          amount: null
        });

        // Thay thế vị trí trong pool
        this.activeBotsMap.delete(botId);
        this.activeBotsMap.set(rookie.id, rookie);
      }
    }

    // Đặt lại trạng thái activityStatus về IDLE
    for (const bot of this.activeBotsMap.values()) {
      bot.activityStatus = 'IDLE';
    }

    // 4. Lưu đồng bộ vào IndexedDB
    const updatedBotsList = Array.from(this.activeBotsMap.values());
    await dbSaveBotsBatch(updatedBotsList);

    if (newEvents.length > 0) {
      await dbAddNewsBatch(newEvents);
    }

    return {
      allNews: newEvents,
      bankruptCount
    };
  }

  /**
   * Reset toàn bộ dữ liệu hệ sinh thái sới bạc về mặc định
   */
  public async resetEcosystem(): Promise<BotEntity[]> {
    await dbResetEcosystem();
    this.isInitialized = false;
    this.activeBotsMap.clear();
    return this.initialize();
  }
}

export const ecosystemManager = EcosystemManager.getInstance();
