import { 
  Card, 
  MatchPlayer, 
  PlayedMove, 
  Round, 
  GameSettings, 
  InstantWinType, 
  Combination,
  GameRules,
  convertSettingsToGameRules,
  isGameRules
} from './types';
import { checkInstantWin, createDeck, dealCards, shuffleDeck, createMulberry32 } from './deck';
import { identifyCombination } from './combinations';
import { isValidMove } from './validator';
import { OpponentProfiler } from '../ai/opponent-profiler';
import { 
  calculateChopPenalty, 
  calculateRottenPenalty,
  calculateCountCardsSettlement, 
  calculateWinnerTakesAllSettlement, 
  calculateTraditionalSettlement 
} from './economy';
import { MatchLogger, BotDecisionTelemetry } from './match-logger';
import {
  evaluateChopTransition,
  type MatchState,
  type MatchEngineAction,
  reduceMatchState,
  transitionToWaiting
} from './state-machine';
import { createPerspectiveSettlement } from './settlement/perspective-settlement';

export type PlayMoveResult =
  | {
      readonly success: true;
      readonly playedMove: PlayedMove;
      readonly isChop: boolean;
      readonly choppedPlayerId: string | null;
      readonly penaltyAmount: number;
      readonly isCascadeChop: boolean;
      readonly chopChainCount: number;
      readonly chopChainTotalAmount: number;
      readonly isGameOver: boolean;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export type PassTurnResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

export type StartGameResult =
  | {
      readonly instantWin: true;
      readonly instantWinner: MatchPlayer;
      readonly instantWinType: InstantWinType;
    }
  | {
      readonly instantWin: false;
      readonly instantWinner: null;
      readonly instantWinType: null;
    };

export class GameEngine {
  private _state: MatchState;
  public players: MatchPlayer[];
  public rules: GameRules;
  public gameNumber: number = 1;
  public isFirstMoveOfGame: boolean = true;
  public firstMoveRequiredCard: Card | null = null;
  public isGameOver: boolean = false;
  public currentRound!: Round;
  public winners: MatchPlayer[] = [];
  public playedCardsInGame: Card[] = [];
  public instantWinner: MatchPlayer | null = null;
  public instantWinType: InstantWinType | null = null;
  public roundNumber: number = 1;
  public lastWinnerId: string | null = null;

  public get state(): MatchState {
    return this._state;
  }

  public dispatch(action: MatchEngineAction): void {
    this._state = reduceMatchState(this._state, action);
    this.syncFacadeFromState();
  }

  public syncFacadeFromState(): void {
    this.gameNumber = this._state.gameNumber;
    if (this._state.status === 'PLAYING') {
      this.roundNumber = this._state.roundNumber;
      this.isFirstMoveOfGame = this._state.isFirstMoveOfGame;
      this.firstMoveRequiredCard = this._state.firstMoveRequiredCard;
      this.currentRound = {
        moves: [...this._state.roundMoves],
        leadPlayerId: this._state.leadPlayerId,
        currentTurnPlayerId: this._state.currentTurnPlayerId,
        passedPlayerIds: [...this._state.passedPlayerIds],
        isFinished: false
      };
      this.isGameOver = false;
    } else if (this._state.status === 'ROUND_ENDED') {
      this.roundNumber = this._state.roundNumber;
      this.currentRound = {
        moves: [...this._state.lastRoundMoves],
        leadPlayerId: this._state.nextLeadPlayerId,
        currentTurnPlayerId: this._state.nextLeadPlayerId,
        passedPlayerIds: [],
        isFinished: true
      };
    } else if (this._state.status === 'INSTANT_WIN') {
      this.isGameOver = true;
      this.instantWinner = this._state.instantWinner;
      this.instantWinType = this._state.instantWinType;
      this.winners = [this._state.instantWinner];
    } else if (this._state.status === 'GAME_OVER') {
      this.isGameOver = true;
      this.winners = [...this._state.winners];
      this.isThreeSpadesWin = this._state.isThreeSpadesWin;
    }
  }

  public syncStateFromFacade(): void {
    if (this._state.status === 'PLAYING') {
      this._state = reduceMatchState(this._state, {
        type: 'UPDATE_TURN',
        gameNumber: this.gameNumber,
        players: this.players,
        currentTurnPlayerId: this.currentRound.currentTurnPlayerId,
        leadPlayerId: this.currentRound.leadPlayerId,
        leadingMove: this.getLeadingMove(),
        isLeadMove: this.isRoundLeadMove(),
        isFirstMoveOfGame: this.isFirstMoveOfGame,
        firstMoveRequiredCard: this.firstMoveRequiredCard,
        roundMoves: this.currentRound.moves,
        passedPlayerIds: this.currentRound.passedPlayerIds
      });
    }
  }

  constructor(players: MatchPlayer[], rulesOrSettings?: GameRules | Partial<GameSettings>) {
    this.players = players;
    for (const p of this.players) {
      if (p.cardCount === undefined) {
        p.cardCount = p.hand.length;
      }
    }
    
    // Khởi tạo GameRules hợp thành
    if (isGameRules(rulesOrSettings)) {
      this.rules = rulesOrSettings;
    } else {
      this.rules = convertSettingsToGameRules(rulesOrSettings);
    }

    if (players.length === 0) {
      throw new Error('[GameEngine] Danh sách players không được rỗng!');
    }

    this._state = transitionToWaiting({
      gameNumber: 1,
      players: this.players,
      rules: this.rules,
      lastWinnerId: null
    });

    const firstPlayerId = players[0].id;
    this.currentRound = {
      moves: [],
      leadPlayerId: firstPlayerId,
      currentTurnPlayerId: firstPlayerId,
      passedPlayerIds: [],
      isFinished: false
    };
  }

  public getPlayer(id: string): MatchPlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  public isRoundLeadMove(): boolean {
    return this.currentRound.moves.length === 0;
  }

  public getLeadingMove(): PlayedMove | null {
    if (this.currentRound.moves.length === 0) return null;
    return this.currentRound.moves[this.currentRound.moves.length - 1];
  }

  public isThreeSpadesWin: boolean = false;

  /**
   * Khởi tạo ván bài mới
   * @param gameNumber Số thứ tự ván (1: ván đầu, >1: ván tiếp theo)
   * @param previousWinnerId ID người về Nhất ván trước (được quyền đi trước ở ván > 1)
   */
  public startNewGame(
    gameNumber = 1,
    previousWinnerId: string | null = null,
    seedOrRng: number | (() => number) | null = null
  ): StartGameResult {
    this.gameNumber = gameNumber;
    this.isFirstMoveOfGame = this.gameNumber === 1;
    this.isGameOver = false;
    this.isThreeSpadesWin = false;
    this.playedCardsInGame = [];
    this.instantWinner = null;
    this.roundNumber = 1;

    // 1. Xáo bài & chia bài (hỗ trợ PRNG có seed cho testing có thể tái lập 100%)
    const rng = typeof seedOrRng === 'number'
      ? createMulberry32(seedOrRng)
      : (seedOrRng || Math.random);
    const deck = shuffleDeck(createDeck(), rng);
    const hands = dealCards(deck, this.players.length);

    this.players.forEach((player, index) => {
      player.hand = hands[index];
      player.cardCount = player.hand.length;
      player.playedCards = [];
      player.isPassedCurrentRound = false;
      player.hasPlayedFirstCard = false;
    });

    // 2. Kiểm tra Tới Trắng
    if (this.rules.instantWin.enabled) {
      for (const player of this.players) {
        const instantType = checkInstantWin(player.hand, this.gameNumber === 1);
        if (instantType) {
          this.instantWinner = player;
          this.instantWinType = instantType;
          this.winners = [player];
          this.lastWinnerId = player.id;
          this.isGameOver = true;
          this.isFirstMoveOfGame = false;
          const { payouts, eloDeltas } = this.calculateInstantWinSettlement(player);
          this._state = reduceMatchState(this._state, {
            type: 'TRIGGER_INSTANT_WIN',
            instantWinner: player,
            instantWinType: instantType,
            matchPayouts: payouts,
            eloDeltas
          });
          this.syncFacadeFromState();
          return { instantWin: true, instantWinner: player, instantWinType: instantType };
        }
      }
    }

    // Reset danh sách người thắng cho ván mới
    this.winners = [];
    if (previousWinnerId) {
      this.lastWinnerId = previousWinnerId;
    }

    // 3. Tìm người đi đầu tiên:
    const { firstPlayerId, isFirstMoveOfGame, firstMoveRequiredCard } = this.determineFirstPlayer(previousWinnerId);
    this.isFirstMoveOfGame = isFirstMoveOfGame;
    this.firstMoveRequiredCard = firstMoveRequiredCard;

    // 4. Khởi tạo vòng chơi đầu tiên
    this.currentRound = {
      moves: [],
      leadPlayerId: firstPlayerId,
      currentTurnPlayerId: firstPlayerId,
      passedPlayerIds: [],
      isFinished: false
    };

    this._state = reduceMatchState(this._state, {
      type: 'START_PLAYING',
      gameNumber: this.gameNumber,
      roundNumber: 1,
      players: this.players,
      currentTurnPlayerId: firstPlayerId,
      leadPlayerId: firstPlayerId,
      leadingMove: null,
      isLeadMove: true,
      isFirstMoveOfGame: this.isFirstMoveOfGame,
      firstMoveRequiredCard: this.firstMoveRequiredCard,
      roundMoves: [],
      passedPlayerIds: []
    });
    this.syncFacadeFromState();

    MatchLogger.getInstance().startNewMatch({
      gameNumber: this.gameNumber,
      gameMode: this.rules.settlementRule,
      rules: this.rules,
      players: this.players
    });

    return { instantWin: false, instantWinner: null, instantWinType: null };
  }

  /**
   * Xác định người chơi đi đầu tiên:
   * - Ván > 1: Người về Nhất ván trước
   * - Ván 1: Người có lá bài nhỏ nhất bàn (3 Bích nếu có, hoặc lá bài nhỏ nhất thực tế đã chia) và bắt buộc đi lá đó.
   */
  private determineFirstPlayer(previousWinnerId: string | null = null): {
    firstPlayerId: string;
    isFirstMoveOfGame: boolean;
    firstMoveRequiredCard: Card | null;
  } {
    const firstPlayerId = this.players[0].id;
    const resolvedPrevWinnerId = previousWinnerId ?? this.lastWinnerId;

    if (this.gameNumber > 1 && resolvedPrevWinnerId && this.players.some(p => p.id === resolvedPrevWinnerId)) {
      // Ván thứ 2 trở đi: Người về Nhất ván trước được quyền đi trước bất kể đang cầm bài gì!
      this.lastWinnerId = resolvedPrevWinnerId;
      return { firstPlayerId: resolvedPrevWinnerId, isFirstMoveOfGame: false, firstMoveRequiredCard: null };
    }

    const require3Spades = this.rules?.gameFlow?.firstGameRequireThreeOfSpades ?? true;
    if (!require3Spades) {
      return { firstPlayerId: this.players[0].id, isFirstMoveOfGame: false, firstMoveRequiredCard: null };
    }

    // Ván đầu tiên: Tìm người có lá bài nhỏ nhất trong tất cả các lá bài được chia
    // 3 Bích có weight = 12 (nhỏ nhất tuyệt đối trong bộ 52 lá).
    // Nếu ai có 3 Bích thì smallestCard chắc chắn là 3 Bích.
    // Nếu không ai có 3 Bích (bàn 2-3 người hoặc bài tùy chỉnh), smallestCard là lá bài nhỏ nhất thực tế đã chia.
    let smallestCard: Card | null = null;
    let openingPlayerId = this.players[0].id;

    for (const player of this.players) {
      for (const card of player.hand) {
        if (!smallestCard || card.weight < smallestCard.weight) {
          smallestCard = card;
          openingPlayerId = player.id;
        }
      }
    }

    if (smallestCard) {
      return {
        firstPlayerId: openingPlayerId,
        isFirstMoveOfGame: true,
        firstMoveRequiredCard: smallestCard
      };
    }

    return { firstPlayerId, isFirstMoveOfGame: false, firstMoveRequiredCard: null };
  }

  /**
   * Khởi tạo custom game để phục vụ Unit Test
   */
  public startCustomGame(gameNumber = 1, previousWinnerId: string | null = null): void {
    this.gameNumber = gameNumber;
    this.isGameOver = false;
    this.playedCardsInGame = [];
    this.instantWinner = null;
    this.instantWinType = null;
    this.roundNumber = 1;

    this.players.forEach(p => {
      p.playedCards = [];
      p.isPassedCurrentRound = false;
      p.hasPlayedFirstCard = false;
    });

    const { firstPlayerId, isFirstMoveOfGame, firstMoveRequiredCard } = this.determineFirstPlayer(previousWinnerId);
    this.isFirstMoveOfGame = isFirstMoveOfGame;
    this.firstMoveRequiredCard = firstMoveRequiredCard;

    this.winners = [];

    this.currentRound = {
      moves: [],
      leadPlayerId: firstPlayerId,
      currentTurnPlayerId: firstPlayerId,
      passedPlayerIds: [],
      isFinished: false
    };

    this._state = reduceMatchState(this._state, {
      type: 'START_PLAYING',
      gameNumber: this.gameNumber,
      roundNumber: 1,
      players: this.players,
      currentTurnPlayerId: firstPlayerId,
      leadPlayerId: firstPlayerId,
      leadingMove: null,
      isLeadMove: true,
      isFirstMoveOfGame: this.isFirstMoveOfGame,
      firstMoveRequiredCard: this.firstMoveRequiredCard,
      roundMoves: [],
      passedPlayerIds: []
    });
    this.syncFacadeFromState();

    MatchLogger.getInstance().startNewMatch({
      gameNumber: this.gameNumber,
      gameMode: this.rules.settlementRule,
      rules: this.rules,
      players: this.players
    });
  }

  /**
   * Thực hiện nước đi của một người chơi
   */
  public playMove(
    playerId: string,
    cards: Card[],
    botTelemetry: BotDecisionTelemetry | null = null
  ): PlayMoveResult {
    this.syncStateFromFacade();
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Không tìm thấy người chơi' };

    // Kiểm tra lá bài có nằm trong tay người chơi không
    const handCardIds = new Set(player.hand.map(c => c.id));
    const allCardsOwned = cards.every(c => handCardIds.has(c.id));
    if (!allCardsOwned) {
      return { success: false, error: 'Các lá bài không nằm trên tay người chơi' };
    }

    // Kiểm tra lượt đánh
    const isCurrentTurn = this.currentRound.currentTurnPlayerId === playerId;
    const isSpecialFourPairsJump =
      this.rules.chopping.allowFourPairsCutAnytime &&
      cards.length === 8 &&
      identifyCombination(cards)?.type === 'FOUR_PAIRS_SEQUENTIAL';

    if (!isCurrentTurn && !isSpecialFourPairsJump) {
      return { success: false, error: 'Chưa đến lượt của bạn' };
    }

    const leadingMove = this.getLeadingMove();
    const targetCombination = leadingMove ? leadingMove.combination : null;
    const isLeadMove = this.isRoundLeadMove();
    const isFinishingMove = player.hand.length === cards.length;
    const prohibitEndingWithTwo = this.rules.gameFlow.prohibitEndingWithTwo;

    // Thẩm định nước đi với validator
    const validation = isValidMove(
      this.isFirstMoveOfGame && this.firstMoveRequiredCard
        ? {
            cards,
            target: targetCombination,
            isFirstMoveOfGame: true,
            firstMoveRequiredCard: this.firstMoveRequiredCard,
            isLeadMove,
            hasPassedRound: player.isPassedCurrentRound,
            allowFourPairsCutAnytime: this.rules.chopping.allowFourPairsCutAnytime,
            isFinishingMove,
            prohibitEndingWithTwo
          }
        : {
            cards,
            target: targetCombination,
            isFirstMoveOfGame: false,
            isLeadMove,
            hasPassedRound: player.isPassedCurrentRound,
            allowFourPairsCutAnytime: this.rules.chopping.allowFourPairsCutAnytime,
            isFinishingMove,
            prohibitEndingWithTwo
          }
    );

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // 1. Trừ bài trên tay và thêm vào danh sách đã đánh
    const handBeforeTurn = [...player.hand];
    const playedIds = new Set(cards.map(c => c.id));
    const handSizeBeforeMove = player.hand.length;
    player.hand = player.hand.filter(c => !playedIds.has(c.id));
    player.cardCount = player.hand.length;
    player.playedCards = [...player.playedCards, ...cards];
    player.hasPlayedFirstCard = true;
    this.playedCardsInGame = [...this.playedCardsInGame, ...cards];
    const handAfterTurn = [...player.hand];

    const nextPlayerId = this.getNextActivePlayerId(playerId);
    const nextPlayer = this.getPlayer(nextPlayerId);
    const isNextOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;
    OpponentProfiler.getInstance().recordCardPlay(
      playerId,
      cards,
      validation.combination,
      handSizeBeforeMove,
      isLeadMove,
      isNextOneCard
    );

    // Ván 1: Đã đánh ra lá mở màn (3 Bích hoặc lá nhỏ nhất bàn) ở lượt đầu
    this.isFirstMoveOfGame = false;
    this.firstMoveRequiredCard = null;

    // 2. Xử lý Chặt Heo & Chặt Hàng (Quản lý qua ChopChainStateMachine)
    let isChop = false;
    let isCascadeChop = false;
    let chopChainCount = 0;
    let chopChainTotalAmount = 0;
    let choppedPlayerId: string | null = null;
    let penaltyAmount = 0;

    if (validation.isChop && leadingMove) {
      const basePenalty = this.calculateChopPenalty(leadingMove.combination, validation.combination);
      const isCascadeRuleActive = this.rules.chopping.cascadeMultiplier;

      const transition = evaluateChopTransition({
        isChopMove: true,
        chopperId: playerId,
        leadingMove,
        basePenalty,
        isCascadeRuleActive,
        currentRoundChopMoves: this.currentRound.moves
      });

      isChop = transition.isChop;
      isCascadeChop = transition.isCascadeChop;
      chopChainCount = transition.chopChainCount;
      chopChainTotalAmount = transition.chopChainTotalAmount;
      choppedPlayerId = transition.choppedPlayerId;
      penaltyAmount = transition.penaltyAmount;

      // Hoàn trả lại tiền phạt cho người bị chặt ở bước trước (giải thoát)
      if (transition.refund) {
        const previousVictim = this.getPlayer(transition.refund.toPlayerId);
        const previousChopper = this.getPlayer(transition.refund.fromPlayerId);
        if (previousVictim && previousChopper) {
          previousVictim.score += transition.refund.amount;
          previousChopper.score -= transition.refund.amount;
        }
      }

      // Người bị chặt hiện tại đền tiền cho người chặt mới
      if (choppedPlayerId) {
        const choppedPlayer = this.getPlayer(choppedPlayerId);
        if (choppedPlayer) {
          choppedPlayer.score -= penaltyAmount;
          player.score += penaltyAmount;
        }
      }
    }

    // 3. Ghi nhận nước đi vào Round
    let playedMoveRecord: PlayedMove;
    if (isChop) {
      if (!choppedPlayerId) {
        throw new Error('[GameEngine] Invariant violation: isChop is true but choppedPlayerId is missing');
      }
      playedMoveRecord = {
        playerId,
        combination: validation.combination,
        timestamp: Date.now(),
        isChop: true,
        choppedPlayerId,
        penaltyAmount,
        isCascadeChop,
        chopChainCount,
        chopChainTotalAmount
      };
    } else {
      playedMoveRecord = {
        playerId,
        combination: validation.combination,
        timestamp: Date.now(),
        isChop: false
      };
    }

    this.currentRound.moves = [...this.currentRound.moves, playedMoveRecord];

    MatchLogger.getInstance().recordTurn({
      roundNumber: this.roundNumber,
      playerId,
      playerName: player.name,
      isBot: player.isBot,
      botPersonaId: player.botPersonaId || null,
      action: 'PLAY',
      cardsPlayed: cards,
      combination: validation.combination,
      handBeforeTurn,
      handAfterTurn,
      leadingMoveBeforeTurn: leadingMove || null,
      isLeadMove,
      isChop,
      choppedPlayerId: choppedPlayerId || null,
      penaltyAmount: penaltyAmount || null,
      botDecision: botTelemetry
    });

    // Nếu người chơi dùng 4 đôi thông nhảy cóc ngoài lượt, phục hồi quyền tham gia
    if (player.isPassedCurrentRound) {
      player.isPassedCurrentRound = false;
      this.currentRound.passedPlayerIds = this.currentRound.passedPlayerIds.filter(id => id !== playerId);
    }

    // 4. Kiểm tra người chơi đã Hết Bài (Về Nhất/Nhì/Ba)
    if (player.hand.length === 0) {
      this.winners = [...this.winners, player];
      if (this.winners.length === 1) {
        this.lastWinnerId = player.id;
      }

      // Kiểm tra Về 3 Bích Cuối Cùng (Ăn Ba Bích):
      // Chỉ kích hoạt khi người về Nhất đánh lá ĐƠN 3 Bích và không phải ván 1 bắt buộc 3 Bích đi đầu
      const isThreeSpadesEndingEnabled = this.rules.gameFlow.threeSpadesEndingBonus;
      if (
        this.winners.length === 1 &&
        isThreeSpadesEndingEnabled &&
        this.gameNumber > 1 &&
        cards.length === 1 &&
        cards[0].rank === 3 &&
        cards[0].suit === 'SPADES'
      ) {
        this.isThreeSpadesWin = true;
      }

      if (this.checkGameOver()) {
        // Nếu đánh đến người áp chót (Truyền thống), tự động bổ sung người chơi cuối cùng (về Bét)
        if (this.winners.length === this.players.length - 1) {
          const lastPlayer = this.players.find(p => !this.winners.some(w => w.id === p.id));
          if (lastPlayer) {
            this.winners = [...this.winners, lastPlayer];
          }
        }
        this.isGameOver = true;
        this.settleEndGame();
        return {
          success: true,
          isChop,
          choppedPlayerId: choppedPlayerId || null,
          penaltyAmount,
          isCascadeChop,
          chopChainCount,
          chopChainTotalAmount,
          playedMove: playedMoveRecord,
          isGameOver: true
        };
      }
    }

    // 5. Chuyển lượt người tiếp theo
    this.advanceTurn(playerId);

    return {
      success: true,
      isChop,
      choppedPlayerId: choppedPlayerId || null,
      penaltyAmount,
      isCascadeChop,
      chopChainCount,
      chopChainTotalAmount,
      playedMove: playedMoveRecord,
      isGameOver: this.isGameOver
    };
  }

  /**
   * Bỏ lượt (Pass)
   */
  public passTurn(
    playerId: string,
    botTelemetry: BotDecisionTelemetry | null = null
  ): PassTurnResult {
    this.syncStateFromFacade();
    if (this.currentRound.currentTurnPlayerId !== playerId) {
      return { success: false, error: 'Chưa đến lượt của bạn' };
    }

    if (this.isFirstMoveOfGame) {
      return { success: false, error: 'Lượt mở màn ván đầu tiên bắt buộc phải ra bài' };
    }

    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Không tìm thấy người chơi' };

    const handBeforeTurn = [...player.hand];

    player.isPassedCurrentRound = true;
    if (!this.currentRound.passedPlayerIds.includes(playerId)) {
      this.currentRound.passedPlayerIds = [...this.currentRound.passedPlayerIds, playerId];
    }

    const leadingMove = this.getLeadingMove();
    if (leadingMove) {
      const nextPlayerId = this.getNextActivePlayerId(playerId);
      const nextPlayer = this.getPlayer(nextPlayerId);
      const isNextOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;
      OpponentProfiler.getInstance().recordPass(
        playerId,
        leadingMove.combination,
        player.hand.length,
        isNextOneCard
      );
    }

    MatchLogger.getInstance().recordTurn({
      roundNumber: this.roundNumber,
      playerId,
      playerName: player.name,
      isBot: player.isBot,
      botPersonaId: player.botPersonaId || null,
      action: 'PASS',
      cardsPlayed: null,
      combination: null,
      handBeforeTurn,
      handAfterTurn: handBeforeTurn,
      leadingMoveBeforeTurn: leadingMove || null,
      isLeadMove: this.isRoundLeadMove(),
      isChop: false,
      choppedPlayerId: null,
      penaltyAmount: null,
      botDecision: botTelemetry
    });

    this.advanceTurn(playerId);
    return { success: true };
  }

  public getCurrentPlayer(): MatchPlayer {
    let player = this.getPlayer(this.currentRound?.currentTurnPlayerId);
    if (player && player.hand.length === 0 && !this.isGameOver) {
      const nextId = this.getNextEligiblePlayerId(player.id);
      this.currentRound.currentTurnPlayerId = nextId;
      player = this.getPlayer(nextId);
    }
    if (!player) {
      throw new Error(`[GameEngine] Không tìm thấy người chơi cho lượt hiện tại: ${this.currentRound?.currentTurnPlayerId}`);
    }
    return player;
  }

  public checkGameOver(): boolean {
    if (this.rules.settlementRule === 'COUNT_CARDS' || this.rules.settlementRule === 'WINNER_TAKES_ALL') {
      return this.winners.length >= 1;
    }
    return this.winners.length >= this.players.length - 1;
  }

  /**
   * Chuyển lượt kế tiếp hoặc mở vòng mới nếu tất cả người khác đã bỏ lượt
   */
  private advanceTurn(currentPlayerId: string): void {
    const activeRemainingPlayers = this.players.filter(p => p.hand.length > 0);

    // Nếu chỉ còn duy nhất 1 người còn bài (hoặc 0 người) -> Kết thúc toàn bộ ván đấu
    if (activeRemainingPlayers.length <= 1) {
      if (this.winners.length < this.players.length) {
        const lastPlayer = this.players.find(p => p.hand.length > 0);
        if (lastPlayer && !this.winners.some(w => w.id === lastPlayer.id)) {
          this.winners = [...this.winners, lastPlayer];
        }
      }
      this.isGameOver = true;
      this.settleEndGame();
      return;
    }

    // Xác định người đang giữ nước đi cao nhất trên bàn (lastMover)
    const lastMover = this.getLeadingMove();
    const lastMoverPlayer = lastMover ? this.getPlayer(lastMover.playerId) : null;
    const isLastMoverActive = !!(lastMoverPlayer && lastMoverPlayer.hand.length > 0);

    // Tìm những người chưa bỏ lượt trong các người còn bài
    const eligiblePlayers = activeRemainingPlayers.filter(p => !p.isPassedCurrentRound);

    // Vòng kết thúc khi:
    // - Nếu có lastMover và lastMover còn bài: tất cả những người khác đã bỏ lượt (eligiblePlayers.length <= 1).
    // - Nếu có lastMover nhưng lastMover đã hết bài (đã về Nhất/Nhì): tất cả người còn bài đều đã bỏ lượt (eligiblePlayers.length === 0).
    // - Nếu chưa có ai ra bài trong vòng (lastMover là null) mà tất cả người chơi còn bài đều đã bỏ lượt: không ai có thể/chịu ra bài -> kết thúc ván đấu
    const isRoundOver = lastMover
      ? (isLastMoverActive ? eligiblePlayers.length <= 1 : eligiblePlayers.length === 0)
      : eligiblePlayers.length === 0;

    if (isRoundOver) {
      if (!lastMover) {
        // Toàn bộ người chơi còn bài đều bỏ lượt khi cầm cái (ví dụ: tất cả đều chỉ còn Heo và cấm về Heo)
        // Kết thúc ván đấu ngay để tránh lặp vô hạn, xử phạt Thối Heo/Hàng
        if (this.winners.length === 0) {
          // Bế tắc: Toàn bộ người chơi đều bỏ lượt khi chưa có ai về Nhất
          // Phân định người có ít lá bài nhất trên tay dẫn đầu để kết toán an toàn
          const sorted = [...this.players].sort((a, b) => a.hand.length - b.hand.length);
          this.winners = [sorted[0]];
        }
        this.isGameOver = true;
        this.settleEndGame();
        return;
      }

      let nextLeadPlayerId = lastMover.playerId;

      // Nếu người vừa đánh nước cuối đã hết bài, chuyển quyền mở vòng cho người kế tiếp theo chiều kim đồng hồ
      const leadPlayer = this.getPlayer(nextLeadPlayerId);
      if (!leadPlayer || leadPlayer.hand.length === 0) {
        nextLeadPlayerId = this.getNextActivePlayerId(nextLeadPlayerId);
      }

      this._state = reduceMatchState(this._state, {
        type: 'FINISH_ROUND',
        roundWinnerId: lastMover.playerId,
        nextLeadPlayerId
      });

      this.startNewRound(nextLeadPlayerId);
      return;
    }

    // Vòng vẫn tiếp diễn: Chuyển lượt cho người tiếp theo (chưa bỏ lượt và còn bài)
    const nextPlayerId = this.getNextEligiblePlayerId(currentPlayerId);
    this.currentRound.currentTurnPlayerId = nextPlayerId;
    if (!lastMover) {
      // Nếu chưa có ai ra bài trong vòng, quyền mở vòng chuyển sang cho người kế tiếp
      this.currentRound.leadPlayerId = nextPlayerId;
    }

    this._state = reduceMatchState(this._state, {
      type: 'UPDATE_TURN',
      gameNumber: this.gameNumber,
      players: this.players,
      currentTurnPlayerId: nextPlayerId,
      leadPlayerId: this.currentRound.leadPlayerId,
      leadingMove: this.getLeadingMove(),
      isLeadMove: this.isRoundLeadMove(),
      isFirstMoveOfGame: this.isFirstMoveOfGame,
      firstMoveRequiredCard: this.firstMoveRequiredCard,
      roundMoves: this.currentRound.moves,
      passedPlayerIds: this.currentRound.passedPlayerIds
    });
    this.syncFacadeFromState();
  }

  /**
   * Mở vòng chơi mới
   */
  private startNewRound(leadPlayerId: string): void {
    this.roundNumber++;
    this.players.forEach(p => {
      p.isPassedCurrentRound = false;
    });

    // Đảm bảo người cầm cái vòng mới phải là người còn bài
    let validLeadId = leadPlayerId;
    const leadP = this.getPlayer(validLeadId);
    if (!leadP || leadP.hand.length === 0) {
      validLeadId = this.getNextActivePlayerId(validLeadId);
    }

    this.currentRound = {
      moves: [],
      leadPlayerId: validLeadId,
      currentTurnPlayerId: validLeadId,
      passedPlayerIds: [],
      isFinished: false
    };

    this._state = reduceMatchState(this._state, {
      type: 'START_PLAYING',
      gameNumber: this.gameNumber,
      roundNumber: this.roundNumber,
      players: this.players,
      currentTurnPlayerId: validLeadId,
      leadPlayerId: validLeadId,
      leadingMove: null,
      isLeadMove: true,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null,
      roundMoves: [],
      passedPlayerIds: []
    });
    this.syncFacadeFromState();
  }

  public getNextEligiblePlayerId(fromPlayerId: string): string {
    const numPlayers = this.players.length;
    const currentIndex = this.players.findIndex(p => p.id === fromPlayerId);
    for (let offset = 1; offset <= numPlayers; offset++) {
      const nextIndex = (currentIndex + offset) % numPlayers;
      const player = this.players[nextIndex];
      if (player && player.hand.length > 0 && !player.isPassedCurrentRound) {
        return player.id;
      }
    }
    return this.getNextActivePlayerId(fromPlayerId);
  }

  public getNextActivePlayerId(fromPlayerId: string): string {
    const numPlayers = this.players.length;
    const currentIndex = this.players.findIndex(p => p.id === fromPlayerId);
    for (let offset = 1; offset <= numPlayers; offset++) {
      const nextIndex = (currentIndex + offset) % numPlayers;
      const player = this.players[nextIndex];
      if (player && player.hand.length > 0) {
        return player.id;
      }
    }
    return fromPlayerId;
  }

  /**
   * Tính số tiền phạt cho cú chặt heo/hàng (Áp dụng hệ số chặt từ chopping.multiplier)
   */
  private calculateChopPenalty(target: Combination, candidate: Combination): number {
    return calculateChopPenalty(
      target, 
      candidate, 
      this.rules.table.betAmount, 
      this.rules.chopping.multiplier
    ).amount;
  }

  /**
   * Kiểm tra xem 1 người chơi có bị Cóng (Cháy bài) không
   */
  public isPlayerCong(playerId: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;
    return !player.hasPlayedFirstCard && this.winners.length > 0 && this.winners[0].id !== playerId;
  }

  /**
   * Tính tiền phạt Thối Heo/Hàng của một người chơi khi ván kết thúc
   */
  public calculateRottenCardsPenalty(hand: Card[]): number {
    return calculateRottenPenalty(
      hand, 
      this.rules.table.betAmount, 
      this.rules.chopping.multiplier
    );
  }

  /**
   * Kết toán bàn chơi theo đúng luật settlementRule đã cấu hình (Pure delegation sang economy.ts)
   */
  public settleEndGame(): Readonly<Record<string, number>> {
    if (this.winners[0]) {
      this.lastWinnerId = this.winners[0].id;
    }

    const winnerId = this.winners[0]?.id;
    let payouts: Readonly<Record<string, number>> = {};

    if (winnerId) {
      const bet = this.rules.table.betAmount;
      const penaltyMultiplier = this.rules.chopping.multiplier;
      const congMultiplier = this.rules.cong.multiplier;

      if (this.rules.settlementRule === 'COUNT_CARDS') {
        payouts = calculateCountCardsSettlement(
          this.players,
          winnerId,
          bet,
          penaltyMultiplier,
          this.isThreeSpadesWin,
          congMultiplier
        );
      } else if (this.rules.settlementRule === 'WINNER_TAKES_ALL') {
        payouts = calculateWinnerTakesAllSettlement(
          this.players,
          winnerId,
          bet,
          penaltyMultiplier,
          this.isThreeSpadesWin,
          congMultiplier
        );
      } else {
        payouts = calculateTraditionalSettlement(
          this.players,
          this.winners,
          bet,
          penaltyMultiplier,
          this.isThreeSpadesWin
        );
      }

      // Áp dụng payout lên p.score để đồng bộ kết quả ván đấu
      for (const p of this.players) {
        if (payouts[p.id] !== undefined) {
          p.score += payouts[p.id];
        }
      }
    } else {
      const defaultPayouts: Record<string, number> = {};
      for (const p of this.players) {
        defaultPayouts[p.id] = 0;
      }
      payouts = defaultPayouts;
    }

    for (const p of this.players) {
      OpponentProfiler.getInstance().finalizeMatchForPlayer(p.id, p.hand);
    }

    const subjectId = winnerId ?? this.players[0].id;
    const subject = this.getPlayer(subjectId) ?? this.players[0];

    const perspectiveSettlement = createPerspectiveSettlement({
      subjectPlayerId: subject.id,
      allPlayers: this.players,
      winners: this.winners,
      payouts,
      eloDeltas: {},
      subjectEloDelta: 0,
      subjectEloBreakdown: null,
      loanDeduction: 0,
      isThreeSpadesWin: this.isThreeSpadesWin,
      instantWinType: this.instantWinType,
      activeGameType: 'QUICK',
      betAmount: this.rules.table.betAmount,
      subjectCoins: subject.score
    });

    this._state = reduceMatchState(this._state, {
      type: 'END_GAME',
      gameNumber: this.gameNumber,
      winners: this.winners,
      winningMove: this.getLeadingMove(),
      settlement: perspectiveSettlement,
      isThreeSpadesWin: this.isThreeSpadesWin,
      matchPayouts: payouts,
      eloDeltas: {}
    });
    this.syncFacadeFromState();

    return payouts;
  }

  /**
   * Tính toán kết quả Tới Trắng
   */
  private calculateInstantWinSettlement(winner: MatchPlayer): {
    payouts: Record<string, number>;
    eloDeltas: Record<string, number>;
  } {
    const bet = this.rules.table.betAmount;
    const mult = this.rules.instantWin.payoutMultiplier || 26;
    // Thắng tới trắng: Mỗi nhà đền mult mức cược
    const rewardPerPlayer = mult * bet;
    let totalWin = 0;
    const payouts: Record<string, number> = {};

    for (const player of this.players) {
      if (player.id !== winner.id) {
        player.score -= rewardPerPlayer;
        payouts[player.id] = -rewardPerPlayer;
        totalWin += rewardPerPlayer;
      }
    }

    winner.score += totalWin;
    payouts[winner.id] = totalWin;

    return { payouts, eloDeltas: {} };
  }
}
