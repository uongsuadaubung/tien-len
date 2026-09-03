import { describe, expect, it, beforeEach } from 'bun:test';
import { useGameStore } from '../../src/stores/useGameStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { useViewStore } from '../../src/stores/useViewStore';
import { createCard } from '../../src/engine/card';

describe('Zustand State Stores Integration Tests (Kiểm Thử Tích Hợp State Quản Lý Giao Diện)', () => {
  beforeEach(() => {
    useUserStore.getState().resetProfile();
    useViewStore.getState().closeAllModals();
    useGameStore.getState().clearCardSelection();
  });

  it('1. useUserStore: Cập nhật Xu, Elo và Vay Nợ chợ đen', () => {
    const userStore = useUserStore.getState();
    const initialCoins = userStore.profile.coins;

    userStore.addCoins(5000);
    expect(useUserStore.getState().profile.coins).toBe(initialCoins + 5000);

    userStore.deductCoins(2000);
    expect(useUserStore.getState().profile.coins).toBe(initialCoins + 3000);

    const initialElo = userStore.profile.elo;
    userStore.updateElo(25);
    expect(useUserStore.getState().profile.elo).toBe(initialElo + 25);

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

  it('3. useViewStore: Mở Modal, Đóng Modal và Quản lý Hàng Đợi Popup', () => {
    const modalStore = useViewStore.getState();

    modalStore.openModal('BANK');
    expect(useViewStore.getState().isBankLoanModalOpen).toBe(true);

    modalStore.openModal('SETTINGS');
    expect(useViewStore.getState().isSettingsOpen).toBe(true);

    modalStore.closeAllModals();
    expect(useViewStore.getState().isBankLoanModalOpen).toBe(false);
    expect(useViewStore.getState().isSettingsOpen).toBe(false);
  });

  it('4. useSettingsStore: Tùy chỉnh AI Hint, Tự Động Xếp Bài & Âm Thanh', () => {
    const settingsStore = useSettingsStore.getState();

    settingsStore.setAiHintEnabled(false);
    expect(useSettingsStore.getState().aiHintEnabled).toBe(false);

    settingsStore.setAutoSortEnabled(false);
    expect(useSettingsStore.getState().autoSortEnabled).toBe(false);

    settingsStore.setSoundEnabled(false);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);

    expect(useSettingsStore.getState().botReasoningLogEnabled).toBe(false);
    settingsStore.setBotReasoningLogEnabled(true);
    expect(useSettingsStore.getState().botReasoningLogEnabled).toBe(true);
    settingsStore.toggleBotReasoningLog();
    expect(useSettingsStore.getState().botReasoningLogEnabled).toBe(false);

    expect(useSettingsStore.getState().gameSpeed).toBe('REALISTIC');
    settingsStore.setGameSpeed('FAST');
    expect(useSettingsStore.getState().gameSpeed).toBe('FAST');

    expect(useSettingsStore.getState().quickResponseAssistEnabled).toBe(false);
    settingsStore.setQuickResponseAssistEnabled(true);
    expect(useSettingsStore.getState().quickResponseAssistEnabled).toBe(true);
    settingsStore.toggleQuickResponseAssist();
    expect(useSettingsStore.getState().quickResponseAssistEnabled).toBe(false);
  });

  it('5. useGameStore: resetMatchState làm sạch 100% dữ liệu bàn đấu và bộ nhớ tạm', () => {
    const gameStore = useGameStore.getState();
    const card3S = createCard(3, 'SPADES');

    gameStore.toggleCardSelect(card3S.id);
    gameStore.setCurrentTurnPlayerId('p2');
    gameStore.setIsGameOver(true);
    gameStore.setIsThreeSpadesWin(true);
    gameStore.setDealBanner('Chia Bài Hoàn Tất');

    gameStore.setCurrentScreen('GAME_TABLE');
    expect(useGameStore.getState().selectedCardIds.size).toBe(1);
    expect(useGameStore.getState().isGameOver).toBe(true);

    // Kích hoạt Reset toàn bộ State bàn đấu
    gameStore.resetMatchState();

    const cleanState = useGameStore.getState();
    // Đảm bảo không đè điều hướng màn hình (navigation separation)
    expect(cleanState.currentScreen).toBe('GAME_TABLE');
    expect(cleanState.selectedCardIds.size).toBe(0);
    expect(cleanState.currentTurnPlayerId).toBeNull();
    expect(cleanState.isGameOver).toBe(false);
    expect(cleanState.isThreeSpadesWin).toBe(false);
    expect(cleanState.dealBanner).toBeNull();
    expect(cleanState.winners).toEqual([]);
    expect(cleanState.currentMove).toBeNull();
  });
});
