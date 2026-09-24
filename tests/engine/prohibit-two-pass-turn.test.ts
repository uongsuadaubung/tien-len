import { describe, it, expect, beforeEach } from 'bun:test';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import { GameEngine } from '../../src/engine/game';
import { GameRulesBuilder } from '../../src/engine/types';
import { createPlayer } from '../../src/engine/player-factory';
import { projectTableFrame } from '../../src/engine/presentation/table-frame-projector';
import { transitionToWaiting, transitionToPlaying } from '../../src/engine/state-machine/match-state-machine';
import { settleCompletedMatch } from '../../src/services/match-settlement-service';
import { useUserStore } from '../../src/stores/useUserStore';
import { useGameStore } from '../../src/stores/useGameStore';

describe('Kiểm thử Bỏ Lượt & Cấm Đánh 2 Cuối (Prohibit Ending With Two & Pass Turn Logic)', () => {
  beforeEach(() => {
    useUserStore.getState().resetProfile();
    useGameStore.getState().resetMatchState();
  });

  it('Case 1: Người chơi cầm cái chỉ còn Heo và cấm đánh 2 cuối -> KHÔNG được đánh 2 nhưng BẮT BUỘC PHẢI BỎ LƯỢT ĐƯỢC', () => {
    const card2H = createCard(15, 'HEARTS');
    const player0 = createPlayer({ id: 'p0', name: 'Player 0', hand: [card2H], score: 50000 });
    const player1 = createPlayer({ id: 'p1', name: 'Player 1', hand: [createCard(5, 'SPADES')], score: 50000 });

    const rules = new GameRulesBuilder()
      .withGameFlow(g => g.prohibitEndingWithTwo(true))
      .withTable(t => t.betAmount(1000))
      .build();

    const waitingState = transitionToWaiting({ gameNumber: 2, players: [player0, player1], rules });
    const playingState = transitionToPlaying(waitingState, {
      roundNumber: 1,
      players: [player0, player1],
      currentTurnPlayerId: 'p0',
      leadPlayerId: 'p0',
      leadingMove: null,
      isLeadMove: true,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null
    });

    const frame = projectTableFrame({
      matchState: playingState,
      localPlayerId: 'p0',
      localHand: [card2H],
      selectedCardIds: new Set([card2H.id]),
      gameRules: rules,
      players: [player0, player1],
      dealtCounts: { p0: 1, p1: 1 },
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null,
      turnDeadline: null,
      openingReason: null,
      lastAction: null,
      currentMoveCombinationName: null,
      playerWins: {}
    });

    // 1. Nút Đánh phải bị khóa vì vi phạm luật cấm về Heo
    expect(frame.controls.canPlay).toBe(false);
    // 2. Nút Bỏ lượt BẮT BUỘC PHẢI MỞ (canPass = true) để tránh kẹt bàn (deadlock)
    expect(frame.controls.canPass).toBe(true);
  });

  it('Case 2: Người chơi cầm cái còn bài bình thường hợp lệ -> KHÔNG được bỏ lượt khi cầm cái', () => {
    const card3S = createCard(3, 'SPADES');
    const card4D = createCard(4, 'DIAMONDS');
    const player0 = createPlayer({ id: 'p0', name: 'Player 0', hand: [card3S, card4D], score: 50000 });
    const player1 = createPlayer({ id: 'p1', name: 'Player 1', hand: [createCard(5, 'SPADES')], score: 50000 });

    const rules = new GameRulesBuilder()
      .withGameFlow(g => g.prohibitEndingWithTwo(true))
      .build();

    const waitingState = transitionToWaiting({ gameNumber: 2, players: [player0, player1], rules });
    const playingState = transitionToPlaying(waitingState, {
      roundNumber: 1,
      players: [player0, player1],
      currentTurnPlayerId: 'p0',
      leadPlayerId: 'p0',
      leadingMove: null,
      isLeadMove: true,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null
    });

    const frame = projectTableFrame({
      matchState: playingState,
      localPlayerId: 'p0',
      localHand: [card3S, card4D],
      selectedCardIds: new Set([card3S.id]),
      gameRules: rules,
      players: [player0, player1],
      dealtCounts: { p0: 2, p1: 1 },
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null,
      turnDeadline: null,
      openingReason: null,
      lastAction: null,
      currentMoveCombinationName: null,
      playerWins: {}
    });

    // Có bài mở màn hợp lệ nên canPlay = true
    expect(frame.controls.canPlay).toBe(true);
    // Có bài hợp lệ để mở vòng thì không được bỏ lượt bừa bãi
    expect(frame.controls.canPass).toBe(false);
  });

  it('Case 3: Lượt mở màn ván 1 (isFirstMoveOfGame) -> Tuyệt đối cấm bỏ lượt', () => {
    const card3S = createCard(3, 'SPADES');
    const player0 = createPlayer({ id: 'p0', name: 'Player 0', hand: [card3S], score: 50000 });
    const player1 = createPlayer({ id: 'p1', name: 'Player 1', hand: [createCard(5, 'SPADES')], score: 50000 });

    const rules = new GameRulesBuilder().build();

    const waitingState = transitionToWaiting({ gameNumber: 1, players: [player0, player1], rules });
    const playingState = transitionToPlaying(waitingState, {
      roundNumber: 1,
      players: [player0, player1],
      currentTurnPlayerId: 'p0',
      leadPlayerId: 'p0',
      leadingMove: null,
      isLeadMove: true,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: card3S
    });

    const frame = projectTableFrame({
      matchState: playingState,
      localPlayerId: 'p0',
      localHand: [card3S],
      selectedCardIds: new Set(),
      gameRules: rules,
      players: [player0, player1],
      dealtCounts: { p0: 1, p1: 1 },
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null,
      turnDeadline: null,
      openingReason: null,
      lastAction: null,
      currentMoveCombinationName: null,
      playerWins: {}
    });

    expect(frame.controls.canPass).toBe(false);
  });

  it('Case 4: Người chơi theo vòng (Follow move, !isLeadMove) -> Luôn được phép bỏ lượt', () => {
    const card4D = createCard(4, 'DIAMONDS');
    const player0 = createPlayer({ id: 'p0', name: 'Player 0', hand: [card4D], score: 50000 });
    const player1 = createPlayer({ id: 'p1', name: 'Player 1', hand: [createCard(5, 'SPADES')], score: 50000 });

    const rules = new GameRulesBuilder().build();

    const card5S = createCard(5, 'SPADES');
    const combo5S = identifyCombination([card5S])!;
    const waitingState = transitionToWaiting({ gameNumber: 2, players: [player0, player1], rules });
    const playingState = transitionToPlaying(waitingState, {
      roundNumber: 1,
      players: [player0, player1],
      currentTurnPlayerId: 'p0',
      leadPlayerId: 'p1',
      leadingMove: {
        playerId: 'p1',
        combination: combo5S,
        isChop: false
      },
      isLeadMove: false,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null
    });

    const frame = projectTableFrame({
      matchState: playingState,
      localPlayerId: 'p0',
      localHand: [card4D],
      selectedCardIds: new Set(),
      gameRules: rules,
      players: [player0, player1],
      dealtCounts: { p0: 1, p1: 1 },
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null,
      turnDeadline: null,
      openingReason: null,
      lastAction: null,
      currentMoveCombinationName: null,
      playerWins: {}
    });

    expect(frame.controls.canPass).toBe(true);
  });

  it('Case 5: Người cầm cái bỏ lượt trong engine -> Quyền mở vòng (lead) tự động chuyển cho người tiếp theo', () => {
    const card2H = createCard(15, 'HEARTS');
    const card5S = createCard(5, 'SPADES');
    const p0 = createPlayer({ id: 'p0', name: 'P0', hand: [card2H], score: 50000 });
    const p1 = createPlayer({ id: 'p1', name: 'P1', hand: [card5S], score: 50000 });

    const rules = new GameRulesBuilder()
      .withGameFlow(g => g.prohibitEndingWithTwo(true))
      .build();

    const engine = new GameEngine([p0, p1], rules);
    engine.gameNumber = 2;
    engine.isFirstMoveOfGame = false;
    engine.currentRound.leadPlayerId = 'p0';
    engine.currentRound.currentTurnPlayerId = 'p0';

    // P0 chỉ còn Heo, không thể đánh 2, thực hiện bỏ lượt (passTurn)
    const passResult = engine.passTurn('p0');
    expect(passResult.success).toBe(true);

    // Quyền cầm cái và lượt đánh được chuyển giao sang P1
    expect(engine.currentRound.leadPlayerId).toBe('p1');
    expect(engine.currentRound.currentTurnPlayerId).toBe('p1');

    // P1 đánh 5 Bích và về Nhất
    const playResult = engine.playMove('p1', [card5S]);
    expect(playResult.success).toBe(true);
    expect(engine.isGameOver).toBe(true);
    expect(engine.winners[0].id).toBe('p1');
  });

  it('Case 6: 4 người chơi pass liên tục khi cầm cái -> Ván đấu kết thúc an toàn, không bị lặp vô hạn và không crash', () => {
    const p0 = createPlayer({ id: 'p0', name: 'P0', hand: [createCard(15, 'HEARTS')], score: 50000 });
    const p1 = createPlayer({ id: 'p1', name: 'P1', hand: [createCard(15, 'DIAMONDS')], score: 50000 });
    const p2 = createPlayer({ id: 'p2', name: 'P2', hand: [createCard(15, 'CLUBS')], score: 50000 });
    const p3 = createPlayer({ id: 'p3', name: 'P3', hand: [createCard(15, 'SPADES')], score: 50000 });

    const rules = new GameRulesBuilder()
      .withGameFlow(g => g.prohibitEndingWithTwo(true))
      .withSettlement(s => s.gameType('DEM_LA'))
      .withTable(t => t.betAmount(1000))
      .build();

    const engine = new GameEngine([p0, p1, p2, p3], rules);
    engine.gameNumber = 2;
    engine.isFirstMoveOfGame = false;
    engine.currentRound.leadPlayerId = 'p0';
    engine.currentRound.currentTurnPlayerId = 'p0';

    // 4 người chơi lần lượt bỏ lượt vì đều chỉ còn Heo cấm về
    expect(engine.passTurn('p0').success).toBe(true);
    expect(engine.currentRound.leadPlayerId).toBe('p1');

    expect(engine.passTurn('p1').success).toBe(true);
    expect(engine.currentRound.leadPlayerId).toBe('p2');

    expect(engine.passTurn('p2').success).toBe(true);
    expect(engine.currentRound.leadPlayerId).toBe('p3');

    // Người thứ 4 bỏ lượt -> Toàn bộ bàn đã bỏ lượt khi cầm cái
    expect(engine.passTurn('p3').success).toBe(true);

    // Ván đấu phải kết thúc dứt điểm ngay lập tức (Deadlock-Free Termination)
    expect(engine.isGameOver).toBe(true);
    expect(engine.winners.length).toBeGreaterThan(0);

    // Kết toán authoritative hoàn tất an toàn không quăng lỗi
    useGameStore.getState().setActiveGameType('QUICK');
    const settlement = settleCompletedMatch(engine, 'p0');
    expect(settlement).not.toBeNull();
    expect(settlement.payouts).toBeDefined();
  });

  it('Case 7: 1 người đã về Nhất, 3 người còn lại đều chỉ còn Heo và pass liên tục -> Người về Nhất ăn trọn tiền phạt thối Heo', () => {
    const p0Winner = createPlayer({ id: 'p0', name: 'P0 Winner', hand: [], score: 50000 });
    const p1 = createPlayer({ id: 'p1', name: 'P1', hand: [createCard(15, 'HEARTS')], score: 50000 });
    const p2 = createPlayer({ id: 'p2', name: 'P2', hand: [createCard(15, 'DIAMONDS')], score: 50000 });
    const p3 = createPlayer({ id: 'p3', name: 'P3', hand: [createCard(15, 'CLUBS')], score: 50000 });

    const rules = new GameRulesBuilder()
      .withGameFlow(g => g.prohibitEndingWithTwo(true))
      .withSettlement(s => s.gameType('DEM_LA'))
      .withTable(t => t.betAmount(1000))
      .build();

    const engine = new GameEngine([p0Winner, p1, p2, p3], rules);
    engine.gameNumber = 2;
    engine.isFirstMoveOfGame = false;
    engine.winners = [p0Winner]; // P0 đã về Nhất

    engine.currentRound.leadPlayerId = 'p1';
    engine.currentRound.currentTurnPlayerId = 'p1';

    // 3 người chơi còn lại lần lượt bỏ lượt vì chỉ còn Heo cấm về
    expect(engine.passTurn('p1').success).toBe(true);
    expect(engine.passTurn('p2').success).toBe(true);
    expect(engine.passTurn('p3').success).toBe(true);

    // Ván kết thúc
    expect(engine.isGameOver).toBe(true);
    expect(engine.winners[0].id).toBe('p0');

    // Kết toán: P1, P2, P3 đều bị phạt thối Heo (1 lá bài + phạt Heo) trả cho P0
    const settlement = settleCompletedMatch(engine, 'p0');
    expect(settlement.payouts['p0']).toBeGreaterThan(0);
    expect(settlement.payouts['p1']).toBeLessThan(0);
    expect(settlement.payouts['p2']).toBeLessThan(0);
    expect(settlement.payouts['p3']).toBeLessThan(0);
  });
});
