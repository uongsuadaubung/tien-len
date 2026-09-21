import { describe, expect, test } from 'bun:test';
import { parseCards } from '../../src/engine/card';
import { checkInstantWin } from '../../src/engine/deck';

describe('Luật Tới Trắng (Instant Win)', () => {
  test('Sảnh Rồng (3 tới A hoặc 3 tới 2)', () => {
    const dragon12 = parseCards('3S 4D 5C 6H 7S 8D 9C 10H JS QD KC AH 2S');
    expect(checkInstantWin(dragon12, false)).toBe('DRAGON_STRAIGHT');

    const dragon13 = parseCards('3S 4S 5S 6S 7S 8S 9S 10S JS QS KS AS 2H');
    expect(checkInstantWin(dragon13, false)).toBe('DRAGON_STRAIGHT');
  });

  test('Tứ Quý 2 (4 con heo)', () => {
    const fourTwos = parseCards('2S 2C 2D 2H 3S 4S 5S 6S 7S 8S 9S 10S JS');
    expect(checkInstantWin(fourTwos, false)).toBe('FOUR_TWOS');
  });

  test('5 Đôi Thông', () => {
    const fivePairsSeq = parseCards('3S 3D 4S 4D 5S 5D 6S 6D 7S 7D 9S 10S JS');
    expect(checkInstantWin(fivePairsSeq, false)).toBe('FIVE_PAIRS_SEQUENTIAL');
  });

  test('6 Đôi Bất Kỳ', () => {
    const sixPairs = parseCards('3S 3D 5S 5D 7S 7D 9S 9D JS JD KS KD 2S');
    expect(checkInstantWin(sixPairs, false)).toBe('SIX_PAIRS');
  });

  test('13 Lá Đồng Màu (Toàn Đỏ hoặc Toàn Đen)', () => {
    const allRed = parseCards('3D 3H 4D 4H 5D 6H 7D 8H 9D 10H JD QH KD');
    expect(checkInstantWin(allRed, false)).toBe('SAME_COLOR_13');

    const allBlack = parseCards('3S 3C 4S 4C 5S 6C 7S 8C 9S 10C JS QC KS');
    expect(checkInstantWin(allBlack, false)).toBe('SAME_COLOR_13');
  });

  test('Tứ Quý 3 ở Ván Đầu Tiên', () => {
    const fourThrees = parseCards('3S 3C 3D 3H 4S 5S 6S 7S 8S 9S 10S JS QS');
    expect(checkInstantWin(fourThrees, true)).toBe('FIRST_ROUND_FOUR_THREES');
    // Nếu không phải ván đầu thì không tới trắng vì tứ quý 3
    expect(checkInstantWin(fourThrees, false)).toBeNull();
  });

  test('Xóa bỏ Tới Trắng sau khi sang ván mới (Instant Win State Isolation)', () => {
    const { AuthoritativeMatchHost } = require('../../src/engine/server/match-host');
    const { useGameStore } = require('../../src/stores/useGameStore');
    const { DEFAULT_PLAYER_PROFILE } = require('../../src/engine/storage');
    const { createDefaultGameRules } = require('../../src/engine/types');
    const { createPlayer, createBotPlayers } = require('../../src/engine/player-factory');

    useGameStore.getState().resetMatchState();

    const human = createPlayer({ ...DEFAULT_PLAYER_PROFILE, coins: 50000 });
    const bots = createBotPlayers(3);
    const host = new AuthoritativeMatchHost({
      rules: createDefaultGameRules(),
      players: [human, ...bots],
      hostPlayerId: human.id
    });

    // Giả lập ván 1 bị Tới Trắng (Sảnh Rồng)
    host.startMatch(1);
    host.instantWinType = 'DRAGON_STRAIGHT';
    useGameStore.getState().setInstantWinType('DRAGON_STRAIGHT');
    expect(useGameStore.getState().instantWinType).toBe('DRAGON_STRAIGHT');

    // Chuyển sang ván 2
    host.startMatch(2);

    // Sau khi startMatch ván 2, instantWinType từ ván 1 phải bị xóa bỏ hoàn toàn
    if (!host.engine?.instantWinner) {
      expect(host.instantWinType).toBeNull();
    } else {
      expect(host.instantWinType).not.toBe('DRAGON_STRAIGHT');
    }

    host.dispose();
  });
});
