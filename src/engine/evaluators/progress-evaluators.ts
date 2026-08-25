import { Quest, Achievement } from '../quests';
import { PlayerProfile } from '../storage';
import { GameEvent } from '../events/game-event-bus';

/**
 * Interface cho Progress Evaluator theo Specification Pattern
 */
export interface ProgressEvaluator {
  readonly id: string;
  evaluate(
    event: GameEvent,
    currentCount: number,
    targetCount: number,
    profile: PlayerProfile
  ): number;
}

// ============================================================================
// 1. EVALUATORS CHO NHIỆM VỤ NGÀY (DAILY QUESTS)
// ============================================================================

export class WinThreeMatchesEvaluator implements ProgressEvaluator {
  readonly id = 'daily_win_three_matches';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner) {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class HighRollerEvaluator implements ProgressEvaluator {
  readonly id = 'daily_high_roller';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner && event.betAmount > 0) {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class ChopRedTwoEvaluator implements ProgressEvaluator {
  readonly id = 'daily_chop_red_two';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CHOP_EXECUTED' && event.chopperPlayerId === 'p0') {
      const hasRedTwo = event.choppingCards.some(c => c.rank === 15 && (c.suit === 'HEARTS' || c.suit === 'DIAMONDS'));
      if (hasRedTwo) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class LongStraightEvaluator implements ProgressEvaluator {
  readonly id = 'daily_long_straight';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CARD_PLAYED' && event.playerId === 'p0') {
      if (event.combination.type === 'STRAIGHT' && event.combination.cards.length >= 5) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

// ============================================================================
// 2. EVALUATORS CHO THÀNH TỰU TRỌN ĐỜI (ACHIEVEMENTS)
// ============================================================================

export class TotalWinsEvaluator implements ProgressEvaluator {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner) {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class WinStreakEvaluator implements ProgressEvaluator {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number, profile: PlayerProfile): number {
    if (event.type === 'MATCH_COMPLETED') {
      const currentStreak = event.isHumanWinner ? profile.stats.currentStreak + 1 : 0;
      return Math.min(targetCount, Math.max(currentCount, currentStreak));
    }
    return currentCount;
  }
}

export class InstantWinAchievementEvaluator implements ProgressEvaluator {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'INSTANT_WIN' && event.winnerPlayerId === 'p0') {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class MillionaireAchievementEvaluator implements ProgressEvaluator {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, _currentCount: number, targetCount: number, profile: PlayerProfile): number {
    if (event.type === 'MATCH_COMPLETED') {
      return Math.min(targetCount, Math.max(0, event.totalHumanCoins));
    }
    if (event.type === 'COINS_CHANGED' && event.playerId === 'p0') {
      return Math.min(targetCount, Math.max(0, event.newBalance));
    }
    return Math.min(targetCount, Math.max(0, profile.coins));
  }
}

export class ChopMasterAchievementEvaluator implements ProgressEvaluator {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CHOP_EXECUTED' && event.chopperPlayerId === 'p0') {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

// ============================================================================
// 3. REGISTRY & DISPATCHER FACTORY
// ============================================================================

export const QUEST_EVALUATORS: Record<string, ProgressEvaluator> = {
  daily_win_three_matches: new WinThreeMatchesEvaluator(),
  daily_high_roller: new HighRollerEvaluator(),
  daily_chop_red_two: new ChopRedTwoEvaluator(),
  daily_long_straight: new LongStraightEvaluator()
};

export const ACHIEVEMENT_EVALUATORS: Record<string, ProgressEvaluator> = {
  ach_chop_master_1: new ChopMasterAchievementEvaluator('ach_chop_master_1'),
  ach_chop_master_2: new ChopMasterAchievementEvaluator('ach_chop_master_2'),
  ach_win_streak_5: new WinStreakEvaluator('ach_win_streak_5'),
  ach_total_wins_50: new TotalWinsEvaluator('ach_total_wins_50'),
  ach_instant_win_1: new InstantWinAchievementEvaluator('ach_instant_win_1'),
  ach_millionaire: new MillionaireAchievementEvaluator('ach_millionaire')
};

/**
 * Đánh giá cập nhật toàn bộ Nhiệm Vụ Ngày dựa trên danh sách sự kiện
 */
export function evaluateDailyQuests(
  events: GameEvent[],
  quests: Quest[],
  profile: PlayerProfile
): Quest[] {
  return quests.map(quest => {
    if (quest.isCompleted) return quest;

    const evaluator = QUEST_EVALUATORS[quest.id];
    let nextCount = quest.currentCount;

    if (evaluator) {
      for (const event of events) {
        nextCount = evaluator.evaluate(event, nextCount, quest.targetCount, profile);
      }
    }

    return {
      ...quest,
      currentCount: nextCount,
      isCompleted: nextCount >= quest.targetCount
    };
  });
}

/**
 * Đánh giá cập nhật toàn bộ Thành Tựu dựa trên danh sách sự kiện
 */
export function evaluateAchievements(
  events: GameEvent[],
  achievements: Achievement[],
  profile: PlayerProfile
): Achievement[] {
  return achievements.map(ach => {
    if (ach.isCompleted) return ach;

    const evaluator = ACHIEVEMENT_EVALUATORS[ach.id];
    let nextCount = ach.currentCount;

    if (evaluator) {
      for (const event of events) {
        nextCount = evaluator.evaluate(event, nextCount, ach.targetCount, profile);
      }
    }

    return {
      ...ach,
      currentCount: nextCount,
      isCompleted: nextCount >= ach.targetCount
    };
  });
}
