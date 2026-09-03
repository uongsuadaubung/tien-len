import { GameEventBus } from '../../engine/events/game-event-bus';
import { soundManager } from './sound-manager';

/**
 * AudioEventObserver triển khai Observer Pattern
 * Lắng nghe các Domain Events từ GameEventBus và phát hiệu ứng âm thanh tương ứng
 * Tách rời hoàn toàn Engine khỏi Web Audio API
 */
export class AudioEventObserver {
  private static instance: AudioEventObserver | null = null;
  private unsubscribers: (() => void)[] = [];
  private isObserving: boolean = false;

  public static getInstance(): AudioEventObserver {
    if (!AudioEventObserver.instance) {
      AudioEventObserver.instance = new AudioEventObserver();
    }
    return AudioEventObserver.instance;
  }

  /**
   * Bắt đầu lắng nghe sự kiện từ EventBus
   */
  public startObserving(): void {
    if (this.isObserving) return;
    this.isObserving = true;
    const bus = GameEventBus.getInstance();

    this.unsubscribers = [
      bus.subscribe('CARD_PLAYED', () => {
        soundManager.playCardSlap();
      }),
      bus.subscribe('CHOP_EXECUTED', () => {
        soundManager.playChop();
      }),
      bus.subscribe('TURN_PASSED', () => {
        soundManager.playPass();
      }),
      bus.subscribe('INSTANT_WIN', () => {
        soundManager.playVictory();
      }),
      bus.subscribe('MATCH_COMPLETED', (event) => {
        if (event.isHumanWinner) {
          soundManager.playVictory();
        } else {
          soundManager.playDefeat();
        }
      })
    ];
  }

  /**
   * Ngừng lắng nghe để dọn dẹp tài nguyên
   */
  public stopObserving(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.isObserving = false;
  }

  public get active(): boolean {
    return this.isObserving;
  }
}

/**
 * Khởi tạo Observer âm thanh toàn cục
 */
export function initAudioEventObserver(): () => void {
  const observer = AudioEventObserver.getInstance();
  observer.startObserving();
  return () => observer.stopObserving();
}
