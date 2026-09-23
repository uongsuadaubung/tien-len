import { z } from 'zod';
import { Card, Combination, CombinationType, Rank } from '../engine/types';
import { OpponentBehaviorProfile } from './opponent-profiler';

export const BotConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  description: z.string(),
  elo: z.number(),                         // Điểm Elo ước tính (850 -> 2500)
  memoryDepth: z.number(),                 // 0.0 (không nhớ) -> 1.0 (nhớ 100% mọi lá đã ra)
  riskAppetite: z.number(),                // 0.0 (thận trọng giữ bài) -> 1.0 (hổ báo xả bài to)
  trapTendency: z.number(),                // 0.0 (đánh thẳng) -> 1.0 (thích ôm hàng rình bẫy heo)
  baitingTendency: z.number(),             // 0.0 -> 1.0 (xu hướng đánh mồi nhử Heo để Chặt Chồng)
  antiLeaderAggression: z.number(),        // 0.0 -> 1.0 (mức độ khẩn cấp chặn người sắp về nhất)
  tempoControl: z.number(),                // 0.0 -> 1.0 (quản lý nhịp độ & sẵn sàng mua quyền Cái)
  damageControl: z.number(),               // 0.0 -> 1.0 (cắt lỗ & xả Heo né thối khi bài xấu)
  turnsToWinLookahead: z.number(),         // 0.0 -> 1.0 (đếm nhịp dứt điểm & điều phối tốc độ công/thủ)
  dynamicHandSacrifice: z.number(),        // 0.0 -> 1.0 (năng lực bẻ bài/xé phỏm cứu Cóng & chặn đền bài 1 lá)
  bombInferenceRate: z.number(),           // 0.0 -> 1.0 (suy luận xác suất Hàng Chặt ẩn từ các lá chưa ra)
  semiCooperativeCooperation: z.number(),  // 0.0 -> 1.0 (nhường lượt phối hợp dìm người dẫn đầu bàn 4 người)
  positionalAwareness: z.number(),         // 0.0 -> 1.0 (ý thức vị thế ghế ngồi: đì nhà dưới bằng rác tầm trung & cắt mớm bài)
  inMatchAdaptationRate: z.number(),       // 0.0 -> 1.0 (tốc độ bắt bài & khắc chế thói quen đối thủ trong trận)
  mctsSimulations: z.number(),             // 0 -> 200 (số ván cờ tàn giả lập Monte Carlo)
  handPartitioningOptimality: z.number(),  // 0.0 (chia bài đơn giản) -> 1.0 (tối ưu hóa sảnh & hàng)
  simulationLookahead: z.number(),         // Độ sâu dự đoán nước đi tiếp theo (0 -> 4)
  useMinimaxEndgame: z.boolean(),          // Kích hoạt Minimax Alpha-Beta Solver cờ tàn (Tier 8 & 9)
  useBayesianInference: z.boolean(),       // Kích hoạt suy luận xác suất Bayes đoán bài đối thủ (Tier 7+)
  useDynamicRepartitioning: z.boolean()    // Kích hoạt tái cấu trúc bài động Branch & Bound (Tier 6+)
});

export type BotConfig = z.infer<typeof BotConfigSchema>;

export function isBotConfig(val: unknown): val is BotConfig {
  return BotConfigSchema.safeParse(val).success;
}

export interface MctsEvaluation {
  moveCards: Card[];
  combination: Combination;
  winRate: number; // 0.0 -> 1.0
  simulationsCount: number;
}


export interface HandPartition {
  combinations: Combination[];
  trashCards: Card[];                  // Các lá rác lẻ loi không thuộc bộ nào
  totalScore: number;
}

export interface OpponentBlindspot {
  passedTypes: Set<CombinationType>;
  passedStraightLengths: Set<number>;
  highestSeenRankPassed: Map<CombinationType, number>;
}

export interface TwoSafetyReport {
  isSafe: boolean;
  dangerousFourOfAKindRanks: Rank[];
  unseenTwosCount: number;
  unseenRedTwosCount: number;
  riskScore: number; // 0 (hoàn toàn an toàn) -> 100 (rất nguy hiểm)
}

export interface CardMemoryState {
  playedCards: Card[];
  remainingCardsCount: number;
  seenTwos: Card[];
  possibleDangerousRanks: Rank[];     // Các rank chưa xuất hiện lá nào (nguy cơ tứ quý)
  opponentPassedOnTypes: Record<string, CombinationType[]>; // Ghi nhớ đối thủ từng bỏ lượt ở loại bài nào
  opponentBlindspots: Record<string, string[]>;
  opponentProfiles: Record<string, OpponentBehaviorProfile>;
}

