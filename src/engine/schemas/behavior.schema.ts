import { z } from 'zod';
import type { CombinationType } from '../types';

export const CombinationTypeSchema = z.enum([
  'SINGLE',
  'PAIR',
  'TRIPLE',
  'FOUR_OF_A_KIND',
  'STRAIGHT',
  'THREE_PAIRS_SEQUENTIAL',
  'FOUR_PAIRS_SEQUENTIAL',
  'FIVE_PAIRS_SEQUENTIAL',
  'SIX_PAIRS',
  'DRAGON_STRAIGHT',
  'SAME_COLOR_13',
  'FOUR_TWOS',
  'FIRST_ROUND_FOUR_THREES'
]);

export const DEFAULT_PASS_RATES: Record<CombinationType, number> = {
  SINGLE: 0.2,
  PAIR: 0.3,
  TRIPLE: 0.4,
  STRAIGHT: 0.4,
  THREE_PAIRS_SEQUENTIAL: 0.8,
  FOUR_OF_A_KIND: 0.9,
  FOUR_PAIRS_SEQUENTIAL: 0.95,
  FIVE_PAIRS_SEQUENTIAL: 1.0,
  SIX_PAIRS: 1.0,
  DRAGON_STRAIGHT: 1.0,
  SAME_COLOR_13: 1.0,
  FOUR_TWOS: 1.0,
  FIRST_ROUND_FOUR_THREES: 1.0
};

export const OpponentBehaviorProfileSchema = z.object({
  playerId: z.string(),
  gamesObserved: z.number().default(0),
  totalCardsPlayed: z.number().default(0),
  heoGreedRate: z.number().min(0).max(1).default(0.5),
  trashLeadRate: z.number().min(0).max(1).default(0.5),
  trapPatienceScore: z.number().min(0).max(1).default(0.5),
  chopAggressionScore: z.number().min(0).max(1).default(0.5),
  antiLeaderCarefulness: z.number().min(0).max(1).default(0.8),
  passRateByType: z.record(z.string(), z.number()).default(DEFAULT_PASS_RATES),
  lastUpdatedTimestamp: z.number().default(() => Date.now())
});

export type OpponentBehaviorProfile = z.infer<typeof OpponentBehaviorProfileSchema>;
