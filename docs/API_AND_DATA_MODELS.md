# ĐẶC TẢ CẤU TRÚC DỮ LIỆU, INTERFACES & STATE STORES (DATA MODELS & APIS)

---

## 1. MÔ HÌNH DỮ LIỆU LÁ BÀI & TỔ HỢP (CORE CARD & COMBINATIONS)

Tọa lạc tại [`src/engine/types.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/engine/types.ts):

```typescript
export type Suit = 'SPADES' | 'CLUBS' | 'DIAMONDS' | 'HEARTS';

export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
// 11 = J, 12 = Q, 13 = K, 14 = A, 15 = 2 (Heo)

export interface Card {
  id: string;          // Ví dụ: "3_SPADES", "15_HEARTS"
  rank: Rank;          // Giá trị số từ 3 đến 15
  suit: Suit;          // Chất bài: SPADES, CLUBS, DIAMONDS, HEARTS
  weight: number;      // rank * 4 + suitWeight (Từ 12 đến 63)
  code: string;        // Ví dụ: "3S", "10D", "2H", "AC"
}

export type CombinationType =
  | 'SINGLE'                   // 1 lá rác
  | 'PAIR'                     // Đôi
  | 'TRIPLE'                   // Sám cô
  | 'STRAIGHT'                 // Sảnh (3..12 lá không chứa 2)
  | 'THREE_PAIRS_SEQUENTIAL'   // 3 đôi thông
  | 'FOUR_OF_A_KIND'           // Tứ quý
  | 'FOUR_PAIRS_SEQUENTIAL'    // 4 đôi thông
  | 'FIVE_PAIRS_SEQUENTIAL'    // 5 đôi thông (Tới trắng)
  | 'SIX_PAIRS'                // 6 đôi bất kỳ (Tới trắng)
  | 'DRAGON_STRAIGHT'          // Sảnh rồng 12-13 lá (Tới trắng)
  | 'SAME_COLOR_13'            // 13 lá đồng màu (Tới trắng)
  | 'FOUR_TWOS'                // Tứ quý 2 (Tới trắng)
  | 'FIRST_ROUND_FOUR_THREES'; // Tứ quý 3 ở ván đầu (Tới trắng)

export interface Combination {
  type: CombinationType;
  cards: Card[];
  highestCard: Card;
  length: number;
}
```

---

## 2. MÔ HÌNH VÁN ĐẤU & NGƯỜI CHƠI (GAME ENGINE TYPES)

```typescript
export type PlayerType = 'HUMAN' | 'BOT';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  type: PlayerType;
  hand: Card[];
  coins: number;
  rank?: number;               // 1 = Nhất, 2 = Nhì, 3 = Ba, 4 = Bét
  elo?: number;
  isReady?: boolean;
}

export interface PlayedMove {
  playerId: string;
  cards: Card[];
  combination: Combination;
  timestamp: number;
  isChoppingMove?: boolean;    // Có phải nước đi chặt heo/hàng không
  choppedTargetMove?: PlayedMove;
}

export interface GameOptions {
  mode: GameMode;
  betAmount: number;
  maxPlayers: number;          // 2 (Solo), 3, hoặc 4 người
  prohibitEndingWithTwo?: boolean; // Luật Cấm 2 Cuối Cùng
  freeCutFourPairs?: boolean;      // Luật 4 Đôi Thông Cắt Tự Do
  allowInstantWin?: boolean;       // Cho phép tới trắng tức thì
}
```

---

## 3. MÔ HÌNH TRÍ TUỆ NHÂN TẠO (AI BOT TYPES)

Tọa lạc tại [`src/ai/decision-maker.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ai/decision-maker.ts) & [`src/ai/bot-factory.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ai/bot-factory.ts):

```typescript
export interface BotConfig {
  id: string;
  name: string;
  avatar: string;
  elo: number;
  tier: 'ROOKIE' | 'CHALLENGER' | 'VETERAN' | 'MASTER' | 'MYTHIC';
  lookaheadDepth: number;      // Độ sâu dự đoán (0..4)
  optimalityRate: number;      // Tỉ lệ quyết định tối ưu (0.35..1.0)
  tempoControl: number;        // Khả năng kiểm soát nhịp độ bàn chơi
  riskTolerance: number;       // Mức độ chấp nhận rủi ro khi giữ Heo/Hàng
  trashDisposalPriority: number;// Ưu tiên tẩu rác nhỏ
}

export interface DecisionContext {
  hand: Card[];
  currentRoundLeadingMove: PlayedMove | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
  tracker: CardTracker;
  config: BotConfig;
  remainingPlayerCards: Record<string, number>;
  nextPlayerId: string;        // Bắt buộc: Định danh người kế tiếp để tối ưu chiến thuật
  isNextPlayerOneCard?: boolean;
  prohibitEndingWithTwo?: boolean;
}

export interface BotDecision {
  type: 'PLAY' | 'PASS';
  cards?: Card[];
  combination?: Combination;
  reason?: string;
}
```

---

## 4. HỆ THỐNG EVENT BUS (CENTRALIZED PUB/SUB)

Tọa lạc tại [`src/engine/event-bus.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/engine/event-bus.ts):

```typescript
export type GameEvent =
  | { type: 'CARD_PLAYED'; playerId: string; cards: Card[]; combination: Combination }
  | { type: 'TURN_PASSED'; playerId: string }
  | { type: 'CHOP_EXECUTED'; chopperId: string; victimId: string; bounty: number }
  | { type: 'INSTANT_WIN'; winnerId: string; winType: InstantWinType }
  | { type: 'MATCH_COMPLETED'; winnerPlayerId: string; isHumanWinner: boolean; payouts: Record<string, number> };
```

---

## 5. CÁC STATE STORES CHÍNH (ZUSTAND STORES)

### 5.1. `useGameStore` ([`src/stores/useGameStore.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/stores/useGameStore.ts))
- `gameEngine: GameEngine | null`: Đối tượng điều khiển trận đấu.
- `gameState: GameState | null`: Trạng thái ván đấu đồng bộ cho UI React.
- `selectedCards: Card[]`: Danh sách bài người chơi đang nhấc lên chuẩn bị đánh.
- `isDealing: boolean`: Đang trong hoạt ảnh chia bài.
- `showXRay: boolean`: Trạng thái bật/tắt Soi bài đối thủ.

### 5.2. `useUserStore` ([`src/stores/useUserStore.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/stores/useUserStore.ts))
- `profile: UserProfile`: Thông tin cá nhân, level, EXP, danh hiệu.
- `coins: number`: Số dư Xu hiện tại.
- `undergroundDebt: number`: Số nợ chợ đen cần trả.
- `quests: Quest[]`: Danh sách 4 nhiệm vụ ngày.
- `achievements: Achievement[]`: Danh sách thành tựu trọn đời.
