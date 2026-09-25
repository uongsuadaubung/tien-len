import { createPlayedMove, type Card, type MatchPlayer, type GameRules, type PlayedMove } from '../types';
import { cloneMatchPlayers, updatePlayersHand, updatePlayerInList, revealPlayersHands, resetPlayersForNewGame } from '../player-factory';
import type { IClientTransport, HostToClientPacket } from '../transport/transport.interface';
import type { 
  TableStateSyncPacket,
  OpeningReason,
  LastAction
} from '../network/network.schema';
import type { IGameSession } from './game-session.interface';
import type { TableRenderFrame, UserIntent, AudioCue, HandSortMode } from './frame-types';
import { projectTableFrame } from './table-frame-projector';
import { sortCards, createCard } from '../card';
import { identifyCombination } from '../combinations';
import { CardTracker } from '../../ai/card-tracker';
import { getOptimalMoveHint, type MoveHint } from '../../ai/hint-engine';
import { getSortedQuickSelectCandidates } from '../quick-response-finder';
import { createPlayingTurnMatchState, isPlayingMatchState, type MatchState } from '../state-machine/types';
import { createPerspectiveSettlement } from '../settlement/perspective-settlement';
import { CAMPAIGN_CHAPTERS, type CampaignChapter, type CampaignResultMeta } from '../campaign';

export interface ClientSessionOptions {
  localPlayerId: string;
  transport: IClientTransport;
  gameRules: GameRules;
  initialPlayers: MatchPlayer[];
  activeGameType?: 'QUICK' | 'CAMPAIGN' | 'ONLINE';
  campaignChapter?: CampaignChapter;
  campaignResultMeta?: CampaignResultMeta | null;
}

/**
 * ClientSession
 * Đại diện cho phiên chơi phía Client (Guest Engine).
 * Giao tiếp với Host qua IClientTransport và cung cấp TableRenderFrame đóng gói sẵn cho Web UI.
 * Đảm nhiệm vai trò Dumb View Controller duy nhất.
 */
export class ClientSession implements IGameSession {
  public readonly localPlayerId: string;
  private readonly transport: IClientTransport;
  private readonly activeGameType: 'QUICK' | 'CAMPAIGN' | 'ONLINE';
  private gameRules: GameRules;
  private players: MatchPlayer[];

  private gameNumber: number = 1;
  public isDealing: boolean = false;
  public dealBanner: string | null = null;
  public dealtCounts: Record<string, number> = {};
  public lastWinnerId: string | null = null;
  public turnDeadline: number | null = null;
  public openingReason: OpeningReason | null = null;
  public lastAction: LastAction | null = null;
  private myHand: Card[] = [];
  private selectedCardIds: Set<string> = new Set();
  private handSortMode: HandSortMode = 'NATURAL';
  private currentHint: MoveHint | null = null;
  private latestSync: TableStateSyncPacket | null = null;
  private latestMatchState: MatchState;
  private tracker: CardTracker | null = null;

  private readonly frameListeners: Set<(frame: TableRenderFrame) => void> = new Set();
  private readonly audioListeners: Set<(cue: AudioCue) => void> = new Set();
  private unsubscribeTransport: (() => void) | null = null;
  private lastPlayedMove: PlayedMove | null = null;
  private campaignChapter: CampaignChapter | null = null;
  private campaignResultMeta: CampaignResultMeta | null = null;
  public playerWins: Record<string, number> = {};
  public initialScores: Record<string, number> = {};
  private isDisposed: boolean = false;
  private dealThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: ClientSessionOptions) {
    this.localPlayerId = options.localPlayerId;
    this.transport = options.transport;
    this.activeGameType = options.activeGameType ?? 'QUICK';
    this.gameRules = options.gameRules;
    this.campaignChapter = options.campaignChapter ?? null;
    this.campaignResultMeta = options.campaignResultMeta ?? null;
    this.players = cloneMatchPlayers(options.initialPlayers);
    for (const p of this.players) {
      this.initialScores[p.id] = p.score;
      this.playerWins[p.id] = 0;
    }
    const localInitialPlayer = this.players.find(p => p.id === this.localPlayerId);
    if (localInitialPlayer && localInitialPlayer.hand && localInitialPlayer.hand.length > 0) {
      this.myHand = [...localInitialPlayer.hand];
    }
    this.latestMatchState = {
      status: 'WAITING',
      gameNumber: 1,
      players: this.players,
      rules: this.gameRules,
      lastWinnerId: null
    };

    this.setupTransportListeners();
  }

  public setCampaignMeta(chapter: CampaignChapter, meta: CampaignResultMeta | null = null): void {
    this.campaignChapter = chapter;
    this.campaignResultMeta = meta;
  }

  private setupTransportListeners(): void {
    this.unsubscribeTransport = this.transport.onMessage((msg: HostToClientPacket) => {
      if (this.isDisposed) return;

      if (msg.type === 'DEAL_HAND') {
        if (msg.packet.playerId === this.localPlayerId) {
          if (msg.packet.gameNumber) {
            this.gameNumber = msg.packet.gameNumber;
          }
          if (msg.packet.lastWinnerId !== undefined) {
            this.lastWinnerId = msg.packet.lastWinnerId;
          }
          if (msg.packet.openingReason !== undefined) {
            this.openingReason = msg.packet.openingReason;
          }
          if (msg.packet.turnDeadline !== undefined) {
            this.turnDeadline = msg.packet.turnDeadline;
          }
          this.lastPlayedMove = null;
          this.currentHint = null;
          this.myHand = sortCards(msg.packet.cards.map(c => createCard(c.rank, c.suit)));
          this.players = resetPlayersForNewGame(this.players, this.localPlayerId, this.myHand);
          this.tracker = new CardTracker(this.myHand, 1.0, this.players.length);
          const reqCard = msg.packet.firstMoveRequiredCard
            ? createCard(msg.packet.firstMoveRequiredCard.rank, msg.packet.firstMoveRequiredCard.suit)
            : null;

          this.latestMatchState = createPlayingTurnMatchState({
            status: 'PLAYING',
            gameNumber: msg.packet.gameNumber || this.gameNumber,
            roundNumber: 1,
            players: this.players,
            rules: this.gameRules,
            roundMoves: [],
            currentTurnPlayerId: msg.packet.firstTurnPlayerId || '',
            leadPlayerId: msg.packet.leadPlayerId || '',
            leadingMove: null,
            passedPlayerIds: [],
            isLeadMove: msg.packet.isLeadMove ?? true,
            isFirstMoveOfGame: msg.packet.isFirstMoveOfGame ?? false,
            firstMoveRequiredCard: reqCard,
            chopNotification: null,
            botThinkingThought: null
          });

          this.emitAudioCue('DEAL_START');
          this.updateAndEmitFrame();
        }
      } else if (msg.type === 'TABLE_SYNC') {
        this.handleTableSync(msg.packet);
      } else if (msg.type === 'GAME_END') {
        const isWinner = msg.packet.winners.includes(this.localPlayerId);
        this.emitAudioCue(isWinner ? 'VICTORY' : 'DEFEAT');

        if (msg.packet.allPlayerHands) {
          const revealedCards: Record<string, Card[]> = {};
          for (const [pid, cards] of Object.entries(msg.packet.allPlayerHands)) {
            revealedCards[pid] = cards.map(c => createCard(c.rank, c.suit));
          }
          this.players = revealPlayersHands(this.players, revealedCards);
        }

        // Cập nhật số dư điểm xu chính thức từ Server (Authoritative Match Host)
        if (msg.packet.playerScores) {
          this.players = this.players.map(p => {
            const serverScore = msg.packet.playerScores[p.id];
            return serverScore !== undefined ? { ...p, score: serverScore } : p;
          });
        }

        if (msg.packet.playerWins) {
          this.playerWins = { ...msg.packet.playerWins };
        }
        if (msg.packet.initialScores) {
          this.initialScores = { ...msg.packet.initialScores };
        }

        const winners = msg.packet.winners
          .map(id => this.players.find(p => p.id === id))
          .filter((p): p is MatchPlayer => p !== undefined && p !== null);
        if (winners.length > 0) {
          this.lastWinnerId = winners[0].id;
        }
        const packetPayouts = msg.packet.payouts ?? {};
        const packetEloDeltas = msg.packet.eloDeltas ?? {};

        const updatedSettlement = (this.activeGameType === 'CAMPAIGN')
          ? createPerspectiveSettlement({
              subjectPlayerId: this.localPlayerId,
              allPlayers: this.players,
              winners,
              payouts: packetPayouts,
              eloDeltas: packetEloDeltas,
              subjectEloDelta: packetEloDeltas[this.localPlayerId] ?? 0,
              subjectEloBreakdown: null,
              loanDeduction: msg.packet.loanDeduction ?? 0,
              isThreeSpadesWin: msg.packet.isThreeSpadesWin ?? false,
              instantWinType: msg.packet.instantWinType ?? null,
              activeGameType: 'CAMPAIGN',
              campaignChapter: this.campaignChapter ?? CAMPAIGN_CHAPTERS[0],
              campaignResultMeta: this.campaignResultMeta ?? null,
              betAmount: this.gameRules.table.betAmount,
              subjectCoins: this.players.find(p => p.id === this.localPlayerId)?.score ?? 0
            })
          : createPerspectiveSettlement({
              subjectPlayerId: this.localPlayerId,
              allPlayers: this.players,
              winners,
              payouts: packetPayouts,
              eloDeltas: packetEloDeltas,
              subjectEloDelta: packetEloDeltas[this.localPlayerId] ?? 0,
              subjectEloBreakdown: null,
              loanDeduction: msg.packet.loanDeduction ?? 0,
              isThreeSpadesWin: msg.packet.isThreeSpadesWin ?? false,
              instantWinType: msg.packet.instantWinType ?? null,
              activeGameType: this.activeGameType === 'ONLINE' ? 'ONLINE' : 'QUICK',
              betAmount: this.gameRules.table.betAmount,
              subjectCoins: this.players.find(p => p.id === this.localPlayerId)?.score ?? 0
            });

        const effectiveWinningMove = (this.latestMatchState.status === 'GAME_OVER' ? this.latestMatchState.winningMove : null) ?? this.lastPlayedMove;

        this.latestMatchState = {
          status: 'GAME_OVER',
          gameNumber: this.gameNumber,
          players: this.players,
          rules: this.gameRules,
          winners: winners,
          winningMove: effectiveWinningMove,
          leadingMove: effectiveWinningMove,
          isThreeSpadesWin: msg.packet.isThreeSpadesWin ?? false,
          matchPayouts: packetPayouts,
          eloDeltas: packetEloDeltas,
          settlement: updatedSettlement,
          matchLogReport: null
        };
        this.updateAndEmitFrame();
      }
    });
  }

  private handleTableSync(sync: TableStateSyncPacket): void {
    if (
      this.latestSync &&
      sync.seq > 0 &&
      this.latestSync.seq > 0 &&
      sync.seq <= this.latestSync.seq &&
      sync.gameNumber === this.latestSync.gameNumber &&
      (sync.seq < this.latestSync.seq || sync.timestamp <= this.latestSync.timestamp)
    ) {
      return;
    }
    this.latestSync = sync;
    if (sync.gameNumber) {
      this.gameNumber = sync.gameNumber;
    }
    if (sync.lastWinnerId !== undefined) {
      this.lastWinnerId = sync.lastWinnerId;
    }
    if (sync.openingReason !== undefined) {
      this.openingReason = sync.openingReason;
    }
    if (sync.turnDeadline !== undefined) {
      this.turnDeadline = sync.turnDeadline;
    }
    if (sync.seats && sync.seats.length > 0) {
      this.players = this.players.map(p => {
        const seat = sync.seats!.find(s => s.playerId === p.id);
        if (seat) {
          if (seat.wins !== undefined) {
            this.playerWins[p.id] = seat.wins;
          }
          if (seat.initialScore !== undefined) {
            this.initialScores[p.id] = seat.initialScore;
          }
          return {
            ...p,
            cardCount: (p.id === this.localPlayerId && this.myHand.length > 0) ? this.myHand.length : seat.cardCount,
            score: seat.score,
            isPassedCurrentRound: seat.isPassed
          };
        }
        return p;
      });
    }
    this.isDealing = sync.isDealing ?? false;
    this.dealBanner = sync.dealBanner ?? null;

    if (sync.remainingCardCounts) {
      this.dealtCounts = { ...sync.remainingCardCounts };
    }

    if (sync.isDealing) {
      if (sync.dealtCounts) {
        this.dealtCounts = { ...sync.dealtCounts };
      }
      this.latestMatchState = {
        status: 'DEALING',
        gameNumber: sync.gameNumber ?? this.gameNumber,
        players: this.players,
        dealtCounts: this.dealtCounts,
        dealBanner: this.dealBanner,
        totalCardsDealt: Object.values(this.dealtCounts).reduce((a, b) => a + b, 0),
        rules: this.gameRules
      };
      this.updateAndEmitFrame();
      return;
    }

    // 1. Nhận diện hành động tức thời từ Server qua lastAction (Zero-Diffing)
    if (sync.lastAction) {
      const isNewAction = !this.lastAction ||
        this.lastAction.playerId !== sync.lastAction.playerId ||
        this.lastAction.type !== sync.lastAction.type ||
        this.lastAction.summary !== sync.lastAction.summary;

      this.lastAction = sync.lastAction;

      // Chỉ phát âm thanh nếu không phải nước đi lạc quan do chính local player vừa gửi
      if (isNewAction && sync.lastAction.playerId !== this.localPlayerId) {
        if (sync.lastAction.type === 'CHOP') {
          this.emitAudioCue('CHOP');
        } else if (sync.lastAction.type === 'PLAY') {
          this.emitAudioCue('CARD_PLAY');
        } else if (sync.lastAction.type === 'PASS') {
          this.emitAudioCue('PASS');
        }
      }
    }

    // Chuyển đổi packet thành MatchState nội bộ
    if (!sync.isGameOver) {
      const leadingMoveCards = sync.currentMoveCards ? sync.currentMoveCards.map(c => createCard(c.rank, c.suit)) : [];
      let leadingMove: PlayedMove | null = null;

      if (leadingMoveCards.length > 0 && sync.currentMovePlayerId) {
        const combo = identifyCombination(leadingMoveCards);
        if (combo) {
          leadingMove = createPlayedMove(sync.currentMovePlayerId, combo);
          this.lastPlayedMove = leadingMove;
          if (this.tracker) {
            this.tracker.recordMove(leadingMove);
          }
        }
      }

      const reqCard = sync.firstMoveRequiredCard 
        ? createCard(sync.firstMoveRequiredCard.rank, sync.firstMoveRequiredCard.suit)
        : null;

      if (sync.currentMovePlayerId === this.localPlayerId && leadingMoveCards.length > 0) {
        const playedCardIds = new Set(leadingMoveCards.map(c => c.id));
        this.myHand = this.myHand.filter(c => !playedCardIds.has(c.id));
        this.selectedCardIds.clear();
      }



      this.latestMatchState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: sync.gameNumber ?? this.gameNumber,
        roundNumber: sync.roundNumber ?? 1,
        players: this.players,
        rules: this.gameRules,
        roundMoves: leadingMove ? [leadingMove] : [],
        currentTurnPlayerId: sync.currentTurnPlayerId || '',
        leadPlayerId: sync.leadPlayerId || '',
        leadingMove,
        passedPlayerIds: sync.passedPlayerIds ?? [],
        isLeadMove: sync.isLeadMove ?? (leadingMove === null),
        isFirstMoveOfGame: sync.isFirstMoveOfGame ?? false,
        firstMoveRequiredCard: reqCard,
        chopNotification: sync.chopNotification ?? null,
        botThinkingThought: null
      });
    } else {
      const leadingMoveCards = sync.currentMoveCards ? sync.currentMoveCards.map(c => createCard(c.rank, c.suit)) : [];
      const leadingCombo = leadingMoveCards.length > 0 ? identifyCombination(leadingMoveCards) : null;
      const leadingMove = (leadingCombo && sync.currentMovePlayerId)
        ? createPlayedMove(sync.currentMovePlayerId, leadingCombo)
        : this.lastPlayedMove;

      const winners = sync.winners
        .map(id => this.players.find(p => p.id === id))
        .filter((p): p is MatchPlayer => p !== undefined && p !== null);
      const fallbackPayouts: Record<string, number> = {};
      for (const p of this.players) {
        fallbackPayouts[p.id] = 0;
      }

      const settlement = (this.activeGameType === 'CAMPAIGN')
        ? createPerspectiveSettlement({
            subjectPlayerId: this.localPlayerId,
            allPlayers: this.players,
            winners,
            payouts: fallbackPayouts,
            eloDeltas: {},
            subjectEloDelta: 0,
            subjectEloBreakdown: null,
            loanDeduction: 0,
            isThreeSpadesWin: false,
            instantWinType: null,
            activeGameType: 'CAMPAIGN',
            campaignChapter: this.campaignChapter ?? CAMPAIGN_CHAPTERS[0],
            campaignResultMeta: this.campaignResultMeta ?? null,
            betAmount: this.gameRules.table.betAmount,
            subjectCoins: this.players.find(p => p.id === this.localPlayerId)?.score ?? 0
          })
        : createPerspectiveSettlement({
            subjectPlayerId: this.localPlayerId,
            allPlayers: this.players,
            winners: winners.length > 0 ? winners : [this.players[0]],
            payouts: fallbackPayouts,
            eloDeltas: {},
            subjectEloDelta: 0,
            subjectEloBreakdown: null,
            loanDeduction: 0,
            isThreeSpadesWin: false,
            instantWinType: null,
            activeGameType: this.activeGameType === 'ONLINE' ? 'ONLINE' : 'QUICK',
            betAmount: this.gameRules.table.betAmount,
            subjectCoins: this.players.find(p => p.id === this.localPlayerId)?.score ?? 0
          });

      this.latestMatchState = {
        status: 'GAME_OVER',
        gameNumber: sync.gameNumber ?? this.gameNumber,
        players: this.players,
        rules: this.gameRules,
        winners,
        winningMove: leadingMove,
        leadingMove,
        isThreeSpadesWin: false,
        matchPayouts: {},
        eloDeltas: {},
        settlement,
        matchLogReport: null
      };
    }

    this.updateAndEmitFrame();
  }

  public dealCardStep(playerIndex: number, currentCardCount: number): void {
    const player = this.players[playerIndex];
    if (player) {
      this.dealtCounts[player.id] = currentCardCount;
      if (!this.dealThrottleTimer) {
        this.dealThrottleTimer = setTimeout(() => {
          this.dealThrottleTimer = null;
          if (!this.isDisposed) {
            this.updateAndEmitFrame();
          }
        }, 80);
      }
    }
  }

  public finishDealing(): void {
    if (this.dealThrottleTimer) {
      clearTimeout(this.dealThrottleTimer);
      this.dealThrottleTimer = null;
    }
    this.isDealing = false;
    for (const p of this.players) {
      this.dealtCounts[p.id] = p.hand.length;
    }
    this.updateAndEmitFrame();
  }

  private computeCurrentAiHint(): MoveHint | null {
    if (this.latestMatchState.status !== 'PLAYING') return null;
    if (this.latestMatchState.currentTurnPlayerId !== this.localPlayerId) return null;
    if (this.myHand.length === 0) return null;

    if (!this.tracker) {
      this.tracker = new CardTracker(this.myHand, 1.0, this.players.length);
    } else {
      this.tracker.updateOwnHand(this.myHand);
    }
    const currentMove = this.latestMatchState.leadingMove ?? null;
    const isLead = this.latestMatchState.isLeadMove;
    const isFirst = this.latestMatchState.isFirstMoveOfGame;

    return getOptimalMoveHint(
      [...this.myHand],
      currentMove,
      isFirst,
      isLead,
      this.tracker,
      this.latestSync?.remainingCardCounts ?? {},
      '',
      false,
      this.gameRules.gameFlow.prohibitEndingWithTwo,
      this.gameRules.settlementRule ?? 'COUNT_CARDS',
      this.gameRules,
      true,
      this.localPlayerId
    );
  }

  private buildCurrentFrame(): TableRenderFrame {
    const aiHint = this.computeCurrentAiHint();
    if (aiHint) {
      this.currentHint = aiHint;
    } else if (this.latestMatchState.status !== 'PLAYING' || this.latestMatchState.currentTurnPlayerId !== this.localPlayerId) {
      this.currentHint = null;
    }

    return projectTableFrame({
      matchState: this.latestMatchState,
      localPlayerId: this.localPlayerId,
      localHand: this.myHand,
      selectedCardIds: this.selectedCardIds,
      gameRules: this.gameRules,
      players: this.players,
      dealtCounts: this.isDealing ? this.dealtCounts : (this.latestSync?.remainingCardCounts ?? this.dealtCounts),
      currentHint: aiHint ?? this.currentHint,
      botThinkingThought: isPlayingMatchState(this.latestMatchState) ? this.latestMatchState.botThinkingThought : null,
      isDealing: this.isDealing,
      dealBanner: this.dealBanner,
      turnDeadline: this.turnDeadline,
      openingReason: this.openingReason,
      lastAction: this.lastAction,
      currentMoveCombinationName: this.latestSync?.currentMoveCombinationName ?? null,
      playerWins: this.playerWins,
      initialScores: this.initialScores
    });
  }

  private updateAndEmitFrame(): void {
    const frame = this.buildCurrentFrame();

    for (const listener of this.frameListeners) {
      try {
        listener(frame);
      } catch (err) {
        console.error('[ClientSession] Frame listener error:', err);
      }
    }
  }

  private emitAudioCue(cue: AudioCue): void {
    for (const listener of this.audioListeners) {
      try {
        listener(cue);
      } catch (err) {
        console.error('[ClientSession] Audio listener error:', err);
      }
    }
  }

  // =========================================================================
  // IGameSession Implementation
  // =========================================================================

  public sendIntent(intent: UserIntent): void {
    if (this.isDisposed) return;

    switch (intent.type) {
      case 'TOGGLE_CARD_SELECT': {
        if (this.selectedCardIds.has(intent.cardId)) {
          this.selectedCardIds.delete(intent.cardId);
        } else {
          this.selectedCardIds.add(intent.cardId);
        }
        this.emitAudioCue('CARD_SLIDE');
        this.updateAndEmitFrame();
        break;
      }
      case 'SET_SELECTED_CARDS': {
        this.selectedCardIds = new Set(intent.cardIds);
        this.emitAudioCue('CARD_SLIDE');
        this.updateAndEmitFrame();
        break;
      }
      case 'CLEAR_SELECTION': {
        this.selectedCardIds.clear();
        this.updateAndEmitFrame();
        break;
      }
      case 'SUBMIT_PLAY': {
        const selected = this.myHand.filter(c => this.selectedCardIds.has(c.id));
        if (selected.length === 0) {
          return;
        }

        const combo = identifyCombination(selected);
        let playedMove: PlayedMove | null = null;
        if (combo) {
          playedMove = createPlayedMove(this.localPlayerId, combo);
          this.lastPlayedMove = playedMove;
        }

        // 1. Loại bỏ bài đã đánh khỏi tay người chơi cục bộ (Optimistic local hand removal)
        const playedIds = new Set(selected.map(c => c.id));
        this.myHand = this.myHand.filter(c => !playedIds.has(c.id));
        this.players = updatePlayersHand(this.players, this.localPlayerId, this.myHand);
        this.selectedCardIds.clear();
        this.currentHint = null;

        // 2. Optimistic UI Projection: Chiếu ngay nước đi ra giữa bàn và phát âm thanh (0ms)
        if (playedMove) {
          if (playedMove.isChop) {
            this.emitAudioCue('CHOP');
          } else {
            this.emitAudioCue('CARD_PLAY');
          }

          if (this.latestMatchState.status === 'PLAYING') {
            this.latestMatchState = createPlayingTurnMatchState({
              ...this.latestMatchState,
              players: this.players,
              currentTurnPlayerId: '', // Vô hiệu hóa nút Đánh/Bỏ lượt ngay lập tức để tránh spam click
              leadingMove: playedMove,
              roundMoves: [...this.latestMatchState.roundMoves, playedMove],
              isLeadMove: false,
              isFirstMoveOfGame: false,
              firstMoveRequiredCard: null
            });
          }
        }

        // 3. Gửi gói tin lên mạng cho Host xác thực và phát sóng chính thức
        this.transport.send({
          type: 'PLAYER_ACTION',
          packet: {
            playerId: this.localPlayerId,
            type: 'PLAY',
            cardIds: selected.map(c => c.id),
            timestamp: Date.now()
          }
        });

        this.updateAndEmitFrame();
        break;
      }
      case 'SUBMIT_PASS': {
        this.selectedCardIds.clear();
        this.currentHint = null;
        this.emitAudioCue('PASS');
        this.players = updatePlayerInList(this.players, this.localPlayerId, { isPassedCurrentRound: true });
        if (this.latestMatchState.status === 'PLAYING') {
          this.latestMatchState = {
            ...this.latestMatchState,
            players: this.players,
            currentTurnPlayerId: '', // Vô hiệu hóa nút Bỏ lượt ngay lập tức để tránh bấm 2 lần
            passedPlayerIds: Array.from(new Set([...this.latestMatchState.passedPlayerIds, this.localPlayerId]))
          };
        }
        this.transport.send({
          type: 'PLAYER_ACTION',
          packet: {
            playerId: this.localPlayerId,
            type: 'PASS',
            timestamp: Date.now()
          }
        });
        this.updateAndEmitFrame();
        break;
      }
      case 'TRIGGER_QUICK_SELECT': {
        if (this.myHand.length === 0) return;
        const currentMove = (this.latestMatchState.status === 'PLAYING') ? this.latestMatchState.leadingMove : null;
        const isLead = (this.latestMatchState.status === 'PLAYING') ? this.latestMatchState.isLeadMove : false;
        const isFirst = (this.latestMatchState.status === 'PLAYING') ? this.latestMatchState.isFirstMoveOfGame : false;
        const reqCard = (this.latestMatchState.status === 'PLAYING') ? this.latestMatchState.firstMoveRequiredCard : null;

        const candidates = getSortedQuickSelectCandidates({
          hand: [...this.myHand],
          leadingMove: currentMove,
          isLeadMove: isLead,
          isFirstMoveOfGame: isFirst,
          firstMoveRequiredCard: reqCard ?? undefined,
          allowFourPairsCutAnytime: this.gameRules.chopping.allowFourPairsCutAnytime,
          prohibitEndingWithTwo: this.gameRules.gameFlow.prohibitEndingWithTwo
        });

        if (candidates.length > 0) {
          const chosen = candidates[0].cards;
          this.selectedCardIds = new Set(chosen.map(c => c.id));
          this.emitAudioCue('CARD_SLIDE');
          this.updateAndEmitFrame();
        }
        break;
      }
      case 'SORT_HAND': {
        this.myHand = sortCards(this.myHand);
        this.players = updatePlayersHand(this.players, this.localPlayerId, this.myHand);
        this.emitAudioCue('CARD_SLIDE');
        this.updateAndEmitFrame();
        break;
      }
      case 'REORDER_HAND': {
        this.myHand = [...intent.newHand];
        this.players = updatePlayersHand(this.players, this.localPlayerId, this.myHand);
        this.emitAudioCue('CARD_SLIDE');
        this.updateAndEmitFrame();
        break;
      }
      case 'APPLY_HINT': {
        const hint = this.computeCurrentAiHint() ?? this.currentHint;
        if (hint && hint.action === 'PLAY' && hint.cards.length > 0) {
          this.currentHint = hint;
          this.selectedCardIds = new Set(hint.cards.map(c => c.id));
          this.emitAudioCue('CARD_SLIDE');
          this.updateAndEmitFrame();
        }
        break;
      }
    }
  }

  public getLatestFrame(): TableRenderFrame {
    return this.buildCurrentFrame();
  }

  public getLatestMatchState(): MatchState {
    return this.latestMatchState;
  }

  public getMyHand(): Card[] {
    return this.myHand;
  }

  public subscribeFrame(listener: (frame: TableRenderFrame) => void): () => void {
    this.frameListeners.add(listener);
    listener(this.getLatestFrame()); // Đẩy ngay frame hiện tại khi vừa subscribe
    return () => this.frameListeners.delete(listener);
  }

  public subscribeAudioCue(listener: (cue: AudioCue) => void): () => void {
    this.audioListeners.add(listener);
    return () => this.audioListeners.delete(listener);
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.dealThrottleTimer) {
      clearTimeout(this.dealThrottleTimer);
      this.dealThrottleTimer = null;
    }
    if (this.unsubscribeTransport) {
      this.unsubscribeTransport();
      this.unsubscribeTransport = null;
    }
    this.frameListeners.clear();
    this.audioListeners.clear();
  }
}
