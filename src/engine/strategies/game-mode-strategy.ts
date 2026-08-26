import { 
  GameMode, 
  GameSettings, 
  Player, 
  GameRules, 
  createDefaultGameRules,
  GameRulesBuilder,
  normalizePlayerCount,
  DeepPartial
} from '../types';
import { 
  calculateCountCardsSettlement, 
  calculateWinnerTakesAllSettlement, 
  calculateTraditionalSettlement 
} from '../economy';
import { calculateEloDelta, matchmakeRankedOpponents } from '../elo';
import { generateRandomBotConfig, getBotConfig, getRandomBotConfigsForTable, generateRealisticBotBankroll } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { CampaignChapter } from '../campaign';
import { PlayerProfile } from '../storage';

/**
 * Ngữ cảnh đầu vào để khởi tạo bàn đấu (Match Setup Context)
 */
export interface MatchSetupContext {
  profile: PlayerProfile;
  customRules?: DeepPartial<GameRules>;
  customSettings?: Partial<GameSettings>;
  customBotPersonaIds?: [string, string, string];
  customBotConfigs?: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
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
 */
export interface MatchSettlementContext {
  players: Player[];
  winners: Player[];
  betAmount: number;
  playerElo?: number;
  isBankLoanActive?: boolean;
  campaignReward?: number;
  penaltyMultiplier?: number;
  isThreeSpadesWin?: boolean;
}

/**
 * Kết quả kết toán ván đấu chuẩn hóa
 */
export interface MatchSettlementResult {
  strategyId: string;
  payouts: Record<string, number>;
  eloDelta: number;
  loanDeduction: number;
  isVictoryModalRanked: boolean;
  campaignReward?: number;
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
    {
      id: 'p0',
      name: profile.name || 'Bạn (Người Chơi)',
      avatar: profile.avatar || '🤠',
      isBot: false,
      hand: [],
      playedCards: [],
      score: profile.coins,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    }
  ];

  const usedNames: string[] = [players[0].name];
  const usedAvatars: string[] = [players[0].avatar];

  for (let i = 0; i < playerCount - 1; i++) {
    const config = bConfigs[i];
    const personaId = botPersonaIds[i];

    let botName = config.name;
    let botAvatar = config.avatar;

    if (!botName || !botAvatar) {
      const tierNum = config.elo ? Math.min(5, Math.max(1, Math.floor((config.elo - 800) / 350) + 1)) : 2;
      const dyn = generateRandomBotConfig(tierNum, {
        excludeNames: usedNames,
        excludeAvatars: usedAvatars,
        baseId: personaId
      });
      botName = botName || dyn.name;
      botAvatar = botAvatar || dyn.avatar;
    }

    usedNames.push(botName || `Bot ${i + 1}`);
    usedAvatars.push(botAvatar || '🤖');

    // Sinh số tiền vốn khởi điểm tự nhiên theo Bậc Elo và Mức cược
    const botInitialBankroll = generateRealisticBotBankroll(config, betAmount);

    players.push({
      id: `p${i + 1}`,
      name: botName || `Bot ${i + 1}`,
      avatar: botAvatar || '🤖',
      isBot: true,
      botPersonaId: personaId,
      hand: [],
      playedCards: [],
      score: botInitialBankroll,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    });
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
  const customBotConfigs = context.customBotConfigs ?? [{}, {}, {}];
  let bConfigs: BotConfig[];
  let botPersonaIds: [string, string, string];

  if (context.customBotPersonaIds) {
    botPersonaIds = context.customBotPersonaIds;
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

  let legacyMode: GameMode = 'TRADITIONAL';
  if (rules.settlementRule === 'CARD_COUNT') legacyMode = 'COUNT_CARDS';
  else if (rules.settlementRule === 'WINNER_TAKES_ALL') legacyMode = 'WINNER_TAKES_ALL';

  const settings: GameSettings = {
    mode: legacyMode,
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
 */
function computeMatchEloDelta(context: MatchSettlementContext): number {
  const p0Index = context.winners.findIndex(p => p.id === 'p0');
  const playerRank = p0Index !== -1 ? p0Index + 1 : context.players.length;
  const playerElo = context.playerElo ?? 1000;

  const opponentBots = context.players.filter(p => p.id !== 'p0');
  const opponentsAvgElo = opponentBots.length > 0
    ? Math.round(
        opponentBots.reduce((sum, p) => {
          const config = getBotConfig((p.botPersonaId || 'BOT_ELO_1150') as any);
          return sum + (config.elo || 1000);
        }, 0) / opponentBots.length
      )
    : 1000;

  const eloRes = calculateEloDelta(playerRank, playerElo, opponentsAvgElo);
  return eloRes.delta;
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
      .withSettlement(context.customRules?.settlementRule || 'TRADITIONAL_RANK_BASED')
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
      context.penaltyMultiplier || 1,
      context.isThreeSpadesWin || false
    );

    const eloDelta = computeMatchEloDelta(context);

    return {
      strategyId: this.id,
      payouts,
      eloDelta,
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
    const winnerFirst = context.winners[0] || context.players[0];
    const payouts = calculateCountCardsSettlement(
      context.players,
      winnerFirst.id,
      context.betAmount,
      context.penaltyMultiplier || 1,
      context.isThreeSpadesWin || false
    );

    const eloDelta = computeMatchEloDelta(context);

    return {
      strategyId: this.id,
      payouts,
      eloDelta,
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

    const defaultBots = chapter ? chapter.bots : getRandomBotConfigsForTable([1, 2, 3], 3);
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
    const isPlayerWin = winnerFirst?.id === 'p0';
    const reward = (isPlayerWin && context.campaignReward) ? context.campaignReward : 0;

    if (reward > 0) {
      payouts['p0'] = reward;
    }

    return {
      strategyId: this.id,
      payouts,
      eloDelta: 0,
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
    const winnerFirst = context.winners[0] || context.players[0];
    const payouts = calculateWinnerTakesAllSettlement(
      context.players,
      winnerFirst.id,
      context.betAmount,
      context.penaltyMultiplier || 1,
      context.isThreeSpadesWin || false
    );

    const eloDelta = computeMatchEloDelta(context);

    return {
      strategyId: this.id,
      payouts,
      eloDelta,
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
