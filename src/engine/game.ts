import { Card, Combination, GameMode, GameSettings, InstantWinType, PlayedMove, Player, Round } from './types';
import { compareCards, isRedCard, isTwo, sortCards } from './card';
import { checkInstantWin, createDeck, dealCards, shuffleDeck } from './deck';
import { identifyCombination } from './combinations';
import { isValidMove } from './validator';

export class GameEngine {
  public players: Player[];
  public settings: GameSettings;
  public gameNumber: number = 1;
  public isFirstMoveOfGame: boolean = true;
  public isGameOver: boolean = false;
  public currentRound!: Round;
  public winners: Player[] = [];
  public playedCardsInGame: Card[] = [];
  public instantWinner: Player | null = null;
  public roundNumber: number = 1;

  constructor(players: Player[], settings?: Partial<GameSettings>) {
    this.players = players;
    this.settings = {
      mode: settings?.mode || 'TRADITIONAL',
      betAmount: settings?.betAmount || 100,
      allowFourPairsCutAnytime: settings?.allowFourPairsCutAnytime ?? true,
      instantWinEnabled: settings?.instantWinEnabled ?? true,
      soundEnabled: settings?.soundEnabled ?? true,
      botThinkDelayMs: settings?.botThinkDelayMs ?? 800
    };
  }

  public getPlayer(id: string): Player | undefined {
    return this.players.find(p => p.id === id);
  }

  public isRoundLeadMove(): boolean {
    return this.currentRound.moves.length === 0;
  }

  public getLeadingMove(): PlayedMove | null {
    if (this.currentRound.moves.length === 0) return null;
    return this.currentRound.moves[this.currentRound.moves.length - 1];
  }

  /**
   * Khởi tạo ván bài mới
   */
  public startNewGame(gameNumber = 1): { instantWin: boolean; instantWinner?: Player; instantWinType?: InstantWinType } {
    this.gameNumber = gameNumber;
    this.isFirstMoveOfGame = this.gameNumber === 1;
    this.isGameOver = false;
    this.winners = [];
    this.playedCardsInGame = [];
    this.instantWinner = null;
    this.roundNumber = 1;

    // 1. Xáo bài & chia bài
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck);

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
          this.isGameOver = true;
          this.calculateInstantWinSettlement(player, instantType);
          return { instantWin: true, instantWinner: player, instantWinType: instantType };
        }
      }
    }

    // 3. Tìm người đi đầu tiên (Mặc định chọn ngẫu nhiên nếu không có ai cầm 3 Bích)
    let firstPlayerId = this.players[Math.floor(Math.random() * this.players.length)].id;
    if (this.gameNumber === 1 || this.winners.length === 0) {
      // Ván đầu hoặc ván mới tạo: Tìm người có 3 Bích (3S)
      for (const player of this.players) {
        if (player.hand.some(c => c.rank === 3 && c.suit === 'SPADES')) {
          firstPlayerId = player.id;
          break;
        }
      }
    } else {
      // Ván tiếp theo: Người về nhất ván trước
      const prevWinner = this.winners[0];
      if (prevWinner) {
        firstPlayerId = prevWinner.id;
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

    return { instantWin: false };
  }

  /**
   * Khởi tạo custom game để phục vụ Unit Test
   */
  public startCustomGame(gameNumber = 1): void {
    this.gameNumber = gameNumber;
    this.isFirstMoveOfGame = true;
    this.isGameOver = false;
    this.winners = [];
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
    if (this.gameNumber === 1) {
      for (const player of this.players) {
        if (player.hand.some(c => c.rank === 3 && c.suit === 'SPADES')) {
          firstPlayerId = player.id;
          break;
        }
      }
    }

    this.currentRound = {
      moves: [],
      leadPlayerId: firstPlayerId,
      currentTurnPlayerId: firstPlayerId,
      passedPlayerIds: [],
      isFinished: false
    };
  }

  /**
   * Thực hiện nước đi của một người chơi
   */
  public playMove(
    playerId: string,
    cards: Card[]
  ): {
    success: boolean;
    isChop?: boolean;
    choppedPlayerId?: string;
    penaltyAmount?: number;
    error?: string;
    isGameOver?: boolean;
  } {
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

    // Thẩm định nước đi với validator
    const validation = isValidMove(
      cards,
      targetCombination,
      this.isFirstMoveOfGame,
      isLeadMove,
      player.isPassedCurrentRound,
      this.settings.allowFourPairsCutAnytime
    );

    if (!validation.valid || !validation.combination) {
      return { success: false, error: validation.reason || 'Nước đi không hợp lệ' };
    }

    // 1. Trừ bài trên tay và thêm vào danh sách đã đánh
    const playedIds = new Set(cards.map(c => c.id));
    player.hand = player.hand.filter(c => !playedIds.has(c.id));
    player.playedCards.push(...cards);
    player.hasPlayedFirstCard = true;
    this.playedCardsInGame.push(...cards);

    // Ván 1: Đã đánh ra 3S ở lượt đầu
    this.isFirstMoveOfGame = false;

    // 2. Xử lý Chặt Heo & Chặt Hàng (Phạt tức thì)
    let isChop = false;
    let choppedPlayerId: string | undefined;
    let penaltyAmount = 0;

    if (validation.isChop && leadingMove) {
      isChop = true;
      choppedPlayerId = leadingMove.playerId;
      penaltyAmount = this.calculateChopPenalty(leadingMove.combination, validation.combination);

      const choppedPlayer = this.getPlayer(choppedPlayerId);
      if (choppedPlayer) {
        choppedPlayer.score -= penaltyAmount;
        player.score += penaltyAmount;
      }
    }

    // 3. Ghi nhận nước đi vào Round
    const playedMoveRecord: PlayedMove = {
      playerId,
      combination: validation.combination,
      timestamp: Date.now(),
      isChop,
      choppedPlayerId,
      penaltyAmount
    };

    this.currentRound.moves.push(playedMoveRecord);

    // Nếu người chơi dùng 4 đôi thông nhảy cóc ngoài lượt, phục hồi quyền tham gia
    if (player.isPassedCurrentRound) {
      player.isPassedCurrentRound = false;
      this.currentRound.passedPlayerIds = this.currentRound.passedPlayerIds.filter(id => id !== playerId);
    }

    // 4. Kiểm tra người chơi đã Hết Bài (Về Nhất/Nhì/Ba)
    if (player.hand.length === 0) {
      player.rankPosition = this.winners.length + 1;
      this.winners.push(player);

      // Nếu ở chế độ Đếm Lá: Có 1 người về Nhất là kết thúc ván ngay
      if (this.settings.mode === 'COUNT_CARDS') {
        this.isGameOver = true;
        this.settleCountCardsEndGame(player);
        return {
          success: true,
          isChop,
          choppedPlayerId,
          penaltyAmount,
          isGameOver: true
        };
      }

      // Chế độ Truyền Thống: Tiếp tục cho đến khi 3 người hết bài
      if (this.winners.length === 3) {
        const lastPlayer = this.players.find(p => p.hand.length > 0);
        if (lastPlayer) {
          lastPlayer.rankPosition = 4;
          this.winners.push(lastPlayer);
        }
        this.isGameOver = true;
        this.settleTraditionalEndGame();
        return {
          success: true,
          isChop,
          choppedPlayerId,
          penaltyAmount,
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
      isGameOver: this.isGameOver
    };
  }

  /**
   * Bỏ lượt (Pass)
   */
  public passTurn(playerId: string): { success: boolean; error?: string } {
    if (this.currentRound.currentTurnPlayerId !== playerId) {
      return { success: false, error: 'Chưa đến lượt của bạn' };
    }

    if (this.isRoundLeadMove()) {
      return { success: false, error: 'Bạn đang cầm cái, không thể bỏ lượt mở đầu' };
    }

    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Không tìm thấy người chơi' };

    player.isPassedCurrentRound = true;
    if (!this.currentRound.passedPlayerIds.includes(playerId)) {
      this.currentRound.passedPlayerIds.push(playerId);
    }

    this.advanceTurn(playerId);
    return { success: true };
  }

  public getCurrentPlayer(): Player {
    let player = this.getPlayer(this.currentRound?.currentTurnPlayerId);
    if (player && player.hand.length === 0 && !this.isGameOver) {
      const nextActiveId = this.getNextActivePlayerId(player.id);
      this.currentRound.currentTurnPlayerId = nextActiveId;
      player = this.getPlayer(nextActiveId);
    }
    return player || this.players[0];
  }

  /**
   * Chuyển lượt kế tiếp hoặc mở vòng mới nếu tất cả người khác đã bỏ lượt
   */
  private advanceTurn(currentPlayerId: string): void {
    const activeRemainingPlayers = this.players.filter(p => p.hand.length > 0);

    // Nếu chỉ còn duy nhất 1 người còn bài (hoặc 0 người) -> Kết thúc toàn bộ ván đấu
    if (activeRemainingPlayers.length <= 1) {
      if (this.winners.length < 4) {
        const lastPlayer = this.players.find(p => p.hand.length > 0);
        if (lastPlayer && !lastPlayer.rankPosition) {
          lastPlayer.rankPosition = 4;
          this.winners.push(lastPlayer);
        }
      }
      this.isGameOver = true;
      this.settleTraditionalEndGame();
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
   * Tính số tiền phạt cho cú chặt heo/hàng
   */
  private calculateChopPenalty(target: Combination, candidate: Combination): number {
    const bet = this.settings.betAmount;

    // Chặt 1 Heo
    if (target.type === 'SINGLE' && isTwo(target.highestCard)) {
      return isRedCard(target.highestCard) ? bet * 2 : bet * 1;
    }

    // Chặt Đôi Heo
    if (target.type === 'PAIR' && isTwo(target.highestCard)) {
      const redCount = target.cards.filter(isRedCard).length;
      if (redCount === 2) return bet * 4; // 2 heo đỏ
      if (redCount === 1) return bet * 3; // 1 đỏ 1 đen
      return bet * 2;                     // 2 heo đen
    }

    // Chặt 3 Đôi Thông
    if (target.type === 'THREE_PAIRS_SEQUENTIAL') {
      return bet * 3;
    }

    // Chặt Tứ Quý
    if (target.type === 'FOUR_OF_A_KIND') {
      return bet * 4;
    }

    // Chặt 4 Đôi Thông
    if (target.type === 'FOUR_PAIRS_SEQUENTIAL') {
      return bet * 5;
    }

    return bet;
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
    let penalty = 0;
    const bet = this.settings.betAmount;

    // 1. Thối Heo
    for (const card of hand) {
      if (isTwo(card)) {
        penalty += isRedCard(card) ? bet * 2 : bet * 1;
      }
    }

    // 2. Thối Tứ Quý & Đôi thông
    const rankCounts: Record<number, number> = {};
    for (const card of hand) {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    }

    // Tứ quý
    for (const rank in rankCounts) {
      if (rankCounts[rank] === 4 && Number(rank) < 15) {
        penalty += bet * 4;
      }
    }

    return penalty;
  }

  /**
   * Tính toán kết quả cho chế độ Đếm Lá (COUNT_CARDS)
   */
  private settleCountCardsEndGame(winner: Player): void {
    const bet = this.settings.betAmount;
    let totalWinScore = 0;

    for (const player of this.players) {
      if (player.id === winner.id) continue;

      const isCong = this.isPlayerCong(player.id);
      let penalty = 0;

      if (isCong) {
        // Cóng: Bị phạt đền 26 lá (gấp đôi 13 lá) + thối heo hàng
        penalty = 26 * bet + this.calculateRottenCardsPenalty(player.hand);
      } else {
        // Đếm lá: Số lá bài còn lại x cược + thối heo hàng
        penalty = player.hand.length * bet + this.calculateRottenCardsPenalty(player.hand);
      }

      player.score -= penalty;
      totalWinScore += penalty;
    }

    winner.score += totalWinScore;
  }

  /**
   * Tính toán kết quả cho chế độ Truyền Thống (TRADITIONAL)
   */
  private settleTraditionalEndGame(): void {
    const bet = this.settings.betAmount;
    // Thứ tự: Nhất (+3 cược), Nhì (+1 cược), Ba (-1 cược), Bét (-3 cược)
    const [p1, p2, p3, p4] = this.winners;

    if (p1 && p2 && p3 && p4) {
      const p4Penalty = this.isPlayerCong(p4.id) ? bet * 6 : bet * 3;
      const p4Rotten = this.calculateRottenCardsPenalty(p4.hand);

      p1.score += p4Penalty + bet * 1;
      p2.score += bet * 1;
      p3.score -= bet * 1;
      p4.score -= (p4Penalty + p4Rotten);
    }
  }

  /**
   * Tính toán kết quả Tới Trắng
   */
  private calculateInstantWinSettlement(winner: Player, instantWinType: InstantWinType): void {
    const bet = this.settings.betAmount;
    // Thắng tới trắng: Mỗi nhà đền 26 mức cược
    const rewardPerPlayer = 26 * bet;
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
