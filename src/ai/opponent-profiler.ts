import { Card, Combination, CombinationType } from '../engine/types';
import { isTwo } from '../engine/card';

export interface OpponentBehaviorProfile {
  readonly playerId: string;
  readonly gamesObserved: number;
  readonly totalCardsPlayed: number;
  readonly heoGreedRate: number;              // 0.0 -> 1.0: Tỉ lệ giữ Heo đến cờ tàn (<= 3 lá)
  readonly trashLeadRate: number;             // 0.0 -> 1.0: Tỉ lệ xả rác nhỏ khi Cầm Cái
  readonly trapPatienceScore: number;         // 0.0 -> 1.0: Xu hướng nhịn bài gài bẫy khi có Hàng
  readonly chopAggressionScore: number;       // 0.0 -> 1.0: Mức độ háo hức chặt Heo ngay lập tức
  readonly antiLeaderCarefulness: number;     // 0.0 -> 1.0: Mức độ cảnh giác khi đối thủ kế tiếp báo 1 lá
  readonly passRateByType: Record<CombinationType, number>;
  readonly lastUpdatedTimestamp: number;
}

export interface PlayerActionRecord {
  playerId: string;
  actionType: 'PLAY' | 'PASS' | 'CHOP';
  cards?: Card[];
  combination?: Combination;
  handSizeBeforeAction: number;
  isLeadMove: boolean;
  isNextPlayerOneCard?: boolean;
}

export function createDefaultOpponentProfile(playerId: string): OpponentBehaviorProfile {
  return {
    playerId,
    gamesObserved: 0,
    totalCardsPlayed: 0,
    heoGreedRate: 0.5,
    trashLeadRate: 0.5,
    trapPatienceScore: 0.5,
    chopAggressionScore: 0.5,
    antiLeaderCarefulness: 0.8,
    passRateByType: {
      SINGLE: 0.2,
      PAIR: 0.3,
      TRIPLE: 0.4,
      STRAIGHT: 0.4,
      THREE_PAIRS_SEQUENTIAL: 0.8,
      FOUR_OF_A_KIND: 0.9,
      FOUR_PAIRS_SEQUENTIAL: 0.95,
      FIVE_PAIRS_SEQUENTIAL: 1.0,
      SIX_PAIRS: 1.0,
      DRAGON_STRAIGHT: 1.0,
      SAME_COLOR_13: 1.0,
      FOUR_TWOS: 1.0,
      FIRST_ROUND_FOUR_THREES: 1.0
    },
    lastUpdatedTimestamp: Date.now()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOpponentBehaviorProfile(value: unknown): value is OpponentBehaviorProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.playerId === 'string' &&
    typeof value.gamesObserved === 'number' &&
    typeof value.heoGreedRate === 'number' &&
    typeof value.trashLeadRate === 'number' &&
    typeof value.antiLeaderCarefulness === 'number'
  );
}

/**
 * Trình theo dõi và học thói quen tâm lý của đối thủ qua nhiều ván đấu (Opponent Profiler)
 */
export class OpponentProfiler {
  private static instance: OpponentProfiler | null = null;
  private profiles = new Map<string, OpponentBehaviorProfile>();
  private sessionActions = new Map<string, PlayerActionRecord[]>();

  public static getInstance(): OpponentProfiler {
    if (!OpponentProfiler.instance) {
      OpponentProfiler.instance = new OpponentProfiler();
    }
    return OpponentProfiler.instance;
  }

  public getProfile(playerId: string): OpponentBehaviorProfile {
    const existing = this.profiles.get(playerId);
    if (existing) {
      return existing;
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
      combination: targetMoveCombination,
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
      handSizeBeforeAction: 10,
      isLeadMove: false
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
      if (isRecord(parsed)) {
        for (const [id, prof] of Object.entries(parsed)) {
          if (isOpponentBehaviorProfile(prof)) {
            this.profiles.set(id, prof);
          }
        }
      }
    } catch {
      // Ignore parse error
    }
  }

  public reset(): void {
    this.profiles.clear();
    this.sessionActions.clear();
  }
}
