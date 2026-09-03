import { create } from 'zustand';
import { 
  Player, 
  PlayedMove, 
  InstantWinType, 
  GameRules, 
  GameSettings, 
  createDefaultGameRules,
  BotPersonaIdTuple,
  CustomBotConfigTuple,
  updateTupleAt
} from '../engine/types';
import type { MatchState } from '../engine/state-machine';
import { BotConfig } from '../ai/types';
import { GameSettingsSchema, QuickTableConfigSchema, type QuickTableConfig } from '../engine/schemas/settings.schema';
import { CampaignChapter } from '../engine/campaign';
import { MoveHint } from '../ai/hint-engine';
import { ECONOMY_CONSTANTS } from '../engine/constants/economy';
import { MatchLogReport } from '../engine/match-logger';
import { createPlayer, createBotPlayer } from '../engine/player-factory';
import { dbSaveQuickTableConfig } from '../engine/db/indexed-db';
import { useViewStore } from './useViewStore';

export type ActiveGameType = 'QUICK' | 'CAMPAIGN' | 'ONLINE';
export type ScreenType = 'LOBBY' | 'GAME_TABLE';

export type HandSortMode = 'NATURAL' | 'SMART_GROUP' | 'BY_SUIT' | 'TWO_PRESERVE';

export interface CampaignResultMeta {
  isUnlockedNext: boolean;
  isAllCompleted: boolean;
  nextChapter: CampaignChapter | null;
  currentWins: number;
}

export interface ChopNotificationData {
  visible: boolean;
  chopperName: string;
  targetName: string;
  amount: number;
  isCascade: boolean;
  chainCount: number;
}

interface GameState {
  currentScreen: ScreenType;
  activeGameType: ActiveGameType;
  myPlayerId: string;
  playerCount: number;
  botPersonaIds: BotPersonaIdTuple;
  customBotConfigs: CustomBotConfigTuple<BotConfig>;
  currentCampaignChapter: CampaignChapter | null;
  gameNumber: number;

  // Single Source of Truth for Game Rules & Settings & Table Config
  gameRules: GameRules;
  gameSettings: GameSettings;
  quickTableConfig: QuickTableConfig;

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

  // Player Hand Interaction
  selectedCardIds: Set<string>;
  currentHint: MoveHint | null;
  handSortMode: HandSortMode;
  smartVariantIndex: number;

  // Match Settlement
  matchPayouts: Record<string, number>;
  loanDeductionAmount: number;
  lastEloDelta: number;
  allEloDeltas: Record<string, number>;
  matchLogReport: MatchLogReport | null;
  campaignResultMeta: CampaignResultMeta | null;

  // Actions
  setCampaignResultMeta: (meta: CampaignResultMeta | null) => void;
  setCurrentScreen: (screen: ScreenType) => void;
  setActiveGameType: (type: ActiveGameType) => void;
  setMyPlayerId: (id: string) => void;
  setPlayerCount: (count: number) => void;
  setBotPersonaIds: (ids: [string, string, string]) => void;
  updateBotPersonaAt: (index: number, personaId: string) => void;
  setCustomBotConfigs: (configs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>]) => void;
  updateCustomBotConfigAt: (index: number, config: Partial<BotConfig>) => void;
  setCurrentCampaignChapter: (chapter: CampaignChapter | null) => void;
  setGameNumber: (num: number | ((prev: number) => number)) => void;

  setGameRules: (rules: GameRules) => void;
  setGameSettings: (settings: GameSettings | ((prev: GameSettings) => GameSettings)) => void;
  updateGameSettings: (partial: Partial<GameSettings>) => void;
  setQuickTableConfig: (config: QuickTableConfig) => void;
  hydrateQuickTableConfig: (config: QuickTableConfig) => void;

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

  setSelectedCardIds: (idsOrUpdater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  toggleCardSelect: (cardId: string) => void;
  clearCardSelection: () => void;
  setCurrentHint: (hint: MoveHint | null) => void;
  setHandSortMode: (mode: HandSortMode) => void;
  toggleHandSortMode: () => void;
  setSmartVariantIndex: (index: number) => void;

  setMatchPayouts: (payouts: Record<string, number>) => void;
  setLoanDeductionAmount: (amount: number) => void;
  setLastEloDelta: (delta: number) => void;
  setAllEloDeltas: (deltas: Record<string, number>) => void;
  setMatchLogReport: (report: MatchLogReport | null) => void;
  setMatchState: (state: MatchState) => void;
  applyMatchState: (state: MatchState) => void;
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

const DEFAULT_PLAYERS: Player[] = [
  createPlayer({
    id: 'p0',
    name: 'Bạn (Người Chơi)',
    avatar: '🤠',
    score: ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS
  }),
  createBotPlayer('p1', 'BOT_ELO_850', {
    name: 'Alex',
    avatar: '🧒',
    score: 4850
  }),
  createBotPlayer('p2', 'BOT_ELO_1150', {
    name: 'Kai',
    avatar: '🤠',
    score: 8200
  }),
  createBotPlayer('p3', 'BOT_ELO_1450', {
    name: 'Marcus',
    avatar: '👴',
    score: 16500
  })
];

const DEFAULT_GAME_RULES: GameRules = createDefaultGameRules();
const DEFAULT_GAME_SETTINGS: GameSettings = GameSettingsSchema.parse({});
export const DEFAULT_QUICK_TABLE_CONFIG: QuickTableConfig = QuickTableConfigSchema.parse({});

export const DEFAULT_MATCH_STATE: MatchState = {
  status: 'WAITING',
  gameNumber: 1,
  players: DEFAULT_PLAYERS,
  rules: DEFAULT_GAME_RULES,
  lastWinnerId: null
};

export const useGameStore = create<GameState>((set) => ({
  currentScreen: 'LOBBY',
  activeGameType: 'QUICK',
  myPlayerId: 'p0',
  playerCount: 4,
  botPersonaIds: ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1450'],
  customBotConfigs: [{}, {}, {}],
  currentCampaignChapter: null,
  gameNumber: 1,

  gameRules: DEFAULT_GAME_RULES,
  gameSettings: DEFAULT_GAME_SETTINGS,
  quickTableConfig: DEFAULT_QUICK_TABLE_CONFIG,

  isDealing: false,
  dealtCounts: {},
  dealBanner: null,
  chopNotification: null,
  questToast: null,

  // Board State (State Pattern)
  matchState: DEFAULT_MATCH_STATE,
  players: DEFAULT_PLAYERS,
  currentTurnPlayerId: null,
  leadPlayerId: null,
  currentMove: null,
  winners: [],
  isGameOver: false,
  instantWinType: null,
  isThreeSpadesWin: false,
  botThinkingThought: null,
  isFirstMoveOfGame: false,
  isLeadMove: true,

  selectedCardIds: new Set<string>(),
  currentHint: null,
  handSortMode: 'NATURAL',
  smartVariantIndex: 0,

  matchPayouts: {},
  loanDeductionAmount: 0,
  lastEloDelta: 0,
  allEloDeltas: {},
  matchLogReport: null,
  campaignResultMeta: null,

  setCampaignResultMeta: (meta) => set({ campaignResultMeta: meta }),
  setCurrentScreen: (screen) => {
    useViewStore.getState().setScreen(screen);
    set({ currentScreen: screen });
  },
  setActiveGameType: (type) => set({ activeGameType: type }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setPlayerCount: (count) => set({ playerCount: count }),
  setBotPersonaIds: (ids) => set({ botPersonaIds: ids }),
  updateBotPersonaAt: (index, personaId) => set((state) => ({
    botPersonaIds: updateTupleAt(state.botPersonaIds, index, personaId)
  })),
  setCustomBotConfigs: (configs) => set({ customBotConfigs: configs }),
  updateCustomBotConfigAt: (index, config) => set((state) => {
    const currentConfig = state.customBotConfigs[index] || {};
    const mergedConfig = { ...currentConfig, ...config };
    return {
      customBotConfigs: updateTupleAt(state.customBotConfigs, index, mergedConfig)
    };
  }),
  setCurrentCampaignChapter: (chapter) => set({ currentCampaignChapter: chapter }),
  setGameNumber: (num) => set((state) => ({
    gameNumber: typeof num === 'function' ? num(state.gameNumber) : num
  })),

  setGameRules: (rules) => set({ gameRules: rules }),
  setGameSettings: (settings) => set((state) => ({
    gameSettings: typeof settings === 'function' ? settings(state.gameSettings) : settings
  })),
  updateGameSettings: (partial) => set((state) => ({
    gameSettings: { ...state.gameSettings, ...partial }
  })),
  setQuickTableConfig: (config) => {
    set({ quickTableConfig: config });
    dbSaveQuickTableConfig(config).catch(() => {});
  },
  hydrateQuickTableConfig: (config) => set({ quickTableConfig: config }),

  setIsDealing: (dealing) => set({ isDealing: dealing }),
  setDealtCounts: (countsOrUpdater) => set((state) => ({
    dealtCounts: typeof countsOrUpdater === 'function' ? countsOrUpdater(state.dealtCounts) : countsOrUpdater
  })),
  setDealBanner: (banner) => set({ dealBanner: banner }),
  setChopNotification: (notif) => set({ chopNotification: notif }),
  setQuestToast: (toast) => set({ questToast: toast }),

  setPlayers: (players) => set({
    players: players.map(p => ({ ...p, hand: [...p.hand], playedCards: [...p.playedCards] }))
  }),
  setCurrentTurnPlayerId: (id) => set({ currentTurnPlayerId: id }),
  setLeadPlayerId: (id) => set({ leadPlayerId: id }),
  setCurrentMove: (move) => set({ currentMove: move }),
  setWinners: (winners) => set({
    winners: winners.map(p => ({ ...p, hand: [...p.hand], playedCards: [...p.playedCards] }))
  }),
  setIsGameOver: (gameOver) => set({ isGameOver: gameOver }),
  setInstantWinType: (type) => set({ instantWinType: type }),
  setIsThreeSpadesWin: (win) => set({ isThreeSpadesWin: win }),
  setBotThinkingThought: (thought) => set({ botThinkingThought: thought }),

  setSelectedCardIds: (idsOrUpdater) => set((state) => ({
    selectedCardIds: typeof idsOrUpdater === 'function' ? idsOrUpdater(state.selectedCardIds) : idsOrUpdater
  })),
  toggleCardSelect: (cardId) => set((state) => {
    const next = new Set(state.selectedCardIds);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }
    return { selectedCardIds: next };
  }),
  clearCardSelection: () => set({ selectedCardIds: new Set<string>() }),
  setCurrentHint: (hint) => set({ currentHint: hint }),
  setHandSortMode: (mode) => set({ handSortMode: mode }),
  toggleHandSortMode: () => set((state) => {
    const modes: HandSortMode[] = ['NATURAL', 'SMART_GROUP', 'BY_SUIT', 'TWO_PRESERVE'];
    const currentIdx = modes.indexOf(state.handSortMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    return { handSortMode: modes[nextIdx] };
  }),
  setSmartVariantIndex: (index) => set({ smartVariantIndex: index }),

  setMatchPayouts: (payouts) => set({ matchPayouts: payouts }),
  setLoanDeductionAmount: (amount) => set({ loanDeductionAmount: amount }),
  setLastEloDelta: (delta) => set({ lastEloDelta: delta }),
  setAllEloDeltas: (deltas) => set({ allEloDeltas: deltas }),
  setMatchLogReport: (report) => set({ matchLogReport: report }),
  setMatchState: (matchState) => set({ matchState }),
  applyMatchState: (matchState) => set((prev) => {
    switch (matchState.status) {
      case 'WAITING':
        return {
          matchState,
          gameNumber: matchState.gameNumber,
          players: [...matchState.players],
          isDealing: false,
          isGameOver: false,
          currentTurnPlayerId: null,
          leadPlayerId: null,
          currentMove: null,
          winners: [],
          instantWinType: null
        };
      case 'DEALING':
        return {
          matchState,
          gameNumber: matchState.gameNumber,
          players: [...matchState.players],
          isDealing: true,
          dealtCounts: { ...matchState.dealtCounts },
          dealBanner: matchState.dealBanner,
          isGameOver: false,
          currentTurnPlayerId: null,
          instantWinType: null
        };
      case 'PLAYING':
        return {
          matchState,
          gameNumber: matchState.gameNumber,
          players: [...matchState.players],
          currentTurnPlayerId: matchState.currentTurnPlayerId,
          leadPlayerId: matchState.leadPlayerId,
          currentMove: matchState.leadingMove ? { ...matchState.leadingMove } : null,
          isDealing: false,
          isGameOver: false,
          instantWinType: null,
          isFirstMoveOfGame: matchState.isFirstMoveOfGame,
          isLeadMove: matchState.isLeadMove,
          chopNotification: matchState.chopNotification ? { ...matchState.chopNotification } : null,
          botThinkingThought: matchState.botThinkingThought ? { ...matchState.botThinkingThought } : null
        };
      case 'INSTANT_WIN':
        return {
          matchState,
          gameNumber: matchState.gameNumber,
          players: [...matchState.players],
          winners: [matchState.instantWinner],
          instantWinType: matchState.instantWinType,
          isDealing: false,
          isGameOver: true,
          currentTurnPlayerId: null,
          matchPayouts: { ...matchState.matchPayouts },
          allEloDeltas: { ...matchState.eloDeltas },
          matchLogReport: matchState.matchLogReport
        };
      case 'ROUND_ENDED':
        return {
          matchState,
          gameNumber: matchState.gameNumber,
          players: [...matchState.players],
          currentTurnPlayerId: matchState.nextLeadPlayerId,
          leadPlayerId: matchState.nextLeadPlayerId,
          currentMove: null,
          isDealing: false,
          isGameOver: false,
          instantWinType: null,
          isLeadMove: true,
          chopNotification: matchState.chopNotification ? { ...matchState.chopNotification } : null
        };
      case 'GAME_OVER':
        return {
          matchState,
          gameNumber: matchState.gameNumber,
          players: [...matchState.players],
          winners: [...matchState.winners],
          isDealing: false,
          isGameOver: true,
          currentTurnPlayerId: null,
          matchPayouts: { ...matchState.matchPayouts },
          allEloDeltas: { ...matchState.eloDeltas },
          matchLogReport: matchState.matchLogReport
        };
    }
  }),
  applyMatchSnapshot: (snapshot) => set((state) => ({
    ...state,
    ...(snapshot.gameNumber !== undefined ? { gameNumber: snapshot.gameNumber } : {}),
    ...(snapshot.players !== undefined ? { players: snapshot.players } : {}),
    ...(snapshot.currentTurnPlayerId !== undefined ? { currentTurnPlayerId: snapshot.currentTurnPlayerId } : {}),
    ...(snapshot.leadPlayerId !== undefined ? { leadPlayerId: snapshot.leadPlayerId } : {}),
    ...(snapshot.currentMove !== undefined ? { currentMove: snapshot.currentMove } : {}),
    ...(snapshot.winners !== undefined ? { winners: snapshot.winners } : {}),
    ...(snapshot.isGameOver !== undefined ? { isGameOver: snapshot.isGameOver } : {}),
    ...(snapshot.instantWinType !== undefined ? { instantWinType: snapshot.instantWinType } : {}),
    ...(snapshot.isDealing !== undefined ? { isDealing: snapshot.isDealing } : {}),
    ...(snapshot.dealtCounts !== undefined ? { dealtCounts: snapshot.dealtCounts } : {}),
    ...(snapshot.dealBanner !== undefined ? { dealBanner: snapshot.dealBanner } : {}),
    ...(snapshot.chopNotification !== undefined ? { chopNotification: snapshot.chopNotification } : {}),
    ...(snapshot.botThinkingThought !== undefined ? { botThinkingThought: snapshot.botThinkingThought } : {}),
    ...(snapshot.isFirstMoveOfGame !== undefined ? { isFirstMoveOfGame: snapshot.isFirstMoveOfGame ?? false } : {}),
    ...(snapshot.isLeadMove !== undefined ? { isLeadMove: snapshot.isLeadMove ?? false } : {})
  })),
  resetMatchState: () => set({
    matchState: DEFAULT_MATCH_STATE,
    isDealing: false,
    dealtCounts: {},
    dealBanner: null,
    chopNotification: null,
    questToast: null,
    currentTurnPlayerId: null,
    leadPlayerId: null,
    currentMove: null,
    winners: [],
    isGameOver: false,
    instantWinType: null,
    isThreeSpadesWin: false,
    botThinkingThought: null,
    isFirstMoveOfGame: false,
    isLeadMove: true,
    selectedCardIds: new Set<string>(),
    currentHint: null,
    smartVariantIndex: 0,
    matchPayouts: {},
    loanDeductionAmount: 0,
    lastEloDelta: 0,
    allEloDeltas: {},
    matchLogReport: null,
    campaignResultMeta: null
  })
}));
