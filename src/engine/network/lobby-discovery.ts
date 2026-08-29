import { type PublicRoomSummary } from './network.schema';

export const CLOUDFLARE_LOBBY_WORKER_URL = 'https://tienlen-lobby.uongsuadaubung.workers.dev';
export const LOCAL_BROADCAST_CHANNEL_NAME = 'TL_LOCAL_LOBBY_DISCOVERY_V1';
export const LOCAL_STORAGE_REGISTRY_KEY = 'TL_ACTIVE_PUBLIC_ROOMS_REGISTRY';
export const HEARTBEAT_INTERVAL_MS = 6000;
export const ROOM_EXPIRY_TIMEOUT_MS = 25000;
export const AUTO_QUERY_INTERVAL_MS = 10000;

export interface RoomClosePacket {
  [key: string]: string;
  roomCode: string;
}

export interface QueryRoomsPacket {
  [key: string]: number;
  requestedAt: number;
}

type LocalMessage = 
  | { type: 'ANNOUNCE'; summary: PublicRoomSummary }
  | { type: 'CLOSE'; roomCode: string }
  | { type: 'QUERY'; requestedAt: number };

function readLocalStorageRooms(): Map<string, { summary: PublicRoomSummary; lastSeen: number }> {
  const result = new Map<string, { summary: PublicRoomSummary; lastSeen: number }>();
  if (typeof localStorage === 'undefined') return result;

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REGISTRY_KEY);
    if (raw) {
      const parsed: Record<string, { summary: PublicRoomSummary; lastSeen: number }> = JSON.parse(raw);
      const now = Date.now();
      for (const [code, item] of Object.entries(parsed)) {
        if (item && item.summary && item.summary.isPublic && (now - item.lastSeen < ROOM_EXPIRY_TIMEOUT_MS)) {
          result.set(code, item);
        }
      }
    }
  } catch {}
  return result;
}

function writeLocalStorageRoom(summary: PublicRoomSummary | null, removeCode?: string): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const map = readLocalStorageRooms();
    if (removeCode) {
      map.delete(removeCode);
    }
    if (summary && summary.isPublic && summary.status === 'WAITING') {
      map.set(summary.roomCode, { summary, lastSeen: Date.now() });
    }
    const obj: Record<string, { summary: PublicRoomSummary; lastSeen: number }> = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    localStorage.setItem(LOCAL_STORAGE_REGISTRY_KEY, JSON.stringify(obj));
  } catch {}
}

export class LobbyDiscoveryClient {
  private localChannel: BroadcastChannel | null = null;
  private currentSummary: PublicRoomSummary | null = null;
  private broadcastIntervalId: ReturnType<typeof setInterval> | null = null;
  private sweepIntervalId: ReturnType<typeof setInterval> | null = null;
  private activeQueryIntervalId: ReturnType<typeof setInterval> | null = null;

  private activeRoomsMap = new Map<string, { summary: PublicRoomSummary; lastSeen: number }>();
  private onRoomListUpdateCallback: ((rooms: PublicRoomSummary[]) => void) | null = null;

  private isBroadcasting = false;
  private isListening = false;

  private ensureLocalChannel(): void {
    if (this.localChannel || typeof BroadcastChannel === 'undefined') {
      return;
    }
    try {
      this.localChannel = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME);
      this.localChannel.onmessage = (event: MessageEvent<LocalMessage>) => {
        const msg = event.data;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'ANNOUNCE') {
          this.handleIncomingAnnouncement(msg.summary);
        } else if (msg.type === 'CLOSE') {
          this.handleIncomingRoomClose({ roomCode: msg.roomCode });
        } else if (msg.type === 'QUERY') {
          this.handleIncomingQuery();
        }
      };
    } catch {
      // Safe fallback if BroadcastChannel is not supported
    }
  }

  // --- HOST BROADCASTING METHODS ---

  public startBroadcasting(summary: PublicRoomSummary): void {
    if (!summary.isPublic) {
      this.stopBroadcasting();
      return;
    }

    this.currentSummary = summary;
    this.isBroadcasting = true;
    this.ensureLocalChannel();

    // 1. Lưu vào LocalStorage
    writeLocalStorageRoom(summary);

    // 2. Bắn tin lên Cloudflare Worker Hub & BroadcastChannel
    this.broadcastAnnounce();

    // 3. Duy trì phát thanh định kỳ
    if (this.broadcastIntervalId) {
      clearInterval(this.broadcastIntervalId);
    }
    this.broadcastIntervalId = setInterval(() => {
      if (this.isBroadcasting && this.currentSummary && this.currentSummary.status === 'WAITING') {
        this.broadcastAnnounce();
        writeLocalStorageRoom(this.currentSummary);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  public updateBroadcast(summary: PublicRoomSummary): void {
    if (!summary.isPublic || summary.status !== 'WAITING') {
      this.stopBroadcasting();
      return;
    }
    this.currentSummary = summary;
    writeLocalStorageRoom(summary);

    if (this.isBroadcasting) {
      this.broadcastAnnounce();
    } else {
      this.startBroadcasting(summary);
    }
  }

  public stopBroadcasting(): void {
    if (!this.isBroadcasting && !this.currentSummary) return;

    const roomCode = this.currentSummary?.roomCode;

    if (roomCode) {
      writeLocalStorageRoom(null, roomCode);

      // Xóa phòng khỏi Cloudflare Worker
      if (typeof fetch !== 'undefined') {
        fetch(`${CLOUDFLARE_LOBBY_WORKER_URL}/api/rooms/${roomCode}`, {
          method: 'DELETE'
        }).catch(() => {});
      }

      // Thông báo đóng phòng qua Local Channel
      if (this.localChannel) {
        try {
          this.localChannel.postMessage({ type: 'CLOSE', roomCode });
        } catch {}
      }
    }

    if (this.broadcastIntervalId) {
      clearInterval(this.broadcastIntervalId);
      this.broadcastIntervalId = null;
    }

    this.currentSummary = null;
    this.isBroadcasting = false;
    this.checkCleanup();
  }

  private broadcastAnnounce(): void {
    if (!this.currentSummary) return;

    const payload: PublicRoomSummary = {
      ...this.currentSummary,
      updatedAt: Date.now()
    };

    // 1. Gửi lên Cloudflare Worker Hub (Serverless D1 Registry)
    if (typeof fetch !== 'undefined') {
      fetch(`${CLOUDFLARE_LOBBY_WORKER_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }

    // 2. Phát qua Local BroadcastChannel (cùng máy / nhiều tab)
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: 'ANNOUNCE', summary: payload });
      } catch {}
    }
  }

  private handleIncomingQuery(): void {
    if (this.isBroadcasting && this.currentSummary && this.currentSummary.status === 'WAITING') {
      this.broadcastAnnounce();
    }
  }

  // --- GUEST LISTENING METHODS ---

  public startListening(onRoomListUpdate: (rooms: PublicRoomSummary[]) => void): void {
    this.onRoomListUpdateCallback = onRoomListUpdate;
    this.isListening = true;

    // 1. Nạp ngay các phòng còn hạn từ Local Storage (hiển thị tức thì 0ms)
    const localRooms = readLocalStorageRooms();
    for (const [code, entry] of localRooms.entries()) {
      this.activeRoomsMap.set(code, entry);
    }

    this.ensureLocalChannel();

    // 2. Gửi truy vấn tức thì lên Cloudflare Worker & Local Channel
    this.requestRoomList();

    // Thử lại 1 lần nhanh sau 600ms khi vừa vào
    setTimeout(() => { if (this.isListening) this.requestRoomList(); }, 600);

    // 3. Tự động truy vấn định kỳ mỗi 10s khi đang mở Sảnh (người dùng có nút Làm Mới thủ công)
    if (this.activeQueryIntervalId) {
      clearInterval(this.activeQueryIntervalId);
    }
    this.activeQueryIntervalId = setInterval(() => {
      if (this.isListening) {
        this.requestRoomList();
      }
    }, AUTO_QUERY_INTERVAL_MS);

    // 4. Vòng quét loại bỏ phòng hết hạn mỗi 4s
    if (this.sweepIntervalId) {
      clearInterval(this.sweepIntervalId);
    }
    this.sweepIntervalId = setInterval(() => {
      this.sweepExpiredRooms();
    }, 4000);

    // Cập nhật giao diện ngay
    this.notifyUpdate();
  }

  public requestRoomList(): void {
    // 1. Đọc danh sách từ Cloudflare Worker Hub (Serverless D1 Registry)
    if (typeof fetch !== 'undefined') {
      fetch(`${CLOUDFLARE_LOBBY_WORKER_URL}/api/rooms`)
        .then(res => {
          if (!res.ok) return [];
          return res.json();
        })
        .then((rooms: PublicRoomSummary[]) => {
          if (Array.isArray(rooms) && this.isListening) {
            let hasChanges = false;
            for (const room of rooms) {
              if (room && room.roomCode && room.isPublic) {
                this.activeRoomsMap.set(room.roomCode, {
                  summary: room,
                  lastSeen: Date.now()
                });
                hasChanges = true;
              }
            }
            if (hasChanges) {
              this.notifyUpdate();
            }
          }
        })
        .catch(() => {});
    }

    // 2. Đọc thêm từ LocalStorage
    const localRooms = readLocalStorageRooms();
    let hasLocalUpdates = false;
    for (const [code, entry] of localRooms.entries()) {
      if (!this.activeRoomsMap.has(code)) {
        this.activeRoomsMap.set(code, entry);
        hasLocalUpdates = true;
      }
    }
    if (hasLocalUpdates) {
      this.notifyUpdate();
    }

    // 3. Gửi query qua Local Channel
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: 'QUERY', requestedAt: Date.now() });
      } catch {}
    }
  }

  public stopListening(): void {
    this.isListening = false;
    this.onRoomListUpdateCallback = null;

    if (this.sweepIntervalId) {
      clearInterval(this.sweepIntervalId);
      this.sweepIntervalId = null;
    }

    if (this.activeQueryIntervalId) {
      clearInterval(this.activeQueryIntervalId);
      this.activeQueryIntervalId = null;
    }

    this.checkCleanup();
  }

  private handleIncomingAnnouncement(summary: PublicRoomSummary): void {
    if (!this.isListening || !summary || !summary.roomCode || !summary.isPublic) {
      return;
    }

    if (summary.status !== 'WAITING') {
      this.activeRoomsMap.delete(summary.roomCode);
    } else {
      this.activeRoomsMap.set(summary.roomCode, {
        summary,
        lastSeen: Date.now()
      });
    }

    this.notifyUpdate();
  }

  private handleIncomingRoomClose(packet: RoomClosePacket): void {
    if (!this.isListening || !packet || !packet.roomCode) {
      return;
    }

    if (this.activeRoomsMap.has(packet.roomCode)) {
      this.activeRoomsMap.delete(packet.roomCode);
      this.notifyUpdate();
    }
  }

  private sweepExpiredRooms(): void {
    if (!this.isListening) return;

    const now = Date.now();
    let hasChanges = false;

    for (const [code, entry] of this.activeRoomsMap.entries()) {
      if (now - entry.lastSeen > ROOM_EXPIRY_TIMEOUT_MS) {
        this.activeRoomsMap.delete(code);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.notifyUpdate();
    }
  }

  private notifyUpdate(): void {
    if (!this.onRoomListUpdateCallback) return;

    const rooms: PublicRoomSummary[] = Array.from(this.activeRoomsMap.values())
      .map(entry => entry.summary)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    this.onRoomListUpdateCallback(rooms);
  }

  private checkCleanup(): void {
    if (!this.isBroadcasting && !this.isListening) {
      if (this.localChannel) {
        try {
          this.localChannel.close();
        } catch {}
        this.localChannel = null;
      }
      if (this.activeQueryIntervalId) {
        clearInterval(this.activeQueryIntervalId);
        this.activeQueryIntervalId = null;
      }
      this.activeRoomsMap.clear();
    }
  }

  public cleanup(): void {
    this.stopBroadcasting();
    this.stopListening();
    this.checkCleanup();
  }
}

export const globalLobbyDiscoveryClient = new LobbyDiscoveryClient();
