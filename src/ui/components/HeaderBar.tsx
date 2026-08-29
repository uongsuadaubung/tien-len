import React, { useState, useEffect } from 'react';
import { GameMode } from '../../engine/types';
import { Settings, Eye, Volume2, VolumeX, Home, BookOpen, Maximize, Minimize } from 'lucide-react';
import { getRankTierByElo } from '../../engine/elo';
import { Button, Badge } from '../primitives';
import { isFullScreen, toggleFullScreen } from '../utils/fullscreen';
import { ActiveGameType } from '../../stores/useGameStore';

interface HeaderBarProps {
  gameNumber: number;
  mode: GameMode;
  betAmount: number;
  activeGameType: ActiveGameType;
  playerCoins: number;
  playerElo: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenCustomGameModal: (() => void) | null;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenXRay: () => void;
  onReturnToLobby: () => void;
  xrayEnabled: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeGameType,
  playerCoins,
  playerElo,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenSettings,
  onOpenXRay,
  onReturnToLobby,
  xrayEnabled = false
}) => {
  const currentRank = getRankTierByElo(playerElo);
  const [isFullscreenState, setIsFullscreenState] = useState(isFullScreen());

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreenState(isFullScreen());
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const modeBadgeText: Record<ActiveGameType, string> = {
    QUICK: 'Chơi Nhanh',
    CAMPAIGN: 'Chiến Dịch',
    ONLINE: 'Đấu Phòng P2P'
  };

  return (
    <header className="relative z-40 w-full flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[var(--bg-container)] border-b border-[var(--border-container)] shadow-md">
      {/* Nút Về Sảnh & Tiêu đề */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="surface"
          size="sm"
          onClick={onReturnToLobby}
          leftIcon={<Home className="w-4 h-4 text-[var(--color-gold)]" />}
          title="Quay về Sảnh Chính (Lobby Hub)"
        >
          <span className="hidden sm:inline">Về Sảnh</span>
        </Button>

        <div className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] font-bold text-xs shadow-sm">
          ♠
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-wider">
              TIẾN LÊN MIỀN NAM
            </h1>
            <Badge variant="gold" size="sm">
              {modeBadgeText[activeGameType]}
            </Badge>
          </div>
        </div>
      </div>

      {/* THÔNG TIN NGƯỜI CHƠI & CÔNG CỤ */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Số Dư Tiền */}
        <Badge variant="neutral" size="md">
          🪙 {playerCoins.toLocaleString()}
        </Badge>

        {/* Bậc Rank Elo */}
        <div className="hidden md:flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-card)] px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm">
          <span>{currentRank.badge}</span>
          <span className="text-[var(--color-gold)]">{currentRank.name}</span>
          <span className="text-[10px] text-[var(--text-muted)]">({playerElo})</span>
        </div>

        {/* Nút Soi Bài X-Ray */}
        {xrayEnabled && (
          <Button
            variant="surface"
            size="icon"
            onClick={onOpenXRay}
            title="Soi Bài Cả Bàn (X-Ray Inspector)"
          >
            <Eye className="w-4 h-4 text-[var(--color-gold)]" />
          </Button>
        )}

        {/* Nút Âm Thanh */}
        <Button
          variant={soundEnabled ? 'surface' : 'danger'}
          size="icon"
          onClick={onToggleSound}
          title={soundEnabled ? 'Tắt Âm Thanh' : 'Bật Âm Thanh'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-[var(--text-secondary)]" /> : <VolumeX className="w-4 h-4" />}
        </Button>

        {/* Nút Luật Chơi */}
        <Button
          variant="surface"
          size="icon"
          onClick={onOpenRules}
          title="Luật Chơi & Bảng Khắc Chế Bài"
        >
          <BookOpen className="w-4 h-4 text-[var(--color-gold)]" />
        </Button>

        {/* Nút Toàn Màn Hình (Full Screen) */}
        <Button
          variant="surface"
          size="icon"
          onClick={async () => {
            const fs = await toggleFullScreen();
            setIsFullscreenState(fs);
          }}
          title={isFullscreenState ? 'Thoát Toàn Màn Hình' : 'Bật Toàn Màn Hình (Full Screen)'}
        >
          {isFullscreenState ? (
            <Minimize className="w-4 h-4 text-[var(--color-gold)]" />
          ) : (
            <Maximize className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </Button>

        {/* Nút Cài Đặt */}
        <Button
          variant="surface"
          size="icon"
          onClick={onOpenSettings}
          title="Cài Đặt Hệ Thống"
        >
          <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
        </Button>
      </div>
    </header>
  );
};
