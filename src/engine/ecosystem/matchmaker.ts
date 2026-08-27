import { ECOSYSTEM_CONSTANTS } from '../constants/ecosystem';
import { BotEntity, TableGroup, getTierFromElo } from './ecosystem-types';

/**
 * ============================================================================
 * MATCHMAKER CHO HỆ SINH THÁI 200 BOT
 * 1. Ghép 3 Bot phù hợp nhất cho Bàn Người Chơi
 * 2. Lọc xác suất tham gia tự nhiên (40% - 70%) & Gom bàn ngầm theo túi tiền + rủi ro Tilt
 * ============================================================================
 */

/**
 * Chọn 3 Bot đối thủ cho bàn đấu của Người Chơi
 */
export function matchBotsForPlayerTable(
  allBots: BotEntity[],
  playerElo: number,
  betAmount: number,
  count: number = 3
): BotEntity[] {
  // Lọc các bot đang ACTIVE và có đủ tiền tối thiểu cho mức cược này (ít nhất gấp 1.5 lần cược)
  const minRequiredCoins = Math.max(ECOSYSTEM_CONSTANTS.BANKRUPTCY_THRESHOLD, Math.round(betAmount * 1.5));
  let candidates = allBots.filter(b => b.status === 'ACTIVE' && b.coins >= minRequiredCoins);

  if (candidates.length < count) {
    // Nếu không đủ bot đủ tiền, lấy bất kỳ bot active nào
    candidates = allBots.filter(b => b.status === 'ACTIVE');
  }

  // Sắp xếp theo độ lệch Elo gần với Người Chơi nhất
  candidates.sort((a, b) => Math.abs(a.elo - playerElo) - Math.abs(b.elo - playerElo));

  // Lấy top 10 ứng viên gần nhất và shuffle nhẹ để tạo tính đa dạng không bị lặp đi lặp lại
  const pool = candidates.slice(0, Math.max(count * 3, 10));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
}

/**
 * Lựa chọn mức cược mục tiêu cho Bot dựa trên số vốn, khẩu vị rủi ro và hiệu ứng Cay Cú (Tilt)
 */
export function selectBetForBot(bot: BotEntity): number {
  let effectiveRisk = bot.riskAppetite;

  // Hiệu ứng Tilt: Chuỗi thua khiến bot cay cú muốn gỡ nhanh
  if (bot.currentStreak <= -2) {
    effectiveRisk = Math.min(1.0, effectiveRisk + ECOSYSTEM_CONSTANTS.TILT_RISK_BOOST);
  }

  // Xác định hệ số vốn an toàn tối thiểu:
  // Bot thận trọng: cần vốn >= 8x cược
  // Bot liều / Tilt: chỉ cần vốn >= 2.5x cược
  const safetyMultiplier = 8 - effectiveRisk * 5.5; // [2.5 -> 8.0]

  const eligibleBets = ECOSYSTEM_CONSTANTS.AVAILABLE_BET_AMOUNTS.filter(
    bet => bot.coins >= bet * safetyMultiplier
  );

  if (eligibleBets.length === 0) {
    return ECOSYSTEM_CONSTANTS.MIN_BET_AMOUNT;
  }

  // Phân phối xác suất chọn mức cược trong danh sách eligible:
  // risk cao -> thiên về các mức cược lớn cuối danh sách
  // risk thấp -> thiên về các mức cược nhỏ đầu danh sách
  if (effectiveRisk >= 0.75 && eligibleBets.length >= 2) {
    // Máu liều: Chọn mức cược lớn nhất hoặc nhì khả dụng
    return eligibleBets[eligibleBets.length - 1];
  } else if (effectiveRisk <= 0.4) {
    // Thận trọng: Chọn mức cược nhỏ nhất khả dụng
    return eligibleBets[0];
  } else {
    // Trung bình: Chọn mức cược ở khoảng giữa
    const midIndex = Math.floor(eligibleBets.length / 2);
    return eligibleBets[midIndex];
  }
}

/**
 * Phân chia các Bot rảnh rỗi còn lại thành các bàn đấu giả lập (TableGroup)
 */
export function matchSimulatedTables(
  availableBots: BotEntity[]
): {
  activeTables: TableGroup[];
  participatingBots: BotEntity[];
  restingBots: BotEntity[];
} {
  const activeBots = availableBots.filter(b => b.status === 'ACTIVE' && b.coins >= ECOSYSTEM_CONSTANTS.BANKRUPTCY_THRESHOLD);
  const participatingBots: BotEntity[] = [];
  const restingBots: BotEntity[] = [];

  // 1. Tính xác suất tham gia tự nhiên cho từng bot
  for (const bot of activeBots) {
    let prob = ECOSYSTEM_CONSTANTS.BASE_ACTIVITY_PROBABILITY;
    prob += (bot.riskAppetite - 0.5) * 0.25;

    if (bot.currentStreak >= 2) prob += 0.1; // Thắng hăng máu chơi tiếp
    if (bot.currentStreak <= -2) {
      // Đang thua: bot cẩn thận sẽ nghỉ, bot máu liều sẽ vào gỡ
      prob += (bot.riskAppetite >= 0.6 ? 0.15 : -0.2);
    }

    const clampedProb = Math.max(0.3, Math.min(0.85, prob));
    if (Math.random() < clampedProb) {
      participatingBots.push(bot);
    } else {
      restingBots.push(bot);
    }
  }

  // 2. Nhóm bot tham gia theo mức cược mục tiêu đã chọn
  const betGroups = new Map<number, BotEntity[]>();
  for (const bot of participatingBots) {
    const bet = selectBetForBot(bot);
    if (!betGroups.has(bet)) {
      betGroups.set(bet, []);
    }
    betGroups.get(bet)!.push(bot);
  }

  const activeTables: TableGroup[] = [];
  let tableCounter = 1;

  // 3. Gom thành các bàn 4 người trong từng nhóm mức cược (xếp theo Elo gần nhau)
  const leftoverBots: BotEntity[] = [];

  for (const [betAmount, botsInGroup] of betGroups.entries()) {
    // Sắp xếp theo Elo giảm dần
    botsInGroup.sort((a, b) => b.elo - a.elo);

    while (botsInGroup.length >= 4) {
      const quad = botsInGroup.splice(0, 4);
      const avgTier = Math.round(quad.reduce((acc, b) => acc + getTierFromElo(b.elo).tierNum, 0) / 4);

      activeTables.push({
        tableId: `sim_table_${betAmount}_${tableCounter++}`,
        betAmount,
        botIds: [quad[0].id, quad[1].id, quad[2].id, quad[3].id],
        tierNum: avgTier
      });
    }

    // Các bot còn dư (1-3 con)
    leftoverBots.push(...botsInGroup);
  }

  // 4. Xử lý các bot dư: thử ghép ở mức cược tối thiểu nếu đủ 4 con
  if (leftoverBots.length >= 4) {
    leftoverBots.sort((a, b) => b.elo - a.elo);
    while (leftoverBots.length >= 4) {
      const quad = leftoverBots.splice(0, 4);
      activeTables.push({
        tableId: `sim_table_min_${tableCounter++}`,
        betAmount: ECOSYSTEM_CONSTANTS.MIN_BET_AMOUNT,
        botIds: [quad[0].id, quad[1].id, quad[2].id, quad[3].id],
        tierNum: 1
      });
    }
  }

  // Các bot còn lại không đủ bàn thì cho nghỉ ngơi
  restingBots.push(...leftoverBots);

  return {
    activeTables,
    participatingBots,
    restingBots
  };
}
