import { describe, expect, test } from 'bun:test';
import { parseCard, parseCards } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import { canBeat, isValidMove } from '../../src/engine/validator';

describe('Validator & Beating Rules (Tiến Lên Miền Nam)', () => {
  describe('Đỡ bài thông thường (Normal Beating)', () => {
    test('Rác đè Rác lớn hơn theo Rank hoặc Chất', () => {
      const card3S = identifyCombination(parseCards('3S'))!;
      const card3H = identifyCombination(parseCards('3H'))!;
      const card4S = identifyCombination(parseCards('4S'))!;
      const card2S = identifyCombination(parseCards('2S'))!;
      const card2H = identifyCombination(parseCards('2H'))!;

      expect(canBeat(card3H, card3S).valid).toBe(true);
      expect(canBeat(card4S, card3S).valid).toBe(true);
      expect(canBeat(card2S, card4S).valid).toBe(true);
      expect(canBeat(card2H, card2S).valid).toBe(true);

      // Không thể đè ngược lại
      expect(canBeat(card3S, card3H).valid).toBe(false);
      expect(canBeat(card3S, card4S).valid).toBe(false);
    });

    test('Đôi đè Đôi cùng bậc hoặc lớn hơn', () => {
      const pair4 = identifyCombination(parseCards('4S 4D'))!;
      const pair5 = identifyCombination(parseCards('5S 5C'))!;
      const pair4BiggerSuit = identifyCombination(parseCards('4C 4H'))!;

      expect(canBeat(pair5, pair4).valid).toBe(true);
      expect(canBeat(pair4BiggerSuit, pair4).valid).toBe(true);
      expect(canBeat(pair4, pair5).valid).toBe(false);
    });

    test('Sảnh đè Sảnh cùng độ dài', () => {
      const straight345 = identifyCombination(parseCards('3S 4D 5C'))!;
      const straight456 = identifyCombination(parseCards('4S 5D 6C'))!;
      const straight345Bigger = identifyCombination(parseCards('3C 4C 5H'))!;
      const straight4Cards = identifyCombination(parseCards('3S 4D 5C 6H'))!;

      expect(canBeat(straight456, straight345).valid).toBe(true);
      expect(canBeat(straight345Bigger, straight345).valid).toBe(true);

      // Khác độ dài sảnh không thể đè nhau
      expect(canBeat(straight4Cards, straight345).valid).toBe(false);
      expect(canBeat(straight345, straight4Cards).valid).toBe(false);
    });
  });

  describe('Luật Chặt Heo & Chặt Hàng (Chopping Rules)', () => {
    const single2S = identifyCombination(parseCards('2S'))!;
    const single2H = identifyCombination(parseCards('2H'))!;
    const pair2 = identifyCombination(parseCards('2S 2D'))!;
    const threePairs1 = identifyCombination(parseCards('3S 3D 4S 4D 5S 5D'))!;
    const threePairs2 = identifyCombination(parseCards('4S 4D 5S 5D 6S 6D'))!;
    const fourOfAKind1 = identifyCombination(parseCards('7S 7C 7D 7H'))!;
    const fourOfAKind2 = identifyCombination(parseCards('9S 9C 9D 9H'))!;
    const fourPairs1 = identifyCombination(parseCards('6S 6D 7S 7D 8S 8D 9S 9D'))!;
    const fourPairs2 = identifyCombination(parseCards('7S 7D 8S 8D 9S 9D 10S 10D'))!;

    test('Chặt 1 Heo', () => {
      // 1 Heo bị chặt bởi: 1 Heo lớn hơn, 3 Đôi Thông, Tứ Quý, 4 Đôi Thông
      expect(canBeat(single2H, single2S).valid).toBe(true);
      expect(canBeat(threePairs1, single2S).valid).toBe(true);
      expect(canBeat(fourOfAKind1, single2S).valid).toBe(true);
      expect(canBeat(fourPairs1, single2S).valid).toBe(true);
    });

    test('Chặt Đôi Heo', () => {
      // Đôi Heo bị chặt bởi: Tứ Quý, 4 Đôi Thông, Đôi Heo lớn hơn
      expect(canBeat(fourOfAKind1, pair2).valid).toBe(true);
      expect(canBeat(fourPairs1, pair2).valid).toBe(true);

      // 3 Đôi Thông KHÔNG chặt được Đôi Heo
      expect(canBeat(threePairs1, pair2).valid).toBe(false);
    });

    test('Chặt 3 Đôi Thông', () => {
      // 3 Đôi Thông bị chặt bởi: 3 Đôi Thông lớn hơn, Tứ Quý, 4 Đôi Thông
      expect(canBeat(threePairs2, threePairs1).valid).toBe(true);
      expect(canBeat(fourOfAKind1, threePairs1).valid).toBe(true);
      expect(canBeat(fourPairs1, threePairs1).valid).toBe(true);
    });

    test('Chặt Tứ Quý', () => {
      // Tứ Quý bị chặt bởi: Tứ Quý lớn hơn, 4 Đôi Thông
      expect(canBeat(fourOfAKind2, fourOfAKind1).valid).toBe(true);
      expect(canBeat(fourPairs1, fourOfAKind1).valid).toBe(true);

      // 3 Đôi Thông không chặt được Tứ Quý
      expect(canBeat(threePairs2, fourOfAKind1).valid).toBe(false);
    });

    test('Chặt 4 Đôi Thông', () => {
      // 4 Đôi Thông chỉ bị chặt bởi 4 Đôi Thông lớn hơn
      expect(canBeat(fourPairs2, fourPairs1).valid).toBe(true);
      expect(canBeat(fourOfAKind2, fourPairs1).valid).toBe(false);
      expect(canBeat(threePairs2, fourPairs1).valid).toBe(false);
    });
  });

  describe('Luật Ván Đầu Tiên (Bắt buộc chứa 3 Bích)', () => {
    test('ván đầu tiên phải đánh tổ hợp chứa lá 3S', () => {
      const card3S = parseCard('3S');
      const validSingle = parseCards('3S');
      const invalidSingle = parseCards('3D');
      const validStraight = parseCards('3S 4D 5C');
      const invalidStraight = parseCards('4S 5D 6C');

      expect(isValidMove({
        cards: validSingle,
        target: null,
        isFirstMoveOfGame: true,
        isLeadMove: false,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: false,
        prohibitEndingWithTwo: false
      }).valid).toBe(true);

      expect(isValidMove({
        cards: invalidSingle,
        target: null,
        isFirstMoveOfGame: true,
        isLeadMove: false,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: false,
        prohibitEndingWithTwo: false
      }).valid).toBe(false);

      expect(isValidMove({
        cards: validStraight,
        target: null,
        isFirstMoveOfGame: true,
        isLeadMove: false,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: false,
        prohibitEndingWithTwo: false
      }).valid).toBe(true);

      expect(isValidMove({
        cards: invalidStraight,
        target: null,
        isFirstMoveOfGame: true,
        isLeadMove: false,
        hasPassedRound: false,
        allowFourPairsCutAnytime: true,
        isFinishingMove: false,
        prohibitEndingWithTwo: false
      }).valid).toBe(false);
    });
  });
});
