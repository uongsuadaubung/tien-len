import type { 
  TableSessionConfig 
} from '../engine/session-types';
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
  type Card,
  type MatchPlayer
} from '../engine/types';
import { resolveStrategyForMatch } from '../engine/strategies/game-mode-strategy';
import { bindSessionToGameStore } from '../stores/game/session-store-bridge';
import { calculateRequiredDeposit, ECONOMY_CONSTANTS } from '../engine/constants/economy';
import { 
  saveActiveMatchSession, 
  clearActiveMatchSession, 
  getActiveMatchSession, 
  savePlayerProfile 
} from '../engine/storage';
import { matchBotsForPlayerTable } from '../engine/ecosystem/matchmaker';
import { getRandomBotConfigsForTable, getBotConfig } from '../ai/bot-factory';
import type { QuickTableConfig, GameSettlementRule } from '../engine/schemas/settings.schema';
import type { CampaignChapter } from '../engine/campaign';
import { type BotConfig, isBotConfig } from '../ai/types';
import { assertValidMatchStartup } from '../engine/invariants/match-invariants';
import { CardTracker } from '../ai/card-tracker';
import { AuthoritativeMatchHost } from '../engine/server/match-host';
import { BotAgent } from '../engine/server/bot-agent';
import { GameEngine } from '../engine/game';
import { createBotPlayer, createMatchPlayerFromProfile } from '../engine/player-factory';
import { generateRealisticBotBankroll } from '../ai/bot-factory';
import type { IGameSession } from '../engine/presentation/game-session.interface';
import { TableSessionFactory } from '../engine/session/table-session-factory';
import { CompositeDisposable } from '../engine/common/disposable';

export interface AppFlowDriver {
  tableConfig: TableSessionConfig;
  engine: GameEngine;
  rules: GameRules;
  gameNumber: number;
  localPlayerId: string;
  startRound: (gameNum: number, preserveWinnerId?: string | null) => void;
  cleanup: () => void;
}

export class AppFlowCoordinator {
  private static instance: AppFlowCoordinator | null = null;
  public driver: AppFlowDriver | null = null;
  public activeSession: IGameSession | null = null;
  public activeHost: AuthoritativeMatchHost | null = null;
  public activeBots: BotAgent[] = [];
  public tableDisposables: CompositeDisposable | null = null;
  public currentTableConfig: TableSessionConfig | null = null;
  private sessionStoreUnsubscribe: (() => void) | null = null;

  public static getInstance(): AppFlowCoordinator {
    if (!AppFlowCoordinator.instance) {
      AppFlowCoordinator.instance = new AppFlowCoordinator();
    }
    return AppFlowCoordinator.instance;
  }

  public setActiveSession(session: IGameSession | null): void {
    if (this.sessionStoreUnsubscribe) {
      this.sessionStoreUnsubscribe();
      this.sessionStoreUnsubscribe = null;
    }
    if (this.activeSession && this.activeSession !== session) {
      this.activeSession.dispose();
    }
    this.activeSession = session;
    if (session) {
      this.sessionStoreUnsubscribe = bindSessionToGameStore(session);
    }
  }

  public getActiveSession(): IGameSession | null {
    return this.activeSession;
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
    let botConfigs: BotConfig[] = [];
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
      botIds = fallbacks.map(b => b.id);
    }

    // Lưu cấu hình bàn chơi
    useGameStore.getState().setQuickTableConfig(config);

    // Kích hoạt Matchmaking Radar
    useMatchmakingStore.getState().startMatchmaking({
      betAmount: config.betAmount,
      modeName: config.settlementRule === 'COUNT_CARDS' ? 'Đếm Lá (Đấu Hạng)' : config.settlementRule === 'WINNER_TAKES_ALL' ? 'Nhất Ăn Tất (Đấu Hạng)' : 'Tiến Lên Miền Nam',
      botConfigs,
      playerCount: config.playerCount,
      onStart: () => {
        const customRules = new GameRulesBuilder()
          .withSettlement(config.settlementRule)
          .withChopping(c => c
            .multiplier(config.choppingMultiplier)
            .allowFourPairsCutAnytime(config.allowFourPairsCutAnytime)
            .cascadeMultiplier(config.cascadeChopEnabled)
            .allowThreePairsCutTwo(true)
            .allowFourOfAKindCutPairsOfTwos(true)
          )
          .withCong(cg => cg
            .enabled(config.congEnabled)
            .penaltyCards(config.congEnabled ? 26 : 0)
            .multiplier(config.congMultiplier)
          )
          .withGameFlow(f => f
            .prohibitEndingWithTwo(config.prohibitEndingWithTwo)
            .threeSpadesEndingBonus(config.threeSpadesEndingBonus)
          )
          .withTable(t => t
            .playerCount(config.playerCount)
            .betAmount(config.betAmount)
          )
          .build();

        const quickSettings: GameSettings = {
          mode: config.settlementRule,
          betAmount: config.betAmount,
          playerCount: config.playerCount,
          allowFourPairsCutAnytime: config.allowFourPairsCutAnytime,
          instantWinEnabled: true,
          soundEnabled: true,
          prohibitEndingWithTwo: config.prohibitEndingWithTwo,
          threeSpadesEndingBonus: config.threeSpadesEndingBonus,
          cascadeChopEnabled: config.cascadeChopEnabled
        };

        // Lưu cấu hình bàn chơi và GameSettings ngay khi vào trận (Zero-Fallback)
        useGameStore.getState().setGameSettings(quickSettings);

        const strategy = resolveStrategyForMatch('QUICK', config.settlementRule);
        const setup = strategy.setupMatch({
          profile: liveProfile,
          rules: customRules,
          settings: quickSettings,
          customRules,
          customSettings: quickSettings,
          customBotPersonaIds: botIds,
          customBotConfigs: botConfigs,
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

    const campaignSettings: GameSettings = {
      mode: 'COUNT_CARDS',
      betAmount: chapter.betAmount,
      playerCount: 4,
      allowFourPairsCutAnytime: true,
      instantWinEnabled: true,
      soundEnabled: true,
      prohibitEndingWithTwo: true,
      threeSpadesEndingBonus: true,
      cascadeChopEnabled: true
    };
    const campaignRules = GameRulesBuilder.countCards()
      .withTable(t => t
        .playerCount(4)
        .betAmount(chapter.betAmount)
      )
      .build();

    useGameStore.getState().setGameSettings(campaignSettings);

    const setup = strategy.setupMatch({
      profile: liveProfile,
      rules: campaignRules,
      settings: campaignSettings,
      customRules: campaignRules,
      customSettings: campaignSettings,
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
   * Bắt đầu Trận Tùy Chỉnh (Custom Sandbox Match)
   */
  public async enterCustomMatch(config: CustomGameModalConfig): Promise<boolean> {
    const liveProfile = useUserStore.getState().profile;
    const choppingMultiplier = config.choppingMultiplier;
    const congMultiplier = config.congMultiplier;
    const congEnabled = config.congEnabled;
    const requiredDeposit = calculateRequiredDeposit(config.settings.betAmount, congMultiplier, congEnabled);

    if (liveProfile.coins < requiredDeposit) {
      useViewStore.getState().openModal('BANK');
      return false;
    }

    useViewStore.getState().closeModal('CUSTOM_GAME');

    const settlementRule: GameSettlementRule = config.settings.mode;

    // Lưu cấu hình vào store và IndexedDB ngay khi vào trận (Zero-Fallback Pre-initialization)
    useGameStore.getState().setGameSettings(config.settings);
    useGameStore.getState().setQuickTableConfig({
      playerCount: config.playerCount ?? 4,
      settlementRule,
      betAmount: config.settings.betAmount,
      choppingMultiplier,
      congMultiplier,
      congEnabled,
      prohibitEndingWithTwo: config.settings.prohibitEndingWithTwo,
      allowFourPairsCutAnytime: config.settings.allowFourPairsCutAnytime,
      threeSpadesEndingBonus: config.settings.threeSpadesEndingBonus,
      cascadeChopEnabled: config.settings.cascadeChopEnabled
    });

    const modeTitle = config.settings.mode === 'COUNT_CARDS'
      ? 'Đếm Lá Tùy Chỉnh'
      : config.settings.mode === 'WINNER_TAKES_ALL'
        ? 'Nhất Ăn Tất Tùy Chỉnh'
        : 'Truyền Thống Tùy Chỉnh';

    const resolvedBotConfigs: BotConfig[] = config.botPersonaIds.map((id, idx) =>
      getBotConfig(id, config.customBotConfigs[idx])
    );

    useMatchmakingStore.getState().startMatchmaking({
      betAmount: config.settings.betAmount,
      modeName: modeTitle,
      botConfigs: resolvedBotConfigs,
      playerCount: config.playerCount,
      onStart: () => {
        const customRules = new GameRulesBuilder()
          .withSettlement(settlementRule)
          .withChopping(c => c
            .allowFourPairsCutAnytime(config.settings.allowFourPairsCutAnytime)
            .cascadeMultiplier(config.settings.cascadeChopEnabled)
            .allowThreePairsCutTwo(true)
            .allowFourOfAKindCutPairsOfTwos(true)
            .multiplier(choppingMultiplier)
          )
          .withCong(cg => cg
            .enabled(congEnabled)
            .penaltyCards(26)
            .multiplier(congMultiplier)
          )
          .withGameFlow(f => f
            .prohibitEndingWithTwo(config.settings.prohibitEndingWithTwo)
            .threeSpadesEndingBonus(config.settings.threeSpadesEndingBonus)
          )
          .withInstantWin(iw => iw
            .enabled(config.settings.instantWinEnabled)
          )
          .withTable(t => t
            .playerCount(config.playerCount ?? 4)
            .betAmount(config.settings.betAmount)
          )
          .build();

        const strategy = resolveStrategyForMatch('QUICK', config.settings.mode);
        const setup = strategy.setupMatch({
          profile: liveProfile,
          rules: customRules,
          settings: config.settings,
          customRules,
          customSettings: config.settings,
          customBotPersonaIds: config.botPersonaIds,
          customBotConfigs: config.customBotConfigs,
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
      activeGameType: config.gameType,
      rules: config.rules,
      settings: config.settings
    });

    this.currentTableConfig = config;

    // 1. Quản lý dọn dẹp các phiên và host cũ
    if (this.activeHost) {
      this.activeHost.dispose();
      this.activeHost = null;
    }
    if (this.activeBots.length > 0) {
      this.activeBots.forEach(b => b.dispose());
      this.activeBots = [];
    }
    this.setActiveSession(null);

    // 2. Tính cọc và trừ cọc an toàn
    const multiplier = config.rules.chopping.multiplier;
    const targetDeposit = calculateRequiredDeposit(
      betAmount,
      config.rules.cong.multiplier,
      config.rules.cong.enabled
    );
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

    // 4. Khởi tạo danh sách người chơi (Người chơi thật + Các Bot)
    const initialPlayers: MatchPlayer[] = [
      createMatchPlayerFromProfile(currentProfile)
    ];

    for (let i = 0; i < config.playerCount - 1; i++) {
      const personaId = config.botPersonaIds[i];
      const customConfig = config.customBotConfigs[i];
      const botCfg = isBotConfig(customConfig)
        ? customConfig
        : getBotConfig(personaId, customConfig);
      const botId = `bot_${i + 1}`;
      initialPlayers.push(
        createBotPlayer(botId, personaId, {
          name: botCfg.name,
          avatar: botCfg.avatar,
          score: generateRealisticBotBankroll(botCfg, config.settings.betAmount),
          customBotConfig: customConfig
        })
      );
    }

    // 5. Khởi tạo toàn bộ hạ tầng trận đấu qua TableSessionFactory (Listen-Server, Session, Bots, Transports)
    const bundle = TableSessionFactory.createOfflineTableSession({
      localPlayerId: currentProfile.id,
      initialPlayers,
      rules: config.rules,
      activeGameType: config.gameType === 'CAMPAIGN' ? 'CAMPAIGN' : 'QUICK',
      campaignChapter: config.campaignChapter ?? undefined,
      campaignResultMeta: useGameStore.getState().campaignResultMeta,
      enableDealingAnimation: true,
      gameSpeed: () => useSettingsStore.getState().gameSpeed,
      onThinkingChange: (bId, thought) => {
        useGameStore.getState().setBotThinkingThought(thought ? { botId: bId, text: thought } : null);
      }
    });

    const host = bundle.host;
    this.activeHost = host;
    this.activeBots = bundle.bots;
    this.tableDisposables = bundle.disposables;
    this.setActiveSession(bundle.session);

    // 9. Cầu nối tương thích ngược cho các test suite kiểm tra appFlowCoordinator.driver
    this.driver = {
      tableConfig: config,
      engine: host.engine,
      rules: config.rules,
      get gameNumber() {
        return host.gameNumber;
      },
      set gameNumber(val: number) {
        host.gameNumber = val;
      },
      localPlayerId: currentProfile.id,
      startRound: (gameNum: number, preserveWinnerId?: string | null) => {
        host.startMatch(gameNum, preserveWinnerId);
        useGameStore.getState().setGameNumber(gameNum);
      },
      cleanup: () => {
        if (this.activeHost) {
          this.activeHost.dispose();
          this.activeHost = null;
        }
      }
    };

    // 10. Đồng bộ cấu hình ban đầu vào Zustand Store (Single Source of Truth)
    const gameStore = useGameStore.getState();
    gameStore.setMyPlayerId(currentProfile.id);
    gameStore.setPlayers(initialPlayers);
    gameStore.resetMatchState();
    gameStore.setInstantWinType(undefined);
    gameStore.setActiveGameType(config.gameType === 'CAMPAIGN' ? 'CAMPAIGN' : 'QUICK');
    gameStore.setCurrentCampaignChapter(config.campaignChapter);
    gameStore.setGameRules(config.rules);
    gameStore.setGameSettings(config.settings);
    gameStore.setBotPersonaIds(config.botPersonaIds);
    gameStore.setCustomBotConfigs(config.customBotConfigs);
    gameStore.setPlayerCount(config.playerCount);

    // 11. Đóng modal và chuyển màn hình sang bàn đấu
    useViewStore.getState().closeAllModals();
    gameStore.setCurrentScreen('GAME_TABLE');
    useViewStore.getState().setScreen('GAME_TABLE');

    // 12. Host bắt đầu ván 1
    host.startMatch(1);
  }

  /**
   * Khởi động ván đấu Offline (Cổng tương thích ngược)
   */
  public launchOfflineMatch(
    gameNumber: number = 1,
    options?: {
      playerCount?: number;
      customRules?: GameRules | DeepPartial<GameRules>;
      customSettings?: Partial<GameSettings>;
      customBotPersonaIds?: string[];
      customBotConfigs?: Partial<BotConfig>[];
      campaignChapter?: CampaignChapter;
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
        customRules: options?.customRules,
        customSettings: options?.customSettings,
        customBotPersonaIds: options?.customBotPersonaIds,
        customBotConfigs: options?.customBotConfigs,
        campaignChapter: options?.campaignChapter,
        playerCount: options?.playerCount
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

    if (this.activeHost) {
      this.activeHost.startMatch(gameNumber, options?.preserveWinnerId);
      if (this.driver) {
        this.driver.gameNumber = gameNumber;
      }
      useGameStore.getState().setGameNumber(gameNumber);
      return;
    }

    // Nếu ván > 1 trong bàn hiện tại, trực tiếp chạy startRound
    if (this.driver?.startRound) {
      this.driver.startRound(gameNumber, options?.preserveWinnerId);
    }
  }

  // =========================================================================
  // 2. CỔNG VỀ SẢNH (EXIT GATEWAYS)
  // =========================================================================

  /**
   * Cổng dọn dẹp và quay về Sảnh an toàn 100%
   */
  public returnToLobby(reason?: string): void {
    void reason;
    // 1. Dọn dẹp Driver, Session, Host, Bots, Subscriptions và Timers
    if (this.tableDisposables) {
      this.tableDisposables.dispose();
      this.tableDisposables = null;
    }
    if (this.activeHost) {
      this.activeHost.dispose();
      this.activeHost = null;
    }
    if (this.activeBots.length > 0) {
      this.activeBots.forEach(b => b.dispose());
      this.activeBots = [];
    }
    this.setActiveSession(null);
    this.currentTableConfig = null;
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
    if (this.activeHost) {
      this.activeHost.dispose();
      this.activeHost = null;
    }
    if (this.activeBots.length > 0) {
      this.activeBots.forEach(b => b.dispose());
      this.activeBots = [];
    }
    this.setActiveSession(null);
    this.currentTableConfig = null;
    if (this.driver) {
      this.driver.cleanup();
      this.driver = null;
    }

    if (useGameStore.getState().activeGameType === 'ONLINE') {
      useOnlineStore.getState().leaveRoom();
      return;
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
          gamesPlayed: profile.stats.gamesPlayed + 1,
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

    const tableConfig = this.currentTableConfig;
    if (!tableConfig) {
      throw new Error('[AppFlowCoordinator] Không thể sang ván tiếp theo vì không có bàn chơi nào đang mở!');
    }

    const betAmount = tableConfig.settings.betAmount;
    if (liveProfile.coins < betAmount && currentGameType !== 'CAMPAIGN') {
      useViewStore.getState().openModal('BANK');
      return false;
    }

    useViewStore.getState().closeModal('VICTORY');

    // Trừ cọc cho ván mới
    const multiplier = tableConfig.rules.chopping.multiplier;
    const targetDeposit = calculateRequiredDeposit(
      betAmount,
      tableConfig.rules.cong.multiplier,
      tableConfig.rules.cong.enabled
    );
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

    const nextGameNumber = useGameStore.getState().gameNumber + 1;
    saveActiveMatchSession({
      gameId: `match_${Date.now()}`,
      gameType: tableConfig.gameType,
      mode: tableConfig.settings.mode,
      gameNumber: nextGameNumber,
      depositAmount: actualDeposit,
      betAmount,
      penaltyMultiplier: multiplier,
      activeGameType: tableConfig.gameType === 'CAMPAIGN' ? 'CAMPAIGN' : 'QUICK',
      playerCount: tableConfig.playerCount,
      isRanked: tableConfig.gameType === 'QUICK',
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    const lastWinnerId = this.activeHost?.lastWinnerId || this.activeSession?.lastWinnerId || useGameStore.getState().winners[0]?.id || null;
    useGameStore.getState().setInstantWinType(undefined);
    useGameStore.getState().setGameNumber(nextGameNumber);

    if (this.activeHost) {
      this.activeHost.startMatch(nextGameNumber, lastWinnerId || undefined);
      if (this.driver) {
        this.driver.gameNumber = nextGameNumber;
      }
      return true;
    }

    return true;
  }

  // =========================================================================
  // 3. THAO TÁC TRONG BÀN ĐẤU (IN-MATCH ACTIONS)
  // =========================================================================

  public playSelectedCards(): boolean {
    const gameStore = useGameStore.getState();
    const selectedIds = gameStore.selectedCardIds;
    if (selectedIds.size === 0) return false;

    if (this.activeSession) {
      this.activeSession.sendIntent({ type: 'SET_SELECTED_CARDS', cardIds: Array.from(selectedIds) });
      this.activeSession.sendIntent({ type: 'SUBMIT_PLAY' });
      gameStore.clearCardSelection();
      return true;
    }

    if (gameStore.activeGameType === 'ONLINE') {
      useOnlineStore.getState().sendMoveAction(Array.from(selectedIds));
      gameStore.clearCardSelection();
      return true;
    }

    return false;
  }

  public passTurn(): boolean {
    const gameStore = useGameStore.getState();
    if (this.activeSession) {
      this.activeSession.sendIntent({ type: 'SUBMIT_PASS' });
      gameStore.clearCardSelection();
      return true;
    }

    if (gameStore.activeGameType === 'ONLINE') {
      useOnlineStore.getState().sendPassAction();
      gameStore.clearCardSelection();
      return true;
    }

    return false;
  }

  public quickSelect(): boolean {
    if (this.activeSession) {
      this.activeSession.sendIntent({ type: 'TRIGGER_QUICK_SELECT' });
      return true;
    }
    return false;
  }

  public autoSortHand(): void {
    if (this.activeSession) {
      this.activeSession.sendIntent({ type: 'SORT_HAND' });
      return;
    }
  }

  public finishDealing(): void {
    if (this.activeHost) {
      this.activeHost.finishDealing();
    }
    if (this.activeSession && typeof this.activeSession.finishDealing === 'function') {
      this.activeSession.finishDealing();
    }
  }

  public dealCardStep(playerIndex: number, currentCardCount: number): void {
    if (this.activeHost) {
      this.activeHost.dealCardStep(playerIndex, currentCardCount);
    }
    if (this.activeSession && typeof this.activeSession.dealCardStep === 'function') {
      this.activeSession.dealCardStep(playerIndex, currentCardCount);
    }
  }

  public getAiHint(playerId: string) {
    if (this.activeHost) {
      return this.activeHost.getAiHint(playerId);
    }
    return null;
  }

  public getPlayerTracker(playerId: string): CardTracker | null {
    if (this.activeHost) {
      return this.activeHost.getTracker(playerId);
    }
    return null;
  }

  public getValidMoves(playerId: string) {
    if (this.activeHost) {
      return this.activeHost.getValidMoves(playerId);
    }
    return [];
  }

  public reorderPlayerHand(playerId: string, newHand: Card[]): boolean {
    if (this.activeSession) {
      this.activeSession.sendIntent({ type: 'REORDER_HAND', newHand });
      return true;
    }
    return false;
  }

  public hasActiveMatch(): boolean {
    return (
      this.activeHost !== null ||
      this.activeSession !== null
    );
  }
}

export const appFlowCoordinator = AppFlowCoordinator.getInstance();

