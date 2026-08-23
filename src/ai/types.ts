import { Card, Combination, CombinationType, Rank } from '../engine/types';

export interface BotConfig {
  id: string;
  name?: string;
  avatar?: string;
  description: string;
  tier?: string;                       // 'Tier 1: Tập Sự' | 'Tier 2: Phong Trào' | 'Tier 3: Kinh Nghiệm' | 'Tier 4: Cao Thủ' | 'Tier 5: Thần Bài'
  elo?: number;                        // Điểm Elo ước tính (850 -> 2500)
  memoryDepth: number;                 // 0.0 (không nhớ) -> 1.0 (nhớ 100% mọi lá đã ra)
  riskAppetite: number;                // 0.0 (thận trọng giữ bài) -> 1.0 (hổ báo xả bài to)
  trapTendency: number;                // 0.0 (đánh thẳng) -> 1.0 (thích ôm hàng rình bẫy heo)
  baitingTendency?: number;            // 0.0 -> 1.0 (xu hướng đánh mồi nhử Heo)
  antiLeaderAggression?: number;       // 0.0 -> 1.0 (mức độ khẩn cấp chặn người sắp về nhất)
  tempoControl?: number;               // 0.0 -> 1.0 (quản lý nhịp độ & sẵn sàng mua quyền Cái)
  damageControl?: number;              // 0.0 -> 1.0 (cắt lỗ & xả Heo né thối khi bài xấu)
  mctsSimulations?: number;            // 0 -> 100 (số ván cờ tàn giả lập Monte Carlo)
  handPartitioningOptimality: number;  // 0.0 (chia bài đơn giản) -> 1.0 (tối ưu hóa sảnh & hàng)
  simulationLookahead: number;         // Độ sâu dự đoán nước đi tiếp theo (0 -> 4)
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
  unseenTwos: Card[];
  possibleDangerousRanks: Rank[];     // Các rank chưa xuất hiện lá nào (nguy cơ tứ quý)
  opponentPassedOnTypes: Record<string, CombinationType[]>; // Ghi nhớ đối thủ từng bỏ lượt ở loại bài nào
  opponentBlindspots?: Record<string, string[]>;
}

