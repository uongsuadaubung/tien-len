import { describe, test, expect } from 'bun:test';
import { ChopChainStateMachine } from '../../src/engine/state-machine/chop-chain-fsm';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import type { PlayedMove } from '../../src/engine/types';

describe('ChopChainStateMachine & RoundChopState (Kiểm Thử State Pattern Chuỗi Chặt Heo/Hàng)', () => {
  const card2S = createCard(15, 'SPADES');
  const twoComb = identifyCombination([card2S])!;

  // 3 đôi thông
  const threePairsCards = [
    createCard(3, 'SPADES'), createCard(3, 'HEARTS'),
    createCard(4, 'SPADES'), createCard(4, 'HEARTS'),
    createCard(5, 'SPADES'), createCard(5, 'HEARTS')
  ];
  const threePairsComb = identifyCombination(threePairsCards)!;

  // Tứ quý 6
  const fourCards = [
    createCard(6, 'SPADES'), createCard(6, 'CLUBS'),
    createCard(6, 'DIAMONDS'), createCard(6, 'HEARTS')
  ];
  const fourComb = identifyCombination(fourCards)!;

  // 4 đôi thông
  const fourPairsCards = [
    createCard(7, 'SPADES'), createCard(7, 'HEARTS'),
    createCard(8, 'SPADES'), createCard(8, 'HEARTS'),
    createCard(9, 'SPADES'), createCard(9, 'HEARTS'),
    createCard(10, 'SPADES'), createCard(10, 'HEARTS')
  ];
  const fourPairsComb = identifyCombination(fourPairsCards)!;

  test('1. Trạng thái khởi tạo là NO_CHOP', () => {
    const fsm = new ChopChainStateMachine();
    expect(fsm.state.type).toBe('NO_CHOP');
  });

  test('2. Nước đi bình thường (không phải chặt) giữ nguyên trạng thái NO_CHOP', () => {
    const fsm = new ChopChainStateMachine();
    const result = fsm.evaluateMove({
      isChopMove: false,
      chopperId: 'p0',
      leadingMove: null,
      basePenalty: 0,
      isCascadeRuleActive: true,
      currentRoundChopMoves: []
    });

    expect(result.isChop).toBe(false);
    expect(result.penaltyAmount).toBe(0);
    expect(result.nextState.type).toBe('NO_CHOP');
  });

  test('3. Chặt Đơn Lẻ (Single Chop): Heo bị chặt bởi 3 Đôi Thông', () => {
    const fsm = new ChopChainStateMachine();

    const moveA: PlayedMove = {
      playerId: 'p0',
      combination: twoComb,
      timestamp: Date.now(),
      isChop: false,
      choppedPlayerId: null,
      penaltyAmount: null,
      isCascadeChop: null,
      chopChainCount: null,
      chopChainTotalAmount: null
    };

    const res = fsm.evaluateMove({
      isChopMove: true,
      chopperId: 'p1',
      leadingMove: moveA,
      basePenalty: 1000,
      isCascadeRuleActive: true,
      currentRoundChopMoves: []
    });

    expect(res.isChop).toBe(true);
    expect(res.isCascadeChop).toBe(false);
    expect(res.chopChainCount).toBe(1);
    expect(res.choppedPlayerId).toBe('p0');
    expect(res.penaltyAmount).toBe(1000);
    expect(res.refund).toBeNull();
    expect(fsm.state.type).toBe('SINGLE_CHOP');

    if (fsm.state.type === 'SINGLE_CHOP') {
      expect(fsm.state.chopperPlayerId).toBe('p1');
      expect(fsm.state.choppedPlayerId).toBe('p0');
      expect(fsm.state.penaltyAmount).toBe(1000);
    }
  });

  test('4. Chuỗi Chặt Chồng Tích Lũy (Cascade Chop Chain: 2 -> 3 Đôi Thông -> Tứ Quý -> 4 Đôi Thông)', () => {
    const fsm = new ChopChainStateMachine();

    // Bước 1: p0 đánh Heo, p1 chặt bằng 3 Đôi Thông (1000 xu)
    const moveChop1: PlayedMove = {
      playerId: 'p1',
      combination: threePairsComb,
      timestamp: Date.now(),
      isChop: true,
      choppedPlayerId: 'p0',
      penaltyAmount: 1000,
      isCascadeChop: false,
      chopChainCount: 1,
      chopChainTotalAmount: 1000
    };

    // Bước 2: p2 đánh Tứ Quý chặt đè p1 (basePenalty = 2000 xu)
    const res2 = fsm.evaluateMove({
      isChopMove: true,
      chopperId: 'p2',
      leadingMove: moveChop1,
      basePenalty: 2000,
      isCascadeRuleActive: true,
      currentRoundChopMoves: [moveChop1]
    });

    expect(res2.isCascadeChop).toBe(true);
    expect(res2.chopChainCount).toBe(2);
    expect(res2.choppedPlayerId).toBe('p1');
    expect(res2.penaltyAmount).toBe(3000); // 1000 + 2000
    expect(res2.refund).not.toBeNull();
    expect(res2.refund?.toPlayerId).toBe('p0');   // Hoàn trả cho p0
    expect(res2.refund?.fromPlayerId).toBe('p1'); // Thu hồi từ p1
    expect(res2.refund?.amount).toBe(1000);
    expect(fsm.state.type).toBe('CASCADE_CHOP_CHAIN');

    const moveChop2: PlayedMove = {
      playerId: 'p2',
      combination: fourComb,
      timestamp: Date.now(),
      isChop: true,
      choppedPlayerId: 'p1',
      penaltyAmount: 3000,
      isCascadeChop: true,
      chopChainCount: 2,
      chopChainTotalAmount: 3000
    };

    // Bước 3: p3 đánh 4 Đôi Thông chặt đè p2 (basePenalty = 3000 xu)
    const res3 = fsm.evaluateMove({
      isChopMove: true,
      chopperId: 'p3',
      leadingMove: moveChop2,
      basePenalty: 3000,
      isCascadeRuleActive: true,
      currentRoundChopMoves: [moveChop1, moveChop2]
    });

    expect(res3.isCascadeChop).toBe(true);
    expect(res3.chopChainCount).toBe(3);
    expect(res3.choppedPlayerId).toBe('p2');
    expect(res3.penaltyAmount).toBe(6000); // 3000 + 3000
    expect(res3.refund?.toPlayerId).toBe('p1');   // Hoàn trả cho p1
    expect(res3.refund?.fromPlayerId).toBe('p2'); // Thu hồi từ p2
    expect(res3.refund?.amount).toBe(3000);

    if (fsm.state.type === 'CASCADE_CHOP_CHAIN') {
      expect(fsm.state.chainCount).toBe(3);
      expect(fsm.state.currentChopperPlayerId).toBe('p3');
      expect(fsm.state.currentChoppedPlayerId).toBe('p2');
      expect(fsm.state.totalPenaltyAmount).toBe(6000);
      expect(fsm.state.originalVictimPlayerId).toBe('p0');
    }
  });

  test('5. Reset đưa trạng thái về NO_CHOP', () => {
    const fsm = new ChopChainStateMachine();
    fsm.reset();
    expect(fsm.state.type).toBe('NO_CHOP');
  });
});
