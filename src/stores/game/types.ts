import type { StateCreator } from 'zustand';
import type {
  MatchPlayer,
  PlayedMove,
  InstantWinType,
  GameRules,
  GameSettings,
  BotPersonaIdTuple,
  CustomBotConfigTuple,
  Card
} from '../../engine/types';
import type { MatchState } from '../../engine/state-machine/types';
import type { QuickTableConfig } from '../../engine/schemas/settings.schema';
import type { CampaignChapter } from '../../engine/campaign';
import type { BotConfig } from '../../ai/types';
import type { MoveHint } from '../../ai/hint-engine';
import type { MatchLogReport } from '../../engine/match-logger';
import type { EloDeltaResult } from '../../engine/elo';
import type { TableStateSyncPacket, OpeningReason } from '../../engine/network/network.schema';
import type { PerspectiveMatchSettlement } from '../../engine/settlement/perspective-settlement';

import type { HandSortMode, TableRenderFrame } from '../../engine/presentation/frame-types';
import type { 
  CampaignNextUnlockedMeta, 
  CampaignAllCompletedMeta, 
  CampaignInProgressMeta, 
  CampaignResultMeta 
} from '../../engine/campaign';
import { createCampaignResultMeta } from '../../engine/campaign';
import type { ChopNotificationData } from '../../engine/session-types';

export type ActiveGameType = 'QUICK' | 'CAMPAIGN' | 'ONLINE';
export type ScreenType = 'LOBBY' | 'GAME_TABLE';

export type { 
  HandSortMode, 
  CampaignNextUnlockedMeta, 
  CampaignAllCompletedMeta, 
  CampaignInProgressMeta, 
  CampaignResultMeta,
  ChopNotificationData
};
export { createCampaignResultMeta };

/**
 * 1. TableConfigSlice:
 * Quản lý toàn bộ cấu hình ván chơi, sảnh, bot personas, mức cược, rules và chapter campaign.
 */
export interface TableConfigSlice {
  activeGameType: ActiveGameType;
  playerCount: number;
  botPersonaIds: BotPersonaIdTuple;
  customBotConfigs: CustomBotConfigTuple<BotConfig>;
  currentCampaignChapter: CampaignChapter | null;

  gameRules: GameRules;
  gameSettings: GameSettings;
  quickTableConfig: QuickTableConfig;

  setActiveGameType: (type: ActiveGameType) => void;
  setPlayerCount: (count: number) => void;
  setBotPersonaIds: (ids: BotPersonaIdTuple) => void;
  updateBotPersonaAt: (index: number, personaId: string) => void;
  setCustomBotConfigs: (configs: CustomBotConfigTuple<Partial<BotConfig>>) => void;
  updateCustomBotConfigAt: (index: number, config: Partial<BotConfig>) => void;
  setCurrentCampaignChapter: (chapter: CampaignChapter | null) => void;

  setGameRules: (rules: GameRules) => void;
  setGameSettings: (settings: GameSettings | ((prev: GameSettings) => GameSettings)) => void;
  updateGameSettings: (partial: Partial<GameSettings>) => void;
  setQuickTableConfig: (config: QuickTableConfig) => void;
  hydrateQuickTableConfig: (config: QuickTableConfig) => void;
}

/**
 * 2. PlayerHandSlice:
 * Quản lý tương tác bài trên tay của người chơi cục bộ (chọn bài, xếp bài, gợi ý AI Hint).
 */
export interface PlayerHandSlice {
  selectedCardIds: Set<string>;
  currentHint: MoveHint | null;
  handSortMode: HandSortMode;
  smartVariantIndex: number;

  setSelectedCardIds: (idsOrUpdater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  toggleCardSelect: (cardId: string) => void;
  clearCardSelection: () => void;
  setCurrentHint: (hint: MoveHint | null) => void;
  setHandSortMode: (mode: HandSortMode) => void;
  toggleHandSortMode: () => void;
  setSmartVariantIndex: (index: number) => void;
}

/**
 * 3. MatchStateSlice:
 * Quản lý trạng thái bàn đấu, chia bài, kết toán và tiếp nhận gói tin đồng bộ mạng.
 */
export interface MatchStateSlice {
  currentScreen: ScreenType;
  myPlayerId: string;
  gameNumber: number;

  // Dealing & Animations
  isDealing: boolean;
  dealtCounts: Record<string, number>;
  dealBanner: string | null;
  openingReason: OpeningReason | null;
  chopNotification: ChopNotificationData | null;
  questToast: { title: string; rewardCoins: number; icon: string } | null;

  // Board State (State Pattern & Discriminated Unions)
  matchState: MatchState;
  players: MatchPlayer[];
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  currentMove: PlayedMove | null;
  winners: MatchPlayer[];
  isGameOver: boolean;
  instantWinType: InstantWinType | null;
  isThreeSpadesWin: boolean;
  botThinkingThought: { botId: string; text: string } | null;
  isFirstMoveOfGame: boolean;
  firstMoveRequiredCard: Card | null;
  isLeadMove: boolean;

  // Match Settlement
  matchPayouts: Record<string, number>;
  loanDeductionAmount: number;
  lastEloDelta: number;
  lastEloBreakdown: EloDeltaResult['breakdown'] | null;
  allEloDeltas: Record<string, number>;
  matchLogReport: MatchLogReport | null;
  campaignResultMeta: CampaignResultMeta | null;
  perspectiveSettlement: PerspectiveMatchSettlement | null;

  // Actions
  setCampaignResultMeta: (meta: CampaignResultMeta | null) => void;
  setPerspectiveSettlement: (settlement: PerspectiveMatchSettlement | null) => void;
  setCurrentScreen: (screen: ScreenType) => void;
  setMyPlayerId: (id: string) => void;
  setGameNumber: (num: number | ((prev: number) => number)) => void;

  setIsDealing: (dealing: boolean) => void;
  setDealtCounts: (countsOrUpdater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setDealBanner: (banner: string | null) => void;
  setOpeningReason: (reason: OpeningReason | null) => void;
  setChopNotification: (notif: ChopNotificationData | null) => void;
  setQuestToast: (toast: { title: string; rewardCoins: number; icon: string } | null) => void;

  setPlayers: (players: MatchPlayer[] | ((prev: MatchPlayer[]) => MatchPlayer[])) => void;
  setCurrentTurnPlayerId: (id: string | null) => void;
  setLeadPlayerId: (id: string | null) => void;
  setCurrentMove: (move: PlayedMove | null) => void;
  setWinners: (winners: MatchPlayer[]) => void;
  setIsGameOver: (gameOver: boolean) => void;
  setInstantWinType: (type?: InstantWinType) => void;
  setIsThreeSpadesWin: (win: boolean) => void;
  setBotThinkingThought: (thought: { botId: string; text: string } | null) => void;
  setIsFirstMoveOfGame: (isFirst: boolean) => void;
  setFirstMoveRequiredCard: (card: Card | null) => void;
  setIsLeadMove: (isLead: boolean) => void;

  setMatchPayouts: (payouts: Record<string, number>) => void;
  setLoanDeductionAmount: (amount: number) => void;
  setLastEloDelta: (delta: number) => void;
  setLastEloBreakdown: (breakdown: EloDeltaResult['breakdown'] | null) => void;
  setAllEloDeltas: (deltas: Record<string, number>) => void;
  setMatchLogReport: (report: MatchLogReport | null) => void;
  setMatchState: (state: MatchState) => void;
  applyMatchState: (state: MatchState) => void;
  applyAuthoritativeTableSync: (sync: TableStateSyncPacket) => void;
  resetMatchState: () => void;
  currentFrame: TableRenderFrame | null;
  setCurrentFrame: (frame: TableRenderFrame | null) => void;
}

export type GameStoreState = TableConfigSlice & PlayerHandSlice & MatchStateSlice;

export type GameSliceCreator<T> = StateCreator<
  GameStoreState,
  [],
  [],
  T
>;
