/**
 * Interface cho các tài nguyên có thể dọn dẹp (disposable).
 */
export interface IDisposable {
  dispose(): void;
}

export type DisposableFunction = () => void;
export type DisposableItem = IDisposable | DisposableFunction;

/**
 * CompositeDisposable
 * Quản lý tập hợp các tài nguyên, listeners, timers, subscriptions.
 * Cho phép dọn dẹp tất cả một cách an toàn theo thứ tự LIFO (Last In, First Out).
 */
export class CompositeDisposable implements IDisposable {
  private disposables: Set<DisposableItem> = new Set();
  private isDisposed = false;

  /**
   * Thêm một hoặc nhiều tài nguyên cần dọn dẹp.
   * Nếu CompositeDisposable đã bị dispose trước đó, tài nguyên mới thêm vào sẽ bị dispose ngay lập tức.
   */
  public add(...items: DisposableItem[]): this {
    for (const item of items) {
      if (this.isDisposed) {
        this.disposeItem(item);
      } else {
        this.disposables.add(item);
      }
    }
    return this;
  }

  /**
   * Xóa một tài nguyên khỏi danh sách quản lý (không gọi dispose).
   */
  public remove(item: DisposableItem): boolean {
    return this.disposables.delete(item);
  }

  /**
   * Dọn dẹp toàn bộ tài nguyên hiện có nhưng giữ nguyên CompositeDisposable để tiếp tục sử dụng.
   */
  public clear(): void {
    const items = Array.from(this.disposables).reverse();
    this.disposables.clear();
    for (const item of items) {
      this.disposeItem(item);
    }
  }

  /**
   * Dọn dẹp toàn bộ tài nguyên và đánh dấu đã hủy vĩnh viễn.
   */
  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.clear();
  }

  public get disposed(): boolean {
    return this.isDisposed;
  }

  public get size(): number {
    return this.disposables.size;
  }

  private disposeItem(item: DisposableItem): void {
    try {
      if (typeof item === 'function') {
        item();
      } else if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    } catch (error) {
      console.error('[CompositeDisposable] Error disposing item:', error);
    }
  }
}
