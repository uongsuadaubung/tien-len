import type { Card, Player } from '../types';
import { createPlayedMove } from '../types';
import { createCard } from '../card';
import { identifyCombination } from '../combinations';
import type { DriverActionResult, IMatchDriver } from '../match-driver.interface';
import { BaseMatchDriver } from '../base-match-driver';
import { P2PClient } from './p2p-client';
import type { TableStateSyncPacket, GameEndPacket } from './network.schema';
import { useGameStore } from '../../stores/useGameStore';
import { useUserStore } from '../../stores/useUserStore';
import { GameEventBus } from '../events/game-event-bus';
import { CardTracker } from '../../ai/card-tracker';
import { getOptimalMoveHint, type MoveHint } from '../../ai/hint-engine';

export interface GuestEngineDriverOptions {
  readonly p2pClient: P2PClient;
  readonly myPlayerId: string;
  readonly onGameEnd?: ((packet: GameEndPacket) => void) | null;
}

/**
 * GuestEngineDriver
 * Trình điều phối bàn đấu từ góc nhìn Khách (Client) trong trận đấu Online P2P.
 * Thực thi hợp đồng IMatchDriver chuẩn mực, hoàn thiện kiến trúc đối xứng:
 * OfflineMatchDriver (Offline) <-> HostEngineDriver (Online Host) <-> GuestEngineDriver (Online Guest)
 *
 * Đóng vai trò Domain Event Bridge (kích hoạt âm thanh & visual effects qua GameEventBus)
 * và cung cấp client-side CardTracker & MoveHint hợp lệ.
 */
export class GuestEngineDriver extends BaseMatchDriver implements IMatchDriver {
  public gameNumber: number = 1;
  public lastSeenStateSyncSeq: number = 0;
  private readonly p2pClient: P2PClient;
  private readonly myPlayerId: string;
  private unsubscribeCallbacks: Array<() => void> = [];
  private readonly onGameEndCallback: ((packet: GameEndPacket) => void) | null;

  private tracker: CardTracker | null = null;
  private lastCurrentMoveSignature: string | null = null;
  private lastPassedPlayerIds: Set<string> = new Set();

  constructor(options: GuestEngineDriverOptions) {
    super();
    this.p2pClient = options.p2pClient;
    this.myPlayerId = options.myPlayerId;
    this.onGameEndCallback = options.onGameEnd ?? null;
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    // 1. Lắng nghe gói tin đồng bộ bàn đấu từ Host
    const unSync = this.p2pClient.onTableSync((sync: TableStateSyncPacket) => {
      if (this.isDisposed) return;
      if (sync.gameNumber > this.gameNumber) {
        this.gameNumber = sync.gameNumber;
        this.lastSeenStateSyncSeq = 0;
        this.lastCurrentMoveSignature = null;
        this.lastPassedPlayerIds.clear();
      } else if (sync.seq !== undefined && sync.seq > 0 && sync.seq <= this.lastSeenStateSyncSeq) {
        console.warn(`[GuestEngineDriver] Dropped out-of-order state sync packet (seq=${sync.seq}, lastSeen=${this.lastSeenStateSyncSeq})`);
        return;
      }
      if (sync.seq !== undefined && sync.seq > 0) {
        this.lastSeenStateSyncSeq = sync.seq;
      }
      this.gameNumber = sync.gameNumber;

      // Khởi tạo tracker cho người chơi nếu chưa có
      const gameStore = useGameStore.getState();
      const localPlayer = gameStore.players.find(p => p.id === this.myPlayerId);
      if (!this.tracker && localPlayer && localPlayer.hand.length > 0) {
        this.tracker = new CardTracker(localPlayer.hand, 1.0);
      }

      // Domain Event Bridge: Phát hiện bài mới được đánh
      if (sync.currentMoveCards && sync.currentMoveCards.length > 0 && sync.currentMovePlayerId) {
        const moveSignature = `${sync.currentMovePlayerId}:${sync.currentMoveCards.map(c => c.id).sort().join(',')}`;
        if (moveSignature !== this.lastCurrentMoveSignature) {
          this.lastCurrentMoveSignature = moveSignature;
          const moveCards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
          const combo = identifyCombination(moveCards);
          if (combo) {
            const playedMove = createPlayedMove(
              sync.currentMovePlayerId,
              combo,
              sync.isChop ? {
                choppedPlayerId: '',
                penaltyAmount: sync.chopNotification?.amount ?? 0,
                isCascadeChop: sync.isCascadeChop
              } : undefined,
              Date.now()
            );
            if (this.tracker) {
              this.tracker.recordMove(playedMove);
            }
            GameEventBus.getInstance().emit({
              type: 'CARD_PLAYED',
              playerId: sync.currentMovePlayerId,
              cards: moveCards,
              combination: combo,
              remainingCardsCount: sync.remainingCardCounts[sync.currentMovePlayerId] ?? 0
            });
          }

          if (sync.isChop) {
            GameEventBus.getInstance().emit({
              type: 'CHOP_EXECUTED',
              chopperPlayerId: sync.currentMovePlayerId,
              victimPlayerId: '',
              penaltyAmount: sync.chopNotification?.amount ?? 0,
              choppingCards: moveCards,
              isCascadeChop: sync.isCascadeChop,
              chopChainCount: sync.chopNotification?.chainCount ?? 1
            });
          }
        }
      }

      // Domain Event Bridge: Phát hiện người chơi bỏ lượt
      const currentPassed = new Set(sync.passedPlayerIds || []);
      currentPassed.forEach(passedId => {
        if (!this.lastPassedPlayerIds.has(passedId)) {
          GameEventBus.getInstance().emit({
            type: 'TURN_PASSED',
            playerId: passedId
          });
        }
      });
      this.lastPassedPlayerIds = currentPassed;

      // Đồng bộ trạng thái vào Zustand Store
      useGameStore.getState().applyAuthoritativeTableSync(sync);
    });
    this.unsubscribeCallbacks.push(unSync);

    // 2. Lắng nghe gói tin kết thúc ván đấu từ Host
    const unEnd = this.p2pClient.onGameEnd((packet: GameEndPacket) => {
      if (this.isDisposed) return;

      const gameStore = useGameStore.getState();
      const isHumanWinner = packet.winners.length > 0 && packet.winners[0] === this.myPlayerId;
      const winnerId = packet.winners[0] ?? '';
      const winningPlayers = packet.winners
        .map(id => gameStore.players.find(p => p.id === id))
        .filter((p): p is Player => p !== undefined && p !== null);

      GameEventBus.getInstance().emit({
        type: 'MATCH_COMPLETED',
        activeGameType: 'ONLINE',
        winnerPlayerId: winnerId,
        isHumanWinner,
        winners: winningPlayers,
        allPlayers: gameStore.players,
        payouts: packet.payouts,
        humanNetCoins: packet.payouts[this.myPlayerId] ?? 0,
        totalHumanCoins: useUserStore.getState().profile.coins,
        betAmount: gameStore.gameRules.table.betAmount,
        isThreeSpadesWin: packet.isThreeSpadesWin ?? false,
        playerCount: gameStore.players.length,
        congsGivenCount: 0,
        cascadeChopCount: 0,
        loanDeduction: packet.loanDeduction ?? 0,
        instantWinType: packet.instantWinType ?? null
      });

      if (this.onGameEndCallback) {
        this.onGameEndCallback(packet);
      }
    });
    this.unsubscribeCallbacks.push(unEnd);
  }

  public playCardIds(playerId: string, cardIds: string[]): DriverActionResult {
    if (this.isDisposed) {
      return { success: false, error: 'Driver đã bị giải phóng' };
    }

    // 1. Optimistic Hand Removal & Card Selection Clear
    const cardIdSet = new Set(cardIds);
    const gameStore = useGameStore.getState();
    const targetPlayer = gameStore.players.find(p => p.id === playerId);

    if (targetPlayer && targetPlayer.hand.some(c => cardIdSet.has(c.id))) {
      const playedCards = targetPlayer.hand.filter(c => cardIdSet.has(c.id));
      const updatedPlayers = gameStore.players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            hand: p.hand.filter(c => !cardIdSet.has(c.id)),
            playedCards: [...p.playedCards, ...playedCards]
          };
        }
        return p;
      });
      gameStore.setPlayers(updatedPlayers);
      gameStore.clearCardSelection();

      if (this.tracker && playerId === this.myPlayerId) {
        const myNewHand = updatedPlayers.find(p => p.id === playerId)?.hand ?? [];
        this.tracker.updateOwnHand(myNewHand);
      }
    }

    void this.p2pClient.sendPlayerAction({
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
    if (this.isDisposed) {
      return { success: false, error: 'Driver đã bị giải phóng' };
    }
    useGameStore.getState().clearCardSelection();
    void this.p2pClient.sendPlayerAction({
      type: 'PASS',
      playerId,
      timestamp: Date.now()
    });
    return { success: true };
  }

  public handleGameOver(): void {
    // Trạng thái hạ màn ở góc nhìn Guest được điều khiển từ Authoritative Table Sync của Host
  }

  public override reorderPlayerHand(playerId: string, newHand: Card[]): boolean {
    if (playerId === this.myPlayerId) {
      const gameStore = useGameStore.getState();
      const updatedPlayers = gameStore.players.map(p => {
        if (p.id === playerId) {
          return { ...p, hand: newHand };
        }
        return p;
      });
      gameStore.setPlayers(updatedPlayers);
      if (this.tracker) {
        this.tracker.updateOwnHand(newHand);
      }
      return true;
    }
    return false;
  }

  public override getTracker(playerId: string): CardTracker | null {
    if (!this.tracker) {
      const gameStore = useGameStore.getState();
      const localPlayer = gameStore.players.find(p => p.id === playerId);
      if (localPlayer) {
        this.tracker = new CardTracker(localPlayer.hand, 1.0);
      }
    }
    return this.tracker ?? null;
  }

  public override getAiHint(playerId: string): MoveHint | null {
    if (playerId !== this.myPlayerId) return null;
    const gameStore = useGameStore.getState();
    const localPlayer = gameStore.players.find(p => p.id === playerId);
    if (!localPlayer || localPlayer.hand.length === 0) return null;

    const tracker = this.getTracker(playerId);
    if (!tracker) return null;

    const currentMove = gameStore.currentMove;
    const isLeadMove = gameStore.matchState.status === 'PLAYING' ? gameStore.matchState.isLeadMove : true;
    const isFirstMoveOfGame = gameStore.matchState.status === 'PLAYING' ? gameStore.matchState.isFirstMoveOfGame : false;
    const remainingCounts = gameStore.dealtCounts;

    const myIndex = gameStore.players.findIndex(p => p.id === playerId);
    const nextIndex = myIndex !== -1 ? (myIndex + 1) % gameStore.players.length : -1;
    const nextPlayer = nextIndex !== -1 ? gameStore.players[nextIndex] : null;
    const nextPlayerId = nextPlayer?.id ?? '';
    const isNextPlayerOneCard = nextPlayer ? (remainingCounts[nextPlayer.id] === 1 || nextPlayer.hand.length === 1) : false;

    return getOptimalMoveHint(
      localPlayer.hand,
      currentMove,
      isFirstMoveOfGame,
      isLeadMove,
      tracker,
      remainingCounts,
      nextPlayerId,
      isNextPlayerOneCard,
      gameStore.gameRules.gameFlow.prohibitEndingWithTwo
    );
  }

  public override cleanup(): void {
    super.cleanup();
    this.tracker = null;
    this.lastCurrentMoveSignature = null;
    this.lastPassedPlayerIds.clear();
    this.unsubscribeCallbacks.forEach(un => {
      try {
        un();
      } catch {}
    });
    this.unsubscribeCallbacks = [];
  }
}
