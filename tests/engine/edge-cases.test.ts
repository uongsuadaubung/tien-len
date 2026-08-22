import { describe, expect, test } from 'bun:test';
import { parseCards } from '../../src/engine/card';
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

describe('Edge Cases & Advanced Tien Len Rules', () => {
  test('4 Đôi Thông có quyền Chặt Tự Do kể cả khi đã Bỏ Lượt trước đó', () => {
    const players = createMockPlayers();
    players[0].hand = parseCards('3S 2H');
    players[1].hand = parseCards('4S 4D 5S 5D 6S 6D 7S 7D'); // 4 đôi thông
    players[2].hand = parseCards('8S 9S 10S');
    players[3].hand = parseCards('JS QS KS');

    const game = new GameEngine(players, { mode: 'TRADITIONAL', betAmount: 100, allowFourPairsCutAnytime: true });
    game.startCustomGame(1);

    // p1 đánh 3S
    game.playMove('p1', parseCards('3S'));

    // p2 chủ động bỏ lượt trong vòng này
    game.passTurn('p2');
    expect(game.getPlayer('p2')!.isPassedCurrentRound).toBe(true);

    // p3 bỏ lượt, p4 bỏ lượt -> p1 đánh tiếp 2H
    game.passTurn('p3');
    game.passTurn('p4');
    game.playMove('p1', parseCards('2H'));

    // p2 dù đã bỏ lượt trước đó nhưng có 4 đôi thông -> được phép chặt 2H tự do!
    const chopRes = game.playMove('p2', parseCards('4S 4D 5S 5D 6S 6D 7S 7D'));
    expect(chopRes.success).toBe(true);
    expect(chopRes.isChop).toBe(true);
    // p2 được khôi phục quyền tham gia
    expect(game.getPlayer('p2')!.isPassedCurrentRound).toBe(false);
  });

  test('Chặt Chồng: Heo -> 3 Đôi Thông -> Tứ Quý -> 4 Đôi Thông', () => {
    const players = createMockPlayers();
    players[0].hand = parseCards('3S 2H');
    players[1].hand = parseCards('4S 4D 5S 5D 6S 6D'); // 3 đôi thông
    players[2].hand = parseCards('7S 7C 7D 7H');       // Tứ quý 7
    players[3].hand = parseCards('8S 8D 9S 9D 10S 10D JS JD'); // 4 đôi thông

    const game = new GameEngine(players, { mode: 'TRADITIONAL', betAmount: 100 });
    game.startCustomGame(1);

    // p1 đánh 3S -> pass hết -> p1 giành cái
    game.playMove('p1', parseCards('3S'));
    game.passTurn('p2');
    game.passTurn('p3');
    game.passTurn('p4');

    // p1 đánh 2H
    game.playMove('p1', parseCards('2H'));

    // p2 chặt bằng 3 đôi thông (ăn của p1)
    const chop1 = game.playMove('p2', parseCards('4S 4D 5S 5D 6S 6D'));
    expect(chop1.success).toBe(true);

    // p3 chặt chồng bằng Tứ Quý 7 (ăn của p2)
    const chop2 = game.playMove('p3', parseCards('7S 7C 7D 7H'));
    expect(chop2.success).toBe(true);

    // p4 chặt chồng tiếp bằng 4 Đôi Thông (ăn của p3)
    const chop3 = game.playMove('p4', parseCards('8S 8D 9S 9D 10S 10D JS JD'));
    expect(chop3.success).toBe(true);
  });

  test('Tính điểm phạt thối Heo Đen vs Heo Đỏ vs Tứ Quý chính xác', () => {
    const game = new GameEngine(createMockPlayers(), { betAmount: 100 });
    const handWithRotten = parseCards('2S 2H 9S 9C 9D 9H 4S');
    // 2S (Heo đen = 100), 2H (Heo đỏ = 200), Tứ quý 9 (400) -> Tổng thối = 700
    const penalty = game.calculateRottenCardsPenalty(handWithRotten);
    expect(penalty).toBe(700);
  });
});
