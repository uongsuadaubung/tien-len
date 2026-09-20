import { GameEngine } from '../game';
import { 
  type Card, 
  type Player, 
  type GameRules, 
  type InstantWinType,
  GameRulesBuilder 
} from '../types';
import { createPlayer } from '../player-factory';
import { 
  type OnlineRoomState, 
  type PlayerActionPacket, 
  type DealHandPacket, 
  type TableStateSyncPacket, 
  type GameEndPacket,
  type OnlinePlayer,
  type NetworkCard,
  type RematchVotePacket,
  type NetworkChopNotification
} from './network.schema';
import { P2PClient } from './p2p-client';
import { useGameStore } from '../../stores/useGameStore';
import { GameEventBus } from '../events/game-event-bus';
import { type PlayingTurnMatchState, createPlayingTurnMatchState } from '../state-machine/types';
import type { DriverActionResult } from '../match-driver.interface';
import { BaseMatchDriver } from '../base-match-driver';
import { settleCompletedMatch } from '../../services/match-settlement-service';
import { createProvisionalOnlineGameOverState } from '../settlement/perspective-settlement';
import { useUserStore } from '../../stores/useUserStore';
import { CardTracker } from '../../ai/card-tracker';
import { getOptimalMoveHint, type MoveHint } from '../../ai/hint-engine';
import { UI_TIMINGS } from '../../ui/constants/ui-timings';

export interface HostEngineDriverCallbacks {
  onRoomStateChange: ((updatedRoomState: OnlineRoomState) => void) | null;
  onAutoStartMatch: (() => void) | null;
}

export class HostEngineDriver extends BaseMatchDriver {
  public engine: GameEngine | null = null;
  public chopsByPlayer: Record<string, number> = {};
  public gotChoppedByPlayer: Record<string, number> = {};
  public chopNotification: NetworkChopNotification | null = null;
  private chopTimer: ReturnType<typeof setTimeout> | null = null;
  public trackers: Record<string, CardTracker> = {};
  private p2pClient: P2PClient;
  public roomState: OnlineRoomState;
  private unsubscribeActions: Array<() => void> = [];
  private onRoomStateChange: ((updatedRoomState: OnlineRoomState) => void) | null = null;
  private onAutoStartMatch: (() => void) | null = null;
  public gameNumber: number = 0;
  public lastWinnerId: string | null = null;
  public instantWinType: InstantWinType | null = null;
  public stateSyncSeq: number = 0;

  constructor(
    p2pClient: P2PClient, 
    roomState: OnlineRoomState,
    callbacks: HostEngineDriverCallbacks | null = null
  ) {
    super();
    this.p2pClient = p2pClient;
    this.roomState = roomState;
    this.onRoomStateChange = callbacks !== null ? callbacks.onRoomStateChange : null;
    this.onAutoStartMatch = callbacks !== null ? callbacks.onAutoStartMatch : null;
  }


  public startMatch(onLocalHandDealt: (cards: Card[]) => void): void {
    this.cleanup();
    this.isDisposed = false;
    this.chopsByPlayer = {};
    this.gotChoppedByPlayer = {};
    this.gameNumber += 1;
    this.instantWinType = null;
    this.stateSyncSeq = 0;
    useGameStore.getState().setInstantWinType(undefined);

    // 1. Build GameRules
    const rules: GameRules = new GameRulesBuilder()
      .withSettlement(this.roomState.settlementRule)
      .withTable(t => t
        .playerCount(this.roomState.playerCount)
        .betAmount(this.roomState.betAmount)
        .soundEnabled(true)
      )
      .withChopping(c => c
        .multiplier(this.roomState.choppingMultiplier)
        .allowFourPairsCutAnytime(this.roomState.allowFourPairsCutAnytime)
        .cascadeMultiplier(this.roomState.cascadeChopEnabled)
      )
      .withCong(cg => cg
        .enabled(this.roomState.congEnabled)
        .multiplier(this.roomState.congMultiplier ?? 1)
      )
      .withGameFlow(gf => gf
        .prohibitEndingWithTwo(this.roomState.prohibitEndingWithTwo)
        .threeSpadesEndingBonus(this.roomState.threeSpadesEndingBonus)
      )
      .build();

    // 2. Build Players Array
    const players: Player[] = this.roomState.players.map((op: OnlinePlayer) => {
      return createPlayer({
        id: op.playerId,
        name: op.name,
        avatar: op.avatar,
        score: op.coins
      });
    });

    // 3. Initialize Engine
    const engine = new GameEngine(players, rules);
    this.engine = engine;
    const startResult = engine.startNewGame(this.gameNumber, this.lastWinnerId || undefined);

    if (startResult.instantWin) {
      this.instantWinType = startResult.instantWinType;
      useGameStore.getState().setInstantWinType(startResult.instantWinType);
      useGameStore.getState().setIsGameOver(true);
      this.broadcastCurrentTableState('Có người chơi tới trắng!');
      this.handleGameOver();
      return;
    }

    // Khởi tạo CardTracker theo góc nhìn hợp lệ cho từng người chơi
    this.trackers = {};
    this.engine.players.forEach(p => {
      this.trackers[p.id] = new CardTracker(p.hand, 1.0);
    });

    // 4. Fog of War: Dispatch private hands (Chỉ gửi khi ván đấu diễn ra bình thường)
    this.roomState.players.forEach((op: OnlinePlayer) => {
      const p = engine.players.find(pl => pl.id === op.playerId);
      if (!p) return;

      if (op.isHost) {
        // Host local player
        onLocalHandDealt(p.hand);
      } else {
        // Remote human peer
        const dealPacket: DealHandPacket = {
          playerId: p.id,
          cards: p.hand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
          leadPlayerId: engine.currentRound.leadPlayerId,
          firstTurnPlayerId: engine.currentRound.currentTurnPlayerId,
          gameNumber: this.gameNumber,
          isFirstMoveOfGame: engine.isFirstMoveOfGame,
          firstMoveRequiredCard: engine.firstMoveRequiredCard ? {
            rank: engine.firstMoveRequiredCard.rank,
            suit: engine.firstMoveRequiredCard.suit,
            id: engine.firstMoveRequiredCard.id
          } : null,
          isLeadMove: engine.isRoundLeadMove()
        };
        void this.p2pClient.sendPrivateDealHand(dealPacket, op.peerId);
      }
    });

    // 5. Broadcast Table Sync
    this.broadcastCurrentTableState('Ván bài đã bắt đầu!');

    // 6. Listen for Remote Player Actions
    const unAct = this.p2pClient.onPlayerAction((packet: PlayerActionPacket) => {
      this.handlePlayerAction(packet);
    });
    this.unsubscribeActions.push(unAct);

    // 7. Listen for Rematch Votes
    const unVote = this.p2pClient.onRematchVote((packet: RematchVotePacket) => {
      this.handleRematchVote(packet.playerId, packet.isReady);
    });
    this.unsubscribeActions.push(unVote);

    // 8. Ván đấu sẵn sàng cho lượt đánh của người chơi đầu tiên
  }

  public handlePlayerAction(packet: PlayerActionPacket): void {
    if (!this.engine || this.engine.isGameOver) return;

    if (this.engine.currentRound.currentTurnPlayerId !== packet.playerId) {
      return; // Không phải lượt người chơi này
    }

    const player = this.engine.players.find(p => p.id === packet.playerId);
    if (!player) return;

    if (packet.type === 'PASS') {
      const res = this.engine.passTurn(packet.playerId);
      if (res.success) {
        GameEventBus.getInstance().emit({
          type: 'TURN_PASSED',
          playerId: packet.playerId
        });
        this.broadcastCurrentTableState(`${player.name} bỏ lượt`);
      }
    } else if (packet.type === 'PLAY' && packet.cardIds) {
      const selectedCards = player.hand.filter(c => packet.cardIds?.includes(c.id));
      const res = this.engine.playMove(packet.playerId, selectedCards);
      if (res.success) {
        // Cập nhật thẻ bài đã đánh vào tất cả trackers
        Object.values(this.trackers).forEach(tracker => {
          tracker.recordMove(res.playedMove);
        });

        GameEventBus.getInstance().emit({
          type: 'CARD_PLAYED',
          playerId: packet.playerId,
          cards: [...res.playedMove.combination.cards],
          combination: res.playedMove.combination,
          remainingCardsCount: player.hand.length
        });

        if (res.isChop && res.choppedPlayerId) {
          this.chopsByPlayer[player.id] = (this.chopsByPlayer[player.id] || 0) + 1;
          this.gotChoppedByPlayer[res.choppedPlayerId] = (this.gotChoppedByPlayer[res.choppedPlayerId] || 0) + 1;
          const victim = this.engine.getPlayer(res.choppedPlayerId);
          const chopperName = player.name;
          const targetName = victim ? victim.name : 'Đối thủ';
          this.chopNotification = {
            visible: true,
            chopperName,
            targetName,
            amount: res.penaltyAmount,
            isCascade: res.isCascadeChop,
            chainCount: res.chopChainCount
          };

          this.clearManagedTimer(this.chopTimer);
          this.chopTimer = this.createManagedTimer(() => {
            this.chopNotification = null;
            this.broadcastCurrentTableState();
          }, UI_TIMINGS.CHOP_ALERT_DURATION_MS);

          GameEventBus.getInstance().emit({
            type: 'CHOP_EXECUTED',
            chopperPlayerId: player.id,
            victimPlayerId: res.choppedPlayerId,
            penaltyAmount: res.penaltyAmount,
            choppingCards: [...selectedCards],
            isCascadeChop: res.isCascadeChop,
            chopChainCount: res.chopChainCount
          });
        }
        this.broadcastCurrentTableState(`${player.name} đã đánh bài`);

        if (this.engine.isGameOver) {
          this.handleGameOver();
        }
      }
    }
  }

  public playCardIds(playerId: string, cardIds: string[]): DriverActionResult {
    this.handlePlayerAction({
      type: 'PLAY',
      playerId,
      cardIds,
      timestamp: Date.now()
    });
    return { success: true };
  }

  public playCards(playerId: string, cards: Card[]): DriverActionResult {
    return this.playCardIds(playerId, cards.map(c => c.id));
  }

  public passTurn(playerId: string): DriverActionResult {
    this.handlePlayerAction({
      type: 'PASS',
      playerId,
      timestamp: Date.now()
    });
    return { success: true };
  }

  public broadcastCurrentTableState(message?: string): void {
    if (!this.engine) return;

    const remainingCardCounts: Record<string, number> = {};
    this.engine.players.forEach(p => {
      remainingCardCounts[p.id] = p.hand.length;
    });

    const lastMove = this.engine.currentRound.moves[this.engine.currentRound.moves.length - 1] || null;
    const leadingMove = this.engine.getLeadingMove();
    const effectiveMove = lastMove ?? leadingMove;
    const currentMoveCards = effectiveMove?.combination.cards.map((c: Card) => ({
      rank: c.rank,
      suit: c.suit,
      id: c.id
    }));

    const currentTurnId = this.engine.currentRound.currentTurnPlayerId;
    const leadId = this.engine.currentRound.leadPlayerId;
    const isFirstMoveOfGame = this.engine.isFirstMoveOfGame;
    const isLeadMove = this.engine.isRoundLeadMove();

    this.stateSyncSeq += 1;
    const packet: TableStateSyncPacket = {
      seq: this.stateSyncSeq,
      timestamp: Date.now(),
      currentTurnPlayerId: currentTurnId,
      leadPlayerId: leadId,
      currentMoveCards,
      currentMovePlayerId: effectiveMove?.playerId,
      currentMoveCombinationType: effectiveMove?.combination.type,
      isChop: effectiveMove?.isChop ?? false,
      isCascadeChop: effectiveMove?.isCascadeChop ?? false,
      remainingCardCounts,
      passedPlayerIds: [...this.engine.currentRound.passedPlayerIds],
      roundNumber: this.engine.roundNumber,
      chopNotification: this.chopNotification ? { ...this.chopNotification } : null,
      winners: this.engine.winners.map(w => w.id),
      isGameOver: this.engine.isGameOver,
      lastActionMessage: message,
      gameNumber: this.gameNumber,
      isFirstMoveOfGame,
      firstMoveRequiredCard: this.engine.firstMoveRequiredCard ? {
        rank: this.engine.firstMoveRequiredCard.rank,
        suit: this.engine.firstMoveRequiredCard.suit,
        id: this.engine.firstMoveRequiredCard.id
      } : null,
      isLeadMove
    };

    // Đồng bộ trực tiếp vào GameStore của Host nguyên tử qua State Pattern
    const gameStore = useGameStore.getState();

    if (!this.engine.isGameOver && currentTurnId && leadId) {
      const playingState: PlayingTurnMatchState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: this.gameNumber,
        roundNumber: this.engine.roundNumber,
        players: this.engine.players.map(p => ({ ...p })),
        currentTurnPlayerId: currentTurnId,
        leadPlayerId: leadId,
        roundMoves: this.engine.currentRound.moves,
        leadingMove,
        isLeadMove,
        isFirstMoveOfGame,
        firstMoveRequiredCard: this.engine.firstMoveRequiredCard,
        passedPlayerIds: this.engine.currentRound.passedPlayerIds,
        chopNotification: this.chopNotification ? { ...this.chopNotification } : null,
        botThinkingThought: null,
        rules: this.engine.rules
      });
      gameStore.applyMatchState(playingState);
      gameStore.setDealtCounts(remainingCardCounts);
    } else if (this.engine.isGameOver) {
      const hostPlayerId = this.roomState.players.find(p => p.isHost)?.playerId || gameStore.myPlayerId;
      const gameOverState = createProvisionalOnlineGameOverState({
        gameNumber: this.gameNumber,
        players: this.engine.players,
        winners: this.engine.winners,
        winningMove: effectiveMove,
        isThreeSpadesWin: this.engine.isThreeSpadesWin,
        instantWinType: this.instantWinType,
        matchPayouts: gameStore.matchPayouts,
        allEloDeltas: gameStore.allEloDeltas,
        subjectPlayerId: hostPlayerId,
        subjectCoins: useUserStore.getState().profile.coins,
        betAmount: this.roomState.betAmount,
        rules: this.engine.rules,
        matchLogReport: null,
        existingSettlement: gameStore.perspectiveSettlement
      });
      gameStore.applyMatchState(gameOverState);
      gameStore.setDealtCounts(remainingCardCounts);
    }


    void this.p2pClient.broadcastTableSync(packet);
  }

  public handleGameOver(options?: { skipDelay?: boolean }): void {
    if (!this.engine) return;

    this.scheduleGameOverReveal(() => {
      if (!this.engine) return;

      // 1. Chạy quy trình kết toán ván đấu chuẩn hóa tập trung (Single Source of Truth)
      settleCompletedMatch(this.engine);

      const gameStore = useGameStore.getState();
      const payouts = gameStore.matchPayouts;
      const eloDeltas = gameStore.allEloDeltas;

      // Đồng bộ bài tàn cuộc (Fog of War reveal) của tất cả người chơi cho máy Host
      gameStore.setPlayers(this.engine.players.map(p => ({ ...p, hand: [...p.hand] })));

      // 2. Cập nhật số dư Xu và Elo mới cho từng người chơi trong phòng (Host và Guest)
      const resetPlayers = this.roomState.players.map(p => {
        if (payouts[p.playerId] === undefined) {
          throw new Error(`[HostEngineDriver] Invariant violated: Missing payout entry for room player "${p.playerId}"`);
        }
        const net = payouts[p.playerId];
        const eloD = eloDeltas[p.playerId] ?? 0;
        return {
          ...p,
          coins: Math.max(0, p.coins + net),
          elo: Math.max(0, p.elo + eloD),
          isReady: false
        };
      });

      const updatedRoom: OnlineRoomState = {
        ...this.roomState,
        players: resetPlayers,
        status: 'ENDED',
        updatedAt: Date.now()
      };
      this.roomState = updatedRoom;

      if (this.onRoomStateChange) {
        this.onRoomStateChange(updatedRoom);
      }
      void this.p2pClient.broadcastRoomState(updatedRoom);

      if (this.engine.winners.length > 0) {
        this.lastWinnerId = this.engine.winners[0].id;
      }

      // 3. Broadcast GameEndPacket sang tất cả Remote Peers (Guests)
      const allPlayerHands: Record<string, NetworkCard[]> = {};
      this.engine.players.forEach(p => {
        allPlayerHands[p.id] = p.hand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id }));
      });

      const resolvedInstantWin = this.engine.instantWinType;
      const packet: GameEndPacket = {
        winners: this.engine.winners.map(w => w.id),
        payouts,
        eloDeltas,
        allPlayerHands,
        isThreeSpadesWin: this.engine.isThreeSpadesWin,
        instantWinType: resolvedInstantWin,
        loanDeduction: 0
      };
      void this.p2pClient.broadcastGameEnd(packet);
    }, options);
  }

  public handleRematchVote(playerId: string, isReady: boolean): void {
    const updatedPlayers = this.roomState.players.map(p => {
      if (p.playerId === playerId) {
        return { ...p, isReady };
      }
      return p;
    });

    const updatedRoom: OnlineRoomState = {
      ...this.roomState,
      players: updatedPlayers,
      updatedAt: Date.now()
    };
    this.roomState = updatedRoom;

    if (this.onRoomStateChange) {
      this.onRoomStateChange(updatedRoom);
    }
    void this.p2pClient.broadcastRoomState(updatedRoom);

    // Kiểm tra nếu tất cả người chơi trong phòng đều đã sẵn sàng (100% phiếu)
    const allReady = updatedRoom.players.every(p => p.isReady);
    if (allReady && updatedRoom.players.length === updatedRoom.playerCount) {
      if (this.onAutoStartMatch) {
        this.onAutoStartMatch();
      }
    }
  }

  public handlePeerLeave(peerId: string): void {
    const leaver = this.roomState.players.find(p => p.peerId === peerId);
    if (!leaver) return;

    if (this.roomState.status === 'PLAYING') {
      // Dừng trận đấu ngay lập tức, giải tán phòng
      this.cleanup();
      const updatedRoom: OnlineRoomState = {
        ...this.roomState,
        status: 'DISBANDED',
        disbandReason: `Người chơi [${leaver.name}] đã rời khỏi trận đấu. Bàn chơi đã tự động giải tán.`,
        updatedAt: Date.now()
      };
      this.roomState = updatedRoom;
      if (this.onRoomStateChange) {
        this.onRoomStateChange(updatedRoom);
      }
      void this.p2pClient.broadcastRoomState(updatedRoom);
    } else {
      // Đang ở phòng chờ (WAITING hoặc ENDED): Xóa người chơi khỏi slot
      const updatedPlayers = this.roomState.players.filter(p => p.peerId !== peerId);
      const updatedRoom: OnlineRoomState = {
        ...this.roomState,
        players: updatedPlayers,
        status: 'WAITING',
        disbandReason: null,
        updatedAt: Date.now()
      };
      this.roomState = updatedRoom;
      if (this.onRoomStateChange) {
        this.onRoomStateChange(updatedRoom);
      }
      void this.p2pClient.broadcastRoomState(updatedRoom);
    }
  }

  public disbandRoom(reason: string): void {
    this.cleanup();
    const updatedRoom: OnlineRoomState = {
      ...this.roomState,
      status: 'DISBANDED',
      disbandReason: reason,
      updatedAt: Date.now()
    };
    this.roomState = updatedRoom;
    if (this.onRoomStateChange) {
      this.onRoomStateChange(updatedRoom);
    }
    void this.p2pClient.broadcastRoomState(updatedRoom);
  }

  public reorderPlayerHand(playerId: string, newHand: Card[]): boolean {
    if (!this.engine) return false;
    const player = this.engine.getPlayer(playerId);
    if (!player) return false;
    player.hand = [...newHand];
    return true;
  }

  public getTracker(playerId: string): CardTracker | null {
    if (!this.trackers[playerId]) {
      const player = this.engine?.getPlayer(playerId);
      if (player) {
        this.trackers[playerId] = new CardTracker(player.hand, 1.0);
      }
    }
    return this.trackers[playerId] ?? null;
  }

  public getAiHint(playerId: string): MoveHint | null {
    if (!this.engine) return null;
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
      this.engine.rules.gameFlow.prohibitEndingWithTwo
    );
  }

  public override cleanup(): void {
    super.cleanup();
    this.clearManagedTimer(this.chopTimer);
    this.chopTimer = null;
    this.chopNotification = null;
    this.trackers = {};
    this.unsubscribeActions.forEach(un => un());
    this.unsubscribeActions = [];
    this.engine = null;
  }
}

