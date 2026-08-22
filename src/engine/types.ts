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

export type GameMode = 'TRADITIONAL' | 'COUNT_CARDS'; // Truyền thống Nhất-Nhì-Ba-Bét vs Đếm lá

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
