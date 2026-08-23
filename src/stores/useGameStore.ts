import { create } from 'zustand';
import { Player, PlayedMove, InstantWinType, GameRules, GameSettings, createDefaultGameRules } from '../engine/types';
import { BotConfig } from '../ai/types';
import { CampaignChapter } from '../engine/campaign';
import { MoveHint } from '../ai/hint-engine';

export type ActiveGameType = 'QUICK' | 'RANKED' | 'CAMPAIGN' | 'UNDERGROUND';
export type ScreenType = 'LOBBY' | 'GAME_TABLE';

export interface ChopNotificationData {
  visible: boolean;
  chopperName: string;
  targetName: string;
  amount: number;
}

interface GameState {
  currentScreen: ScreenType;
  activeGameType: ActiveGameType;
  playerCount: number;
  botPersonaIds: [string, string, string];
  customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
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

  // Board State
  players: Player[];
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  currentMove: PlayedMove | null;
  winners: Player[];
  isGameOver: boolean;
  instantWinType?: InstantWinType;

  // Player Hand Interaction
  selectedCardIds: Set<string>;
  currentHint: MoveHint | null;

  // Match Settlement
  matchPayouts: Record<string, number>;
  loanDeductionAmount: number;
  lastEloDelta: number;

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

  setPlayers: (players: Player[]) => void;
  setCurrentTurnPlayerId: (id: string | null) => void;
  setLeadPlayerId: (id: string | null) => void;
  setCurrentMove: (move: PlayedMove | null) => void;
  setWinners: (winners: Player[]) => void;
  setIsGameOver: (gameOver: boolean) => void;
  setInstantWinType: (type?: InstantWinType) => void;

  setSelectedCardIds: (idsOrUpdater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  toggleCardSelect: (cardId: string) => void;
  clearCardSelection: () => void;
  setCurrentHint: (hint: MoveHint | null) => void;

  setMatchPayouts: (payouts: Record<string, number>) => void;
  setLoanDeductionAmount: (amount: number) => void;
  setLastEloDelta: (delta: number) => void;
}

const DEFAULT_PLAYERS: Player[] = [
  {
    id: 'p0',
    name: 'Bạn (Người Chơi)',
    avatar: '🤠',
    isBot: false,
    hand: [],
    playedCards: [],
    score: 20000,
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
    score: 5000,
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
    score: 5000,
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
    score: 5000,
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
  botThinkDelayMs: 850
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

  players: DEFAULT_PLAYERS,
  currentTurnPlayerId: null,
  leadPlayerId: null,
  currentMove: null,
  winners: [],
  isGameOver: false,
  instantWinType: undefined,

  selectedCardIds: new Set<string>(),
  currentHint: null,

  matchPayouts: {},
  loanDeductionAmount: 0,
  lastEloDelta: 0,

  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  setActiveGameType: (type) => set({ activeGameType: type }),
  setPlayerCount: (count) => set({ playerCount: count }),
  setBotPersonaIds: (ids) => set({ botPersonaIds: ids }),
  updateBotPersonaAt: (index, personaId) => set((state) => {
    const updated: [string, string, string] = [...state.botPersonaIds];
    updated[index] = personaId;
    return { botPersonaIds: updated };
  }),
  setCustomBotConfigs: (configs) => set({ customBotConfigs: configs }),
  updateCustomBotConfigAt: (index, config) => set((state) => {
    const updated = [...state.customBotConfigs] as [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
    updated[index] = { ...updated[index], ...config };
    return { customBotConfigs: updated };
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

  setPlayers: (players) => set({ players }),
  setCurrentTurnPlayerId: (id) => set({ currentTurnPlayerId: id }),
  setLeadPlayerId: (id) => set({ leadPlayerId: id }),
  setCurrentMove: (move) => set({ currentMove: move }),
  setWinners: (winners) => set({ winners }),
  setIsGameOver: (gameOver) => set({ isGameOver: gameOver }),
  setInstantWinType: (type) => set({ instantWinType: type }),

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

  setMatchPayouts: (payouts) => set({ matchPayouts: payouts }),
  setLoanDeductionAmount: (amount) => set({ loanDeductionAmount: amount }),
  setLastEloDelta: (delta) => set({ lastEloDelta: delta })
}));
