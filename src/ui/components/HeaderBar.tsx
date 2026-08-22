import React from 'react';
import { GameMode } from '../../engine/types';
import { Settings, Eye, Volume2, VolumeX, RotateCcw, Sparkles } from 'lucide-react';

interface HeaderBarProps {
  gameNumber: number;
  mode: GameMode;
  betAmount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenXRay: () => void;
  onResetMatch: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  gameNumber,
  mode,
  betAmount,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenXRay,
  onResetMatch
}) => {
  return (
    <header className="relative z-40 w-full flex items-center justify-between px-6 py-3 bg-[#24060a]/90 backdrop-blur-md border-b-2 border-yellow-500/50 shadow-xl">
      {/* Tiêu đề & Cành đào mai Tết */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎋</span>
        <div>
          <h1 className="text-base sm:text-lg font-black text-yellow-300 tracking-wider flex items-center gap-2">
            <span>TIẾN LÊN MIỀN NAM</span>
            <span className="text-[10px] bg-red-700 text-yellow-200 px-2 py-0.5 rounded-full border border-yellow-400 font-extrabold uppercase">
              Xuân Ất Tỵ
            </span>
          </h1>
          <div className="flex items-center gap-2 text-[11px] text-amber-200/80 font-bold">
            <span>Ván #{gameNumber}</span>
            <span>•</span>
            <span>{mode === 'TRADITIONAL' ? 'Nhất Nhì Ba Bét' : 'Đếm Lá'}</span>
            <span>•</span>
            <span>Cược: {betAmount} 🧧</span>
          </div>
        </div>
      </div>

      {/* Các nút công cụ */}
      <div className="flex items-center gap-2">
        {/* Nút Soi Bài X-Ray */}
        <button
          onClick={onOpenXRay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-400/60 text-purple-200 text-xs font-bold transition-all hover:scale-105 shadow-md cursor-pointer"
          title="Bật/Tắt chế độ Soi Bài & Huấn Luyện AI"
        >
          <Eye className="w-4 h-4 text-yellow-300" />
          <span className="hidden sm:inline">Soi Bài & Gợi Ý</span>
        </button>

        {/* Nút Cài Đặt */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-yellow-500/40 text-yellow-200 text-xs font-bold transition-all hover:scale-105 shadow-md cursor-pointer"
          title="Cài đặt luật chơi và bot"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Cài Đặt</span>
        </button>

        {/* Bật/Tắt Âm Thanh */}
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-xl border transition-all hover:scale-105 cursor-pointer ${
            soundEnabled
              ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
              : 'bg-neutral-900 border-neutral-700 text-neutral-500'
          }`}
          title="Âm thanh"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Chơi lại từ đầu */}
        <button
          onClick={onResetMatch}
          className="p-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 transition-all hover:scale-105 cursor-pointer"
          title="Chia lại ván mới"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
