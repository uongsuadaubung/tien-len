import { 
  type MatchPlayer, 
  type PlayedMove, 
  createPlayedMove 
} from '../../engine/types';
import { 
  type MatchState,
  type PlayingTurnMatchState,
  createPlayingTurnMatchState,
  getCurrentTurnPlayerIdFromMatchState,
  getActiveLeadingMoveFromMatchState,
  getWinnersFromMatchState,
  isGameOverFromMatchState
} from '../../engine/state-machine/types';
import { createCard } from '../../engine/card';
import { identifyCombination } from '../../engine/combinations';
import { GameEventBus } from '../../engine/events/game-event-bus';
import { type TableStateSyncPacket } from '../../engine/network/network.schema';
import { ECONOMY_CONSTANTS } from '../../engine/constants/economy';
import { createPlayer, createBotPlayer, deriveSynchronizedPlayers, cloneMatchPlayers, cloneMatchPlayer, updatePlayerInList } from '../../engine/player-factory';
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

export const DEFAULT_PLAYERS: MatchPlayer[] = [
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

export const createMatchStateSlice: GameSliceCreator<MatchStateSlice> = (set, get) => ({
  currentScreen: 'LOBBY',
  myPlayerId: initialProfile.id,
  gameNumber: 1,

  isDealing: false,
  dealtCounts: {},
  dealBanner: null,
  openingReason: null,
  chopNotification: null,
  questToast: null,
  currentFrame: null,

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
  firstMoveRequiredCard: null,
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
      ? updatePlayerInList(state.players, state.myPlayerId, { id })
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
  setOpeningReason: (reason) => set({ openingReason: reason }),
  setChopNotification: (notif) => set({ chopNotification: notif }),
  setQuestToast: (toast) => set({ questToast: toast }),

  setPlayers: (playersOrUpdater) => set((state) => {
    const players = typeof playersOrUpdater === 'function' ? playersOrUpdater(state.players) : playersOrUpdater;
    return {
      players: cloneMatchPlayers(players)
    };
  }),
  setCurrentTurnPlayerId: (id) => set({ currentTurnPlayerId: id }),
  setLeadPlayerId: (id) => set({ leadPlayerId: id }),
  setCurrentMove: (move) => set({ currentMove: move }),
  setWinners: (winners) => set({
    winners: cloneMatchPlayers(winners)
  }),
  setIsGameOver: (gameOver) => set({ isGameOver: gameOver }),
  setInstantWinType: (type) => set({ instantWinType: type }),
  setIsThreeSpadesWin: (win) => set({ isThreeSpadesWin: win }),
  setBotThinkingThought: (thought) => set({ botThinkingThought: thought }),
  setIsFirstMoveOfGame: (isFirst) => set({ isFirstMoveOfGame: isFirst }),
  setFirstMoveRequiredCard: (card) => set({ firstMoveRequiredCard: card }),
  setIsLeadMove: (isLead) => set({ isLeadMove: isLead }),

  setMatchPayouts: (payouts) => set({ matchPayouts: payouts }),
  setLoanDeductionAmount: (amount) => set({ loanDeductionAmount: amount }),
  setLastEloDelta: (delta) => set({ lastEloDelta: delta }),
  setLastEloBreakdown: (breakdown) => set({ lastEloBreakdown: breakdown }),
  setAllEloDeltas: (deltas) => set({ allEloDeltas: deltas }),
  setMatchLogReport: (report) => set({ matchLogReport: report }),
  setMatchState: (matchState) => set((state) => ({
    matchState,
    isGameOver: matchState.status === 'GAME_OVER' || matchState.status === 'INSTANT_WIN',
    winners: matchState.status === 'GAME_OVER'
      ? [...matchState.winners]
      : (matchState.status === 'INSTANT_WIN' ? [matchState.instantWinner] : state.winners),
    isFirstMoveOfGame: matchState.status === 'PLAYING' ? matchState.isFirstMoveOfGame : false,
    firstMoveRequiredCard: matchState.status === 'PLAYING' && matchState.isFirstMoveOfGame ? matchState.firstMoveRequiredCard : null,
    isLeadMove: matchState.status === 'PLAYING' ? matchState.isLeadMove : true
  })),
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
          if (counts[p.id] === undefined) {
            const existing = state.players.find(sp => sp.id === p.id);
            const handLen = (p.hand && p.hand.length > 0) ? p.hand.length : (existing?.hand?.length ?? 0);
            if (handLen > 0) {
              counts[p.id] = handLen;
            }
          }
        }
        updatedDealtCounts = counts;
      }

      return {
        matchState,
        players: matchState.players ? matchState.players.map(p => {
          const existing = state.players.find(sp => sp.id === p.id);
          const hand = (p.hand && p.hand.length > 0) ? p.hand : (existing?.hand ?? []);
          return cloneMatchPlayer(p, { hand: [...hand], playedCards: [...p.playedCards] });
        }) : state.players,
        gameNumber: matchState.gameNumber,
        isDealing,
        dealBanner: matchState.status === 'DEALING' ? matchState.dealBanner : (isDealing ? state.dealBanner : null),
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
        matchPayouts: (isGameOver && matchState.matchPayouts && Object.keys(matchState.matchPayouts).length > 0)
          ? matchState.matchPayouts
          : (isInstantWin ? matchState.matchPayouts : state.matchPayouts),
        allEloDeltas: (isGameOver && matchState.eloDeltas && Object.keys(matchState.eloDeltas).length > 0)
          ? matchState.eloDeltas
          : (isInstantWin ? matchState.eloDeltas : state.allEloDeltas),
        perspectiveSettlement: isGameOver
          ? (matchState.settlement && matchState.settlement.players && matchState.settlement.players.some(p => p.netPayout !== 0)
              ? matchState.settlement
              : (state.perspectiveSettlement && state.perspectiveSettlement.players && state.perspectiveSettlement.players.some(p => p.netPayout !== 0)
                  ? state.perspectiveSettlement
                  : matchState.settlement))
          : state.perspectiveSettlement,
        matchLogReport: isGameOver || isInstantWin ? matchState.matchLogReport : state.matchLogReport,
        chopNotification: isPlaying || isRoundEnded ? matchState.chopNotification : null,
        botThinkingThought: null,
        isFirstMoveOfGame: isPlaying ? matchState.isFirstMoveOfGame : false,
        firstMoveRequiredCard: isPlaying && matchState.isFirstMoveOfGame ? matchState.firstMoveRequiredCard : null,
        isLeadMove: isPlaying ? matchState.isLeadMove : true,
        currentFrame: null
      };
    });
  },

  applyAuthoritativeTableSync: (sync: TableStateSyncPacket) => {
    const currentTurnId = sync.currentTurnPlayerId || '';
    const leadId = sync.leadPlayerId || '';
    const currentState = get();

    let leadingMove: PlayedMove | null = null;
    let isNewMove = false;

    if (sync.lastAction) {
      isNewMove = (sync.lastAction.type === 'PLAY' || sync.lastAction.type === 'CHOP');
    }

    if (sync.currentMoveCards && sync.currentMoveCards.length > 0) {
      const moveCards = sync.currentMoveCards.map(c => createCard(c.rank, c.suit));
      const combo = identifyCombination(moveCards);

      if (combo) {
        const prevLeading = currentState.matchState.status === 'PLAYING'
          ? currentState.matchState.leadingMove
          : currentState.currentMove;

        // Nếu có lastAction thì dựa vào lastAction, nếu không thì fallback so sánh đơn giản
        const isSame = sync.lastAction
          ? !isNewMove
          : (prevLeading && prevLeading.playerId === sync.currentMovePlayerId && prevLeading.combination.cards.length === moveCards.length);

        if (isSame && prevLeading) {
          leadingMove = prevLeading;
          isNewMove = false;
        } else {
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
          if (!sync.lastAction) {
            isNewMove = true;
          }
        }
      }
    }

    const isLead = sync.isLeadMove ?? (leadingMove === null);
    const isFirstMove = sync.isFirstMoveOfGame ?? (currentState.matchState.status === 'PLAYING' ? currentState.matchState.isFirstMoveOfGame : false);
    const existingFirstMoveCard = currentState.matchState.status === 'PLAYING' && currentState.matchState.isFirstMoveOfGame
      ? currentState.matchState.firstMoveRequiredCard
      : currentState.firstMoveRequiredCard;
    const requiredCard = isFirstMove
      ? (sync.firstMoveRequiredCard
        ? createCard(sync.firstMoveRequiredCard.rank, sync.firstMoveRequiredCard.suit)
        : existingFirstMoveCard)
      : null;

    set((state) => {
      // 1. Đồng bộ người chơi: Ưu tiên dùng 100% snapshot seats từ Authoritative Server (Zero-Diffing)
      let updatedPlayers = state.players;
      if (sync.seats && sync.seats.length > 0) {
        updatedPlayers = state.players.map(p => {
          const seat = sync.seats!.find(s => s.playerId === p.id);
          if (!seat) return p;
          const isMe = p.id === state.myPlayerId;
          return {
            ...p,
            cardCount: (isMe && p.hand && p.hand.length > 0) ? p.hand.length : seat.cardCount,
            score: seat.score,
            isPassedCurrentRound: seat.isPassed
          };
        });
      } else {
        const currentMoveCards = sync.currentMoveCards ? sync.currentMoveCards.map(c => createCard(c.rank, c.suit)) : undefined;
        const myPlayer = state.players.find(p => p.id === state.myPlayerId);
        updatedPlayers = deriveSynchronizedPlayers(state.players, {
          myPlayerId: state.myPlayerId,
          myHand: myPlayer ? myPlayer.hand : [],
          passedPlayerIds: sync.passedPlayerIds,
          remainingCardCounts: sync.remainingCardCounts,
          playerScores: sync.playerScores,
          currentMoveCards,
          currentMovePlayerId: sync.currentMovePlayerId,
          isGameOver: sync.isGameOver
        });
      }

      const mergedDealtCounts = { ...state.dealtCounts, ...sync.remainingCardCounts };
      for (const p of updatedPlayers) {
        if (p.id === state.myPlayerId && p.hand && p.hand.length > 0) {
          mergedDealtCounts[p.id] = p.hand.length;
        } else if (sync.remainingCardCounts && sync.remainingCardCounts[p.id] !== undefined) {
          mergedDealtCounts[p.id] = sync.remainingCardCounts[p.id];
        } else if (p.cardCount !== undefined) {
          mergedDealtCounts[p.id] = p.cardCount;
        }
      }

      let nextMatchState: MatchState = state.matchState;
      if (sync.isGameOver) {
        const winningPlayers = sync.winners
          .map(id => updatedPlayers.find(p => p.id === id))
          .filter((p): p is MatchPlayer => p !== undefined && p !== null);
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
      } else if (sync.isDealing) {
        nextMatchState = {
          status: 'DEALING',
          gameNumber: sync.gameNumber || state.gameNumber,
          players: updatedPlayers,
          dealtCounts: sync.dealtCounts ? { ...sync.dealtCounts } : mergedDealtCounts,
          dealBanner: sync.dealBanner ?? null,
          totalCardsDealt: Object.values(sync.dealtCounts || {}).reduce((a, b) => a + b, 0),
          rules: state.gameRules
        };
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
          isFirstMoveOfGame: isFirstMove,
          firstMoveRequiredCard: requiredCard,
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

      const isDealingNow = sync.isDealing ?? false;
      const effectiveDealtCounts = (isDealingNow && sync.dealtCounts) ? { ...sync.dealtCounts } : mergedDealtCounts;

      return {
        ...state,
        players: updatedPlayers,
        matchState: nextMatchState,
        gameNumber: sync.gameNumber || state.gameNumber,
        isDealing: isDealingNow,
        dealBanner: sync.dealBanner !== undefined ? sync.dealBanner : state.dealBanner,
        openingReason: sync.openingReason !== undefined ? sync.openingReason : state.openingReason,
        dealtCounts: effectiveDealtCounts,
        currentTurnPlayerId: currentTurnId,
        leadPlayerId: leadId,
        currentMove: sync.isGameOver
          ? (nextMatchState.status === 'GAME_OVER' ? nextMatchState.winningMove : leadingMove)
          : leadingMove,
        winners: nextMatchState.status === 'GAME_OVER'
          ? [...nextMatchState.winners]
          : (sync.winners ? sync.winners.map(id => updatedPlayers.find(p => p.id === id)).filter((p): p is MatchPlayer => p !== undefined && p !== null) : []),
        isGameOver: sync.isGameOver,
        chopNotification: sync.chopNotification ? {
          visible: sync.chopNotification.visible,
          chopperName: sync.chopNotification.chopperName,
          targetName: sync.chopNotification.targetName,
          amount: sync.chopNotification.amount,
          isCascade: sync.chopNotification.isCascade,
          chainCount: sync.chopNotification.chainCount
        } : null,
        isFirstMoveOfGame: isFirstMove,
        firstMoveRequiredCard: isFirstMove ? requiredCard : null,
        isLeadMove: isLead
      };
    });

    if (leadingMove && isNewMove) {
      const remainingCount = (sync.remainingCardCounts && sync.remainingCardCounts[leadingMove.playerId] !== undefined)
        ? sync.remainingCardCounts[leadingMove.playerId]
        : 0;
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

  resetMatchState: () => set({
    matchState: DEFAULT_MATCH_STATE,
    isDealing: false,
    dealtCounts: {},
    dealBanner: null,
    openingReason: null,
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
    firstMoveRequiredCard: null,
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
    perspectiveSettlement: null,
    currentFrame: null
  }),

  setCurrentFrame: (frame) => set({ currentFrame: frame })
});

/* =================================================================================
 * TYPED STATE SELECTORS (Single Source of Truth)
 * ================================================================================= */

export const selectMatchStatus = (state: { matchState: MatchState }) => state.matchState.status;
export const selectIsPlaying = (state: { matchState: MatchState }) => state.matchState.status === 'PLAYING';
export const selectIsDealing = (state: { matchState: MatchState }) => state.matchState.status === 'DEALING';
export const selectIsGameOver = (state: { matchState: MatchState }) => isGameOverFromMatchState(state.matchState);
export const selectCurrentTurnPlayerId = (state: { matchState: MatchState }) => getCurrentTurnPlayerIdFromMatchState(state.matchState);
export const selectLeadingMove = (state: { matchState: MatchState }) => getActiveLeadingMoveFromMatchState(state.matchState);
export const selectWinners = (state: { matchState: MatchState }) => getWinnersFromMatchState(state.matchState);

