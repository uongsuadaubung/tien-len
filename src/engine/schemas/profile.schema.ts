import { z } from 'zod';

export const QuestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  rewardCoins: z.number().nonnegative(),
  icon: z.string().default('📜'),
  targetCount: z.number().positive(),
  currentCount: z.number().nonnegative().default(0),
  isCompleted: z.boolean().default(false),
  isClaimed: z.boolean().default(false)
});

export const AchievementCategorySchema = z.enum(['CHOP', 'VICTORY', 'WEALTH', 'SPECIAL']);

export const AchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  rewardCoins: z.number().nonnegative(),
  icon: z.string().default('🏆'),
  targetCount: z.number().positive(),
  currentCount: z.number().nonnegative().default(0),
  isCompleted: z.boolean().default(false),
  isClaimed: z.boolean().default(false),
  category: AchievementCategorySchema.default('SPECIAL')
});

export const PlayerStatsSchema = z.object({
  gamesPlayed: z.number().nonnegative().default(0),
  wins: z.number().nonnegative().default(0),
  chopsDone: z.number().nonnegative().default(0),
  congsGiven: z.number().nonnegative().default(0),
  totalEarned: z.number().default(0),
  highestStreak: z.number().nonnegative().default(0),
  currentStreak: z.number().default(0)
});

export type PlayerStats = z.infer<typeof PlayerStatsSchema>;

export const PlayerProfileSchema = z.object({
  id: z.string().default(() => 'usr_' + Math.random().toString(36).slice(2, 10)),
  name: z.string().default(''),
  avatar: z.string().default('🤠'),
  coins: z.number().default(50000),
  elo: z.number().default(1000),
  campaignUnlockedChapter: z.number().int().min(1).max(10).default(1),
  campaignChapterWins: z.record(z.string().or(z.number()), z.number().nonnegative()).default({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
  loans: z.number().nonnegative().default(0),
  dailyReliefClaimedCount: z.number().nonnegative().default(0),
  lastDailyResetTimestamp: z.number().default(() => Date.now()),
  lastDailyResetDate: z.string().default(''),
  dailyQuests: z.array(QuestSchema).default([]),
  achievements: z.array(AchievementSchema).default([]),
  dailyMilestonesClaimed: z.record(z.string().or(z.number()), z.boolean()).default({ 1: false, 3: false, 5: false }),
  stats: PlayerStatsSchema.default({
    gamesPlayed: 0,
    wins: 0,
    chopsDone: 0,
    congsGiven: 0,
    totalEarned: 0,
    highestStreak: 0,
    currentStreak: 0
  })
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type AchievementCategory = z.infer<typeof AchievementCategorySchema>;

export type ValidatedPlayerProfile = PlayerProfile;
export type ValidatedPlayerStats = PlayerStats;
export type ValidatedAchievement = Achievement;
export type ValidatedQuest = Quest;

