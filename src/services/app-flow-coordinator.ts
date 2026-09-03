import { OfflineMatchDriver, type MatchSnapshot, type MatchCompletionResult } from '../engine/offline-match-driver';
import { useViewStore } from '../stores/useViewStore';
import { useGameStore } from '../stores/useGameStore';
import { useUserStore } from '../stores/useUserStore';
import { useMatchmakingStore } from '../stores/useMatchmakingStore';
import { useOnlineStore } from '../stores/useOnlineStore';
import { useEcosystemStore } from '../stores/useEcosystemStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { GameRulesBuilder, type GameRules, type GameSettings, type DeepPartial, type Card } from '../engine/types';
import { calculateRequiredDeposit, ECONOMY_CONSTANTS } from '../engine/constants/economy';
import { 
  saveActiveMatchSession, 
  clearActiveMatchSession, 
  getActiveMatchSession, 
  savePlayerProfile 
} from '../engine/storage';
import { matchBotsForPlayerTable } from '../engine/ecosystem/matchmaker';
import { getRandomBotConfigsForTable } from '../ai/bot-factory';
import type { QuickTableConfig } from '../engine/schemas/settings.schema';
import type { CampaignChapter } from '../engine/campaign';
import type { CustomGameModalConfig } from '../ui/web/modals/CustomGameModal';
import type { BotConfig } from '../ai/types';

export class AppFlowCoordinator {
  private static instance: AppFlowCoordinator | null = null;
  public driver: OfflineMatchDriver | null = null;
  private onMatchCompleteHandler: ((result: MatchCompletionResult) => void) | null = null;

  public static getInstance(): AppFlowCoordinator {
    if (!AppFlowCoordinator.instance) {
      AppFlowCoordinator.instance = new AppFlowCoordinator();
    }
    return AppFlowCoordinator.instance;
  }

  public setMatchCompleteHandler(handler: ((result: MatchCompletionResult) => void) | null): void {
    this.onMatchCompleteHandler = handler;
  }

  // =========================================================================
  // 1. CỔNG VÀO TRẬN ĐẤU (ENTRY GATEWAYS)
  // =========================================================================

  /**
   * Bắt đầu Chơi Nhanh / Đấu Hạng có Radar ghép trận
   */
  public async enterQuickMatch(config: QuickTableConfig): Promise<boolean> {
    const liveProfile = useUserStore.getState().profile;
    if (liveProfile.coins < config.betAmount) {
      useViewStore.getState().openModal('BANK');
      return false;
    }

    useViewStore.getState().closeModal('QUICK_SETUP');

    // Ghép Bot từ Ecosystem
    const requiredCount = (config.playerCount || 4) - 1;
    let botConfigs: Partial<BotConfig>[] = [];
    let botIds: string[] = [];

    try {
      const tableOpponents = await useEcosystemStore.getState().prepareMatchEcosystem(liveProfile.elo, config.betAmount);
      if (tableOpponents && tableOpponents.length > 0) {
        const chosen = tableOpponents.slice(0, requiredCount);
        botConfigs = chosen;
        botIds = chosen.map(b => b.id);
      }
    } catch {
      const ecosystemBots = useEcosystemStore.getState().bots;
      if (ecosystemBots.length > 0) {
        const matched = matchBotsForPlayerTable(ecosystemBots, liveProfile.elo, config.betAmount, requiredCount);
        botConfigs = matched;
        botIds = matched.map(b => b.id);
      }
    }

    if (botConfigs.length < requiredCount) {
      const fallbacks = getRandomBotConfigsForTable([1, 2, 3, 4, 5], requiredCount);
      botConfigs = fallbacks;
      botIds = fallbacks.map(b => b.id || 'BOT_ELO_1150');
    }

    // Lưu cấu hình bàn chơi
    useGameStore.getState().setQuickTableConfig(config);

    // Kích hoạt Matchmaking Radar
    useMatchmakingStore.getState().startMatchmaking({
      betAmount: config.betAmount,
      modeName: config.settlementRule === 'COUNT_CARDS' ? 'Đếm Lá (Đấu Hạng)' : config.settlementRule === 'WINNER_TAKES_ALL' ? 'Nhất Ăn Tất (Đấu Hạng)' : 'Tiến Lên Miền Nam',
      botConfigs,
      playerCount: config.playerCount ?? 4,
      onStart: () => {
        const customRules = new GameRulesBuilder()
          .withSettlement(config.settlementRule)
          .withChopping(c => c
            .multiplier(config.choppingMultiplier)
            .allowFourPairsCutAnytime(config.allowFourPairsCutAnytime)
            .allowThreePairsCutTwo(true)
            .allowFourOfAKindCutPairsOfTwos(true)
          )
          .withCong(cg => cg
            .enabled(config.congEnabled)
            .penaltyCards(config.congEnabled ? 26 : 0)
            .multiplier(config.choppingMultiplier)
          )
          .withGameFlow(f => f
            .prohibitEndingWithTwo(config.prohibitEndingWithTwo)
          )
          .withTable(t => t
            .playerCount(config.playerCount)
            .betAmount(config.betAmount)
          )
          .build();

        this.launchOfflineMatch(1, {
          playerCount: config.playerCount,
          customRules,
          customBotPersonaIds: botIds,
          customBotConfigs: botConfigs,
          activeGameType: 'QUICK'
        });
      }
    });

    return true;
  }

  /**
   * Bắt đầu Chiến Dịch Cốt Truyện (Campaign Mode)
   */
  public enterCampaignMatch(chapter: CampaignChapter): boolean {
    useGameStore.getState().setCurrentCampaignChapter(chapter);
    useViewStore.getState().closeModal('CAMPAIGN');

    this.launchOfflineMatch(1, {
      campaignChapter: chapter,
      playerCount: 4,
      activeGameType: 'CAMPAIGN'
    });

    return true;
  }

  /**
   * Bắt đầu Trận Tùy Chỉnh Sandbox (Custom Game Mode)
   */
  public async enterCustomMatch(config: CustomGameModalConfig): Promise<boolean> {
    const liveProfile = useUserStore.getState().profile;
    if (liveProfile.coins < config.settings.betAmount) {
      useViewStore.getState().openModal('BANK');
      return false;
    }

    useViewStore.getState().closeModal('CUSTOM_GAME');

    const modeTitle = config.settings.mode === 'COUNT_CARDS'
      ? 'Đếm Lá Tùy Chỉnh'
      : config.settings.mode === 'WINNER_TAKES_ALL'
        ? 'Nhất Ăn Tất Tùy Chỉnh'
        : 'Truyền Thống Tùy Chỉnh';

    useMatchmakingStore.getState().startMatchmaking({
      betAmount: config.settings.betAmount,
      modeName: modeTitle,
      botConfigs: config.customBotConfigs,
      playerCount: config.playerCount ?? 4,
      onStart: () => {
        this.launchOfflineMatch(1, {
          customSettings: config.settings,
          customBotPersonaIds: config.botPersonaIds,
          customBotConfigs: config.customBotConfigs,
          playerCount: config.playerCount,
          activeGameType: 'QUICK'
        });
      }
    });

    return true;
  }

  /**
   * Khởi động ván đấu Offline qua Driver thuần túy (Atomic Startup)
   */
  public launchOfflineMatch(
    gameNumber: number = 1,
    options?: {
      playerCount?: number | null;
      customRules?: GameRules | DeepPartial<GameRules> | null;
      customSettings?: Partial<GameSettings> | null;
      customBotPersonaIds?: string[] | null;
      customBotConfigs?: Partial<BotConfig>[] | null;
      campaignChapter?: CampaignChapter | null;
      activeGameType?: 'QUICK' | 'CAMPAIGN';
      preserveWinnerId?: string;
    }
  ): void {
    // 1. Quản lý vòng đời Driver: Tái sử dụng driver khi gameNumber > 1 và driver chưa bị hủy
    let driver = this.driver;
    if (gameNumber === 1 || !driver) {
      if (this.driver) {
        this.driver.cleanup();
      }
      const settings = useSettingsStore.getState();
      driver = new OfflineMatchDriver({
        gameSpeed: settings.gameSpeed,
        autoSortEnabled: settings.autoSortEnabled
      });
      this.driver = driver;

      // Lắng nghe snapshot và đồng bộ nguyên tử vào GameStore
      driver.subscribe((snapshot: MatchSnapshot) => {
        useGameStore.getState().applyMatchSnapshot(snapshot);
      });

      // Lắng nghe kết thúc ván đấu
      driver.onComplete((result: MatchCompletionResult) => {
        if (this.onMatchCompleteHandler) {
          this.onMatchCompleteHandler(result);
        }
      });
    }

    // 2. Chuẩn bị tài nguyên & kế thừa cấu hình bàn hiện tại cho các ván tiếp theo
    useGameStore.getState().setInstantWinType(undefined);
    const currentProfile = useUserStore.getState().profile;
    const currentGameStore = useGameStore.getState();
    const effectiveGameType = options?.activeGameType || (options?.campaignChapter ? 'CAMPAIGN' : 'QUICK');
    const effectiveRules = options?.customRules || (gameNumber > 1 ? currentGameStore.gameRules : null);
    const effectiveSettings = options?.customSettings || (gameNumber > 1 ? currentGameStore.gameSettings : null);

    // 6. Tính toán cọc và lưu session an toàn
    const customBetAmount = typeof effectiveSettings?.betAmount === 'number' 
      ? effectiveSettings.betAmount 
      : (typeof options?.customSettings?.betAmount === 'number' ? options.customSettings.betAmount : (gameNumber > 1 ? currentGameStore.gameSettings.betAmount : 100));
    const tableBet = effectiveRules?.table?.betAmount || customBetAmount;
    const multiplier = effectiveRules?.chopping?.multiplier || 1;
    const targetDeposit = calculateRequiredDeposit(tableBet, multiplier);
    let actualDeposit = 0;
    if (tableBet > 0) {
      actualDeposit = Math.min(currentProfile.coins, targetDeposit);
      const updatedProfile = {
        ...currentProfile,
        coins: Math.max(0, currentProfile.coins - actualDeposit)
      };
      useUserStore.getState().setProfile(updatedProfile);
      savePlayerProfile(updatedProfile);
    }

    const customMode = typeof effectiveSettings?.mode === 'string' 
      ? effectiveSettings.mode 
      : (typeof options?.customSettings?.mode === 'string' ? options.customSettings.mode : 'COUNT_CARDS');
    saveActiveMatchSession({
      gameId: `match_${Date.now()}`,
      gameType: effectiveGameType,
      mode: customMode,
      gameNumber,
      depositAmount: actualDeposit,
      betAmount: tableBet,
      penaltyMultiplier: multiplier,
      activeGameType: effectiveGameType,
      playerCount: options?.playerCount || currentGameStore.playerCount || 4,
      isRanked: effectiveGameType === 'QUICK',
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    // 7. Khởi chạy ván bài bên trong Driver
    driver.startMatch(gameNumber, {
      profile: currentProfile,
      customRules: effectiveRules,
      customSettings: effectiveSettings ? { ...currentGameStore.gameSettings, ...effectiveSettings } : (gameNumber > 1 ? currentGameStore.gameSettings : null),
      customBotPersonaIds: options?.customBotPersonaIds ?? (gameNumber > 1 ? [...currentGameStore.botPersonaIds] : null),
      customBotConfigs: options?.customBotConfigs ?? (gameNumber > 1 ? [...currentGameStore.customBotConfigs] : null),
      campaignChapter: options?.campaignChapter ?? (gameNumber > 1 ? currentGameStore.currentCampaignChapter : null),
      playerCount: options?.playerCount ?? (gameNumber > 1 ? currentGameStore.playerCount : null)
    }, { preserveWinnerId: options?.preserveWinnerId ?? (gameNumber > 1 ? currentGameStore.winners[0]?.id : undefined) });

    // 8. ĐỒNG BỘ RULES & SETTINGS VÀO GAMESTORE (SINGLE SOURCE OF TRUTH)
    if (driver.rules) {
      useGameStore.getState().setGameRules(driver.rules);
    }
    if (driver.settings) {
      useGameStore.getState().setGameSettings(driver.settings);
    }
    useGameStore.getState().setBotPersonaIds(driver.botPersonaIds);
    useGameStore.getState().setCustomBotConfigs(driver.customBotConfigs);
    useGameStore.getState().setPlayerCount(driver.playerCount);

    // 9. ĐÓNG MODAL VÀ CHUYỂN MÀN HÌNH AN TOÀN TUYỆT ĐỐI
    useViewStore.getState().closeAllModals();

    useGameStore.getState().setActiveGameType(effectiveGameType);
    useGameStore.getState().setCurrentScreen('GAME_TABLE');
    useViewStore.getState().setScreen('GAME_TABLE');
  }

  // =========================================================================
  // 2. CỔNG VỀ SẢNH (EXIT GATEWAYS)
  // =========================================================================

  /**
   * Cổng dọn dẹp và quay về Sảnh an toàn 100%
   */
  public returnToLobby(reason?: string): void {
    void reason;
    // 1. Dọn dẹp Driver và Timers
    if (this.driver) {
      this.driver.cleanup();
      this.driver = null;
    }

    // 2. Xóa active session để tránh bị phạt F5 oan
    clearActiveMatchSession();

    // 3. Nếu đang Online P2P thì ngắt kết nối
    const isOnline = useGameStore.getState().activeGameType === 'ONLINE';
    if (isOnline) {
      useOnlineStore.getState().leaveRoom();
    }

    // 4. Đóng toàn bộ Modals
    useViewStore.getState().closeAllModals();

    // 5. Làm sạch state bàn đấu
    useGameStore.getState().resetMatchState();

    // 6. Chuyển màn hình về Sảnh
    useGameStore.getState().setActiveGameType('QUICK');
    useGameStore.getState().setCurrentScreen('LOBBY');
    useViewStore.getState().setScreen('LOBBY');
  }

  /**
   * Bỏ cuộc giữa trận (Forfeit)
   */
  public forfeitMatch(): void {
    if (this.driver) {
      this.driver.cleanup();
      this.driver = null;
    }

    const session = getActiveMatchSession();
    clearActiveMatchSession();

    if (session) {
      const profile = useUserStore.getState().profile;
      const eloPenalty = session.isRanked ? ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY : 0;
      const nextElo = Math.max(0, profile.elo - eloPenalty);

      const updatedProfile = {
        ...profile,
        elo: nextElo,
        stats: {
          ...profile.stats,
          gamesPlayed: (profile.stats?.gamesPlayed || 0) + 1,
          currentStreak: 0
        }
      };

      useUserStore.getState().setProfile(updatedProfile);
      savePlayerProfile(updatedProfile);
    }

    this.returnToLobby('FORFEIT');
  }

  /**
   * Chuyển sang ván tiếp theo trong cùng bàn đấu (Rematch / Next Game)
   */
  public nextGame(campaignNextChapter?: CampaignChapter | null): boolean {
    const liveProfile = useUserStore.getState().profile;
    const currentGameType = useGameStore.getState().activeGameType;
    const betAmount = useGameStore.getState().gameSettings.betAmount;

    if (liveProfile.coins < betAmount && currentGameType !== 'CAMPAIGN') {
      useViewStore.getState().openModal('BANK');
      return false;
    }

    useViewStore.getState().closeModal('VICTORY');

    if (currentGameType === 'ONLINE') {
      if (useOnlineStore.getState().isHost) {
        useOnlineStore.getState().startMatch();
      }
      return true;
    }

    const currentNumber = useGameStore.getState().gameNumber;
    const gameStore = useGameStore.getState();
    const lastWinnerId = gameStore.winners[0]?.id;

    if (currentGameType === 'CAMPAIGN') {
      if (campaignNextChapter) {
        this.launchOfflineMatch(1, {
          campaignChapter: campaignNextChapter,
          playerCount: 4,
          activeGameType: 'CAMPAIGN'
        });
      } else {
        this.launchOfflineMatch(currentNumber + 1, {
          activeGameType: 'CAMPAIGN',
          campaignChapter: gameStore.currentCampaignChapter,
          customRules: gameStore.gameRules,
          customSettings: gameStore.gameSettings,
          customBotPersonaIds: [...gameStore.botPersonaIds],
          customBotConfigs: [...gameStore.customBotConfigs],
          preserveWinnerId: lastWinnerId
        });
      }
    } else {
      this.launchOfflineMatch(currentNumber + 1, {
        activeGameType: currentGameType,
        playerCount: gameStore.playerCount,
        customRules: gameStore.gameRules,
        customSettings: gameStore.gameSettings,
        customBotPersonaIds: [...gameStore.botPersonaIds],
        customBotConfigs: [...gameStore.customBotConfigs],
        preserveWinnerId: lastWinnerId
      });
    }

    return true;
  }

  // =========================================================================
  // 3. THAO TÁC TRONG BÀN ĐẤU (IN-MATCH ACTIONS)
  // =========================================================================

  public playSelectedCards(): boolean {
    if (!this.driver || !this.driver.engine) return false;
    const p0 = this.driver.engine.getPlayer('p0');
    if (!p0) return false;

    const selectedIds = useGameStore.getState().selectedCardIds;
    const cardsToPlay = p0.hand.filter(c => selectedIds.has(c.id));
    if (cardsToPlay.length === 0) return false;

    const res = this.driver.playCards('p0', cardsToPlay);
    if (res.success) {
      useGameStore.getState().clearCardSelection();
      return true;
    }
    return false;
  }

  public passTurn(): boolean {
    if (!this.driver || !this.driver.engine) return false;
    const res = this.driver.passTurn('p0');
    if (res.success) {
      useGameStore.getState().clearCardSelection();
      return true;
    }
    return false;
  }

  public autoSortHand(): void {
    if (this.driver) {
      this.driver.autoSort('p0');
    }
  }

  public finishDealing(): void {
    if (this.driver) {
      this.driver.finishDealing();
    }
  }

  public dealCardStep(playerIndex: number, currentCardCount: number): void {
    if (this.driver) {
      this.driver.dealCardStep(playerIndex, currentCardCount);
    }
  }

  public getAiHint(playerId: string = 'p0') {
    return this.driver ? this.driver.getAiHint(playerId) : null;
  }

  public getPlayerTracker(playerId: string = 'p0') {
    return this.driver ? this.driver.getTracker(playerId) : null;
  }

  public getValidMoves(playerId: string = 'p0') {
    return this.driver ? this.driver.getValidMoves(playerId) : [];
  }

  public reorderPlayerHand(playerId: string, newHand: Card[]): boolean {
    return this.driver ? this.driver.reorderPlayerHand(playerId, newHand) : false;
  }

  public hasActiveMatch(): boolean {
    return this.driver !== null && this.driver.engine !== null;
  }
}

export const appFlowCoordinator = AppFlowCoordinator.getInstance();
