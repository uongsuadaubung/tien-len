import { GameEngine } from './game';
import { 
  type Card, 
  type Player, 
  type PlayedMove, 
  type InstantWinType,
  type GameRules,
  type GameSettings,
  type BotPersonaIdTuple,
  type CustomBotConfigTuple,
  createDefaultGameRules
} from './types';
import { mapMatchStateToSnapshot, type MatchState } from './state-machine';
import type { BotConfig } from '../ai/types';
import { CardTracker } from '../ai/card-tracker';
import { getBotConfig } from '../ai/bot-factory';
import { calculateDynamicBotDelay, type GameSpeedMode } from './game-speed';
import { isTwo, sortCards } from './card';
import { GameEventBus } from './events/game-event-bus';
import { UI_TIMINGS } from '../ui/constants/ui-timings';
import { resolveStrategyForMatch, type MatchSetupContext } from './strategies/game-mode-strategy';
import { generateRealisticBotBankroll } from '../ai/bot-factory';
import { OpponentProfiler } from '../ai/opponent-profiler';
import type { ChopNotificationData } from '../stores/useGameStore';
import type { PlayerProfile } from './storage';
import type { CampaignChapter } from './campaign';
import { getOptimalMoveHint, type MoveHint } from '../ai/hint-engine';
import { getSortedQuickSelectCandidates } from './quick-response-finder';
import { assertValidSnapshot } from './invariants/match-invariants';
import type { IMatchDriver } from './match-driver.interface';

export interface TableSessionConfig {
  gameType: 'QUICK' | 'CAMPAIGN' | 'CUSTOM';
  rules: GameRules;
  settings: GameSettings;
  playerCount: number;
  botPersonaIds: BotPersonaIdTuple;
  customBotConfigs: CustomBotConfigTuple<BotConfig>;
  campaignChapter: CampaignChapter | null;
}

export interface MatchSnapshot {
  gameNumber: number;
  players: Player[];
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  currentMove: PlayedMove | null;
  winners: Player[];
  isGameOver: boolean;
  instantWinType?: InstantWinType | null;
  isDealing: boolean;
  dealtCounts: Record<string, number>;
  dealBanner: string | null;
  chopNotification: ChopNotificationData | null;
  botThinkingThought: { botId: string; text: string } | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
}

export interface MatchCompletionResult {
  engine: GameEngine;
  instantWin: boolean;
  instantWinType?: InstantWinType;
}

export type SnapshotListener = (snapshot: MatchSnapshot) => void;
export type MatchStateListener = (state: MatchState) => void;
export type CompletionListener = (result: MatchCompletionResult) => void;

export class OfflineMatchDriver implements IMatchDriver {
  public tableConfig: TableSessionConfig | null = null;
  public engine: GameEngine | null = null;
  public trackers: Record<string, CardTracker> = {};
  public gameNumber: number = 1;
  public lastWinnerId: string | null = null;
  public rules: GameRules | null = null;
  public settings: GameSettings | null = null;
  public botPersonaIds: BotPersonaIdTuple = ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1450'];
  public customBotConfigs: CustomBotConfigTuple<BotConfig> = [{}, {}, {}];
  public playerCount: number = 4;

  // Visual & State properties
  public isDealing: boolean = false;
  public dealtCounts: Record<string, number> = {};
  public dealBanner: string | null = null;
  public chopNotification: ChopNotificationData | null = null;
  public botThinkingThought: { botId: string; text: string } | null = null;
  public instantWinType: InstantWinType | null = null;
  public instantWinner: Player | null = null;

  // Runtime control
  private isDisposed: boolean = false;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private chopTimer: ReturnType<typeof setTimeout> | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private gameSpeed: GameSpeedMode = 'REALISTIC';
  private autoSortEnabled: boolean = true;

  // Observers
  private snapshotListeners: Set<SnapshotListener> = new Set();
  private matchStateListeners: Set<MatchStateListener> = new Set();
  private completionListeners: Set<CompletionListener> = new Set();

  constructor(options: { gameSpeed: GameSpeedMode | null; autoSortEnabled: boolean | null } | null = null) {
    if (options && options.gameSpeed !== null) this.gameSpeed = options.gameSpeed;
    if (options && options.autoSortEnabled !== null) this.autoSortEnabled = options.autoSortEnabled;
  }

  public setGameSpeed(speed: GameSpeedMode): void {
    this.gameSpeed = speed;
  }

  public setAutoSortEnabled(enabled: boolean): void {
    this.autoSortEnabled = enabled;
  }

  public subscribe(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  public subscribeMatchState(listener: MatchStateListener): () => void {
    this.matchStateListeners.add(listener);
    listener(this.getMatchState());
    return () => {
      this.matchStateListeners.delete(listener);
    };
  }

  public onComplete(listener: CompletionListener): () => void {
    this.completionListeners.add(listener);
    return () => {
      this.completionListeners.delete(listener);
    };
  }

  private emitSnapshot(): void {
    if (this.isDisposed) return;
    const snapshot = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
    const matchState = this.getMatchState();
    for (const stateListener of this.matchStateListeners) {
      stateListener(matchState);
    }
  }

  /**
   * Lấy trạng thái trận đấu theo chuẩn Type-Safe State Pattern (Discriminated Union)
   */
  public getMatchState(): MatchState {
    if (!this.engine) {
      return {
        status: 'WAITING',
        gameNumber: this.gameNumber,
        players: [],
        rules: this.rules || (this.tableConfig ? this.tableConfig.rules : createDefaultGameRules()),
        lastWinnerId: this.lastWinnerId
      };
    }

    if (this.isDealing) {
      const resolvedDealtCounts: Record<string, number> = {};
      let totalCards = 0;
      for (const p of this.engine.players) {
        const count = this.dealtCounts[p.id] ?? 0;
        resolvedDealtCounts[p.id] = count;
        totalCards += count;
      }
      return {
        status: 'DEALING',
        gameNumber: this.engine.gameNumber,
        players: [...this.engine.players],
        dealtCounts: resolvedDealtCounts,
        dealBanner: this.dealBanner,
        totalCardsDealt: totalCards,
        rules: this.engine.rules
      };
    }

    if (this.instantWinType) {
      const winner = this.instantWinner || this.engine.instantWinner || this.engine.players[0];
      return {
        status: 'INSTANT_WIN',
        gameNumber: this.engine.gameNumber,
        players: [...this.engine.players],
        instantWinner: winner,
        instantWinType: this.instantWinType,
        matchPayouts: {},
        eloDeltas: {},
        matchLogReport: null,
        rules: this.engine.rules
      };
    }

    if (this.engine.isGameOver) {
      return {
        status: 'GAME_OVER',
        gameNumber: this.engine.gameNumber,
        players: [...this.engine.players],
        winners: [...this.engine.winners],
        isThreeSpadesWin: this.engine.isThreeSpadesWin,
        matchPayouts: {},
        eloDeltas: {},
        matchLogReport: null,
        rules: this.engine.rules
      };
    }

    if (this.engine.currentRound.isFinished) {
      return {
        status: 'ROUND_ENDED',
        gameNumber: this.engine.gameNumber,
        roundNumber: this.engine.roundNumber,
        players: [...this.engine.players],
        roundWinnerId: this.engine.currentRound.leadPlayerId,
        nextLeadPlayerId: this.engine.currentRound.leadPlayerId,
        lastRoundMoves: [...this.engine.currentRound.moves],
        chopNotification: this.chopNotification ? { ...this.chopNotification } : null,
        rules: this.engine.rules
      };
    }

    return {
      status: 'PLAYING',
      gameNumber: this.engine.gameNumber,
      roundNumber: this.engine.roundNumber,
      players: [...this.engine.players],
      currentTurnPlayerId: this.engine.currentRound.currentTurnPlayerId,
      leadPlayerId: this.engine.currentRound.leadPlayerId,
      roundMoves: [...this.engine.currentRound.moves],
      leadingMove: this.engine.getLeadingMove(),
      isLeadMove: this.engine.isRoundLeadMove(),
      isFirstMoveOfGame: this.engine.isFirstMoveOfGame,
      passedPlayerIds: [...this.engine.currentRound.passedPlayerIds],
      chopNotification: this.chopNotification ? { ...this.chopNotification } : null,
      botThinkingThought: this.botThinkingThought ? { ...this.botThinkingThought } : null,
      rules: this.engine.rules
    };
  }

  public getSnapshot(): MatchSnapshot {
    const snapshot = mapMatchStateToSnapshot(this.getMatchState());
    if (this.engine) {
      assertValidSnapshot(snapshot);
    }
    return snapshot;
  }

  /**
   * Khởi tạo bàn đấu (Chạy đúng 1 lần khi người chơi bắt đầu phiên chơi bàn)
   */
  public setupTable(config: TableSessionConfig, profile: PlayerProfile): void {
    this.tableConfig = config;
    this.rules = config.rules;
    this.settings = config.settings;
    this.botPersonaIds = config.botPersonaIds;
    this.customBotConfigs = config.customBotConfigs;
    this.playerCount = config.playerCount;
    this.gameNumber = 0;
    this.lastWinnerId = null;
    this.trackers = {};
    OpponentProfiler.getInstance().reset();

    const strategy = resolveStrategyForMatch(
      config.gameType === 'CAMPAIGN' ? 'CAMPAIGN' : 'QUICK',
      config.settings.mode
    );

    const setup = strategy.setupMatch({
      profile,
      customRules: config.rules,
      customSettings: config.settings,
      customBotPersonaIds: config.botPersonaIds,
      customBotConfigs: config.customBotConfigs,
      campaignChapter: config.campaignChapter,
      playerCount: config.playerCount
    });

    const engine = new GameEngine(setup.initialPlayers, config.rules);
    this.engine = engine;

    const newTrackers: Record<string, CardTracker> = {};
    for (const player of engine.players) {
      if (player.isBot) {
        const botConfig = getBotConfig(player.botPersonaId || 'BOT_ELO_1150');
        newTrackers[player.id] = new CardTracker(player.hand, botConfig.memoryDepth);
      }
    }
    this.trackers = newTrackers;
  }

  /**
   * Bắt đầu một ván đấu trong bàn (Ván 1, Ván 2, Ván 3...)
   * Luồng đơn nhất: Tái sử dụng 100% cấu hình bàn đã khởi tạo, không đoán mò fallback.
   */
  public startRound(roundNumber: number, preserveWinnerId?: string | null): MatchSnapshot {
    if (!this.engine || !this.tableConfig) {
      throw new Error('[OfflineMatchDriver] Không thể bắt đầu ván đấu khi bàn chưa được khởi tạo!');
    }

    this.cleanupTimers();
    this.isDisposed = false;
    this.gameNumber = roundNumber;
    this.instantWinType = null;
    this.instantWinner = null;
    this.botThinkingThought = null;
    this.chopNotification = null;

    if (roundNumber > 1) {
      const betAmount = this.tableConfig.settings.betAmount;
      for (let idx = 1; idx < this.engine.players.length; idx++) {
        const p = this.engine.players[idx];
        if (p.isBot && p.score < betAmount) {
          const botIdx = idx - 1;
          const chapterBot = this.tableConfig.campaignChapter?.bots[botIdx] || this.tableConfig.customBotConfigs[botIdx];
          p.score = generateRealisticBotBankroll(chapterBot || {}, betAmount);
        }
      }
    }

    const winnerToPreserve = preserveWinnerId || (roundNumber > 1 ? this.lastWinnerId || undefined : undefined);
    const startResult = this.engine.startNewGame(roundNumber, winnerToPreserve);

    // Cập nhật card trackers với bài mới
    for (const player of this.engine.players) {
      if (player.isBot && this.trackers[player.id]) {
        const botConfig = getBotConfig(player.botPersonaId || 'BOT_ELO_1150');
        this.trackers[player.id] = new CardTracker(player.hand, botConfig.memoryDepth);
      }
    }

    // Hoạt ảnh chia bài
    const initialDealtCounts: Record<string, number> = {};
    for (const p of this.engine.players) {
      initialDealtCounts[p.id] = 0;
    }
    this.isDealing = true;
    this.dealtCounts = initialDealtCounts;
    this.dealBanner = null;

    // Xử lý Tới Trắng (Instant Win)
    if (startResult.instantWin) {
      this.instantWinType = startResult.instantWinType;
      this.instantWinner = startResult.instantWinner;
      this.isDealing = false;
      const winnerId = startResult.instantWinner.id;

      GameEventBus.getInstance().emit({
        type: 'INSTANT_WIN',
        winnerPlayerId: winnerId,
        instantWinType: startResult.instantWinType
      });
      this.emitSnapshot();

      this.bannerTimer = setTimeout(() => {
        if (!this.isDisposed && this.engine) {
          for (const listener of this.completionListeners) {
            listener({
              engine: this.engine,
              instantWin: true,
              instantWinType: startResult.instantWinType
            });
          }
        }
      }, UI_TIMINGS.BANNER_DISPLAY_DURATION_MS);
      return this.getSnapshot();
    }

    this.emitSnapshot();
    return this.getSnapshot();
  }

  /**
   * Cổng tương thích ngược: Tự động khởi tạo bàn nếu chưa có và bắt đầu ván
   */
  public startMatch(
    gameNumber: number = 1,
    context: Partial<MatchSetupContext> & { profile: PlayerProfile },
    options?: { preserveWinnerId?: string }
  ): MatchSnapshot {
    if (gameNumber === 1 || !this.tableConfig) {
      const gameType = context.campaignChapter ? 'CAMPAIGN' : 'QUICK';
      const mode = context.customSettings?.mode || 'COUNT_CARDS';
      const strategy = resolveStrategyForMatch(gameType, mode);
      const setup = strategy.setupMatch({
        profile: context.profile,
        customRules: context.customRules ?? null,
        customSettings: context.customSettings ?? null,
        customBotPersonaIds: context.customBotPersonaIds ?? null,
        customBotConfigs: context.customBotConfigs ?? null,
        campaignChapter: context.campaignChapter ?? null,
        playerCount: context.playerCount ?? null
      });

      this.setupTable({
        gameType,
        rules: setup.rules,
        settings: setup.settings,
        playerCount: setup.playerCount,
        botPersonaIds: setup.botPersonaIds,
        customBotConfigs: setup.customBotConfigs,
        campaignChapter: context.campaignChapter ?? null
      }, context.profile);
    }

    return this.startRound(gameNumber, options?.preserveWinnerId);
  }

  public finishDealing(): void {
    if (!this.engine || !this.isDealing) return;
    this.isDealing = false;

    if (this.autoSortEnabled) {
      const p0 = this.engine.getPlayer('p0');
      if (p0) {
        p0.hand = sortCards(p0.hand);
      }
    }

    const counts: Record<string, number> = {};
    for (const p of this.engine.players) {
      counts[p.id] = p.hand.length;
    }
    this.dealtCounts = counts;

    const leadPlayer = this.engine.getCurrentPlayer();
    let leadText = '';
    if (this.engine.gameNumber > 1) {
      leadText = leadPlayer?.isBot
        ? `${leadPlayer.name} (${leadPlayer.avatar}) giành quyền mở màn (Thắng ván trước)!`
        : 'Bạn (Người Chơi) giành quyền mở màn (Thắng ván trước)!';
    } else {
      const reason = this.engine.isFirstMoveOfGame ? '3 Bích' : 'Bài nhỏ nhất';
      leadText = leadPlayer?.isBot
        ? `${leadPlayer.name} (${leadPlayer.avatar}) giành quyền mở màn (${reason})!`
        : `Bạn (Người Chơi) giành quyền mở màn (${reason})!`;
    }

    this.dealBanner = leadText;
    this.emitSnapshot();

    this.bannerTimer = setTimeout(() => {
      if (!this.isDisposed) {
        this.dealBanner = null;
        this.emitSnapshot();
        this.triggerBotTurnIfNeeded();
      }
    }, UI_TIMINGS.BANNER_DISPLAY_DURATION_MS);
  }

  public dealCardStep(playerIndex: number, currentCardCount: number): void {
    const playerId = 'p' + playerIndex;
    this.dealtCounts[playerId] = currentCardCount;
    this.emitSnapshot();
  }

  public autoSort(playerId: string = 'p0'): Card[] {
    if (!this.engine) return [];
    const player = this.engine.getPlayer(playerId);
    if (!player) return [];
    player.hand = sortCards(player.hand);
    this.emitSnapshot();
    return [...player.hand];
  }

  public playCards(playerId: string, cards: Card[]): { success: boolean; error?: string } {
    if (!this.engine || this.isDealing || this.engine.isGameOver) {
      return { success: false, error: 'Trận đấu chưa sẵn sàng.' };
    }

    const player = this.engine.getPlayer(playerId);
    if (!player) return { success: false, error: 'Không tìm thấy người chơi.' };

    const moveRes = this.engine.playMove(playerId, cards);
    if (!moveRes.success) {
      return { success: false, error: moveRes.error || 'Nước đi không hợp lệ' };
    }

    this.dealtCounts[playerId] = player.hand.length;
    if (moveRes.playedMove) {
      GameEventBus.getInstance().emit({
        type: 'CARD_PLAYED',
        playerId,
        cards: [...moveRes.playedMove.combination.cards],
        combination: moveRes.playedMove.combination,
        remainingCardsCount: player.hand.length
      });
    }

    // Xử lý chặt heo / hàng
    if (moveRes.isChop && moveRes.choppedPlayerId) {
      const chopped = this.engine.getPlayer(moveRes.choppedPlayerId);
      const penalty = moveRes.penaltyAmount || 0;
      this.triggerChopAlert(
        player.name,
        chopped?.name || 'Đối thủ',
        penalty,
        moveRes.isCascadeChop || false,
        moveRes.chopChainCount || 1,
        playerId,
        moveRes.choppedPlayerId,
        [...cards]
      );
    }

    const lastMove = this.engine.getLeadingMove();
    if (lastMove) {
      for (const t of Object.values(this.trackers)) {
        t.recordMove(lastMove);
      }
    }

    this.emitSnapshot();

    if (this.engine.isGameOver) {
      this.handleGameOver();
    } else {
      this.triggerBotTurnIfNeeded();
    }

    return { success: true };
  }

  public passTurn(playerId: string): { success: boolean; error?: string } {
    if (!this.engine || this.isDealing || this.engine.isGameOver) {
      return { success: false, error: 'Trận đấu chưa sẵn sàng.' };
    }

    const passRes = this.engine.passTurn(playerId);
    if (!passRes.success) {
      return { success: false, error: passRes.error || 'Không thể bỏ lượt lúc này.' };
    }

    GameEventBus.getInstance().emit({
      type: 'TURN_PASSED',
      playerId
    });

    const leadingMove = this.engine.getLeadingMove();
    if (leadingMove) {
      for (const t of Object.values(this.trackers)) {
        t.recordPassWithDetails(playerId, leadingMove.combination);
      }
    }

    this.emitSnapshot();

    if (this.engine.isGameOver) {
      this.handleGameOver();
    } else {
      this.triggerBotTurnIfNeeded();
    }

    return { success: true };
  }

  private triggerBotTurnIfNeeded(): void {
    if (this.isDisposed || !this.engine || this.isDealing || this.engine.isGameOver) {
      return;
    }

    const currentPlayer = this.engine.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isBot || currentPlayer.hand.length === 0) {
      this.botThinkingThought = null;
      this.emitSnapshot();
      return;
    }

    const isLead = this.engine.isRoundLeadMove();
    const leading = this.engine.getLeadingMove();
    const isFacingHeoOrChop = leading ? (
      leading.combination.type === 'FOUR_OF_A_KIND' ||
      leading.combination.type === 'THREE_PAIRS_SEQUENTIAL' ||
      leading.combination.type === 'FOUR_PAIRS_SEQUENTIAL' ||
      (leading.combination.type === 'SINGLE' && isTwo(leading.combination.highestCard)) ||
      (leading.combination.type === 'PAIR' && isTwo(leading.combination.highestCard))
    ) : false;

    const nextPlayerId = this.engine.getNextActivePlayerId(currentPlayer.id);
    const nextPlayer = this.engine.getPlayer(nextPlayerId);
    const isNextOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;

    const { delayMs, thoughtText } = calculateDynamicBotDelay(
      {
        isLead,
        leadingMove: leading,
        botHandLength: currentPlayer.hand.length,
        isNextOneCard,
        hasValidMoves: true,
        isFacingHeoOrChop
      },
      this.gameSpeed
    );

    this.botThinkingThought = { botId: currentPlayer.id, text: thoughtText };
    this.emitSnapshot();

    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = setTimeout(() => {
      if (this.isDisposed || !this.engine || this.engine.isGameOver) return;
      this.botThinkingThought = null;

      const botConfig = getBotConfig(currentPlayer.botPersonaId || 'BOT_ELO_1150');
      const tracker = this.trackers[currentPlayer.id] || new CardTracker(currentPlayer.hand, botConfig.memoryDepth);

      const result = this.engine.executeBotTurn(botConfig, tracker);

      if (result.action === 'PLAY') {
        if (result.playedMove) {
          GameEventBus.getInstance().emit({
            type: 'CARD_PLAYED',
            playerId: currentPlayer.id,
            cards: [...result.playedMove.combination.cards],
            combination: result.playedMove.combination,
            remainingCardsCount: currentPlayer.hand.length
          });
          for (const t of Object.values(this.trackers)) {
            t.recordMove(result.playedMove);
          }
        }

        if (result.isChop && result.choppedPlayerId) {
          const chopped = this.engine.getPlayer(result.choppedPlayerId);
          const penalty = result.penaltyAmount || 0;
          this.triggerChopAlert(
            currentPlayer.name,
            chopped?.name || 'Đối thủ',
            penalty,
            result.isCascadeChop || false,
            result.chopChainCount || 1,
            currentPlayer.id,
            result.choppedPlayerId,
            result.playedMove ? [...result.playedMove.combination.cards] : null
          );
        }
      } else {
        GameEventBus.getInstance().emit({
          type: 'TURN_PASSED',
          playerId: currentPlayer.id
        });
        const leadingMove = this.engine.getLeadingMove();
        if (leadingMove) {
          for (const t of Object.values(this.trackers)) {
            t.recordPassWithDetails(currentPlayer.id, leadingMove.combination);
          }
        }
      }

      this.emitSnapshot();

      if (this.engine.isGameOver) {
        this.handleGameOver();
      } else {
        this.triggerBotTurnIfNeeded();
      }
    }, delayMs);
  }

  private triggerChopAlert(
    chopperName: string,
    targetName: string,
    amount: number,
    isCascade: boolean,
    chainCount: number,
    chopperPlayerId: string | null = null,
    victimPlayerId: string | null = null,
    choppingCards: Card[] | null = null
  ): void {
    if (chopperPlayerId && victimPlayerId) {
      GameEventBus.getInstance().emit({
        type: 'CHOP_EXECUTED',
        chopperPlayerId,
        victimPlayerId,
        penaltyAmount: amount,
        choppingCards: choppingCards || [],
        isCascadeChop: isCascade,
        chopChainCount: chainCount
      });
    }
    this.chopNotification = {
      visible: true,
      chopperName,
      targetName,
      amount,
      isCascade,
      chainCount
    };
    this.emitSnapshot();

    if (this.chopTimer) clearTimeout(this.chopTimer);
    this.chopTimer = setTimeout(() => {
      if (!this.isDisposed) {
        this.chopNotification = null;
        this.emitSnapshot();
      }
    }, UI_TIMINGS.CHOP_ALERT_DURATION_MS);
  }

  private handleGameOver(): void {
    if (!this.engine) return;
    this.botThinkingThought = null;
    this.lastWinnerId = this.engine.winners[0]?.id || null;
    this.emitSnapshot();

    for (const listener of this.completionListeners) {
      listener({
        engine: this.engine,
        instantWin: false
      });
    }
  }

  private cleanupTimers(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    if (this.chopTimer) {
      clearTimeout(this.chopTimer);
      this.chopTimer = null;
    }
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
  }

  public getTracker(playerId: string): CardTracker | null {
    return this.trackers[playerId] || null;
  }

  public getAiHint(playerId: string = 'p0'): MoveHint | null {
    if (!this.engine) return null;
    const player = this.engine.getPlayer(playerId);
    if (!player || player.hand.length === 0) return null;
    const tracker = this.getTracker(playerId) || new CardTracker(player.hand, 1.0);
    const remainingCounts = this.engine.players.reduce((acc, p) => ({ ...acc, [p.id]: p.hand.length }), {});
    const nextPlayerId = this.engine.getNextActivePlayerId(playerId);
    const nextPlayer = nextPlayerId ? this.engine.getPlayer(nextPlayerId) : null;
    const isNextPlayerOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;

    return getOptimalMoveHint(
      player.hand,
      this.engine.getLeadingMove(),
      this.engine.isFirstMoveOfGame,
      this.engine.isRoundLeadMove(),
      tracker,
      remainingCounts,
      nextPlayerId,
      isNextPlayerOneCard,
      this.engine.rules.gameFlow.prohibitEndingWithTwo
    );
  }

  public getValidMoves(playerId: string = 'p0'): Card[][] {
    if (!this.engine) return [];
    const player = this.engine.getPlayer(playerId);
    if (!player || player.hand.length === 0) return [];
    return getSortedQuickSelectCandidates({
      hand: player.hand,
      leadingMove: this.engine.getLeadingMove(),
      isLeadMove: this.engine.isRoundLeadMove(),
      isFirstMoveOfGame: this.engine.isFirstMoveOfGame,
      allowFourPairsCutAnytime: this.engine.rules.chopping.allowFourPairsCutAnytime,
      prohibitEndingWithTwo: this.engine.rules.gameFlow.prohibitEndingWithTwo
    }).map(c => c.cards);
  }

  public reorderPlayerHand(playerId: string, newHand: Card[]): boolean {
    if (!this.engine) return false;
    const player = this.engine.getPlayer(playerId);
    if (!player) return false;
    player.hand = [...newHand];
    return true;
  }

  public cleanup(): void {
    this.isDisposed = true;
    this.cleanupTimers();
    this.botThinkingThought = null;
    this.chopNotification = null;
    this.dealBanner = null;
    this.isDealing = false;
    this.snapshotListeners.clear();
    this.completionListeners.clear();
    this.engine = null;
    this.trackers = {};
    this.tableConfig = null;
    this.rules = null;
    this.settings = null;
    this.instantWinType = null;
    this.instantWinner = null;
  }
}
