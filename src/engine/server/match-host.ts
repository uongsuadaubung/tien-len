import { GameEngine } from '../game';
import type { MatchPlayer, Card, GameRules, InstantWinType, PlayedMove } from '../types';
import type { 
  IHostPeerTransport, 
  HostToClientPacket, 
  ClientToHostPacket 
} from '../transport/transport.interface';
import type { 
  TableStateSyncPacket, 
  GameEndPacket, 
  NetworkChopNotification,
  PlayerActionPacket
} from '../network/network.schema';
import { settleCompletedMatch, type MatchSettlementExecutionResult } from '../../services/match-settlement-service';
import { GameEventBus } from '../events/game-event-bus';
import { UI_TIMINGS } from '../../ui/constants/ui-timings';
import { formatCardVietnamese, sortCards } from '../card';
import { CardTracker } from '../../ai/card-tracker';
import { getOptimalMoveHint, type MoveHint } from '../../ai/hint-engine';
import { getSortedQuickSelectCandidates } from '../quick-response-finder';
import { cloneMatchPlayers } from '../player-factory';

export interface MatchHostOptions {
  rules: GameRules;
  players: MatchPlayer[];
  hostPlayerId: string;
  instantDelay?: boolean;
  enableDealingAnimation?: boolean;
  onGameOver?: (settlementResult: MatchSettlementExecutionResult) => void;
  onRematchVote?: (playerId: string, isReady: boolean) => void;
  onPeerLeave?: (peerId: string) => void;
}

/**
 * AuthoritativeMatchHost
 * Máy chủ luật duy nhất (Single Source of Truth) cho bàn đấu Tiến Lên.
 * Quản lý ván bài, chia bài ngẫu nhiên, xác thực nước đi, đếm ngược và kết toán.
 * Hoạt động thống nhất 100% cho cả Offline (kết nối qua RAM) lẫn Online (kết nối qua Supabase Realtime).
 */
export class AuthoritativeMatchHost {
  public readonly engine: GameEngine;
  public readonly hostPlayerId: string;
  public readonly options: MatchHostOptions;
  public gameNumber: number = 0;
  public instantWinType: InstantWinType | null = null;
  public stateSyncSeq: number = 0;
  public isDealing: boolean = false;
  public dealBanner: string | null = null;
  public dealtCounts: Record<string, number> = {};
  public trackers: Record<string, CardTracker> = {};

  private readonly transports: Map<string, IHostPeerTransport> = new Map();
  private readonly unregisterCallbacks: Map<string, () => void> = new Map();
  private chopNotification: NetworkChopNotification | null = null;
  private chopTimer: ReturnType<typeof setTimeout> | null = null;
  private gameOverTimer: ReturnType<typeof setTimeout> | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private dealingSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private disconnectedPlayers: Map<string, { peerId: string; deadline: number; name: string }> = new Map();
  private lastPlayedMove: PlayedMove | null = null;
  private isDisposed: boolean = false;
  private readonly instantDelay: boolean;
  private readonly enableDealingAnimation: boolean;

  constructor(options: MatchHostOptions) {
    this.options = options;
    this.hostPlayerId = options.hostPlayerId;
    this.instantDelay = options.instantDelay ?? false;
    this.enableDealingAnimation = options.enableDealingAnimation ?? false;
    this.engine = new GameEngine(cloneMatchPlayers(options.players), options.rules);
  }

  /**
   * Đăng ký một Client kết nối vào Host (Local Human, Remote Human, hoặc Bot)
   */
  public registerClient(playerId: string, transport: IHostPeerTransport): () => void {
    this.transports.set(playerId, transport);

    const unMessage = transport.onMessage((msg: ClientToHostPacket) => {
      if (this.isDisposed) return;
      this.handleClientPacket(playerId, msg);
    });

    const cleanup = () => {
      unMessage();
      this.transports.delete(playerId);
      this.unregisterCallbacks.delete(playerId);
    };

    this.unregisterCallbacks.set(playerId, cleanup);
    return cleanup;
  }

  /**
   * Khởi động một ván đấu mới
   */
  public startMatch(roundNumber: number = 1, preserveWinnerId: string | null = null): void {
    this.gameNumber = roundNumber;
    this.instantWinType = null;
    this.stateSyncSeq = 0;
    this.chopNotification = null;
    this.lastPlayedMove = null;
    this.clearAllTimers();
    this.dealBanner = null;

    const startResult = this.engine.startNewGame(roundNumber, preserveWinnerId);
    this.trackers = {};
    for (const p of this.engine.players) {
      this.trackers[p.id] = new CardTracker([...p.hand], 1.0, this.engine.players.length);
    }

    // 1. Gửi bài riêng tư cho từng Client (Fog of War: Mỗi client CHỈ nhận được bài của chính mình)
    for (const player of this.engine.players) {
      const clientTransport = this.transports.get(player.id);
      if (clientTransport && clientTransport.isConnected) {
        clientTransport.send({
          type: 'DEAL_HAND',
          packet: {
            playerId: player.id,
            cards: [...player.hand],
            leadPlayerId: this.engine.currentRound?.leadPlayerId ?? player.id,
            firstTurnPlayerId: this.engine.currentRound?.currentTurnPlayerId ?? player.id,
            gameNumber: this.gameNumber,
            isFirstMoveOfGame: this.engine.isFirstMoveOfGame,
            firstMoveRequiredCard: this.engine.firstMoveRequiredCard
          }
        });
      }
    }

    // 2. Xử lý Tới Trắng (Instant Win) nếu có
    if (startResult.instantWin) {
      this.instantWinType = startResult.instantWinType;
      this.isDealing = false;
      this.broadcastTableSync();
      this.handleGameOver({ skipDelay: this.instantDelay });
      return;
    }

    // 3. Nếu kích hoạt hoạt ảnh chia bài
    if (this.enableDealingAnimation) {
      this.isDealing = true;
      const initialCounts: Record<string, number> = {};
      for (const p of this.engine.players) {
        initialCounts[p.id] = 0;
      }
      this.dealtCounts = initialCounts;
      this.broadcastTableSync();

      // Timer an toàn kết thúc chia bài sau 6s nếu client không phản hồi
      this.dealingSafetyTimer = setTimeout(() => {
        if (this.isDealing) {
          this.finishDealing();
        }
      }, 6000);
      return;
    }

    // 4. Phát sóng trạng thái bàn đấu ban đầu cho tất cả mọi người
    this.isDealing = false;
    this.broadcastTableSync();
  }

  /**
   * Cập nhật số bài đã chia tới ghế của từng người chơi theo hoạt ảnh
   */
  public dealCardStep(playerIndex: number, currentCardCount: number): void {
    const player = this.engine.players[playerIndex];
    if (player) {
      this.dealtCounts[player.id] = currentCardCount;
    }
  }

  /**
   * Kết thúc chia bài: Chuyển sang trạng thái chơi, phát sinh Banner mở màn và mở khóa cho Bot
   */
  public finishDealing(): void {
    if (!this.isDealing) return;
    if (this.dealingSafetyTimer) {
      clearTimeout(this.dealingSafetyTimer);
      this.dealingSafetyTimer = null;
    }
    this.isDealing = false;
    for (const p of this.engine.players) {
      this.dealtCounts[p.id] = p.hand.length;
    }

    const leadPlayer = this.engine.getCurrentPlayer();
    let leadText = '';
    if (this.gameNumber > 1) {
      leadText = leadPlayer?.isBot
        ? `${leadPlayer.name} (${leadPlayer.avatar}) giành quyền mở màn (Thắng ván trước)!`
        : 'Bạn (Người Chơi) giành quyền mở màn (Thắng ván trước)!';
    } else {
      const requiredCard = this.engine.firstMoveRequiredCard;
      const reason = requiredCard ? formatCardVietnamese(requiredCard) : (this.engine.isFirstMoveOfGame ? '3 Bích' : 'Bài nhỏ nhất');
      leadText = leadPlayer?.isBot
        ? `${leadPlayer.name} (${leadPlayer.avatar}) giành quyền mở màn (${reason})!`
        : `Bạn (Người Chơi) giành quyền mở màn (${reason})!`;
    }

    this.dealBanner = leadText;
    this.broadcastTableSync();

    const bannerDuration = this.instantDelay ? 0 : UI_TIMINGS.BANNER_DISPLAY_DURATION_MS;
    this.bannerTimer = setTimeout(() => {
      if (this.isDisposed) return;
      this.dealBanner = null;
      this.broadcastTableSync();
    }, bannerDuration);
  }

  /**
   * Tiếp nhận và xử lý hành động từ Client (Đánh bài hoặc Bỏ lượt)
   */
  public handleClientPacket(playerId: string, msg: ClientToHostPacket): void {
    if (msg.type === 'REMATCH_VOTE') {
      this.handleRematchVote(msg.packet.playerId, msg.packet.isReady);
      return;
    }
    if (msg.type !== 'PLAYER_ACTION') return;
    const packet = msg.packet;
    if (packet.playerId !== playerId) {
      return;
    }
    if (this.engine.isGameOver) {
      return;
    }
    if (this.isDealing) {
      return;
    }

    const currentPlayer = this.engine.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return;
    }

    if (packet.type === 'PASS') {
      const leadingMove = this.engine.getLeadingMove();
      const passResult = this.engine.passTurn(playerId);
      if (passResult.success) {
        if (leadingMove) {
          for (const t of Object.values(this.trackers)) {
            t.recordPassWithDetails(playerId, leadingMove.combination);
          }
        }
        GameEventBus.getInstance().emit({
          type: 'TURN_PASSED',
          playerId
        });
        this.broadcastTableSync();
      }
    } else if (packet.type === 'PLAY' && packet.cardIds) {
      const selectedCards = currentPlayer.hand.filter(c => packet.cardIds!.includes(c.id));
      const moveRes = this.engine.playMove(playerId, selectedCards);

      if (moveRes.success) {
        this.lastPlayedMove = moveRes.playedMove;
        this.dealtCounts[playerId] = currentPlayer.hand.length;
        for (const t of Object.values(this.trackers)) {
          t.recordMove(moveRes.playedMove);
        }
        GameEventBus.getInstance().emit({
          type: 'CARD_PLAYED',
          playerId,
          cards: [...moveRes.playedMove.combination.cards],
          combination: moveRes.playedMove.combination,
          remainingCardsCount: currentPlayer.hand.length
        });

        if (moveRes.isChop && moveRes.choppedPlayerId) {
          const victim = this.engine.getPlayer(moveRes.choppedPlayerId);
          this.chopNotification = {
            visible: true,
            chopperName: currentPlayer.name,
            targetName: victim ? victim.name : 'Đối thủ',
            amount: moveRes.penaltyAmount,
            isCascade: moveRes.isCascadeChop,
            chainCount: moveRes.chopChainCount
          };

          if (this.chopTimer) clearTimeout(this.chopTimer);
          const duration = this.instantDelay ? 0 : UI_TIMINGS.CHOP_ALERT_DURATION_MS;
          this.chopTimer = setTimeout(() => {
            this.chopNotification = null;
            this.broadcastTableSync();
          }, duration);

          GameEventBus.getInstance().emit({
            type: 'CHOP_EXECUTED',
            chopperPlayerId: playerId,
            victimPlayerId: moveRes.choppedPlayerId,
            penaltyAmount: moveRes.penaltyAmount,
            choppingCards: [...selectedCards],
            isCascadeChop: moveRes.isCascadeChop,
            chopChainCount: moveRes.chopChainCount
          });
        }

        this.broadcastTableSync();

        if (this.engine.isGameOver) {
          this.handleGameOver({ skipDelay: this.instantDelay });
        }
      } else {
        console.warn(`[Host:PLAY_REJECTED] playMove failed for player "${playerId}":`, moveRes.error, 'Selected cards:', selectedCards);
      }
    }
  }

  /**
   * Phát sóng TableStateSyncPacket cho toàn bộ các Client
   */
  public broadcastTableSync(): void {
    this.stateSyncSeq += 1;

    const remainingCardCounts: Record<string, number> = {};
    for (const p of this.engine.players) {
      remainingCardCounts[p.id] = p.hand.length;
    }

    const currentTurnId = this.engine.getCurrentPlayer()?.id || null;
    const leadId = this.engine.currentRound?.leadPlayerId || null;
    const leadingMove = this.engine.getLeadingMove();
    const effectiveMove = leadingMove || (this.engine.isGameOver
      ? (this.lastPlayedMove || (this.engine.currentRound.moves.length > 0
          ? this.engine.currentRound.moves[this.engine.currentRound.moves.length - 1]
          : null))
      : null);

    const isFirstMoveOfGame = this.engine.isFirstMoveOfGame;
    const isLeadMove = this.engine.isRoundLeadMove();

    const activeNoticeEntry = Array.from(this.disconnectedPlayers.entries())[0];
    const reconnectNotice = activeNoticeEntry
      ? {
          playerId: activeNoticeEntry[0],
          playerName: activeNoticeEntry[1].name,
          deadline: activeNoticeEntry[1].deadline
        }
      : null;

    const packet: TableStateSyncPacket = {
      gameNumber: this.gameNumber,
      seq: this.stateSyncSeq,
      timestamp: Date.now(),
      roundNumber: this.engine.roundNumber,
      isGameOver: this.engine.isGameOver,
      currentTurnPlayerId: this.isDealing ? null : currentTurnId,
      leadPlayerId: this.isDealing ? null : leadId,
      remainingCardCounts: this.isDealing ? { ...this.dealtCounts } : remainingCardCounts,
      passedPlayerIds: this.engine.currentRound ? [...this.engine.currentRound.passedPlayerIds] : [],
      currentMoveCards: effectiveMove ? effectiveMove.combination.cards : undefined,
      currentMovePlayerId: effectiveMove ? effectiveMove.playerId : undefined,
      isChop: effectiveMove ? !!effectiveMove.isChop : false,
      isCascadeChop: !!this.chopNotification?.isCascade,
      chopNotification: this.chopNotification,
      winners: this.engine.winners.map(w => w.id),
      isFirstMoveOfGame,
      firstMoveRequiredCard: this.engine.firstMoveRequiredCard,
      isLeadMove,
      isDealing: this.isDealing,
      dealBanner: this.dealBanner,
      dealtCounts: { ...this.dealtCounts },
      reconnectNotice
    };

    const hostToClientPacket: HostToClientPacket = {
      type: 'TABLE_SYNC',
      packet
    };

    for (const transport of this.transports.values()) {
      if (transport.isConnected) {
        transport.send(hostToClientPacket);
      }
    }
  }

  /**
   * Kết thúc ván đấu và kết toán điểm
   */
  public handleGameOver(options?: { skipDelay?: boolean }): void {
    const doSettle = () => {
      if (this.isDisposed) return;
      const settlementResult = settleCompletedMatch(this.engine, this.hostPlayerId);

      const allPlayerHands: Record<string, Card[]> = {};
      for (const p of this.engine.players) {
        allPlayerHands[p.id] = [...p.hand];
      }

      const endPacket: GameEndPacket = {
        winners: this.engine.winners.map(w => w.id),
        payouts: settlementResult?.payouts ?? {},
        eloDeltas: settlementResult?.eloDeltas ?? {},
        allPlayerHands,
        isThreeSpadesWin: this.engine.isThreeSpadesWin ?? false,
        instantWinType: this.instantWinType ?? null,
        loanDeduction: settlementResult?.loanDeduction ?? 0
      };

      const hostEndMsg: HostToClientPacket = {
        type: 'GAME_END',
        packet: endPacket
      };

      for (const transport of this.transports.values()) {
        if (transport.isConnected) {
          transport.send(hostEndMsg);
        }
      }

      if (this.options.onGameOver) {
        this.options.onGameOver(settlementResult);
      }
    };

    if (this.gameOverTimer) {
      clearTimeout(this.gameOverTimer);
      this.gameOverTimer = null;
    }

    if (options?.skipDelay || this.instantDelay) {
      doSettle();
    } else {
      this.gameOverTimer = setTimeout(() => {
        this.gameOverTimer = null;
        doSettle();
      }, UI_TIMINGS.MATCH_END_REVEAL_DELAY_MS);
    }
  }

  private clearAllTimers(): void {
    if (this.chopTimer) {
      clearTimeout(this.chopTimer);
      this.chopTimer = null;
    }
    if (this.gameOverTimer) {
      clearTimeout(this.gameOverTimer);
      this.gameOverTimer = null;
    }
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
    if (this.dealingSafetyTimer) {
      clearTimeout(this.dealingSafetyTimer);
      this.dealingSafetyTimer = null;
    }
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();
    this.disconnectedPlayers.clear();
  }

  public dispose(): void {
    this.isDisposed = true;
    this.clearAllTimers();
    for (const cleanup of this.unregisterCallbacks.values()) {
      cleanup();
    }
    this.unregisterCallbacks.clear();
    this.transports.clear();
  }

  public cleanup(): void {
    this.dispose();
  }

  public get lastWinnerId(): string | null {
    return this.engine?.winners[0]?.id ?? null;
  }

  public set lastWinnerId(id: string | null) {
    void id;
  }

  public playCards(playerId: string, cards: Card[]): { success: boolean; error?: string } {
    if (this.isDealing) {
      this.finishDealing();
    }
    const res = this.engine.playMove(playerId, cards);
    if (res.success) {
      this.lastPlayedMove = res.playedMove;
      const player = this.engine.getPlayer(playerId);
      if (player) {
        this.dealtCounts[playerId] = player.hand.length;
      }
      for (const t of Object.values(this.trackers)) {
        t.recordMove(res.playedMove);
      }
      this.broadcastTableSync();
      if (this.engine.isGameOver) {
        this.handleGameOver({ skipDelay: this.instantDelay });
      }
    }
    return res;
  }

  public playCardIds(playerId: string, cardIds: string[]): boolean {
    const player = this.engine.getPlayer(playerId);
    if (!player) return false;
    const cards = player.hand.filter(c => cardIds.includes(c.id));
    this.handleClientPacket(playerId, {
      type: 'PLAYER_ACTION',
      packet: {
        type: 'PLAY',
        playerId,
        cardIds: cards.map(c => c.id),
        timestamp: Date.now()
      }
    });
    return true;
  }

  public handlePlayerAction(packet: PlayerActionPacket): void {
    const pId = packet.playerId;
    this.handleClientPacket(pId, {
      type: 'PLAYER_ACTION',
      packet
    });
  }

  public handleRematchVote(playerId: string, isReady: boolean): void {
    if (this.options.onRematchVote) {
      this.options.onRematchVote(playerId, isReady);
    }
  }

  public handlePeerLeave(peerId: string): void {
    for (const [pId, transport] of this.transports.entries()) {
      if (transport.peerId === peerId) {
        transport.disconnect();
        this.transports.delete(pId);
      }
    }
    if (this.options.onPeerLeave) {
      this.options.onPeerLeave(peerId);
    }
  }

  /**
   * Xử lý một Client bị ngắt kết nối (F5 / rớt mạng) với thời gian ân hạn Grace Period (mặc định 25s)
   */
  public handlePeerDisconnect(playerId: string, peerId: string, gracePeriodMs: number = 25000, onExpired?: () => void): void {
    if (this.isDisposed || this.engine.isGameOver) return;
    const player = this.engine.getPlayer(playerId);
    if (!player) return;

    // Ngắt transport cũ nếu còn
    const oldTransport = this.transports.get(playerId);
    if (oldTransport) {
      oldTransport.disconnect();
      this.transports.delete(playerId);
    }

    const existingTimer = this.reconnectTimers.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const deadline = Date.now() + gracePeriodMs;
    this.disconnectedPlayers.set(playerId, {
      peerId,
      deadline,
      name: player.name
    });

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(playerId);
      this.disconnectedPlayers.delete(playerId);
      this.broadcastTableSync();
      if (onExpired) {
        onExpired();
      }
    }, gracePeriodMs);

    this.reconnectTimers.set(playerId, timer);
    this.broadcastTableSync();
  }

  /**
   * Xử lý một Client kết nối lại (Reconnect) trong thời gian ân hạn
   */
  public handlePlayerReconnect(playerId: string, newTransport: IHostPeerTransport): boolean {
    if (this.isDisposed) return false;
    const player = this.engine.getPlayer(playerId);
    if (!player) return false;

    // Hủy timer grace period nếu đang chạy
    const timer = this.reconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(playerId);
    }
    this.disconnectedPlayers.delete(playerId);

    // Đăng ký lại transport mới
    this.registerClient(playerId, newTransport);

    // Gửi lại gói tin bài riêng tư (Fog-of-War Hand Restoration)
    if (newTransport.isConnected) {
      newTransport.send({
        type: 'DEAL_HAND',
        packet: {
          playerId: player.id,
          cards: [...player.hand],
          leadPlayerId: this.engine.currentRound?.leadPlayerId ?? player.id,
          firstTurnPlayerId: this.engine.currentRound?.currentTurnPlayerId ?? player.id,
          gameNumber: this.gameNumber,
          isFirstMoveOfGame: this.engine.isFirstMoveOfGame,
          firstMoveRequiredCard: this.engine.firstMoveRequiredCard,
          isLeadMove: this.engine.isRoundLeadMove()
        }
      });
    }

    // Phát sóng TableSync mới nhất tới tất cả mọi người
    this.broadcastTableSync();
    return true;
  }

  public isPlayerDisconnected(playerId: string): boolean {
    return this.disconnectedPlayers.has(playerId);
  }

  public getDisconnectedPlayerNotice(playerId: string): { peerId: string; deadline: number; name: string } | null {
    return this.disconnectedPlayers.get(playerId) ?? null;
  }

  public disbandRoom(reason?: string): void {
    void reason;
    this.dispose();
  }

  public getTracker(playerId: string): CardTracker | null {
    return this.trackers[playerId] ?? null;
  }

  public getAiHint(playerId: string): MoveHint | null {
    const player = this.engine.getPlayer(playerId);
    if (!player || player.hand.length === 0) return null;
    const tracker = this.getTracker(playerId);
    if (!tracker) return null;
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
      this.engine.rules.gameFlow.prohibitEndingWithTwo,
      undefined,
      undefined,
      player.hasPlayedFirstCard,
      playerId
    );
  }

  public getValidMoves(playerId: string): Card[][] {
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

  public autoSort(playerId: string): Card[] {
    const player = this.engine.getPlayer(playerId);
    if (!player) return [];
    player.hand = sortCards(player.hand);
    this.broadcastTableSync();
    return [...player.hand];
  }

  public reorderPlayerHand(playerId: string, newHand: Card[]): boolean {
    const player = this.engine.getPlayer(playerId);
    if (!player) return false;
    player.hand = [...newHand];
    return true;
  }
}
