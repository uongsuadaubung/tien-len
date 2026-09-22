import type { Card, MatchPlayer, GameRules } from '../types';
import { 
  type MatchState,
  isPlayingMatchState,
  isTerminalMatchState,
  isGameOverMatchState,
  isRoundEndedMatchState
} from '../state-machine/types';
import type { MoveHint } from '../../ai/hint-engine';
import { isValidMove } from '../validator';
import { getSortedQuickSelectCandidates } from '../quick-response-finder';
import { identifyCombination } from '../combinations';
import type { 
  TableRenderFrame, 
  SeatRenderModel, 
  HandCardRenderModel, 
  ControlsRenderModel, 
  DiscardPileRenderModel, 
  ActiveBannerRenderModel 
} from './frame-types';
import type { OpeningReason, LastAction } from '../network/network.schema';

export interface TableFrameProjectionContext {
  readonly matchState: MatchState;
  readonly localPlayerId: string;
  readonly localHand: readonly Card[];
  readonly selectedCardIds: ReadonlySet<string>;
  readonly gameRules: GameRules;
  readonly players: readonly MatchPlayer[];
  readonly dealtCounts: Readonly<Record<string, number>>;
  readonly currentHint: MoveHint | null;
  readonly botThinkingThought: { botId: string; text: string } | null;
  readonly isDealing: boolean;
  readonly dealBanner: string | null;
  readonly turnDeadline?: number | null;
  readonly openingReason?: OpeningReason | null;
  readonly lastAction?: LastAction | null;
  readonly currentMoveCombinationName?: string | null;
}

export function getCombinationName(type: string, length: number): string {
  switch (type) {
    case 'SINGLE': return 'Lá Rác';
    case 'PAIR': return 'Đôi';
    case 'TRIPLE': return 'Sám Cô';
    case 'STRAIGHT': return `Sảnh (${length} lá)`;
    case 'THREE_PAIRS_SEQUENTIAL': return 'Ba Đôi Thông';
    case 'FOUR_OF_A_KIND': return 'Tứ Quý';
    case 'FOUR_PAIRS_SEQUENTIAL': return 'Bốn Đôi Thông';
    default: return 'Bộ bài';
  }
}

/**
 * projectTableFrame
 * Hàm chiếu thuần túy (Pure Function): Chuyển đổi trạng thái Engine & Góc nhìn người chơi thành
 * khung hình TableRenderFrame hoàn chỉnh, tự động tính toán canPlay, canPass, Fog-of-War.
 */
export function projectTableFrame(ctx: TableFrameProjectionContext): TableRenderFrame {
  const {
    matchState,
    localPlayerId,
    localHand,
    selectedCardIds,
    gameRules,
    players,
    dealtCounts,
    currentHint,
    botThinkingThought,
    isDealing,
    dealBanner,
    turnDeadline,
    openingReason,
    lastAction,
    currentMoveCombinationName
  } = ctx;

  const localPlayer = players.find(p => p.id === localPlayerId) ?? null;
  const isPlaying = isPlayingMatchState(matchState);
  const isGameOver = isTerminalMatchState(matchState);

  const activeTurn = isPlaying ? matchState : null;
  const currentTurnPlayerId = activeTurn ? activeTurn.currentTurnPlayerId : null;
  const isLeadMove = activeTurn ? activeTurn.isLeadMove : false;
  const isFirstMoveOfGame = activeTurn ? activeTurn.isFirstMoveOfGame : false;
  const firstMoveRequiredCard = (activeTurn && activeTurn.isFirstMoveOfGame) ? activeTurn.firstMoveRequiredCard : null;

  const isMyTurn = isPlaying && currentTurnPlayerId === localPlayerId;

  // 1. Phân giải Discard Pile
  let discardPile: DiscardPileRenderModel | null = null;
  const leadingMove = activeTurn?.leadingMove ?? 
    (isGameOverMatchState(matchState) ? matchState.winningMove : null) ?? 
    (isRoundEndedMatchState(matchState) && matchState.lastRoundMoves.length > 0 
      ? matchState.lastRoundMoves[matchState.lastRoundMoves.length - 1] 
      : null);

  if (leadingMove && leadingMove.combination) {
    discardPile = {
      cards: leadingMove.combination.cards,
      playedByPlayerId: leadingMove.playerId,
      combinationName: currentMoveCombinationName || getCombinationName(leadingMove.combination.type, leadingMove.combination.length),
      isChop: leadingMove.isChop ?? false,
      chopChainCount: leadingMove.chopChainCount ?? 1
    };
  }

  // 2. Tính toán Controls (Nút Đánh, Bỏ Lượt, Chọn Nhanh)
  const selectedCards = localHand.filter(c => selectedCardIds.has(c.id));
  const hasPassedRound = localPlayer ? localPlayer.isPassedCurrentRound : false;
  let canPlay = false;
  let playButtonLabel = 'Đánh';

  if (isMyTurn && selectedCards.length > 0) {
    const isFinishingMove = selectedCards.length === localHand.length;

    const baseContext = {
      cards: selectedCards,
      target: leadingMove ? leadingMove.combination : null,
      isLeadMove,
      hasPassedRound,
      allowFourPairsCutAnytime: gameRules.chopping.allowFourPairsCutAnytime,
      isFinishingMove,
      prohibitEndingWithTwo: gameRules.gameFlow.prohibitEndingWithTwo
    };

    const validation = (isFirstMoveOfGame && firstMoveRequiredCard)
      ? isValidMove({
          ...baseContext,
          isFirstMoveOfGame: true,
          firstMoveRequiredCard
        })
      : isValidMove({
          ...baseContext,
          isFirstMoveOfGame: false,
          firstMoveRequiredCard: null
        });

    if (validation.valid) {
      canPlay = true;
      const combo = identifyCombination(selectedCards);
      if (combo && (combo.type === 'FOUR_OF_A_KIND' || combo.type === 'THREE_PAIRS_SEQUENTIAL' || combo.type === 'FOUR_PAIRS_SEQUENTIAL') && leadingMove) {
        playButtonLabel = 'Chặt!';
      } else {
        playButtonLabel = `Đánh (${selectedCards.length} lá)`;
      }
    }
  }

  const canPass = isMyTurn && !isFirstMoveOfGame && !isLeadMove && !hasPassedRound;

  // 3. Tính toán Quick Select Candidates
  let canQuickSelect = false;
  if (isMyTurn && localHand.length > 0) {
    const quickCandidates = getSortedQuickSelectCandidates({
      hand: [...localHand],
      leadingMove: activeTurn?.leadingMove ?? null,
      isLeadMove,
      isFirstMoveOfGame,
      firstMoveRequiredCard: firstMoveRequiredCard ?? undefined,
      allowFourPairsCutAnytime: gameRules.chopping.allowFourPairsCutAnytime,
      prohibitEndingWithTwo: gameRules.gameFlow.prohibitEndingWithTwo
    });
    canQuickSelect = quickCandidates.length > 0;
  }

  const controls: ControlsRenderModel = {
    isMyTurn,
    canPlay,
    canPass,
    canQuickSelect,
    playButtonLabel
  };

  // 4. Hand Cards (gắn cờ isSelected và isPlayable)
  const myHand: HandCardRenderModel[] = localHand.map(card => {
    const isSelected = selectedCardIds.has(card.id);
    return {
      card,
      isSelected,
      isPlayable: isMyTurn // Khi tới lượt thì các lá bài có thể click chọn
    };
  });

  // 5. Seats & Fog-of-War (Che bài đối thủ tuyệt đối)
  const myIndex = players.findIndex(p => p.id === localPlayerId);
  const seats: SeatRenderModel[] = players.map((p, idx) => {
    const isLocal = p.id === localPlayerId;
    const cardCount = isLocal 
      ? localHand.length 
      : (dealtCounts[p.id] !== undefined ? dealtCounts[p.id] : p.cardCount);

    const isCurrentTurn = isPlaying && currentTurnPlayerId === p.id;
    let statusText: string | null = null;
    if (p.isPassedCurrentRound) {
      statusText = 'Bỏ lượt';
    } else if (isCurrentTurn) {
      statusText = isLocal ? 'Lượt của bạn' : 'Đang nghĩ...';
    }

    // Tính vị trí ghế tương đối: 0 là Local Player (đáy bàn)
    let relativeSeatIndex = 0;
    if (myIndex !== -1) {
      relativeSeatIndex = (idx - myIndex + players.length) % players.length;
    }

    return {
      seatIndex: relativeSeatIndex,
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      cardCount,
      isCurrentTurn,
      isPassed: p.isPassedCurrentRound,
      isLocal,
      isBot: p.isBot,
      botPersonaId: p.isBot ? (p.botPersonaId ?? null) : null,
      statusText,
      score: p.score
    };
  });

  // 6. Banners & Notifications
  let activeBanner: ActiveBannerRenderModel | null = null;
  const effectiveDealBanner: string | null = dealBanner ?? (matchState.status === 'DEALING' ? matchState.dealBanner : null);

  if (effectiveDealBanner) {
    activeBanner = { type: 'DEALING', message: effectiveDealBanner, amount: null };
  } else if (activeTurn?.chopNotification && activeTurn.chopNotification.visible) {
    const chop = activeTurn.chopNotification;
    activeBanner = {
      type: 'CHOP',
      message: `${chop.chopperName} đã chặt ${chop.targetName}!`,
      amount: chop.amount
    };
  } else if (matchState.status === 'INSTANT_WIN') {
    activeBanner = {
      type: 'VICTORY',
      message: 'Tới Trắng!',
      amount: null
    };
  } else if (matchState.status === 'GAME_OVER') {
    activeBanner = {
      type: 'VICTORY',
      message: 'Ván đấu kết thúc',
      amount: null
    };
  }

  // 7. Winners
  const winnersList: Array<{ id: string; name: string }> = [];
  if (matchState.status === 'GAME_OVER') {
    for (const w of matchState.winners) {
      winnersList.push({ id: w.id, name: w.name });
    }
  } else if (matchState.status === 'INSTANT_WIN') {
    winnersList.push({ id: matchState.instantWinner.id, name: matchState.instantWinner.name });
  }

  return {
    gameNumber: matchState.gameNumber,
    status: matchState.status,
    betAmount: gameRules.table.betAmount,
    localPlayerId,
    seats,
    myHand,
    discardPile,
    controls,
    activeBanner,
    dealBanner: effectiveDealBanner,
    isDealing,
    dealtCounts,
    isGameOver,
    winners: winnersList,
    aiHint: currentHint,
    botThinkingThought,
    turnDeadline: turnDeadline ?? null,
    openingReason: openingReason ?? null,
    lastAction: lastAction ?? null
  };
}
