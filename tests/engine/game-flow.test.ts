import { describe, expect, test } from 'bun:test';
import { parseCard, parseCards } from '../../src/engine/card';
import { GameEngine } from '../../src/engine/game';
import { Player } from '../../src/engine/types';

function createMockPlayers(): Player[] {
  return [
    {
      id: 'p1',
      name: 'Người Chơi',
      avatar: 'user',
      isBot: false,
      hand: [],
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    },
    {
      id: 'p2',
      name: 'Bé Năm',
      avatar: 'bot1',
      isBot: true,
      hand: [],
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    },
    {
      id: 'p3',
      name: 'Chú Bảy',
      avatar: 'bot2',
      isBot: true,
      hand: [],
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    },
    {
      id: 'p4',
      name: 'Bác Tư',
      avatar: 'bot3',
      isBot: true,
      hand: [],
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    }
  ];
}

describe('Game Flow & Lifecycle Engine', () => {
  test('Khởi tạo ván 1 tự động xác định người cầm 3♠ đi trước', () => {
    const players = createMockPlayers();
    players[0].hand = parseCards('4S 5S 6S 7S 8S 9S 10S JS QS KS AS 2S 2C');
    players[1].hand = parseCards('3S 4D 5D 6D 7D 8D 9D 10D JD QD KD AD 2D'); // p2 has 3S
    players[2].hand = parseCards('3C 4C 5C 6C 7C 8C 9C 10C JC QC KC AC 2H');
    players[3].hand = parseCards('3D 3H 4H 5H 6H 7H 8H 9H 10H JH QH KH AH');

    const game = new GameEngine(players, { mode: 'TRADITIONAL', betAmount: 100 });
    game.startCustomGame(1); // ván 1

    expect(game.getCurrentPlayer().id).toBe('p2');
    expect(game.isFirstMoveOfGame).toBe(true);
  });

  test('Vòng chơi: Đánh bài hợp lệ, Bỏ lượt và Giành Cái khi tất cả cùng bỏ', () => {
    const players = createMockPlayers();
    players[0].hand = parseCards('3S 6S 7S 8S');
    players[1].hand = parseCards('4S 7D 8D 9D');
    players[2].hand = parseCards('5S 9C 10C JC');
    players[3].hand = parseCards('6C 10H JH QH');

    const game = new GameEngine(players, { mode: 'TRADITIONAL', betAmount: 100 });
    game.startCustomGame(1); // p1 đi trước với 3S

    // p1 đánh 3S
    const res1 = game.playMove('p1', parseCards('3S'));
    expect(res1.success).toBe(true);
    expect(game.getCurrentPlayer().id).toBe('p2');

    // p2 đánh 4S
    const res2 = game.playMove('p2', parseCards('4S'));
    expect(res2.success).toBe(true);
    expect(game.getCurrentPlayer().id).toBe('p3');

    // p3 đánh 5S
    const res3 = game.playMove('p3', parseCards('5S'));
    expect(res3.success).toBe(true);
    expect(game.getCurrentPlayer().id).toBe('p4');

    // p4 bỏ lượt
    const pass4 = game.passTurn('p4');
    expect(pass4.success).toBe(true);
    expect(game.getCurrentPlayer().id).toBe('p1');

    // p1 bỏ lượt
    const pass1 = game.passTurn('p1');
    expect(pass1.success).toBe(true);
    expect(game.getCurrentPlayer().id).toBe('p2');

    // p2 bỏ lượt -> tất cả đã bỏ lượt -> p3 giành cái, mở vòng mới
    const pass2 = game.passTurn('p2');
    expect(pass2.success).toBe(true);
    expect(game.getCurrentPlayer().id).toBe('p3');
    expect(game.isRoundLeadMove()).toBe(true);
  });

  test('Kiểm tra luật Cóng (Cháy bài) khi người khác về Nhất mà chưa đánh lá nào', () => {
    const players = createMockPlayers();
    players[0].hand = parseCards('3S 4S 5S');
    players[1].hand = parseCards('2S 2C 2D 2H'); // có heo nhưng chưa đánh
    players[2].hand = parseCards('6S 7S 8S');
    players[3].hand = parseCards('9S 10S JS');

    const game = new GameEngine(players, { mode: 'COUNT_CARDS', betAmount: 100 });
    game.startCustomGame(1);

    // p1 đánh sảnh 3S 4S 5S hết bài luôn và về nhất!
    const res = game.playMove('p1', parseCards('3S 4S 5S'));
    expect(res.success).toBe(true);
    expect(game.isGameOver).toBe(true);

    const player2 = game.getPlayer('p2');
    expect(player2?.hasPlayedFirstCard).toBe(false); // Cóng!
    expect(game.isPlayerCong('p2')).toBe(true);
  });

  test('Phạt chặt Heo tức thì (Chặt Heo được nhận tiền trực tiếp)', () => {
    const players = createMockPlayers();
    players[0].hand = parseCards('3S 2H');
    players[1].hand = parseCards('4S 4D 5S 5D 6S 6D'); // 3 đôi thông
    players[2].hand = parseCards('7S 8S 9S');
    players[3].hand = parseCards('10S JS QS');

    const game = new GameEngine(players, { mode: 'TRADITIONAL', betAmount: 100 });
    game.startCustomGame(1);

    // p1 đánh 3S
    game.playMove('p1', parseCards('3S'));
    // p2 bỏ, p3 bỏ, p4 bỏ -> p1 giành cái
    game.passTurn('p2');
    game.passTurn('p3');
    game.passTurn('p4');

    // p1 đánh 2H
    game.playMove('p1', parseCards('2H'));
    const p1ScoreBefore = game.getPlayer('p1')!.score;
    const p2ScoreBefore = game.getPlayer('p2')!.score;

    // p2 dùng 3 đôi thông chặt 2H của p1!
    const chopRes = game.playMove('p2', parseCards('4S 4D 5S 5D 6S 6D'));
    expect(chopRes.success).toBe(true);
    expect(chopRes.isChop).toBe(true);

    // Tiền thưởng chặt heo đỏ: 2 mức cược (200)
    expect(game.getPlayer('p2')!.score).toBeGreaterThan(p2ScoreBefore);
    expect(game.getPlayer('p1')!.score).toBeLessThan(p1ScoreBefore);
  });

  test('Khi người chơi (p1) hết bài về Nhất, 3 bot còn lại tiếp tục thi đấu tìm Nhì, Ba, Bét mà không bị dừng', () => {
    const players = createMockPlayers();
    players[0].hand = parseCards('3S 3D'); // p1 có đôi 3 (chứa 3S) và về nhất nhanh
    players[1].hand = parseCards('5S 6S 7S 8S');
    players[2].hand = parseCards('9S 10S JS QS');
    players[3].hand = parseCards('KS AS 2S 2D');

    const game = new GameEngine(players, { mode: 'TRADITIONAL', betAmount: 100 });
    game.startCustomGame(1);

    // p1 đánh đôi 3S 3D -> HẾT BÀI VỀ NHẤT!
    const p1Move = game.playMove('p1', parseCards('3S 3D'));
    expect(p1Move.success).toBe(true);
    expect(game.getPlayer('p1')!.hand.length).toBe(0);
    expect(game.getPlayer('p1')!.rankPosition).toBe(1);
    expect(game.isGameOver).toBe(false); // Ván chưa kết thúc vì còn 3 bot

    // Lượt kế tiếp tự động chuyển qua p2
    expect(game.currentRound.currentTurnPlayerId).toBe('p2');

    // p2, p3, p4 tiếp tục đánh và bỏ lượt
    const pass2 = game.passTurn('p2');
    expect(pass2.success).toBe(true);
    expect(game.currentRound.currentTurnPlayerId).toBe('p3');

    const pass3 = game.passTurn('p3');
    expect(pass3.success).toBe(true);
    // Sau khi p3 bỏ lượt, chỉ còn p4 chưa bỏ lượt -> lượt PHẢI tới p4!
    expect(game.currentRound.currentTurnPlayerId).toBe('p4');

    const pass4 = game.passTurn('p4');
    expect(pass4.success).toBe(true);

    // Vòng mới mở: quyền cầm cái tự động chuyển cho p2 (người kế tiếp còn bài sau p1)
    expect(game.currentRound.leadPlayerId).toBe('p2');
    expect(game.currentRound.currentTurnPlayerId).toBe('p2');

    // getCurrentPlayer không bao giờ trỏ vào p1 (người đã hết bài)
    expect(game.getCurrentPlayer().id).toBe('p2');
  });

  test('Khi bot về nhất bằng lá bài cao, người chơi còn lại có thể chặt hoặc bắt bài tiếp tục', () => {
    const players = createMockPlayers();
    players[0].hand = parseCards('3S'); // p1 về nhất bằng 3S
    players[1].hand = parseCards('5S 6S'); // p2
    players[2].hand = parseCards('7S 8S'); // p3
    players[3].hand = parseCards('9S 10S'); // p4

    const game = new GameEngine(players, { mode: 'TRADITIONAL', betAmount: 100 });
    game.startCustomGame(1);

    // p1 đánh 3S và hết bài về nhất
    const p1Move = game.playMove('p1', parseCards('3S'));
    expect(p1Move.success).toBe(true);
    expect(game.getPlayer('p1')!.hand.length).toBe(0);

    // Lượt sang p2: p2 đánh 5S đè 3S
    expect(game.currentRound.currentTurnPlayerId).toBe('p2');
    const p2Move = game.playMove('p2', parseCards('5S'));
    expect(p2Move.success).toBe(true);

    // Lượt sang p3: p3 đánh 7S đè 5S
    expect(game.currentRound.currentTurnPlayerId).toBe('p3');
    const p3Move = game.playMove('p3', parseCards('7S'));
    expect(p3Move.success).toBe(true);

    // Lượt sang p4: p4 bỏ lượt
    expect(game.currentRound.currentTurnPlayerId).toBe('p4');
    game.passTurn('p4');

    // p1 đã hết bài nên bị bỏ qua, lượt tới p2: p2 bỏ lượt
    expect(game.currentRound.currentTurnPlayerId).toBe('p2');
    game.passTurn('p2');

    // Mọi người đã bỏ lượt trước lá 7S của p3 -> p3 giành cái mở vòng mới!
    expect(game.currentRound.leadPlayerId).toBe('p3');
    expect(game.currentRound.currentTurnPlayerId).toBe('p3');
    expect(game.isRoundLeadMove()).toBe(true);
  });
});
