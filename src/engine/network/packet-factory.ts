import type {
  TableStateSyncPacket,
  SyncedSeatSnapshot,
  GameEndPacket,
  DealHandPacket,
  PlayerActionPacket
} from './network.schema';

/**
 * Factory helper tạo TableStateSyncPacket với các giá trị mặc định hợp lệ.
 * Giúp giảm boilerplate trong tests và code nghiệp vụ, tránh vỡ type khi hợp đồng gói tin mở rộng.
 */
export function createTableStateSyncPacket(
  overrides?: Partial<TableStateSyncPacket>
): TableStateSyncPacket {
  const remainingCardCounts = overrides?.remainingCardCounts
    ? { ...overrides.remainingCardCounts }
    : {};

  const passedPlayerIds = overrides?.passedPlayerIds
    ? [...overrides.passedPlayerIds]
    : [];

  const winners = overrides?.winners
    ? [...overrides.winners]
    : [];

  const seats: SyncedSeatSnapshot[] = overrides?.seats
    ? [...overrides.seats]
    : [];

  return {
    seq: 0,
    timestamp: Date.now(),
    gameNumber: 1,
    roundNumber: 1,
    isGameOver: false,
    currentTurnPlayerId: null,
    leadPlayerId: null,
    isChop: false,
    isCascadeChop: false,
    lastWinnerId: null,
    turnDeadline: null,
    openingReason: null,
    lastAction: null,
    currentMoveCombinationName: null,
    seats,
    isFirstMoveOfGame: false,
    isLeadMove: true,
    firstMoveRequiredCard: null,
    isDealing: false,
    dealBanner: null,
    dealtCounts: {},
    ...overrides,
    remainingCardCounts,
    passedPlayerIds,
    winners
  };
}

/**
 * Bí danh (alias) ngắn gọn cho createTableStateSyncPacket.
 */
export const createTableSyncPacket = createTableStateSyncPacket;

/**
 * Factory helper tạo GameEndPacket với các giá trị mặc định hợp lệ.
 */
export function createGameEndPacket(
  overrides?: Partial<GameEndPacket>
): GameEndPacket {
  const winners = overrides?.winners ? [...overrides.winners] : [];
  const payouts = overrides?.payouts ? { ...overrides.payouts } : {};
  const eloDeltas = overrides?.eloDeltas ? { ...overrides.eloDeltas } : {};
  const allPlayerHands = overrides?.allPlayerHands ? { ...overrides.allPlayerHands } : {};

  // Tự động suy diễn playerScores cho tất cả người tham gia xuất hiện trong winners/payouts/elo/hands nếu không truyền
  const participantIds = new Set([
    ...winners,
    ...Object.keys(payouts),
    ...Object.keys(eloDeltas),
    ...Object.keys(allPlayerHands)
  ]);

  const defaultEndScores: Record<string, number> = {};
  for (const pid of participantIds) {
    defaultEndScores[pid] = 50000;
  }
  const playerScores: Record<string, number> = overrides?.playerScores
    ? { ...overrides.playerScores }
    : defaultEndScores;

  return {
    isThreeSpadesWin: false,
    instantWinType: null,
    loanDeduction: 0,
    ...overrides,
    winners,
    payouts,
    eloDeltas,
    playerScores,
    allPlayerHands
  };
}

/**
 * Factory helper tạo DealHandPacket với các giá trị mặc định hợp lệ.
 */
export function createDealHandPacket(
  overrides?: Partial<DealHandPacket>
): DealHandPacket {
  const cards = overrides?.cards ? [...overrides.cards] : [];

  return {
    playerId: '',
    leadPlayerId: '',
    firstTurnPlayerId: '',
    gameNumber: 1,
    lastWinnerId: null,
    openingReason: null,
    turnDeadline: null,
    isFirstMoveOfGame: true,
    isLeadMove: true,
    firstMoveRequiredCard: null,
    ...overrides,
    cards
  };
}

/**
 * Factory helper tạo PlayerActionPacket với các giá trị mặc định hợp lệ.
 */
export function createPlayerActionPacket(
  overrides?: Partial<PlayerActionPacket>
): PlayerActionPacket {
  return {
    type: 'PLAY',
    playerId: '',
    timestamp: Date.now(),
    ...overrides,
    cardIds: overrides?.cardIds ? [...overrides.cardIds] : undefined
  };
}
