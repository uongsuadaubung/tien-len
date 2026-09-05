import { describe, expect, it, beforeEach } from 'bun:test';
import { appFlowCoordinator } from '../../src/services/app-flow-coordinator';
import { useGameStore } from '../../src/stores/useGameStore';
import { useViewStore } from '../../src/stores/useViewStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useMatchmakingStore } from '../../src/stores/useMatchmakingStore';

describe('AppFlowCoordinator Unit Tests (Kiểm Thử Cổng Điều Phối Chuyển Cảnh Tập Trung)', () => {
  beforeEach(() => {
    appFlowCoordinator.returnToLobby();
  });

  it('1. returnToLobby: Dọn dẹp sạch sẽ tài nguyên và đưa màn hình về LOBBY', () => {
    useGameStore.getState().setCurrentScreen('GAME_TABLE');
    useViewStore.getState().setScreen('GAME_TABLE');
    useViewStore.getState().openModal('SETTINGS');

    appFlowCoordinator.returnToLobby('TEST_EXIT');

    expect(useGameStore.getState().currentScreen).toBe('LOBBY');
    expect(useViewStore.getState().currentScreen).toBe('LOBBY');
    expect(useViewStore.getState().isSettingsOpen).toBe(false);
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
      congMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    });

    expect(success).toBe(false);
    expect(useViewStore.getState().isBankLoanModalOpen).toBe(true);

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
      congMultiplier: 1,
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

  it('6. startTable: Khởi tạo bàn đấu đơn nhất (Single Flow) và vận hành liên tiếp 3 ván bảo toàn tuyệt đối 100% cấu hình', () => {
    const { GameRulesBuilder } = require('../../src/engine/types');
    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({
      ...origProfile,
      coins: 500000
    });

    const rules = new GameRulesBuilder()
      .withTable((t: any) => t.betAmount(5000).playerCount(4))
      .build();

    const settings = {
      mode: 'COUNT_CARDS',
      betAmount: 5000,
      soundEnabled: true,
      musicEnabled: true,
      gameSpeed: 'REALISTIC',
      deckType: 'standard',
      autoSort: true,
      autoSortOrder: 'asc',
      autoSortSuit: true,
      hintsEnabled: true,
      vibrationEnabled: true,
      cardBack: 'classic',
      theme: 'classic',
      playerCount: 4,
      prohibitEndingWithTwo: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    };

    appFlowCoordinator.startTable({
      gameType: 'QUICK',
      rules,
      settings: settings as any,
      playerCount: 4,
      botPersonaIds: ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1450'],
      customBotConfigs: [{}, {}, {}],
      campaignChapter: null
    });

    // Ván 1
    expect(appFlowCoordinator.driver?.gameNumber).toBe(1);
    expect(useGameStore.getState().gameSettings.betAmount).toBe(5000);
    expect(useGameStore.getState().currentScreen).toBe('GAME_TABLE');

    // Ván 2
    appFlowCoordinator.nextGame();
    expect(appFlowCoordinator.driver?.gameNumber).toBe(2);
    expect(useGameStore.getState().gameSettings.betAmount).toBe(5000);

    // Ván 3
    appFlowCoordinator.nextGame();
    expect(appFlowCoordinator.driver?.gameNumber).toBe(3);
    expect(useGameStore.getState().gameSettings.betAmount).toBe(5000);
    expect(appFlowCoordinator.driver?.tableConfig?.settings.betAmount).toBe(5000);

    useUserStore.getState().setProfile(origProfile);
  });

  it('7. Victory Modal Payout Persistence: Không bị xóa mất bảng tiền thưởng khi emit snapshot sau khi kết thúc ván', () => {
    // Giả lập sau khi kết toán, store đã có matchPayouts hợp lệ
    const dummyPayouts = { 'user_1': 26000, 'bot_1': -13000, 'bot_2': -13000 };
    useGameStore.getState().setMatchPayouts(dummyPayouts);
    expect(useGameStore.getState().matchPayouts).toEqual(dummyPayouts);

    // Giả lập driver hoặc timer trễ kích hoạt applyMatchState với GameOverMatchState rỗng (như khi chưa có settlement)
    const emptyGameOverState = {
      status: 'GAME_OVER' as const,
      gameNumber: 1,
      players: [],
      winners: [],
      isThreeSpadesWin: false,
      matchPayouts: {}, // Rỗng từ driver
      eloDeltas: {},
      matchLogReport: null,
      rules: {} as any
    };

    useGameStore.getState().applyMatchState(emptyGameOverState);

    // Bảo đảm matchPayouts không bị xóa trắng mà vẫn bảo toàn 100%
    expect(useGameStore.getState().matchPayouts).toEqual(dummyPayouts);
  });
});

