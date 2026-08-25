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
    QUICK: { label: 'Chơi Nhanh', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' },
    RANKED: { label: 'Đấu Hạng', color: 'bg-blue-950/80 text-blue-300 border-blue-500/40' },
    CAMPAIGN: { label: 'Chiến Dịch', color: 'bg-purple-950/80 text-purple-300 border-purple-500/40' },
    UNDERGROUND: { label: 'Sòng VIP', color: 'bg-amber-950/80 text-[#f3e5ab] border-[#d4af37]/50' }
  }[activeGameType];

  return (
    <header className="relative z-40 w-full flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#101522] border-b border-[#d4af37]/35 shadow-md">
      {/* Nút Về Sảnh & Tiêu đề */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onReturnToLobby}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#182030] hover:bg-[#222c42] border border-[#d4af37]/30 text-[#f3e5ab] text-xs font-bold transition-all shadow cursor-pointer"
          title="Quay về Sảnh Chính (Lobby Hub)"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Về Sảnh</span>
        </button>

        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#aa8620] flex items-center justify-center text-[#0a0d14] font-black text-xs shadow-sm">
          ♠
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-[#f3e5ab] tracking-wider">
              TIẾN LÊN MIỀN NAM
            </h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-extrabold uppercase ${modeBadge.color}`}>
              {modeBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <span>Ván #{gameNumber}</span>
            <span>•</span>
            {activeGameType === 'RANKED' ? (
              <span className="text-blue-300">Đua Rank Elo</span>
            ) : (
              <span>Cược: {betAmount.toLocaleString()} Xu</span>
            )}
          </div>
        </div>
      </div>

      {/* THÔNG TIN NGƯỜI CHƠI & CÔNG CỤ */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Số Dư Tiền */}
        <div className="flex items-center gap-1.5 bg-[#182030] px-2.5 sm:px-3 py-1 rounded-full border border-[#d4af37]/30 text-xs font-black text-[#f3e5ab]">
          <span>🪙</span>
          <span>{playerCoins.toLocaleString()}</span>
        </div>

        {/* Bậc Rank Elo */}
        <div className="hidden md:flex items-center gap-1 bg-[#182030] px-2.5 py-1 rounded-full border border-white/10 text-xs font-bold">
          <span>{currentRank.badge}</span>
          <span style={{ color: currentRank.color }}>{currentRank.name}</span>
          <span className="text-[10px] text-slate-400">({playerElo})</span>
        </div>

        {/* Nút Soi Bài X-Ray (Chỉ hiện khi bật trong Cài Đặt) */}
        {xrayEnabled && (
          <button
            onClick={onOpenXRay}
            className="p-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-400/40 text-purple-300 transition-all cursor-pointer shadow"
            title="Soi Bài Cả Bàn (X-Ray Inspector)"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}

        {/* Nút Âm Thanh */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow ${
            soundEnabled
              ? 'bg-[#182030] hover:bg-[#222c42] border-[#d4af37]/30 text-[#f3e5ab]'
              : 'bg-red-950/80 hover:bg-red-900 border-red-500/40 text-red-300'
          }`}
          title={soundEnabled ? 'Tắt Âm Thanh' : 'Bật Âm Thanh'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Nút Chia Lại Ván Bài Mới */}
        <button
          onClick={onResetMatch}
          className="p-1.5 rounded-xl bg-[#182030] hover:bg-[#222c42] border border-[#d4af37]/30 text-[#f3e5ab] transition-all cursor-pointer shadow"
          title="Chia Lại Ván Bài Mới"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Nút Cài Đặt */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-xl bg-[#182030] hover:bg-[#222c42] border border-[#d4af37]/30 text-[#f3e5ab] transition-all cursor-pointer shadow"
          title="Cài Đặt Hệ Thống"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
