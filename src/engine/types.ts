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
  cascadeMultiplier: boolean;        // Chặt chồng tích lũy (Chuỗi chặt đè người sau đền toàn bộ cho người chót)
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
  threeSpadesEndingBonus: boolean;        // Về 3 Bích cuối cùng (từ ván 2+) được x2 tiền thưởng cả làng
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
  isCascadeChop?: boolean;     // Có phải là cú chặt đè trong chuỗi chặt chồng không
  chopChainCount?: number;     // Số lần chặt liên tiếp trong chuỗi (2, 3, 4...)
  chopChainTotalAmount?: number; // Tổng số tiền tích lũy của chuỗi chặt
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
  playerCount: 2 | 3 | 4;            // 2, 3 hoặc 4 người chơi
  prohibitEndingWithTwo: boolean;    // Cấm đánh 2 cuối cùng (Cấm về Heo)
  threeSpadesEndingBonus: boolean;   // Về 3 Bích cuối cùng x2 tiền thưởng cả làng
  cascadeChopEnabled: boolean;       // Chặt chồng tích lũy tiền phạt
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
      multiplier: partial?.chopping?.multiplier ?? 1,
      cascadeMultiplier: partial?.chopping?.cascadeMultiplier ?? true
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
      prohibitEndingWithTwo: partial?.gameFlow?.prohibitEndingWithTwo ?? true,
      threeSpadesEndingBonus: partial?.gameFlow?.threeSpadesEndingBonus ?? true
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
 * Chuyển đổi GameSettings sang GameRules
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
      playerCount: (settings?.playerCount ?? 4) as 2 | 3 | 4,
      betAmount: settings?.betAmount ?? 500,
      botThinkDelayMs: settings?.botThinkDelayMs ?? 800,
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
      betAmount: 500,
      botThinkDelayMs: 800,
      soundEnabled: true
    };
  }

  public playerCount(count: 2 | 3 | 4): this {
    this.config.playerCount = count;
    return this;
  }

  public betAmount(amount: number): this {
    this.config.betAmount = amount;
    return this;
  }

  public botThinkDelayMs(delayMs: number): this {
    this.config.botThinkDelayMs = delayMs;
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
      settlementRule: 'TRADITIONAL_RANK_BASED',
      table: { playerCount: 4, betAmount: 500, botThinkDelayMs: 850, soundEnabled: true }
    }));
  }

  public static countCards(): GameRulesBuilder {
    return new GameRulesBuilder(createDefaultGameRules({
      settlementRule: 'CARD_COUNT',
      table: { playerCount: 4, betAmount: 500, botThinkDelayMs: 750, soundEnabled: true }
    }));
  }

  public static underground(): GameRulesBuilder {
    return new GameRulesBuilder(createDefaultGameRules({
      settlementRule: 'CARD_COUNT',
      chopping: { allowFourPairsCutAnytime: true, allowThreePairsCutTwo: true, allowFourOfAKindCutPairsOfTwos: true, multiplier: 2, cascadeMultiplier: true },
      cong: { enabled: true, penaltyCards: 26, multiplier: 2 },
      table: { playerCount: 4, betAmount: 1000, botThinkDelayMs: 700, soundEnabled: true }
    }));
  }

  public static winnerTakesAll(): GameRulesBuilder {
    return new GameRulesBuilder(createDefaultGameRules({
      settlementRule: 'WINNER_TAKES_ALL',
      table: { playerCount: 4, betAmount: 1000, botThinkDelayMs: 800, soundEnabled: true }
    }));
  }

  public static solo1v1(): GameRulesBuilder {
    return new GameRulesBuilder(createDefaultGameRules({
      settlementRule: 'CARD_COUNT',
      table: { playerCount: 2, betAmount: 1000, botThinkDelayMs: 650, soundEnabled: true }
    }));
  }

  public static fromPreset(preset: GameMode | 'UNDERGROUND' | 'SOLO_1V1'): GameRulesBuilder {
    switch (preset) {
      case 'COUNT_CARDS': return GameRulesBuilder.countCards();
      case 'UNDERGROUND': return GameRulesBuilder.underground();
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
