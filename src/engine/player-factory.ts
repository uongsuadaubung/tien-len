import { Player } from './types';

/**
 * Tạo 1 đối tượng Player (Người chơi hoặc Bot) với các giá trị mặc định chuẩn xác
 */
export function createPlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'p0',
    name: 'Người Chơi',
    avatar: '🤠',
    isBot: false,
    botPersonaId: null,
    hand: [],
    playedCards: [],
    score: 50000,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false,
    rankPosition: null,
    instantWinType: null,
    ...overrides
  };
}

/**
 * Tạo 1 đối tượng Bot Player với cấu hình tiện lợi
 */
export function createBotPlayer(
  idOrIndex: string | number,
  personaIdOrOverrides?: string | null | Partial<Player>,
  overrides?: Partial<Player>
): Player {
  const id = typeof idOrIndex === 'number' ? `p${idOrIndex}` : idOrIndex;
  
  const personaId = (typeof personaIdOrOverrides === 'string' || personaIdOrOverrides === null)
    ? personaIdOrOverrides
    : null;

  const extra = (typeof personaIdOrOverrides === 'object' && personaIdOrOverrides !== null)
    ? personaIdOrOverrides
    : (overrides || {});

  const defaultName = typeof idOrIndex === 'number'
    ? `Bot ${idOrIndex}`
    : (id.startsWith('p') && /^\d+$/.test(id.slice(1)) ? `Bot ${id.slice(1)}` : id);

  return createPlayer({
    id,
    name: defaultName,
    avatar: '🤖',
    isBot: true,
    botPersonaId: personaId ?? null,
    score: 1000,
    ...extra
  });
}

/**
 * Tạo danh sách người chơi cho bàn thử nghiệm chuẩn (Mặc định: 1 Người chơi p0 + (count - 1) Bot)
 */
export function createTestPlayers(
  count: number = 4,
  defaultScore: number = 1000,
  botPersonaIds?: (string | null)[]
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
    const personaId = botPersonaIds && botPersonaIds[i - 1] !== undefined ? botPersonaIds[i - 1] : null;
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
  configs?: (Partial<Player> | undefined)[]
): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    const cfg = configs?.[i];
    const id = cfg?.id || `p${i}`;
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
