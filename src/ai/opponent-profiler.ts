import { Card, Combination } from '../engine/types';
import { isTwo } from '../engine/card';
import { 
  saveHumanBehaviorProfile, 
  loadHumanBehaviorProfile, 
  clearHumanBehaviorProfile,
  loadPlayerProfile 
} from '../engine/storage';

import {
  OpponentBehaviorProfileSchema,
  type OpponentBehaviorProfile
} from '../engine/schemas/behavior.schema';

export type { OpponentBehaviorProfile };

export interface PlayerActionRecord {
  playerId: string;
  actionType: 'PLAY' | 'PASS' | 'CHOP';
  cards: Card[] | null;
  combination: Combination | null;
  handSizeBeforeAction: number;
  isLeadMove: boolean;
  isNextPlayerOneCard: boolean;
}

export function createDefaultOpponentProfile(playerId: string): OpponentBehaviorProfile {
  return OpponentBehaviorProfileSchema.parse({ playerId });
}

export function isOpponentBehaviorProfile(value: unknown): value is OpponentBehaviorProfile {
  return OpponentBehaviorProfileSchema.safeParse(value).success;
}

/**
 * Trình theo dõi và học thói quen tâm lý của đối thủ qua nhiều ván đấu (Opponent Profiler)
 */
export class OpponentProfiler {
  private static instance: OpponentProfiler | null = null;
  private primaryPlayerId: string = loadPlayerProfile().id;
  private profiles = new Map<string, OpponentBehaviorProfile>();
  private sessionActions = new Map<string, PlayerActionRecord[]>();

  private constructor() {
    this.loadPersistentProfiles();
  }

  public static getInstance(): OpponentProfiler {
    if (!OpponentProfiler.instance) {
      OpponentProfiler.instance = new OpponentProfiler();
    }
    return OpponentProfiler.instance;
  }

  public setPrimaryPlayerId(id: string): void {
    this.primaryPlayerId = id;
  }

  public getPrimaryPlayerId(): string {
    return this.primaryPlayerId;
  }

  private loadPersistentProfiles(): void {
    const savedHuman = loadHumanBehaviorProfile();
    if (savedHuman && isOpponentBehaviorProfile(savedHuman)) {
      this.profiles.set(this.primaryPlayerId, savedHuman);
    }
  }

  public getProfile(playerId: string): OpponentBehaviorProfile {
    const existing = this.profiles.get(playerId);
    if (existing) {
      return existing;
    }
    if (playerId === this.primaryPlayerId) {
      const savedHuman = loadHumanBehaviorProfile();
      if (savedHuman && isOpponentBehaviorProfile(savedHuman)) {
        this.profiles.set(this.primaryPlayerId, savedHuman);
        return savedHuman;
      }
    }
    const defaultProf = createDefaultOpponentProfile(playerId);
    this.profiles.set(playerId, defaultProf);
    return defaultProf;
  }

  public getAllProfiles(): Record<string, OpponentBehaviorProfile> {
    const record: Record<string, OpponentBehaviorProfile> = {};
    for (const [id, prof] of this.profiles.entries()) {
      record[id] = prof;
    }
    return record;
  }

  public recordCardPlay(
    playerId: string,
    cards: Card[],
    combination: Combination,
    handSizeBeforeMove: number,
    isLeadMove: boolean,
    isNextPlayerOneCard: boolean = false
  ): void {
    const history = this.sessionActions.get(playerId) ?? [];
    history.push({
      playerId,
      actionType: 'PLAY',
      cards,
      combination,
      handSizeBeforeAction: handSizeBeforeMove,
      isLeadMove,
      isNextPlayerOneCard
    });
    this.sessionActions.set(playerId, history);
  }

  public recordPass(
    playerId: string,
    targetMoveCombination: Combination,
    handSize: number,
    isNextPlayerOneCard: boolean = false
  ): void {
    const history = this.sessionActions.get(playerId) ?? [];
    history.push({
      playerId,
      actionType: 'PASS',
      cards: null,
      combination: targetMoveCombination || null,
      handSizeBeforeAction: handSize,
      isLeadMove: false,
      isNextPlayerOneCard
    });
    this.sessionActions.set(playerId, history);
  }

  public recordChop(chopperId: string): void {
    const history = this.sessionActions.get(chopperId) ?? [];
    history.push({
      playerId: chopperId,
      actionType: 'CHOP',
      cards: null,
      combination: null,
      handSizeBeforeAction: 10,
      isLeadMove: false,
      isNextPlayerOneCard: false
    });
    this.sessionActions.set(chopperId, history);
  }

  /**
   * Kết toán và cập nhật mô hình Bayesian Profile khi ván đấu hoàn tất
   */
  public finalizeMatchForPlayer(
    playerId: string,
    remainingCards: Card[]
  ): OpponentBehaviorProfile {
    const current = this.getProfile(playerId);
    const actions = this.sessionActions.get(playerId) ?? [];
    this.sessionActions.delete(playerId);

    if (actions.length === 0) {
      return current;
    }

    // 1. Phân tích Heo Greed: Đối thủ có giữ 2 đến cờ tàn (<= 3 lá) hoặc bị thối 2 không
    let twosHeldLateCount = 0;
    let totalTwosPlayed = 0;

    for (const act of actions) {
      if (act.cards?.some(isTwo)) {
        totalTwosPlayed++;
        if (act.handSizeBeforeAction <= 3) {
          twosHeldLateCount++;
        }
      }
    }

    // Kiểm tra lá bài tồn
    const remainingTwos = remainingCards.filter(isTwo).length;
    const totalTwosInHand = totalTwosPlayed + remainingTwos;
    const matchHeoGreed = totalTwosInHand > 0
      ? (twosHeldLateCount + remainingTwos) / totalTwosInHand
      : current.heoGreedRate;

    // 2. Phân tích Trash Lead: Tỉ lệ xả lá đơn lẻ khi Cầm Cái
    const leadActions = actions.filter(a => a.isLeadMove && a.actionType === 'PLAY');
    const singleLeads = leadActions.filter(a => a.combination?.type === 'SINGLE').length;
    const matchTrashLead = leadActions.length > 0
      ? singleLeads / leadActions.length
      : current.trashLeadRate;

    // 3. Phân tích Chống Đền Bài: Khi người kế tiếp 1 lá, có ra lá to nhất không
    const antiLeaderSituations = actions.filter(a => a.isNextPlayerOneCard && a.actionType === 'PLAY');
    let carefulActions = 0;
    for (const sit of antiLeaderSituations) {
      if (sit.combination?.type !== 'SINGLE' || (sit.cards && sit.cards[0].rank >= 13)) {
        carefulActions++;
      }
    }
    const matchCarefulness = antiLeaderSituations.length > 0
      ? carefulActions / antiLeaderSituations.length
      : current.antiLeaderCarefulness;

    // 4. Phân tích Chop Aggression
    const chopsCount = actions.filter(a => a.actionType === 'CHOP').length;
    const matchChopAggression = chopsCount > 0 ? 0.9 : current.chopAggressionScore;

    // 5. Cập nhật theo hệ số học tập mũ (Exponential Moving Average - EMA)
    const games = current.gamesObserved + 1;
    const alpha = Math.min(0.35, 1.0 / games + 0.1);

    const newHeoGreed = current.heoGreedRate * (1 - alpha) + matchHeoGreed * alpha;
    const newTrashLead = current.trashLeadRate * (1 - alpha) + matchTrashLead * alpha;
    const newCarefulness = current.antiLeaderCarefulness * (1 - alpha) + matchCarefulness * alpha;
    const newChopAggression = current.chopAggressionScore * (1 - alpha) + matchChopAggression * alpha;

    const updatedProfile: OpponentBehaviorProfile = {
      playerId,
      gamesObserved: games,
      totalCardsPlayed: current.totalCardsPlayed + actions.filter(a => a.actionType === 'PLAY').reduce((s, a) => s + (a.cards?.length ?? 0), 0),
      heoGreedRate: Math.max(0.0, Math.min(1.0, newHeoGreed)),
      trashLeadRate: Math.max(0.0, Math.min(1.0, newTrashLead)),
      trapPatienceScore: current.trapPatienceScore,
      chopAggressionScore: Math.max(0.0, Math.min(1.0, newChopAggression)),
      antiLeaderCarefulness: Math.max(0.0, Math.min(1.0, newCarefulness)),
      passRateByType: { ...current.passRateByType },
      lastUpdatedTimestamp: Date.now()
    };

    this.profiles.set(playerId, updatedProfile);
    if (playerId === this.primaryPlayerId) {
      saveHumanBehaviorProfile(updatedProfile);
    }
    return updatedProfile;
  }

  public exportProfiles(): string {
    const data: Record<string, OpponentBehaviorProfile> = {};
    for (const [id, prof] of this.profiles.entries()) {
      data[id] = prof;
    }
    return JSON.stringify(data);
  }

  public importProfiles(jsonStr: string): void {
    try {
      const parsed: unknown = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        for (const [id, prof] of Object.entries(parsed)) {
          const result = OpponentBehaviorProfileSchema.safeParse(prof);
          if (result.success) {
            this.profiles.set(id, result.data);
          }
        }
      }
    } catch {
      // Ignore parse error
    }
  }

  /**
   * Đặt lại bộ nhớ phiên (xóa hành vi của các bot đối thủ khi đổi bàn, nhưng bảo toàn hồ sơ người chơi dài hạn)
   */
  public reset(keepPlayerId: string = this.primaryPlayerId): void {
    this.sessionActions.clear();
    const humanProf = this.profiles.get(keepPlayerId) || loadHumanBehaviorProfile();
    this.profiles.clear();
    if (humanProf && isOpponentBehaviorProfile(humanProf)) {
      this.profiles.set(keepPlayerId, humanProf);
    }
  }

  /**
   * Xóa sạch toàn bộ bộ nhớ và LocalStorage
   */
  public clearAll(): void {
    this.profiles.clear();
    this.sessionActions.clear();
    clearHumanBehaviorProfile();
  }
}
