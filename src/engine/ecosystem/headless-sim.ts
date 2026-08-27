import { GameEngine } from '../game';
import { Player } from '../types';
import { createBotPlayer } from '../player-factory';
import { CardTracker } from '../../ai/card-tracker';
import { BotEntity, TableGroup, SimulatedTableResult, BotMatchResult, EcosystemNewsItem } from './ecosystem-types';

/**
 * ============================================================================
 * HEADLESS FAST MATCH SIMULATOR (0ms DELAY)
 * Giả lập 1 ván đấu 4 Bot thuần túy thuật toán không có delay/animation
 * Tốc độ xử lý: ~1 đến 2 mili-giây / 1 ván
 * ============================================================================
 */

export function simulateSingleTableMatch(
  table: TableGroup,
  botsMap: Map<string, BotEntity>
): SimulatedTableResult {
  const tableBots: BotEntity[] = [];
  for (const id of table.botIds) {
    const b = botsMap.get(id);
    if (b) {
      tableBots.push(b);
    }
  }
  if (tableBots.length < 4) {
    return {
      tableId: table.tableId,
      betAmount: table.betAmount,
      botResults: [],
      highlightNews: []
    };
  }

  // 1. Khởi tạo danh sách 4 người chơi ảo
  const players: Player[] = tableBots.map((bot, index) =>
    createBotPlayer(bot.id, bot.id, {
      name: bot.name || `Bot ${index + 1}`,
      avatar: bot.avatar || '🤖',
      score: 0
    })
  );

  // 2. Khởi tạo GameEngine với mức cược của bàn
  const engine = new GameEngine(players, {
    mode: 'TRADITIONAL',
    betAmount: table.betAmount,
    playerCount: 4,
    prohibitEndingWithTwo: true,
    threeSpadesEndingBonus: true,
    cascadeChopEnabled: true,
    instantWinEnabled: true
  });

  // Bắt đầu chia bài và xác định người đi đầu
  engine.startNewGame();

  const trackersMap = new Map<string, CardTracker>();
  for (const bot of tableBots) {
    const p = engine.getPlayer(bot.id);
    trackersMap.set(bot.id, new CardTracker(p?.hand || [], bot.memoryDepth));
  }

  // 3. Vòng lặp giải quyết ván đấu đồng bộ 100% CPU (0ms delay)
  let turnsCount = 0;
  const maxTurns = 200; // Circuit breaker chống treo vòng lặp

  while (!engine.isGameOver && turnsCount < maxTurns) {
    turnsCount++;
    const currentTurnId = engine.currentRound.currentTurnPlayerId;
    if (!currentTurnId) break;

    const bot = botsMap.get(currentTurnId);
    if (!bot) break;

    let tracker = trackersMap.get(currentTurnId);
    if (!tracker) {
      tracker = new CardTracker([], bot.memoryDepth);
      trackersMap.set(currentTurnId, tracker);
    }

    const fastBotConfig: BotEntity = {
      ...bot,
      mctsSimulations: 0,
      useMinimaxEndgame: false,
      useBayesianInference: false,
      useNashEquilibrium: false
    };
    const result = engine.executeBotTurn(fastBotConfig, tracker);
    if (result.isGameOver || engine.isGameOver) {
      break;
    }
  }

  // 4. Kết toán ván đấu
  if (!engine.isGameOver) {
    engine.settleEndGame();
  }

  const highlightNews: EcosystemNewsItem[] = [];
  const botResults: BotMatchResult[] = [];

  // Xác định thứ hạng 1, 2, 3, 4
  const rankOrder = engine.winners;
  // Bổ sung những người chưa hết bài vào cuối danh sách nếu có
  for (const p of engine.players) {
    if (!rankOrder.some(w => w.id === p.id)) {
      rankOrder.push(p);
    }
  }

  // Tính Elo & Điểm thưởng/phạt
  for (let i = 0; i < rankOrder.length; i++) {
    const p = rankOrder[i];
    const bot = botsMap.get(p.id);
    const rank = i + 1;

    // Delta Elo theo thứ hạng 4 người chuẩn Esports:
    // Nhất: +24 -> +32
    // Nhì: +8 -> +12
    // Ba: -8 -> -12
    // Bét: -24 -> -32
    let deltaElo = 0;
    if (rank === 1) deltaElo = Math.floor(Math.random() * 9) + 24;
    else if (rank === 2) deltaElo = Math.floor(Math.random() * 5) + 8;
    else if (rank === 3) deltaElo = -(Math.floor(Math.random() * 5) + 8);
    else deltaElo = -(Math.floor(Math.random() * 9) + 24);

    const deltaCoins = p.score;
    const hadCong = p.hand.length === 13 && rank === 4;
    const hadThoi = p.hand.some(c => c.rank === 15);

    botResults.push({
      botId: p.id,
      rank,
      deltaCoins,
      deltaElo,
      hadCong,
      hadThoi,
      chopsCount: 0,
      congsGivenCount: 0
    });

    // Tạo tin tức điểm nhấn nổi bật (Newsfeed Highlights)
    if (bot) {
      if (hadCong) {
        highlightNews.push({
          id: `news_cong_${bot.id}_${Date.now()}`,
          timestamp: Date.now(),
          type: 'BANKRUPTCY',
          message: `😱 ${bot.name} bị CÓNG (cháy bài) ở bàn ${table.betAmount.toLocaleString()} xu, mất ${Math.abs(deltaCoins).toLocaleString()} xu!`,
          botId: bot.id,
          botName: bot.name,
          avatar: bot.avatar,
          amount: Math.abs(deltaCoins)
        });
      } else if (rank === 1 && deltaCoins >= 20000) {
        highlightNews.push({
          id: `news_win_${bot.id}_${Date.now()}`,
          timestamp: Date.now(),
          type: 'BIG_WIN',
          message: `💰 ${bot.name} thắng giòn giã ở bàn ${table.betAmount.toLocaleString()} xu, ẵm trọn +${deltaCoins.toLocaleString()} xu!`,
          botId: bot.id,
          botName: bot.name,
          avatar: bot.avatar,
          amount: deltaCoins
        });
      }
    }
  }

  return {
    tableId: table.tableId,
    betAmount: table.betAmount,
    botResults,
    highlightNews
  };
}

/**
 * Giả lập toàn bộ danh sách các bàn đấu trong vòng mô phỏng
 */
export function simulateAllTablesBatch(
  tables: TableGroup[],
  botsMap: Map<string, BotEntity>
): {
  tableResults: SimulatedTableResult[];
  allNews: EcosystemNewsItem[];
} {
  const tableResults: SimulatedTableResult[] = [];
  const allNews: EcosystemNewsItem[] = [];

  for (const table of tables) {
    const result = simulateSingleTableMatch(table, botsMap);
    tableResults.push(result);
    if (result.highlightNews && result.highlightNews.length > 0) {
      allNews.push(...result.highlightNews);
    }
  }

  return {
    tableResults,
    allNews
  };
}
