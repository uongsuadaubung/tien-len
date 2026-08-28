import { z } from 'zod';

export const GameSpeedModeSchema = z.enum(['FAST', 'REALISTIC', 'DELIBERATE']);

export const GithubUserSchema = z.object({
  login: z.string(),
  name: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatar_url: z.string()
});

export const SavedSettingsSchema = z.object({
  soundEnabled: z.boolean().default(true),
  autoSortEnabled: z.boolean().default(true),
  aiHintEnabled: z.boolean().default(false),
  quickResponseAssistEnabled: z.boolean().default(false),
  xrayEnabled: z.boolean().default(false),
  botReasoningLogEnabled: z.boolean().default(false),
  gameSpeed: GameSpeedModeSchema.default('REALISTIC'),
  githubToken: z.string().default(''),
  gistId: z.string().default(''),
  lastSync: z.number().default(0),
  lastSyncedHash: z.string().default(''),
  cachedGithubUser: GithubUserSchema.nullable().default(null),
  autoBackupOnMatchEnd: z.boolean().default(true),
  autoBackupInterval: z.number().default(5),
  autoSyncOnStartup: z.boolean().default(true)
});

export const GameModeSchema = z.enum(['TRADITIONAL', 'COUNT_CARDS', 'WINNER_TAKES_ALL', 'CUSTOM']);
export const PlayerCountSchema = z.union([z.literal(2), z.literal(3), z.literal(4)]);

export const GameSettingsSchema = z.object({
  mode: GameModeSchema.default('COUNT_CARDS'),
  playerCount: PlayerCountSchema.default(4),
  betAmount: z.number().nonnegative().default(1000),
  allowFourPairsCutAnytime: z.boolean().default(true),
  instantWinEnabled: z.boolean().default(true),
  soundEnabled: z.boolean().default(true),
  prohibitEndingWithTwo: z.boolean().default(true),
  threeSpadesEndingBonus: z.boolean().default(true),
  cascadeChopEnabled: z.boolean().default(true)
});

export const ChoppingRulesSchema = z.object({
  allowFourPairsCutAnytime: z.boolean().default(true),
  allowThreePairsCutTwo: z.boolean().default(true),
  allowFourOfAKindCutPairsOfTwos: z.boolean().default(true),
  multiplier: z.number().default(1),
  cascadeMultiplier: z.boolean().default(true)
});

export const CongRulesSchema = z.object({
  enabled: z.boolean().default(true),
  penaltyCards: z.number().default(26),
  multiplier: z.number().default(1)
});

export const InstantWinRulesSchema = z.object({
  enabled: z.boolean().default(true),
  payoutMultiplier: z.number().default(26)
});

export const GameFlowRulesSchema = z.object({
  firstGameRequireThreeOfSpades: z.boolean().default(true),
  winnerLeadsNextGame: z.boolean().default(true),
  prohibitEndingWithTwo: z.boolean().default(true),
  threeSpadesEndingBonus: z.boolean().default(true)
});

export const TableRulesSchema = z.object({
  playerCount: PlayerCountSchema.default(4),
  betAmount: z.number().nonnegative().default(1000),
  soundEnabled: z.boolean().default(true)
});

export const GameSettlementRuleSchema = z.enum(['TRADITIONAL', 'COUNT_CARDS', 'WINNER_TAKES_ALL']);

export const StrictGameRulesSchema = z.object({
  settlementRule: GameSettlementRuleSchema,
  chopping: ChoppingRulesSchema,
  cong: CongRulesSchema,
  instantWin: InstantWinRulesSchema,
  gameFlow: GameFlowRulesSchema,
  table: TableRulesSchema
});

export const GameRulesSchema = z.object({
  settlementRule: GameSettlementRuleSchema.default('COUNT_CARDS'),
  chopping: ChoppingRulesSchema.default({
    allowFourPairsCutAnytime: true,
    allowThreePairsCutTwo: true,
    allowFourOfAKindCutPairsOfTwos: true,
    multiplier: 1,
    cascadeMultiplier: true
  }),
  cong: CongRulesSchema.default({
    enabled: true,
    penaltyCards: 26,
    multiplier: 1
  }),
  instantWin: InstantWinRulesSchema.default({
    enabled: true,
    payoutMultiplier: 26
  }),
  gameFlow: GameFlowRulesSchema.default({
    firstGameRequireThreeOfSpades: true,
    winnerLeadsNextGame: true,
    prohibitEndingWithTwo: true,
    threeSpadesEndingBonus: true
  }),
  table: TableRulesSchema.default({
    playerCount: 4,
    betAmount: 1000,
    soundEnabled: true
  })
});

export const QuickTableConfigSchema = z.object({
  playerCount: PlayerCountSchema.default(4),
  betAmount: z.number().nonnegative().default(1000),
  settlementRule: GameSettlementRuleSchema.default('COUNT_CARDS'),
  choppingMultiplier: z.number().min(1).max(5).default(1),
  congEnabled: z.boolean().default(true),
  prohibitEndingWithTwo: z.boolean().default(true),
  allowFourPairsCutAnytime: z.boolean().default(true),
  threeSpadesEndingBonus: z.boolean().default(true),
  cascadeChopEnabled: z.boolean().default(true)
});

export type GameSettlementRule = z.infer<typeof GameSettlementRuleSchema>;

export type SavedSettings = z.infer<typeof SavedSettingsSchema>;
export type GameSpeedMode = z.infer<typeof GameSpeedModeSchema>;
export type GithubUser = z.infer<typeof GithubUserSchema>;
export type GameMode = z.infer<typeof GameModeSchema>;
export type PlayerCount = z.infer<typeof PlayerCountSchema>;
export type GameSettings = z.infer<typeof GameSettingsSchema>;
export type GameRules = z.infer<typeof GameRulesSchema>;
export type ChoppingRules = z.infer<typeof ChoppingRulesSchema>;
export type CongRules = z.infer<typeof CongRulesSchema>;
export type InstantWinRules = z.infer<typeof InstantWinRulesSchema>;
export type GameFlowRules = z.infer<typeof GameFlowRulesSchema>;
export type TableRules = z.infer<typeof TableRulesSchema>;
export type QuickTableConfig = z.infer<typeof QuickTableConfigSchema>;

export type ValidatedSavedSettings = SavedSettings;

