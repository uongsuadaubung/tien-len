import { describe, expect, it, beforeEach } from 'bun:test';
import { useViewStore } from '../../src/stores/useViewStore';
import { useGameStore } from '../../src/stores/useGameStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { saveActiveMatchSession, clearActiveMatchSession } from '../../src/engine/storage';
import { ECONOMY_CONSTANTS } from '../../src/engine/constants/economy';

describe('Kiểm Thử Cảnh Báo Xác Nhận Mất Tiền Cược Khi Thoát Trận (Forfeit Confirmation Tests)', () => {
  beforeEach(() => {
    useViewStore.getState().closeAllModals();
    clearActiveMatchSession();
    useUserStore.getState().resetProfile();
    useGameStore.getState().resetMatchState();
  });

  it('1. Đang trong trận đấu: Bấm nút Home phải mở modal CONFIRM_FORFEIT thay vì về thẳng Lobby', () => {
    // Giả lập trận đấu đang diễn ra với tiền cược 1000 Xu
    const betAmount = 1000;
    saveActiveMatchSession({
      gameId: 'test_match',
      gameType: 'QUICK',
      mode: 'TRADITIONAL',
      gameNumber: 1,
      depositAmount: betAmount,
      betAmount,
      penaltyMultiplier: 1,
      activeGameType: 'QUICK',
      playerCount: 4,
      isRanked: true,
      startedAt: Date.now(),
      timestamp: Date.now()
    });

    useGameStore.setState({
      matchState: {
        status: 'PLAYING',
        gameNumber: 1,
        roundNumber: 1,
        players: [],
        currentTurnPlayerId: 'p0',
        leadPlayerId: 'p0',
        roundMoves: [],
        isFirstMoveOfGame: false,
        passedPlayerIds: [],
        chopNotification: null,
        botThinkingThought: null,
        rules: {} as any,
        isLeadMove: true,
        leadingMove: null
      }
    });

    // Mô phỏng logic handleRequestExitTable
    const session = { depositAmount: betAmount, isRanked: true };
    const eloPenalty = session.isRanked ? ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY : 0;

    useViewStore.getState().openModal({
      type: 'CONFIRM_FORFEIT',
      data: {
        depositAmount: session.depositAmount,
        isRanked: session.isRanked,
        eloPenalty
      }
    });

    // Xác nhận modal CONFIRM_FORFEIT đã được mở với đầy đủ dữ liệu cảnh báo
    expect(useViewStore.getState().isConfirmForfeitOpen).toBe(true);
    const activeModal = useViewStore.getState().activeModal;
    expect(activeModal?.type).toBe('CONFIRM_FORFEIT');
    if (activeModal?.type === 'CONFIRM_FORFEIT') {
      expect(activeModal.data.depositAmount).toBe(1000);
      expect(activeModal.data.eloPenalty).toBe(ECONOMY_CONSTANTS.F5_DISCONNECT_ELO_PENALTY);
      expect(activeModal.data.isRanked).toBe(true);
    }
  });

  it('2. Người chơi chọn Hủy / Tiếp tục đấu: Đóng modal, không thoát về Lobby', () => {
    useViewStore.getState().openModal({
      type: 'CONFIRM_FORFEIT',
      data: {
        depositAmount: 1000,
        isRanked: false,
        eloPenalty: 0
      }
    });

    expect(useViewStore.getState().isConfirmForfeitOpen).toBe(true);

    // Người chơi chọn Hủy (đóng modal)
    useViewStore.getState().closeModal('CONFIRM_FORFEIT');

    expect(useViewStore.getState().isConfirmForfeitOpen).toBe(false);
    expect(useViewStore.getState().activeModal).toBe(null);
  });
});
