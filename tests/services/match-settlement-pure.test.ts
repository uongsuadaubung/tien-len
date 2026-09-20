import { describe, expect, it } from 'bun:test';
import { 
  computeAuthoritativeSettlement, 
  type AuthoritativeSettlementInput 
} from '../../src/services/match-settlement-service';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { DEFAULT_PROFILE } from '../../src/engine/storage';
import { CAMPAIGN_CHAPTERS } from '../../src/engine/campaign';

describe('Pure Domain Settlement Unit Tests (computeAuthoritativeSettlement)', () => {
  it('1. Tính toán kết toán ván thắng thông thường (Normal Win) - Tăng chuỗi thắng, số trận và số dư Xu', () => {
    const human = createPlayer({ id: 'human_0', name: 'Đấu Thủ', avatar: '🤠' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1000', { name: 'Bot 1' });
    const profile = {
      ...DEFAULT_PROFILE,
      coins: 50000,
      elo: 1000,
      stats: {
        ...DEFAULT_PROFILE.stats,
        gamesPlayed: 5,
        wins: 3,
        currentStreak: 2,
        highestStreak: 2,
        totalEarned: 15000
      }
    };

    const input: AuthoritativeSettlementInput = {
      humanPlayerId: 'human_0',
      payouts: { human_0: 10000, bot_1: -10000 },
      eloDeltas: { human_0: 25, bot_1: -25 },
      eloDelta: 25,
      isVictoryModalRanked: true,
      winners: [human, bot],
      allPlayers: [human, bot],
      betAmount: 1000,
      isThreeSpadesWin: false,
      instantWinType: null,
      heldDeposit: 0,
      congsGivenCount: 0,
      activeGameType: 'QUICK'
    };

    const result = computeAuthoritativeSettlement(input, profile);

    expect(result.updatedProfile.coins).toBe(60000);
    expect(result.updatedProfile.elo).toBe(1025);
    expect(result.updatedProfile.stats.gamesPlayed).toBe(6);
    expect(result.updatedProfile.stats.wins).toBe(4);
    expect(result.updatedProfile.stats.currentStreak).toBe(3);
    expect(result.updatedProfile.stats.highestStreak).toBe(3);
    expect(result.updatedProfile.stats.totalEarned).toBe(25000);

    expect(result.matchCompletedEvent.isHumanWinner).toBe(true);
    expect(result.matchCompletedEvent.totalHumanCoins).toBe(60000);
    expect(result.matchCompletedEvent.humanNetCoins).toBe(10000);
    expect(result.loanSettlement.loanDeduction).toBe(0);
  });

  it('2. Tính toán kết toán khi có nợ ngân hàng và thắng tiền - Trích thu nợ và bảo hộ sàn 26.000 Xu', () => {
    const human = createPlayer({ id: 'human_0', name: 'Đấu Thủ' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1000');
    const profile = {
      ...DEFAULT_PROFILE,
      coins: 20000,
      loans: 30000,
      activeLoan: {
        packageId: 'tiep_suc',
        initialAmount: 20000,
        interestPerMatchPercent: 2,
        graceMatches: 5,
        winDeductionPercent: 30,
        overdueDeductionPercent: 60,
        matchesPlayed: 1,
        createdAt: Date.now()
      }
    };

    const input: AuthoritativeSettlementInput = {
      humanPlayerId: 'human_0',
      payouts: { human_0: 20000, bot_1: -20000 },
      eloDeltas: { human_0: 10, bot_1: -10 },
      eloDelta: 10,
      isVictoryModalRanked: false,
      winners: [human, bot],
      allPlayers: [human, bot],
      betAmount: 1000,
      isThreeSpadesWin: false,
      instantWinType: null,
      heldDeposit: 0,
      congsGivenCount: 0,
      activeGameType: 'QUICK'
    };

    const result = computeAuthoritativeSettlement(input, profile);

    // Có trừ nợ và số dư Xu bảo đảm không thấp hơn sàn cọc
    expect(result.loanSettlement.loanDeduction).toBeGreaterThan(0);
    expect(result.updatedProfile.loans).toBeLessThan(30000 + result.loanSettlement.interestAdded);
    expect(result.updatedProfile.coins).toBeGreaterThanOrEqual(26000);
    expect(result.matchCompletedEvent.loanDeduction).toBe(result.loanSettlement.loanDeduction);
  });

  it('3. Kết toán ván thắng Tới Trắng (Instant Win)', () => {
    const human = createPlayer({ id: 'human_0', name: 'Đấu Thủ' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1000');
    const profile = DEFAULT_PROFILE;

    const input: AuthoritativeSettlementInput = {
      humanPlayerId: 'human_0',
      payouts: { human_0: 26000, bot_1: -26000 },
      eloDeltas: { human_0: 30, bot_1: -30 },
      eloDelta: 30,
      isVictoryModalRanked: true,
      winners: [human],
      allPlayers: [human, bot],
      betAmount: 1000,
      isThreeSpadesWin: false,
      instantWinType: 'DRAGON_STRAIGHT',
      heldDeposit: 0,
      congsGivenCount: 0,
      activeGameType: 'QUICK'
    };

    const result = computeAuthoritativeSettlement(input, profile);

    expect(result.matchCompletedEvent.instantWinType).toBe('DRAGON_STRAIGHT');
    expect(result.matchCompletedEvent.isHumanWinner).toBe(true);
    expect(result.updatedProfile.stats.wins).toBe(profile.stats.wins + 1);
  });

  it('4. Chế độ Campaign: Mở khóa chương kế tiếp khi đủ số trận thắng yêu cầu', () => {
    const chapter1 = CAMPAIGN_CHAPTERS[0];
    const human = createPlayer({ id: 'human_0', name: 'Đấu Thủ' });
    const bot = createBotPlayer('bot_1', 'BOT_ELO_1000');
    const profile = {
      ...DEFAULT_PROFILE,
      campaignUnlockedChapter: 1,
      campaignChapterWins: { [chapter1.id]: chapter1.requiredWins - 1 }
    };

    const input: AuthoritativeSettlementInput = {
      humanPlayerId: 'human_0',
      payouts: { human_0: 5000, bot_1: -5000 },
      eloDeltas: {},
      eloDelta: 0,
      isVictoryModalRanked: false,
      winners: [human, bot],
      allPlayers: [human, bot],
      betAmount: 1000,
      isThreeSpadesWin: false,
      instantWinType: null,
      heldDeposit: 0,
      congsGivenCount: 0,
      activeGameType: 'CAMPAIGN',
      campaignChapter: chapter1
    };

    const result = computeAuthoritativeSettlement(input, profile);

    expect(result.updatedProfile.campaignUnlockedChapter).toBe(2);
    expect(result.campaignResultMeta?.isUnlockedNext).toBe(true);
  });

  it('5. Invariant Guards: Bắt buộc có payout cho humanPlayerId', () => {
    const human = createPlayer({ id: 'human_0' });
    const profile = DEFAULT_PROFILE;

    const invalidInput = {
      humanPlayerId: 'human_0',
      payouts: {}, // Thiếu payout cho human_0
      eloDeltas: {},
      eloDelta: 0,
      isVictoryModalRanked: false,
      winners: [human],
      allPlayers: [human],
      betAmount: 1000,
      isThreeSpadesWin: false,
      instantWinType: null,
      heldDeposit: 0,
      congsGivenCount: 0,
      activeGameType: 'QUICK' as const
    };

    expect(() => computeAuthoritativeSettlement(invalidInput, profile)).toThrow(
      /Missing payout entry for humanPlayerId/
    );
  });
});
