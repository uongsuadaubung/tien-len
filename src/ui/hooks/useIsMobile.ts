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

  // Màn hình được coi là Mobile nếu chiều rộng < 768px hoặc thiết bị cảm ứng có kích thước nhỏ/vừa
  const isMobileSize = width < 768;
  const isMobileTouch = isTouchDevice && Math.min(width, height) < 600;
  const isMobile = isMobileSize || isMobileTouch;

  const isLandscape = width > height;
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
    const handleResizeOrOrientationChange = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', handleResizeOrOrientationChange);
    window.addEventListener('orientationchange', handleResizeOrOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResizeOrOrientationChange);
      window.removeEventListener('orientationchange', handleResizeOrOrientationChange);
    };
  }, []);

  return deviceInfo;
};
