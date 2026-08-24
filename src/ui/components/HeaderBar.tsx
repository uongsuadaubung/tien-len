import React from 'react';
import { GameMode } from '../../engine/types';
import { Settings, Eye, Volume2, VolumeX, RotateCcw, Home } from 'lucide-react';
import { getRankTierByElo } from '../../engine/elo';

export type ActiveGameType = 'QUICK' | 'RANKED' | 'CAMPAIGN' | 'UNDERGROUND';

interface HeaderBarProps {
  gameNumber: number;
  mode: GameMode;
  betAmount: number;
  activeGameType: ActiveGameType;
  playerCoins: number;
  playerElo: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenCustomGameModal?: () => void;
  onOpenSettings: () => void;
  onOpenXRay: () => void;
  onResetMatch: () => void;
  onReturnToLobby: () => void;
  xrayEnabled?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  gameNumber,
  mode,
  betAmount,
  activeGameType,
  playerCoins,
  playerElo,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenXRay,
  onResetMatch,
  onReturnToLobby,
  xrayEnabled = false
}) => {
  const currentRank = getRankTierByElo(playerElo);

  const modeBadge = {
    QUICK: { label: 'Chơi Tự Do', color: 'bg-emerald-800 text-emerald-200 border-emerald-500/40' },
    RANKED: { label: 'Đấu Hạng', color: 'bg-blue-800 text-blue-200 border-blue-500/40' },
    CAMPAIGN: { label: 'Chiến Dịch', color: 'bg-purple-800 text-purple-200 border-purple-500/40' },
    UNDERGROUND: { label: 'Sòng Bạc Ngầm', color: 'bg-red-800 text-yellow-200 border-yellow-400' }
  }[activeGameType];

  return (
    <header className="relative z-40 w-full flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#200408] border-b-2 border-yellow-500/50 shadow-lg">
      {/* Nút Về Sảnh & Tiêu đề */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onReturnToLobby}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-yellow-500/40 text-yellow-300 text-xs font-bold transition-all hover:scale-105 shadow-md cursor-pointer"
          title="Quay về Sảnh Chính (Lobby Hub)"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Về Sảnh</span>
        </button>

        <span className="text-xl sm:text-2xl">🎋</span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-yellow-300 tracking-wider">
              TIẾN LÊN MIỀN NAM
            </h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-extrabold uppercase ${modeBadge.color}`}>
              {modeBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-amber-200/80 font-bold">
            <span>Ván #{gameNumber}</span>
            <span>•</span>
            {activeGameType === 'RANKED' ? (
              <span className="text-blue-300">Đua Rank Elo (+/-)</span>
            ) : (
              <span>Cược: {betAmount.toLocaleString()} 🧧</span>
            )}
          </div>
        </div>
      </div>

      {/* THÔNG TIN NGƯỜI CHƠI & CÔNG CỤ */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Số Dư Tiền */}
        <div className="flex items-center gap-1.5 bg-yellow-950/80 px-2.5 sm:px-3 py-1 rounded-full border border-yellow-500/40 text-xs font-black text-yellow-300">
          <span>🧧</span>
          <span>{playerCoins.toLocaleString()}</span>
        </div>

        {/* Bậc Rank Elo */}
        <div className="hidden md:flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full border border-neutral-700 text-xs font-bold">
          <span>{currentRank.badge}</span>
          <span style={{ color: currentRank.color }}>{currentRank.name}</span>
          <span className="text-[10px] text-neutral-400">({playerElo})</span>
        </div>

        {/* Nút Soi Bài X-Ray (Chỉ hiện khi bật trong Cài Đặt) */}
        {xrayEnabled && (
          <button
            onClick={onOpenXRay}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-400/60 text-purple-200 text-xs font-bold transition-all hover:scale-105 shadow-md cursor-pointer"
            title="Bật/Tắt chế độ Soi Bài & Huấn Luyện AI"
          >
            <Eye className="w-4 h-4 text-yellow-300" />
            <span className="hidden sm:inline">Soi Bài</span>
          </button>
        )}

        {/* Nút Cài Đặt Hệ Thống */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold transition-all hover:scale-105 shadow-md cursor-pointer"
          title="Cài đặt âm thanh và hiệu ứng"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Bật/Tắt Âm Thanh */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-xl border transition-all hover:scale-105 cursor-pointer ${
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
          className="p-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 transition-all hover:scale-105 cursor-pointer"
          title="Chia lại ván mới"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
