import type { Card } from './types';
import type { IMatchDriver, DriverActionResult } from './match-driver.interface';
import type { CardTracker } from '../ai/card-tracker';
import type { MoveHint } from '../ai/hint-engine';
import { UI_TIMINGS } from '../ui/constants/ui-timings';

/**
 * BaseMatchDriver
 * Lớp cơ sở điều phối vòng lặp bàn đấu, quản lý tập trung các timer và vòng đời hạ màn
 */
export abstract class BaseMatchDriver implements IMatchDriver {
  public abstract readonly gameNumber: number;
  protected isDisposed: boolean = false;
  protected endGameTimer: ReturnType<typeof setTimeout> | null = null;
  protected activeTimers: Set<ReturnType<typeof setTimeout>> = new Set();

  public abstract playCards(playerId: string, cards: Card[]): DriverActionResult;
  public abstract passTurn(playerId: string): DriverActionResult;
  public abstract handleGameOver(options?: { skipDelay?: boolean }): void;

  public abstract reorderPlayerHand(playerId: string, newHand: Card[]): boolean;
  public abstract getTracker(playerId: string): CardTracker | null;
  public abstract getAiHint(playerId: string): MoveHint | null;

  /**
   * Tạo timer an toàn có đăng ký vòng đời tự hủy
   */
  protected createManagedTimer(callback: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.activeTimers.delete(timer);
      if (!this.isDisposed) {
        callback();
      }
    }, delayMs);
    this.activeTimers.add(timer);
    return timer;
  }

  /**
   * Hủy một timer cụ thể
   */
  protected clearManagedTimer(timer: ReturnType<typeof setTimeout> | null): void {
    if (timer !== null) {
      clearTimeout(timer);
      this.activeTimers.delete(timer);
    }
  }

  /**
   * Đếm ngược hạ màn chuẩn (2 giây) hoặc kết thúc ngay lập tức nếu skipDelay
   */
  protected scheduleGameOverReveal(callback: () => void, options?: { skipDelay?: boolean }): void {
    if (this.endGameTimer !== null) {
      clearTimeout(this.endGameTimer);
      this.endGameTimer = null;
    }

    if (options?.skipDelay) {
      if (!this.isDisposed) {
        callback();
      }
    } else {
      this.endGameTimer = setTimeout(() => {
        this.endGameTimer = null;
        if (!this.isDisposed) {
          callback();
        }
      }, UI_TIMINGS.MATCH_END_REVEAL_DELAY_MS);
    }
  }

  /**
   * Xóa sạch toàn bộ timer đang chờ
   */
  protected clearAllTimers(): void {
    if (this.endGameTimer !== null) {
      clearTimeout(this.endGameTimer);
      this.endGameTimer = null;
    }
    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * Dọn dẹp tài nguyên và đánh dấu driver đã hủy
   */
  public cleanup(): void {
    this.isDisposed = true;
    this.clearAllTimers();
  }
}
