import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { soundManager } from '../../src/ui/audio/sound-manager';
import * as handSorter from '../../src/engine/hand-sorter';
import { PlayerHandView } from '../../src/ui/components/PlayerHandView';
import { useGameStore } from '../../src/stores/useGameStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import { useVictoryLogic, type VictoryLogicResult } from '../../src/ui/hooks/useVictoryLogic';
import { useOnlineRoomLogic, type UseOnlineRoomLogicResult } from '../../src/ui/hooks/useOnlineRoomLogic';
import { P2PClient } from '../../src/engine/network/p2p-client';
import { createCard } from '../../src/engine/card';
import { createPlayer } from '../../src/engine/player-factory';
import { createPerspectiveSettlement } from '../../src/engine/settlement/perspective-settlement';
import { type MatchPlayer } from '../../src/engine/types';

describe('Kiểm Thử Các Tối Ưu Hóa Hiệu Năng (Performance Optimizations Test Suite)', () => {
  // =========================================================================
  // 1. WEB AUDIO SOUND MANAGER - BUFFER CACHING OPTIMIZATION
  // =========================================================================
  describe('1. Web Audio SoundManager (Tối Ưu Cấp Phát Bộ Nhớ Âm Thanh)', () => {
    it('Tái sử dụng AudioBuffer cho tiếng chia bài và xào bài, không cấp phát lặp lại', () => {
      let bufferAllocations = 0;
      class MockAudioContext {
        public sampleRate = 44100;
        public currentTime = 0;
        public state = 'running';
        public destination = {};
        public createGain() {
          return {
            gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
            connect: () => {}
          };
        }
        public createBuffer(channels: number, length: number, sampleRate: number) {
          bufferAllocations++;
          return {
            sampleRate,
            length,
            getChannelData: () => new Float32Array(length)
          };
        }
        public createBufferSource() {
          return {
            buffer: null,
            connect: () => {},
            start: () => {},
            stop: () => {}
          };
        }
        public createBiquadFilter() {
          return {
            type: '',
            frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
            Q: { setValueAtTime: () => {} },
            connect: () => {}
          };
        }
        public createOscillator() {
          return {
            type: '',
            frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
            connect: () => {},
            start: () => {},
            stop: () => {}
          };
        }
        public resume() {
          return Promise.resolve();
        }
      }

      soundManager.enabled = true;
      (soundManager as any).ctx = new MockAudioContext() as any;
      (soundManager as any).dealNoiseBuffer = null;
      (soundManager as any).shuffleNoiseBuffer = null;

      // Giả lập chia 52 lá bài liên tiếp trong 1 ván
      for (let i = 0; i < 52; i++) {
        soundManager.playCardDeal(i % 4);
      }
      // Khẳng định: Chỉ có duy nhất 1 buffer được tạo cho 52 lần chia bài
      expect(bufferAllocations).toBe(1);

      // Giả lập xào bài 10 lần
      for (let i = 0; i < 10; i++) {
        soundManager.playShuffle();
      }
      // Khẳng định: Thêm đúng 1 buffer cho xào bài, tổng cộng 2 buffers (thay vì 62 buffers)
      expect(bufferAllocations).toBe(2);

      // Dọn dẹp
      (soundManager as any).ctx = null;
      (soundManager as any).dealNoiseBuffer = null;
      (soundManager as any).shuffleNoiseBuffer = null;
    });
  });

  // =========================================================================
  // 2. PLAYER HAND VIEW - LAZY VARIANT COMPUTATION OPTIMIZATION
  // =========================================================================
  describe('2. PlayerHandView (Hoãn Tính Toán Tổ Hợp Bài - Lazy Computation)', () => {
    it('Bỏ qua tính toán getAvailableSmartVariants khi người chơi ở chế độ sắp xếp thông thường', () => {
      const mockPlayer: MatchPlayer = {
        id: 'p0',
        name: 'Người Chơi',
        hand: [createCard(3, 'SPADES'), createCard(4, 'HEARTS'), createCard(5, 'DIAMONDS')],
        cardCount: 3,
        playedCards: [],
        score: 10000,
        avatar: '🤠',
        isBot: false,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false
      };

      const spy = spyOn(handSorter, 'getAvailableSmartVariants');

      // 1. Chế độ NATURAL: Thuật toán không được chạy
      renderToString(
        <PlayerHandView
          player={mockPlayer}
          selectedCardIds={new Set()}
          onToggleCardSelect={() => {}}
          onClearCardSelection={() => {}}
          onPlaySelectedCards={() => {}}
          onPassTurn={() => {}}
          onAutoSort={() => {}}
          onQuickSelect={() => {}}
          canQuickSelect={false}
          quickSelectCandidatesCount={0}
          isCurrentTurn={true}
          canPlay={false}
          canPass={false}
          isLeader={false}
          isDealing={false}
          dealtCardsCount={0}
          isFirstMoveOfGame={false}
          firstMoveRequiredCard={null}
          sortMode="NATURAL"
          variantIndex={0}
          cardSize="md"
          reverseButtons={false}
          quickResponseAssistEnabled={true}
          dealBanner={null}
          openingReason={null}
          chopNotification={null}
          reconnectNotice={null}
        />
      );
      expect(spy).not.toHaveBeenCalled();

      // 2. Chế độ SMART_GROUP: Thuật toán được kích hoạt để phân nhóm
      renderToString(
        <PlayerHandView
          player={mockPlayer}
          selectedCardIds={new Set()}
          onToggleCardSelect={() => {}}
          onClearCardSelection={() => {}}
          onPlaySelectedCards={() => {}}
          onPassTurn={() => {}}
          onAutoSort={() => {}}
          onQuickSelect={() => {}}
          canQuickSelect={false}
          quickSelectCandidatesCount={0}
          isCurrentTurn={true}
          canPlay={false}
          canPass={false}
          isLeader={false}
          isDealing={false}
          dealtCardsCount={0}
          isFirstMoveOfGame={false}
          firstMoveRequiredCard={null}
          sortMode="SMART_GROUP"
          variantIndex={0}
          cardSize="md"
          reverseButtons={false}
          quickResponseAssistEnabled={true}
          dealBanner={null}
          openingReason={null}
          chopNotification={null}
          reconnectNotice={null}
        />
      );
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // =========================================================================
  // 3. ZUSTAND SELECTORS & USE_SHALLOW OPTIMIZATION
  // =========================================================================
  describe('3. Zustand Store Selectors (Giảm Thiểu Re-render Bằng useShallow)', () => {
    it('useVictoryLogic: Khởi tạo và trích xuất thông tin kết toán an toàn qua useShallow', () => {
      const userProfile = useUserStore.getState().profile;
      const myId = userProfile.id;
      const players = [
        createPlayer({ id: myId, name: 'Người Chơi', score: 10000 })
      ];
      const settlement = createPerspectiveSettlement({
        subjectPlayerId: myId,
        allPlayers: players,
        winners: [players[0]],
        payouts: { [myId]: 5000 },
        eloDeltas: { [myId]: 10 },
        subjectEloDelta: 10,
        subjectEloBreakdown: null,
        loanDeduction: 0,
        isThreeSpadesWin: false,
        instantWinType: null,
        betAmount: 1000,
        subjectCoins: 10000,
        activeGameType: 'QUICK'
      });

      useGameStore.getState().setMyPlayerId(myId);
      useGameStore.getState().setPlayers(players);
      useGameStore.getState().setWinners([players[0]]);
      useGameStore.getState().setMatchPayouts({ [myId]: 5000 });
      useGameStore.getState().setPerspectiveSettlement(settlement);

      let logicResult: VictoryLogicResult | null = null;
      const VictoryTestComp = () => {
        logicResult = useVictoryLogic({
          isOpen: true,
          onNextGame: () => {},
          onReturnToLobby: () => {}
        });
        return null;
      };

      renderToString(React.createElement(VictoryTestComp));

      expect(logicResult).not.toBeNull();
      expect(typeof logicResult!.modalTitle).toBe('string');
      expect(typeof logicResult!.primaryBtnText).toBe('string');
      expect(typeof logicResult!.primaryBtnAction).toBe('function');
      expect(typeof logicResult!.secondaryBtnAction).toBe('function');
    });

    it('useOnlineRoomLogic: Trích xuất action và roomState bằng shallow selector không gây crash', () => {
      let roomLogicResult: UseOnlineRoomLogicResult | null = null;
      const RoomTestComp = () => {
        roomLogicResult = useOnlineRoomLogic();
        return null;
      };

      renderToString(React.createElement(RoomTestComp));

      expect(roomLogicResult).not.toBeNull();
      expect(roomLogicResult!.tab).toBe('LOBBY');
      expect(roomLogicResult!.tableConfig).toBeDefined();
      expect(typeof roomLogicResult!.handleCreate).toBe('function');
      expect(typeof roomLogicResult!.handleJoin).toBe('function');
    });
  });

  // =========================================================================
  // 4. WEBSOCKET P2P RECONNECTION LOGIC
  // =========================================================================
  describe('4. WebSocket P2P Client (Cơ Chế Auto-Reconnect Khi Rớt Mạng)', () => {
    it('Xử lý exponential backoff khi gặp lỗi CHANNEL_ERROR và TIMED_OUT', async () => {
      const client = new P2PClient();
      client.join('TL-OPT-TEST');

      expect(client.getReconnectAttemptsForTest()).toBe(0);
      expect(client.getIsReconnectingForTest()).toBe(false);

      // Kích hoạt lỗi kết nối lần 1
      await client.handleStatusChangeForTest('CHANNEL_ERROR');
      expect(client.getReconnectAttemptsForTest()).toBe(1);
      expect(client.getIsReconnectingForTest()).toBe(true);

      // Kích hoạt lỗi kết nối lần 2 (backoff lũy thừa)
      await client.handleStatusChangeForTest('TIMED_OUT');
      expect(client.getReconnectAttemptsForTest()).toBe(2);
      expect(client.getIsReconnectingForTest()).toBe(true);

      // Kết nối thành công -> reset toàn bộ trạng thái retry
      await client.handleStatusChangeForTest('SUBSCRIBED');
      expect(client.getReconnectAttemptsForTest()).toBe(0);
      expect(client.getIsReconnectingForTest()).toBe(false);

      // Thoát phòng dọn dẹp an toàn
      client.leave();
      expect(client.getIsReconnectingForTest()).toBe(false);
      expect(client.getReconnectAttemptsForTest()).toBe(0);
    });
  });
});
