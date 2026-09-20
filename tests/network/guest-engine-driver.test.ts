import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { GuestEngineDriver } from '../../src/engine/network/guest-engine-driver';
import { globalP2PClient } from '../../src/engine/network/p2p-client';
import { useGameStore } from '../../src/stores/useGameStore';
import { createCard } from '../../src/engine/card';
import type { TableStateSyncPacket, GameEndPacket } from '../../src/engine/network/network.schema';

describe('GuestEngineDriver Integration Tests (Kiểm Thử Trình Điều Khiển Khách Online)', () => {
  beforeEach(() => {
    useGameStore.getState().resetMatchState();
  });

  it('1. Khởi tạo GuestEngineDriver và gửi hành động đánh bài (PLAY action) qua P2PClient', async () => {
    const sendSpy = spyOn(globalP2PClient, 'sendPlayerAction');
    const myPlayerId = 'guest_1';

    const driver = new GuestEngineDriver({
      p2pClient: globalP2PClient,
      myPlayerId
    });

    const cardToPlay = createCard(10, 'HEARTS');
    const res = driver.playCards(myPlayerId, [cardToPlay]);

    expect(res.success).toBe(true);
    expect(sendSpy).toHaveBeenCalled();
    const lastCall = sendSpy.mock.calls[sendSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('PLAY');
    expect(lastCall.playerId).toBe(myPlayerId);
    expect(lastCall.cardIds).toEqual([cardToPlay.id]);

    driver.cleanup();
    sendSpy.mockRestore();
  });

  it('2. Gửi hành động bỏ lượt (PASS action) qua P2PClient', async () => {
    const sendSpy = spyOn(globalP2PClient, 'sendPlayerAction');
    const myPlayerId = 'guest_1';

    const driver = new GuestEngineDriver({
      p2pClient: globalP2PClient,
      myPlayerId
    });

    const res = driver.passTurn(myPlayerId);

    expect(res.success).toBe(true);
    expect(sendSpy).toHaveBeenCalled();
    const lastCall = sendSpy.mock.calls[sendSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('PASS');
    expect(lastCall.playerId).toBe(myPlayerId);

    driver.cleanup();
    sendSpy.mockRestore();
  });

  it('3. Khi nhận TableStateSyncPacket từ Host: tự động cập nhật gameNumber và áp dụng vào GameStore', () => {
    const myPlayerId = 'guest_1';
    let syncListener: ((sync: TableStateSyncPacket, peerId: string) => void) | null = null;

    const onTableSyncSpy = spyOn(globalP2PClient, 'onTableSync').mockImplementation((cb) => {
      syncListener = cb;
      return () => { syncListener = null; };
    });

    const driver = new GuestEngineDriver({
      p2pClient: globalP2PClient,
      myPlayerId
    });

    expect(syncListener).not.toBeNull();

    // Giả lập Host phát gói tin đồng bộ bàn chơi ván 3
    const mockSync: TableStateSyncPacket = {
      seq: 1,
      timestamp: Date.now(),
      gameNumber: 3,
      roundNumber: 1,
      currentTurnPlayerId: myPlayerId,
      leadPlayerId: myPlayerId,
      isLeadMove: true,
      isFirstMoveOfGame: false,
      currentMoveCards: [],
      currentMovePlayerId: undefined,
      currentMoveCombinationType: undefined,
      passedPlayerIds: [],
      remainingCardCounts: { [myPlayerId]: 13, host_1: 13 },
      isGameOver: false,
      winners: [],
      lastActionMessage: 'Lượt đánh mới',
      isChop: false,
      isCascadeChop: false
    };

    if (syncListener) {
      (syncListener as (s: TableStateSyncPacket, peerId: string) => void)(mockSync, 'host_peer');
    }

    expect(driver.gameNumber).toBe(3);
    const store = useGameStore.getState();
    expect(store.gameNumber).toBe(3);
    expect(store.currentTurnPlayerId).toBe(myPlayerId);

    driver.cleanup();
    onTableSyncSpy.mockRestore();
  });

  it('4. Khi nhận GameEndPacket từ Host: kích hoạt onGameEndCallback của Client', () => {
    const myPlayerId = 'guest_1';
    let endListener: ((packet: GameEndPacket, peerId: string) => void) | null = null;
    let endHandled = false;

    const onEndSpy = spyOn(globalP2PClient, 'onGameEnd').mockImplementation((cb) => {
      endListener = cb;
      return () => { endListener = null; };
    });

    const driver = new GuestEngineDriver({
      p2pClient: globalP2PClient,
      myPlayerId,
      onGameEnd: () => {
        endHandled = true;
      }
    });

    expect(endListener).not.toBeNull();

    const mockEndPacket: GameEndPacket = {
      winners: ['host_1', myPlayerId],
      payouts: { host_1: 5000, [myPlayerId]: -5000 },
      allPlayerHands: { host_1: [], [myPlayerId]: [] },
      isThreeSpadesWin: false,
      instantWinType: null,
      loanDeduction: 0,
      eloDeltas: { host_1: 20, [myPlayerId]: -20 }
    };

    if (endListener) {
      (endListener as (p: GameEndPacket, peerId: string) => void)(mockEndPacket, 'host_peer');
    }

    expect(endHandled).toBe(true);

    driver.cleanup();
    onEndSpy.mockRestore();
  });

  it('5. Sau khi cleanup(): chặn các hành động đánh bài hoặc bỏ lượt', () => {
    const driver = new GuestEngineDriver({
      p2pClient: globalP2PClient,
      myPlayerId: 'guest_1'
    });

    driver.cleanup();

    const playRes = driver.playCards('guest_1', [createCard(3, 'SPADES')]);
    expect(playRes.success).toBe(false);

    const passRes = driver.passTurn('guest_1');
    expect(passRes.success).toBe(false);
  });

  it('6. playCardIds: Gửi chính xác danh sách cardIds qua P2PClient mà không phụ thuộc vào đối tượng Card', () => {
    const sendSpy = spyOn(globalP2PClient, 'sendPlayerAction');
    const myPlayerId = 'guest_1';

    const driver = new GuestEngineDriver({
      p2pClient: globalP2PClient,
      myPlayerId
    });

    const res = driver.playCardIds(myPlayerId, ['c_3_s', 'c_4_h']);
    expect(res.success).toBe(true);
    expect(sendSpy).toHaveBeenCalled();
    const lastCall = sendSpy.mock.calls[sendSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('PLAY');
    expect(lastCall.playerId).toBe(myPlayerId);
    expect(lastCall.cardIds).toEqual(['c_3_s', 'c_4_h']);

    driver.cleanup();
    sendSpy.mockRestore();
  });

  it('7. Phòng vệ gói tin out-of-order: Bỏ qua gói tin đồng bộ có sequence number cũ hơn gói tin đã nhận', () => {
    const myPlayerId = 'guest_1';
    let syncListener: ((sync: TableStateSyncPacket, peerId: string) => void) | null = null;

    const onTableSyncSpy = spyOn(globalP2PClient, 'onTableSync').mockImplementation((cb) => {
      syncListener = cb;
      return () => { syncListener = null; };
    });

    const driver = new GuestEngineDriver({
      p2pClient: globalP2PClient,
      myPlayerId
    });

    const basePacket: TableStateSyncPacket = {
      seq: 5,
      timestamp: Date.now(),
      gameNumber: 1,
      roundNumber: 1,
      currentTurnPlayerId: 'host_1',
      leadPlayerId: 'host_1',
      isLeadMove: false,
      isFirstMoveOfGame: false,
      passedPlayerIds: [],
      remainingCardCounts: { [myPlayerId]: 13, host_1: 12 },
      isGameOver: false,
      winners: [],
      lastActionMessage: 'Host đánh bài (seq=5)',
      isChop: false,
      isCascadeChop: false
    };

    // Nhận gói tin seq = 5
    if (syncListener) {
      (syncListener as (s: TableStateSyncPacket, peerId: string) => void)(basePacket, 'host_peer');
    }
    expect(driver.lastSeenStateSyncSeq).toBe(5);
    expect(useGameStore.getState().currentTurnPlayerId).toBe('host_1');

    // Nhận gói tin seq = 3 bị trễ mạng đến sau -> Phải bị BỎ QUA
    const stalePacket: TableStateSyncPacket = {
      ...basePacket,
      seq: 3,
      currentTurnPlayerId: myPlayerId,
      lastActionMessage: 'Gói tin cũ bị trễ (seq=3)'
    };
    if (syncListener) {
      (syncListener as (s: TableStateSyncPacket, peerId: string) => void)(stalePacket, 'host_peer');
    }
    // State của bàn không bị ghi đè bởi gói tin cũ
    expect(driver.lastSeenStateSyncSeq).toBe(5);
    expect(useGameStore.getState().currentTurnPlayerId).toBe('host_1');

    // Nhận gói tin seq = 6 mới hơn -> Được áp dụng
    const newerPacket: TableStateSyncPacket = {
      ...basePacket,
      seq: 6,
      currentTurnPlayerId: myPlayerId,
      lastActionMessage: 'Gói tin mới (seq=6)'
    };
    if (syncListener) {
      (syncListener as (s: TableStateSyncPacket, peerId: string) => void)(newerPacket, 'host_peer');
    }
    expect(driver.lastSeenStateSyncSeq).toBe(6);
    expect(useGameStore.getState().currentTurnPlayerId).toBe(myPlayerId);

    driver.cleanup();
    onTableSyncSpy.mockRestore();
  });
});
