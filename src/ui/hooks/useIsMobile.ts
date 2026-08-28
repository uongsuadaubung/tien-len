import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
}

const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isLandscape: true,
      isPortrait: false,
      screenWidth: 1024,
      screenHeight: 768
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;

  // Màn hình được coi là Mobile nếu chiều rộng < 768px hoặc thiết bị cảm ứng có kích thước cạnh nhỏ < 600px
  const isMobileSize = width < 768;
  const isMobileTouch = isTouchDevice && Math.min(width, height) < 600;
  const isMobile = isMobileSize || isMobileTouch;

  // Kiểm tra hướng màn hình đa tầng: Kích thước pixel + CSS Media Query + Screen Orientation API
  const isLandscapeByDim = width > height;
  const isLandscapeByMedia = window.matchMedia('(orientation: landscape)').matches;
  const isLandscapeByScreen = typeof window.screen?.orientation?.type === 'string'
    ? window.screen.orientation.type.startsWith('landscape')
    : false;

  const isLandscape = isLandscapeByDim || isLandscapeByMedia || isLandscapeByScreen;
  const isPortrait = !isLandscape;

  return {
    isMobile,
    isLandscape,
    isPortrait,
    screenWidth: width,
    screenHeight: height
  };
};

export const useIsMobile = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    let timeoutId1: ReturnType<typeof setTimeout> | null = null;
    let timeoutId2: ReturnType<typeof setTimeout> | null = null;

    const handleUpdate = () => {
      setDeviceInfo(getDeviceInfo());
    };

    const handleOrientationChange = () => {
      handleUpdate();
      // iOS Safari và Android có độ trễ layout khi chuyển hướng, cập nhật bù sau 100ms & 300ms
      if (timeoutId1) clearTimeout(timeoutId1);
      if (timeoutId2) clearTimeout(timeoutId2);
      timeoutId1 = setTimeout(handleUpdate, 100);
      timeoutId2 = setTimeout(handleUpdate, 300);
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Lắng nghe sự kiện Screen Orientation API
    const orientationApi = window.screen?.orientation;
    if (orientationApi?.addEventListener) {
      orientationApi.addEventListener('change', handleOrientationChange);
    }

    // Lắng nghe CSS matchMedia orientation
    const mql = window.matchMedia('(orientation: landscape)');
    if (mql.addEventListener) {
      mql.addEventListener('change', handleOrientationChange);
    }

    return () => {
      if (timeoutId1) clearTimeout(timeoutId1);
      if (timeoutId2) clearTimeout(timeoutId2);
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (orientationApi?.removeEventListener) {
        orientationApi.removeEventListener('change', handleOrientationChange);
      }
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleOrientationChange);
      }
    };
  }, []);

  return deviceInfo;
};
