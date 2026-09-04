# ĐẶC TẢ CẤU TRÚC DỮ LIỆU, INTERFACES & STATE STORES (DATA MODELS & APIS)

---

## 1. MÔ HÌNH DỮ LIỆU LÁ BÀI & TỔ HỢP (CORE CARD & COMBINATIONS)

Tọa lạc tại [`src/engine/types.ts`](../src/engine/types.ts):

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

## 2. MÔ HÌNH TẬP LUẬT HỢP THÀNH (MODULAR GAME RULES & STRICT TYPES)

Tọa lạc tại [`src/engine/types.ts`](../src/engine/types.ts):

```typescript
export type GameSettlementRule = 'TRADITIONAL_RANK_BASED' | 'CARD_COUNT' | 'WINNER_TAKES_ALL';

export type PlayerCount = 2 | 3 | 4;

export type BotPersonaIdTuple = readonly [string, string, string];

export type CustomBotConfigTuple = readonly [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];

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
  threeSpadesEndingBonus: boolean;        // Luật thưởng Ăn 3 Bích về cuối cùng
}

export interface TableRules {
  playerCount: PlayerCount;          // Số người chơi (2: Solo 1v1, 3, 4: Bàn tròn)
  betAmount: number;                 // Mức cược cơ bản (0 Xu với Ranked)
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

## 3. GAME RULES BUILDER & STRATEGY BUILDERS

Tọa lạc tại [`src/engine/rules-builder.ts`](../src/engine/rules-builder.ts) & [`src/ai/rule-strategies.ts`](../src/ai/rule-strategies.ts):

### 3.1. `GameRulesBuilder`
Cung cấp Fluent API để xây dựng tập luật an toàn, không có trường undefined:

```typescript
const rules = new GameRulesBuilder()
  .setSettlementRule('CARD_COUNT')
  .configureChopping({ multiplier: 2, allowFourPairsCutAnytime: true })
  .configureCong({ enabled: true, penaltyCards: 26, multiplier: 2 })
  .configureGameFlow({ prohibitEndingWithTwo: true, threeSpadesEndingBonus: true })
  .configureTable({ playerCount: 4, betAmount: 1000, soundEnabled: true })
  .build();
```

### 3.2. Rule Strategy Builders (AI Layer)
- `ChoppingRuleStrategyBuilder`: Tạo chiến lược chặt Heo tùy biến hệ số rủi ro và điểm phục kích.
- `CongRuleStrategyBuilder`: Tạo chiến lược thoát Cóng khẩn cấp.
- `GameFlowRuleStrategyBuilder`: Tùy biến bảo toàn 3 Bích, cờ tàn Cấm 2 và chống đền bài.
- `TableScaleRuleStrategyBuilder`: Điều chỉnh nhịp độ trận đấu theo quy mô 2, 3 hoặc 4 người.

---

## 4. MÔ HÌNH TRÍ TUỆ NHÂN TẠO RULE-FIRST (AI BOT & RULE STRATEGY TYPES)

Tọa lạc tại [`src/ai/rule-strategies.ts`](../src/ai/rule-strategies.ts) & [`src/ai/decision-maker.ts`](../src/ai/decision-maker.ts):

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

export interface RuleDecisionContext {
  hasPlayedFirstCard: boolean;
  isNextPlayerOneCard: boolean;
  prohibitEndingWithTwo: boolean;
  rules: GameRules;
  handPartitioningOptimality: number;
  antiLeaderAggression: number;
  tempoControl: number;
  trapTendency: number;
  riskAppetite: number;
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
  rules: GameRules;
  hasPlayedFirstCard: boolean;
  isNextPlayerOneCard: boolean;
  prohibitEndingWithTwo: boolean;
  gameMode: string;
  mctsMap?: Map<string, number>;
  compositeRuleStrategy?: CompositeRuleStrategy;
  opponentProfiles?: Record<string, OpponentBehaviorProfile>;
}

export interface OpponentBehaviorProfile {
  readonly playerId: string;
  readonly gamesObserved: number;
  readonly totalCardsPlayed: number;
  readonly heoGreedRate: number;
  readonly trashLeadRate: number;
  readonly trapPatienceScore: number;
  readonly chopAggressionScore: number;
  readonly antiLeaderCarefulness: number;
  readonly passRateByType: Record<CombinationType, number>;
  readonly lastUpdatedTimestamp: number;
}

export interface ScaledMctsOptions {
  simulationsCount: number;
  maxCandidates: number;
  batchSize?: number;
}

export interface BotDecision {
  type: 'PLAY' | 'PASS';
  cards?: Card[];
  combination?: Combination;
  reason?: string;
}
```

---

## 5. HỆ THỐNG EVENT BUS (CENTRALIZED PUB/SUB)

Tọa lạc tại [`src/engine/events/game-event-bus.ts`](../src/engine/events/game-event-bus.ts):

```typescript
export interface MatchCompletedEvent {
  type: 'MATCH_COMPLETED';
  activeGameType: string;
  winnerPlayerId: string;
  isHumanWinner: boolean;
  winners: Player[];
  allPlayers: Player[];
  payouts: Record<string, number>;
  humanNetCoins: number;
  totalHumanCoins: number;
  betAmount: number;
}

export type GameEvent =
  | { type: 'CARD_PLAYED'; playerId: string; cards: Card[]; combination: Combination }
  | { type: 'TURN_PASSED'; playerId: string }
  | { type: 'CHOP_EXECUTED'; chopperId: string; victimId: string; bounty: number }
  | { type: 'INSTANT_WIN'; winnerId: string; winType: InstantWinType }
  | MatchCompletedEvent;
```

---

## 6. CÁC STATE STORES CHÍNH (ZUSTAND STORES)

### 6.1. `useGameStore` ([`src/stores/useGameStore.ts`](../src/stores/useGameStore.ts))
- `gameEngine: GameEngine | null`: Đối tượng điều khiển trận đấu.
- `gameState: GameState | null`: Trạng thái ván đấu đồng bộ cho UI React.
- `selectedCards: Card[]`: Danh sách bài người chơi đang nhấc lên chuẩn bị đánh.
- `isDealing: boolean`: Đang trong hoạt ảnh chia bài.
- `showXRay: boolean`: Trạng thái bật/tắt Soi bài đối thủ.

### 6.2. `useUserStore` ([`src/stores/useUserStore.ts`](../src/stores/useUserStore.ts))
- `profile: PlayerProfile`: Thông tin cá nhân, cấp bậc, Elo, avatar, danh hiệu.
- `coins: number`: Số dư Xu hiện tại.
- `loans: number`: Số tiền vay ngân hàng cứu trợ.
- `quests: Quest[]`: Danh sách nhiệm vụ ngày.
- `achievements: Achievement[]`: Danh sách thành tựu trọn đời.

### 6.3. `useEcosystemStore` ([`src/stores/useEcosystemStore.ts`](../src/stores/useEcosystemStore.ts))
- `bots: BotEntity[]`: Danh sách toàn bộ 200 Đối Thủ trong sới bạc.
- `newsItems: EcosystemNewsItem[]`: Bảng tin thời sự giang hồ (FIFO 100 tin mới nhất).
- `settleMatchEcosystem`: Điều phối cập nhật Elo/Xu của người chơi và các đối thủ sau mỗi trận đấu.

---

## 7. MÔ HÌNH THỰC THỂ ĐỐI THỦ & BẬC RANK PHÁI SINH (BOT ENTITY & DERIVED STATE)

Tọa lạc tại [`src/engine/ecosystem/ecosystem-types.ts`](../src/engine/ecosystem/ecosystem-types.ts):

```typescript
export interface BotEntity {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
  readonly bio: string;
  readonly title: string;
  readonly style: string;
  elo: number;                     // Nguồn chân lý duy nhất (Single Source of Truth)
  coins: number;                   // Số dư Xu hiện tại
  status: 'ACTIVE' | 'BANKRUPT';   // Trạng thái hoạt động
  activityStatus: 'IN_MATCH' | 'RESTING';
  stats: {
    matchesPlayed: number;
    wins: number;
    winStreak: number;
    lossStreak: number;
    chopsCount: number;
    congsCount: number;
    bankruptciesCount: number;
    peakElo: number;
    peakCoins: number;
  };
  dna: {
    mctsSimulations: number;
    memoryDepth: number;
    tempoControl: number;
    damageControl: number;
    antiLeaderAggression: number;
    baitingTendency: number;
  };
}

/**
 * Hàm thuần túy phái sinh Bậc Rank tức thời từ điểm Elo (Single Source of Truth)
 */
export function getTierFromElo(elo: number): {
  tierNum: number;
  name: string;
  rankBadge: string;
  colorClass: string;
  minBet: number;
};
```

---

## 8. CƠ SỞ DỮ LIỆU DEXIE INDEXEDDB SCHEMA (`TIEN_LEN_DEXIE_DB_V1`)

Tọa lạc tại [`src/engine/db/indexed-db.ts`](../src/engine/db/indexed-db.ts):

```typescript
export class TienLenDexieDB extends Dexie {
  bots!: Table<BotEntity, string>;
  newsfeed!: Table<EcosystemNewsItem, string>;
  player_profile!: Table<PlayerProfile, string>;
  game_settings!: Table<GameSettings, string>;
  active_session!: Table<ActiveMatchSession, string>;
  human_behavior!: Table<HumanBehaviorModel, string>;
  match_logs!: Table<MatchLogReport, string>;
}

// Cấu hình Index Schema:
db.version(1).stores({
  bots: 'id, elo, coins, status, dnaTier',
  newsfeed: 'id, timestamp, type',
  player_profile: 'key',
  game_settings: 'key',
  active_session: 'key',
  human_behavior: 'key',
  match_logs: 'matchId, startedAt, gameMode'
});
```

---

## 9. HẰNG SỐ KINH TẾ & TÍNH TIỀN CỌC AN TOÀN (ECONOMY CONSTANTS)

Tọa lạc tại [`src/engine/constants/economy.ts`](../src/engine/constants/economy.ts):

```typescript
export const ECONOMY_CONSTANTS = {
  DEFAULT_STARTING_COINS: 50_000,
  DEFAULT_STARTING_ELO: 1_000,
  DEFAULT_QUICK_BET: 1_000,
  F5_DISCONNECT_ELO_PENALTY: 30,
  DEPOSIT_CARD_MULTIPLIER: 26,
  BANKRUPTCY_RELIEF_THRESHOLD: 10_000,
  DAILY_RELIEF_AMOUNT: 20_000,
  MAX_DAILY_RELIEF_COUNT: 3,
  LUCKY_WHEEL_SPIN_COST: 10_000,
  LUCKY_WHEEL_JACKPOT: 100_000
} as const;

/**
 * Tính tiền cọc an toàn tối đa cho bàn đấu:
 * 26 * betAmount * choppingMultiplier
 */
export function calculateRequiredDeposit(betAmount: number, choppingMultiplier: number = 1): number;

/**
 * Tính toán biến động Elo sau một ván xếp hạng theo số lượng người chơi (2, 3 hoặc 4 người):
 */
export function calculateEloDelta(
  rankPosition: number,
  playerElo: number,
  opponentsAvgElo: number,
  totalPlayers?: number
): { delta: number; newElo: number };
```

---

## 10. HẰNG SỐ HỆ SINH THÁI 200 BOT (ECOSYSTEM CONSTANTS)

Tọa lạc tại [`src/engine/constants/ecosystem.ts`](../src/engine/constants/ecosystem.ts):

```typescript
export type AvailableBetAmount = 1000 | 2000 | 5000 | 10000 | 20000 | 50000 | 100000;

export const ECOSYSTEM_CONSTANTS = {
  MAX_BOT_COUNT: 200,
  BANKRUPTCY_THRESHOLD: 1000,
  MIN_BET_AMOUNT: 1000,
  AVAILABLE_BET_AMOUNTS: [1000, 2000, 5000, 10000, 20000, 50000, 100000],
  TIER_DISTRIBUTION: {
    1: 50, // Tier 1: Tập Sự (Rookie) - 25% (Elo 850 - 1050)
    2: 70, // Tier 2: Phong Trào (Challenger) - 35% (Elo 1100 - 1350)
    3: 50, // Tier 3: Kinh Nghiệm (Veteran) - 25% (Elo 1400 - 1650)
    4: 20, // Tier 4: Cao Thủ (Master) - 10% (Elo 1700 - 1950)
    5: 10  // Tier 5: Thần Bài (Mythic) - 5% (Elo 2000 - 2500)
  },
  TIER_INITIAL_BANKROLL: {
    1: { min: 5000, max: 15000 },
    2: { min: 10000, max: 25000 },
    3: { min: 40000, max: 100000 },
    4: { min: 150000, max: 400000 },
    5: { min: 800000, max: 2500000 }
  },
  JITTER_RATE: 0.15,
  BASE_ACTIVITY_PROBABILITY: 0.55,
  TILT_RISK_BOOST: 0.20,
  DB_NAME: 'TIEN_LEN_DEXIE_DB_V1',
  DB_VERSION: 1
} as const;
```

---

## 11. HỢP ĐỒNG ĐIỀU KHIỂN BÀN ĐẤU & STATE PATTERN (`IMatchDriver` & `MatchState`)

### 11.1. `IMatchDriver` ([`src/engine/match-driver.interface.ts`](../src/engine/match-driver.interface.ts))
Hợp đồng trừu tượng hóa điều khiển bàn đấu thống nhất cho cả `OfflineMatchDriver` và `HostEngineDriver`:

```typescript
export interface DriverActionResult {
  success: boolean;
  reason?: string;
  error?: string;
}

export interface IMatchDriver {
  readonly gameNumber: number;
  playCards(playerId: string, cards: Card[]): DriverActionResult;
  passTurn(playerId: string): DriverActionResult;
  cleanup(): void;
}
```

### 11.2. State Pattern: `MatchState` Discriminated Union ([`src/engine/state-machine/types.ts`](../src/engine/state-machine/types.ts))
Kiến trúc State Pattern chuẩn hóa toàn bộ vòng đời ván đấu (cho cả Offline và Online):

```typescript
export type MatchStatus =
  | 'WAITING'
  | 'DEALING'
  | 'PLAYING'
  | 'INSTANT_WIN'
  | 'ROUND_ENDED'
  | 'GAME_OVER';

export type MatchState =
  | WaitingMatchState
  | DealingMatchState
  | PlayingTurnMatchState
  | InstantWinMatchState
  | RoundEndedMatchState
  | GameOverMatchState;
```
- **`WaitingMatchState` (`status: 'WAITING'`)**: Trạng thái phòng chờ, chưa chia bài.
- **`DealingMatchState` (`status: 'DEALING'`)**: Đang chạy animation chia bài và banner mở màn. Cấm đánh bài / bỏ lượt.
- **`PlayingTurnMatchState` (`status: 'PLAYING'`)**: Trạng thái đánh lượt bài thông thường. Bảo đảm 100% `currentTurnPlayerId`, `leadPlayerId`, `isLeadMove`, `isFirstMoveOfGame` tồn tại hợp lệ.
- **`InstantWinMatchState` (`status: 'INSTANT_WIN'`)**: Tới trắng ngay sau khi chia bài.
- **`RoundEndedMatchState` (`status: 'ROUND_ENDED'`)**: Vòng chơi kết thúc khi tất cả người chơi khác đã bỏ lượt (`nextLeadPlayerId`, `roundWinnerId`).
- **`GameOverMatchState` (`status: 'GAME_OVER'`)**: Ván bài kết thúc hoàn toàn, có danh sách xếp hạng `winners`, bảng kết toán tiền `matchPayouts` và `eloDeltas`.

