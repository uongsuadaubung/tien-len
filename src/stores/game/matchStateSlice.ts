import { 
  type Player, 
  type PlayedMove, 
  createPlayedMove 
} from '../../engine/types';
import { 
  type MatchState,
  type PlayingTurnMatchState,
  createPlayingTurnMatchState 
} from '../../engine/state-machine/types';
import { createCard } from '../../engine/card';
import { identifyCombination } from '../../engine/combinations';
import { GameEventBus } from '../../engine/events/game-event-bus';
import { type TableStateSyncPacket } from '../../engine/network/network.schema';
import { ECONOMY_CONSTANTS } from '../../engine/constants/economy';
import { createPlayer, createBotPlayer } from '../../engine/player-factory';
import { loadPlayerProfile } from '../../engine/storage';
import { createProvisionalOnlineGameOverState } from '../../engine/settlement/perspective-settlement';
import { useViewStore } from '../useViewStore';
import { useUserStore } from '../useUserStore';
import { DEFAULT_GAME_RULES } from './tableConfigSlice';
import type { 
  MatchStateSlice, 
  GameSliceCreator, 
  ScreenType 
} from './types';

const initialProfile = loadPlayerProfile();

export const DEFAULT_PLAYERS: Player[] = [
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

export const DEFAULT_MATCH_STATE: MatchState = {
  status: 'WAITING',
  gameNumber: 1,
  players: DEFAULT_PLAYERS,
  rules: DEFAULT_GAME_RULES,
  lastWinnerId: null
};

export const createMatchStateSlice: GameSliceCreator<MatchStateSlice> = (set) => ({
  currentScreen: 'LOBBY',
  myPlayerId: initialProfile.id,
  gameNumber: 1,

  isDealing: false,
  dealtCounts: {},
  dealBanner: null,
  chopNotification: null,
  questToast: null,

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

  matchPayouts: {},
  loanDeductionAmount: 0,
  lastEloDelta: 0,
  lastEloBreakdown: null,
  allEloDeltas: {},
  matchLogReport: null,
  campaignResultMeta: null,
  perspectiveSettlement: null,

  setCampaignResultMeta: (meta) => set({ campaignResultMeta: meta }),
  setPerspectiveSettlement: (settlement) => set({ perspectiveSettlement: settlement }),
  setCurrentScreen: (screen: ScreenType) => {
    useViewStore.getState().setScreen(screen);
    set({ currentScreen: screen });
  },
  setMyPlayerId: (id) => set((state) => {
    if (state.activeGameType === 'ONLINE') {
      return { myPlayerId: id };
    }
    const isLobbyOrWaiting = state.currentScreen === 'LOBBY' || state.matchState.status === 'WAITING';
    const updatedPlayers = isLobbyOrWaiting
      ? state.players.map((p) => (p.id === state.myPlayerId ? { ...p, id } : p))
      : state.players;
    return {
      myPlayerId: id,
      players: updatedPlayers
    };
  }),
  setGameNumber: (num) => set((state) => ({
    gameNumber: typeof num === 'function' ? num(state.gameNumber) : num
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
  setBotThinkingThought: (thought) => set({ botThinkingThought: thought }),
  setIsFirstMoveOfGame: (isFirst) => set({ isFirstMoveOfGame: isFirst }),
  setIsLeadMove: (isLead) => set({ isLeadMove: isLead }),

  setMatchPayouts: (payouts) => set({ matchPayouts: payouts }),
  setLoanDeductionAmount: (amount) => set({ loanDeductionAmount: amount }),
  setLastEloDelta: (delta) => set({ lastEloDelta: delta }),
  setLastEloBreakdown: (breakdown) => set({ lastEloBreakdown: breakdown }),
  setAllEloDeltas: (deltas) => set({ allEloDeltas: deltas }),
  setMatchLogReport: (report) => set({ matchLogReport: report }),
  setMatchState: (matchState) => set({ matchState }),
  applyMatchState: (matchState) => {
    const isGameOver = matchState.status === 'GAME_OVER';
    const isInstantWin = matchState.status === 'INSTANT_WIN';
    const isPlaying = matchState.status === 'PLAYING';
    const isDealing = matchState.status === 'DEALING';
    const isRoundEnded = matchState.status === 'ROUND_ENDED';

    set((state) => {
      let updatedDealtCounts = state.dealtCounts;
      if (isDealing) {
        updatedDealtCounts = { ...state.dealtCounts, ...matchState.dealtCounts };
      } else if (matchState.players) {
        const counts: Record<string, number> = { ...state.dealtCounts };
        for (const p of matchState.players) {
          if (p.hand && p.hand.length > 0) {
            counts[p.id] = p.hand.length;
          }
        }
        updatedDealtCounts = counts;
      }

      return {
        matchState,
        players: matchState.players ? matchState.players.map(p => ({ ...p, hand: [...p.hand], playedCards: [...p.playedCards] })) : state.players,
        gameNumber: matchState.gameNumber,
        isDealing,
        dealBanner: isDealing ? matchState.dealBanner : null,
        dealtCounts: updatedDealtCounts,
        currentTurnPlayerId: isPlaying ? matchState.currentTurnPlayerId : null,
        leadPlayerId: isPlaying ? matchState.leadPlayerId : (isRoundEnded ? matchState.nextLeadPlayerId : null),
        currentMove: isPlaying
          ? matchState.leadingMove
          : (isGameOver ? matchState.winningMove : (isRoundEnded && matchState.lastRoundMoves.length > 0 ? matchState.lastRoundMoves[matchState.lastRoundMoves.length - 1] : null)),
        winners: isGameOver ? [...matchState.winners] : (isInstantWin ? [matchState.instantWinner] : []),
        isGameOver: isGameOver || isInstantWin,
        isThreeSpadesWin: isGameOver ? matchState.isThreeSpadesWin : false,
        instantWinType: isInstantWin ? matchState.instantWinType : null,
        matchPayouts: isGameOver || isInstantWin ? matchState.matchPayouts : state.matchPayouts,
        allEloDeltas: isGameOver || isInstantWin ? matchState.eloDeltas : state.allEloDeltas,
        perspectiveSettlement: isGameOver ? matchState.settlement : state.perspectiveSettlement,
        matchLogReport: isGameOver || isInstantWin ? matchState.matchLogReport : state.matchLogReport,
        chopNotification: isPlaying || isRoundEnded ? matchState.chopNotification : null,
        botThinkingThought: null,
        isFirstMoveOfGame: isPlaying ? matchState.isFirstMoveOfGame : false,
        isLeadMove: isPlaying ? matchState.isLeadMove : true
      };
    });
  },

  applyAuthoritativeTableSync: (sync: TableStateSyncPacket) => {
    let leadingMove: PlayedMove | null = null;
    if (sync.currentMoveCards && sync.currentMoveCards.length > 0) {
      const moveCards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
      const combo = identifyCombination(moveCards);
      if (combo) {
        leadingMove = createPlayedMove(
          sync.currentMovePlayerId || '',
          combo,
          sync.isChop ? {
            choppedPlayerId: '',
            penaltyAmount: 0,
            isCascadeChop: sync.isCascadeChop ?? false
          } : undefined,
          Date.now()
        );
      }
    }

    const currentTurnId = sync.currentTurnPlayerId || '';
    const leadId = sync.leadPlayerId || '';
    const isLead = sync.isLeadMove ?? (leadingMove === null);

    set((state) => {
      // 1. Loại bỏ các lá bài vừa đánh ra khỏi tay người chơi (Authoritative Fog-of-War Card Removal)
      const playedCardIds = new Set(sync.currentMoveCards?.map(c => c.id) || []);
      const updatedPlayers = state.players.map(p => {
        if (p.id === sync.currentMovePlayerId && playedCardIds.size > 0) {
          const newPlayed = (sync.currentMoveCards?.map(c => createCard(c.rank, c.suit)) || []);
          const existingPlayedIds = new Set(p.playedCards.map(c => c.id));
          return {
            ...p,
            hand: p.hand.filter(c => !playedCardIds.has(c.id)),
            playedCards: [
              ...p.playedCards,
              ...newPlayed.filter(c => !existingPlayedIds.has(c.id))
            ]
          };
        }
        return p;
      });

      const mergedDealtCounts = { ...state.dealtCounts, ...sync.remainingCardCounts };
      for (const p of updatedPlayers) {
        if (p.hand && p.hand.length > 0) {
          mergedDealtCounts[p.id] = p.hand.length;
        } else if (sync.remainingCardCounts[p.id] !== undefined) {
          mergedDealtCounts[p.id] = sync.remainingCardCounts[p.id];
        }
      }

      let nextMatchState: MatchState = state.matchState;
      if (sync.isGameOver) {
        const winningPlayers = sync.winners
          .map(id => updatedPlayers.find(p => p.id === id))
          .filter((p): p is Player => p !== undefined && p !== null);
        const previousLeadingMove = state.matchState.status === 'PLAYING'
          ? state.matchState.leadingMove
          : (state.matchState.status === 'GAME_OVER' ? state.matchState.winningMove : null);
        const resolvedWinningMove = leadingMove ?? previousLeadingMove ?? null;
        const currentSettlement = state.perspectiveSettlement ?? (state.matchState.status === 'GAME_OVER' ? state.matchState.settlement : null);

        nextMatchState = createProvisionalOnlineGameOverState({
          gameNumber: sync.gameNumber || state.gameNumber,
          players: updatedPlayers,
          winners: winningPlayers,
          winningMove: resolvedWinningMove,
          isThreeSpadesWin: false,
          instantWinType: null,
          matchPayouts: state.matchPayouts,
          allEloDeltas: state.allEloDeltas,
          subjectPlayerId: state.myPlayerId,
          subjectCoins: useUserStore.getState().profile.coins,
          betAmount: state.gameRules.table.betAmount,
          rules: state.gameRules,
          matchLogReport: state.matchLogReport,
          existingSettlement: currentSettlement
        });
      } else if (currentTurnId && leadId) {
        const playingState: PlayingTurnMatchState = createPlayingTurnMatchState({
          status: 'PLAYING',
          gameNumber: sync.gameNumber || state.gameNumber,
          roundNumber: sync.roundNumber || (state.matchState.status === 'PLAYING' ? state.matchState.roundNumber : 1),
          players: updatedPlayers,
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
        players: updatedPlayers,
        matchState: nextMatchState,
        gameNumber: sync.gameNumber || state.gameNumber,
        isDealing: false,
        dealtCounts: mergedDealtCounts,
        currentTurnPlayerId: currentTurnId,
        leadPlayerId: leadId,
        currentMove: sync.isGameOver
          ? (nextMatchState.status === 'GAME_OVER' ? nextMatchState.winningMove : leadingMove)
          : leadingMove,
        winners: nextMatchState.status === 'GAME_OVER'
          ? [...nextMatchState.winners]
          : (sync.winners ? sync.winners.map(id => updatedPlayers.find(p => p.id === id)).filter((p): p is Player => p !== undefined && p !== null) : []),
        isGameOver: sync.isGameOver,
        chopNotification: sync.chopNotification ? {
          visible: sync.chopNotification.visible,
          chopperName: sync.chopNotification.chopperName,
          targetName: sync.chopNotification.targetName,
          amount: sync.chopNotification.amount,
          isCascade: sync.chopNotification.isCascade,
          chainCount: sync.chopNotification.chainCount
        } : null,
        isLeadMove: isLead
      };
    });

    if (leadingMove) {
      if (sync.remainingCardCounts && sync.remainingCardCounts[leadingMove.playerId] === undefined) {
        throw new Error(`[applyAuthoritativeTableSync] Invariant violated: Missing remainingCardCounts for player "${leadingMove.playerId}"`);
      }
      const remainingCount = sync.remainingCardCounts ? sync.remainingCardCounts[leadingMove.playerId] : 0;
      GameEventBus.getInstance().emit({
        type: 'CARD_PLAYED',
        playerId: leadingMove.playerId,
        cards: [...leadingMove.combination.cards],
        combination: leadingMove.combination,
        remainingCardsCount: remainingCount
      });
    }

    if (!sync.isGameOver) {
      useViewStore.getState().closeModal('VICTORY');
      useViewStore.getState().closeModal('ONLINE_ROOM');
    }
  },

  applyMatchSnapshot: (snapshot) => set((state) => ({
    ...state,
    gameNumber: snapshot.gameNumber ?? state.gameNumber,
    players: snapshot.players ? snapshot.players.map(p => ({ ...p, hand: [...p.hand], playedCards: [...p.playedCards] })) : state.players,
    currentTurnPlayerId: snapshot.currentTurnPlayerId !== undefined ? snapshot.currentTurnPlayerId : state.currentTurnPlayerId,
    leadPlayerId: snapshot.leadPlayerId !== undefined ? snapshot.leadPlayerId : state.leadPlayerId,
    currentMove: snapshot.currentMove !== undefined ? snapshot.currentMove : state.currentMove,
    winners: snapshot.winners ? snapshot.winners.map(p => ({ ...p, hand: [...p.hand], playedCards: [...p.playedCards] })) : state.winners,
    isGameOver: snapshot.isGameOver !== undefined ? snapshot.isGameOver : state.isGameOver,
    instantWinType: snapshot.instantWinType !== undefined ? snapshot.instantWinType : state.instantWinType,
    isDealing: snapshot.isDealing !== undefined ? snapshot.isDealing : state.isDealing,
    dealtCounts: snapshot.dealtCounts !== undefined ? snapshot.dealtCounts : state.dealtCounts,
    dealBanner: snapshot.dealBanner !== undefined ? snapshot.dealBanner : state.dealBanner,
    chopNotification: snapshot.chopNotification !== undefined ? snapshot.chopNotification : state.chopNotification,
    botThinkingThought: snapshot.botThinkingThought !== undefined ? snapshot.botThinkingThought : state.botThinkingThought,
    isFirstMoveOfGame: snapshot.isFirstMoveOfGame !== undefined ? (snapshot.isFirstMoveOfGame ?? false) : state.isFirstMoveOfGame,
    isLeadMove: snapshot.isLeadMove !== undefined ? (snapshot.isLeadMove ?? false) : state.isLeadMove
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
    handSortMode: 'NATURAL',
    matchPayouts: {},
    loanDeductionAmount: 0,
    lastEloDelta: 0,
    lastEloBreakdown: null,
    allEloDeltas: {},
    matchLogReport: null,
    campaignResultMeta: null,
    perspectiveSettlement: null
  })
});
