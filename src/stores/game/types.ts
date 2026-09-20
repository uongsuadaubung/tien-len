import type { StateCreator } from 'zustand';
import type { 
  Player, 
  PlayedMove, 
  InstantWinType, 
  GameRules, 
  GameSettings, 
  BotPersonaIdTuple, 
  CustomBotConfigTuple 
} from '../../engine/types';
import type { MatchState } from '../../engine/state-machine/types';
import type { QuickTableConfig } from '../../engine/schemas/settings.schema';
import type { CampaignChapter } from '../../engine/campaign';
import type { BotConfig } from '../../ai/types';
import type { MoveHint } from '../../ai/hint-engine';
import type { MatchLogReport } from '../../engine/match-logger';
import type { EloDeltaResult } from '../../engine/elo';
import type { TableStateSyncPacket } from '../../engine/network/network.schema';
import type { PerspectiveMatchSettlement } from '../../engine/settlement/perspective-settlement';

export type ActiveGameType = 'QUICK' | 'CAMPAIGN' | 'ONLINE';
export type ScreenType = 'LOBBY' | 'GAME_TABLE';
export type HandSortMode = 'NATURAL' | 'SMART_GROUP' | 'BY_SUIT' | 'TWO_PRESERVE';

export interface CampaignNextUnlockedMeta {
  readonly status: 'NEXT_UNLOCKED';
  readonly isUnlockedNext: true;
  readonly isAllCompleted: false;
  readonly nextChapter: CampaignChapter;
  readonly currentWins: number;
}

export interface CampaignAllCompletedMeta {
  readonly status: 'ALL_COMPLETED';
  readonly isUnlockedNext: false;
  readonly isAllCompleted: true;
  readonly nextChapter: null;
  readonly currentWins: number;
}

export interface CampaignInProgressMeta {
  readonly status: 'IN_PROGRESS';
  readonly isUnlockedNext: false;
  readonly isAllCompleted: false;
  readonly nextChapter: null;
  readonly currentWins: number;
}

export type CampaignResultMeta =
  | CampaignNextUnlockedMeta
  | CampaignAllCompletedMeta
  | CampaignInProgressMeta;

export function createCampaignResultMeta(params: {
  readonly isUnlockedNext: boolean;
  readonly isAllCompleted: boolean;
  readonly nextChapter: CampaignChapter | null;
  readonly currentWins: number;
}): CampaignResultMeta {
  if (params.isAllCompleted) {
    return {
      status: 'ALL_COMPLETED',
      isUnlockedNext: false,
      isAllCompleted: true,
      nextChapter: null,
      currentWins: params.currentWins
    };
  }
  if (params.isUnlockedNext && params.nextChapter) {
    return {
      status: 'NEXT_UNLOCKED',
      isUnlockedNext: true,
      isAllCompleted: false,
      nextChapter: params.nextChapter,
      currentWins: params.currentWins
    };
  }
  return {
    status: 'IN_PROGRESS',
    isUnlockedNext: false,
    isAllCompleted: false,
    nextChapter: null,
    currentWins: params.currentWins
  };
}

export interface ChopNotificationData {
  readonly visible: boolean;
  readonly chopperName: string;
  readonly targetName: string;
  readonly amount: number;
  readonly isCascade: boolean;
  readonly chainCount: number;
}

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
  chopNotification: ChopNotificationData | null;
  questToast: { title: string; rewardCoins: number; icon: string } | null;

  // Board State (State Pattern & Discriminated Unions)
  matchState: MatchState;
  players: Player[];
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  currentMove: PlayedMove | null;
  winners: Player[];
  isGameOver: boolean;
  instantWinType: InstantWinType | null;
  isThreeSpadesWin: boolean;
  botThinkingThought: { botId: string; text: string } | null;
  isFirstMoveOfGame: boolean;
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
  setChopNotification: (notif: ChopNotificationData | null) => void;
  setQuestToast: (toast: { title: string; rewardCoins: number; icon: string } | null) => void;

  setPlayers: (players: Player[]) => void;
  setCurrentTurnPlayerId: (id: string | null) => void;
  setLeadPlayerId: (id: string | null) => void;
  setCurrentMove: (move: PlayedMove | null) => void;
  setWinners: (winners: Player[]) => void;
  setIsGameOver: (gameOver: boolean) => void;
  setInstantWinType: (type?: InstantWinType) => void;
  setIsThreeSpadesWin: (win: boolean) => void;
  setBotThinkingThought: (thought: { botId: string; text: string } | null) => void;
  setIsFirstMoveOfGame: (isFirst: boolean) => void;
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
  applyMatchSnapshot: (snapshot: Partial<{
    gameNumber: number;
    players: Player[];
    currentTurnPlayerId: string | null;
    leadPlayerId: string | null;
    currentMove: PlayedMove | null;
    winners: Player[];
    isGameOver: boolean;
    instantWinType: InstantWinType | null;
    isDealing: boolean;
    dealtCounts: Record<string, number>;
    dealBanner: string | null;
    chopNotification: ChopNotificationData | null;
    botThinkingThought: { botId: string; text: string } | null;
    isFirstMoveOfGame: boolean | null;
    isLeadMove: boolean | null;
  }>) => void;
  resetMatchState: () => void;
}

export type GameStoreState = TableConfigSlice & PlayerHandSlice & MatchStateSlice;

export type GameSliceCreator<T> = StateCreator<
  GameStoreState,
  [],
  [],
  T
>;
