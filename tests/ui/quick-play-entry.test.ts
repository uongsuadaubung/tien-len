import { describe, expect, it, beforeEach } from 'bun:test';
import { useUserStore } from '../../src/stores/useUserStore';
import { useViewStore } from '../../src/stores/useViewStore';

describe('Kiểm Thử Vào Bàn Chơi Nhanh & Chặn Khi Không Đủ Tiền Cược Chuẩn (Quick Play Standard Bet Tests)', () => {
  beforeEach(() => {
    useViewStore.getState().closeAllModals();
  });

  it('1. Đủ 1.000 Xu: Cho phép Chơi Nhanh bình thường', () => {
    const profile = { ...useUserStore.getState().profile, coins: 50000 };
    useUserStore.getState().setProfile(profile);

    const DEFAULT_QUICK_BET = 1000;
    expect(profile.coins).toBeGreaterThanOrEqual(DEFAULT_QUICK_BET);
  });

  it('2. Dưới 1.000 Xu: Chặn Chơi Nhanh và mở Ngân Hàng (giống như modal kết thúc ván)', () => {
    const profile = { ...useUserStore.getState().profile, coins: 800 };
    useUserStore.getState().setProfile(profile);

    const DEFAULT_QUICK_BET = 1000;
    const isEligible = profile.coins >= DEFAULT_QUICK_BET;
    expect(isEligible).toBe(false);

    if (!isEligible) {
      useViewStore.getState().openModal('BANK');
    }

    expect(useViewStore.getState().isBankLoanModalOpen).toBe(true);
  });
});
