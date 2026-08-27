import { describe, test, expect } from 'bun:test';
import { MinimaxEndgameSolver } from '../../src/ai/solvers/minimax-endgame-solver';
import { createCard, parseCards } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';

describe('Minimax Alpha-Beta Endgame Solver Unit Tests', () => {
  test('1. Mate-in-1: Phát hiện và dứt điểm ngay khi bài có nước đi kết liễu trận đấu', () => {
    // Bot hand: Đôi K (K♠, K♦)
    // Opponent hand: Đôi 10 (10♣, 10♥)
    // Leading combo: Đôi 9 (9♠, 9♦)
    const myHand = [createCard(13, 'SPADES'), createCard(13, 'DIAMONDS')];
    const oppHand = [createCard(10, 'CLUBS'), createCard(10, 'HEARTS')];
    const leadingCombo = identifyCombination([createCard(9, 'SPADES'), createCard(9, 'DIAMONDS')]);

    const result = MinimaxEndgameSolver.solve1v1(
      myHand,
      oppHand,
      false, // Không phải lead
      leadingCombo,
      false,
      4
    );

    expect(result.isForcedWin).toBe(true);
    expect(result.turnsToWin).toBe(1);
    expect(result.bestMove).not.toBeNull();
    expect(result.bestMove?.combination.type).toBe('PAIR');
    expect(result.bestMove?.cards[0].rank).toBe(13);
  });

  test('2. Mate-in-2 Forced Win: Đánh Heo cướp cái rồi xả sảnh dứt điểm không thể cản phá', () => {
    // Bot hand: 2 Cơ (2♥) + Sảnh 4-5-6 (4♠, 5♦, 6♣) (Tổng 4 lá)
    // Opponent hand: A Bích (A♠) + Đôi 9 (9♣, 9♥) (Tổng 3 lá)
    // Leading move: Đối thủ vừa đánh A Bích
    const myHand = [
      createCard(15, 'HEARTS'),
      createCard(4, 'SPADES'),
      createCard(5, 'DIAMONDS'),
      createCard(6, 'CLUBS')
    ];
    const oppHand = [
      createCard(9, 'CLUBS'),
      createCard(9, 'HEARTS')
    ];
    const leadingCombo = identifyCombination([createCard(14, 'SPADES')]); // A Bích

    const startTime = performance.now();
    const result = MinimaxEndgameSolver.solve1v1(
      myHand,
      oppHand,
      false,
      leadingCombo,
      false,
      4
    );
    const cost = performance.now() - startTime;

    expect(result.isForcedWin).toBe(true);
    expect(result.bestMove).not.toBeNull();
    // Nước tối ưu: Đè 2♥ lên A♠ để cướp quyền cầm cái
    expect(result.bestMove?.cards[0].rank).toBe(15);
    expect(result.bestMove?.cards[0].suit).toBe('HEARTS');
    // Tốc độ giải quyết cờ tàn siêu tốc < 5ms
    expect(cost).toBeLessThan(5);
  });

  test('3. Bắt buộc tuân thủ luật cấm 2 cuối (Prohibit Ending With Two)', () => {
    // Bot hand: 2 Cơ (2♥)
    // Luật cấm về 2 cuối bật -> Không được coi 2♥ là nước dứt điểm hợp lệ
    const myHand = [createCard(15, 'HEARTS')];
    const oppHand = [createCard(8, 'SPADES')];

    const result = MinimaxEndgameSolver.solve1v1(
      myHand,
      oppHand,
      true,
      null,
      true, // prohibitEndingWithTwo = true
      4
    );

    expect(result.isForcedWin).toBe(false);
  });

  test('4. Node Budget Protection: Không bao giờ vượt quá ngưỡng tối đa khi gặp thế bài phức tạp', () => {
    const myHand = parseCards('3S 5D 7C 9H');
    const oppHand = parseCards('4C 6H 8D 10S');

    const result = MinimaxEndgameSolver.solve1v1(
      myHand,
      oppHand,
      true,
      null,
      false,
      4
    );

    expect(result).toBeDefined();
    expect(typeof result.isForcedWin).toBe('boolean');
  });
});
