import { Card, Combination, CombinationType, PlayedMove, Rank } from '../engine/types';
import { ALL_RANKS, ALL_SUITS, createCard, isRedTwo, isTwo } from '../engine/card';
import { TwoSafetyReport } from './types';

export class CardTracker {
  private memoryDepth: number; // 0.0 -> 1.0
  private playerCount: number = 4;
  private playedCards: Set<string> = new Set();
  private ownHandCardIds: Set<string> = new Set();
  private opponentPasses: Map<string, Set<CombinationType>> = new Map();
  private opponentStraightPasses: Map<string, Set<number>> = new Map(); // playerId -> Set of straight lengths
  private opponentHighestRankPassed: Map<string, Map<CombinationType, number>> = new Map();
  private rankCountOnBoardAndHand: Map<Rank, number> = new Map();

  constructor(initialHand: readonly Card[] = [], memoryDepth = 1.0, playerCount = 4) {
    this.memoryDepth = memoryDepth;
    this.playerCount = playerCount;
    this.updateOwnHand(initialHand);
  }

  public setPlayerCount(count: number): void {
    this.playerCount = count;
  }

  public updateOwnHand(hand: readonly Card[] = []): void {
    this.ownHandCardIds.clear();
    for (const card of hand) {
      this.ownHandCardIds.add(card.id);
    }
    this.recomputeRankCounts();
  }

  public recordMove(move: PlayedMove): void {
    for (const card of move.combination.cards) {
      // Dựa trên memoryDepth, quyết định xác suất ghi nhớ lá bài này
      if (Math.random() <= this.memoryDepth) {
        this.playedCards.add(card.id);
      }
    }
    this.recomputeRankCounts();
  }

  public recordPass(playerId: string, type?: CombinationType): void {
    if (!type) return;
    if (!this.opponentPasses.has(playerId)) {
      this.opponentPasses.set(playerId, new Set());
    }
    this.opponentPasses.get(playerId)!.add(type);
  }

  public recordPassWithDetails(playerId: string, combination?: Combination | null): void {
    if (!combination) return;
    this.recordPass(playerId, combination.type);

    if (combination.type === 'STRAIGHT') {
      if (!this.opponentStraightPasses.has(playerId)) {
        this.opponentStraightPasses.set(playerId, new Set());
      }
      this.opponentStraightPasses.get(playerId)!.add(combination.length);
    }

    if (!this.opponentHighestRankPassed.has(playerId)) {
      this.opponentHighestRankPassed.set(playerId, new Map());
    }
    this.opponentHighestRankPassed.get(playerId)!.set(combination.type, combination.highestCard.rank);
  }

  public hasOpponentPassedOnType(playerId: string, type: CombinationType): boolean {
    return this.opponentPasses.get(playerId)?.has(type) ?? false;
  }

  public getOpponentWeaknessCombos(playerId: string): Set<CombinationType> {
    return this.opponentPasses.get(playerId) || new Set();
  }

  public hasOpponentPassedOnStraightLength(playerId: string, length: number): boolean {
    return this.opponentStraightPasses.get(playerId)?.has(length) ?? false;
  }

  public isCardPlayed(card: Card): boolean {
    return this.playedCards.has(card.id);
  }

  public getPlayedCardIds(): string[] {
    return Array.from(this.playedCards);
  }

  public recordPlayedCardId(cardId: string): void {
    this.playedCards.add(cardId);
    this.recomputeRankCounts();
  }

  public getRemainingTwosCount(): number {
    let count = 0;
    for (const suit of ALL_SUITS) {
      const card = createCard(15, suit);
      if (!this.playedCards.has(card.id) && !this.ownHandCardIds.has(card.id)) {
        count++;
      }
    }
    return count;
  }

  public getSeenCards(): Card[] {
    const cards: Card[] = [];
    for (const rank of ALL_RANKS) {
      for (const suit of ALL_SUITS) {
        const card = createCard(rank, suit);
        if (this.playedCards.has(card.id)) {
          cards.push(card);
        }
      }
    }
    return cards;
  }

  public getUnseenTwos(): Card[] {
    const unseen: Card[] = [];
    for (const suit of ALL_SUITS) {
      const card = createCard(15, suit);
      if (!this.playedCards.has(card.id) && !this.ownHandCardIds.has(card.id)) {
        unseen.push(card);
      }
    }
    return unseen;
  }

  public getUnseenCards(myHandCards?: Card[]): Card[] {
    const unseen: Card[] = [];
    const ownIds = myHandCards ? new Set(myHandCards.map(c => c.id)) : this.ownHandCardIds;
    for (const rank of ALL_RANKS) {
      for (const suit of ALL_SUITS) {
        const card = createCard(rank, suit);
        if (!this.playedCards.has(card.id) && !ownIds.has(card.id)) {
          unseen.push(card);
        }
      }
    }
    return unseen;
  }

  public getDangerousFourOfAKindRanks(): Rank[] {
    const dangerous: Rank[] = [];
    for (const rank of ALL_RANKS) {
      if (rank === 15) continue; // Heo không tính vào tứ quý thông thường
      const count = this.rankCountOnBoardAndHand.get(rank) || 0;
      // Nếu chưa có lá nào thuộc rank này xuất hiện trên bàn hoặc trên tay bot -> nguy cơ tứ quý còn nguyên 100%
      if (count === 0) {
        dangerous.push(rank);
      }
    }
    return dangerous;
  }

  /**
   * Báo cáo toàn diện mức độ an toàn khi ra quân Heo (2)
   */
  public getTwoSafetyReport(): TwoSafetyReport {
    const dangerousRanks = this.getDangerousFourOfAKindRanks();
    const unseenTwos = this.getUnseenTwos();
    const unseenRedTwos = unseenTwos.filter(isRedTwo);

    // Tính điểm rủi ro từ 0 (cực an toàn) -> 100 (cực nguy hiểm)
    let riskScore = dangerousRanks.length * 20;
    if (unseenRedTwos.length > 0) {
      riskScore += unseenRedTwos.length * 10;
    }
    riskScore = Math.min(100, riskScore);

    // Rủi ro Hàng giảm theo quy mô bàn đấu do bài giấu trong Nọc úp:
    // - Bàn 2 người (Solo 1v1): 26 lá bài giấu trong Nọc úp (50% cỗ bài) -> giảm 65% rủi ro
    // - Bàn 3 người: 13 lá bài giấu trong Nọc úp (gần 70% xác suất 1 rank bất kỳ bị mẻ) -> giảm 30% rủi ro
    if (this.playerCount === 2) {
      riskScore *= 0.35; // Giảm 65% độ rủi ro trong 1v1 (tối đa 35 điểm)
    } else if (this.playerCount === 3) {
      riskScore *= 0.70; // Giảm 30% độ rủi ro trong bàn 3 người (tối đa 70 điểm)
    }

    riskScore = Math.min(100, Math.round(riskScore));

    return {
      isSafe: dangerousRanks.length === 0,
      dangerousFourOfAKindRanks: dangerousRanks,
      unseenTwosCount: unseenTwos.length,
      unseenRedTwosCount: unseenRedTwos.length,
      riskScore
    };
  }

  /**
   * Tính toán xác suất (0.0 -> 1.0) có Tứ Quý hoặc Hàng Chặt ẩn ngoài bàn:
   * Càng nhiều lượt trôi qua mà một Rank hoàn toàn chưa lộ diện lá nào thì xác suất đang nằm trong tay đối thủ càng cao.
   */
  public getBombProbability(): number {
    const dangerousRanks = this.getDangerousFourOfAKindRanks();
    if (dangerousRanks.length === 0) return 0.0;

    // 1. Trong bàn 2 người (Solo 1v1): Có tới 26 lá bài nằm trong nọc úp (50% cỗ bài)
    if (this.playerCount === 2) {
      const playedRatio = this.playedCards.size / 26;
      const probability = Math.min(0.2, dangerousRanks.length * 0.03 * (1 + playedRatio));
      return Number(probability.toFixed(3));
    }

    // 2. Trong bàn 3 người: Có 13 lá bài nằm trong nọc úp (25% cỗ bài)
    // Gần 70% xác suất 1 rank bị mẻ ít nhất 1 lá vào nọc, làm giảm đáng kể khả năng gom Tứ Quý
    if (this.playerCount === 3) {
      const playedRatio = this.playedCards.size / 39;
      const probability = Math.min(0.5, dangerousRanks.length * 0.12 * (1 + playedRatio));
      return Number(probability.toFixed(3));
    }

    // 3. Trong bàn 4 người: Toàn bộ 52 lá đều được chia hết (0 lá nọc)
    const playedRatio = this.playedCards.size / 52;
    // Càng nhiều bài đã ra trên bàn mà rank vẫn 0 lá -> xác suất gom tứ quý càng cao
    const probability = Math.min(1.0, dangerousRanks.length * 0.25 * (1 + playedRatio));
    return probability;
  }

  /**
   * Kiểm tra xem lá bài này có đang là lá to nhất còn lại trên toàn bộ ván đấu hay không
   */
  public isStrongestRemainingSingle(card: Card): boolean {
    if (isTwo(card)) {
      // Nếu là 2 Cơ (15_HEARTS) thì luôn là to nhất
      if (card.suit === 'HEARTS') return true;
      // Kiểm tra xem các con 2 to hơn đã ra chưa
      const unseenTwos = this.getUnseenTwos();
      return !unseenTwos.some(t => t.weight > card.weight);
    }

    // Với các lá rác thông thường (3 -> A)
    for (const rank of ALL_RANKS) {
      for (const suit of ALL_SUITS) {
        const otherCard = createCard(rank, suit);
        if (otherCard.weight > card.weight && !isTwo(otherCard)) {
          if (!this.playedCards.has(otherCard.id) && !this.ownHandCardIds.has(otherCard.id)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  public getOpponentBlindspotsSummary(): Record<string, string[]> {
    const summary: Record<string, string[]> = {};
    for (const [playerId, types] of this.opponentPasses.entries()) {
      summary[playerId] = Array.from(types).map(t => {
        if (t === 'STRAIGHT') {
          const lengths = Array.from(this.opponentStraightPasses.get(playerId) || []);
          return lengths.length > 0 ? `Sảnh (${lengths.join(', ')} lá)` : 'Sảnh';
        }
        if (t === 'PAIR') return 'Đôi';
        if (t === 'TRIPLE') return 'Sám';
        if (t === 'THREE_PAIRS_SEQUENTIAL') return '3 Đôi Thông';
        if (t === 'FOUR_OF_A_KIND') return 'Tứ Quý';
        return t;
      });
    }
    return summary;
  }

  private recomputeRankCounts(): void {
    this.rankCountOnBoardAndHand.clear();
    for (const rank of ALL_RANKS) {
      this.rankCountOnBoardAndHand.set(rank, 0);
    }

    for (const rank of ALL_RANKS) {
      for (const suit of ALL_SUITS) {
        const card = createCard(rank, suit);
        if (this.playedCards.has(card.id) || this.ownHandCardIds.has(card.id)) {
          const current = this.rankCountOnBoardAndHand.get(rank) || 0;
          this.rankCountOnBoardAndHand.set(rank, current + 1);
        }
      }
    }
  }
}

