import { BaseMatchPlayer, HumanMatchPlayer, BotMatchPlayer, MatchPlayer, PlayerProfile, Card } from './types';
import type { TableRenderFrame } from './presentation/frame-types';
import type { MatchState } from './state-machine/types';
import type { BotConfig } from '../ai/types';

export interface PlayerSyncContext {
  readonly myPlayerId: string;
  readonly myHand?: readonly Card[];
  readonly passedPlayerIds?: readonly string[];
  readonly remainingCardCounts?: Readonly<Record<string, number>>;
  readonly playerScores?: Readonly<Record<string, number>>;
  readonly currentMoveCards?: readonly Card[];
  readonly currentMovePlayerId?: string | null;
  readonly isGameOver?: boolean;
  readonly revealedPlayers?: readonly MatchPlayer[];
}

/**
 * Single Source of Truth để chuyển đổi trạng thái MatchPlayer từ gói tin TableStateSyncPacket
 * Đảm bảo 100% nhất quán về Fog-of-War, cờ bỏ lượt, số lá bài và lịch sử đánh bài.
 */
export function deriveSynchronizedPlayers(
  currentPlayers: readonly MatchPlayer[],
  ctx: PlayerSyncContext
): MatchPlayer[] {
  const playedCardIds = new Set(ctx.currentMoveCards ? ctx.currentMoveCards.map(c => c.id) : []);

  return currentPlayers.map(p => {
    const isMe = p.id === ctx.myPlayerId;
    const isPassed = ctx.passedPlayerIds?.includes(p.id) ?? false;
    const score = (ctx.playerScores && ctx.playerScores[p.id] !== undefined)
      ? ctx.playerScores[p.id]
      : p.score;

    // 1. Phân giải Hand & CardCount (Bảo vệ tuyệt đối Fog-of-War)
    let hand: Card[];
    let cardCount: number;

    if (isMe) {
      hand = ctx.myHand ? [...ctx.myHand] : [...p.hand];
      if (p.id === ctx.currentMovePlayerId && playedCardIds.size > 0) {
        hand = hand.filter(c => !playedCardIds.has(c.id));
      }
      cardCount = hand.length;
    } else if (ctx.isGameOver && ctx.revealedPlayers) {
      const revealed = ctx.revealedPlayers.find(rp => rp.id === p.id);
      if (revealed && revealed.hand && revealed.hand.length > 0 && revealed.hand.every(c => c !== null)) {
        hand = [...revealed.hand];
      } else {
        hand = [];
      }
      cardCount = ctx.remainingCardCounts?.[p.id] ?? (hand.length > 0 ? hand.length : p.cardCount);
    } else {
      hand = [];
      cardCount = ctx.remainingCardCounts?.[p.id] ?? (
        p.id === ctx.currentMovePlayerId
          ? Math.max(0, p.cardCount - playedCardIds.size)
          : p.cardCount
      );
    }

    // 2. Phân giải Lịch sử lá bài đã đánh (Played Cards)
    let playedCards = p.playedCards ? [...p.playedCards] : [];
    if (p.id === ctx.currentMovePlayerId && ctx.currentMoveCards && ctx.currentMoveCards.length > 0) {
      const existingIds = new Set(playedCards.map(c => c.id));
      const newlyPlayed = ctx.currentMoveCards.filter(c => !existingIds.has(c.id));
      if (newlyPlayed.length > 0) {
        playedCards = [...playedCards, ...newlyPlayed];
      }
    }

    return {
      ...p,
      hand,
      cardCount,
      isPassedCurrentRound: isPassed,
      playedCards,
      score
    };
  });
}

/**
 * Single Source of Truth để đồng bộ danh sách MatchPlayer từ TableRenderFrame vào Zustand Store
 */
export function syncStorePlayersFromFrame(
  prevPlayers: readonly MatchPlayer[] | undefined | null,
  frame: TableRenderFrame,
  matchState: MatchState
): MatchPlayer[] {
  const safePlayers: readonly MatchPlayer[] = (prevPlayers && prevPlayers.length > 0) ? prevPlayers : matchState.players;
  const isGameOver = matchState.status === 'GAME_OVER';
  const myCards = frame.myHand ? frame.myHand.map(h => h.card) : [];

  return safePlayers.map((p: MatchPlayer) => {
    const isMe = p.id === frame.localPlayerId;
    const seat = frame.seats.find(s => s.playerId === p.id);
    const isPassed = seat?.isPassed ?? p.isPassedCurrentRound;
    const score = seat?.score !== undefined ? seat.score : p.score;

    if (isMe) {
      const isHandEqual = p.hand.length === myCards.length &&
        p.hand.every((c, idx) => c.id === myCards[idx]?.id);
      if (isHandEqual && p.cardCount === myCards.length && p.isPassedCurrentRound === isPassed && p.score === score) {
        return p;
      }
      return {
        ...p,
        hand: myCards,
        cardCount: myCards.length,
        isPassedCurrentRound: isPassed,
        score
      };
    }

    if (isGameOver) {
      const revealed = matchState.players.find(mp => mp.id === p.id);
      if (revealed && revealed.hand && revealed.hand.length > 0 && revealed.hand.every(c => c !== null)) {
        const targetCount = seat?.cardCount ?? revealed.hand.length;
        const isHandEqual = p.hand.length === revealed.hand.length &&
          p.hand.every((c, idx) => c.id === revealed.hand[idx]?.id);
        if (isHandEqual && p.cardCount === targetCount && p.isPassedCurrentRound === isPassed && p.score === score) {
          return p;
        }
        return {
          ...p,
          hand: [...revealed.hand],
          cardCount: targetCount,
          isPassedCurrentRound: isPassed,
          score
        };
      }
    }

    const targetCount = seat?.cardCount ?? p.cardCount;
    if (p.cardCount === targetCount && p.isPassedCurrentRound === isPassed && p.score === score && p.hand.length === 0) {
      return p;
    }

    return {
      ...p,
      hand: [],
      cardCount: targetCount,
      isPassedCurrentRound: isPassed,
      score
    };
  });
}

/**
 * Single Source of Truth để nhân bản bất biến 1 MatchPlayer và đồng bộ các trường liên đới
 */
export function cloneMatchPlayer(
  player: MatchPlayer,
  overrides?: Partial<MatchPlayer>
): MatchPlayer {
  const hand = overrides?.hand ? [...overrides.hand] : [...player.hand];
  const playedCards = overrides?.playedCards ? [...overrides.playedCards] : [...player.playedCards];
  const cardCount = overrides?.cardCount !== undefined
    ? overrides.cardCount
    : (overrides?.hand ? hand.length : player.cardCount);
  const isPassed = overrides?.isPassedCurrentRound !== undefined
    ? overrides.isPassedCurrentRound
    : player.isPassedCurrentRound;

  if (player.isBot) {
    const botPersonaId = (overrides && 'botPersonaId' in overrides && overrides.botPersonaId)
      ? overrides.botPersonaId
      : player.botPersonaId;
    const cloned: BotMatchPlayer = {
      ...player,
      ...overrides,
      isBot: true,
      botPersonaId,
      hand,
      playedCards,
      cardCount,
      isPassedCurrentRound: isPassed
    };
    return cloned;
  }

  const cloned: HumanMatchPlayer = {
    ...player,
    ...overrides,
    isBot: false,
    botPersonaId: undefined,
    hand,
    playedCards,
    cardCount,
    isPassedCurrentRound: isPassed
  };
  return cloned;
}

/**
 * Single Source of Truth để nhân bản bất biến toàn bộ danh sách MatchPlayer
 */
export function cloneMatchPlayers(players: readonly MatchPlayer[]): MatchPlayer[] {
  return players.map(p => cloneMatchPlayer(p));
}

/**
 * Single Source of Truth để cập nhật một người chơi cụ thể trong danh sách
 */
export function updatePlayerInList(
  players: readonly MatchPlayer[],
  targetPlayerId: string,
  updaterOrChanges: Partial<MatchPlayer> | ((p: MatchPlayer) => Partial<MatchPlayer>)
): MatchPlayer[] {
  return players.map(p => {
    if (p.id !== targetPlayerId) return p;
    const changes = typeof updaterOrChanges === 'function' ? updaterOrChanges(p) : updaterOrChanges;
    return cloneMatchPlayer(p, changes);
  });
}

/**
 * Single Source of Truth để cập nhật bài trên tay của người chơi và tự động đồng bộ cardCount
 */
export function updatePlayersHand(
  players: readonly MatchPlayer[],
  playerId: string,
  hand: readonly Card[]
): MatchPlayer[] {
  return updatePlayerInList(players, playerId, {
    hand: [...hand],
    cardCount: hand.length
  });
}

/**
 * Single Source of Truth để lật bài đối thủ khi kết thúc ván (Game Over)
 */
export function revealPlayersHands(
  players: readonly MatchPlayer[],
  allHands: Readonly<Record<string, readonly Card[]>>
): MatchPlayer[] {
  return players.map(p => {
    const revealed = allHands[p.id];
    if (revealed && revealed.length > 0) {
      return cloneMatchPlayer(p, {
        hand: [...revealed],
        cardCount: revealed.length
      });
    }
    return p;
  });
}

/**
 * Single Source of Truth để áp dụng Fog-of-War: Giữ bài của mình, che bài đối thủ (hand = [])
 */
export function maskOpponentHands(
  players: readonly MatchPlayer[],
  localPlayerId: string
): MatchPlayer[] {
  return players.map(p => {
    if (p.id === localPlayerId) {
      return cloneMatchPlayer(p);
    }
    return cloneMatchPlayer(p, {
      hand: [],
      cardCount: p.cardCount !== undefined ? p.cardCount : p.hand.length
    });
  });
}

/**
 * Single Source of Truth để reset sạch sẽ trạng thái tất cả người chơi khi bắt đầu một ván đấu mới (Ván 1 hoặc Rematch)
 * - localPlayerId: giữ nguyên hand đã chia, cardCount = hand.length, playedCards = [], isPassed = false, hasPlayedFirstCard = false
 * - Đối thủ: che bài (hand = []), cardCount = defaultCardCount (mặc định 13), playedCards = [], isPassed = false, hasPlayedFirstCard = false
 */
export function resetPlayersForNewGame(
  players: readonly MatchPlayer[],
  localPlayerId: string,
  localHand: readonly Card[],
  defaultCardCount: number = 13
): MatchPlayer[] {
  return players.map(p => {
    const isMe = p.id === localPlayerId;
    if (isMe) {
      return cloneMatchPlayer(p, {
        hand: [...localHand],
        cardCount: localHand.length,
        playedCards: [],
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false
      });
    }

    return cloneMatchPlayer(p, {
      hand: [],
      cardCount: defaultCardCount,
      playedCards: [],
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    });
  });
}

export type PlayerCreationOverrides = Partial<BaseMatchPlayer> & {
  isBot?: boolean;
  botPersonaId?: string | null;
  customBotConfig?: Partial<BotConfig>;
};

/**
 * Chuyển đổi từ PlayerProfile (Dữ liệu lưu trữ người dùng) sang MatchPlayer (Thực thể tham gia bàn đấu)
 */
export function createMatchPlayerFromProfile(
  profile: PlayerProfile,
  overrides?: PlayerCreationOverrides
): MatchPlayer {
  return createPlayer({
    id: profile.id,
    name: profile.name || 'Người Chơi',
    avatar: profile.avatar || '🤠',
    score: profile.coins,
    ...overrides
  });
}

/**
 * Tạo 1 đối tượng MatchPlayer (Người chơi hoặc Bot) với các giá trị mặc định chuẩn xác
 */
export function createPlayer(overrides?: PlayerCreationOverrides): MatchPlayer {
  const id = overrides?.id ?? ('usr_' + Math.random().toString(36).slice(2, 10));
  if (overrides && overrides.isBot) {
    if (!overrides.botPersonaId) {
      throw new Error('[createPlayer] Invariant Violated: botPersonaId is strictly required when isBot = true');
    }
    return createBotPlayer(
      id,
      overrides.botPersonaId,
      overrides
    );
  }

  const hand = overrides?.hand ?? [];
  const cardCount = overrides?.cardCount !== undefined ? overrides.cardCount : hand.length;
  return {
    id,
    name: overrides?.name ?? 'Người Chơi',
    avatar: overrides?.avatar ?? '🤠',
    isBot: false,
    hand,
    cardCount,
    playedCards: overrides?.playedCards ?? [],
    score: overrides?.score ?? 50000,
    isPassedCurrentRound: overrides?.isPassedCurrentRound ?? false,
    hasPlayedFirstCard: overrides?.hasPlayedFirstCard ?? false
  };
}

/**
 * Tạo 1 đối tượng Bot MatchPlayer với cấu hình chuẩn xác
 */
export function createBotPlayer(
  idOrIndex: string | number,
  botPersonaId: string = 'BOT_ELO_1150',
  overrides?: PlayerCreationOverrides
): BotMatchPlayer {
  const id = typeof idOrIndex === 'number' ? `p${idOrIndex}` : idOrIndex;
  const defaultName = id.startsWith('p') && /^\d+$/.test(id.slice(1)) ? `Bot ${id.slice(1)}` : id;
  const hand = overrides?.hand ?? [];
  const cardCount = overrides?.cardCount !== undefined ? overrides.cardCount : hand.length;

  return {
    id,
    name: overrides?.name ?? defaultName,
    avatar: overrides?.avatar ?? '🤖',
    isBot: true,
    botPersonaId,
    hand,
    cardCount,
    playedCards: overrides?.playedCards ?? [],
    score: overrides?.score ?? 1000,
    isPassedCurrentRound: overrides?.isPassedCurrentRound ?? false,
    hasPlayedFirstCard: overrides?.hasPlayedFirstCard ?? false,
    customBotConfig: overrides?.customBotConfig
  };
}

/**
 * Tạo danh sách người chơi cho bàn thử nghiệm chuẩn (Mặc định: 1 Người chơi chính + (count - 1) Bot)
 */
export function createTestPlayers(
  count: number = 4,
  defaultScore: number = 1000,
  botPersonaIds: readonly (string | null)[] | null = null
): MatchPlayer[] {
  const players: MatchPlayer[] = [
    createPlayer({
      id: 'p0',
      name: 'Người Chơi',
      avatar: '🤠',
      score: defaultScore
    })
  ];

  for (let i = 1; i < count; i++) {
    const personaId = botPersonaIds?.[i - 1] ?? 'BOT_ELO_1150';
    players.push(
      createBotPlayer(`p${i}`, personaId, { score: defaultScore })
    );
  }

  return players;
}

/**
 * Tạo danh sách N bot players (dùng cho các bài test mô phỏng Bot vs Bot)
 */
export function createBotPlayers(
  count: number = 4,
  configs: (Partial<BotMatchPlayer> | null)[] | null = null
): BotMatchPlayer[] {
  const players: BotMatchPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const cfg = configs?.[i] ?? null;
    const id = cfg?.id ?? `p${i}`;
    const personaId = cfg?.botPersonaId ?? 'BOT_ELO_1150';
    players.push(
      createBotPlayer(id, personaId, {
        name: cfg?.name,
        avatar: cfg?.avatar,
        score: cfg?.score ?? 1000,
        ...cfg
      })
    );
  }
  return players;
}
