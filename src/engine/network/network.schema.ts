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
  playerId: z.string(), // 'p0', 'p1', 'p2', 'p3'
  name: z.string().default('Đấu Thủ'),
  avatar: z.string().default('🤠'),
  elo: z.number().default(1000),
  coins: z.number().default(50000),
  isHost: z.boolean().default(false),
  isReady: z.boolean().default(false),
  isBot: z.boolean().default(false)
});

export type OnlinePlayer = z.infer<typeof OnlinePlayerSchema>;

export const RoomStatusSchema = z.enum(['WAITING', 'STARTING', 'PLAYING', 'ENDED', 'DISBANDED']);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const OnlineRoomStateSchema = z.object({
  roomCode: z.string(),
  hostPeerId: z.string(),
  playerCount: PlayerCountSchema.default(4),
  betAmount: z.number().nonnegative().default(1000),
  settlementRule: GameSettlementRuleSchema.default('COUNT_CARDS'),
  choppingMultiplier: z.number().min(1).max(5).default(1),
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

// Gói tin chia bài riêng tư từ Host cho từng Client (Fog of War)
export const DealHandPacketSchema = z.object({
  playerId: z.string().optional(),
  cards: z.array(NetworkCardSchema),
  leadPlayerId: z.string(),
  firstTurnPlayerId: z.string(),
  gameNumber: z.number().default(1),
  isFirstMoveOfGame: z.boolean().optional(),
  isLeadMove: z.boolean().optional()
});

export type DealHandPacket = z.infer<typeof DealHandPacketSchema>;

// Gói tin đồng bộ bàn chơi công khai
export const TableStateSyncPacketSchema = z.object({
  currentTurnPlayerId: z.string().nullable(),
  leadPlayerId: z.string().nullable(),
  currentMoveCards: z.array(NetworkCardSchema).optional(),
  currentMovePlayerId: z.string().optional(),
  remainingCardCounts: z.record(z.string(), z.number()),
  winners: z.array(z.string()),
  isGameOver: z.boolean(),
  lastActionMessage: z.string().optional(),
  gameNumber: z.number().default(1),
  isFirstMoveOfGame: z.boolean().optional(),
  isLeadMove: z.boolean().optional()
});

export type TableStateSyncPacket = z.infer<typeof TableStateSyncPacketSchema>;

// Gói tin kết thúc ván đấu
export const GameEndPacketSchema = z.object({
  winners: z.array(z.string()),
  payouts: z.record(z.string(), z.number()),
  eloDeltas: z.record(z.string(), z.number()),
  allPlayerHands: z.record(z.string(), z.array(NetworkCardSchema)) // Mở bài cho mọi người xem khi ván kết thúc
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

