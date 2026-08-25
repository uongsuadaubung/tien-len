# ĐẶC TẢ CẤU TRÚC DỮ LIỆU, INTERFACES & STATE STORES (DATA MODELS & APIS)

---

## 1. MÔ HÌNH DỮ LIỆU LÁ BÀI & TỔ HỢP (CORE CARD & COMBINATIONS)

Tọa lạc tại [`src/engine/types.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/engine/types.ts):

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

## 2. MÔ HÌNH TẬP LUẬT HỢP THÀNH (MODULAR GAME RULES)

Tọa lạc tại [`src/engine/types.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/engine/types.ts):

```typescript
export type GameSettlementRule = 'TRADITIONAL_RANK_BASED' | 'CARD_COUNT' | 'WINNER_TAKES_ALL';

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
  playerCount: 2 | 3 | 4;            // Số người chơi (2: Solo 1v1, 3, 4: Bàn tròn)
  betAmount: number;                 // Mức cược cơ bản (0 Xu với Ranked)
  botThinkDelayMs: number;           // Độ trễ suy nghĩ của AI
  soundEnabled: boolean;
}

export interface GameRules {
  settlementRule: GameSettlementRule; // Luật kết thúc ván & tính điểm
  chopping: ChoppingRules;            // Luật Chặt Heo & Chặt Hàng
  cong: CongRules;                    // Luật Cóng (Cháy bài)
  instantWin: InstantWinRules;        // Luật Tới Trắng
  gameFlow: GameFlowRules;            // Luật Vòng chơi & Quyền đi đầu
  table: TableRules;                  // Cấu hình Bàn chơi
}
```

---

## 3. MÔ HÌNH TRÍ TUỆ NHÂN TẠO RULE-FIRST (AI BOT & RULE STRATEGY TYPES)

Tọa lạc tại [`src/ai/rule-strategies.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/ai/rule-strategies.ts) & [`src/ai/decision-maker.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/ai/decision-maker.ts):

```typescript
export interface RuleLeadPolicy {
  preferLongestComboFirst: boolean;  // Xả sảnh dài/bộ nhiều lá trước (Đếm lá)
  dumpSmallTrashFirst: boolean;       // Tẩu rác nhỏ trước (Truyền thống)
  aggressiveFinisherPush: boolean;    // Đánh bạo lực tranh Nhất (Nhất ăn tất / 1v1)
}

export interface RuleEmergencyAction {
  type: 'PLAY' | 'PASS';
  cards?: Card[];
  combination?: Combination;
  reason: string;
}

export interface RuleStrategyEvaluator {
  readonly ruleName: string;
  evaluateEmergency?(context: RuleDecisionContext, validMoves: ValidMoveInfo[]): RuleEmergencyAction | null;
  contributeLeadPolicy?(currentPolicy: Partial<RuleLeadPolicy>): Partial<RuleLeadPolicy>;
  getRespondingScoreModifier?(
    move: ValidMoveInfo,
    handSize: number,
    targetMove: PlayedMove | null,
    context: RuleDecisionContext
  ): number;
  getChoppingRiskFactor?(): number;
  getTrapScoreModifier?(): number;
}

export interface DecisionContext {
  hand: Card[];
  currentRoundLeadingMove: PlayedMove | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
  tracker: CardTracker;
  config: BotConfig;
  remainingPlayerCards: Record<string, number>;
  nextPlayerId: string;
  rules?: GameRules;                 // Toàn bộ tập luật active chi phối ván đấu
  hasPlayedFirstCard?: boolean;      // Trạng thái đã ra bài hay chưa (kiểm tra Cóng)
  isNextPlayerOneCard?: boolean;
  prohibitEndingWithTwo?: boolean;
  gameMode?: string;
  mctsMap?: Map<string, number>;
  compositeRuleStrategy?: CompositeRuleStrategy;
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

Tọa lạc tại [`src/engine/events/game-event-bus.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/engine/events/game-event-bus.ts):

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

### 5.1. `useGameStore` ([`src/stores/useGameStore.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/stores/useGameStore.ts))
- `gameEngine: GameEngine | null`: Đối tượng điều khiển trận đấu.
- `gameState: GameState | null`: Trạng thái ván đấu đồng bộ cho UI React.
- `selectedCards: Card[]`: Danh sách bài người chơi đang nhấc lên chuẩn bị đánh.
- `isDealing: boolean`: Đang trong hoạt ảnh chia bài.
- `showXRay: boolean`: Trạng thái bật/tắt Soi bài đối thủ.

### 5.2. `useUserStore` ([`src/stores/useUserStore.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/stores/useUserStore.ts))
- `profile: PlayerProfile`: Thông tin cá nhân, level, EXP, danh hiệu.
- `coins: number`: Số dư Xu hiện tại.
- `undergroundDebt: number`: Số nợ chợ đen cần trả.
- `quests: Quest[]`: Danh sách 4 nhiệm vụ ngày.
- `achievements: Achievement[]`: Danh sách thành tựu trọn đời.
