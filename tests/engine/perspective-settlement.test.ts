import { describe, it, expect } from 'bun:test';
import { createPerspectiveSettlement, createProvisionalOnlineGameOverState } from '../../src/engine/settlement/perspective-settlement';
import { computeRelativeTableSeats } from '../../src/engine/seating';
import { createCard } from '../../src/engine/card';
import { CAMPAIGN_CHAPTERS } from '../../src/engine/campaign';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { type Player, createDefaultGameRules } from '../../src/engine/types';

describe('Perspective Match Settlement Engine Tests', () => {
  const p0: Player = createPlayer({ id: 'human_1', name: 'Người Chơi', avatar: '😎', score: 10000 });
  const b1: Player = createBotPlayer('bot_1', 'BOT_ELO_850', { name: 'Bot 1', avatar: '🤖', score: 10000 });
  const b2: Player = createBotPlayer('bot_2', 'BOT_ELO_1150', { name: 'Bot 2', avatar: '🤠', score: 10000 });
  const b3: Player = createBotPlayer('bot_3', 'BOT_ELO_1450', { name: 'Bot 3', avatar: '👴', score: 10000 });

  it('1. Thắng trận thông thường (Standard Victory): Xếp hạng 1, tiền dương, nhãn chiến thắng chuẩn', () => {
    const players = [
      { ...p0, hand: [] },
      { ...b1, hand: [createCard(4, 'HEARTS')] },
      { ...b2, hand: [createCard(5, 'CLUBS'), createCard(6, 'DIAMONDS')] },
      { ...b3, hand: [createCard(7, 'SPADES'), createCard(8, 'HEARTS'), createCard(9, 'CLUBS')] }
    ];
    const winners = [players[0]];
    const payouts = {
      human_1: 6000,
      bot_1: -1000,
      bot_2: -2000,
      bot_3: -3000
    };
    const eloDeltas = {
      human_1: 25,
      bot_1: -5,
      bot_2: -8,
      bot_3: -12
    };

    const settlement = createPerspectiveSettlement({
      subjectPlayerId: 'human_1',
      allPlayers: players,
      winners,
      payouts,
      eloDeltas,
      subjectEloDelta: 25,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: false,
      instantWinType: null,
      activeGameType: 'QUICK',
      betAmount: 1000,
      subjectCoins: 16000
    });

    expect(settlement.isWinner).toBe(true);
    expect(settlement.rank).toBe(1);
    expect(settlement.netPayout).toBe(6000);
    expect(settlement.eloDelta).toBe(25);
    expect(settlement.scenario).toBe('STANDARD_VICTORY');
    expect(settlement.players).toHaveLength(4);

    // Người chơi đứng đầu danh sách
    expect(settlement.players[0].id).toBe('human_1');
    expect(settlement.players[0].isWinner).toBe(true);
    expect(settlement.players[0].rank).toBe(1);
    expect(settlement.players[0].rankLabelKey).toBe('victory.rank1');
    expect(settlement.players[0].netPayout).toBe(6000);

    // Người chơi thứ 2 có 1 lá bài
    expect(settlement.players[1].id).toBe('bot_1');
    expect(settlement.players[1].isWinner).toBe(false);
    expect(settlement.players[1].rank).toBe(2);
    expect(settlement.players[1].rankLabelKey).toBe('victory.lostCountingCards');
  });

  it('2. Thua trận đếm lá: Nhận diện chính xác Cóng (13 lá) và Thối Heo (còn Heo trên tay)', () => {
    // Human còn 13 lá bao gồm cả Heo Cơ (rank 15)
    const rottenTwo = createCard(15, 'HEARTS');
    const humanHand = [
      rottenTwo,
      createCard(3, 'SPADES'),
      createCard(4, 'CLUBS'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'HEARTS'),
      createCard(7, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(9, 'DIAMONDS'),
      createCard(10, 'HEARTS'),
      createCard(11, 'SPADES'),
      createCard(12, 'CLUBS'),
      createCard(13, 'DIAMONDS'),
      createCard(14, 'HEARTS')
    ];

    const players = [
      { ...p0, hand: humanHand },
      { ...b1, hand: [] },
      { ...b2, hand: [createCard(5, 'CLUBS')] },
      { ...b3, hand: [createCard(7, 'SPADES')] }
    ];
    const winners = [players[1]]; // Bot 1 thắng
    const payouts = {
      human_1: -26000,
      bot_1: 28000,
      bot_2: -1000,
      bot_3: -1000
    };

    const settlement = createPerspectiveSettlement({
      subjectPlayerId: 'human_1',
      allPlayers: players,
      winners,
      payouts,
      eloDeltas: { human_1: -20, bot_1: 20 },
      subjectEloDelta: -20,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: false,
      instantWinType: null,
      activeGameType: 'QUICK',
      betAmount: 1000,
      subjectCoins: 50000
    });

    expect(settlement.isWinner).toBe(false);
    expect(settlement.netPayout).toBe(-26000);
    expect(settlement.scenario).toBe('STANDARD_DEFEAT');

    const humanView = settlement.players.find(p => p.id === 'human_1');
    expect(humanView).toBeDefined();
    expect(humanView?.isCong).toBe(true);
    expect(humanView?.hasRottenTwo).toBe(true);
    expect(humanView?.remainingCards).toHaveLength(13);
  });

  it('3. Tới Trắng (Instant Win): Gán huy hiệu Tới Trắng và xử phạt người thua', () => {
    const players = [
      { ...p0, hand: [createCard(3, 'SPADES')] },
      { ...b1, hand: [] }, // Thắng tới trắng
      { ...b2, hand: [createCard(5, 'CLUBS')] },
      { ...b3, hand: [createCard(7, 'SPADES')] }
    ];
    const winners = [players[1]];
    const payouts = {
      human_1: -26000,
      bot_1: 78000,
      bot_2: -26000,
      bot_3: -26000
    };

    const settlement = createPerspectiveSettlement({
      subjectPlayerId: 'human_1',
      allPlayers: players,
      winners,
      payouts,
      eloDeltas: {},
      subjectEloDelta: 0,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: false,
      instantWinType: 'DRAGON_STRAIGHT',
      activeGameType: 'QUICK',
      betAmount: 1000,
      subjectCoins: 50000
    });

    expect(settlement.instantWinType).toBe('DRAGON_STRAIGHT');
    expect(settlement.instantWinKey).toBe('victory.instantWinTypes.DRAGON_STRAIGHT');

    const winnerView = settlement.players[0];
    expect(winnerView.id).toBe('bot_1');
    expect(winnerView.rankLabelKey).toBe('victory.instantWinBadge');
    expect(winnerView.rankLabelParams).toEqual({ typeKey: 'victory.instantWinTypes.DRAGON_STRAIGHT' });

    const loserHumanView = settlement.players.find(p => p.id === 'human_1');
    expect(loserHumanView?.rankLabelKey).toBe('victory.instantWinPenalty');
  });

  it('4. Giải tán bàn đấu khi người chơi hoặc Bot không đủ tiền cược', () => {
    const players = [
      { ...p0, hand: [] },
      { ...b1, hand: [createCard(4, 'HEARTS')] }
    ];
    const winners = [players[0]];

    // Kịch bản 1: Người chơi hết tiền
    const bankruptHumanSettlement = createPerspectiveSettlement({
      subjectPlayerId: 'human_1',
      allPlayers: players,
      winners,
      payouts: { human_1: -10000, bot_1: 10000 },
      eloDeltas: {},
      subjectEloDelta: 0,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: false,
      instantWinType: null,
      activeGameType: 'QUICK',
      betAmount: 5000,
      subjectCoins: 2000 // Thấp hơn betAmount 5000
    });
    expect(bankruptHumanSettlement.scenario).toBe('TABLE_DISMISSED_HUMAN_BANKRUPT');
    expect(bankruptHumanSettlement.isTableDismissed).toBe(true);
    expect(bankruptHumanSettlement.isSubjectBankrupt).toBe(true);

    // Kịch bản 2: Bot hết tiền
    const bankruptBotPlayer = { ...b1, score: 500 };
    const bankruptBotSettlement = createPerspectiveSettlement({
      subjectPlayerId: 'human_1',
      allPlayers: [p0, bankruptBotPlayer],
      winners,
      payouts: { human_1: 1000, bot_1: -1000 },
      eloDeltas: {},
      subjectEloDelta: 0,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: false,
      instantWinType: null,
      activeGameType: 'QUICK',
      betAmount: 2000,
      subjectCoins: 50000 // Người chơi dư dả
    });
    expect(bankruptBotSettlement.scenario).toBe('TABLE_DISMISSED_BOT_BANKRUPT');
    expect(bankruptBotSettlement.isTableDismissed).toBe(true);
    expect(bankruptBotSettlement.bankruptPlayerNames).toContain('Bot 1');
  });

  it('5. Chế độ Campaign: Phân định đúng kịch bản Mở Chương Mới vs Toàn Thắng vs Thua', () => {
    const players = [{ ...p0, hand: [] }, { ...b1, hand: [createCard(4, 'HEARTS')] }];
    const winners = [players[0]];

    // Mở chương tiếp theo
    const campaignNext = createPerspectiveSettlement({
      subjectPlayerId: 'human_1',
      allPlayers: players,
      winners,
      payouts: { human_1: 5000, bot_1: -500 },
      eloDeltas: {},
      subjectEloDelta: 0,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: false,
      instantWinType: null,
      activeGameType: 'CAMPAIGN',
      campaignChapter: CAMPAIGN_CHAPTERS[0],
      betAmount: 1000,
      subjectCoins: 20000,
      campaignResultMeta: {
        status: 'NEXT_UNLOCKED',
        isUnlockedNext: true,
        isAllCompleted: false,
        nextChapter: CAMPAIGN_CHAPTERS[1],
        currentWins: 3
      }
    });
    expect(campaignNext.scenario).toBe('CAMPAIGN_WON_NEXT_UNLOCKED');

    // Thất bại trong chiến dịch
    const campaignDefeat = createPerspectiveSettlement({
      subjectPlayerId: 'human_1',
      allPlayers: players,
      winners: [players[1]], // Bot thắng
      payouts: { human_1: -2000, bot_1: 2000 },
      eloDeltas: {},
      subjectEloDelta: 0,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: false,
      instantWinType: null,
      activeGameType: 'CAMPAIGN',
      campaignChapter: CAMPAIGN_CHAPTERS[0],
      betAmount: 1000,
      subjectCoins: 20000,
      campaignResultMeta: null
    });
    expect(campaignDefeat.scenario).toBe('CAMPAIGN_DEFEAT');
  });

  it('6. Phân bổ ghế tương đối (computeRelativeTableSeats) đúng chuẩn theo perspective', () => {
    // Bàn 2 người (Solo 1v1): Đối thủ luôn ở vị trí TOP
    const seats1v1 = computeRelativeTableSeats('human_1', [p0, b1]);
    expect(seats1v1.isSolo1v1).toBe(true);
    expect(seats1v1.topPlayer?.id).toBe('bot_1');
    expect(seats1v1.leftPlayer).toBeNull();
    expect(seats1v1.rightPlayer).toBeNull();

    // Bàn 4 người: Đối thủ được chia đều Left, Top, Right theo chiều kim đồng hồ
    const seats4p = computeRelativeTableSeats('human_1', [p0, b1, b2, b3]);
    expect(seats4p.isSolo1v1).toBe(false);
    expect(seats4p.leftPlayer?.id).toBe('bot_1');
    expect(seats4p.topPlayer?.id).toBe('bot_2');
    expect(seats4p.rightPlayer?.id).toBe('bot_3');
  });

  it('7. Fast-Fail: Ném ngoại lệ khi subjectPlayerId không tồn tại trong allPlayers (Cấm fallback ngầm)', () => {
    const players = [{ ...p0, hand: [] }, { ...b1, hand: [] }];
    expect(() => {
      createPerspectiveSettlement({
        subjectPlayerId: 'non_existent_player',
        allPlayers: players,
        winners: [players[0]],
        payouts: { human_1: 1000, bot_1: -1000 },
        eloDeltas: {},
        subjectEloDelta: 0,
        subjectEloBreakdown: null,
        loanDeduction: 0,
        isThreeSpadesWin: false,
        instantWinType: null,
        activeGameType: 'QUICK',
        betAmount: 1000,
        subjectCoins: 10000
      });
    }).toThrow('Invariant violated: subjectPlayerId "non_existent_player" does not exist in allPlayers');
  });

  it('8. Fast-Fail: Ném ngoại lệ khi payouts bị thiếu người chơi (Cấm fallback ?? 0)', () => {
    const players = [{ ...p0, hand: [] }, { ...b1, hand: [] }];
    expect(() => {
      createPerspectiveSettlement({
        subjectPlayerId: 'human_1',
        allPlayers: players,
        winners: [players[0]],
        payouts: { human_1: 1000 }, // Thiếu bot_1
        eloDeltas: {},
        subjectEloDelta: 0,
        subjectEloBreakdown: null,
        loanDeduction: 0,
        isThreeSpadesWin: false,
        instantWinType: null,
        activeGameType: 'QUICK',
        betAmount: 1000,
        subjectCoins: 10000
      });
    }).toThrow('Invariant violated: Missing payout entry for player "bot_1"');
  });

  it('9. createProvisionalOnlineGameOverState: Tự động điền 0 cho payouts và eloDeltas, tạo GameOverMatchState chuẩn Non-Nullable', () => {
    const players = [{ ...p0, hand: [] }, { ...b1, hand: [createCard(4, 'HEARTS')] }];
    const winners = [players[0]];

    const gameOverState = createProvisionalOnlineGameOverState({
      gameNumber: 1,
      players,
      winners,
      winningMove: null,
      isThreeSpadesWin: false,
      instantWinType: null,
      matchPayouts: {},
      allEloDeltas: {},
      subjectPlayerId: 'human_1',
      subjectCoins: 10000,
      betAmount: 1000,
      rules: createDefaultGameRules(),
      matchLogReport: null,
      existingSettlement: null
    });

    expect(gameOverState.status).toBe('GAME_OVER');
    expect(gameOverState.settlement).toBeDefined();
    expect(gameOverState.settlement.scenario).toBe('ONLINE');
    expect(gameOverState.matchPayouts['human_1']).toBe(0);
    expect(gameOverState.matchPayouts['bot_1']).toBe(0);
    expect(gameOverState.eloDeltas['human_1']).toBe(0);
    expect(gameOverState.eloDeltas['bot_1']).toBe(0);
    expect(gameOverState.settlement.players).toHaveLength(2);
  });
});
