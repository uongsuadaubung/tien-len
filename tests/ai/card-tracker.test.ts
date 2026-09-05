import { describe, expect, test } from 'bun:test';
import { parseCard, parseCards } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import { CardTracker } from '../../src/ai/card-tracker';
import { PlayedMove, Combination } from '../../src/engine/types';

describe('AI Card Tracker (Bộ Nhớ Đếm Bài & Suy Luận)', () => {
  const makeMove = (playerId: string, combination: Combination): PlayedMove => ({
    playerId,
    combination,
    timestamp: Date.now(),
    isChop: false
  });

  test('Theo dõi chính xác các lá bài đã xuất hiện', () => {
    const myHand = parseCards('3S 4S 5S 2H');
    const tracker = new CardTracker(myHand, 1.0); // 100% memory

    const move1 = makeMove('p2', identifyCombination(parseCards('2S 2D'))!);
    tracker.recordMove(move1);

    expect(tracker.isCardPlayed(parseCard('2S'))).toBe(true);
    expect(tracker.isCardPlayed(parseCard('2D'))).toBe(true);
    expect(tracker.isCardPlayed(parseCard('2C'))).toBe(false);

    // Heo đã thấy: 2S, 2D (và 2H trên tay mình)
    const unseenTwos = tracker.getUnseenTwos();
    expect(unseenTwos.length).toBe(1);
    expect(unseenTwos[0].code).toBe('2C');
  });

  test('Phát hiện các Rank có nguy cơ Tứ Quý còn lại trong ván', () => {
    const myHand = parseCards('3S 4S 5S');
    const tracker = new CardTracker(myHand, 1.0);

    // Bàn chơi đánh ra 10S
    tracker.recordMove(makeMove('p2', identifyCombination(parseCards('10S'))!));

    const dangerousRanks = tracker.getDangerousFourOfAKindRanks();
    // Rank 10 đã xuất hiện 1 lá nên đối thủ không thể có Tứ quý 10 nữa
    expect(dangerousRanks.includes(10)).toBe(false);
    // Rank 8 chưa xuất hiện lá nào và không có trên tay mình -> còn nguy cơ
    expect(dangerousRanks.includes(8)).toBe(true);
  });

  test('Ghi nhận đối thủ từng bỏ lượt theo kiểu tổ hợp bài và độ dài sảnh', () => {
    const myHand = parseCards('3S 4S 5S');
    const tracker = new CardTracker(myHand, 1.0);

    tracker.recordPassWithDetails('p3', identifyCombination(parseCards('3C 4C 5C 6C 7C'))!);
    expect(tracker.hasOpponentPassedOnType('p3', 'STRAIGHT')).toBe(true);
    expect(tracker.hasOpponentPassedOnStraightLength('p3', 5)).toBe(true);
    expect(tracker.hasOpponentPassedOnStraightLength('p3', 3)).toBe(false);
  });

  test('Tính toán Báo cáo an toàn ra Heo (TwoSafetyReport)', () => {
    const myHand = parseCards('3S 4S 5S 2H');
    const tracker = new CardTracker(myHand, 1.0);

    // Ban đầu chưa có lá nào ra -> còn rủi ro Tứ Quý
    const report1 = tracker.getTwoSafetyReport();
    expect(report1.isSafe).toBe(false);
    expect(report1.riskScore).toBeGreaterThan(0);

    // Đánh ra đủ mỗi rank 1 lá
    for (let r = 3; r <= 14; r++) {
      tracker.recordMove(makeMove('p1', identifyCombination(parseCards(`${r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : r}S`))!));
    }

    const report2 = tracker.getTwoSafetyReport();
    // Bây giờ mọi rank đều đã xuất hiện 1 lá -> 100% an toàn không thể có Tứ Quý!
    expect(report2.isSafe).toBe(true);
    expect(report2.dangerousFourOfAKindRanks.length).toBe(0);
  });

  test('Xác định lá bài to nhất còn lại trên bàn (isStrongestRemainingSingle)', () => {
    const myHand = parseCards('2H');
    const tracker = new CardTracker(myHand, 1.0);

    // 2 Cơ luôn là to nhất
    expect(tracker.isStrongestRemainingSingle(parseCard('2H'))).toBe(true);

    // 2 Rô (2D) chưa chắc to nhất nếu 2H chưa ra
    const tracker2 = new CardTracker(parseCards('2D'), 1.0);
    expect(tracker2.isStrongestRemainingSingle(parseCard('2D'))).toBe(false);

    // Đánh 2H ra ngoài
    tracker2.recordMove(makeMove('p1', identifyCombination(parseCards('2H'))!));
    // Bây giờ 2D trở thành to nhất!
    expect(tracker2.isStrongestRemainingSingle(parseCard('2D'))).toBe(true);
  });

  test('Solo 1v1: Giảm rủi ro hoang tưởng và xác suất Tứ Quý do nọc 26 lá', () => {
    const myHand = parseCards('3S 4S 5S 2H');
    // Bàn 4 người bình thường
    const tracker4 = new CardTracker(myHand, 1.0, 4);
    const bombProb4 = tracker4.getBombProbability();
    const safety4 = tracker4.getTwoSafetyReport();

    // Bàn Solo 1v1 (playerCount = 2)
    const tracker2 = new CardTracker(myHand, 1.0, 2);
    const bombProb2 = tracker2.getBombProbability();
    const safety2 = tracker2.getTwoSafetyReport();

    // Xác suất bomb và riskScore trong 1v1 phải thấp hơn đáng kể so với bàn 4 người
    expect(bombProb2).toBeLessThan(bombProb4);
    expect(safety2.riskScore).toBeLessThan(safety4.riskScore);
    expect(bombProb2).toBeLessThanOrEqual(0.2);
  });

  test('Bàn 3 người: Giảm rủi ro Tứ Quý do nọc 13 lá nằm giữa 1v1 và bàn 4 người', () => {
    const myHand = parseCards('3S 4S 5S 2H');
    const tracker4 = new CardTracker(myHand, 1.0, 4);
    const tracker3 = new CardTracker(myHand, 1.0, 3);
    const tracker2 = new CardTracker(myHand, 1.0, 2);

    const bombProb4 = tracker4.getBombProbability();
    const bombProb3 = tracker3.getBombProbability();
    const bombProb2 = tracker2.getBombProbability();

    const safety4 = tracker4.getTwoSafetyReport();
    const safety3 = tracker3.getTwoSafetyReport();
    const safety2 = tracker2.getTwoSafetyReport();

    // Thứ tự rủi ro: 1v1 < Bàn 3 người < Bàn 4 người
    expect(bombProb2).toBeLessThan(bombProb3);
    expect(bombProb3).toBeLessThan(bombProb4);

    expect(safety2.riskScore).toBeLessThan(safety3.riskScore);
    expect(safety3.riskScore).toBeLessThan(safety4.riskScore);
  });
});
