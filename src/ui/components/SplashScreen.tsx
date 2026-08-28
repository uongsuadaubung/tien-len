import React, { useEffect, useState } from 'react';
import { lockToLandscape } from '../utils/fullscreen';
import { soundManager } from '../audio/sound-manager';
import { useIsMobile } from '../hooks/useIsMobile';

export interface SplashScreenProps {
  message?: string;
  subMessage?: string;
  isMobile?: boolean;
  isHydrated?: boolean;
  onStart?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message = 'Đang nạp dữ liệu bàn đấu...',
  subMessage = 'SỚI BẠC ĐÃ SẴN SÀNG',
  isMobile: isMobileProp,
  isHydrated = true,
  onStart
}) => {
  const deviceInfo = useIsMobile();
  const isMobile = isMobileProp !== undefined ? isMobileProp : deviceInfo.isMobile;
  const [progress, setProgress] = useState(10);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const duration = isMobile ? 2500 : 2000; // Hoàn thành 100%

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setIsReady(true);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isMobile]);

  const handleEnterGame = async () => {
    if (isMobile) {
      await lockToLandscape();
    }
    soundManager.playCardDeal();
    if (onStart) {
      onStart();
    }
  };

  // Trên Web / Desktop: Tự động vào game khi nạp xong dữ liệu & thanh tiến trình hoàn tất
  useEffect(() => {
    if (!isMobile && isReady && isHydrated) {
      handleEnterGame();
    }
  }, [isMobile, isReady, isHydrated]);

  return (
    <div 
      onClick={isMobile && isReady ? handleEnterGame : undefined}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-table-dark)] text-white select-none ${isMobile && isReady ? 'cursor-pointer' : ''}`}
    >
      <div className="relative flex flex-col items-center gap-5 p-8 max-w-sm text-center">
        {/* Logo Icon phát sáng */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/10">
            <span className="text-5xl animate-bounce">🃏</span>
          </div>
        </div>

        {/* Tiêu đề & Subtitle */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 font-serif">
            TIẾN LÊN MIỀN NAM
          </h1>
          <p className="text-xs text-[var(--text-muted)] tracking-widest font-medium uppercase">
            {message}
          </p>
        </div>

        {/* Thanh Tiến Trình Chạy Mượt Mà */}
        <div className="w-60 flex flex-col gap-1.5 items-center">
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between w-full text-[10px] text-amber-400/80 font-mono font-bold tracking-wider">
            <span>{isReady ? 'HOÀN TẤT' : 'KHỞI ĐỘNG'}</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Nút Vào Game trên Mobile (Kích hoạt Xoay Ngang & Âm Thanh) */}
        {isMobile && isReady ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEnterGame();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            <span>♠</span>
            <span>VÀO GAME</span>
            <span>♠</span>
          </button>
        ) : (
          <span className="text-[10px] text-amber-400/60 font-mono tracking-widest">
            {subMessage}
          </span>
        )}
      </div>
    </div>
  );
};
