export type Suit = 'SPADES' | 'CLUBS' | 'DIAMONDS' | 'HEARTS';

export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15; // 11=J, 12=Q, 13=K, 14=A, 15=2

export interface Card {
  id: string;          // e.g. "3_SPADES", "15_HEARTS"
  rank: Rank;
  suit: Suit;
  weight: number;      // Calculated as rank * 4 + suitWeight for easy comparison
  code: string;        // e.g. "3S", "10D", "2H", "AC"
}

export type CombinationType =
  | 'SINGLE'                   // Lá rác (1 lá)
  | 'PAIR'                     // Đôi (2 lá cùng số)
  | 'TRIPLE'                   // Sám cô (3 lá cùng số)
  | 'STRAIGHT'                 // Sảnh (3 lá trở lên liên tiếp từ 3 tới A, không chứa 2)
  | 'THREE_PAIRS_SEQUENTIAL'   // 3 đôi thông
  | 'FOUR_OF_A_KIND'           // Tứ quý (4 lá cùng số)
  | 'FOUR_PAIRS_SEQUENTIAL'    // 4 đôi thông
  | 'FIVE_PAIRS_SEQUENTIAL'    // 5 đôi thông (Tới trắng)
  | 'SIX_PAIRS'                // 6 đôi bất kỳ (Tới trắng)
  | 'DRAGON_STRAIGHT'          // Sảnh rồng 12-13 lá (Tới trắng)
  | 'SAME_COLOR_13'            // 13 lá đồng màu đỏ hoặc đen (Tới trắng)
  | 'FOUR_TWOS'                // Tứ quý 2 (Tới trắng)
  | 'FIRST_ROUND_FOUR_THREES'; // Tứ quý 3 ở ván 1 (Tới trắng)

export interface Combination {
  type: CombinationType;
  cards: Card[];
  highestCard: Card;
  length: number;              // Số lượng lá bài trong tổ hợp
}

export type InstantWinType =
  | 'DRAGON_STRAIGHT'
  | 'FOUR_TWOS'
  | 'FIVE_PAIRS_SEQUENTIAL'
  | 'SIX_PAIRS'
  | 'SAME_COLOR_13'
  | 'FIRST_ROUND_FOUR_THREES';

export type GameSettlementRule = 'TRADITIONAL_RANK_BASED' | 'CARD_COUNT' | 'WINNER_TAKES_ALL';

export type GameMode = 'TRADITIONAL' | 'COUNT_CARDS' | 'WINNER_TAKES_ALL' | 'CUSTOM';

export interface ChoppingRules {
  allowFourPairsCutAnytime: boolean; // 4 đôi thông chặt tự do không cần vòng
  allowThreePairsCutTwo: boolean;    // 3 đôi thông chặt 1 Heo
  allowFourOfAKindCutPairsOfTwos: boolean; // Tứ quý chặt Đôi Heo
  multiplier: number;                // Hệ số nhân tiền phạt chặt (1x chuẩn, 2x sòng bạc ngầm)
}

export interface CongRules {
  enabled: boolean;                  // Có phạt Cóng khi người khác về nhất mà chưa đánh được lá nào
  penaltyCards: number;              // Số lá bài đền khi Cóng (chuẩn: 26 lá)
  multiplier: number;                // Hệ số nhân phạt Cóng (1x chuẩn, 2x sòng bạc ngầm)
}

export interface InstantWinRules {
  enabled: boolean;                  // Cho phép Tới Trắng
  payoutMultiplier: number;          // Số cược mỗi nhà đền khi Tới Trắng (chuẩn: 26x)
}

export interface GameFlowRules {
  firstGameRequireThreeOfSpades: boolean; // Ván đầu tiên bắt buộc đánh lá 3 Bích
  winnerLeadsNextGame: boolean;           // Người về Nhất ván trước được đi đầu ván sau
  prohibitEndingWithTwo: boolean;         // Cấm đánh 2 cuối cùng (Cấm về Heo, kèm luật thối Heo)
}

export interface TableRules {
  playerCount: 2 | 3 | 4;            // Số người chơi
  betAmount: number;                 // Mức cược cơ bản (0 Xu với Ranked)
  botThinkDelayMs: number;           // Độ trễ suy nghĩ của AI
  soundEnabled: boolean;
}

/**
 * TẬP LUẬT CHƠI HỢP THÀNH (MODULAR COMPOSABLE RULES)
 * Chứa toàn bộ các module quy tắc độc lập chi phối một ván bài
 */
export interface GameRules {
  settlementRule: GameSettlementRule; // Luật kết thúc ván & tính điểm
  chopping: ChoppingRules;            // Luật Chặt Heo & Chặt Hàng
  cong: CongRules;                    // Luật Cóng (Cháy bài)
  instantWin: InstantWinRules;        // Luật Tới Trắng
  gameFlow: GameFlowRules;            // Luật Vòng chơi & Quyền đi đầu
  table: TableRules;                  // Cấu hình Bàn chơi
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  botPersonaId?: string;
  hand: Card[];
  playedCards: Card[];
  score: number;
  isPassedCurrentRound: boolean;
  hasPlayedFirstCard: boolean; // Dùng để kiểm tra Cóng (cháy bài)
  rankPosition?: number;       // 1 (Nhất), 2 (Nhì), 3 (Ba), 4 (Bét)
  instantWinType?: InstantWinType;
}

export interface PlayedMove {
  playerId: string;
  combination: Combination;
  timestamp: number;
  isChop?: boolean;            // Có phải là một cú chặt heo/hàng không
  choppedPlayerId?: string;    // Người bị chặt
  penaltyAmount?: number;      // Tiền/điểm phạt của cú chặt
}

export interface Round {
  moves: PlayedMove[];
  leadPlayerId: string;
  currentTurnPlayerId: string;
  passedPlayerIds: string[];
  isFinished: boolean;
}

export interface GameSettings {
  mode: GameMode;
  betAmount: number;
  allowFourPairsCutAnytime: boolean; // 4 đôi thông chặt tự do không cần vòng (chuẩn = true)
  instantWinEnabled: boolean;
  soundEnabled: boolean;
  botThinkDelayMs: number;
  playerCount?: number;              // 2, 3 hoặc 4 người chơi
  prohibitEndingWithTwo?: boolean;   // Cấm đánh 2 cuối cùng (Cấm về Heo)
}

/**
 * Hàm khởi tạo Tập Luật mặc định chuẩn mực cho Tiến Lên Miền Nam
 */
export function createDefaultGameRules(partial?: Partial<GameRules>): GameRules {
  return {
    settlementRule: partial?.settlementRule || 'TRADITIONAL_RANK_BASED',
    chopping: {
      allowFourPairsCutAnytime: partial?.chopping?.allowFourPairsCutAnytime ?? true,
      allowThreePairsCutTwo: partial?.chopping?.allowThreePairsCutTwo ?? true,
      allowFourOfAKindCutPairsOfTwos: partial?.chopping?.allowFourOfAKindCutPairsOfTwos ?? true,
      multiplier: partial?.chopping?.multiplier ?? 1
    },
    cong: {
      enabled: partial?.cong?.enabled ?? true,
      penaltyCards: partial?.cong?.penaltyCards ?? 26,
      multiplier: partial?.cong?.multiplier ?? 1
    },
    instantWin: {
      enabled: partial?.instantWin?.enabled ?? true,
      payoutMultiplier: partial?.instantWin?.payoutMultiplier ?? 26
    },
    gameFlow: {
      firstGameRequireThreeOfSpades: partial?.gameFlow?.firstGameRequireThreeOfSpades ?? true,
      winnerLeadsNextGame: partial?.gameFlow?.winnerLeadsNextGame ?? true,
      prohibitEndingWithTwo: partial?.gameFlow?.prohibitEndingWithTwo ?? true
    },
    table: {
      playerCount: (partial?.table?.playerCount ?? 4) as 2 | 3 | 4,
      betAmount: partial?.table?.betAmount ?? 500,
      botThinkDelayMs: partial?.table?.botThinkDelayMs ?? 800,
      soundEnabled: partial?.table?.soundEnabled ?? true
    }
  };
}

/**
 * Chuyển đổi GameSettings cũ sang GameRules mới
 */
export function convertSettingsToGameRules(settings?: Partial<GameSettings>): GameRules {
  let settlementRule: GameSettlementRule = 'TRADITIONAL_RANK_BASED';
  if (settings?.mode === 'COUNT_CARDS') settlementRule = 'CARD_COUNT';
  else if (settings?.mode === 'WINNER_TAKES_ALL') settlementRule = 'WINNER_TAKES_ALL';

  return createDefaultGameRules({
    settlementRule,
    chopping: {
      allowFourPairsCutAnytime: settings?.allowFourPairsCutAnytime ?? true,
      allowThreePairsCutTwo: true,
      allowFourOfAKindCutPairsOfTwos: true,
      multiplier: 1
    },
    instantWin: {
      enabled: settings?.instantWinEnabled ?? true,
      payoutMultiplier: 26
    },
    gameFlow: {
      firstGameRequireThreeOfSpades: true,
      winnerLeadsNextGame: true,
      prohibitEndingWithTwo: settings?.prohibitEndingWithTwo ?? true
    },
    table: {
      playerCount: (settings?.playerCount ?? 4) as 2 | 3 | 4,
      betAmount: settings?.betAmount ?? 500,
      botThinkDelayMs: settings?.botThinkDelayMs ?? 800,
      soundEnabled: settings?.soundEnabled ?? true
    }
  });
}

export interface GameHistoryEntry {
  winnerId: string;
  players: {
    id: string;
    name: string;
    rankPosition: number;
    scoreChange: number;
    remainingCards: number;
  }[];
}
