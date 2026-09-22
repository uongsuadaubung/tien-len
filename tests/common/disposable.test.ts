import { describe, it, expect, mock } from 'bun:test';
import { CompositeDisposable } from '../../src/engine/common/disposable';

describe('CompositeDisposable Architecture Tests', () => {
  it('should dispose all added functions and IDisposable items in LIFO order', () => {
    const executionOrder: number[] = [];
    const comp = new CompositeDisposable();

    comp.add(() => executionOrder.push(1));
    comp.add({
      dispose: () => executionOrder.push(2)
    });
    comp.add(() => executionOrder.push(3));

    expect(comp.size).toBe(3);
    comp.dispose();

    expect(comp.disposed).toBe(true);
    expect(comp.size).toBe(0);
    expect(executionOrder).toEqual([3, 2, 1]);
  });

  it('should immediately dispose newly added items if already disposed', () => {
    const comp = new CompositeDisposable();
    comp.dispose();

    const mockDispose = mock(() => {});
    comp.add(mockDispose);

    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(comp.size).toBe(0);
  });

  it('should allow clearing items without marking as permanently disposed', () => {
    const executionOrder: number[] = [];
    const comp = new CompositeDisposable();

    comp.add(() => executionOrder.push(1));
    comp.clear();

    expect(executionOrder).toEqual([1]);
    expect(comp.disposed).toBe(false);

    // Can add new items after clear
    comp.add(() => executionOrder.push(2));
    comp.dispose();

    expect(executionOrder).toEqual([1, 2]);
    expect(comp.disposed).toBe(true);
  });
});
