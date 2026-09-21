import { describe, it, expect, beforeEach } from 'bun:test';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../src/stores/useSettingsStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { appFlowCoordinator } from '../../src/services/app-flow-coordinator';
import { dbGetGameSettings, dbSaveGameSettings } from '../../src/engine/db/indexed-db';
import { CAMPAIGN_CHAPTERS } from '../../src/engine/campaign';

describe('Settings Persistence & Stability Tests (Kiểm Thử Độ Ổn Định Thiết Lập Cài Đặt)', () => {
  beforeEach(async () => {
    appFlowCoordinator.returnToLobby();
    useSettingsStore.setState({
      ...DEFAULT_SETTINGS,
      onlineMultiplayerBetaEnabled: false
    });
  });

  it('1. Bật onlineMultiplayerBetaEnabled và lưu bền vững vào dbGetGameSettings', async () => {
    const store = useSettingsStore.getState();
    store.setOnlineMultiplayerBetaEnabled(true);

    expect(useSettingsStore.getState().onlineMultiplayerBetaEnabled).toBe(true);

    const saved = await dbGetGameSettings();
    expect(saved).not.toBeNull();
    expect(saved?.onlineMultiplayerBetaEnabled).toBe(true);
  });

  it('2. Vào trận Chơi Nhanh (Quick Match) không được ghi đè hay làm mất onlineMultiplayerBetaEnabled', async () => {
    // 1. Người dùng bật Online Multiplayer
    useSettingsStore.getState().setOnlineMultiplayerBetaEnabled(true);
    useSettingsStore.getState().setSoundEnabled(false);
    useSettingsStore.getState().setReverseButtonsEnabled(true);

    // Cấp đủ tiền cho người chơi để vào trận
    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({ ...origProfile, coins: 100000 });

    // 2. Vào trận Quick Match
    const success = await appFlowCoordinator.enterQuickMatch({
      playerCount: 4,
      settlementRule: 'COUNT_CARDS',
      betAmount: 1000,
      choppingMultiplier: 1,
      congMultiplier: 1,
      congEnabled: true,
      prohibitEndingWithTwo: true,
      allowFourPairsCutAnytime: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    });
    expect(success).toBe(true);

    // 3. Kiểm tra Zustand store
    expect(useSettingsStore.getState().onlineMultiplayerBetaEnabled).toBe(true);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    expect(useSettingsStore.getState().reverseButtonsEnabled).toBe(true);

    // 4. Giả lập người dùng F5 hoặc mở lại ứng dụng (gọi dbGetGameSettings)
    const reloadedSettings = await dbGetGameSettings();
    expect(reloadedSettings).not.toBeNull();
    expect(reloadedSettings?.onlineMultiplayerBetaEnabled).toBe(true);
    expect(reloadedSettings?.soundEnabled).toBe(false);
    expect(reloadedSettings?.reverseButtonsEnabled).toBe(true);

    // Dọn dẹp
    appFlowCoordinator.returnToLobby();
    useUserStore.getState().setProfile(origProfile);
  });

  it('3. Vào trận Chiến Dịch (Campaign Match) không làm reset thiết lập người dùng', async () => {
    useSettingsStore.getState().setOnlineMultiplayerBetaEnabled(true);

    const origProfile = useUserStore.getState().profile;
    useUserStore.getState().setProfile({ ...origProfile, coins: 100000 });

    const chapter1 = CAMPAIGN_CHAPTERS[0];
    const success = appFlowCoordinator.enterCampaignMatch(chapter1);
    expect(success).toBe(true);

    const reloadedSettings = await dbGetGameSettings();
    expect(reloadedSettings?.onlineMultiplayerBetaEnabled).toBe(true);

    appFlowCoordinator.returnToLobby();
    useUserStore.getState().setProfile(origProfile);
  });

  it('4. Chặn triệt để ghi đè cấu hình bàn cờ (GameSettings) vào dbSaveGameSettings', async () => {
    useSettingsStore.getState().setOnlineMultiplayerBetaEnabled(true);

    // Thử gọi dbSaveGameSettings với dữ liệu bàn cờ (mode, betAmount,...) không có autoSortEnabled
    const bogusTableSettings = {
      mode: 'COUNT_CARDS',
      betAmount: 2000,
      playerCount: 4,
      allowFourPairsCutAnytime: true
    };

    await dbSaveGameSettings(bogusTableSettings as any);

    // dbGetGameSettings vẫn phải trả về dữ liệu cài đặt người dùng cũ, không bị ghi đè thành bogusTableSettings
    const saved = await dbGetGameSettings();
    expect(saved?.onlineMultiplayerBetaEnabled).toBe(true);
    expect((saved as any)?.mode).toBeUndefined();
  });
});
