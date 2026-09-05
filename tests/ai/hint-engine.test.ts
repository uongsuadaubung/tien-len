import { describe, it, expect } from 'bun:test';
import { getOptimalMoveHint, evaluateSelectionFeedback } from '../../src/ai/hint-engine';
import { createCard, formatCard, formatCards, formatCardVietnamese } from '../../src/engine/card';
import { CardTracker } from '../../src/ai/card-tracker';
import { PlayedMove, CombinationType } from '../../src/engine/types';

describe('Quân Sư Thần Bài AI (Hint Engine)', () => {
  const createPlayedMove = (playerId: string, combination: any): PlayedMove => ({
    playerId,
    timestamp: Date.now(),
    combination,
    isChop: false
  });

  it('phát hiện FORCED_PASS khi người chơi không có bất kỳ bài nào đè được', () => {
    // Người chơi chỉ có 3 bích, 4 tép
    const hand = [createCard(3, 'SPADES'), createCard(4, 'CLUBS')];
    // Bài trên bàn là Đôi A
    const aHearts = createCard(14, 'HEARTS');
    const aDiamonds = createCard(14, 'DIAMONDS');
    const leadingMove: PlayedMove = createPlayedMove('p1', {
      type: 'PAIR' as CombinationType,
      cards: [aHearts, aDiamonds],
      highestCard: aDiamonds,
      length: 2
    });
    const tracker = new CardTracker(hand, 1.0);
    const remainingCards = { p0: 2, p1: 5, p2: 5, p3: 5 };

    const hint = getOptimalMoveHint(
      hand,
      leadingMove,
      false,
      false,
      tracker,
      remainingCards,
      'p1',
      false
    );

    expect(hint.action).toBe('PASS');
    expect(hint.type).toBe('FORCED_PASS');
    expect(hint.title).toContain('Nhường Lượt');
    expect(hint.message).toMatch(/Bỏ [lL]ượt/);
  });

  it('phát hiện DANGER_WARNING khi đối thủ kế bên chỉ còn 1 lá', () => {
    // Người chơi có bài đè được
    const hand = [createCard(13, 'HEARTS'), createCard(14, 'HEARTS')];
    const qSpades = createCard(12, 'SPADES');
    const leadingMove: PlayedMove = createPlayedMove('p3', {
      type: 'SINGLE' as CombinationType,
      cards: [qSpades],
      highestCard: qSpades,
      length: 1
    });
    const tracker = new CardTracker(hand, 1.0);
    const remainingCards = { p0: 2, p1: 1, p2: 5, p3: 5 }; // p1 chỉ còn 1 lá!

    const hint = getOptimalMoveHint(
      hand,
      leadingMove,
      false,
      false,
      tracker,
      remainingCards,
      'p1',
      true // isNextPlayerOneCard
    );

    expect(hint.action).toBe('PLAY');
    expect(hint.type).toBe('DANGER_WARNING');
    expect(hint.title).toContain('Chặn Đầu');
    expect(hint.message).toContain('về Nhất');
  });

  it('phát hiện LEAD_OPENING khi mở màn vòng đấu', () => {
    const hand = [
      createCard(3, 'SPADES'), 
      createCard(4, 'SPADES'), 
      createCard(5, 'SPADES'),
      createCard(10, 'HEARTS'),
      createCard(12, 'DIAMONDS')
    ];
    const tracker = new CardTracker(hand, 1.0);
    const remainingCards = { p0: 5, p1: 5, p2: 5, p3: 5 };

    const hint = getOptimalMoveHint(
      hand,
      null,
      false,
      true, // isLeadMove
      tracker,
      remainingCards,
      'p1',
      false
    );

    expect(hint.action).toBe('PLAY');
    expect(hint.type).toBe('LEAD_OPENING');
    expect(hint.title).toContain('Mở Màn');
  });

  it('phát hiện WIN_OPPORTUNITY khi đánh hết toàn bộ bài trên tay', () => {
    const hand = [createCard(14, 'HEARTS')]; // Chỉ còn 1 lá A cơ
    const tracker = new CardTracker(hand, 1.0);
    const remainingCards = { p0: 1, p1: 5, p2: 5, p3: 5 };

    const hint = getOptimalMoveHint(
      hand,
      null,
      false,
      true,
      tracker,
      remainingCards,
      'p1',
      false
    );

    expect(hint.action).toBe('PLAY');
    expect(hint.type).toBe('WIN_OPPORTUNITY');
    expect(hint.title).toContain('Về Nhất');
  });

  describe('Phản Hồi Nhận Xét Khi Chọn Bài (Selection Feedback)', () => {
    it('cảnh báo khi chọn tổ hợp không hợp lệ', () => {
      const hand = [createCard(3, 'SPADES'), createCard(7, 'HEARTS')];
      const tracker = new CardTracker(hand, 1.0);

      const feedback = evaluateSelectionFeedback({
        selectedCards: [createCard(3, 'SPADES'), createCard(7, 'HEARTS')], // 2 lá không thành đôi hay sảnh
        hand,
        leadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        prohibitEndingWithTwo: null,
        tracker,
        optimalHint: null
      });

      expect(feedback).not.toBeNull();
      expect(feedback?.type).toBe('FORCED_PASS');
      expect(feedback?.title).toContain('Chưa Hợp Lệ');
    });

    it('phân tích thế trận cảnh báo khi chọn Đôi A mà ngoài sới còn Heo', () => {
      const aHearts = createCard(14, 'HEARTS');
      const aDiamonds = createCard(14, 'DIAMONDS');
      const hand = [aHearts, aDiamonds, createCard(3, 'SPADES')];
      const tracker = new CardTracker(hand, 1.0); // Chưa có lá nào ra -> còn 4 con Heo ngoài sới

      const feedback = evaluateSelectionFeedback({
        selectedCards: [aHearts, aDiamonds],
        hand,
        leadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        prohibitEndingWithTwo: null,
        tracker,
        optimalHint: null
      });

      expect(feedback).not.toBeNull();
      expect(feedback?.title).toContain('Đôi A');
      expect(feedback?.message).toContain('Đôi Heo');
    });

    it('phân tích thế trận khi chọn Đôi A mà toàn bộ Heo đã ra hết', () => {
      const aHearts = createCard(14, 'HEARTS');
      const aDiamonds = createCard(14, 'DIAMONDS');
      const hand = [aHearts, aDiamonds, createCard(3, 'SPADES')];
      const tracker = new CardTracker(hand, 1.0);

      // Ghi nhận 4 con Heo đã ra
      tracker.recordMove(createPlayedMove('p1', {
        type: 'FOUR_OF_A_KIND',
        cards: [
          createCard(15, 'SPADES'),
          createCard(15, 'CLUBS'),
          createCard(15, 'DIAMONDS'),
          createCard(15, 'HEARTS')
        ],
        highestCard: createCard(15, 'HEARTS'),
        length: 4
      }));

      const feedback = evaluateSelectionFeedback({
        selectedCards: [aHearts, aDiamonds],
        hand,
        leadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        prohibitEndingWithTwo: null,
        tracker,
        optimalHint: null
      });

      expect(feedback).not.toBeNull();
      expect(feedback?.title).toContain('Đôi A');
      expect(feedback?.message).toMatch(/(sáng nước|quyền đi tiếp)/);
    });

    it('cảnh báo khi chọn bài làm xé mất sảnh 4 lá trên tay', () => {
      // Tay bài có sảnh 3-4-5-6 và 1 lá 10 rác
      const c3 = createCard(3, 'SPADES');
      const c4 = createCard(4, 'CLUBS');
      const c5 = createCard(5, 'DIAMONDS');
      const c6 = createCard(6, 'HEARTS');
      const c10 = createCard(10, 'SPADES');
      const hand = [c3, c4, c5, c6, c10];
      const tracker = new CardTracker(hand, 1.0);

      // Người chơi chỉ chọn 1 lá 3 Bích (xé sảnh 3-4-5-6)
      const feedback = evaluateSelectionFeedback({
        selectedCards: [c3],
        hand,
        leadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        prohibitEndingWithTwo: null,
        tracker,
        optimalHint: null
      });

      expect(feedback).not.toBeNull();
      expect(feedback?.type).toBe('DANGER_WARNING');
      expect(feedback?.title).toContain('Xé Sảnh');
    });

    it('cảnh báo khi chọn bài làm xé mất bộ Tứ Quý trên tay', () => {
      // Tay bài có Tứ Quý 8 và 1 lá K
      const c8s = createCard(8, 'SPADES');
      const c8c = createCard(8, 'CLUBS');
      const c8d = createCard(8, 'DIAMONDS');
      const c8h = createCard(8, 'HEARTS');
      const ck = createCard(13, 'SPADES');
      const hand = [c8s, c8c, c8d, c8h, ck];
      const tracker = new CardTracker(hand, 1.0);

      // Người chơi chọn 1 lá 8 (xé Tứ Quý)
      const feedback = evaluateSelectionFeedback({
        selectedCards: [c8s],
        hand,
        leadingMove: null,
        isFirstMoveOfGame: false,
        isLeadMove: true,
        prohibitEndingWithTwo: null,
        tracker,
        optimalHint: null
      });

      expect(feedback).not.toBeNull();
      expect(feedback?.type).toBe('DANGER_WARNING');
      expect(feedback?.title).toContain('Xé Tứ Quý');
    });
  });

  describe('Kịch Bản Đặc Biệt Khác', () => {
    it('phát hiện CƠ HỘI BẮT HEO khi đối thủ vừa ra Heo và người chơi có Tứ Quý', () => {
      const c8s = createCard(8, 'SPADES');
      const c8c = createCard(8, 'CLUBS');
      const c8d = createCard(8, 'DIAMONDS');
      const c8h = createCard(8, 'HEARTS');
      const hand = [c8s, c8c, c8d, c8h];

      const twoSpades = createCard(15, 'SPADES');
      const leadingMove: PlayedMove = createPlayedMove('p1', {
        type: 'SINGLE' as CombinationType,
        cards: [twoSpades],
        highestCard: twoSpades,
        length: 1
      });
      const tracker = new CardTracker(hand, 1.0);
      const remainingCards = { p0: 4, p1: 5, p2: 5, p3: 5 };

      const hint = getOptimalMoveHint(
        hand,
        leadingMove,
        false,
        false,
        tracker,
        remainingCards,
        'p1',
        false
      );

      expect(hint.action).toBe('PLAY');
      expect(hint.title).toContain('Bắt Heo');
    });

    it('phát hiện NGUY CƠ BỊ CÓNG khi chưa đánh được lá nào mà đối thủ sắp về', () => {
      const hand = [createCard(13, 'HEARTS'), createCard(14, 'HEARTS')];
      const qSpades = createCard(12, 'SPADES');
      const leadingMove: PlayedMove = createPlayedMove('p2', {
        type: 'SINGLE' as CombinationType,
        cards: [qSpades],
        highestCard: qSpades,
        length: 1
      });
      const tracker = new CardTracker(hand, 1.0);
      const remainingCards = { p0: 13, p1: 1, p2: 5, p3: 5 }; // p1 còn 1 lá sắp về!

      const hint = getOptimalMoveHint(
        hand,
        leadingMove,
        false,
        false,
        tracker,
        remainingCards,
        'p1',
        false,
        true,
        'TRADITIONAL',
        undefined,
        false // hasPlayedFirstCard = false
      );

      expect(hint.action).toBe('PLAY');
      expect(hint.title).toContain('Cóng');
    });

    it('phát hiện CẢNH BÁO THỐI HEO khi tay bài sắp hết mà vẫn giữ Heo', () => {
      const hand = [createCard(10, 'SPADES'), createCard(15, 'HEARTS')]; // 2 lá, có Heo
      const nineSpades = createCard(9, 'SPADES');
      const leadingMove: PlayedMove = createPlayedMove('p2', {
        type: 'SINGLE' as CombinationType,
        cards: [nineSpades],
        highestCard: nineSpades,
        length: 1
      });
      const tracker = new CardTracker(hand, 1.0);
      const remainingCards = { p0: 2, p1: 5, p2: 5, p3: 5 };

      const hint = getOptimalMoveHint(
        hand,
        leadingMove,
        false,
        false,
        tracker,
        remainingCards,
        'p1',
        false,
        true // prohibitEndingWithTwo
      );

      expect(hint.title).toContain('Thối Heo');
      expect(hint.message).toMatch(/(thối Heo|Thối Heo|thối hàng)/i);
    });

    it('phát hiện CHẶT CHỒNG khi đối thủ vừa chặt hàng', () => {
      // Người chơi có Tứ Quý K
      const hand = [
        createCard(13, 'SPADES'),
        createCard(13, 'CLUBS'),
        createCard(13, 'DIAMONDS'),
        createCard(13, 'HEARTS')
      ];
      // Đối thủ vừa dùng 3 đôi thông
      const leadingMove: PlayedMove = createPlayedMove('p2', {
        type: 'THREE_PAIRS_SEQUENTIAL' as CombinationType,
        cards: [
          createCard(3, 'SPADES'), createCard(3, 'HEARTS'),
          createCard(4, 'SPADES'), createCard(4, 'HEARTS'),
          createCard(5, 'SPADES'), createCard(5, 'HEARTS')
        ],
        highestCard: createCard(5, 'HEARTS'),
        length: 6
      });
      const tracker = new CardTracker(hand, 1.0);
      const remainingCards = { p0: 4, p1: 5, p2: 5, p3: 5 };

      const hint = getOptimalMoveHint(
        hand,
        leadingMove,
        false,
        false,
        tracker,
        remainingCards,
        'p1',
        false
      );

      expect(hint.action).toBe('PLAY');
      expect(hint.title).toContain('Chặt Chồng');
    });
  });

  describe('Chuyển Đổi Định Dạng Lá Bài Cho Người Chơi (Card Formatting)', () => {
    it('formatCard hiển thị ký hiệu trực quan (3♠, 10♦, A♥, 2♥)', () => {
      expect(formatCard(createCard(3, 'SPADES'))).toBe('3♠');
      expect(formatCard(createCard(10, 'DIAMONDS'))).toBe('10♦');
      expect(formatCard(createCard(14, 'HEARTS'))).toBe('A♥');
      expect(formatCard(createCard(15, 'CLUBS'))).toBe('2♣');
    });

    it('formatCards hiển thị danh sách lá bài trực quan', () => {
      const cards = [
        createCard(3, 'SPADES'),
        createCard(4, 'CLUBS'),
        createCard(5, 'DIAMONDS')
      ];
      expect(formatCards(cards)).toBe('3♠ 4♣ 5♦');
      expect(formatCards(cards, ', ')).toBe('3♠, 4♣, 5♦');
    });

    it('formatCardVietnamese hiển thị tên tiếng Việt đầy đủ', () => {
      expect(formatCardVietnamese(createCard(3, 'SPADES'))).toBe('3 Bích');
      expect(formatCardVietnamese(createCard(14, 'HEARTS'))).toBe('A Cơ');
      expect(formatCardVietnamese(createCard(15, 'DIAMONDS'))).toBe('2 Rô');
    });
  });
});
