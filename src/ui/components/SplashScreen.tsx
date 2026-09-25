import React, { useEffect, useState } from 'react';
import { lockToLandscape } from '../utils/fullscreen';
import { soundManager } from '../audio/sound-manager';
import { useIsMobile } from '../hooks/useIsMobile';
import { useI18n } from '../../locales';
import { checkAppUpdate, reloadToUpdate, getAppVersionDate } from '../../services/app-version-service';

export interface SplashScreenProps {
  message?: string;
  subMessage?: string;
  isMobile?: boolean;
  isHydrated?: boolean;
  onStart?: () => void;
  version?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message,
  subMessage,
  isMobile: isMobileProp,
  isHydrated = true,
  onStart,
  version
}) => {
  const { t } = useI18n();
  const displayMessage = message ?? t('splash.loadingData');
  const displaySubMessage = subMessage ?? t('splash.ready');
  const displayVersion = version ?? `v${getAppVersionDate()}`;
  const deviceInfo = useIsMobile();
  const isMobile = isMobileProp !== undefined ? isMobileProp : deviceInfo.isMobile;
  const [progress, setProgress] = useState(10);
  const [isReady, setIsReady] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    checkAppUpdate().then((res) => {
      if (!isCancelled && res.hasUpdate) {
        setHasUpdate(true);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

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

  // Trên Web / Desktop: Tự động vào game khi nạp xong dữ liệu & thanh tiến trình hoàn tất (chỉ vào nếu không có bản cập nhật mới)
  useEffect(() => {
    if (!isMobile && isReady && isHydrated && !hasUpdate) {
      handleEnterGame();
    }
  }, [isMobile, isReady, isHydrated, hasUpdate]);

  return (
    <div 
      onClick={isMobile && isReady && !hasUpdate ? handleEnterGame : undefined}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-table-dark)] text-white select-none ${isMobile && isReady && !hasUpdate ? 'cursor-pointer' : ''}`}
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
          <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 uppercase">
            {t('table.emblem')}
          </h1>
          <p className="text-xs text-[var(--text-muted)] tracking-widest font-medium uppercase">
            {displayMessage}
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
            <span>{isReady ? t('splash.complete') : t('splash.startup')}</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Nút Cập Nhật khi có bản mới HOẶC Nút Vào Game trên Mobile */}
        {hasUpdate ? (
          <div className="w-full flex flex-col items-center gap-2.5 mt-2 animate-fade-in">
            <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs uppercase tracking-widest animate-pulse">
              <span>🚀</span>
              <span>{t('splash.updateAvailableTitle')}</span>
              <span>🚀</span>
            </div>
            <p className="text-[11px] text-amber-100/80 leading-relaxed font-medium">
              {t('splash.updateAvailableDesc')}
            </p>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                setIsUpdating(true);
                await reloadToUpdate();
              }}
              disabled={isUpdating}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:from-emerald-300 hover:to-green-300 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-pulse active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>🔄</span>
              <span>{isUpdating ? '...' : t('splash.reloadToUpdate')}</span>
              <span>🔄</span>
            </button>
          </div>
        ) : isMobile && isReady ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEnterGame();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            <span>♠</span>
            <span>{t('splash.enterGame')}</span>
            <span>♠</span>
          </button>
        ) : (
          <span className="text-[10px] text-amber-400/60 font-mono tracking-widest">
            {displaySubMessage}
          </span>
        )}
      </div>

      {/* Phiên bản ứng dụng dựa trên build time (yyyymmdd) */}
      <div className="absolute bottom-3 text-center font-mono text-[10px] text-amber-400/40 tracking-widest uppercase pointer-events-none select-none">
        <span>{displayVersion}</span>
      </div>
    </div>
  );
};
