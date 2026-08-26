import { 
  Card, 
  Player, 
  PlayedMove, 
  Round, 
  GameSettings, 
  InstantWinType, 
  Combination,
  GameRules,
  GameMode,
  createDefaultGameRules,
  convertSettingsToGameRules,
  isGameRules
} from './types';
import { isRedCard, isTwo, sortCards } from './card';
import { checkInstantWin, createDeck, dealCards, shuffleDeck, createMulberry32 } from './deck';
import { identifyCombination } from './combinations';
import { isValidMove } from './validator';
import { makeBotDecision } from '../ai/decision-maker';
import { BotConfig } from '../ai/types';
import { CardTracker } from '../ai/card-tracker';
import { OpponentProfiler } from '../ai/opponent-profiler';
import { calculateChopPenalty, calculateRottenPenalty } from './economy';
import { MatchLogger, BotDecisionTelemetry } from './match-logger';

export interface PlayMoveResult {
  success: boolean;
  isChop?: boolean;
  choppedPlayerId?: string;
  penaltyAmount?: number;
  isCascadeChop?: boolean;
  chopChainCount?: number;
  chopChainTotalAmount?: number;
  playedMove?: PlayedMove;
  error?: string;
  isGameOver?: boolean;
}

export interface BotTurnResult {
  action: 'PLAY' | 'PASS';
  playerId: string;
  playedMove?: PlayedMove;
  isChop?: boolean;
  choppedPlayerId?: string;
  penaltyAmount?: number;
  isCascadeChop?: boolean;
  chopChainCount?: number;
  chopChainTotalAmount?: number;
  isGameOver?: boolean;
}

export class GameEngine {
  public players: Player[];
  public rules: GameRules;
  public settings: GameSettings;
  public gameNumber: number = 1;
  public isFirstMoveOfGame: boolean = true;
  public isGameOver: boolean = false;
  public currentRound!: Round;
  public winners: Player[] = [];
  public playedCardsInGame: Card[] = [];
  public instantWinner: Player | null = null;
  public roundNumber: number = 1;

  constructor(players: Player[], rulesOrSettings?: GameRules | Partial<GameSettings>, legacyStrategyId?: string) {
    this.players = players;
    
    // Khởi tạo GameRules hợp thành
    if (isGameRules(rulesOrSettings)) {
      this.rules = rulesOrSettings;
    } else {
      this.rules = convertSettingsToGameRules(rulesOrSettings);
    }

    // Ánh xạ sang GameSettings để tương thích với các module đang đọc settings
    let legacyMode: GameMode = 'TRADITIONAL';
    if (this.rules.settlementRule === 'CARD_COUNT') legacyMode = 'COUNT_CARDS';
    else if (this.rules.settlementRule === 'WINNER_TAKES_ALL') legacyMode = 'WINNER_TAKES_ALL';

    this.settings = {
      mode: legacyMode,
      betAmount: this.rules.table.betAmount,
      allowFourPairsCutAnytime: this.rules.chopping.allowFourPairsCutAnytime,
      instantWinEnabled: this.rules.instantWin.enabled,
      soundEnabled: this.rules.table.soundEnabled,
      botThinkDelayMs: this.rules.table.botThinkDelayMs,
      playerCount: this.rules.table.playerCount,
      prohibitEndingWithTwo: this.rules.gameFlow.prohibitEndingWithTwo,
      threeSpadesEndingBonus: this.rules.gameFlow.threeSpadesEndingBonus,
      cascadeChopEnabled: this.rules.chopping.cascadeMultiplier
    };

    this.currentRound = {
      moves: [],
      leadPlayerId: players[0]?.id || 'p0',
      currentTurnPlayerId: players[0]?.id || 'p0',
      passedPlayerIds: [],
      isFinished: false
    };
  }

  public getPlayer(id: string): Player | undefined {
    return this.players.find(p => p.id === id);
  }

  public isRoundLeadMove(): boolean {
    return !this.currentRound || !this.currentRound.moves || this.currentRound.moves.length === 0;
  }

  public getLeadingMove(): PlayedMove | null {
    if (!this.currentRound || !this.currentRound.moves || this.currentRound.moves.length === 0) return null;
    return this.currentRound.moves[this.currentRound.moves.length - 1];
  }

  public lastWinnerId?: string;
  public isThreeSpadesWin: boolean = false;

  /**
   * Khởi tạo ván bài mới
   * @param gameNumber Số thứ tự ván (1: ván đầu, >1: ván tiếp theo)
   * @param previousWinnerId ID người về Nhất ván trước (được quyền đi trước ở ván > 1)
   */
  public startNewGame(
    gameNumber = 1,
    previousWinnerId?: string,
    seedOrRng?: number | (() => number)
  ): { instantWin: boolean; instantWinner?: Player; instantWinType?: InstantWinType } {
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
      player.playedCards = [];
      player.isPassedCurrentRound = false;
      player.hasPlayedFirstCard = false;
      player.rankPosition = undefined;
      player.instantWinType = undefined;
    });

    // 2. Kiểm tra Tới Trắng
    if (this.settings.instantWinEnabled) {
      for (const player of this.players) {
        const instantType = checkInstantWin(player.hand, this.gameNumber === 1);
        if (instantType) {
          player.instantWinType = instantType;
          player.rankPosition = 1;
          this.instantWinner = player;
          this.winners = [player];
          this.lastWinnerId = player.id;
          this.isGameOver = true;
          this.calculateInstantWinSettlement(player, instantType);
          return { instantWin: true, instantWinner: player, instantWinType: instantType };
        }
      }
    }

    // Reset danh sách người thắng cho ván mới
    this.winners = [];

    // 3. Tìm người đi đầu tiên:
    let firstPlayerId = this.players[0].id;
    const resolvedPrevWinnerId = previousWinnerId || this.lastWinnerId;

    if (this.gameNumber > 1 && resolvedPrevWinnerId && this.players.some(p => p.id === resolvedPrevWinnerId)) {
      // Ván thứ 2 trở đi: Người về Nhất ván trước được quyền đi trước bất kể đang cầm bài gì!
      firstPlayerId = resolvedPrevWinnerId;
      this.isFirstMoveOfGame = false;
    } else {
      // Ván đầu tiên (gameNumber === 1): Người giữ 3 Bích đi trước
      let found3Spades = false;
      for (const player of this.players) {
        if (player.hand.some(c => c.rank === 3 && c.suit === 'SPADES')) {
          firstPlayerId = player.id;
          found3Spades = true;
          break;
        }
      }

      if (!found3Spades) {
        // Trong bàn 2 hoặc 3 người chơi không có 3 Bích: Tìm người có lá nhỏ nhất
        let smallestCardWeight = 9999;
        for (const player of this.players) {
          const sorted = sortCards(player.hand);
          if (sorted.length > 0 && sorted[0].weight < smallestCardWeight) {
            smallestCardWeight = sorted[0].weight;
            firstPlayerId = player.id;
          }
        }
        this.isFirstMoveOfGame = false;
      } else {
        this.isFirstMoveOfGame = true;
      }
    }

    // 4. Khởi tạo vòng chơi đầu tiên
    this.currentRound = {
      moves: [],
      leadPlayerId: firstPlayerId,
      currentTurnPlayerId: firstPlayerId,
      passedPlayerIds: [],
      isFinished: false
    };

    MatchLogger.getInstance().startNewMatch({
      gameNumber: this.gameNumber,
      gameMode: this.settings.mode || 'TRADITIONAL',
      rules: this.rules,
      players: this.players
    });

    return { instantWin: false };
  }

  /**
   * Khởi tạo custom game để phục vụ Unit Test
   */
  public startCustomGame(gameNumber = 1, previousWinnerId?: string): void {
    this.gameNumber = gameNumber;
    this.isFirstMoveOfGame = this.gameNumber === 1 && (this.rules?.gameFlow?.firstGameRequireThreeOfSpades ?? true);
    this.isGameOver = false;
    this.playedCardsInGame = [];
    this.instantWinner = null;
    this.roundNumber = 1;

    this.players.forEach(p => {
      p.playedCards = [];
      p.isPassedCurrentRound = false;
      p.hasPlayedFirstCard = false;
      p.rankPosition = undefined;
      p.instantWinType = undefined;
    });

    let firstPlayerId = this.players[0].id;
    const resolvedPrevWinnerId = previousWinnerId || this.lastWinnerId;

    if (this.gameNumber > 1 && resolvedPrevWinnerId && this.players.some(p => p.id === resolvedPrevWinnerId)) {
      firstPlayerId = resolvedPrevWinnerId;
      this.isFirstMoveOfGame = false;
    } else if (this.isFirstMoveOfGame) {
      for (const player of this.players) {
        if (player.hand.some(c => c.rank === 3 && c.suit === 'SPADES')) {
          firstPlayerId = player.id;
          break;
        }
      }
    }

    this.winners = [];

    this.currentRound = {
      moves: [],
      leadPlayerId: firstPlayerId,
      currentTurnPlayerId: firstPlayerId,
      passedPlayerIds: [],
      isFinished: false
    };

    MatchLogger.getInstance().startNewMatch({
      gameNumber: this.gameNumber,
      gameMode: this.settings.mode || 'TRADITIONAL',
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
      this.settings.allowFourPairsCutAnytime &&
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
      cards,
      targetCombination,
      this.isFirstMoveOfGame,
      isLeadMove,
      player.isPassedCurrentRound,
      this.rules.chopping.allowFourPairsCutAnytime,
      isFinishingMove,
      prohibitEndingWithTwo
    );

    if (!validation.valid || !validation.combination) {
      return { success: false, error: validation.reason || 'Nước đi không hợp lệ' };
    }

    // 1. Trừ bài trên tay và thêm vào danh sách đã đánh
    const handBeforeTurn = [...player.hand];
    const playedIds = new Set(cards.map(c => c.id));
    const handSizeBeforeMove = player.hand.length;
    player.hand = player.hand.filter(c => !playedIds.has(c.id));
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

    // Ván 1: Đã đánh ra 3S ở lượt đầu
    this.isFirstMoveOfGame = false;

    // 2. Xử lý Chặt Heo & Chặt Hàng (Phạt tức thì & Chặt Chồng Tích Lũy)
    let isChop = false;
    let isCascadeChop = false;
    let chopChainCount = 0;
    let chopChainTotalAmount = 0;
    let choppedPlayerId: string | undefined;
    let penaltyAmount = 0;

    if (validation.isChop && leadingMove) {
      isChop = true;
      choppedPlayerId = leadingMove.playerId;
      const basePenalty = this.calculateChopPenalty(leadingMove.combination, validation.combination);
      const isCascadeRuleActive = this.rules.chopping.cascadeMultiplier;

      const prevChopMoves = this.currentRound.moves.filter(m => m.isChop);

      if (isCascadeRuleActive && prevChopMoves.length > 0) {
        // CHẶT CHỒNG TÍCH LŨY (Chop Cascade Stack):
        isCascadeChop = true;
        chopChainCount = prevChopMoves.length + 1;

        // Hoàn trả lại tiền phạt cho người bị chặt ở bước trước (giải thoát)
        const lastChopMove = prevChopMoves[prevChopMoves.length - 1];
        if (lastChopMove && lastChopMove.choppedPlayerId) {
          const previousVictim = this.getPlayer(lastChopMove.choppedPlayerId);
          const previousChopper = this.getPlayer(lastChopMove.playerId);
          const previousAmount = lastChopMove.penaltyAmount || 0;

          if (previousVictim && previousChopper) {
            // Hoàn lại tiền cho previousVictim, trừ lại từ previousChopper
            previousVictim.score += previousAmount;
            previousChopper.score -= previousAmount;
          }

          // Tổng tiền phạt tích lũy = Tiền chuỗi trước + Tiền chặt đè mới
          penaltyAmount = previousAmount + basePenalty;
        } else {
          penaltyAmount = basePenalty;
        }

        chopChainTotalAmount = penaltyAmount;

        // Người bị chặt đè hiện tại (choppedPlayerId) đền TOÀN BỘ chuỗi tích lũy cho người chặt mới (player)
        const choppedPlayer = this.getPlayer(choppedPlayerId);
        if (choppedPlayer) {
          choppedPlayer.score -= penaltyAmount;
          player.score += penaltyAmount;
        }
      } else {
        // Chặt đơn lẻ thông thường
        penaltyAmount = basePenalty;
        chopChainCount = 1;
        chopChainTotalAmount = basePenalty;

        const choppedPlayer = this.getPlayer(choppedPlayerId);
        if (choppedPlayer) {
          choppedPlayer.score -= penaltyAmount;
          player.score += penaltyAmount;
        }
      }
    }

    // 3. Ghi nhận nước đi vào Round
    const playedMoveRecord: PlayedMove = {
      playerId,
      combination: validation.combination,
      timestamp: Date.now(),
      isChop,
      choppedPlayerId,
      penaltyAmount,
      isCascadeChop,
      chopChainCount,
      chopChainTotalAmount
    };

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
      player.rankPosition = this.winners.length + 1;
      this.winners = [...this.winners, player];

      // Kiểm tra Về 3 Bích Cuối Cùng (Ăn Ba Bích):
      // Chỉ kích hoạt khi người về Nhất đánh lá ĐƠN 3 Bích và không phải ván 1 bắt buộc 3 Bích đi đầu
      const isThreeSpadesEndingEnabled = this.rules.gameFlow.threeSpadesEndingBonus;
      if (
        player.rankPosition === 1 &&
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
            lastPlayer.rankPosition = this.players.length;
            this.winners = [...this.winners, lastPlayer];
          }
        }
        this.isGameOver = true;
        this.settleEndGame();
        return {
          success: true,
          isChop,
          choppedPlayerId,
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
      choppedPlayerId,
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
  ): { success: boolean; error?: string } {
    if (this.currentRound.currentTurnPlayerId !== playerId) {
      return { success: false, error: 'Chưa đến lượt của bạn' };
    }

    if (this.isRoundLeadMove()) {
      return { success: false, error: 'Bạn đang cầm cái, không thể bỏ lượt mở đầu' };
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

  /**
   * Thực thi trọn vẹn lượt đi của Bot AI ngay trong GameEngine với cơ chế tự phục hồi, bảo đảm không bao giờ treo
   */
  public executeBotTurn(botConfig: BotConfig, tracker: CardTracker): BotTurnResult {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isBot || currentPlayer.hand.length === 0) {
      return { action: 'PASS', playerId: currentPlayer?.id || '' };
    }

    const playerId = currentPlayer.id;
    const isLead = this.isRoundLeadMove();
    const leading = this.getLeadingMove();
    const remainingCardsMap = this.players.reduce((acc, p) => ({ ...acc, [p.id]: p.hand.length }), {});
    const nextPlayerId = this.getNextActivePlayerId(playerId);
    const nextPlayer = this.getPlayer(nextPlayerId);
    const isNextPlayerOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;
    const prohibitEndingWithTwo = this.rules.gameFlow.prohibitEndingWithTwo;

    try {
      const decision = makeBotDecision({
        hand: currentPlayer.hand,
        currentRoundLeadingMove: leading,
        isFirstMoveOfGame: this.isFirstMoveOfGame,
        isLeadMove: isLead,
        tracker,
        config: { ...botConfig, id: playerId },
        remainingPlayerCards: remainingCardsMap,
        isNextPlayerOneCard,
        nextPlayerId,
        rules: this.rules,
        hasPlayedFirstCard: currentPlayer.hasPlayedFirstCard,
        prohibitEndingWithTwo,
        gameMode: this.settings.mode || 'TRADITIONAL',
        mctsMap: null,
        compositeRuleStrategy: null,
        opponentProfiles: null
      });

      if (decision.type === 'PLAY' && decision.cards && decision.cards.length > 0) {
        const cardsPlayed = [...decision.cards];
        const moveRes = this.playMove(playerId, decision.cards, decision.telemetry || null);
        if (moveRes.success) {
          const combo = identifyCombination(cardsPlayed);
          const playedMoveInfo: PlayedMove = {
            playerId,
            combination: combo || { type: 'SINGLE', cards: cardsPlayed, length: 1, highestCard: cardsPlayed[0] },
            timestamp: Date.now()
          };
          return {
            action: 'PLAY',
            playerId,
            playedMove: playedMoveInfo,
            isChop: moveRes.isChop,
            choppedPlayerId: moveRes.choppedPlayerId,
            penaltyAmount: moveRes.penaltyAmount,
            isCascadeChop: moveRes.isCascadeChop,
            chopChainCount: moveRes.chopChainCount,
            chopChainTotalAmount: moveRes.chopChainTotalAmount,
            isGameOver: this.isGameOver
          };
        }
      } else {
        const passRes = this.passTurn(playerId, decision.telemetry || null);
        if (passRes.success) {
          return {
            action: 'PASS',
            playerId,
            isGameOver: this.isGameOver
          };
        }
      }
    } catch (err) {
      console.error(`[GameEngine] Lỗi trong tính toán AI Bot (${playerId}):`, err);
    }

    // Cơ chế cứu hộ khẩn cấp tích hợp sẵn trong Engine
    return this.executeEmergencyFallback(playerId);
  }

  private executeEmergencyFallback(playerId: string): BotTurnResult {
    const player = this.getPlayer(playerId);
    if (!player || player.hand.length === 0) {
      return { action: 'PASS', playerId };
    }

    const isLead = this.isRoundLeadMove();
    const leading = this.getLeadingMove();
    const sorted = sortCards(player.hand);
    const prohibitEndingWithTwo = this.rules.gameFlow.prohibitEndingWithTwo;

    // 1. Nếu đang cầm cái (Lead move)
    if (isLead || !leading) {
      if (this.isFirstMoveOfGame) {
        const spade3 = player.hand.find(c => c.rank === 3 && c.suit === 'SPADES');
        if (spade3) {
          const res = this.playMove(playerId, [spade3]);
          if (res.success) {
            return { action: 'PLAY', playerId, playedMove: this.getLeadingMove() || undefined, isGameOver: this.isGameOver };
          }
        }
      }
      for (const card of sorted) {
        if (prohibitEndingWithTwo && player.hand.length === 1 && isTwo(card)) {
          continue;
        }
        const res = this.playMove(playerId, [card]);
        if (res.success) {
          return { action: 'PLAY', playerId, playedMove: this.getLeadingMove() || undefined, isGameOver: this.isGameOver };
        }
      }
      if (prohibitEndingWithTwo && player.hand.every(isTwo)) {
        this.advanceTurn(playerId);
        return { action: 'PASS', playerId, isGameOver: this.isGameOver };
      }
    }

    // 2. Nếu không phải cầm cái (Responding move): Thử bỏ lượt
    const passRes = this.passTurn(playerId);
    if (passRes.success) {
      return { action: 'PASS', playerId, isGameOver: this.isGameOver };
    }

    // 3. Nếu bỏ lượt thất bại: Thử đánh bài
    for (const card of sorted) {
      if (prohibitEndingWithTwo && player.hand.length === 1 && isTwo(card)) {
        continue;
      }
      const res = this.playMove(playerId, [card]);
      if (res.success) {
        return { action: 'PLAY', playerId, playedMove: this.getLeadingMove() || undefined, isGameOver: this.isGameOver };
      }
    }

    // 4. Cưỡng chế chuyển lượt
    this.advanceTurn(playerId);
    return { action: 'PASS', playerId, isGameOver: this.isGameOver };
  }

  public getCurrentPlayer(): Player {
    let player = this.getPlayer(this.currentRound?.currentTurnPlayerId);
    if (player && player.hand.length === 0 && !this.isGameOver) {
      const nextId = this.getNextEligiblePlayerId(player.id);
      this.currentRound.currentTurnPlayerId = nextId;
      player = this.getPlayer(nextId);
    }
    return player || this.players[0];
  }

  public checkGameOver(): boolean {
    if (this.rules.settlementRule === 'CARD_COUNT' || this.rules.settlementRule === 'WINNER_TAKES_ALL') {
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
        if (lastPlayer && !lastPlayer.rankPosition) {
          lastPlayer.rankPosition = this.players.length;
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
    // - Nếu lastMover còn bài: tất cả những người khác đã bỏ lượt (eligiblePlayers.length <= 1).
    // - Nếu lastMover đã hết bài (đã về Nhất/Nhì): tất cả người còn bài đều đã bỏ lượt (eligiblePlayers.length === 0).
    const isRoundOver = isLastMoverActive
      ? eligiblePlayers.length <= 1
      : eligiblePlayers.length === 0;

    if (isRoundOver) {
      let nextLeadPlayerId = lastMover ? lastMover.playerId : currentPlayerId;

      // Nếu người vừa đánh nước cuối đã hết bài, chuyển quyền mở vòng cho người kế tiếp theo chiều kim đồng hồ
      const leadPlayer = this.getPlayer(nextLeadPlayerId);
      if (!leadPlayer || leadPlayer.hand.length === 0) {
        nextLeadPlayerId = this.getNextActivePlayerId(nextLeadPlayerId);
      }

      this.startNewRound(nextLeadPlayerId);
      return;
    }

    // Vòng vẫn tiếp diễn: Chuyển lượt cho người tiếp theo (chưa bỏ lượt và còn bài)
    const nextPlayerId = this.getNextEligiblePlayerId(currentPlayerId);
    this.currentRound.currentTurnPlayerId = nextPlayerId;
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
      this.rules.chopping.multiplier || 1
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
      this.rules.chopping.multiplier || 1
    );
  }

  /**
   * Kết toán bàn chơi theo đúng luật settlementRule đã cấu hình
   */
  public settleEndGame(): void {
    if (this.winners[0]) {
      this.lastWinnerId = this.winners[0].id;
    }
    if (this.rules.settlementRule === 'CARD_COUNT') {
      this.settleCountCardsEndGame(this.winners[0]);
    } else if (this.rules.settlementRule === 'WINNER_TAKES_ALL') {
      this.settleWinnerTakesAllEndGame(this.winners[0]);
    } else {
      this.settleTraditionalEndGame();
    }

    for (const p of this.players) {
      OpponentProfiler.getInstance().finalizeMatchForPlayer(p.id, p.hand);
    }
  }

  /**
   * Tính toán kết quả cho chế độ Đếm Lá (CARD_COUNT)
   */
  private settleCountCardsEndGame(winner: Player): void {
    if (!winner) return;
    const bet = this.rules.table.betAmount;
    const congMult = this.rules.cong.multiplier || 1;
    const congPenaltyCards = this.rules.cong.penaltyCards || 26;
    const threeSpadesMultiplier = this.isThreeSpadesWin ? 2 : 1;
    let totalWinScore = 0;

    for (const player of this.players) {
      if (player.id === winner.id) continue;

      const isCong = this.isPlayerCong(player.id);
      let penalty = 0;

      if (isCong && this.rules.cong.enabled) {
        // Cóng: Bị phạt đền congPenaltyCards x bet x congMult + thối heo hàng
        penalty = congPenaltyCards * bet * congMult + this.calculateRottenCardsPenalty(player.hand);
      } else {
        // Đếm lá: Số lá bài còn lại x cược + thối heo hàng
        penalty = player.hand.length * bet + this.calculateRottenCardsPenalty(player.hand);
      }

      penalty *= threeSpadesMultiplier;

      player.score -= penalty;
      totalWinScore += penalty;
    }

    winner.score += totalWinScore;
  }

  /**
   * Tính toán kết quả cho chế độ Nhất Ăn Tất (WINNER_TAKES_ALL)
   */
  private settleWinnerTakesAllEndGame(winner: Player): void {
    if (!winner) return;
    const bet = this.rules.table.betAmount;
    const threeSpadesMultiplier = this.isThreeSpadesWin ? 2 : 1;
    let totalWinScore = 0;

    for (const player of this.players) {
      if (player.id === winner.id) continue;
      let penalty = bet + this.calculateRottenCardsPenalty(player.hand);
      penalty *= threeSpadesMultiplier;
      player.score -= penalty;
      totalWinScore += penalty;
    }

    winner.score += totalWinScore;
  }

  /**
   * Tính toán kết quả cho chế độ Truyền Thống (TRADITIONAL_RANK_BASED)
   */
  private settleTraditionalEndGame(): void {
    const bet = this.rules.table.betAmount;
    const threeSpadesMultiplier = this.isThreeSpadesWin ? 2 : 1;
    // Thứ tự: Nhất (+3 cược), Nhì (+1 cược), Ba (-1 cược), Bét (-3 cược)
    const [p1, p2, p3, p4] = this.winners;

    if (p1 && p2 && p3 && p4) {
      const p4Penalty = (this.isPlayerCong(p4.id) ? bet * 6 : bet * 3) * threeSpadesMultiplier;
      let totalRottenPenalty = 0;

      // Phạt thối heo cho tất cả người chơi còn giữ Heo khi ván kết thúc (p2, p3, p4)
      for (const p of [p2, p3, p4]) {
        let rotten = this.calculateRottenCardsPenalty(p.hand);
        if (rotten > 0) {
          rotten *= threeSpadesMultiplier;
          p.score -= rotten;
          totalRottenPenalty += rotten;
        }
      }

      p1.score += p4Penalty + bet * 1 * threeSpadesMultiplier + totalRottenPenalty;
      p2.score += bet * 1;
      p3.score -= bet * 1;
      p4.score -= p4Penalty;
    } else if (this.winners.length === 2) {
      const p1 = this.winners[0];
      const p2 = this.winners[1];
      if (p1 && p2) {
        let p2Penalty = (this.isPlayerCong(p2.id) ? bet * 2 : bet * 1) * threeSpadesMultiplier;
        let p2Rotten = this.calculateRottenCardsPenalty(p2.hand) * threeSpadesMultiplier;
        p1.score += p2Penalty + p2Rotten;
        p2.score -= (p2Penalty + p2Rotten);
      }
    } else if (this.winners.length === 3) {
      const [p1, p2, p3] = this.winners;
      if (p1 && p2 && p3) {
        const p3Penalty = (this.isPlayerCong(p3.id) ? bet * 4 : bet * 2) * threeSpadesMultiplier;
        let totalRotten = 0;
        for (const p of [p2, p3]) {
          let rotten = this.calculateRottenCardsPenalty(p.hand);
          if (rotten > 0) {
            rotten *= threeSpadesMultiplier;
            totalRotten += rotten;
          }
        }
        p1.score += p3Penalty + totalRotten;
        p2.score += 0;
        p3.score -= p3Penalty;
      }
    }
  }

  /**
   * Tính toán kết quả Tới Trắng
   */
  private calculateInstantWinSettlement(winner: Player, instantWinType: InstantWinType): void {
    const bet = this.rules.table.betAmount;
    const mult = this.rules.instantWin.payoutMultiplier || 26;
    // Thắng tới trắng: Mỗi nhà đền mult mức cược
    const rewardPerPlayer = mult * bet;
    let totalWin = 0;

    for (const player of this.players) {
      if (player.id !== winner.id) {
        player.score -= rewardPerPlayer;
        totalWin += rewardPerPlayer;
      }
    }

    winner.score += totalWin;
  }
}
