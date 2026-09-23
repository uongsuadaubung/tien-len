import type { Card, GameRules } from '../types';
import type { IClientTransport, HostToClientPacket } from '../transport/transport.interface';
import type { TableStateSyncPacket } from '../network/network.schema';
import { CardTracker } from '../../ai/card-tracker';
import { getBotConfig } from '../../ai/bot-factory';
import { type BotConfig, isBotConfig } from '../../ai/types';
import { createCard, isTwo } from '../card';
import { makeBotDecision, createDecisionContext, type BotDecision } from '../../ai/decision-maker';
import { createPlayedMove, createDefaultGameRules } from '../types';
import { identifyCombination } from '../combinations';
import { calculateDynamicBotDelay, type GameSpeedMode } from '../game-speed';
import { useSettingsStore } from '../../stores/useSettingsStore';

export interface BotAgentOptions {
  botId: string;
  personaId: string;
  customConfig?: Partial<BotConfig>;
  transport: IClientTransport;
  instantDelay?: boolean; // Cho unit tests chạy ngay lập tức
  gameSpeed?: GameSpeedMode | (() => GameSpeedMode);
  onThinkingChange?: (botId: string, thought: string | null) => void;
}

/**
 * BotAgent
 * Người chơi máy độc lập, giao tiếp với MatchHost hoàn toàn qua IClientTransport.
 * Hoạt động thống nhất 100% cho cả Offline và Online Host.
 */
export class BotAgent {
  public readonly botId: string;
  public readonly personaId: string;
  public readonly botConfig: BotConfig;
  private readonly transport: IClientTransport;
  private readonly instantDelay: boolean;
  private readonly gameSpeed?: GameSpeedMode | (() => GameSpeedMode);
  private readonly onThinkingChange?: (botId: string, thought: string | null) => void;

  private hand: Card[] = [];
  private tracker: CardTracker | null = null;
  private unsubscribeTransport: (() => void) | null = null;
  private thinkTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMoveSignature: string | null = null;
  private isDisposed: boolean = false;

  constructor(options: BotAgentOptions) {
    this.botId = options.botId;
    this.personaId = options.personaId;
    this.botConfig = isBotConfig(options.customConfig)
      ? options.customConfig
      : getBotConfig(this.personaId, options.customConfig);
    this.transport = options.transport;
    this.instantDelay = options.instantDelay === true;
    this.gameSpeed = options.gameSpeed;
    this.onThinkingChange = options.onThinkingChange;

    this.setupTransportListeners();
  }

  private setupTransportListeners(): void {
    this.unsubscribeTransport = this.transport.onMessage((msg: HostToClientPacket) => {
      if (this.isDisposed) return;
      if (msg.type === 'DEAL_HAND') {
        if (msg.packet.playerId === this.botId) {
          this.hand = msg.packet.cards.map(c => createCard(c.rank, c.suit));
          this.tracker = new CardTracker(this.hand, this.botConfig.memoryDepth);
        }
      } else if (msg.type === 'TABLE_SYNC') {
        this.handleTableSync(msg.packet);
      }
    });
  }

  private handleTableSync(sync: TableStateSyncPacket): void {
    if (this.isDisposed) return;

    // Ghi nhận nước đi mới vào tracker
    if (sync.currentMoveCards && sync.currentMoveCards.length > 0 && sync.currentMovePlayerId) {
      const sig = `${sync.currentMovePlayerId}:${sync.currentMoveCards.map(c => c.id).sort().join(',')}`;
      if (sig !== this.lastMoveSignature) {
        this.lastMoveSignature = sig;
        const cards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
        const combo = identifyCombination(cards);
        if (combo && this.tracker) {
          const playedMove = createPlayedMove(sync.currentMovePlayerId, combo);
          this.tracker.recordMove(playedMove);
        }
      }
    }

    // Nếu đến lượt của Bot và trạng thái đang chơi (không còn trong nhịp chia bài hay hiển thị banner mở màn)
    if (!sync.isGameOver && !sync.isDealing && !sync.dealBanner && sync.currentTurnPlayerId === this.botId && this.hand.length > 0) {
      if (this.thinkTimer) {
        clearTimeout(this.thinkTimer);
        this.thinkTimer = null;
      }

      const currentMove = (sync.currentMoveCards && sync.currentMoveCards.length > 0 && sync.currentMovePlayerId)
        ? (() => {
            const cards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
            const combo = identifyCombination(cards);
            return combo ? createPlayedMove(sync.currentMovePlayerId, combo) : null;
          })()
        : null;

      if (this.instantDelay) {
        this.thinkTimer = setTimeout(() => {
          if (this.isDisposed) return;
          const decision = this.computeBotDecision(sync);
          this.dispatchBotDecision(decision);
        }, 0);
        return;
      }

      const isLeadMove = currentMove === null;
      const isFirstMoveOfGame = sync.isFirstMoveOfGame === true;
      const playerIds = Object.keys(sync.remainingCardCounts);
      const myIdx = playerIds.indexOf(this.botId);
      const nextPlayerId = myIdx !== -1 ? playerIds[(myIdx + 1) % playerIds.length] : '';
      const nextPlayerCardCount = sync.remainingCardCounts[nextPlayerId] ?? 13;

      const isFacingHeoOrChop = currentMove ? (
        currentMove.combination.type === 'FOUR_OF_A_KIND' ||
        currentMove.combination.type === 'THREE_PAIRS_SEQUENTIAL' ||
        currentMove.combination.type === 'FOUR_PAIRS_SEQUENTIAL' ||
        (currentMove.combination.type === 'SINGLE' && isTwo(currentMove.combination.highestCard)) ||
        (currentMove.combination.type === 'PAIR' && isTwo(currentMove.combination.highestCard))
      ) : false;

      const speedMode: GameSpeedMode = typeof this.gameSpeed === 'function'
        ? this.gameSpeed()
        : (this.gameSpeed || (typeof useSettingsStore !== 'undefined' ? useSettingsStore.getState().gameSpeed : 'REALISTIC'));

      const hasLikelyValidMoves = isLeadMove || (currentMove ? this.hand.some(c => c.weight > currentMove.combination.highestCard.weight) : true);

      const { delayMs, thoughtText } = calculateDynamicBotDelay(
        {
          isLead: isLeadMove,
          leadingMove: currentMove,
          botHandLength: this.hand.length,
          isNextOneCard: nextPlayerCardCount === 1,
          hasValidMoves: hasLikelyValidMoves,
          isFacingHeoOrChop,
          isFirstMoveOfGame
        },
        speedMode
      );

      if (this.onThinkingChange) {
        this.onThinkingChange(this.botId, thoughtText);
      }

      this.thinkTimer = setTimeout(() => {
        if (this.isDisposed) return;
        this.clearThinkingState();
        const decision = this.computeBotDecision(sync);
        this.dispatchBotDecision(decision);
      }, delayMs);
    } else {
      if (this.thinkTimer) {
        clearTimeout(this.thinkTimer);
        this.thinkTimer = null;
        this.clearThinkingState();
      }
    }
  }

  private computeBotDecision(sync: TableStateSyncPacket): BotDecision {
    if (!this.tracker) {
      this.tracker = new CardTracker(this.hand, this.botConfig.memoryDepth);
    }

    const currentMove = (sync.currentMoveCards && sync.currentMoveCards.length > 0 && sync.currentMovePlayerId)
      ? (() => {
          const cards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
          const combo = identifyCombination(cards);
          return combo ? createPlayedMove(sync.currentMovePlayerId, combo) : null;
        })()
      : null;

    const isLeadMove = currentMove === null;
    const isFirstMoveOfGame = sync.isFirstMoveOfGame === true;
    const firstMoveRequiredCard = sync.firstMoveRequiredCard 
      ? createCard(sync.firstMoveRequiredCard.rank, sync.firstMoveRequiredCard.suit)
      : null;

    const playerIds = Object.keys(sync.remainingCardCounts);
    const myIdx = playerIds.indexOf(this.botId);
    const nextPlayerId = myIdx !== -1 ? playerIds[(myIdx + 1) % playerIds.length] : '';
    const nextPlayerCardCount = sync.remainingCardCounts[nextPlayerId] ?? 13;

    const validPlayerCount: 2 | 3 | 4 = playerIds.length === 2 || playerIds.length === 3 || playerIds.length === 4 ? playerIds.length : 4;
    const rules: GameRules = createDefaultGameRules({
      table: {
        playerCount: validPlayerCount,
        betAmount: 1000,
        soundEnabled: true
      }
    });

    const decisionContext = createDecisionContext({
      hand: [...this.hand],
      isFirstMoveOfGame,
      firstMoveRequiredCard,
      tracker: this.tracker,
      config: this.botConfig,
      remainingPlayerCards: sync.remainingCardCounts,
      nextPlayerId,
      rules,
      hasPlayedFirstCard: true,
      isNextPlayerOneCard: nextPlayerCardCount === 1,
      prohibitEndingWithTwo: rules.gameFlow.prohibitEndingWithTwo,
      gameMode: 'COUNT_CARDS',
      isLeadMove,
      currentRoundLeadingMove: currentMove
    });

    return makeBotDecision(decisionContext);
  }

  private dispatchBotDecision(decision: BotDecision): void {
    if (decision.type === 'PLAY' && decision.cards && decision.cards.length > 0) {
      const playedIds = new Set(decision.cards.map((c: Card) => c.id));
      this.hand = this.hand.filter((c: Card) => !playedIds.has(c.id));

      this.transport.send({
        type: 'PLAYER_ACTION',
        packet: {
          playerId: this.botId,
          type: 'PLAY',
          cardIds: decision.cards.map((c: Card) => c.id),
          timestamp: Date.now()
        }
      });
    } else {
      this.transport.send({
        type: 'PLAYER_ACTION',
        packet: {
          playerId: this.botId,
          type: 'PASS',
          timestamp: Date.now()
        }
      });
    }
  }

  private clearThinkingState(): void {
    if (this.onThinkingChange) {
      this.onThinkingChange(this.botId, null);
    }
  }

  public getHand(): readonly Card[] {
    return this.hand;
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.thinkTimer) {
      clearTimeout(this.thinkTimer);
      this.thinkTimer = null;
    }
    this.clearThinkingState();
    if (this.unsubscribeTransport) {
      this.unsubscribeTransport();
      this.unsubscribeTransport = null;
    }
  }
}
