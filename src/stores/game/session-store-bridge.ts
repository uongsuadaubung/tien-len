import type { IGameSession } from '../../engine/presentation/game-session.interface';
import type { TableRenderFrame } from '../../engine/presentation/frame-types';
import { syncStorePlayersFromFrame } from '../../engine/player-factory';
import { useGameStore } from '../useGameStore';

/**
 * Cập nhật Zustand Game Store từ TableRenderFrame của IGameSession.
 * Đảm bảo luồng dữ liệu đơn hướng: Engine -> TableRenderFrame -> Bridge -> Zustand Store -> React UI.
 */
export function syncStoreFromSessionFrame(session: IGameSession, frame: TableRenderFrame): void {
  const store = useGameStore.getState();
  const matchState = session.getLatestMatchState();
  const basePlayers = (store.players.length > 0 && store.players.some(p => p.id === store.myPlayerId))
    ? store.players
    : matchState.players;
  const updatedPlayers = syncStorePlayersFromFrame(basePlayers, frame, matchState);

  // Áp dụng State Pattern và cập nhật các thuộc tính bàn chơi từ matchState
  store.applyMatchState(matchState);

  const effectiveCurrentMove = matchState.status === 'PLAYING'
    ? matchState.leadingMove
    : (matchState.status === 'GAME_OVER'
      ? matchState.winningMove ?? matchState.leadingMove
      : null);

  const gameOverState = matchState.status === 'GAME_OVER' ? matchState : null;
  const hasValidSettlementPayouts = gameOverState !== null &&
    gameOverState.settlement !== undefined &&
    Object.values(gameOverState.matchPayouts).some(v => v !== 0);

  const localPlayer = updatedPlayers.find(p => p.id === store.myPlayerId);
  const myHandCardIds = new Set(localPlayer ? localPlayer.hand.map(c => c.id) : []);

  // Đồng bộ danh sách các lá bài đang chọn từ TableRenderFrame:
  let nextSelectedCardIds: Set<string>;
  if (frame.isDealing || matchState.status === 'DEALING' || matchState.status === 'GAME_OVER') {
    nextSelectedCardIds = new Set<string>();
  } else {
    const frameSelected = frame.myHand ? frame.myHand.filter(h => h.isSelected).map(h => h.card.id) : [];
    nextSelectedCardIds = new Set(frameSelected.filter(id => myHandCardIds.has(id)));
  }

  useGameStore.setState({
    currentFrame: frame,
    winners: updatedPlayers.filter(p => frame.winners.some(w => w.id === p.id)),
    players: updatedPlayers,
    currentMove: effectiveCurrentMove,
    selectedCardIds: nextSelectedCardIds,
    currentHint: frame.aiHint,
    dealtCounts: frame.dealtCounts,
    gameNumber: frame.gameNumber,
    isDealing: frame.isDealing,
    dealBanner: frame.dealBanner,
    openingReason: frame.openingReason,
    ...(hasValidSettlementPayouts && gameOverState ? {
      perspectiveSettlement: gameOverState.settlement,
      matchPayouts: gameOverState.matchPayouts,
      allEloDeltas: gameOverState.eloDeltas
    } : {}),
    ...(frame.playerWins ? {
      playerWins: { ...frame.playerWins }
    } : {}),
    ...(frame.initialScores ? {
      initialScores: { ...frame.initialScores }
    } : {})
  });
}

/**
 * Gắn kết IGameSession với useGameStore.
 * Trả về hàm hủy đăng ký (unsubscribe) để dọn dẹp bộ nhớ khi session kết thúc hoặc thay đổi.
 */
export function bindSessionToGameStore(session: IGameSession): () => void {
  syncStoreFromSessionFrame(session, session.getLatestFrame());
  return session.subscribeFrame(frame => {
    syncStoreFromSessionFrame(session, frame);
  });
}
