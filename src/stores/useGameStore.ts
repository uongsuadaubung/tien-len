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
import { type MatchState, mapMatchStateToSnapshot } from '../engine/state-machine';
import { 
  createPlayingTurnMatchState, 
  type PlayingTurnMatchState, 
  type GameOverMatchState 
} from '../engine/state-machine/types';
import { createCard } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { GameEventBus } from '../engine/events/game-event-bus';
import { type TableStateSyncPacket } from '../engine/network/network.schema';
import { BotConfig } from '../ai/types';
import { GameSettingsSchema, QuickTableConfigSchema, type QuickTableConfig } from '../engine/schemas/settings.schema';
import { CampaignChapter } from '../engine/campaign';
import { MoveHint } from '../ai/hint-engine';
import { ECONOMY_CONSTANTS } from '../engine/constants/economy';
import { MatchLogReport } from '../engine/match-logger';
import { createPlayer, createBotPlayer } from '../engine/player-factory';
import { dbSaveQuickTableConfig } from '../engine/db/indexed-db';
import { useViewStore } from './useViewStore';
import { EloDeltaResult } from '../engine/elo';
import { loadPlayerProfile } from '../engine/storage';

export type ActiveGameType = 'QUICK' | 'CAMPAIGN' | 'ONLINE';
export type ScreenType = 'LOBBY' | 'GAME_TABLE';

export type HandSortMode = 'NATURAL' | 'SMART_GROUP' | 'BY_SUIT' | 'TWO_PRESERVE';

export interface CampaignNextUnlockedMeta {
  status: 'NEXT_UNLOCKED';
  isUnlockedNext: true;
  isAllCompleted: false;
  nextChapter: CampaignChapter;
  currentWins: number;
}

export interface CampaignAllCompletedMeta {
  status: 'ALL_COMPLETED';
  isUnlockedNext: false;
  isAllCompleted: true;
  nextChapter: null;
  currentWins: number;
}

export interface CampaignInProgressMeta {
  status: 'IN_PROGRESS';
  isUnlockedNext: false;
  isAllCompleted: false;
  nextChapter: null;
  currentWins: number;
}

export type CampaignResultMeta =
  | CampaignNextUnlockedMeta
  | CampaignAllCompletedMeta
  | CampaignInProgressMeta;

export function createCampaignResultMeta(params: {
  isUnlockedNext: boolean;
  isAllCompleted: boolean;
  nextChapter: CampaignChapter | null;
  currentWins: number;
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
  lastEloBreakdown: EloDeltaResult['breakdown'] | null;
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
  setIsFirstMoveOfGame: (isFirst: boolean) => void;
  setIsLeadMove: (isLead: boolean) => void;

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

const initialProfile = loadPlayerProfile();

const DEFAULT_PLAYERS: Player[] = [
  createPlayer({
    id: initialProfile.id,
    name: initialProfile.name || 'Bạn (Người Chơi)',
    avatar: initialProfile.avatar || '🤠',
    score: initialProfile.coins ?? ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS
  }),
  createBotPlayer('bot_alex', 'BOT_ELO_850', {
    name: 'Alex',
    avatar: '🧒',
    score: 4850
  }),
  createBotPlayer('bot_kai', 'BOT_ELO_1150', {
    name: 'Kai',
    avatar: '🤠',
    score: 8200
  }),
  createBotPlayer('bot_marcus', 'BOT_ELO_1450', {
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
  myPlayerId: initialProfile.id,
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
  lastEloBreakdown: null,
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
  setIsFirstMoveOfGame: (isFirst) => set({ isFirstMoveOfGame: isFirst }),
  setIsLeadMove: (isLead) => set({ isLeadMove: isLead }),

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
  setLastEloBreakdown: (breakdown) => set({ lastEloBreakdown: breakdown }),
  setAllEloDeltas: (deltas) => set({ allEloDeltas: deltas }),
  setMatchLogReport: (report) => set({ matchLogReport: report }),
  setMatchState: (matchState) => set({ matchState }),
  applyMatchState: (matchState) => {
    const snapshot = mapMatchStateToSnapshot(matchState);
    const hasEconomy = matchState.status === 'INSTANT_WIN' || matchState.status === 'GAME_OVER';
    set((state) => {
      const mergedDealtCounts = { ...state.dealtCounts, ...snapshot.dealtCounts };
      for (const p of snapshot.players) {
        if (p.hand && p.hand.length > 0) {
          mergedDealtCounts[p.id] = p.hand.length;
        } else if (state.dealtCounts[p.id] !== undefined && state.dealtCounts[p.id] > 0) {
          mergedDealtCounts[p.id] = state.dealtCounts[p.id];
        }
      }
      return {
        ...state,
        matchState,
        gameNumber: snapshot.gameNumber,
        players: snapshot.players,
        currentTurnPlayerId: snapshot.currentTurnPlayerId,
        leadPlayerId: snapshot.leadPlayerId,
        currentMove: snapshot.currentMove,
        winners: snapshot.winners,
        isGameOver: snapshot.isGameOver,
        instantWinType: snapshot.instantWinType,
        isDealing: snapshot.isDealing,
        dealtCounts: mergedDealtCounts,
        dealBanner: snapshot.dealBanner,
        chopNotification: snapshot.chopNotification,
        botThinkingThought: snapshot.botThinkingThought,
        isFirstMoveOfGame: snapshot.isFirstMoveOfGame,
        isLeadMove: snapshot.isLeadMove,
        ...(hasEconomy ? {
          matchPayouts: { ...matchState.matchPayouts },
          allEloDeltas: { ...matchState.eloDeltas },
          matchLogReport: matchState.matchLogReport
        } : {})
      };
    });
  },
  applyMatchSnapshot: (snapshot) => set((state) => ({
    ...state,
    gameNumber: snapshot.gameNumber,
    players: snapshot.players,
    currentTurnPlayerId: snapshot.currentTurnPlayerId,
    leadPlayerId: snapshot.leadPlayerId,
    currentMove: snapshot.currentMove,
    winners: snapshot.winners,
    isGameOver: snapshot.isGameOver,
    instantWinType: snapshot.instantWinType,
    isDealing: snapshot.isDealing,
    dealtCounts: snapshot.dealtCounts,
    dealBanner: snapshot.dealBanner,
    chopNotification: snapshot.chopNotification,
    botThinkingThought: snapshot.botThinkingThought,
    isFirstMoveOfGame: snapshot.isFirstMoveOfGame ?? false,
    isLeadMove: snapshot.isLeadMove ?? true
  })),
  applyAuthoritativeTableSync: (sync: TableStateSyncPacket) => {
    let leadingMove: PlayedMove | null = null;
    if (sync.currentMoveCards && sync.currentMoveCards.length > 0) {
      const moveCards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
      const combo = identifyCombination(moveCards);
      if (combo) {
        leadingMove = {
          playerId: sync.currentMovePlayerId || '',
          combination: combo,
          timestamp: Date.now(),
          isChop: false
        };
      }
    }

    const currentTurnId = sync.currentTurnPlayerId || '';
    const leadId = sync.leadPlayerId || '';
    const isLead = sync.isLeadMove ?? (leadingMove === null);

    set((state) => {
      // 1. Merge card counts từ số lượng bài chính thức của Host (Fog of War safe)
      const mergedDealtCounts = { ...state.dealtCounts, ...sync.remainingCardCounts };
      for (const p of state.players) {
        if (p.hand && p.hand.length > 0) {
          mergedDealtCounts[p.id] = p.hand.length;
        } else if (sync.remainingCardCounts[p.id] !== undefined) {
          mergedDealtCounts[p.id] = sync.remainingCardCounts[p.id];
        }
      }

      // 2. Tái tạo Authoritative MatchState nguyên tử
      let nextMatchState: MatchState = state.matchState;
      if (sync.isGameOver) {
        const winningPlayers = sync.winners
          .map(id => state.players.find(p => p.id === id))
          .filter((p): p is Player => p !== undefined && p !== null);
        const gameOverState: GameOverMatchState = {
          status: 'GAME_OVER',
          gameNumber: sync.gameNumber || state.gameNumber,
          players: state.players,
          winners: winningPlayers,
          isThreeSpadesWin: false,
          matchPayouts: state.matchPayouts,
          eloDeltas: state.allEloDeltas,
          matchLogReport: state.matchLogReport,
          rules: state.gameRules
        };
        nextMatchState = gameOverState;
      } else if (currentTurnId && leadId) {
        const playingState: PlayingTurnMatchState = createPlayingTurnMatchState({
          status: 'PLAYING',
          gameNumber: sync.gameNumber || state.gameNumber,
          roundNumber: sync.roundNumber || (state.matchState.status === 'PLAYING' ? state.matchState.roundNumber : 1),
          players: state.players,
          currentTurnPlayerId: currentTurnId,
          leadPlayerId: leadId,
          roundMoves: leadingMove ? [leadingMove] : [],
          leadingMove,
          isLeadMove: isLead,
          isFirstMoveOfGame: sync.isFirstMoveOfGame ?? (state.matchState.status === 'PLAYING' ? state.matchState.isFirstMoveOfGame : false),
          passedPlayerIds: sync.passedPlayerIds || [],
          chopNotification: sync.chopNotification ? {
            visible: sync.chopNotification.visible,
            chopperName: sync.chopNotification.chopperName,
            targetName: sync.chopNotification.targetName,
            amount: sync.chopNotification.amount,
            isCascade: sync.chopNotification.isCascade,
            chainCount: sync.chopNotification.chainCount
          } : null,
          botThinkingThought: null,
          rules: state.gameRules
        });
        nextMatchState = playingState;
      }

      return {
        ...state,
        matchState: nextMatchState,
        gameNumber: sync.gameNumber || state.gameNumber,
        currentTurnPlayerId: sync.currentTurnPlayerId,
        leadPlayerId: sync.leadPlayerId ?? null,
        currentMove: leadingMove,
        isLeadMove: isLead,
        isFirstMoveOfGame: sync.isFirstMoveOfGame ?? state.isFirstMoveOfGame,
        dealtCounts: mergedDealtCounts,
        isDealing: false,
        isGameOver: sync.isGameOver,
        winners: sync.isGameOver
          ? sync.winners
              .map(id => state.players.find(p => p.id === id))
              .filter((p): p is Player => p !== undefined && p !== null)
          : []
      };
    });

    // 3. Kích hoạt hiệu ứng âm thanh & hoạt ảnh bài trượt từ sự kiện chính chủ
    if (leadingMove) {
      GameEventBus.getInstance().emit({
        type: 'CARD_PLAYED',
        playerId: leadingMove.playerId,
        cards: [...leadingMove.combination.cards],
        combination: leadingMove.combination,
        remainingCardsCount: sync.remainingCardCounts[leadingMove.playerId] ?? 0
      });
    }

    if (sync.lastActionMessage && sync.lastActionMessage.includes('bỏ lượt')) {
      GameEventBus.getInstance().emit({
        type: 'TURN_PASSED',
        playerId: sync.currentTurnPlayerId || ''
      });
    }

    if (!sync.isGameOver) {
      useViewStore.getState().closeModal('VICTORY');
      useViewStore.getState().closeModal('ONLINE_ROOM');
    } else {
      useViewStore.getState().openModal('VICTORY');
    }
  },
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
    lastEloBreakdown: null,
    allEloDeltas: {},
    matchLogReport: null,
    campaignResultMeta: null
  })
}));
