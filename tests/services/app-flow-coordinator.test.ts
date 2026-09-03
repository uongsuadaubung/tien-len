import { describe, expect, it, beforeEach } from 'bun:test';
import { appFlowCoordinator } from '../../src/services/app-flow-coordinator';
import { useGameStore } from '../../src/stores/useGameStore';
import { useViewStore } from '../../src/stores/useViewStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useModalStore } from '../../src/stores/useModalStore';
import { useMatchmakingStore } from '../../src/stores/useMatchmakingStore';

describe('AppFlowCoordinator Unit Tests (Kiểm Thử Cổng Điều Phối Chuyển Cảnh Tập Trung)', () => {
  beforeEach(() => {
    appFlowCoordinator.returnToLobby();
  });

  it('1. returnToLobby: Dọn dẹp sạch sẽ tài nguyên và đưa màn hình về LOBBY', () => {
    useGameStore.getState().setCurrentScreen('GAME_TABLE');
    useViewStore.getState().setScreen('GAME_TABLE');
    useModalStore.getState().openModal('SETTINGS');

    appFlowCoordinator.returnToLobby('TEST_EXIT');

    expect(useGameStore.getState().currentScreen).toBe('LOBBY');
    expect(useViewStore.getState().currentScreen).toBe('LOBBY');
    expect(useModalStore.getState().isSettingsOpen).toBe(false);
    expect(appFlowCoordinator.driver).toBeNull();
  });

  it('2. enterQuickMatch: Chặn khi không đủ Xu và mở Modal BANK', async () => {
    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({
      ...origProfile,
      coins: 100
    });

    const success = await appFlowCoordinator.enterQuickMatch({
      playerCount: 4,
      settlementRule: 'COUNT_CARDS',
      betAmount: 5000,
      choppingMultiplier: 2,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    });

    expect(success).toBe(false);
    expect(useModalStore.getState().isBankLoanModalOpen).toBe(true);

    // Phục hồi lại Profile
    useUserStore.getState().setProfile(origProfile);
  });

  it('3. launchOfflineMatch: Khởi động bàn đấu thành công và chuyển sang GAME_TABLE an toàn', () => {
    appFlowCoordinator.launchOfflineMatch(1, {
      playerCount: 4,
      activeGameType: 'QUICK'
    });

    expect(appFlowCoordinator.driver).not.toBeNull();
    expect(useGameStore.getState().currentScreen).toBe('GAME_TABLE');
    expect(useViewStore.getState().currentScreen).toBe('GAME_TABLE');
    expect(useGameStore.getState().players.length).toBe(4);
  });

  it('4. forfeitMatch: Đầu hàng ván đấu, dọn dẹp driver và trở về LOBBY an toàn', () => {
    appFlowCoordinator.launchOfflineMatch(1, {
      playerCount: 4,
      activeGameType: 'QUICK'
    });

    expect(appFlowCoordinator.driver).not.toBeNull();

    appFlowCoordinator.forfeitMatch();

    expect(appFlowCoordinator.driver).toBeNull();
    expect(useGameStore.getState().currentScreen).toBe('LOBBY');
    expect(useViewStore.getState().currentScreen).toBe('LOBBY');
  });

  it('5. nextGame: Bảo toàn chính xác 100% mức cược (1000 Xu) và cấu hình bàn chơi qua các ván tiếp theo', async () => {
    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({
      ...origProfile,
      coins: 100000
    });

    const startSuccess = await appFlowCoordinator.enterQuickMatch({
      playerCount: 4,
      settlementRule: 'COUNT_CARDS',
      betAmount: 1000,
      choppingMultiplier: 2,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    });

    expect(startSuccess).toBe(true);
    useMatchmakingStore.getState().executeMatch();

    expect(useGameStore.getState().gameNumber).toBe(1);
    expect(useGameStore.getState().gameSettings.betAmount).toBe(1000);
    expect(useGameStore.getState().gameRules.table.betAmount).toBe(1000);

    const firstRoundBots = useGameStore.getState().botPersonaIds;

    // Chuyển sang ván 2 (Next Game)
    const nextSuccess = appFlowCoordinator.nextGame();
    expect(nextSuccess).toBe(true);

    expect(useGameStore.getState().gameNumber).toBe(2);
    expect(useGameStore.getState().gameSettings.betAmount).toBe(1000);
    expect(useGameStore.getState().gameRules.table.betAmount).toBe(1000);
    expect(useGameStore.getState().botPersonaIds).toEqual(firstRoundBots);

    useUserStore.getState().setProfile(origProfile);
  });
});

