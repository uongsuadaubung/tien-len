import { describe, expect, it, beforeEach } from 'bun:test';
import { useGameStore } from '../../src/stores/useGameStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { useModalStore } from '../../src/stores/useModalStore';
import { createCard } from '../../src/engine/card';

describe('Zustand State Stores Integration Tests (Kiểm Thử Tích Hợp State Quản Lý Giao Diện)', () => {
  beforeEach(() => {
    useUserStore.getState().resetProfile();
    useModalStore.getState().closeAllModals();
    useGameStore.getState().clearCardSelection();
  });

  it('1. useUserStore: Cập nhật Xu, Elo và Vay Nợ chợ đen', () => {
    const userStore = useUserStore.getState();
    const initialCoins = userStore.profile.coins;

    userStore.addCoins(5000);
    expect(useUserStore.getState().profile.coins).toBe(initialCoins + 5000);

    userStore.deductCoins(2000);
    expect(useUserStore.getState().profile.coins).toBe(initialCoins + 3000);

    userStore.updateElo(25);
    expect(useUserStore.getState().profile.elo).toBe(1225);

    userStore.takeLoan(10000);
    expect(useUserStore.getState().profile.loans).toBe(10000);
    expect(useUserStore.getState().profile.coins).toBe(initialCoins + 13000);
  });

  it('2. useGameStore: Chọn bài, Bỏ chọn bài và Quản lý Lượt đánh', () => {
    const gameStore = useGameStore.getState();
    const card3S = createCard(3, 'SPADES');
    const card4S = createCard(4, 'SPADES');

    gameStore.toggleCardSelect(card3S.id);
    expect(useGameStore.getState().selectedCardIds.has(card3S.id)).toBe(true);

    gameStore.toggleCardSelect(card4S.id);
    expect(useGameStore.getState().selectedCardIds.size).toBe(2);

    gameStore.clearCardSelection();
    expect(useGameStore.getState().selectedCardIds.size).toBe(0);

    gameStore.setCurrentTurnPlayerId('p1');
    expect(useGameStore.getState().currentTurnPlayerId).toBe('p1');
  });

  it('3. useModalStore: Mở Modal, Đóng Modal và Quản lý Hàng Đợi Popup', () => {
    const modalStore = useModalStore.getState();

    modalStore.openModal('BANK');
    expect(useModalStore.getState().isBankLoanModalOpen).toBe(true);

    modalStore.openModal('SETTINGS');
    expect(useModalStore.getState().isSettingsOpen).toBe(true);

    modalStore.closeAllModals();
    expect(useModalStore.getState().isBankLoanModalOpen).toBe(false);
    expect(useModalStore.getState().isSettingsOpen).toBe(false);
  });

  it('4. useSettingsStore: Tùy chỉnh AI Hint, Tự Động Xếp Bài & Âm Thanh', () => {
    const settingsStore = useSettingsStore.getState();

    settingsStore.setAiHintEnabled(false);
    expect(useSettingsStore.getState().aiHintEnabled).toBe(false);

    settingsStore.setAutoSortEnabled(false);
    expect(useSettingsStore.getState().autoSortEnabled).toBe(false);

    settingsStore.setSoundEnabled(false);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
  });
});
