import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { appFlowCoordinator } from '../../src/services/app-flow-coordinator';
import { useGameStore } from '../../src/stores/useGameStore';
import { useViewStore } from '../../src/stores/useViewStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useMatchmakingStore } from '../../src/stores/useMatchmakingStore';

describe('AppFlowCoordinator Unit Tests (Kiểm Thử Cổng Điều Phối Chuyển Cảnh Tập Trung)', () => {
  beforeEach(() => {
    appFlowCoordinator.returnToLobby();
    useViewStore.getState().closeAllModals();
  });

  afterEach(() => {
    appFlowCoordinator.returnToLobby();
    useViewStore.getState().closeAllModals();
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

  it('8. enterCustomMatch: Lưu cấu hình và khởi tạo đầy đủ rules & settings không fallback khi tắt cấm đánh 2 cuối trận', async () => {
    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({
      ...origProfile,
      coins: 100000
    });

    const startSuccess = await appFlowCoordinator.enterCustomMatch({
      selectedModeId: 'TRADITIONAL',
      playerCount: 4,
      settings: {
        mode: 'TRADITIONAL',
        betAmount: 200,
        playerCount: 4,
        allowFourPairsCutAnytime: false,
        instantWinEnabled: false,
        soundEnabled: true,
        prohibitEndingWithTwo: false,
        threeSpadesEndingBonus: false,
        cascadeChopEnabled: false
      },
      botPersonaIds: ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1450'],
      customBotConfigs: [{}, {}, {}]
    });

    expect(startSuccess).toBe(true);
    useMatchmakingStore.getState().executeMatch();

    // 1. Kiểm tra đã lưu cấu hình vào GameStore
    const state = useGameStore.getState();
    expect(state.gameSettings.prohibitEndingWithTwo).toBe(false);
    expect(state.gameRules.gameFlow.prohibitEndingWithTwo).toBe(false);
    expect(state.gameRules.gameFlow.threeSpadesEndingBonus).toBe(false);
    expect(state.gameRules.chopping.cascadeMultiplier).toBe(false);
    expect(state.gameRules.chopping.allowFourPairsCutAnytime).toBe(false);
    expect(state.gameRules.instantWin.enabled).toBe(false);
    expect(state.quickTableConfig.prohibitEndingWithTwo).toBe(false);

    // 2. Kiểm tra driver đang vận hành với rules đã chốt
    expect(appFlowCoordinator.driver?.rules?.gameFlow.prohibitEndingWithTwo).toBe(false);

    useUserStore.getState().setProfile(origProfile);
  });

  it('9. enterQuickMatch: TRADITIONAL mode nhận đúng cấu hình prohibitEndingWithTwo: false từ người chơi', async () => {
    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({
      ...origProfile,
      coins: 100000
    });

    const startSuccess = await appFlowCoordinator.enterQuickMatch({
      playerCount: 4,
      settlementRule: 'TRADITIONAL',
      betAmount: 500,
      choppingMultiplier: 1,
      congMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: false,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    });

    expect(startSuccess).toBe(true);
    useMatchmakingStore.getState().executeMatch();

    const state = useGameStore.getState();
    expect(state.gameRules.gameFlow.prohibitEndingWithTwo).toBe(false);
    expect(state.gameSettings.prohibitEndingWithTwo).toBe(false);
    expect(state.quickTableConfig.prohibitEndingWithTwo).toBe(false);

    useUserStore.getState().setProfile(origProfile);
  });

  it('10. nextGame: Bảo toàn chính xác 100% prohibitEndingWithTwo: false qua các ván tiếp theo không fallback về true', async () => {
    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({
      ...origProfile,
      coins: 100000
    });

    await appFlowCoordinator.enterQuickMatch({
      playerCount: 4,
      settlementRule: 'COUNT_CARDS',
      betAmount: 100,
      choppingMultiplier: 1,
      congMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: false,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    });
    useMatchmakingStore.getState().executeMatch();

    expect(useGameStore.getState().gameRules.gameFlow.prohibitEndingWithTwo).toBe(false);

    // Chuyển sang ván 2
    appFlowCoordinator.nextGame();
    expect(useGameStore.getState().gameNumber).toBe(2);
    expect(useGameStore.getState().gameRules.gameFlow.prohibitEndingWithTwo).toBe(false);
    expect(appFlowCoordinator.driver?.rules?.gameFlow.prohibitEndingWithTwo).toBe(false);

    useUserStore.getState().setProfile(origProfile);
  });

  it('11. assertValidMatchStartup: Bắt lỗi Fail-fast nếu rules và settings lệch pha nhau', () => {
    const { GameRulesBuilder } = require('../../src/engine/types');
    const { assertValidMatchStartup } = require('../../src/engine/invariants/match-invariants');

    const rules = new GameRulesBuilder()
      .withGameFlow((f: any) => f.prohibitEndingWithTwo(false))
      .withTable((t: any) => t.betAmount(100).playerCount(4))
      .build();

    const mismatchedSettings = {
      mode: 'COUNT_CARDS',
      betAmount: 100,
      playerCount: 4,
      prohibitEndingWithTwo: true // Lệch pha với rules (false)
    };

    expect(() => {
      assertValidMatchStartup({
        gameNumber: 1,
        betAmount: 100,
        playerCoins: 5000,
        playerCount: 4,
        activeGameType: 'QUICK',
        rules,
        settings: mismatchedSettings as any
      });
    }).toThrow('[State Invariant Violation]');
  });

  it('12. enterCustomMatch: Nhận đúng choppingMultiplier, congMultiplier, congEnabled và settlementRule được chọn không bị hardcode hoặc fallback về traditional', async () => {
    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({
      ...origProfile,
      coins: 100000
    });

    const startSuccess = await appFlowCoordinator.enterCustomMatch({
      selectedModeId: 'WINNER_TAKES_ALL',
      playerCount: 4,
      choppingMultiplier: 4,
      congMultiplier: 3,
      congEnabled: true,
      settings: {
        mode: 'WINNER_TAKES_ALL',
        betAmount: 500,
        playerCount: 4,
        allowFourPairsCutAnytime: true,
        instantWinEnabled: true,
        soundEnabled: true,
        prohibitEndingWithTwo: true,
        threeSpadesEndingBonus: true,
        cascadeChopEnabled: true
      },
      botPersonaIds: ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1450'],
      customBotConfigs: [{}, {}, {}]
    });

    expect(startSuccess).toBe(true);
    useMatchmakingStore.getState().executeMatch();

    const state = useGameStore.getState();
    // 1. Kiểm tra settlementRule nhận trực tiếp mode được chọn, không fallback
    expect(state.quickTableConfig.settlementRule).toBe('WINNER_TAKES_ALL');
    expect(state.gameRules.settlementRule).toBe('WINNER_TAKES_ALL');
    expect(state.gameSettings.mode).toBe('WINNER_TAKES_ALL');

    // 2. Kiểm tra multiplier nhận đúng giá trị do user chọn thay vì hardcode 1
    expect(state.quickTableConfig.choppingMultiplier).toBe(4);
    expect(state.quickTableConfig.congMultiplier).toBe(3);
    expect(state.quickTableConfig.congEnabled).toBe(true);

    expect(state.gameRules.chopping.multiplier).toBe(4);
    expect(state.gameRules.cong.multiplier).toBe(3);
    expect(state.gameRules.cong.enabled).toBe(true);

    // 3. Kiểm tra driver đang vận hành với rules đã chốt
    expect(appFlowCoordinator.driver?.rules?.settlementRule).toBe('WINNER_TAKES_ALL');
    expect(appFlowCoordinator.driver?.rules?.chopping.multiplier).toBe(4);
    expect(appFlowCoordinator.driver?.rules?.cong.multiplier).toBe(3);

    useUserStore.getState().setProfile(origProfile);
  });
});

