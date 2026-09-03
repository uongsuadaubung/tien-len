import { 
  OfflineMatchDriver, 
  type MatchSnapshot, 
  type MatchCompletionResult, 
  type TableSessionConfig 
} from '../engine/offline-match-driver';
import { useViewStore } from '../stores/useViewStore';
import { useGameStore } from '../stores/useGameStore';
import { useUserStore } from '../stores/useUserStore';
import { useMatchmakingStore } from '../stores/useMatchmakingStore';
import { useOnlineStore } from '../stores/useOnlineStore';
import { useEcosystemStore } from '../stores/useEcosystemStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { 
  GameRulesBuilder, 
  type GameRules, 
  type GameSettings, 
  type DeepPartial, 
  type Card
} from '../engine/types';
import { resolveStrategyForMatch } from '../engine/strategies/game-mode-strategy';
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
import { assertValidMatchStartup } from '../engine/invariants/match-invariants';

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

        const strategy = resolveStrategyForMatch('QUICK', config.settlementRule);
        const setup = strategy.setupMatch({
          profile: liveProfile,
          customRules,
          customSettings: {
            mode: config.settlementRule,
            betAmount: config.betAmount,
            playerCount: config.playerCount,
            prohibitEndingWithTwo: config.prohibitEndingWithTwo
          },
          customBotPersonaIds: botIds,
          customBotConfigs: botConfigs,
          campaignChapter: null,
          playerCount: config.playerCount
        });

        this.startTable({
          gameType: 'QUICK',
          rules: setup.rules,
          settings: setup.settings,
          playerCount: setup.playerCount,
          botPersonaIds: setup.botPersonaIds,
          customBotConfigs: setup.customBotConfigs,
          campaignChapter: null
        });
      }
    });

    return true;
  }

  /**
   * Bắt đầu Chiến Dịch Cốt Truyện (Campaign Mode)
   */
  public enterCampaignMatch(chapter: CampaignChapter): boolean {
    useViewStore.getState().closeModal('CAMPAIGN');

    const liveProfile = useUserStore.getState().profile;
    const strategy = resolveStrategyForMatch('CAMPAIGN', 'COUNT_CARDS');
    const setup = strategy.setupMatch({
      profile: liveProfile,
      customRules: null,
      customSettings: null,
      customBotPersonaIds: null,
      customBotConfigs: null,
      campaignChapter: chapter,
      playerCount: 4
    });

    this.startTable({
      gameType: 'CAMPAIGN',
      rules: setup.rules,
      settings: setup.settings,
      playerCount: setup.playerCount,
      botPersonaIds: setup.botPersonaIds,
      customBotConfigs: setup.customBotConfigs,
      campaignChapter: chapter
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
        const strategy = resolveStrategyForMatch('QUICK', config.settings.mode);
        const setup = strategy.setupMatch({
          profile: liveProfile,
          customRules: null,
          customSettings: config.settings,
          customBotPersonaIds: config.botPersonaIds,
          customBotConfigs: config.customBotConfigs,
          campaignChapter: null,
          playerCount: config.playerCount
        });

        this.startTable({
          gameType: 'CUSTOM',
          rules: setup.rules,
          settings: setup.settings,
          playerCount: setup.playerCount,
          botPersonaIds: setup.botPersonaIds,
          customBotConfigs: setup.customBotConfigs,
          campaignChapter: null
        });
      }
    });

    return true;
  }

  /**
   * Khởi tạo Bàn đấu Đơn nhất (Single Flow: 100% Deterministic)
   * Không typeof, không ?? fallback, không đoán mò.
   */
  public startTable(config: TableSessionConfig): void {
    const currentProfile = useUserStore.getState().profile;
    const betAmount = config.settings.betAmount;

    // Chốt chặn 1: Kiểm tra tính toàn vẹn (Fail-fast ở Dev/Test)
    assertValidMatchStartup({
      gameNumber: 1,
      betAmount,
      playerCoins: currentProfile.coins,
      playerCount: config.playerCount,
      activeGameType: config.gameType
    });

    // 1. Quản lý vòng đời Driver
    if (this.driver) {
      this.driver.cleanup();
    }
    const settings = useSettingsStore.getState();
    const driver = new OfflineMatchDriver({
      gameSpeed: settings.gameSpeed,
      autoSortEnabled: settings.autoSortEnabled
    });
    this.driver = driver;

    driver.subscribe((snapshot: MatchSnapshot) => {
      useGameStore.getState().applyMatchSnapshot(snapshot);
    });

    driver.onComplete((result: MatchCompletionResult) => {
      if (this.onMatchCompleteHandler) {
        this.onMatchCompleteHandler(result);
      }
    });

    // 2. Tính cọc và trừ cọc an toàn
    const multiplier = config.rules.chopping.multiplier || 1;
    const targetDeposit = calculateRequiredDeposit(betAmount, multiplier);
    let actualDeposit = 0;
    if (betAmount > 0) {
      actualDeposit = Math.min(currentProfile.coins, targetDeposit);
      const updatedProfile = {
        ...currentProfile,
        coins: Math.max(0, currentProfile.coins - actualDeposit)
      };
      useUserStore.getState().setProfile(updatedProfile);
      savePlayerProfile(updatedProfile);
    }

    // 3. Lưu Match Session
    saveActiveMatchSession({
      gameId: `match_${Date.now()}`,
      gameType: config.gameType,
      mode: config.settings.mode,
      gameNumber: 1,
      depositAmount: actualDeposit,
      betAmount,
      penaltyMultiplier: multiplier,
      activeGameType: config.gameType === 'CAMPAIGN' ? 'CAMPAIGN' : 'QUICK',
      playerCount: config.playerCount,
      isRanked: config.gameType === 'QUICK',
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    // 4. Khởi tạo Bàn trong Driver
    driver.setupTable(config, currentProfile);

    // 5. Đồng bộ cấu hình vào Zustand Store (Single Source of Truth)
    const gameStore = useGameStore.getState();
    gameStore.resetMatchState();
    gameStore.setInstantWinType(undefined);
    gameStore.setActiveGameType(config.gameType === 'CAMPAIGN' ? 'CAMPAIGN' : 'QUICK');
    gameStore.setCurrentCampaignChapter(config.campaignChapter);
    gameStore.setGameRules(config.rules);
    gameStore.setGameSettings(config.settings);
    gameStore.setBotPersonaIds(config.botPersonaIds);
    gameStore.setCustomBotConfigs(config.customBotConfigs);
    gameStore.setPlayerCount(config.playerCount);

    // 6. Đóng modal và chuyển màn hình sang bàn đấu
    useViewStore.getState().closeAllModals();
    gameStore.setCurrentScreen('GAME_TABLE');
    useViewStore.getState().setScreen('GAME_TABLE');

    // 7. Bắt đầu ván 1
    driver.startRound(1);
  }

  /**
   * Khởi động ván đấu Offline (Cổng tương thích ngược)
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
    if (gameNumber === 1 || !this.driver?.tableConfig) {
      const profile = useUserStore.getState().profile;
      const gameType = options?.activeGameType || (options?.campaignChapter ? 'CAMPAIGN' : 'QUICK');
      const mode = options?.customSettings?.mode || 'COUNT_CARDS';
      const strategy = resolveStrategyForMatch(gameType, mode);
      const setup = strategy.setupMatch({
        profile,
        customRules: options?.customRules ?? null,
        customSettings: options?.customSettings ?? null,
        customBotPersonaIds: options?.customBotPersonaIds ?? null,
        customBotConfigs: options?.customBotConfigs ?? null,
        campaignChapter: options?.campaignChapter ?? null,
        playerCount: options?.playerCount ?? null
      });

      this.startTable({
        gameType,
        rules: setup.rules,
        settings: setup.settings,
        playerCount: setup.playerCount,
        botPersonaIds: setup.botPersonaIds,
        customBotConfigs: setup.customBotConfigs,
        campaignChapter: options?.campaignChapter ?? null
      });
      return;
    }

    // Nếu ván > 1 trong bàn hiện tại, trực tiếp chạy startRound
    this.driver.startRound(gameNumber, options?.preserveWinnerId);
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
   * Chuyển sang ván tiếp theo trong cùng bàn đấu (Single Flow: Rematch / Next Round)
   */
  public nextGame(campaignNextChapter?: CampaignChapter | null): boolean {
    const liveProfile = useUserStore.getState().profile;
    const currentGameType = useGameStore.getState().activeGameType;

    if (currentGameType === 'CAMPAIGN' && campaignNextChapter) {
      return this.enterCampaignMatch(campaignNextChapter);
    }

    if (currentGameType === 'ONLINE') {
      if (useOnlineStore.getState().isHost) {
        useOnlineStore.getState().startMatch();
      }
      return true;
    }

    const driver = this.driver;
    if (!driver || !driver.tableConfig) {
      throw new Error('[AppFlowCoordinator] Không thể sang ván tiếp theo vì không có bàn chơi nào đang mở!');
    }

    const betAmount = driver.tableConfig.settings.betAmount;
    if (liveProfile.coins < betAmount && currentGameType !== 'CAMPAIGN') {
      useViewStore.getState().openModal('BANK');
      return false;
    }

    useViewStore.getState().closeModal('VICTORY');

    // Trừ cọc cho ván mới
    const multiplier = driver.tableConfig.rules.chopping.multiplier || 1;
    const targetDeposit = calculateRequiredDeposit(betAmount, multiplier);
    let actualDeposit = 0;
    if (betAmount > 0) {
      actualDeposit = Math.min(liveProfile.coins, targetDeposit);
      const updatedProfile = {
        ...liveProfile,
        coins: Math.max(0, liveProfile.coins - actualDeposit)
      };
      useUserStore.getState().setProfile(updatedProfile);
      savePlayerProfile(updatedProfile);
    }

    const nextGameNumber = driver.gameNumber + 1;
    saveActiveMatchSession({
      gameId: `match_${Date.now()}`,
      gameType: driver.tableConfig.gameType,
      mode: driver.tableConfig.settings.mode,
      gameNumber: nextGameNumber,
      depositAmount: actualDeposit,
      betAmount,
      penaltyMultiplier: multiplier,
      activeGameType: driver.tableConfig.gameType === 'CAMPAIGN' ? 'CAMPAIGN' : 'QUICK',
      playerCount: driver.tableConfig.playerCount,
      isRanked: driver.tableConfig.gameType === 'QUICK',
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    const lastWinnerId = useGameStore.getState().winners[0]?.id || null;
    useGameStore.getState().setInstantWinType(undefined);

    // Chạy ván tiếp theo trực tiếp trong driver
    driver.startRound(nextGameNumber, lastWinnerId);
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
