import { 
  GameSettings, 
  Player, 
  GameRules, 
  GameRulesBuilder,
  normalizePlayerCount,
  DeepPartial
} from '../types';
import { 
  calculateCountCardsSettlement, 
  calculateWinnerTakesAllSettlement, 
  calculateTraditionalSettlement 
} from '../economy';
import { 
  computeTableEloSettlement, 
  matchmakeRankedOpponents, 
  EloDeltaResult, 
  TableEloSettlementResult 
} from '../elo';
import { generateRandomBotConfig, getBotConfig, getRandomBotConfigsForTable, generateRealisticBotBankroll, sanitizeAvatar } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { CampaignChapter } from '../campaign';
import { PlayerProfile } from '../storage';
import { getTierFromElo } from '../ecosystem/ecosystem-types';
import { createPlayer, createBotPlayer } from '../player-factory';

/**
 * Ngữ cảnh đầu vào để khởi tạo bàn đấu (Match Setup Context)
 */
export interface MatchSetupContext {
  profile: PlayerProfile;
  customRules?: DeepPartial<GameRules>;
  customSettings?: Partial<GameSettings>;
  customBotPersonaIds?: string[];
  customBotConfigs?: Partial<BotConfig>[];
  campaignChapter?: CampaignChapter;
  playerCount?: number;
}

/**
 * Kết quả khởi tạo cấu hình bàn đấu hoàn chỉnh (Match Setup Result)
 */
export interface MatchSetupResult {
  rules: GameRules;
  settings: GameSettings;
  botPersonaIds: [string, string, string];
  customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
  playerCount: number;
  initialPlayers: Player[];
}

/**
 * Ngữ cảnh kết toán ván đấu (Match Settlement Context)
 * Tuân thủ State-Driven Non-Nullable Architecture Policy:
 * Toàn bộ dữ liệu tại thời điểm kết toán phải là non-nullable, không fallback.
 */
export interface MatchSettlementContext {
  readonly players: readonly Player[];
  readonly winners: readonly Player[];
  readonly betAmount: number;
  readonly subjectPlayerId: string; // ✅ Non-nullable: ID cụ thể của người chơi được kết toán
  readonly playerElos: Readonly<Record<string, number>>;
  readonly chopsByPlayer: Readonly<Record<string, number>>;
  readonly gotChoppedByPlayer: Readonly<Record<string, number>>;
  readonly streaksByPlayer: Readonly<Record<string, number>>;
  readonly isBankLoanActive: boolean;
  readonly campaignReward?: number;
  readonly penaltyMultiplier: number;
  readonly isThreeSpadesWin: boolean;
  readonly isInstantWin: boolean;
}

/**
 * Kết quả kết toán ván đấu chuẩn hóa
 */
export interface MatchSettlementResult {
  readonly strategyId: string;
  readonly payouts: Readonly<Record<string, number>>;
  readonly eloDelta: number;
  readonly eloBreakdown: EloDeltaResult['breakdown'] | null;
  readonly allEloDeltas: Readonly<Record<string, number>>;
  readonly allEloBreakdowns: Readonly<Record<string, EloDeltaResult['breakdown']>>;
  readonly loanDeduction: number;
  readonly isVictoryModalRanked: boolean;
  readonly campaignReward?: number;
}

/**
 * Hàm trợ giúp dựng mảng người chơi ban đầu
 */
function buildInitialPlayers(
  profile: PlayerProfile,
  bConfigs: BotConfig[],
  botPersonaIds: [string, string, string],
  playerCount: number,
  betAmount: number = 100
): Player[] {
  const players: Player[] = [
    createPlayer({
      id: profile.id,
      name: profile.name || 'Bạn (Người Chơi)',
      avatar: profile.avatar || '🤠',
      score: profile.coins
    })
  ];

  const usedNames: string[] = [players[0].name];
  const usedAvatars: string[] = [players[0].avatar];

  for (let i = 0; i < playerCount - 1; i++) {
    const config = bConfigs[i];
    const personaId = botPersonaIds[i];

    let botName = config.name;
    let botAvatar = config.avatar;

    if (!botName || !botAvatar) {
      const tierNum = config.elo ? getTierFromElo(config.elo).tierNum : 2;
      const dyn = generateRandomBotConfig(tierNum, {
        excludeNames: usedNames,
        excludeAvatars: usedAvatars,
        baseId: personaId
      });
      botName = botName || dyn.name;
      botAvatar = botAvatar || dyn.avatar;
    }

    botAvatar = sanitizeAvatar(botAvatar, i + 1);
    config.name = botName;
    config.avatar = botAvatar;

    usedNames.push(botName);
    usedAvatars.push(botAvatar);

    const botInitialBankroll = generateRealisticBotBankroll(config, betAmount);

    players.push(
      createBotPlayer(`p${i + 1}`, personaId || null, {
        name: botName,
        avatar: botAvatar,
        score: botInitialBankroll
      })
    );
  }

  return players;
}

/**
 * Helper chuẩn hóa dựng MatchSetupResult từ GameRules để loại bỏ code trùng lặp
 */
function createMatchSetupResult(
  context: MatchSetupContext,
  rules: GameRules,
  defaultBotConfigs: BotConfig[]
): MatchSetupResult {
  const rawConfigs = context.customBotConfigs || [];
  const customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>] = [
    rawConfigs[0] || {},
    rawConfigs[1] || {},
    rawConfigs[2] || {}
  ];
  let bConfigs: BotConfig[];
  let botPersonaIds: [string, string, string];

  if (context.customBotPersonaIds && context.customBotPersonaIds.length >= 3) {
    botPersonaIds = [
      context.customBotPersonaIds[0] || 'BOT_ELO_850',
      context.customBotPersonaIds[1] || 'BOT_ELO_1150',
      context.customBotPersonaIds[2] || 'BOT_ELO_1450'
    ];
    bConfigs = [
      getBotConfig(botPersonaIds[0], customBotConfigs[0]),
      getBotConfig(botPersonaIds[1], customBotConfigs[1]),
      getBotConfig(botPersonaIds[2], customBotConfigs[2])
    ];
  } else {
    bConfigs = defaultBotConfigs;
    botPersonaIds = [
      bConfigs[0]?.id || 'BOT_ELO_850',
      bConfigs[1]?.id || 'BOT_ELO_1150',
      bConfigs[2]?.id || 'BOT_ELO_1450'
    ];
  }

  const settings: GameSettings = {
    mode: rules.settlementRule,
    betAmount: rules.table.betAmount,
    playerCount: rules.table.playerCount,
    allowFourPairsCutAnytime: rules.chopping.allowFourPairsCutAnytime,
    instantWinEnabled: rules.instantWin.enabled,
    soundEnabled: rules.table.soundEnabled,
    prohibitEndingWithTwo: rules.gameFlow.prohibitEndingWithTwo,
    threeSpadesEndingBonus: rules.gameFlow.threeSpadesEndingBonus,
    cascadeChopEnabled: rules.chopping.cascadeMultiplier
  };

  const initialPlayers = buildInitialPlayers(context.profile, bConfigs, botPersonaIds, rules.table.playerCount, rules.table.betAmount);

  return {
    rules,
    settings,
    botPersonaIds,
    customBotConfigs,
    playerCount: rules.table.playerCount,
    initialPlayers
  };
}

/**
 * Interface Chiến Lược Chế Độ Chơi (Game Mode Strategy)
 * Tập trung vào Cấu Hình Luật Bàn Đấu (setupMatch) và Nghiệp Vụ Kết Toán Tiến Trình (settleMatch).
 * Các cơ chế bàn chơi (check game over, chặt heo, tính điểm trong trận) được GameEngine xử lý độc lập qua GameRules.
 */
export interface GameModeStrategy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isFreeToPlay: boolean;

  setupMatch(context: MatchSetupContext): MatchSetupResult;
  settleMatch(context: MatchSettlementContext): MatchSettlementResult;
}

/**
 * Hàm trợ giúp tính toán biến động điểm Elo sau mỗi ván đấu dựa trên thứ hạng và Elo đối thủ
 * Tính toán đồng nhất cho toàn bộ người chơi (người chơi chính, bot, online peers) bằng cùng 1 công thức.
 */
/**
 * Hàm trợ giúp tính toán biến động điểm Elo sau mỗi ván đấu dựa trên thứ hạng và Elo đối thủ
 * Tính toán đồng nhất cho toàn bộ người chơi (người chơi chính, bot, online peers) bằng cùng 1 công thức.
 */
function computeMatchEloDelta(context: MatchSettlementContext): TableEloSettlementResult {
  return computeTableEloSettlement({
    players: context.players,
    winners: context.winners,
    playerElos: context.playerElos,
    chopsByPlayer: context.chopsByPlayer,
    gotChoppedByPlayer: context.gotChoppedByPlayer,
    streaksByPlayer: context.streaksByPlayer,
    isThreeSpadesWin: context.isThreeSpadesWin,
    isInstantWin: context.isInstantWin
  });
}

// ============================================================================
// 1. TRUYỀN THỐNG (TRADITIONAL STRATEGY)
// ============================================================================
export class TraditionalModeStrategy implements GameModeStrategy {
  readonly id = 'TRADITIONAL';
  readonly name = 'Truyền Thống';
  readonly description = 'Đánh đến người áp chót, tính tiền Nhất Nhì Ba Bét theo số người chơi & tích lũy Elo.';
  readonly isFreeToPlay = false;

  setupMatch(context: MatchSetupContext): MatchSetupResult {
    const playerCount = normalizePlayerCount(context.playerCount ?? context.customRules?.table?.playerCount ?? context.customSettings?.playerCount);
    const betAmount = context.customRules?.table?.betAmount ?? context.customSettings?.betAmount ?? 100;

    const rules = GameRulesBuilder.traditional()
      .withSettlement(context.customRules?.settlementRule || 'TRADITIONAL')
      .withChopping(c => c
        .allowFourPairsCutAnytime(context.customRules?.chopping?.allowFourPairsCutAnytime ?? context.customSettings?.allowFourPairsCutAnytime ?? true)
        .multiplier(context.customRules?.chopping?.multiplier ?? 1)
      )
      .withTable(t => t
        .playerCount(playerCount)
        .betAmount(betAmount)
      )
      .build();

    // Tự động ghép đối thủ Bot theo mức Elo hiện tại của người chơi
    const defaultBots = matchmakeRankedOpponents(context.profile?.elo ?? 1000);
    return createMatchSetupResult(context, rules, defaultBots);
  }

  settleMatch(context: MatchSettlementContext): MatchSettlementResult {
    const payouts = calculateTraditionalSettlement(
      context.players,
      context.winners,
      context.betAmount,
      context.penaltyMultiplier,
      context.isThreeSpadesWin
    );

    const eloRes = computeMatchEloDelta(context);
    const primaryDelta = eloRes.allEloDeltas[context.subjectPlayerId];
    const primaryBreakdown = eloRes.allEloBreakdowns[context.subjectPlayerId];
    if (primaryDelta === undefined) {
      throw new Error(`[${this.id}] Không tìm thấy Elo delta cho người chơi ${context.subjectPlayerId} trong bảng kết toán!`);
    }

    return {
      strategyId: this.id,
      payouts,
      eloDelta: primaryDelta,
      eloBreakdown: primaryBreakdown ?? null,
      allEloDeltas: eloRes.allEloDeltas,
      allEloBreakdowns: eloRes.allEloBreakdowns,
      loanDeduction: 0,
      isVictoryModalRanked: true
    };
  }
}

// ============================================================================
// 2. ĐẾM LÁ (COUNT CARDS STRATEGY)
// ============================================================================
export class CountCardsModeStrategy implements GameModeStrategy {
  readonly id = 'COUNT_CARDS';
  readonly name = 'Đếm Lá';
  readonly description = '1 người hết bài là dừng ván. Người thua đền theo số lá còn lại + thối heo + cóng & tích lũy Elo.';
  readonly isFreeToPlay = false;

  setupMatch(context: MatchSetupContext): MatchSetupResult {
    const playerCount = normalizePlayerCount(context.playerCount ?? context.customRules?.table?.playerCount ?? context.customSettings?.playerCount);
    const betAmount = context.customRules?.table?.betAmount ?? context.customSettings?.betAmount ?? 100;

    const rules = GameRulesBuilder.countCards()
      .withChopping(c => c
        .allowFourPairsCutAnytime(context.customRules?.chopping?.allowFourPairsCutAnytime ?? context.customSettings?.allowFourPairsCutAnytime ?? true)
        .multiplier(context.customRules?.chopping?.multiplier ?? 1)
      )
      .withCong(cg => cg
        .enabled(context.customRules?.cong?.enabled ?? true)
        .penaltyCards(context.customRules?.cong?.penaltyCards ?? 26)
        .multiplier(context.customRules?.cong?.multiplier ?? 1)
      )
      .withGameFlow(f => f
        .prohibitEndingWithTwo(context.customRules?.gameFlow?.prohibitEndingWithTwo ?? true)
      )
      .withTable(t => t
        .playerCount(playerCount)
        .betAmount(betAmount)
      )
      .build();

    // Tự động ghép đối thủ Bot theo mức Elo hiện tại của người chơi
    const defaultBots = matchmakeRankedOpponents(context.profile?.elo ?? 1000);
    return createMatchSetupResult(context, rules, defaultBots);
  }

  settleMatch(context: MatchSettlementContext): MatchSettlementResult {
    const winnerFirst = context.winners[0];
    if (!winnerFirst) {
      throw new Error(`[${this.id}] Không thể kết toán ván đấu khi danh sách winners rỗng!`);
    }
    const payouts = calculateCountCardsSettlement(
      context.players,
      winnerFirst.id,
      context.betAmount,
      context.penaltyMultiplier,
      context.isThreeSpadesWin
    );

    const eloRes = computeMatchEloDelta(context);
    const primaryDelta = eloRes.allEloDeltas[context.subjectPlayerId];
    const primaryBreakdown = eloRes.allEloBreakdowns[context.subjectPlayerId];
    if (primaryDelta === undefined) {
      throw new Error(`[${this.id}] Không tìm thấy Elo delta cho người chơi ${context.subjectPlayerId} trong bảng kết toán!`);
    }

    return {
      strategyId: this.id,
      payouts,
      eloDelta: primaryDelta,
      eloBreakdown: primaryBreakdown ?? null,
      allEloDeltas: eloRes.allEloDeltas,
      allEloBreakdowns: eloRes.allEloBreakdowns,
      loanDeduction: 0,
      isVictoryModalRanked: true
    };
  }
}

// ============================================================================
// 4. CHIẾN DỊCH (CAMPAIGN STRATEGY)
// ============================================================================
export class CampaignModeStrategy implements GameModeStrategy {
  readonly id = 'CAMPAIGN';
  readonly name = 'Chiến Dịch';
  readonly description = '1 người hết bài là dừng ván. Không phạt đếm lá giữa các người chơi, hoàn thành chương nhận thưởng xu.';
  readonly isFreeToPlay = false;

  setupMatch(context: MatchSetupContext): MatchSetupResult {
    const chapter = context.campaignChapter;
    const betAmount = chapter?.betAmount ?? 100;

    const rules = GameRulesBuilder.countCards()
      .withTable(t => t
        .playerCount(4)
        .betAmount(betAmount)
      )
      .build();

    const defaultBots = chapter ? Array.from(chapter.bots) : getRandomBotConfigsForTable([1, 2, 3], 3);
    const campaignContext: MatchSetupContext = {
      ...context,
      customBotPersonaIds: chapter ? [chapter.bots[0].id, chapter.bots[1].id, chapter.bots[2].id] : undefined,
      customBotConfigs: chapter ? [chapter.bots[0], chapter.bots[1], chapter.bots[2]] : undefined
    };
    return createMatchSetupResult(campaignContext, rules, defaultBots);
  }

  settleMatch(context: MatchSettlementContext): MatchSettlementResult {
    const payouts: Record<string, number> = {};
    for (let i = 0; i < context.players.length; i++) {
      payouts[context.players[i].id] = 0;
    }

    const winnerFirst = context.winners[0];
    const isPlayerWin = winnerFirst?.id === context.subjectPlayerId;
    const reward = (isPlayerWin && context.campaignReward) ? context.campaignReward : 0;

    if (reward > 0) {
      payouts[context.subjectPlayerId] = reward;
    }

    return {
      strategyId: this.id,
      payouts,
      eloDelta: 0,
      eloBreakdown: null,
      allEloDeltas: {},
      allEloBreakdowns: {},
      loanDeduction: 0,
      isVictoryModalRanked: false,
      campaignReward: reward
    };
  }
}

// ============================================================================
// 6. NHẤT ĂN TẤT (WINNER TAKES ALL STRATEGY)
// ============================================================================
export class WinnerTakesAllModeStrategy implements GameModeStrategy {
  readonly id = 'WINNER_TAKES_ALL';
  readonly name = 'Nhất Ăn Tất';
  readonly description = '1 người hết bài là dừng ván. Người về Nhất gom trọn tiền cược cơ bản của cả bàn + thối heo & tích lũy Elo.';
  readonly isFreeToPlay = false;

  setupMatch(context: MatchSetupContext): MatchSetupResult {
    const playerCount = normalizePlayerCount(context.playerCount ?? context.customRules?.table?.playerCount ?? context.customSettings?.playerCount);
    const betAmount = context.customRules?.table?.betAmount ?? context.customSettings?.betAmount ?? 100;

    const rules = GameRulesBuilder.winnerTakesAll()
      .withChopping(c => c
        .allowFourPairsCutAnytime(context.customRules?.chopping?.allowFourPairsCutAnytime ?? context.customSettings?.allowFourPairsCutAnytime ?? true)
        .multiplier(context.customRules?.chopping?.multiplier ?? 1)
      )
      .withCong(cg => cg
        .enabled(context.customRules?.cong?.enabled ?? true)
        .penaltyCards(context.customRules?.cong?.penaltyCards ?? 26)
        .multiplier(context.customRules?.cong?.multiplier ?? 1)
      )
      .withGameFlow(f => f
        .prohibitEndingWithTwo(context.customRules?.gameFlow?.prohibitEndingWithTwo ?? true)
      )
      .withTable(t => t
        .playerCount(playerCount)
        .betAmount(betAmount)
      )
      .build();

    // Tự động ghép đối thủ Bot theo mức Elo hiện tại của người chơi
    const defaultBots = matchmakeRankedOpponents(context.profile?.elo ?? 1000);
    return createMatchSetupResult(context, rules, defaultBots);
  }

  settleMatch(context: MatchSettlementContext): MatchSettlementResult {
    const winnerFirst = context.winners[0];
    if (!winnerFirst) {
      throw new Error(`[${this.id}] Không thể kết toán ván đấu khi danh sách winners rỗng!`);
    }
    const payouts = calculateWinnerTakesAllSettlement(
      context.players,
      winnerFirst.id,
      context.betAmount,
      context.penaltyMultiplier,
      context.isThreeSpadesWin
    );

    const eloRes = computeMatchEloDelta(context);
    const primaryDelta = eloRes.allEloDeltas[context.subjectPlayerId];
    const primaryBreakdown = eloRes.allEloBreakdowns[context.subjectPlayerId];
    if (primaryDelta === undefined) {
      throw new Error(`[${this.id}] Không tìm thấy Elo delta cho người chơi ${context.subjectPlayerId} trong bảng kết toán!`);
    }

    return {
      strategyId: this.id,
      payouts,
      eloDelta: primaryDelta,
      eloBreakdown: primaryBreakdown ?? null,
      allEloDeltas: eloRes.allEloDeltas,
      allEloBreakdowns: eloRes.allEloBreakdowns,
      loanDeduction: 0,
      isVictoryModalRanked: true
    };
  }
}

// ============================================================================
// STRATEGY REGISTRY & RESOLVER FACTORY
// ============================================================================

export const GAME_MODE_STRATEGIES: Record<string, GameModeStrategy> = {
  TRADITIONAL: new TraditionalModeStrategy(),
  COUNT_CARDS: new CountCardsModeStrategy(),
  CAMPAIGN: new CampaignModeStrategy(),
  WINNER_TAKES_ALL: new WinnerTakesAllModeStrategy(),
  SOLO_1V1: new CountCardsModeStrategy(),
  CUSTOM_SANDBOX: new TraditionalModeStrategy()
};

/**
 * Lấy Strategy tương ứng theo ID
 */
export function getGameModeStrategy(strategyId: string): GameModeStrategy {
  const normalized = (strategyId || '').toUpperCase();
  return GAME_MODE_STRATEGIES[normalized] || GAME_MODE_STRATEGIES.TRADITIONAL;
}

/**
 * Định vị Strategy chính xác nhất cho phiên đấu hiện tại
 * @param activeGameType 'QUICK' | 'CAMPAIGN'
 * @param customMode 'TRADITIONAL' | 'COUNT_CARDS' | 'WINNER_TAKES_ALL' | 'CUSTOM'
 */
export function resolveStrategyForMatch(
  activeGameType: 'QUICK' | 'CAMPAIGN' | string,
  customMode: string = 'TRADITIONAL'
): GameModeStrategy {
  switch (activeGameType) {
    case 'CAMPAIGN':
      return GAME_MODE_STRATEGIES.CAMPAIGN;
    case 'QUICK':
    default:
      if (customMode === 'COUNT_CARDS') {
        return GAME_MODE_STRATEGIES.COUNT_CARDS;
      }
      if (customMode === 'WINNER_TAKES_ALL') {
        return GAME_MODE_STRATEGIES.WINNER_TAKES_ALL;
      }
      return GAME_MODE_STRATEGIES.TRADITIONAL;
  }
}
