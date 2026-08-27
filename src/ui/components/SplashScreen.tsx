import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  message?: string;
  subMessage?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message = 'Đang chuẩn bị vào bàn đấu...',
  subMessage = 'SỚI BẠC ĐÃ SẴN SÀNG'
}) => {
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2900; // Hoàn thành 100% trong 2.9 giây

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-table-dark)] text-white select-none">
      <div className="relative flex flex-col items-center gap-6 p-8 max-w-sm text-center">
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

        {/* Thanh Tiến Trình Chạy Mượt Mà 3s */}
        <div className="w-56 flex flex-col gap-1.5 items-center">
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between w-full text-[10px] text-amber-400/80 font-mono font-bold tracking-wider">
            <span>KHỞI ĐỘNG</span>
            <span>{progress}%</span>
          </div>
        </div>

        <span className="text-[10px] text-amber-400/60 font-mono tracking-widest">
          {subMessage}
        </span>
      </div>
    </div>
  );
};
