import { Player, BasePlayer, BotPlayer } from './types';

export type PlayerCreationOverrides = Partial<BasePlayer> & {
  isBot?: boolean;
  botPersonaId?: string | null;
};

/**
 * Tạo 1 đối tượng Player (Người chơi hoặc Bot) với các giá trị mặc định chuẩn xác
 */
export function createPlayer(overrides?: PlayerCreationOverrides): Player {
  const id = overrides?.id ?? ('usr_' + Math.random().toString(36).slice(2, 10));
  if (overrides && overrides.isBot) {
    const botPersonaId = overrides.botPersonaId ?? 'BOT_ELO_1150';
    return createBotPlayer(
      id,
      botPersonaId,
      overrides
    );
  }

  return {
    id,
    name: overrides?.name ?? 'Người Chơi',
    avatar: overrides?.avatar ?? '🤠',
    isBot: false,
    hand: overrides?.hand ?? [],
    playedCards: overrides?.playedCards ?? [],
    score: overrides?.score ?? 50000,
    isPassedCurrentRound: overrides?.isPassedCurrentRound ?? false,
    hasPlayedFirstCard: overrides?.hasPlayedFirstCard ?? false,
    rankPosition: overrides?.rankPosition ?? null,
    instantWinType: overrides?.instantWinType ?? null
  };
}

/**
 * Tạo 1 đối tượng Bot Player với cấu hình chuẩn xác
 */
export function createBotPlayer(
  idOrIndex: string | number,
  personaId: string | null = null,
  overrides: PlayerCreationOverrides | null = null
): BotPlayer {
  const id = typeof idOrIndex === 'number' ? `p${idOrIndex}` : idOrIndex;
  const defaultName = id.startsWith('p') && /^\d+$/.test(id.slice(1)) ? `Bot ${id.slice(1)}` : id;
  const resolvedPersonaId = personaId || overrides?.botPersonaId || 'BOT_ELO_1150';

  return {
    id,
    name: overrides?.name ?? defaultName,
    avatar: overrides?.avatar ?? '🤖',
    isBot: true,
    botPersonaId: resolvedPersonaId,
    hand: overrides?.hand ?? [],
    playedCards: overrides?.playedCards ?? [],
    score: overrides?.score ?? 1000,
    isPassedCurrentRound: overrides?.isPassedCurrentRound ?? false,
    hasPlayedFirstCard: overrides?.hasPlayedFirstCard ?? false,
    rankPosition: overrides?.rankPosition ?? null,
    instantWinType: overrides?.instantWinType ?? null
  };
}

/**
 * Tạo danh sách người chơi cho bàn thử nghiệm chuẩn (Mặc định: 1 Người chơi chính + (count - 1) Bot)
 */
export function createTestPlayers(
  count: number = 4,
  defaultScore: number = 1000,
  botPersonaIds: (string | null)[] | null = null
): Player[] {
  const players: Player[] = [
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
  configs: (Partial<BotPlayer> | null)[] | null = null
): BotPlayer[] {
  const players: BotPlayer[] = [];
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
