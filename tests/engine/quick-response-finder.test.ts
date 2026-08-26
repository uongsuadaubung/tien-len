import { describe, expect, test } from 'bun:test';
import { getSortedQuickSelectCandidates, getNextQuickSelectCards } from '../../src/engine/quick-response-finder';
import { parseCard, parseCards } from '../../src/engine/card';
import { PlayedMove } from '../../src/engine/types';

describe('Quick Response Finder & Selection Cycle (Chọn Nhanh Bài Vừa Khít & Xoay Vòng)', () => {
  const createMove = (cardCodes: string, type: any): PlayedMove => {
    const cards = parseCards(cardCodes);
    return {
      playerId: 'opponent',
      combination: {
        type,
        cards,
        highestCard: cards[cards.length - 1],
        length: cards.length
      },
      timestamp: Date.now(),
      isChop: null,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null
    };
  };

  const makeCtx = (opts: {
    hand: any;
    leadingMove: PlayedMove | null;
    isLeadMove: boolean;
    isFirstMoveOfGame?: boolean | null;
    allowFourPairsCutAnytime?: boolean | null;
    prohibitEndingWithTwo?: boolean | null;
  }) => ({
    hand: opts.hand,
    leadingMove: opts.leadingMove,
    isLeadMove: opts.isLeadMove,
    isFirstMoveOfGame: opts.isFirstMoveOfGame ?? null,
    allowFourPairsCutAnytime: opts.allowFourPairsCutAnytime ?? null,
    prohibitEndingWithTwo: opts.prohibitEndingWithTwo ?? null
  });

  test('1. Đè Rác (Single): Chọn quân bài nhỏ nhất vừa đủ đè đối thủ, xoay vòng từ bé đến lớn', () => {
    // Bàn đang có 8 Bích (8S)
    const leadingMove = createMove('8S', 'SINGLE');
    // Tay bài người chơi: 9 Bích, 10 Rô, Át Bích, Heo Cơ
    const hand = parseCards('9S 10D AS 2H');

    const candidates = getSortedQuickSelectCandidates(makeCtx({
      hand,
      leadingMove,
      isLeadMove: false
    }));

    expect(candidates.length).toBe(4);
    // Vừa khít nhất là 9S
    expect(candidates[0].cards.map(c => c.code)).toEqual(['9S']);
    expect(candidates[1].cards.map(c => c.code)).toEqual(['10D']);
    expect(candidates[2].cards.map(c => c.code)).toEqual(['AS']);
    expect(candidates[3].cards.map(c => c.code)).toEqual(['2H']);

    // Kiểm tra tính năng xoay vòng (Cycle)
    // Lần 1: Chưa chọn gì -> Ra 9S
    const sel1 = getNextQuickSelectCards(makeCtx({ hand, leadingMove, isLeadMove: false }), new Set());
    expect(sel1?.map(c => c.code)).toEqual(['9S']);

    // Lần 2: Đang chọn 9S -> Chuyển sang 10D
    const sel2 = getNextQuickSelectCards(makeCtx({ hand, leadingMove, isLeadMove: false }), new Set(sel1!.map(c => c.id)));
    expect(sel2?.map(c => c.code)).toEqual(['10D']);

    // Lần 3: Đang chọn 10D -> Chuyển sang AS
    const sel3 = getNextQuickSelectCards(makeCtx({ hand, leadingMove, isLeadMove: false }), new Set(sel2!.map(c => c.id)));
    expect(sel3?.map(c => c.code)).toEqual(['AS']);

    // Lần 4: Đang chọn AS -> Chuyển sang 2H
    const sel4 = getNextQuickSelectCards(makeCtx({ hand, leadingMove, isLeadMove: false }), new Set(sel3!.map(c => c.id)));
    expect(sel4?.map(c => c.code)).toEqual(['2H']);

    // Lần 5: Đang chọn 2H -> Quay lại 9S
    const sel5 = getNextQuickSelectCards(makeCtx({ hand, leadingMove, isLeadMove: false }), new Set(sel4!.map(c => c.id)));
    expect(sel5?.map(c => c.code)).toEqual(['9S']);
  });

  test('2. Đè Đôi (Pair): Chọn đôi nhỏ nhất đủ đè', () => {
    // Bàn đang có Đôi 5 (5S 5D)
    const leadingMove = createMove('5S 5D', 'PAIR');
    // Tay bài: Đôi 6, Đôi Q, Đôi Heo (2S 2D), Rác 9S
    const hand = parseCards('6S 6H QS QD 9S 2S 2D');

    const candidates = getSortedQuickSelectCandidates(makeCtx({
      hand,
      leadingMove,
      isLeadMove: false
    }));

    expect(candidates.length).toBe(3);
    // Vừa khít nhất là Đôi 6
    expect(candidates[0].cards.map(c => c.code)).toEqual(['6S', '6H']);
    expect(candidates[1].cards.map(c => c.code)).toEqual(['QS', 'QD']);
    expect(candidates[2].cards.map(c => c.code)).toEqual(['2S', '2D']);
  });

  test('3. Đè Sảnh (Straight): Chọn sảnh cùng độ dài nhỏ nhất', () => {
    // Bàn có sảnh 4 lá: 3-4-5-6
    const leadingMove = createMove('3S 4S 5D 6C', 'STRAIGHT');
    // Tay bài có sảnh 4-5-6-7 và 8-9-10-J
    const hand = parseCards('4D 5H 6H 7S 8S 9D 10C JH');

    const candidates = getSortedQuickSelectCandidates(makeCtx({
      hand,
      leadingMove,
      isLeadMove: false
    }));

    expect(candidates.length).toBeGreaterThan(0);
    // Vừa khít nhất là sảnh bắt đầu bằng 4D
    expect(candidates[0].cards[0].rank).toBe(4);
    expect(candidates[0].cards[3].rank).toBe(7);
  });

  test('4. Gặp Heo (2S): Ưu tiên đè bằng Heo to hơn trước, sau đó mới đến Hàng đặc biệt (3 đôi thông)', () => {
    // Bàn đánh 2 Bích (2S)
    const leadingMove = createMove('2S', 'SINGLE');
    // Tay bài có Heo Cơ (2H) và 3 Đôi Thông (4S 4D 5S 5D 6S 6D)
    const hand = parseCards('2H 4S 4D 5S 5D 6S 6D');

    const candidates = getSortedQuickSelectCandidates(makeCtx({
      hand,
      leadingMove,
      isLeadMove: false
    }));

    // candidate[0] phải là đè Heo bằng 2H (bài thường)
    expect(candidates[0].isChop).toBe(false);
    expect(candidates[0].cards.map(c => c.code)).toEqual(['2H']);

    // candidate[1] là chặt bằng 3 đôi thông
    expect(candidates[1].isChop).toBe(true);
    expect(candidates[1].combination.type).toBe('THREE_PAIRS_SEQUENTIAL');
  });

  test('5. Cầm Cái (Lead Move) ở Ván 1: Bắt buộc chọn tổ hợp chứa lá 3 Bích nhỏ nhất', () => {
    // Tay bài có 3S, 4S, 5D, 9H, 9D
    const hand = parseCards('3S 4S 5D 9H 9D');

    const candidates = getSortedQuickSelectCandidates(makeCtx({
      hand,
      leadingMove: null,
      isLeadMove: true,
      isFirstMoveOfGame: true
    }));

    // Mọi phương án phải chứa 3S
    for (const cand of candidates) {
      expect(cand.cards.some(c => c.rank === 3 && c.suit === 'SPADES')).toBe(true);
    }

    // Phương án đầu tiên là lá đơn 3S
    expect(candidates[0].cards.map(c => c.code)).toEqual(['3S']);
  });

  test('6. Không có bài đè được: Trả về danh sách rỗng và getNextQuickSelectCards trả về null', () => {
    // Bàn đánh Át Cơ (AH)
    const leadingMove = createMove('AH', 'SINGLE');
    // Tay bài chỉ có bài nhỏ hơn AH và không có Heo/Hàng
    const hand = parseCards('3S 4S 5D 9H KD');

    const candidates = getSortedQuickSelectCandidates(makeCtx({
      hand,
      leadingMove,
      isLeadMove: false
    }));

    expect(candidates.length).toBe(0);

    const nextSelect = getNextQuickSelectCards(
      makeCtx({ hand, leadingMove, isLeadMove: false }),
      new Set()
    );
    expect(nextSelect).toBeNull();
  });
});
