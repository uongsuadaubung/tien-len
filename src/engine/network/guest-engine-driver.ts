import type { Card } from '../types';
import type { DriverActionResult, IMatchDriver } from '../match-driver.interface';
import { BaseMatchDriver } from '../base-match-driver';
import { P2PClient } from './p2p-client';
import type { TableStateSyncPacket, GameEndPacket } from './network.schema';
import { useGameStore } from '../../stores/useGameStore';

export interface GuestEngineDriverOptions {
  readonly p2pClient: P2PClient;
  readonly myPlayerId: string;
  readonly onGameEnd?: ((packet: GameEndPacket) => void) | null;
}

/**
 * GuestEngineDriver
 * Trình điều phối bàn đấu từ góc nhìn Khách (Client) trong trận đấu Online P2P.
 * Thực thi hợp đồng IMatchDriver chuẩn mực, hoàn thiện kiến trúc đối xứng:
 * OfflineMatchDriver (Offline) <-> HostEngineDriver (Online Host) <-> GuestEngineDriver (Online Guest)
 */
export class GuestEngineDriver extends BaseMatchDriver implements IMatchDriver {
  public gameNumber: number = 1;
  private readonly p2pClient: P2PClient;
  private readonly myPlayerId: string;
  private unsubscribeCallbacks: Array<() => void> = [];
  private readonly onGameEndCallback: ((packet: GameEndPacket) => void) | null;

  constructor(options: GuestEngineDriverOptions) {
    super();
    this.p2pClient = options.p2pClient;
    this.myPlayerId = options.myPlayerId;
    this.onGameEndCallback = options.onGameEnd ?? null;
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    // 1. Lắng nghe gói tin đồng bộ bàn đấu từ Host
    const unSync = this.p2pClient.onTableSync((sync: TableStateSyncPacket) => {
      if (this.isDisposed) return;
      this.gameNumber = sync.gameNumber;
      useGameStore.getState().applyAuthoritativeTableSync(sync);
    });
    this.unsubscribeCallbacks.push(unSync);

    // 2. Lắng nghe gói tin kết thúc ván đấu từ Host
    const unEnd = this.p2pClient.onGameEnd((packet: GameEndPacket) => {
      if (this.isDisposed) return;
      if (this.onGameEndCallback) {
        this.onGameEndCallback(packet);
      }
    });
    this.unsubscribeCallbacks.push(unEnd);
  }

  public playCardIds(playerId: string, cardIds: string[]): DriverActionResult {
    if (this.isDisposed) {
      return { success: false, error: 'Driver đã bị giải phóng' };
    }
    void this.p2pClient.sendPlayerAction({
      type: 'PLAY',
      playerId,
      cardIds,
      timestamp: Date.now()
    });
    return { success: true };
  }

  public playCards(playerId: string, cards: Card[]): DriverActionResult {
    return this.playCardIds(playerId, cards.map(c => c.id));
  }

  public passTurn(playerId: string): DriverActionResult {
    if (this.isDisposed) {
      return { success: false, error: 'Driver đã bị giải phóng' };
    }
    void this.p2pClient.sendPlayerAction({
      type: 'PASS',
      playerId,
      timestamp: Date.now()
    });
    return { success: true };
  }

  public handleGameOver(): void {
    // Trạng thái hạ màn ở góc nhìn Guest được điều khiển từ Authoritative Table Sync của Host
  }

  public override cleanup(): void {
    super.cleanup();
    this.unsubscribeCallbacks.forEach(un => {
      try {
        un();
      } catch {}
    });
    this.unsubscribeCallbacks = [];
  }
}
