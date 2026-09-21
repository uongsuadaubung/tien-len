import { createPlayedMove, type Card, type MatchPlayer, type GameRules, type PlayedMove } from '../types';
import { deriveSynchronizedPlayers, syncStorePlayersFromFrame, cloneMatchPlayers, updatePlayersHand, updatePlayerInList, revealPlayersHands, resetPlayersForNewGame } from '../player-factory';
import type { IClientTransport, HostToClientPacket } from '../transport/transport.interface';
import type { TableStateSyncPacket } from '../network/network.schema';
import type { IGameSession } from './game-session.interface';
import type { TableRenderFrame, UserIntent, AudioCue } from './frame-types';
import { projectTableFrame } from './table-frame-projector';
import { sortCards, createCard } from '../card';
import { identifyCombination } from '../combinations';
import { CardTracker } from '../../ai/card-tracker';
import { getOptimalMoveHint, type MoveHint } from '../../ai/hint-engine';
import { getSortedQuickSelectCandidates } from '../quick-response-finder';
import type { HandSortMode } from '../../stores/game/types';
import { useGameStore } from '../../stores/useGameStore';
import { createPlayingTurnMatchState, isPlayingMatchState, type MatchState } from '../state-machine/types';
import { createPerspectiveSettlement } from '../settlement/perspective-settlement';
import { CAMPAIGN_CHAPTERS } from '../campaign';

export interface ClientSessionOptions {
  localPlayerId: string;
  transport: IClientTransport;
  gameRules: GameRules;
  initialPlayers: MatchPlayer[];
  activeGameType?: 'QUICK' | 'CAMPAIGN' | 'ONLINE';
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
  private lastMoveSignature: string | null = null;
  private lastPlayedMove: PlayedMove | null = null;
  private isDisposed: boolean = false;

  constructor(options: ClientSessionOptions) {
    this.localPlayerId = options.localPlayerId;
    this.transport = options.transport;
    this.activeGameType = options.activeGameType ?? 'QUICK';
    this.gameRules = options.gameRules;
    this.players = cloneMatchPlayers(options.initialPlayers);
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

  private setupTransportListeners(): void {
    this.unsubscribeTransport = this.transport.onMessage((msg: HostToClientPacket) => {
      if (this.isDisposed) return;

      if (msg.type === 'DEAL_HAND') {
        if (msg.packet.playerId === this.localPlayerId) {
          if (msg.packet.gameNumber) {
            this.gameNumber = msg.packet.gameNumber;
          }
          this.lastPlayedMove = null;
          this.myHand = sortCards(msg.packet.cards.map(c => createCard(c.rank, c.suit)));
          this.players = resetPlayersForNewGame(this.players, this.localPlayerId, this.myHand);
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

        const winners = this.players.filter(p => msg.packet.winners.includes(p.id));
        const effectiveWinners = winners.length > 0 ? winners : [this.players[0]];
        const packetPayouts = msg.packet.payouts ?? {};
        const packetEloDeltas = msg.packet.eloDeltas ?? {};

        const updatedSettlement = (this.activeGameType === 'CAMPAIGN')
          ? createPerspectiveSettlement({
              subjectPlayerId: this.localPlayerId,
              allPlayers: this.players,
              winners: effectiveWinners,
              payouts: packetPayouts,
              eloDeltas: packetEloDeltas,
              subjectEloDelta: packetEloDeltas[this.localPlayerId] ?? 0,
              subjectEloBreakdown: null,
              loanDeduction: msg.packet.loanDeduction ?? 0,
              isThreeSpadesWin: msg.packet.isThreeSpadesWin ?? false,
              instantWinType: msg.packet.instantWinType ?? null,
              activeGameType: 'CAMPAIGN',
              campaignChapter: useGameStore.getState().currentCampaignChapter || CAMPAIGN_CHAPTERS[0],
              campaignResultMeta: useGameStore.getState().campaignResultMeta,
              betAmount: this.gameRules.table.betAmount,
              subjectCoins: this.players.find(p => p.id === this.localPlayerId)?.score ?? 0
            })
          : createPerspectiveSettlement({
              subjectPlayerId: this.localPlayerId,
              allPlayers: this.players,
              winners: effectiveWinners,
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
          winners: effectiveWinners,
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
    this.latestSync = sync;
    if (sync.gameNumber) {
      this.gameNumber = sync.gameNumber;
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

    // Phát hiện nước đi mới để phát âm thanh và lưu trữ fallback
    if (sync.currentMoveCards && sync.currentMoveCards.length > 0 && sync.currentMovePlayerId) {
      const cards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
      const combo = identifyCombination(cards);
      const isSameMove = this.lastPlayedMove &&
        this.lastPlayedMove.playerId === sync.currentMovePlayerId &&
        this.lastPlayedMove.combination.cards.length === cards.length &&
        this.lastPlayedMove.combination.cards.every((c, i) => c.id === cards[i].id);

      if (combo && !isSameMove) {
        this.lastPlayedMove = createPlayedMove(sync.currentMovePlayerId, combo);
      }
      const sig = `${sync.currentMovePlayerId}:${sync.currentMoveCards.map(c => c.id).sort().join(',')}`;
      if (sig !== this.lastMoveSignature) {
        this.lastMoveSignature = sig;
        if (sync.isChop) {
          this.emitAudioCue('CHOP');
        } else {
          this.emitAudioCue('CARD_PLAY');
        }
      }
    }

    // Chuyển đổi packet thành MatchState nội bộ
    if (!sync.isGameOver) {
      const leadingMoveCards = sync.currentMoveCards ? sync.currentMoveCards.map(c => createCard(c.rank, c.suit)) : [];
      const leadingCombo = leadingMoveCards.length > 0 ? identifyCombination(leadingMoveCards) : null;
      const isSameMove = this.lastPlayedMove &&
        this.lastPlayedMove.playerId === sync.currentMovePlayerId &&
        this.lastPlayedMove.combination.cards.length === leadingMoveCards.length &&
        this.lastPlayedMove.combination.cards.every((c, i) => c.id === leadingMoveCards[i].id);

      const leadingMove = (leadingCombo && sync.currentMovePlayerId)
        ? (isSameMove ? this.lastPlayedMove : createPlayedMove(sync.currentMovePlayerId, leadingCombo))
        : null;

      const reqCard = sync.firstMoveRequiredCard 
        ? createCard(sync.firstMoveRequiredCard.rank, sync.firstMoveRequiredCard.suit)
        : null;

      if (sync.currentMovePlayerId === this.localPlayerId && leadingMoveCards.length > 0) {
        const playedCardIds = new Set(leadingMoveCards.map(c => c.id));
        this.myHand = this.myHand.filter(c => !playedCardIds.has(c.id));
        this.selectedCardIds.clear();
      }

      this.players = deriveSynchronizedPlayers(this.players, {
        myPlayerId: this.localPlayerId,
        myHand: this.myHand,
        passedPlayerIds: sync.passedPlayerIds,
        remainingCardCounts: sync.remainingCardCounts,
        currentMoveCards: leadingMoveCards,
        currentMovePlayerId: sync.currentMovePlayerId,
        isGameOver: false
      });

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

      const winners = this.players.filter(p => sync.winners?.includes(p.id));
      const fallbackPayouts: Record<string, number> = {};
      for (const p of this.players) {
        fallbackPayouts[p.id] = 0;
      }

      const settlement = (this.activeGameType === 'CAMPAIGN')
        ? createPerspectiveSettlement({
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
            activeGameType: 'CAMPAIGN',
            campaignChapter: useGameStore.getState().currentCampaignChapter || CAMPAIGN_CHAPTERS[0],
            campaignResultMeta: useGameStore.getState().campaignResultMeta,
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
      this.updateAndEmitFrame();
    }
  }

  public finishDealing(): void {
    this.isDealing = false;
    for (const p of this.players) {
      this.dealtCounts[p.id] = p.hand.length;
    }
    this.updateAndEmitFrame();
  }

  private buildCurrentFrame(): TableRenderFrame {
    return projectTableFrame({
      matchState: this.latestMatchState,
      localPlayerId: this.localPlayerId,
      localHand: this.myHand,
      selectedCardIds: this.selectedCardIds,
      gameRules: this.gameRules,
      players: this.players,
      dealtCounts: this.isDealing ? this.dealtCounts : (this.latestSync?.remainingCardCounts ?? this.dealtCounts),
      currentHint: this.currentHint,
      botThinkingThought: isPlayingMatchState(this.latestMatchState) ? this.latestMatchState.botThinkingThought : null,
      isDealing: this.isDealing,
      dealBanner: this.dealBanner
    });
  }

  private updateAndEmitFrame(): void {
    const frame = this.buildCurrentFrame();

    // Đồng bộ vào useGameStore để các component Web/Mobile hiển thị mượt mà 1:1
    const store = useGameStore.getState();
    const basePlayers = store.players.length > 0 ? store.players : this.players;
    const updatedPlayers = syncStorePlayersFromFrame(basePlayers, frame, this.latestMatchState);

    const effectiveCurrentMove = this.latestMatchState.status === 'PLAYING'
      ? this.latestMatchState.leadingMove
      : (this.latestMatchState.status === 'GAME_OVER'
        ? this.latestMatchState.winningMove ?? this.latestMatchState.leadingMove ?? this.lastPlayedMove
        : null);

    const gameOverState = this.latestMatchState.status === 'GAME_OVER' ? this.latestMatchState : null;
    const hasValidSettlementPayouts = gameOverState !== null && 
      gameOverState.settlement !== undefined && 
      Object.values(gameOverState.matchPayouts || {}).some(v => v !== 0);

    useGameStore.setState({
      matchState: this.latestMatchState,
      currentMove: effectiveCurrentMove,
      players: updatedPlayers,
      selectedCardIds: new Set(this.selectedCardIds),
      currentHint: this.currentHint,
      dealtCounts: frame.dealtCounts,
      gameNumber: this.gameNumber,
      isDealing: frame.isDealing,
      dealBanner: frame.dealBanner,
      ...(hasValidSettlementPayouts && gameOverState ? {
        perspectiveSettlement: gameOverState.settlement,
        matchPayouts: gameOverState.matchPayouts,
        allEloDeltas: gameOverState.eloDeltas
      } : {})
    });

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

        // 2. Optimistic UI Projection: Chiếu ngay nước đi ra giữa bàn và phát âm thanh (0ms)
        if (playedMove) {
          const sig = `${this.localPlayerId}:${selected.map(c => c.id).sort().join(',')}`;
          this.lastMoveSignature = sig;
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
        if (!this.tracker) {
          this.tracker = new CardTracker(this.myHand, 1.0);
        }
        const currentMove = (this.latestMatchState.status === 'PLAYING') ? this.latestMatchState.leadingMove : null;
        const isLead = (this.latestMatchState.status === 'PLAYING') ? this.latestMatchState.isLeadMove : false;
        const isFirst = (this.latestMatchState.status === 'PLAYING') ? this.latestMatchState.isFirstMoveOfGame : false;

        const hint = getOptimalMoveHint(
          [...this.myHand],
          currentMove,
          isFirst,
          isLead,
          this.tracker,
          this.latestSync?.remainingCardCounts ?? {},
          '',
          false,
          this.gameRules.gameFlow.prohibitEndingWithTwo,
          'COUNT_CARDS',
          this.gameRules,
          true,
          this.localPlayerId
        );

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
    if (this.unsubscribeTransport) {
      this.unsubscribeTransport();
      this.unsubscribeTransport = null;
    }
    this.frameListeners.clear();
    this.audioListeners.clear();
  }
}
