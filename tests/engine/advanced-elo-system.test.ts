import { describe, expect, it } from 'bun:test';
import { calculateEloDelta, computeTableEloSettlement } from '../../src/engine/elo';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';
import { createCard } from '../../src/engine/card';

describe('Advanced Multi-Dimensional Elo Rating System Tests', () => {
  it('1. Base Delta theo quy mô bàn đấu: 2 người (±20), 3 người (+28/0/-28), 4 người (+40/+15/-15/-40)', () => {
    const elo = 1500;
    const oppElo = 1500; // scaling = 1.0

    // Bàn 2 người
    const soloWin = calculateEloDelta(1, elo, oppElo, 2);
    expect(soloWin.delta).toBe(20);
    expect(soloWin.breakdown.base).toBe(20);

    const soloLoss = calculateEloDelta(2, elo, oppElo, 2);
    expect(soloLoss.delta).toBe(-20);
    expect(soloLoss.breakdown.base).toBe(-20);

    // Bàn 3 người
    const trio1st = calculateEloDelta(1, elo, oppElo, 3);
    expect(trio1st.delta).toBe(28);

    const trio2nd = calculateEloDelta(2, elo, oppElo, 3);
    expect(trio2nd.delta).toBe(0);

    const trio3rd = calculateEloDelta(3, elo, oppElo, 3);
    expect(trio3rd.delta).toBe(-28);

    // Bàn 4 người
    const quad1st = calculateEloDelta(1, elo, oppElo, 4);
    expect(quad1st.delta).toBe(40);

    const quad2nd = calculateEloDelta(2, elo, oppElo, 4);
    expect(quad2nd.delta).toBe(15);

    const quad3rd = calculateEloDelta(3, elo, oppElo, 4);
    expect(quad3rd.delta).toBe(-15);

    const quad4th = calculateEloDelta(4, elo, oppElo, 4);
    expect(quad4th.delta).toBe(-40);
  });

  it('2. Kháng cự kiên cường (Damage Mitigation): Người thua còn ít lá được giảm nhẹ điểm trừ Elo', () => {
    const elo = 1500;
    const oppElo = 1500;

    // Về Ba ở bàn 4 người (gốc -15):
    // Trường hợp A: Còn đúng 1 lá bài (suýt về Nhất) -> Giảm trừ +4 Elo -> Chỉ bị trừ -11
    const heroicLoss = calculateEloDelta(3, elo, oppElo, 4, {
      remainingCards: 1
    });
    expect(heroicLoss.delta).toBe(-11);
    expect(heroicLoss.breakdown.performance).toBe(4);

    // Trường hợp B: Còn 4 lá bài -> Giảm trừ +2 Elo -> Bị trừ -13
    const activeLoss = calculateEloDelta(3, elo, oppElo, 4, {
      remainingCards: 4
    });
    expect(activeLoss.delta).toBe(-13);
    expect(activeLoss.breakdown.performance).toBe(2);

    // Trường hợp C: Còn 11 lá bài (bị áp đảo) -> Phạt thêm -3 Elo -> Bị trừ -18
    const overwhelmedLoss = calculateEloDelta(3, elo, oppElo, 4, {
      remainingCards: 11
    });
    expect(overwhelmedLoss.delta).toBe(-18);
    expect(overwhelmedLoss.breakdown.performance).toBe(-3);
  });

  it('3. Kỹ năng Chặt Heo/Hàng: Thưởng điểm khi chặt thành công & Phạt khi bị chặt hoặc thối Heo', () => {
    const elo = 1500;
    const oppElo = 1500;

    // Về Nhì (+15): Chặt được 2 lần heo (+6 Elo) -> Tổng +21 Elo
    const chopHero = calculateEloDelta(2, elo, oppElo, 4, {
      remainingCards: 3, // +2
      chopsCount: 2 // +6
    });
    expect(chopHero.delta).toBe(15 + 2 + 6); // 23
    expect(chopHero.breakdown.items.some(i => i.id === 'chopsBonus' && i.value === 6)).toBe(true);

    // Về Bét (-40): Bị chặt 1 lần (-2) và Thối 1 heo (-2) -> Tổng -44
    const carelessLoss = calculateEloDelta(4, elo, oppElo, 4, {
      gotChoppedCount: 1,
      rottenCount: 1
    });
    expect(carelessLoss.delta).toBe(-44);
    expect(carelessLoss.breakdown.performance).toBe(-4);
  });

  it('4. Bị Cóng (-8 Elo) và Ép đối thủ Cóng (+5 Elo / đối thủ)', () => {
    const elo = 1500;
    const oppElo = 1500;

    // Bị Cóng (cháy bài) ở bàn 4 người: -40 gốc + (-8 cóng) = -48 Elo
    const burntResult = calculateEloDelta(4, elo, oppElo, 4, {
      isBurnt: true
    });
    expect(burntResult.delta).toBe(-48);
    expect(burntResult.breakdown.performance).toBe(-8);

    // Về Nhất bàn 4 người (+40) và ép được 2 đối thủ bị Cóng (+10): +50 Elo
    const dominatorWin = calculateEloDelta(1, elo, oppElo, 4, {
      causedBurntCount: 2
    });
    expect(dominatorWin.delta).toBe(50);
    expect(dominatorWin.breakdown.performance).toBe(10);
  });

  it('5. Chiến thắng kỳ tích 3 Bích (+8), Tới Trắng (+4) và Thưởng Chuỗi Thắng (+3/+6)', () => {
    const elo = 1500;
    const oppElo = 1500;

    // Thắng dứt điểm bằng 3 Bích (+8) kèm chuỗi thắng 5 trận (+6) -> +40 + 8 + 6 = +54 Elo
    const threeSpadesClutch = calculateEloDelta(1, elo, oppElo, 4, {
      isThreeSpadesWin: true,
      currentStreak: 5
    });
    expect(threeSpadesClutch.delta).toBe(54);
    expect(threeSpadesClutch.breakdown.performance).toBe(8);
    expect(threeSpadesClutch.breakdown.streak).toBe(6);

    // Tới trắng (+4) với chuỗi thắng 3 trận (+3) -> +40 + 4 + 3 = +47 Elo
    const instantWinStreak = calculateEloDelta(1, elo, oppElo, 4, {
      isInstantWin: true,
      currentStreak: 3
    });
    expect(instantWinStreak.delta).toBe(47);
    expect(instantWinStreak.breakdown.performance).toBe(4);
    expect(instantWinStreak.breakdown.streak).toBe(3);
  });

  it('6. Bảo đảm an toàn: Điểm Elo không bao giờ giảm xuống dưới 100', () => {
    const lowElo = 110;
    const oppElo = 2000;

    // Thua bét bị phạt nặng
    const extremeLoss = calculateEloDelta(4, lowElo, oppElo, 4, {
      isBurnt: true,
      gotChoppedCount: 3
    });
    expect(extremeLoss.newElo).toBe(100); // Không bị âm hoặc dưới 100
  });

  it('7. computeTableEloSettlement: Bàn hỗn hợp (Người chơi p0 + 3 Bot p1, p2, p3) tính toán toàn diện, mỗi người nhận delta & breakdown riêng theo thành tích cá nhân', () => {
    const p0 = createPlayer({ id: 'p0', name: 'Người Chơi', score: 50000 });
    const p1 = createBotPlayer('p1', 'BOT_ELO_850', { name: 'Bot Nhập Môn' });
    const p2 = createBotPlayer('p2', 'BOT_ELO_1150', { name: 'Bot Khá' });
    const p3 = createBotPlayer('p3', 'BOT_ELO_1450', { name: 'Bot Cao Thủ' });

    // Giả lập ván đấu:
    // p0 về Nhất (hết bài), có chuỗi 3 trận thắng, chặt được 1 lần heo
    // p2 về Nhì (còn 2 lá bài)
    // p1 về Ba (còn 5 lá bài, bị chặt 1 lần)
    // p3 về Bét (còn 10 lá bài, thối 1 heo)
    p0.hand = [];
    p0.hasPlayedFirstCard = true;

    p2.hand = [createCard(3, 'SPADES'), createCard(4, 'CLUBS')];
    p2.hasPlayedFirstCard = true;

    p1.hand = [createCard(5, 'HEARTS'), createCard(6, 'DIAMONDS'), createCard(7, 'SPADES'), createCard(8, 'CLUBS'), createCard(9, 'HEARTS')];
    p1.hasPlayedFirstCard = true;

    p3.hand = [
      createCard(3, 'HEARTS'), createCard(4, 'DIAMONDS'), createCard(5, 'CLUBS'), createCard(6, 'HEARTS'),
      createCard(7, 'DIAMONDS'), createCard(8, 'SPADES'), createCard(9, 'CLUBS'), createCard(10, 'HEARTS'),
      createCard(11, 'DIAMONDS'), createCard(15, 'HEARTS') // lá 15 = Heo (rotten)
    ];
    p3.hasPlayedFirstCard = true;

    const players = [p0, p1, p2, p3];
    const winners = [p0, p2, p1, p3];

    const settlement = computeTableEloSettlement({
      players,
      winners,
      playerElos: {
        p0: 1200,
        p1: 850,
        p2: 1150,
        p3: 1450
      },
      chopsByPlayer: {
        p0: 1
      },
      gotChoppedByPlayer: {
        p1: 1
      },
      streaksByPlayer: {
        p0: 3
      },
      isThreeSpadesWin: false,
      isInstantWin: false
    });

    // 1. Phải tính toán đầy đủ cho CẢ 4 NGƯỜI CHƠI (người và 3 bot)
    expect(Object.keys(settlement.allEloDeltas).sort()).toEqual(['p0', 'p1', 'p2', 'p3'].sort());
    expect(Object.keys(settlement.allEloBreakdowns).sort()).toEqual(['p0', 'p1', 'p2', 'p3'].sort());

    // 2. p0 (Về Nhất, chặt 1 lần (+3), chuỗi 3 (+3))
    expect(settlement.allEloDeltas['p0']).toBeGreaterThan(40);
    expect(settlement.allEloBreakdowns['p0'].base).toBe(40);
    expect(settlement.allEloBreakdowns['p0'].streak).toBe(3);
    expect(settlement.allEloBreakdowns['p0'].performance).toBe(3); // chopsBonus = 3

    // 3. p2 (Về Nhì, còn 2 lá bài -> nhận card mitigation +4)
    expect(settlement.allEloBreakdowns['p2'].base).toBe(15);
    expect(settlement.allEloBreakdowns['p2'].performance).toBe(4);

    // 4. p1 (Về Ba, còn 5 lá (+2), bị chặt 1 lần (-2) -> performance = 0)
    expect(settlement.allEloBreakdowns['p1'].base).toBe(-15);
    expect(settlement.allEloBreakdowns['p1'].performance).toBe(0);

    // 5. p3 (Về Bét, còn 10 lá (-3), thối 1 heo (-2) -> performance = -5)
    expect(settlement.allEloBreakdowns['p3'].base).toBe(-40);
    expect(settlement.allEloBreakdowns['p3'].performance).toBe(-5);
  });

  it('8. computeTableEloSettlement: Chơi Online nhiều người (toàn người chơi thật), áp dụng cùng 1 công thức công bằng cho từng ID', () => {
    const alice = createPlayer({ id: 'user_alice', name: 'Alice (Host)', score: 100000 });
    const bob = createPlayer({ id: 'user_bob', name: 'Bob', score: 80000 });
    const charlie = createPlayer({ id: 'user_charlie', name: 'Charlie', score: 60000 });

    alice.hand = [];
    alice.hasPlayedFirstCard = true;

    bob.hand = [createCard(3, 'CLUBS')];
    bob.hasPlayedFirstCard = true;

    charlie.hand = [createCard(4, 'SPADES'), createCard(5, 'HEARTS'), createCard(6, 'DIAMONDS')];
    charlie.hasPlayedFirstCard = false; // Bị cóng

    const result = computeTableEloSettlement({
      players: [alice, bob, charlie],
      winners: [alice, bob, charlie],
      playerElos: {
        user_alice: 1500,
        user_bob: 1500,
        user_charlie: 1500
      },
      chopsByPlayer: {},
      gotChoppedByPlayer: {},
      streaksByPlayer: {},
      isThreeSpadesWin: false,
      isInstantWin: false
    });

    // Bàn 3 người:
    // Alice về Nhất (base 28, ép Charlie cóng +5) -> delta = 33
    expect(result.allEloDeltas['user_alice']).toBe(28 + 5);
    // Bob về Nhì (base 0, còn 1 lá bài +4) -> delta = 4
    expect(result.allEloDeltas['user_bob']).toBe(0 + 4);
    // Charlie về Ba (base -28, bị cóng -8) -> delta = -36
    expect(result.allEloDeltas['user_charlie']).toBe(-28 - 8);
  });
});
