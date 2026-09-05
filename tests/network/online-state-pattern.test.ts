import { describe, test, expect, beforeEach } from 'bun:test';
import { useOnlineStore } from '../../src/stores/useOnlineStore';
import type { 
  OnlineSessionState, 
  InRoomWaitingOnlineState, 
  InRoomPlayingOnlineState,
  DisbandedOnlineState
} from '../../src/stores/online/types';
import type { OnlineRoomState } from '../../src/engine/network/network.schema';

describe('OnlineSessionState & State Pattern (P2P Multiplayer Online Room Session)', () => {
  beforeEach(() => {
    useOnlineStore.setState({
      sessionState: {
        status: 'IDLE',
        publicRooms: []
      },
      isOnlineMatch: false,
      isHost: false,
      roomCode: null,
      roomState: null,
      myPlayerId: 'p0',
      connectionStatus: 'IDLE',
      disbandNotice: null,
      publicRooms: [],
      isBrowsingLobby: false,
      isLobbyLoading: false
    });
  });
  const dummyRoomState: OnlineRoomState = {
    roomCode: 'TL-9999',
    hostPeerId: 'peer_host_1',
    playerCount: 4,
    betAmount: 1000,
    settlementRule: 'COUNT_CARDS',
    choppingMultiplier: 1,
    congMultiplier: 1,
    congEnabled: true,
    prohibitEndingWithTwo: true,
    allowFourPairsCutAnytime: true,
    threeSpadesEndingBonus: true,
    cascadeChopEnabled: true,
    players: [
      {
        peerId: 'peer_host_1',
        playerId: 'p0',
        name: 'Chủ Phòng',
        avatar: '🤠',
        elo: 1200,
        coins: 100000,
        isHost: true,
        isReady: true,
        isBot: false
      }
    ],
    status: 'WAITING',
    disbandReason: null,
    isPublic: true,
    updatedAt: Date.now()
  };

  test('1. Khởi tạo mặc định ở trạng thái IDLE với publicRooms rỗng', () => {
    const store = useOnlineStore.getState();
    expect(store.sessionState.status).toBe('IDLE');
    if (store.sessionState.status === 'IDLE') {
      expect(store.sessionState.publicRooms).toEqual([]);
    }
  });

  test('2. Chuyển sang CONNECTING khi gia nhập phòng: targetRoomCode đảm bảo không null', () => {
    const store = useOnlineStore.getState();
    const connectingState: OnlineSessionState = {
      status: 'CONNECTING',
      targetRoomCode: 'TL-1234',
      attemptCount: 1
    };

    store.setSessionState(connectingState);
    const updated = useOnlineStore.getState().sessionState;
    expect(updated.status).toBe('CONNECTING');

    if (updated.status === 'CONNECTING') {
      expect(updated.targetRoomCode).toBe('TL-1234');
      expect(updated.attemptCount).toBe(1);
    }
  });

  test('3. Chuyển sang IN_ROOM_WAITING: roomCode và roomState BẢO ĐẢM TỒN TẠI (Non-null guarantees)', () => {
    const store = useOnlineStore.getState();
    const inRoomState: InRoomWaitingOnlineState = {
      status: 'IN_ROOM_WAITING',
      roomCode: 'TL-9999',
      roomState: dummyRoomState,
      isHost: true,
      myPlayerId: 'p0'
    };

    store.setSessionState(inRoomState);
    const current = useOnlineStore.getState().sessionState;
    expect(current.status).toBe('IN_ROOM_WAITING');

    // TypeScript Narrowing: Không cần check roomCode !== null hay roomState !== null
    if (current.status === 'IN_ROOM_WAITING') {
      expect(current.roomCode).toBe('TL-9999');
      expect(current.roomState.betAmount).toBe(1000);
      expect(current.isHost).toBe(true);
      expect(current.myPlayerId).toBe('p0');
    }
  });

  test('4. Chuyển sang IN_ROOM_PLAYING: roomCode, roomState và myPlayerId đảm bảo luôn hợp lệ', () => {
    const store = useOnlineStore.getState();
    const playingState: InRoomPlayingOnlineState = {
      status: 'IN_ROOM_PLAYING',
      roomCode: 'TL-9999',
      roomState: { ...dummyRoomState, status: 'PLAYING' },
      isHost: true,
      myPlayerId: 'p0',
      hostDriver: null
    };

    store.setSessionState(playingState);
    const current = useOnlineStore.getState().sessionState;
    expect(current.status).toBe('IN_ROOM_PLAYING');

    if (current.status === 'IN_ROOM_PLAYING') {
      expect(current.roomState.status).toBe('PLAYING');
      expect(current.roomCode).toBe('TL-9999');
      expect(current.hostDriver).toBeNull();
    }
  });

  test('5. Chuyển sang DISBANDED: notice đảm bảo có đầy đủ tiêu đề và nội dung', () => {
    const store = useOnlineStore.getState();
    const disbandedState: DisbandedOnlineState = {
      status: 'DISBANDED',
      notice: {
        title: 'BÀN CHƠI ĐÃ BỊ GIẢI TÁN',
        message: 'Chủ phòng đã thoát khỏi bàn chơi.'
      }
    };

    store.setSessionState(disbandedState);
    const current = useOnlineStore.getState().sessionState;
    expect(current.status).toBe('DISBANDED');

    if (current.status === 'DISBANDED') {
      expect(current.notice.title).toBe('BÀN CHƠI ĐÃ BỊ GIẢI TÁN');
      expect(current.notice.message).toContain('Chủ phòng');
    }
  });

  test('6. Chuyển về IDLE khi rời phòng (leaveRoom)', () => {
    const store = useOnlineStore.getState();
    store.leaveRoom();

    const current = useOnlineStore.getState().sessionState;
    expect(current.status).toBe('IDLE');
  });
});
