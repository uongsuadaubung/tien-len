import { describe, expect, test } from 'bun:test';
import { GameEventBus, GameEvent, MatchCompletedEvent } from '../../src/engine/events/game-event-bus';
import { 
  evaluateDailyQuests, 
  evaluateAchievements,
  WinThreeMatchesEvaluator,
  ChopRedTwoEvaluator,
  MillionaireAchievementEvaluator
} from '../../src/engine/evaluators/progress-evaluators';
import { 
  identifyCombination, 
  buildCombinationRecognitionChain, 
  SingleRecognizer, 
  PairRecognizer, 
  StraightRecognizer 
} from '../../src/engine/combinations';
import { parseCards } from '../../src/engine/card';
import { createDefaultGameRules } from '../../src/engine/types';
import { 
  makeBotDecision, 
  buildBotDecisionChain, 
  EndgameSolverHandler, 
  DecisionContext 
} from '../../src/ai/decision-maker';
import { CardTracker } from '../../src/ai/card-tracker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { PlayerProfile } from '../../src/engine/storage';

describe('Design Patterns Architecture Unit Tests (Kiểm Thử Mẫu Thiết Kế)', () => {
  const createMockProfile = (): PlayerProfile => ({
    id: 'usr_test',
    name: 'Đại Gia',
    avatar: '🤠',
    coins: 50000,
    elo: 1200,
    campaignUnlockedChapter: 1,
    campaignChapterWins: {},
    loans: 0,
    dailyReliefClaimedCount: 0,
    lastDailyResetTimestamp: Date.now(),
    lastDailyResetDate: '2026-08-26',
    dailyQuests: [
      {
        id: 'daily_win_three_matches',
        title: 'Thắng 3 Ván',
        description: 'Thắng 3 ván',
        rewardCoins: 10000,
        icon: '🏆',
        targetCount: 3,
        currentCount: 0,
        isCompleted: false,
        isClaimed: false
      },
      {
        id: 'daily_high_roller',
        title: 'Đại Gia Sát Phạt',
        description: 'Về Nhất ván cược',
        rewardCoins: 100000,
        icon: '🎰',
        targetCount: 1,
        currentCount: 0,
        isCompleted: false,
        isClaimed: false
      }
    ],
    achievements: [
      {
        id: 'ach_total_wins_50',
        title: '50 Ván Thắng',
        description: '50 ván',
        rewardCoins: 100000,
        icon: '👑',
        targetCount: 50,
        currentCount: 49,
        isCompleted: false,
        isClaimed: false,
        category: 'VICTORY'
      },
      {
        id: 'ach_millionaire',
        title: 'Triệu Phú Xu',
        description: 'Đạt 1 triệu xu',
        rewardCoins: 200000,
        icon: '💎',
        targetCount: 1000000,
        currentCount: 50000,
        isCompleted: false,
        isClaimed: false,
        category: 'WEALTH'
      }
    ],
    stats: {
      gamesPlayed: 10,
      wins: 5,
      chopsDone: 2,
      congsGiven: 0,
      totalEarned: 50000,
      highestStreak: 2,
      currentStreak: 1
    },
    dailyMilestonesClaimed: { 1: false, 3: false, 5: false }
  });

  // ==========================================================================
  // 1. OBSERVER PATTERN: GameEventBus
  // ==========================================================================
  describe('1. Observer Pattern (GameEventBus)', () => {
    test('Đăng ký, phát sự kiện và hủy đăng ký chính xác', () => {
      const bus = GameEventBus.getInstance();
      bus.clear();

      let receivedWinnerId = '';
      const unsubscribe = bus.subscribe('MATCH_COMPLETED', (ev) => {
        receivedWinnerId = ev.winnerPlayerId;
      });

      const sampleEvent: MatchCompletedEvent = {
        type: 'MATCH_COMPLETED',
        activeGameType: 'QUICK',
        winnerPlayerId: 'p0',
        isHumanWinner: true,
        winners: [],
        allPlayers: [],
        payouts: { p0: 5000 },
        humanNetCoins: 5000,
        totalHumanCoins: 55000,
        betAmount: 5000,
        isThreeSpadesWin: false,
        playerCount: 4,
        congsGivenCount: 0,
        cascadeChopCount: 0,
        loanDeduction: 0,
        instantWinType: null
      };

      bus.publish(sampleEvent);
      expect(receivedWinnerId).toBe('p0');

      // Hủy đăng ký
      unsubscribe();
      receivedWinnerId = '';
      bus.publish(sampleEvent);
      expect(receivedWinnerId).toBe('');
    });
  });

  // ==========================================================================
  // 2. SPECIFICATION PATTERN: Progress Evaluators
  // ==========================================================================
  describe('2. Specification Pattern (Quest & Achievement Evaluators)', () => {
    test('Cập nhật nhiệm vụ ngày khi có sự kiện MATCH_COMPLETED thắng cuộc', () => {
      const profile = createMockProfile();
      const events: GameEvent[] = [
        {
          type: 'MATCH_COMPLETED',
          activeGameType: 'QUICK',
          winnerPlayerId: 'p0',
          isHumanWinner: true,
          winners: [],
          allPlayers: [],
          payouts: {},
          betAmount: 5000,
          humanNetCoins: 10000,
          totalHumanCoins: 60000,
          isThreeSpadesWin: false,
          playerCount: 4,
          congsGivenCount: 0,
          cascadeChopCount: 0,
          loanDeduction: 0,
          instantWinType: null
        }
      ];

      const updatedQuests = evaluateDailyQuests(events, profile.dailyQuests, profile);
      // daily_win_three_matches tăng từ 0 lên 1
      expect(updatedQuests[0].currentCount).toBe(1);
      expect(updatedQuests[0].isCompleted).toBe(false);

      // daily_high_roller hoàn thành ngay vì betAmount > 0 và thắng cuộc
      expect(updatedQuests[1].currentCount).toBe(1);
      expect(updatedQuests[1].isCompleted).toBe(true);
    });

    test('Cập nhật thành tựu trọn đời và tự động đánh dấu hoàn thành khi đạt mốc', () => {
      const profile = createMockProfile();
      const events: GameEvent[] = [
        {
          type: 'MATCH_COMPLETED',
          activeGameType: 'QUICK',
          winnerPlayerId: 'p0',
          isHumanWinner: true,
          winners: [],
          allPlayers: [],
          payouts: {},
          betAmount: 5000,
          humanNetCoins: 950000,
          totalHumanCoins: 1000000, // Đạt 1 triệu xu
          isThreeSpadesWin: false,
          playerCount: 4,
          congsGivenCount: 0,
          cascadeChopCount: 0,
          loanDeduction: 0,
          instantWinType: null
        }
      ];

      const updatedAchievements = evaluateAchievements(events, profile.achievements, profile);
      // ach_total_wins_50: 49 + 1 = 50 -> Hoàn thành!
      expect(updatedAchievements[0].currentCount).toBe(50);
      expect(updatedAchievements[0].isCompleted).toBe(true);

      // ach_millionaire: Đạt 1,000,000 -> Hoàn thành!
      expect(updatedAchievements[1].currentCount).toBe(1000000);
      expect(updatedAchievements[1].isCompleted).toBe(true);
    });
  });

  // ==========================================================================
  // 3. CHAIN OF RESPONSIBILITY: Combination Recognizers
  // ==========================================================================
  describe('3. Chain of Responsibility (Combination Recognizers)', () => {
    test('Chuỗi nhận diện tuần tự chính xác từ Rác đến Sảnh', () => {
      const singleCards = parseCards('3S');
      const pairCards = parseCards('8D 8C');
      const straightCards = parseCards('4D 5C 6H 7S 8D');
      const threePairsCards = parseCards('3S 3D 4C 4H 5D 5H');

      expect(identifyCombination(singleCards)?.type).toBe('SINGLE');
      expect(identifyCombination(pairCards)?.type).toBe('PAIR');
      expect(identifyCombination(straightCards)?.type).toBe('STRAIGHT');
      expect(identifyCombination(threePairsCards)?.type).toBe('THREE_PAIRS_SEQUENTIAL');
    });
  });

  // ==========================================================================
  // 4. CHAIN OF RESPONSIBILITY: AI Bot Decision Maker
  // ==========================================================================
  describe('4. Chain of Responsibility (AI Bot Decision Chain)', () => {
    test('Endgame Solver Handler: Dứt điểm ngay khi còn bài trên tay khớp nước đánh', () => {
      const hand = parseCards('10D JD QD KD');
      const context: DecisionContext = {
        hand,
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        tracker: new CardTracker(hand, 1.0),
        config: BOT_PERSONAS.BOT_ELO_2500,
        remainingPlayerCards: { p0: 5, p1: 4, p2: 8, p3: 10 },
        nextPlayerId: 'p0',
        rules: createDefaultGameRules(),
        hasPlayedFirstCard: true,
        isNextPlayerOneCard: false,
        prohibitEndingWithTwo: true,
        gameMode: 'TRADITIONAL',
        mctsMap: null,
        compositeRuleStrategy: null,
        opponentProfiles: null
      };

      const decision = makeBotDecision(context);
      expect(decision.type).toBe('PLAY');
      expect(decision.cards?.length).toBe(4);
      expect(decision.combination?.type).toBe('STRAIGHT');
    });

    test('Anti-Leader Intercept Handler: Chặn đối thủ còn 1 lá bài bằng bộ đôi/sảnh', () => {
      const hand = parseCards('5D 5C 8H 9S 10D');
      const context: DecisionContext = {
        hand,
        currentRoundLeadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        tracker: new CardTracker(hand, 1.0),
        config: BOT_PERSONAS.BOT_ELO_2500,
        remainingPlayerCards: { p0: 1, p1: 5, p2: 6, p3: 8 }, // p0 chỉ còn 1 lá!
        nextPlayerId: 'p0',
        rules: createDefaultGameRules(),
        hasPlayedFirstCard: true,
        isNextPlayerOneCard: true,
        prohibitEndingWithTwo: true,
        gameMode: 'TRADITIONAL',
        mctsMap: null,
        compositeRuleStrategy: null,
        opponentProfiles: null
      };

      const decision = makeBotDecision(context);
      expect(decision.type).toBe('PLAY');
      // Không được đánh rác 1 lá, phải đánh Đôi hoặc Sảnh
      expect(decision.cards!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
