/**
 * Service quản lý và kiểm tra phiên bản ứng dụng (App Version & Update Service)
 * Hoạt động trên môi trường Production: so sánh buildTime hiện tại với version.json trên Server
 */

export interface AppUpdateCheckResult {
  hasUpdate: boolean;
  currentBuildTime: number;
  latestBuildTime: number;
}

export function getCurrentBuildTime(): number {
  try {
    return typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : 0;
  } catch {
    return 0;
  }
}

export async function checkAppUpdate(options?: {
  forceCheck?: boolean;
  timeoutMs?: number;
}): Promise<AppUpdateCheckResult> {
  const currentBuildTime = getCurrentBuildTime();
  const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;

  // Ở môi trường dev local, mặc định bỏ qua kiểm tra trừ khi cố ý forceCheck
  if (!isProd && !options?.forceCheck) {
    return {
      hasUpdate: false,
      currentBuildTime,
      latestBuildTime: currentBuildTime
    };
  }

  const timeoutMs = options?.timeoutMs ?? 3500;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
    const versionUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}version.json?t=${Date.now()}`;

    const response = await fetch(versionUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        hasUpdate: false,
        currentBuildTime,
        latestBuildTime: currentBuildTime
      };
    }

    const data = await response.json();
    const latestBuildTime = typeof data?.buildTime === 'number' ? data.buildTime : Number(data?.buildTime || 0);

    // Có bản cập nhật mới nếu thời gian build trên server lớn hơn thời gian build của bundle đang chạy
    const hasUpdate = latestBuildTime > currentBuildTime && currentBuildTime > 0;

    return {
      hasUpdate,
      currentBuildTime,
      latestBuildTime
    };
  } catch {
    // Mất mạng, timeout hoặc rate limit: fallback âm thầm, không bao giờ chặn người chơi vào game
    clearTimeout(timeoutId);
    return {
      hasUpdate: false,
      currentBuildTime,
      latestBuildTime: currentBuildTime
    };
  }
}

export async function reloadToUpdate(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update().catch(() => {});
      }
    }
  } catch {
    // Bỏ qua lỗi service worker nếu có
  }

  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
