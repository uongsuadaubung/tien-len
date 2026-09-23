import { z } from 'zod';
import { GameSettlementRuleSchema, PlayerCountSchema } from '../schemas/settings.schema';

export const SuitSchema = z.enum(['SPADES', 'CLUBS', 'DIAMONDS', 'HEARTS']);

export const RankSchema = z.union([
  z.literal(3), z.literal(4), z.literal(5), z.literal(6),
  z.literal(7), z.literal(8), z.literal(9), z.literal(10),
  z.literal(11), z.literal(12), z.literal(13), z.literal(14), z.literal(15)
]);

export const NetworkCardSchema = z.object({
  rank: RankSchema,
  suit: SuitSchema,
  id: z.string()
});

export type NetworkCard = z.infer<typeof NetworkCardSchema>;

export const OnlinePlayerSchema = z.object({
  peerId: z.string(),
  playerId: z.string(),
  name: z.string().default('Đấu Thủ'),
  avatar: z.string().default('🤠'),
  elo: z.number().default(1000),
  coins: z.number().default(50000),
  isHost: z.boolean().default(false),
  isReady: z.boolean().default(false),
  isBot: z.boolean().default(false),
  isDisconnected: z.boolean().optional(),
  disconnectDeadline: z.number().nullable().optional()
});

export type OnlinePlayer = z.infer<typeof OnlinePlayerSchema>;

export const ReconnectNoticeSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  deadline: z.number()
});

export type ReconnectNotice = z.infer<typeof ReconnectNoticeSchema>;

export const RoomStatusSchema = z.enum(['WAITING', 'STARTING', 'PLAYING', 'ENDED', 'DISBANDED']);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const OnlineRoomStateSchema = z.object({
  roomCode: z.string(),
  hostPeerId: z.string(),
  playerCount: PlayerCountSchema.default(4),
  betAmount: z.number().nonnegative().default(1000),
  settlementRule: GameSettlementRuleSchema.default('COUNT_CARDS'),
  choppingMultiplier: z.number().min(1).max(5).default(1),
  congMultiplier: z.number().min(1).max(5).default(1),
  congEnabled: z.boolean().default(true),
  prohibitEndingWithTwo: z.boolean().default(true),
  allowFourPairsCutAnytime: z.boolean().default(true),
  threeSpadesEndingBonus: z.boolean().default(true),
  cascadeChopEnabled: z.boolean().default(true),
  players: z.array(OnlinePlayerSchema),
  status: RoomStatusSchema.default('WAITING'),
  disbandReason: z.string().nullable().default(null),
  isPublic: z.boolean().default(true),
  updatedAt: z.number()
});

export type OnlineRoomState = z.infer<typeof OnlineRoomStateSchema>;

// Tóm tắt thông tin phòng công khai phát thanh lên sảnh chờ
export const PublicRoomSummarySchema = z.object({
  roomCode: z.string(),
  hostName: z.string(),
  hostAvatar: z.string(),
  hostElo: z.number(),
  playerCount: z.number(),
  maxPlayers: z.number(),
  betAmount: z.number(),
  settlementRule: GameSettlementRuleSchema,
  choppingMultiplier: z.number(),
  congMultiplier: z.number().default(1),
  congEnabled: z.boolean(),
  prohibitEndingWithTwo: z.boolean(),
  allowFourPairsCutAnytime: z.boolean(),
  threeSpadesEndingBonus: z.boolean(),
  cascadeChopEnabled: z.boolean(),
  status: RoomStatusSchema,
  isPublic: z.boolean().default(true),
  updatedAt: z.number()
});

export type PublicRoomSummary = z.infer<typeof PublicRoomSummarySchema>;

// Gói tin hành động đánh bài của người chơi
export const PlayerActionPacketSchema = z.object({
  type: z.enum(['PLAY', 'PASS']),
  playerId: z.string(),
  cardIds: z.array(z.string()).optional(),
  timestamp: z.number()
});

export type PlayerActionPacket = z.infer<typeof PlayerActionPacketSchema>;

// Lý do mở màn ván đấu (Ngữ nghĩa cấp cao cho UI / Voiceover / i18n)
export const OpeningReasonSchema = z.enum(['THREE_SPADES', 'SMALLEST_CARD', 'PREVIOUS_WINNER']);
export type OpeningReason = z.infer<typeof OpeningReasonSchema>;

// Sự kiện hành động vừa diễn ra tức thì
export const LastActionTypeSchema = z.enum(['PLAY', 'PASS', 'CHOP']);
export const LastActionSchema = z.object({
  playerId: z.string(),
  type: LastActionTypeSchema,
  summary: z.string()
});
export type LastAction = z.infer<typeof LastActionSchema>;

// Trạng thái ghế ngồi đồng bộ hoàn chỉnh từ Server (Fog-of-War safe)
export const SyncedSeatSnapshotSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  avatar: z.string(),
  cardCount: z.number(),
  score: z.number(),
  isPassed: z.boolean(),
  isCurrentTurn: z.boolean(),
  isBot: z.boolean(),
  wins: z.number().default(0).optional(),
  initialScore: z.number().optional()
});
export type SyncedSeatSnapshot = z.infer<typeof SyncedSeatSnapshotSchema>;

// Gói tin chia bài riêng tư từ Host cho từng Client (Fog of War)
export const DealHandPacketSchema = z.object({
  playerId: z.string().optional(),
  cards: z.array(NetworkCardSchema),
  leadPlayerId: z.string(),
  firstTurnPlayerId: z.string(),
  gameNumber: z.number().default(1),
  lastWinnerId: z.string().nullable().optional(),
  openingReason: OpeningReasonSchema.nullable().optional(),
  turnDeadline: z.number().nullable().optional(),
  isFirstMoveOfGame: z.boolean().optional(),
  firstMoveRequiredCard: NetworkCardSchema.nullable().optional(),
  isLeadMove: z.boolean().optional()
});

export type DealHandPacket = z.infer<typeof DealHandPacketSchema>;

// Thông tin thông báo chặt heo qua mạng
export const NetworkChopNotificationSchema = z.object({
  visible: z.boolean(),
  chopperName: z.string(),
  targetName: z.string(),
  amount: z.number(),
  isCascade: z.boolean(),
  chainCount: z.number()
});

export type NetworkChopNotification = z.infer<typeof NetworkChopNotificationSchema>;

// Gói tin đồng bộ bàn chơi công khai
export const TableStateSyncPacketSchema = z.object({
  seq: z.number().default(0),
  timestamp: z.number().default(() => Date.now()),
  currentTurnPlayerId: z.string().nullable(),
  leadPlayerId: z.string().nullable(),
  currentMoveCards: z.array(NetworkCardSchema).optional(),
  currentMovePlayerId: z.string().optional(),
  currentMoveCombinationType: z.string().optional(),
  currentMoveCombinationName: z.string().nullable().optional(),
  isChop: z.boolean().default(false),
  isCascadeChop: z.boolean().default(false),
  remainingCardCounts: z.record(z.string(), z.number()),
  playerScores: z.record(z.string(), z.number()),
  passedPlayerIds: z.array(z.string()).default([]),
  roundNumber: z.number().default(1),
  chopNotification: NetworkChopNotificationSchema.nullable().optional(),
  winners: z.array(z.string()),
  isGameOver: z.boolean(),
  lastWinnerId: z.string().nullable().optional(),
  openingReason: OpeningReasonSchema.nullable().optional(),
  turnDeadline: z.number().nullable().optional(),
  lastAction: LastActionSchema.nullable().optional(),
  lastActionMessage: z.string().optional(),
  seats: z.array(SyncedSeatSnapshotSchema).optional(),
  gameNumber: z.number().default(1),
  isFirstMoveOfGame: z.boolean().optional(),
  firstMoveRequiredCard: NetworkCardSchema.nullable().optional(),
  isLeadMove: z.boolean().optional(),
  isDealing: z.boolean().optional(),
  dealBanner: z.string().nullable().optional(),
  dealtCounts: z.record(z.string(), z.number()).optional(),
  reconnectNotice: ReconnectNoticeSchema.nullable().optional(),
  playerWins: z.record(z.string(), z.number()).optional(),
  initialScores: z.record(z.string(), z.number()).optional()
});

export type TableStateSyncPacket = z.infer<typeof TableStateSyncPacketSchema>;

export const InstantWinTypeSchema = z.enum([
  'DRAGON_STRAIGHT',
  'FOUR_TWOS',
  'FIVE_PAIRS_SEQUENTIAL',
  'SIX_PAIRS',
  'SAME_COLOR_13',
  'FIRST_ROUND_FOUR_THREES'
]);

// Gói tin kết thúc ván đấu
export const GameEndPacketSchema = z.object({
  winners: z.array(z.string()),
  payouts: z.record(z.string(), z.number()),
  eloDeltas: z.record(z.string(), z.number()),
  playerScores: z.record(z.string(), z.number()),
  allPlayerHands: z.record(z.string(), z.array(NetworkCardSchema)), // Mở bài cho mọi người xem khi ván kết thúc
  isThreeSpadesWin: z.boolean().default(false),
  instantWinType: InstantWinTypeSchema.nullable().default(null),
  loanDeduction: z.number().default(0),
  playerWins: z.record(z.string(), z.number()).optional(),
  initialScores: z.record(z.string(), z.number()).optional()
});

export type GameEndPacket = z.infer<typeof GameEndPacketSchema>;

// Gói tin chat / cảm xúc
export const ChatPacketSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  senderAvatar: z.string(),
  message: z.string(),
  timestamp: z.number()
});

export type ChatPacket = z.infer<typeof ChatPacketSchema>;

// Gói tin bỏ phiếu sẵn sàng / chơi lại ván mới P2P
export const RematchVotePacketSchema = z.object({
  playerId: z.string(),
  isReady: z.boolean(),
  timestamp: z.number()
});

export type RematchVotePacket = z.infer<typeof RematchVotePacketSchema>;

export * from './packet-factory';
