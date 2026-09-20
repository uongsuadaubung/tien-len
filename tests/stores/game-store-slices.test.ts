import { describe, expect, it, beforeEach } from 'bun:test';
import { useGameStore } from '../../src/stores/useGameStore';
import { createCard } from '../../src/engine/card';
import { createPlayer } from '../../src/engine/player-factory';
import { DEFAULT_GAME_RULES } from '../../src/stores/game/tableConfigSlice';

describe('Game Store Slices Architecture Tests (Kiểm Thử Kiến Trúc Tách Slice)', () => {
  beforeEach(() => {
    useGameStore.getState().resetMatchState();
    useGameStore.getState().setHandSortMode('NATURAL');
  });

  it('1. TableConfigSlice: Cập nhật cấu hình sảnh, cược, và rules độc lập', () => {
    const store = useGameStore.getState();

    store.setPlayerCount(2);
    expect(useGameStore.getState().playerCount).toBe(2);

    store.setActiveGameType('CAMPAIGN');
    expect(useGameStore.getState().activeGameType).toBe('CAMPAIGN');

    store.updateGameSettings({ betAmount: 15000 });
    expect(useGameStore.getState().gameSettings.betAmount).toBe(15000);

    store.updateBotPersonaAt(0, 'BOT_ELO_1450');
    expect(useGameStore.getState().botPersonaIds[0]).toBe('BOT_ELO_1450');
  });

  it('2. PlayerHandSlice: Quản lý chọn bài, đổi chế độ xếp bài và xóa lựa chọn độc lập', () => {
    const store = useGameStore.getState();
    const cardId1 = 'c_10_h';
    const cardId2 = 'c_10_d';

    store.toggleCardSelect(cardId1);
    expect(useGameStore.getState().selectedCardIds.has(cardId1)).toBe(true);

    store.toggleCardSelect(cardId2);
    expect(useGameStore.getState().selectedCardIds.size).toBe(2);

    store.toggleHandSortMode();
    expect(useGameStore.getState().handSortMode).toBe('SMART_GROUP');

    store.clearCardSelection();
    expect(useGameStore.getState().selectedCardIds.size).toBe(0);
  });

  it('3. MatchStateSlice: Quản lý trạng thái bàn đấu (matchState) theo chuẩn State Pattern', () => {
    const store = useGameStore.getState();
    const p1 = createPlayer({ id: 'p1', name: 'Player 1', avatar: '🤠', score: 10000 });
    const p2 = createPlayer({ id: 'p2', name: 'Player 2', avatar: '🤖', score: 10000 });

    store.applyMatchState({
      status: 'PLAYING',
      gameNumber: 1,
      roundNumber: 1,
      players: [p1, p2],
      currentTurnPlayerId: 'p1',
      leadPlayerId: 'p1',
      roundMoves: [],
      leadingMove: null,
      isLeadMove: true,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null,
      passedPlayerIds: [],
      chopNotification: null,
      botThinkingThought: null,
      rules: DEFAULT_GAME_RULES
    });

    const current = useGameStore.getState();
    expect(current.matchState.status).toBe('PLAYING');
    expect(current.currentTurnPlayerId).toBe('p1');
    expect(current.leadPlayerId).toBe('p1');
    expect(current.isLeadMove).toBe(true);
  });

  it('4. Composed Store Facade: resetMatchState làm sạch dữ liệu bàn chơi nhưng bảo toàn cấu hình sảnh', () => {
    const store = useGameStore.getState();

    // Thiết lập cấu hình sảnh
    store.setPlayerCount(3);
    store.updateGameSettings({ betAmount: 5000 });

    // Thay đổi trạng thái bàn chơi
    store.toggleCardSelect('card_x');
    store.setIsDealing(true);

    // Reset bàn chơi
    store.resetMatchState();

    const state = useGameStore.getState();
    // Bàn chơi được làm sạch
    expect(state.isDealing).toBe(false);
    expect(state.selectedCardIds.size).toBe(0);
    expect(state.matchState.status).toBe('WAITING');

    // Cấu hình sảnh vẫn được bảo toàn nguyên vẹn
    expect(state.playerCount).toBe(3);
    expect(state.gameSettings.betAmount).toBe(5000);
  });
});
