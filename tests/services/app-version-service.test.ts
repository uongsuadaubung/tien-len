import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { checkAppUpdate, getCurrentBuildTime, reloadToUpdate } from '../../src/services/app-version-service';

describe('App Version Service (Kiểm tra cập nhật phiên bản build)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset global __APP_BUILD_TIME__ for testing
    (globalThis as unknown as { __APP_BUILD_TIME__: number }).__APP_BUILD_TIME__ = 1000000;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. getCurrentBuildTime: Lấy chính xác thời gian build được nhúng từ môi trường', () => {
    expect(getCurrentBuildTime()).toBe(1000000);
  });

  it('2. checkAppUpdate: Bỏ qua khi không phải production và không có forceCheck', async () => {
    const result = await checkAppUpdate();
    expect(result.hasUpdate).toBe(false);
  });

  it('3. checkAppUpdate: Phát hiện có bản build mới khi buildTime trên server lớn hơn', async () => {
    // Giả lập server trả về buildTime mới hơn (1500000 > 1000000)
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ buildTime: 1500000 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as unknown as typeof fetch;

    const result = await checkAppUpdate({ forceCheck: true });
    expect(result.hasUpdate).toBe(true);
    expect(result.latestBuildTime).toBe(1500000);
    expect(result.currentBuildTime).toBe(1000000);
  });

  it('4. checkAppUpdate: Không báo cập nhật khi server có cùng hoặc nhỏ hơn buildTime', async () => {
    // Giả lập server trả về cùng buildTime (1000000)
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ buildTime: 1000000 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as unknown as typeof fetch;

    const result = await checkAppUpdate({ forceCheck: true });
    expect(result.hasUpdate).toBe(false);
    expect(result.latestBuildTime).toBe(1000000);
  });

  it('5. checkAppUpdate: Fallback an toàn khi mất mạng hoặc fetch lỗi (không quăng exception)', async () => {
    globalThis.fetch = mock(async () => {
      throw new Error('Network error');
    }) as unknown as typeof fetch;

    const result = await checkAppUpdate({ forceCheck: true });
    expect(result.hasUpdate).toBe(false);
  });

  it('6. reloadToUpdate: Hoạt động an toàn và không gây crash', async () => {
    const originalWindow = (globalThis as unknown as { window?: unknown }).window;
    const mockReload = mock(() => {});
    (globalThis as unknown as { window: unknown }).window = {
      location: { reload: mockReload }
    };

    await reloadToUpdate();
    expect(mockReload).toHaveBeenCalled();

    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });
});
