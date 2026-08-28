import { z } from 'zod';

export const BotStatsSchema = z.object({
  gamesPlayed: z.number().nonnegative().default(0),
  wins: z.number().nonnegative().default(0),
  chopsDone: z.number().nonnegative().default(0),
  congsGiven: z.number().nonnegative().default(0),
  totalEarned: z.number().default(0)
});

export const BotHeadToHeadSchema = z.object({
  games: z.number().nonnegative().default(0),
  botWins: z.number().nonnegative().default(0),
  humanWins: z.number().nonnegative().default(0),
  netCoinsEarnedFromHuman: z.number().default(0)
});

export const BotEntitySchema = z.object({
  id: z.string(),
  name: z.string().nullable().default('Đấu thủ'),
  avatar: z.string().nullable().default('👤'),
  description: z.string().default(''),
  elo: z.number().default(1000),
  dnaTier: z.number().int().min(1).max(9).default(2),
  coins: z.number().default(50000),
  currentStreak: z.number().default(0),
  highestStreak: z.number().nonnegative().default(0),
  stats: BotStatsSchema.default({
    gamesPlayed: 0,
    wins: 0,
    chopsDone: 0,
    congsGiven: 0,
    totalEarned: 0
  }),
  headToHeadVsHuman: BotHeadToHeadSchema.default({
    games: 0,
    botWins: 0,
    humanWins: 0,
    netCoinsEarnedFromHuman: 0
  }),
  personalityTags: z.array(z.string()).default([]),
  status: z.enum(['ACTIVE', 'BANKRUPT']).default('ACTIVE'),
  activityStatus: z.enum(['IN_MATCH', 'IDLE', 'RESTING']).default('IN_MATCH'),
  createdAt: z.number().default(() => Date.now()),
  title: z.string().default('Cao Thủ'),
  // 14 AI Behavioral traits
  memoryDepth: z.number().min(0).max(1).default(0.5),
  riskAppetite: z.number().min(0).max(1).default(0.5),
  trapTendency: z.number().min(0).max(1).default(0.5),
  baitingTendency: z.number().min(0).max(1).default(0.5),
  antiLeaderAggression: z.number().min(0).max(1).default(0.5),
  tempoControl: z.number().min(0).max(1).default(0.5),
  damageControl: z.number().min(0).max(1).default(0.5),
  turnsToWinLookahead: z.number().min(0).max(1).default(0.5),
  dynamicHandSacrifice: z.number().min(0).max(1).default(0.5),
  bombInferenceRate: z.number().min(0).max(1).default(0.5),
  semiCooperativeCooperation: z.number().min(0).max(1).default(0.5),
  positionalAwareness: z.number().min(0).max(1).default(0.5),
  inMatchAdaptationRate: z.number().min(0).max(1).default(0.5),
  mctsSimulations: z.number().nonnegative().default(0),
  handPartitioningOptimality: z.number().min(0).max(1).default(0.5),
  simulationLookahead: z.number().nonnegative().default(0),
  useMinimaxEndgame: z.boolean().default(false),
  useBayesianInference: z.boolean().default(false),
  useNashEquilibrium: z.boolean().default(false),
  useDynamicRepartitioning: z.boolean().default(false)
});

export const EcosystemNewsTypeSchema = z.enum([
  'BANKRUPTCY',
  'ROOKIE_JOINED',
  'BIG_WIN',
  'WIN_STREAK',
  'PROMOTION',
  'HEAD_TO_HEAD',
  'HIGH_ROLLER'
]);

export const EcosystemNewsItemSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  type: EcosystemNewsTypeSchema,
  message: z.string(),
  botId: z.string().nullable().default(null),
  botName: z.string().nullable().default(null),
  avatar: z.string().nullable().default(null),
  amount: z.number().nullable().default(null)
});

export const MatchLogReportSchema = z.object({
  matchId: z.string(),
  gameNumber: z.number().default(1),
  gameMode: z.string().default('TRADITIONAL'),
  rules: z.record(z.string(), z.unknown()).default({}),
  startedAt: z.string(),
  endedAt: z.string(),
  durationMs: z.number().nonnegative().default(0),
  players: z.array(z.record(z.string(), z.unknown())).default([]),
  winner: z.object({
    id: z.string(),
    name: z.string(),
    rankPosition: z.number()
  }).nullable().default(null),
  turns: z.array(z.record(z.string(), z.unknown())).default([]),
  settlements: z.object({
    payouts: z.record(z.string(), z.number()).default({}),
    isThreeSpadesWin: z.boolean().default(false),
    instantWinType: z.string().nullable().default(null),
    loanDeduction: z.number().default(0),
    eloDelta: z.number().default(0)
  }).default({
    payouts: {},
    isThreeSpadesWin: false,
    instantWinType: null,
    loanDeduction: 0,
    eloDelta: 0
  })
});

export type BotEntity = z.infer<typeof BotEntitySchema>;
export type BotStats = z.infer<typeof BotStatsSchema>;
export type BotHeadToHead = z.infer<typeof BotHeadToHeadSchema>;
export type EcosystemNewsItem = z.infer<typeof EcosystemNewsItemSchema>;
export type EcosystemNewsType = z.infer<typeof EcosystemNewsTypeSchema>;
export type MatchLogReport = z.infer<typeof MatchLogReportSchema>;

export type ValidatedBotEntity = BotEntity;
export type ValidatedEcosystemNewsItem = EcosystemNewsItem;
export type ValidatedMatchLogReport = MatchLogReport;

