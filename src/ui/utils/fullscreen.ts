/**
 * Tiện ích hỗ trợ chế độ Toàn Màn Hình (Full Screen API) đa nền tảng
 * Tương thích với trình duyệt Desktop, Chrome Android, Safari iOS / iPadOS
 */

declare global {
  interface Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  }
  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  }
  interface Screen {
    mozOrientation?: string;
    msOrientation?: string;
  }
  interface ScreenOrientation {
    lock?: (orientation: 'landscape' | 'portrait' | 'landscape-primary' | 'landscape-secondary' | 'portrait-primary' | 'portrait-secondary' | 'any') => Promise<void>;
  }
}

/**
 * Kiểm tra xem ứng dụng có đang ở chế độ Full Screen hay không
 */
export function isFullScreen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/**
 * Bật chế độ Full Screen
 */
export async function requestFullScreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement;

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    } else if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
      return true;
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[FullScreen] Không thể bật Full Screen:', err);
  }
  return false;
}

/**
 * Thoát chế độ Full Screen
 */
export async function exitFullScreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
      return true;
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
      return true;
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[FullScreen] Không thể thoát Full Screen:', err);
  }
  return false;
}

/**
 * Chuyển đổi trạng thái Full Screen
 */
export async function toggleFullScreen(): Promise<boolean> {
  if (isFullScreen()) {
    await exitFullScreen();
    return false;
  } else {
    return await requestFullScreen();
  }
}

/**
 * Kiểm tra xem thiết bị có phải là màn hình cảm ứng (Mobile / Tablet) hay không
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Khóa cứng thiết bị sang chế độ màn hình ngang (Landscape)
 * Kết hợp Fullscreen + Screen Orientation API
 */
export async function lockToLandscape(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Thử yêu cầu Fullscreen trước (bắt buộc đối với Screen Orientation API trên trình duyệt di động)
    await requestFullScreen();

    // 2. Khóa màn hình ngang qua Screen Orientation API
    const orientation = window.screen?.orientation;
    if (orientation?.lock) {
      try {
        await orientation.lock('landscape');
        return true;
      } catch {
        try {
          await orientation.lock('landscape-primary');
          return true;
        } catch {
          // Bỏ qua nếu trình duyệt không cho phép lock (như iOS Safari)
        }
      }
    }
  } catch (err) {
    console.warn('[Orientation] Không thể tự động khóa xoay ngang:', err);
  }
  return false;
}
