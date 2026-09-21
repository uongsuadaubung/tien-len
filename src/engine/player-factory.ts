import { BaseMatchPlayer, BotMatchPlayer, MatchPlayer, PlayerProfile } from './types';

export type PlayerCreationOverrides = Partial<BaseMatchPlayer> & {
  isBot?: boolean;
  botPersonaId?: string | null;
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
    const botPersonaId = overrides.botPersonaId ?? 'BOT_ELO_1150';
    return createBotPlayer(
      id,
      botPersonaId,
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
  idOrIndex: string | number | ({ id?: string; personaId?: string } & PlayerCreationOverrides),
  personaId: string | null = null,
  overrides: PlayerCreationOverrides | null = null
): BotMatchPlayer {
  if (typeof idOrIndex === 'object' && idOrIndex !== null) {
    const opts = idOrIndex;
    const rawId = opts.id || 'bot';
    const resolvedPersonaId = opts.botPersonaId || opts.personaId || personaId || 'BOT_ELO_1150';
    const hand = opts.hand ?? [];
    const cardCount = opts.cardCount !== undefined ? opts.cardCount : hand.length;
    return {
      id: rawId,
      name: opts.name ?? rawId,
      avatar: opts.avatar ?? '🤖',
      isBot: true,
      botPersonaId: resolvedPersonaId,
      hand,
      cardCount,
      playedCards: opts.playedCards ?? [],
      score: opts.score ?? 1000,
      isPassedCurrentRound: opts.isPassedCurrentRound ?? false,
      hasPlayedFirstCard: opts.hasPlayedFirstCard ?? false
    };
  }

  const id = typeof idOrIndex === 'number' ? `p${idOrIndex}` : idOrIndex;
  const defaultName = typeof id === 'string' && id.startsWith('p') && /^\d+$/.test(id.slice(1)) ? `Bot ${id.slice(1)}` : String(id);
  const resolvedPersonaId = personaId || overrides?.botPersonaId || 'BOT_ELO_1150';
  const hand = overrides?.hand ?? [];
  const cardCount = overrides?.cardCount !== undefined ? overrides.cardCount : hand.length;

  return {
    id,
    name: overrides?.name ?? defaultName,
    avatar: overrides?.avatar ?? '🤖',
    isBot: true,
    botPersonaId: resolvedPersonaId,
    hand,
    cardCount,
    playedCards: overrides?.playedCards ?? [],
    score: overrides?.score ?? 1000,
    isPassedCurrentRound: overrides?.isPassedCurrentRound ?? false,
    hasPlayedFirstCard: overrides?.hasPlayedFirstCard ?? false
  };
}

/**
 * Tạo danh sách người chơi cho bàn thử nghiệm chuẩn (Mặc định: 1 Người chơi chính + (count - 1) Bot)
 */
export function createTestPlayers(
  count: number = 4,
  defaultScore: number = 1000,
  botPersonaIds: (string | null)[] | null = null
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
    const personaId = botPersonaIds?.[i - 1] ?? null;
    players.push(
      createBotPlayer(i, personaId, { score: defaultScore })
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
    players.push(
      createBotPlayer(id, cfg?.botPersonaId ?? null, {
        name: cfg?.name,
        avatar: cfg?.avatar,
        score: cfg?.score ?? 1000,
        ...cfg
      })
    );
  }
  return players;
}
