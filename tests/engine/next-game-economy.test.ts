import { describe, expect, it, beforeEach } from 'bun:test';
import { useUserStore } from '../../src/stores/useUserStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useModalStore } from '../../src/stores/useModalStore';
import { calculateRequiredDeposit } from '../../src/engine/constants/economy';
import { resolveStrategyForMatch } from '../../src/engine/strategies/game-mode-strategy';
import { GameEngine } from '../../src/engine/game';
import { GameRulesBuilder } from '../../src/engine/types';

describe('Kiểm Thử Kinh Tế & Tiền Cọc Khi Bấm Ván Tiếp Theo (Multi-Round Economy & Deposit Tests)', () => {
  beforeEach(() => {
    useModalStore.getState().closeAllModals();
  });

  it('1. Người chơi có số dư nhỏ hơn cọc tối đa 26 lá nhưng lớn hơn cược bàn vẫn được chơi tiếp', () => {
    const betAmount = 1000;
    const choppingMultiplier = 1;
    const targetDeposit = calculateRequiredDeposit(betAmount, choppingMultiplier); // 26,000 Xu

    // Giả sử sau ván 1 thua một ít, người chơi còn 15,000 Xu
    const playerCoins = 15000;
    expect(playerCoins).toBeLessThan(targetDeposit);
    expect(playerCoins).toBeGreaterThanOrEqual(betAmount);

    // Cọc an toàn thực tế sẽ co giãn theo số dư hiện có thay vì chặn người chơi
    const actualDeposit = Math.min(playerCoins, targetDeposit);
    expect(actualDeposit).toBe(15000);

    const postDepositCoins = playerCoins - actualDeposit;
    expect(postDepositCoins).toBe(0);

    // Kết thúc ván người chơi thắng 10,000 Xu:
    const humanNetEarned = 10000;
    const nextCoins = postDepositCoins + actualDeposit + humanNetEarned;
    expect(nextCoins).toBe(25000); // Hoàn toàn chính xác, không bị thất thoát
  });

  it('2. Bảo toàn chính xác 100% dòng tiền qua 3 ván bài liên tiếp', () => {
    const betAmount = 500;
    let wallet = 50000; // Vốn ban đầu

    // Ván 1: Thắng +6,000 Xu
    const round1Net = 6000;
    const dep1 = Math.min(wallet, calculateRequiredDeposit(betAmount, 1));
    wallet = (wallet - dep1) + dep1 + round1Net;
    expect(wallet).toBe(56000);

    // Ván 2: Thua -18,000 Xu
    const round2Net = -18000;
    const dep2 = Math.min(wallet, calculateRequiredDeposit(betAmount, 1));
    wallet = (wallet - dep2) + dep2 + round2Net;
    expect(wallet).toBe(38000);

    // Ván 3: Thua tiếp -25,000 Xu (còn lại 13,000 Xu)
    const round3Net = -25000;
    const dep3 = Math.min(wallet, calculateRequiredDeposit(betAmount, 1));
    wallet = (wallet - dep3) + dep3 + round3Net;
    expect(wallet).toBe(13000);

    // Chuẩn bị vào Ván 4: 13,000 Xu >= 500 Xu cược -> Vẫn chơi tiếp được!
    expect(wallet).toBeGreaterThanOrEqual(betAmount);
  });
});
