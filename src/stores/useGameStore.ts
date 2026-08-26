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
import { BotConfig } from '../ai/types';
import { CampaignChapter } from '../engine/campaign';
import { MoveHint } from '../ai/hint-engine';
import { ECONOMY_CONSTANTS } from '../engine/constants/economy';
import { MatchLogReport } from '../engine/match-logger';

export type ActiveGameType = 'QUICK' | 'CAMPAIGN';
export type ScreenType = 'LOBBY' | 'GAME_TABLE';

export type HandSortMode = 'NATURAL' | 'SMART_GROUP';

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
  playerCount: number;
  botPersonaIds: BotPersonaIdTuple;
  customBotConfigs: CustomBotConfigTuple<BotConfig>;
  currentCampaignChapter: CampaignChapter | null;
  gameNumber: number;

  // Single Source of Truth for Game Rules & Settings
  gameRules: GameRules;
  gameSettings: GameSettings;

  // Dealing & Animations
  isDealing: boolean;
  dealtCounts: Record<string, number>;
  dealBanner: string | null;
  chopNotification: ChopNotificationData | null;
  questToast: { title: string; rewardCoins: number; icon: string } | null;

  // Board State
  players: Player[];
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  currentMove: PlayedMove | null;
  winners: Player[];
  isGameOver: boolean;
  instantWinType?: InstantWinType;
  isThreeSpadesWin: boolean;

  // Player Hand Interaction
  selectedCardIds: Set<string>;
  currentHint: MoveHint | null;
  handSortMode: HandSortMode;
  smartVariantIndex: number;

  // Match Settlement
  matchPayouts: Record<string, number>;
  loanDeductionAmount: number;
  lastEloDelta: number;
  matchLogReport: MatchLogReport | null;

  // Actions
  setCurrentScreen: (screen: ScreenType) => void;
  setActiveGameType: (type: ActiveGameType) => void;
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
  setMatchLogReport: (report: MatchLogReport | null) => void;
  resetMatchState: () => void;
}

const DEFAULT_PLAYERS: Player[] = [
  {
    id: 'p0',
    name: 'Bạn (Người Chơi)',
    avatar: '🤠',
    isBot: false,
    hand: [],
    playedCards: [],
    score: ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  },
  {
    id: 'p1',
    name: 'Alex',
    avatar: '🧒',
    isBot: true,
    botPersonaId: 'BOT_ELO_850',
    hand: [],
    playedCards: [],
    score: 4850,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  },
  {
    id: 'p2',
    name: 'Kai',
    avatar: '🤠',
    isBot: true,
    botPersonaId: 'BOT_ELO_1150',
    hand: [],
    playedCards: [],
    score: 8200,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  },
  {
    id: 'p3',
    name: 'Marcus',
    avatar: '👴',
    isBot: true,
    botPersonaId: 'BOT_ELO_1450',
    hand: [],
    playedCards: [],
    score: 16500,
    isPassedCurrentRound: false,
    hasPlayedFirstCard: false
  }
];

const DEFAULT_GAME_RULES: GameRules = createDefaultGameRules();

const DEFAULT_GAME_SETTINGS: GameSettings = {
  mode: 'TRADITIONAL',
  playerCount: 4,
  betAmount: 100,
  allowFourPairsCutAnytime: true,
  instantWinEnabled: true,
  soundEnabled: true,
  botThinkDelayMs: 850,
  prohibitEndingWithTwo: true,
  threeSpadesEndingBonus: true,
  cascadeChopEnabled: true
};

export const useGameStore = create<GameState>((set) => ({
  currentScreen: 'LOBBY',
  activeGameType: 'QUICK',
  playerCount: 4,
  botPersonaIds: ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1450'],
  customBotConfigs: [{}, {}, {}],
  currentCampaignChapter: null,
  gameNumber: 1,

  gameRules: DEFAULT_GAME_RULES,
  gameSettings: DEFAULT_GAME_SETTINGS,

  isDealing: false,
  dealtCounts: {},
  dealBanner: null,
  chopNotification: null,
  questToast: null,

  players: DEFAULT_PLAYERS,
  currentTurnPlayerId: null,
  leadPlayerId: null,
  currentMove: null,
  winners: [],
  isGameOver: false,
  instantWinType: undefined,
  isThreeSpadesWin: false,

  selectedCardIds: new Set<string>(),
  currentHint: null,
  handSortMode: 'NATURAL',
  smartVariantIndex: 0,

  matchPayouts: {},
  loanDeductionAmount: 0,
  lastEloDelta: 0,
  matchLogReport: null,

  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  setActiveGameType: (type) => set({ activeGameType: type }),
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
  toggleHandSortMode: () => set((state) => ({
    handSortMode: state.handSortMode === 'NATURAL' ? 'SMART_GROUP' : 'NATURAL'
  })),
  setSmartVariantIndex: (index) => set({ smartVariantIndex: index }),

  setMatchPayouts: (payouts) => set({ matchPayouts: payouts }),
  setLoanDeductionAmount: (amount) => set({ loanDeductionAmount: amount }),
  setLastEloDelta: (delta) => set({ lastEloDelta: delta }),
  setMatchLogReport: (report) => set({ matchLogReport: report }),
  resetMatchState: () => set({
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
    instantWinType: undefined,
    isThreeSpadesWin: false,
    selectedCardIds: new Set<string>(),
    currentHint: null,
    smartVariantIndex: 0,
    matchPayouts: {},
    loanDeductionAmount: 0,
    lastEloDelta: 0,
    matchLogReport: null
  })
}));
