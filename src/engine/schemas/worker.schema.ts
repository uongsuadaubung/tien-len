import { z } from 'zod';
import type { Card, Combination } from '../types';
import type { MctsEvaluation } from '../../ai/types';

export const MctsWorkerRequestSchema = z.object({
  id: z.string(),
  botId: z.string(),
  botHand: z.array(z.custom<Card>()),
  candidateMoves: z.array(z.object({
    cards: z.array(z.custom<Card>()),
    combination: z.custom<Combination>(),
    isChop: z.boolean()
  })),
  playedCardIds: z.array(z.string()),
  remainingPlayerCards: z.record(z.string(), z.number()),
  simulationsCount: z.number().nonnegative()
});

export const MctsWorkerResponseSchema = z.object({
  id: z.string(),
  evaluations: z.array(z.custom<MctsEvaluation>())
});

export type MctsWorkerRequest = z.infer<typeof MctsWorkerRequestSchema>;
export type MctsWorkerResponse = z.infer<typeof MctsWorkerResponseSchema>;
