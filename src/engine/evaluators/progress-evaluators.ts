import { Quest, Achievement } from '../quests';
import { PlayerProfile } from '../storage';
import { GameEvent } from '../events/game-event-bus';
import { CAMPAIGN_CHAPTERS } from '../campaign';

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
// 1. EVALUATORS CHO KHO NHIỆM VỤ NGÀY (DAILY QUESTS)
// ============================================================================

export class PlayMatchesEvaluator implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED') {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class WinMatchesEvaluator implements ProgressEvaluator {
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

export class WinStreakEvaluatorGeneric implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number, profile: PlayerProfile): number {
    if (event.type === 'MATCH_COMPLETED') {
      const streak = event.isHumanWinner ? profile.stats.currentStreak + 1 : 0;
      return Math.min(targetCount, Math.max(currentCount, streak));
    }
    return currentCount;
  }
}

export class ChopAnyTwoEvaluator implements ProgressEvaluator {
  readonly id = 'daily_chop_any_two';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CHOP_EXECUTED' && event.chopperPlayerId === 'p0') {
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

export class ChopBlackTwoEvaluator implements ProgressEvaluator {
  readonly id = 'daily_chop_black_two';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CHOP_EXECUTED' && event.chopperPlayerId === 'p0') {
      const hasBlackTwo = event.choppingCards.some(c => c.rank === 15 && (c.suit === 'SPADES' || c.suit === 'CLUBS'));
      if (hasBlackTwo) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class ChopPairTwoOrGoodsEvaluator implements ProgressEvaluator {
  readonly id = 'daily_chop_pair_two_or_goods';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CHOP_EXECUTED' && event.chopperPlayerId === 'p0') {
      const isFourOfAKind = event.choppingCards.length === 4 && event.choppingCards.every(c => c.rank === event.choppingCards[0].rank);
      const isPairsConsecutive = event.choppingCards.length >= 6;
      if (isFourOfAKind || isPairsConsecutive || event.choppingCards.length >= 2) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class CascadeChopEvaluator implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CHOP_EXECUTED' && event.chopperPlayerId === 'p0') {
      if (event.isCascadeChop || event.chopChainCount >= 2) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class InflictCongEvaluator implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner && event.congsGivenCount > 0) {
      return Math.min(targetCount, currentCount + event.congsGivenCount);
    }
    return currentCount;
  }
}

export class PayOffLoanEvaluator implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.loanDeduction > 0) {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class PlayCombinationTypeEvaluator implements ProgressEvaluator {
  readonly id: string;
  readonly comboType: string;
  readonly minCardsCount: number;

  constructor(id: string, comboType: string, minCardsCount: number = 0) {
    this.id = id;
    this.comboType = comboType;
    this.minCardsCount = minCardsCount;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CARD_PLAYED' && event.playerId === 'p0') {
      if (event.combination.type === this.comboType) {
        if (this.minCardsCount === 0 || event.combination.cards.length >= this.minCardsCount) {
          return Math.min(targetCount, currentCount + 1);
        }
      }
    }
    return currentCount;
  }
}

export class PlaySinglesEvaluator implements ProgressEvaluator {
  readonly id = 'daily_play_ten_singles';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CARD_PLAYED' && event.playerId === 'p0' && event.combination.type === 'SINGLE') {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class EndingMoveTypeEvaluator implements ProgressEvaluator {
  readonly id: string;
  readonly comboType: string;

  constructor(id: string, comboType: string) {
    this.id = id;
    this.comboType = comboType;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CARD_PLAYED' && event.playerId === 'p0' && event.remainingCardsCount === 0) {
      if (event.combination.type === this.comboType) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class EndingThreeSpadesEvaluator implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string = 'daily_ending_three_spades') {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner && event.isThreeSpadesWin) {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class ModeWinEvaluator implements ProgressEvaluator {
  readonly id: string;
  readonly matchGameType: string;

  constructor(id: string, matchGameType: string) {
    this.id = id;
    this.matchGameType = matchGameType;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner) {
      if (
        event.activeGameType === this.matchGameType ||
        (this.matchGameType === 'TRADITIONAL' && event.activeGameType === 'QUICK') ||
        (this.matchGameType === 'RANKED' && event.activeGameType === 'QUICK')
      ) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class RankedMatchEvaluator implements ProgressEvaluator {
  readonly id = 'daily_ranked_match';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && (event.activeGameType === 'RANKED' || event.activeGameType === 'QUICK')) {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class PlayerCountWinEvaluator implements ProgressEvaluator {
  readonly id: string;
  readonly expectedCount: number;

  constructor(id: string, expectedCount: number) {
    this.id = id;
    this.expectedCount = expectedCount;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner) {
      if (event.playerCount === this.expectedCount || event.allPlayers?.length === this.expectedCount) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class LuckyWheelSpinEvaluator implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'WHEEL_SPUN') {
      return Math.min(targetCount, currentCount + 1);
    }
    return currentCount;
  }
}

export class EarnCoinsEvaluator implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.humanNetCoins > 0) {
      return Math.min(targetCount, currentCount + event.humanNetCoins);
    }
    return currentCount;
  }
}

export class HighRollerEvaluator implements ProgressEvaluator {
  readonly id: string;
  readonly minBet: number;

  constructor(id: string, minBet: number = 1000) {
    this.id = id;
    this.minBet = minBet;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner && event.betAmount >= this.minBet) {
      return Math.min(targetCount, currentCount + 1);
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

export class InstantWinAchievementEvaluator implements ProgressEvaluator {
  readonly id: string;
  readonly specificType: string | null;

  constructor(id: string, specificType: string | null = null) {
    this.id = id;
    this.specificType = specificType;
  }

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'INSTANT_WIN' && event.winnerPlayerId === 'p0') {
      if (!this.specificType || event.instantWinType === this.specificType) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    if (event.type === 'MATCH_COMPLETED' && event.isHumanWinner && event.instantWinType) {
      if (!this.specificType || event.instantWinType === this.specificType) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class DebtFreeAchievementEvaluator implements ProgressEvaluator {
  readonly id = 'ach_debt_free';

  evaluate(event: GameEvent, currentCount: number, targetCount: number, profile: PlayerProfile): number {
    if (event.type === 'MATCH_COMPLETED' && profile.loans === 0 && event.loanDeduction > 0) {
      return targetCount;
    }
    return currentCount;
  }
}

export class WealthAchievementEvaluator implements ProgressEvaluator {
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

export class ChopGoodsAchievementEvaluator implements ProgressEvaluator {
  readonly id = 'ach_chop_goods_10';

  evaluate(event: GameEvent, currentCount: number, targetCount: number): number {
    if (event.type === 'CHOP_EXECUTED' && event.chopperPlayerId === 'p0') {
      const isFourOfAKind = event.choppingCards.length === 4 && event.choppingCards.every(c => c.rank === event.choppingCards[0].rank);
      const isPairsConsecutive = event.choppingCards.length >= 6;
      if (isFourOfAKind || isPairsConsecutive) {
        return Math.min(targetCount, currentCount + 1);
      }
    }
    return currentCount;
  }
}

export class RankedEloAchievementEvaluator implements ProgressEvaluator {
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }

  evaluate(event: GameEvent, _currentCount: number, targetCount: number, profile: PlayerProfile): number {
    if (event.type === 'MATCH_COMPLETED' && (event.activeGameType === 'RANKED' || event.activeGameType === 'QUICK')) {
      return Math.min(targetCount, Math.max(0, profile.elo));
    }
    return Math.min(targetCount, Math.max(0, profile.elo));
  }
}

export class CampaignAllClearAchievementEvaluator implements ProgressEvaluator {
  readonly id = 'ach_campaign_all_clear';

  evaluate(_event: GameEvent, _currentCount: number, targetCount: number, profile: PlayerProfile): number {
    let completedChaptersCount = 0;
    const winsMap = profile.campaignChapterWins || {};

    for (const chapter of CAMPAIGN_CHAPTERS) {
      const wins = winsMap[chapter.id] || 0;
      if (wins >= chapter.requiredWins || (profile.campaignUnlockedChapter || 1) > chapter.id) {
        completedChaptersCount++;
      }
    }

    return Math.min(targetCount, completedChaptersCount);
  }
}

// Backward compatibility alias for tests
export const WinThreeMatchesEvaluator = WinMatchesEvaluator;
export const MillionaireAchievementEvaluator = WealthAchievementEvaluator;

// ============================================================================
// 3. REGISTRY & DISPATCHER FACTORY (42 DAILY QUESTS + 34 ACHIEVEMENTS)
// ============================================================================

export const QUEST_EVALUATORS: Record<string, ProgressEvaluator> = {
  daily_play_three_matches: new PlayMatchesEvaluator('daily_play_three_matches'),
  daily_play_five_matches: new PlayMatchesEvaluator('daily_play_five_matches'),
  daily_win_two_matches: new WinMatchesEvaluator('daily_win_two_matches'),
  daily_win_three_matches: new WinMatchesEvaluator('daily_win_three_matches'),
  daily_win_streak_2: new WinStreakEvaluatorGeneric('daily_win_streak_2'),
  daily_win_streak_3: new WinStreakEvaluatorGeneric('daily_win_streak_3'),

  daily_chop_any_two: new ChopAnyTwoEvaluator(),
  daily_chop_red_two: new ChopRedTwoEvaluator(),
  daily_chop_black_two: new ChopBlackTwoEvaluator(),
  daily_chop_pair_two_or_goods: new ChopPairTwoOrGoodsEvaluator(),
  daily_cascade_chop: new CascadeChopEvaluator('daily_cascade_chop'),
  daily_inflict_cong: new InflictCongEvaluator('daily_inflict_cong'),
  daily_pay_off_loan: new PayOffLoanEvaluator('daily_pay_off_loan'),

  daily_play_quad: new PlayCombinationTypeEvaluator('daily_play_quad', 'FOUR_OF_A_KIND'),
  daily_play_three_pairs_seq: new PlayCombinationTypeEvaluator('daily_play_three_pairs_seq', 'THREE_PAIRS_SEQUENTIAL'),
  daily_play_four_pairs_seq: new PlayCombinationTypeEvaluator('daily_play_four_pairs_seq', 'FOUR_PAIRS_SEQUENTIAL'),
  daily_long_straight: new PlayCombinationTypeEvaluator('daily_long_straight', 'STRAIGHT', 5),
  daily_super_long_straight: new PlayCombinationTypeEvaluator('daily_super_long_straight', 'STRAIGHT', 6),
  daily_play_three_straights: new PlayCombinationTypeEvaluator('daily_play_three_straights', 'STRAIGHT'),
  daily_play_three_pairs: new PlayCombinationTypeEvaluator('daily_play_three_pairs', 'PAIR'),
  daily_play_two_triples: new PlayCombinationTypeEvaluator('daily_play_two_triples', 'TRIPLE'),
  daily_play_ten_singles: new PlaySinglesEvaluator(),

  daily_ending_three_spades: new EndingThreeSpadesEvaluator('daily_ending_three_spades'),
  daily_ending_pair: new EndingMoveTypeEvaluator('daily_ending_pair', 'PAIR'),
  daily_ending_straight: new EndingMoveTypeEvaluator('daily_ending_straight', 'STRAIGHT'),
  daily_ending_triple: new EndingMoveTypeEvaluator('daily_ending_triple', 'TRIPLE'),

  daily_count_cards_win: new ModeWinEvaluator('daily_count_cards_win', 'COUNT_CARDS'),
  daily_winner_takes_all_win: new ModeWinEvaluator('daily_winner_takes_all_win', 'WINNER_TAKES_ALL'),
  daily_traditional_win: new ModeWinEvaluator('daily_traditional_win', 'TRADITIONAL'),
  daily_ranked_match: new RankedMatchEvaluator(),
  daily_ranked_win: new ModeWinEvaluator('daily_ranked_win', 'RANKED'),
  daily_campaign_win: new ModeWinEvaluator('daily_campaign_win', 'CAMPAIGN'),
  daily_solo_win: new PlayerCountWinEvaluator('daily_solo_win', 2),
  daily_three_players_win: new PlayerCountWinEvaluator('daily_three_players_win', 3),

  daily_lucky_wheel_spin: new LuckyWheelSpinEvaluator('daily_lucky_wheel_spin'),
  daily_lucky_wheel_spin_3: new LuckyWheelSpinEvaluator('daily_lucky_wheel_spin_3'),
  daily_earn_50k_coins: new EarnCoinsEvaluator('daily_earn_50k_coins'),
  daily_earn_100k_coins: new EarnCoinsEvaluator('daily_earn_100k_coins'),
  daily_earn_250k_coins: new EarnCoinsEvaluator('daily_earn_250k_coins'),
  daily_high_roller: new HighRollerEvaluator('daily_high_roller', 1000),
  daily_super_high_roller: new HighRollerEvaluator('daily_super_high_roller', 2000)
};

export const ACHIEVEMENT_EVALUATORS: Record<string, ProgressEvaluator> = {
  ach_chop_master_1: new ChopMasterAchievementEvaluator('ach_chop_master_1'),
  ach_chop_master_2: new ChopMasterAchievementEvaluator('ach_chop_master_2'),
  ach_chop_master_3: new ChopMasterAchievementEvaluator('ach_chop_master_3'),
  ach_chop_goods_10: new ChopGoodsAchievementEvaluator(),
  ach_cascade_chop_10: new CascadeChopEvaluator('ach_cascade_chop_10'),
  ach_cong_master_10: new InflictCongEvaluator('ach_cong_master_10'),
  ach_quad_master_10: new PlayCombinationTypeEvaluator('ach_quad_master_10', 'FOUR_OF_A_KIND'),
  ach_three_pairs_seq_10: new PlayCombinationTypeEvaluator('ach_three_pairs_seq_10', 'THREE_PAIRS_SEQUENTIAL'),

  ach_total_wins_10: new TotalWinsEvaluator('ach_total_wins_10'),
  ach_total_wins_20: new TotalWinsEvaluator('ach_total_wins_20'),
  ach_total_wins_50: new TotalWinsEvaluator('ach_total_wins_50'),
  ach_total_wins_100: new TotalWinsEvaluator('ach_total_wins_100'),
  ach_win_streak_3: new WinStreakEvaluatorGeneric('ach_win_streak_3'),
  ach_win_streak_5: new WinStreakEvaluatorGeneric('ach_win_streak_5'),
  ach_win_streak_10: new WinStreakEvaluatorGeneric('ach_win_streak_10'),
  ach_solo_master_20: new PlayerCountWinEvaluator('ach_solo_master_20', 2),

  ach_wealth_200k: new WealthAchievementEvaluator('ach_wealth_200k'),
  ach_wealth_500k: new WealthAchievementEvaluator('ach_wealth_500k'),
  ach_wealth_1m: new WealthAchievementEvaluator('ach_wealth_1m'),
  ach_millionaire: new WealthAchievementEvaluator('ach_millionaire'),
  ach_billionaire: new WealthAchievementEvaluator('ach_billionaire'),
  ach_wealth_20m: new WealthAchievementEvaluator('ach_wealth_20m'),
  ach_high_roller_win_50: new HighRollerEvaluator('ach_high_roller_win_50', 1000),
  ach_wheel_spins_20: new LuckyWheelSpinEvaluator('ach_wheel_spins_20'),
  ach_debt_free: new DebtFreeAchievementEvaluator(),

  ach_instant_win_1: new InstantWinAchievementEvaluator('ach_instant_win_1', null),
  ach_instant_win_3: new InstantWinAchievementEvaluator('ach_instant_win_3', null),
  ach_dragon_straight: new InstantWinAchievementEvaluator('ach_dragon_straight', 'DRAGON_STRAIGHT'),
  ach_four_twos: new InstantWinAchievementEvaluator('ach_four_twos', 'FOUR_TWOS'),
  ach_five_pairs_seq: new InstantWinAchievementEvaluator('ach_five_pairs_seq', 'FIVE_PAIRS_SEQUENTIAL'),
  ach_same_color: new InstantWinAchievementEvaluator('ach_same_color', 'SAME_COLOR_13'),
  ach_ending_three_spades_3: new EndingThreeSpadesEvaluator('ach_ending_three_spades_3'),
  ach_ending_three_spades_10: new EndingThreeSpadesEvaluator('ach_ending_three_spades_10'),
  ach_campaign_all_clear: new CampaignAllClearAchievementEvaluator(),
  ach_ranked_master_1400: new RankedEloAchievementEvaluator('ach_ranked_master_1400'),
  ach_ranked_grandmaster_1600: new RankedEloAchievementEvaluator('ach_ranked_grandmaster_1600'),
  ach_ranked_legend_1800: new RankedEloAchievementEvaluator('ach_ranked_legend_1800'),
  ach_ranked_god_2000: new RankedEloAchievementEvaluator('ach_ranked_god_2000')
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
