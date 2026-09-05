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

import type {
  GameMode,
  GameSettlementRule,
  PlayerCount,
  ChoppingRules,
  CongRules,
  InstantWinRules,
  GameFlowRules,
  TableRules,
  GameRules,
  GameSettings
} from './schemas/settings.schema';

export type { GameSettlementRule };
import { GameRulesSchema, StrictGameRulesSchema } from './schemas/settings.schema';

export type {
  GameMode,
  PlayerCount,
  ChoppingRules,
  CongRules,
  InstantWinRules,
  GameFlowRules,
  TableRules,
  GameRules,
  GameSettings
};

export function normalizePlayerCount(count: number | null = 4): PlayerCount {
  if (count === 2 || count === 3 || count === 4) return count;
  return 4;
}

export type BotPersonaIdTuple = [string, string, string];
export type CustomBotConfigTuple<T = Record<string, unknown>> = [Partial<T>, Partial<T>, Partial<T>];

export function updateTupleAt<T>(tuple: [T, T, T], index: number, value: T): [T, T, T] {
  return [
    index === 0 ? value : tuple[0],
    index === 1 ? value : tuple[1],
    index === 2 ? value : tuple[2]
  ];
}

/**
 * Type Guard xác định một đối tượng có phải là GameRules chuẩn không
 */
export function isGameRules(obj: unknown): obj is GameRules {
  return StrictGameRulesSchema.safeParse(obj).success;
}

export interface BasePlayer {
  id: string;
  name: string;
  avatar: string;
  hand: Card[];
  playedCards: Card[];
  score: number;
  isPassedCurrentRound: boolean;
  hasPlayedFirstCard: boolean; // Dùng để kiểm tra Cóng (cháy bài)
  rankPosition: number | null; // 1 (Nhất), 2 (Nhì), 3 (Ba), 4 (Bét)
  instantWinType: InstantWinType | null;
}

export interface HumanPlayer extends BasePlayer {
  isBot: false;
  botPersonaId?: undefined;
}

export interface BotPlayer extends BasePlayer {
  isBot: true;
  botPersonaId: string;
}

export type Player = HumanPlayer | BotPlayer;

export interface BasePlayedMove {
  playerId: string;
  combination: Combination;
  timestamp: number;
}

export interface StandardPlayedMove extends BasePlayedMove {
  isChop: false;
  choppedPlayerId?: undefined;
  penaltyAmount?: undefined;
  isCascadeChop?: undefined;
  chopChainCount?: undefined;
  chopChainTotalAmount?: undefined;
}

export interface ChopPlayedMove extends BasePlayedMove {
  isChop: true;
  choppedPlayerId: string;
  penaltyAmount: number;
  isCascadeChop: boolean;
  chopChainCount: number;
  chopChainTotalAmount: number;
}

export type PlayedMove = StandardPlayedMove | ChopPlayedMove;

export function createPlayedMove(
  playerId: string,
  combination: Combination,
  chopData?: {
    choppedPlayerId: string;
    penaltyAmount: number;
    isCascadeChop?: boolean;
    chopChainCount?: number;
    chopChainTotalAmount?: number;
  },
  timestamp: number = Date.now()
): PlayedMove {
  if (chopData) {
    return {
      playerId,
      combination,
      timestamp,
      isChop: true,
      choppedPlayerId: chopData.choppedPlayerId,
      penaltyAmount: chopData.penaltyAmount,
      isCascadeChop: chopData.isCascadeChop ?? false,
      chopChainCount: chopData.chopChainCount ?? 1,
      chopChainTotalAmount: chopData.chopChainTotalAmount ?? chopData.penaltyAmount
    };
  }
  return {
    playerId,
    combination,
    timestamp,
    isChop: false
  };
}

export interface Round {
  moves: PlayedMove[];
  leadPlayerId: string;
  currentTurnPlayerId: string;
  passedPlayerIds: string[];
  isFinished: boolean;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Hàm khởi tạo Tập Luật mặc định chuẩn mực cho Tiến Lên Miền Nam
 */
export function createDefaultGameRules(partial?: DeepPartial<GameRules>): GameRules {
  const defaults = GameRulesSchema.parse({});
  if (!partial) return defaults;
  return {
    settlementRule: partial.settlementRule || defaults.settlementRule,
    chopping: { ...defaults.chopping, ...(partial.chopping || {}) },
    cong: { ...defaults.cong, ...(partial.cong || {}) },
    instantWin: { ...defaults.instantWin, ...(partial.instantWin || {}) },
    gameFlow: { ...defaults.gameFlow, ...(partial.gameFlow || {}) },
    table: {
      ...defaults.table,
      ...(partial.table || {}),
      playerCount: normalizePlayerCount(partial.table?.playerCount)
    }
  };
}

/**
 * Lấy tên hiển thị tiếng Việt của luật kết toán / chế độ chơi
 */
export function getSettlementRuleLabel(rule?: GameSettlementRule | GameMode): string {
  switch (rule) {
    case 'WINNER_TAKES_ALL':
      return 'Nhất Ăn Tất';
    case 'TRADITIONAL':
      return 'Truyền Thống';
    case 'COUNT_CARDS':
    default:
      return 'Đếm Lá';
  }
}

/**
 * Chuyển đổi GameSettings sang GameRules
 */
export function convertSettingsToGameRules(settings?: Partial<GameSettings>): GameRules {
  const settlementRule: GameSettlementRule = (settings?.mode && settings.mode !== 'CUSTOM')
    ? settings.mode
    : 'COUNT_CARDS';

  return createDefaultGameRules({
    settlementRule,
    chopping: {
      allowFourPairsCutAnytime: settings?.allowFourPairsCutAnytime ?? true,
      allowThreePairsCutTwo: true,
      allowFourOfAKindCutPairsOfTwos: true,
      multiplier: 1,
      cascadeMultiplier: settings?.cascadeChopEnabled ?? true
    },
    instantWin: {
      enabled: settings?.instantWinEnabled ?? true,
      payoutMultiplier: 26
    },
    gameFlow: {
      firstGameRequireThreeOfSpades: true,
      winnerLeadsNextGame: true,
      prohibitEndingWithTwo: settings?.prohibitEndingWithTwo ?? true,
      threeSpadesEndingBonus: settings?.threeSpadesEndingBonus ?? true
    },
    table: {
      playerCount: normalizePlayerCount(settings?.playerCount),
      betAmount: settings?.betAmount ?? 1000,
      soundEnabled: settings?.soundEnabled ?? true
    }
  });
}

/**
 * ============================================================================
 * DOMAIN SUB-BUILDERS (CÁC BUILDER CHUYÊN BIỆT CHO TỪNG NHÓM LUẬT)
 * ============================================================================
 */

export class ChoppingRulesBuilder {
  private config: ChoppingRules;

  constructor(initial?: ChoppingRules) {
    this.config = initial ? { ...initial } : {
      allowFourPairsCutAnytime: true,
      allowThreePairsCutTwo: true,
      allowFourOfAKindCutPairsOfTwos: true,
      multiplier: 1,
      cascadeMultiplier: true
    };
  }

  public allowFourPairsCutAnytime(allow: boolean): this {
    this.config.allowFourPairsCutAnytime = allow;
    return this;
  }

  public allowThreePairsCutTwo(allow: boolean): this {
    this.config.allowThreePairsCutTwo = allow;
    return this;
  }

  public allowFourOfAKindCutPairsOfTwos(allow: boolean): this {
    this.config.allowFourOfAKindCutPairsOfTwos = allow;
    return this;
  }

  public multiplier(multiplier: number): this {
    this.config.multiplier = multiplier;
    return this;
  }

  public cascadeMultiplier(cascade: boolean): this {
    this.config.cascadeMultiplier = cascade;
    return this;
  }

  public build(): ChoppingRules {
    return { ...this.config };
  }
}

export class CongRulesBuilder {
  private config: CongRules;

  constructor(initial?: CongRules) {
    this.config = initial ? { ...initial } : {
      enabled: true,
      penaltyCards: 26,
      multiplier: 1
    };
  }

  public enabled(enabled: boolean): this {
    this.config.enabled = enabled;
    return this;
  }

  public penaltyCards(cards: number): this {
    this.config.penaltyCards = cards;
    return this;
  }

  public multiplier(multiplier: number): this {
    this.config.multiplier = multiplier;
    return this;
  }

  public build(): CongRules {
    return { ...this.config };
  }
}

export class InstantWinRulesBuilder {
  private config: InstantWinRules;

  constructor(initial?: InstantWinRules) {
    this.config = initial ? { ...initial } : {
      enabled: true,
      payoutMultiplier: 26
    };
  }

  public enabled(enabled: boolean): this {
    this.config.enabled = enabled;
    return this;
  }

  public payoutMultiplier(multiplier: number): this {
    this.config.payoutMultiplier = multiplier;
    return this;
  }

  public build(): InstantWinRules {
    return { ...this.config };
  }
}

export class GameFlowRulesBuilder {
  private config: GameFlowRules;

  constructor(initial?: GameFlowRules) {
    this.config = initial ? { ...initial } : {
      firstGameRequireThreeOfSpades: true,
      winnerLeadsNextGame: true,
      prohibitEndingWithTwo: true,
      threeSpadesEndingBonus: true
    };
  }

  public firstGameRequireThreeOfSpades(require: boolean): this {
    this.config.firstGameRequireThreeOfSpades = require;
    return this;
  }

  public winnerLeadsNextGame(winnerLeads: boolean): this {
    this.config.winnerLeadsNextGame = winnerLeads;
    return this;
  }

  public prohibitEndingWithTwo(prohibit: boolean): this {
    this.config.prohibitEndingWithTwo = prohibit;
    return this;
  }

  public threeSpadesEndingBonus(bonus: boolean): this {
    this.config.threeSpadesEndingBonus = bonus;
    return this;
  }

  public build(): GameFlowRules {
    return { ...this.config };
  }
}

export class TableRulesBuilder {
  private config: TableRules;

  constructor(initial?: TableRules) {
    this.config = initial ? { ...initial } : {
      playerCount: 4,
      betAmount: 1000,
      soundEnabled: true
    };
  }

  public playerCount(count: PlayerCount): this {
    this.config.playerCount = count;
    return this;
  }

  public betAmount(amount: number): this {
    this.config.betAmount = amount;
    return this;
  }

  public soundEnabled(enabled: boolean): this {
    this.config.soundEnabled = enabled;
    return this;
  }

  public build(): TableRules {
    return { ...this.config };
  }
}

/**
 * ============================================================================
 * COMPOSITE GAMERULES BUILDER (NESTED SCOPED BUILDER & PRESET FACTORY)
 * ============================================================================
 */
export class GameRulesBuilder {
  private rules: GameRules;

  constructor(baseRules?: GameRules) {
    this.rules = baseRules ? JSON.parse(JSON.stringify(baseRules)) : createDefaultGameRules();
  }

  // --- PRESET FACTORY METHODS ---

  public static traditional(): GameRulesBuilder {
    return new GameRulesBuilder(createDefaultGameRules({
      settlementRule: 'TRADITIONAL',
      table: { playerCount: 4, betAmount: 1000, soundEnabled: true }
    }));
  }

  public static countCards(): GameRulesBuilder {
    return new GameRulesBuilder(createDefaultGameRules({
      settlementRule: 'COUNT_CARDS',
      table: { playerCount: 4, betAmount: 1000, soundEnabled: true }
    }));
  }

  public static winnerTakesAll(): GameRulesBuilder {
    return new GameRulesBuilder(createDefaultGameRules({
      settlementRule: 'WINNER_TAKES_ALL',
      table: { playerCount: 4, betAmount: 1000, soundEnabled: true }
    }));
  }

  public static solo1v1(): GameRulesBuilder {
    return new GameRulesBuilder(createDefaultGameRules({
      settlementRule: 'COUNT_CARDS',
      table: { playerCount: 2, betAmount: 1000, soundEnabled: true }
    }));
  }

  public static fromPreset(preset: GameMode | 'SOLO_1V1'): GameRulesBuilder {
    switch (preset) {
      case 'COUNT_CARDS': return GameRulesBuilder.countCards();
      case 'WINNER_TAKES_ALL': return GameRulesBuilder.winnerTakesAll();
      case 'SOLO_1V1': return GameRulesBuilder.solo1v1();
      case 'TRADITIONAL':
      default: return GameRulesBuilder.traditional();
    }
  }

  // --- NESTED DOMAIN SUB-BUILDERS (SCOPED LAMBDA CONFIGURATION) ---

  public withSettlement(settlementRule: GameSettlementRule): this {
    this.rules.settlementRule = settlementRule;
    return this;
  }

  public withChopping(fn: (builder: ChoppingRulesBuilder) => ChoppingRulesBuilder | void): this {
    const sub = new ChoppingRulesBuilder(this.rules.chopping);
    const result = fn(sub);
    this.rules.chopping = (result || sub).build();
    return this;
  }

  public withCong(fn: (builder: CongRulesBuilder) => CongRulesBuilder | void): this {
    const sub = new CongRulesBuilder(this.rules.cong);
    const result = fn(sub);
    this.rules.cong = (result || sub).build();
    return this;
  }

  public withInstantWin(fn: (builder: InstantWinRulesBuilder) => InstantWinRulesBuilder | void): this {
    const sub = new InstantWinRulesBuilder(this.rules.instantWin);
    const result = fn(sub);
    this.rules.instantWin = (result || sub).build();
    return this;
  }

  public withGameFlow(fn: (builder: GameFlowRulesBuilder) => GameFlowRulesBuilder | void): this {
    const sub = new GameFlowRulesBuilder(this.rules.gameFlow);
    const result = fn(sub);
    this.rules.gameFlow = (result || sub).build();
    return this;
  }

  public withTable(fn: (builder: TableRulesBuilder) => TableRulesBuilder | void): this {
    const sub = new TableRulesBuilder(this.rules.table);
    const result = fn(sub);
    this.rules.table = (result || sub).build();
    return this;
  }

  public build(): GameRules {
    return JSON.parse(JSON.stringify(this.rules));
  }
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
