import { Card, Combination, CombinationType, PlayedMove, Rank } from '../engine/types';
import { ALL_RANKS, ALL_SUITS, createCard, isRedTwo, isTwo } from '../engine/card';
import { OpponentBlindspot, TwoSafetyReport } from './types';

export class CardTracker {
  private memoryDepth: number; // 0.0 -> 1.0
  private playedCards: Set<string> = new Set();
  private ownHandCardIds: Set<string> = new Set();
  private opponentPasses: Map<string, Set<CombinationType>> = new Map();
  private opponentStraightPasses: Map<string, Set<number>> = new Map(); // playerId -> Set of straight lengths
  private opponentHighestRankPassed: Map<string, Map<CombinationType, number>> = new Map();
  private rankCountOnBoardAndHand: Map<Rank, number> = new Map();

  constructor(initialHand: Card[] = [], memoryDepth = 1.0) {
    this.memoryDepth = memoryDepth;
    this.updateOwnHand(initialHand || []);
  }

  public updateOwnHand(hand: Card[] = []): void {
    this.ownHandCardIds.clear();
    for (const card of hand || []) {
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

    return {
      isSafe: dangerousRanks.length === 0,
      dangerousFourOfAKindRanks: dangerousRanks,
      unseenTwosCount: unseenTwos.length,
      unseenRedTwosCount: unseenRedTwos.length,
      riskScore
    };
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

