import React, { useState, useEffect } from 'react';
import { GameMode } from '../../engine/types';
import { Settings, Eye, Volume2, VolumeX, Home, BookOpen, Maximize, Minimize, Trophy, BarChart3, BrainCircuit } from 'lucide-react';
import { Badge } from '../primitives';
import { isFullScreen, toggleFullScreen } from '../utils/fullscreen';
import { ActiveGameType } from '../../stores/useGameStore';
import { useI18n } from '../../locales';

export interface HeaderBarProps {
  gameNumber: number;
  mode: GameMode;
  betAmount: number;
  activeGameType: ActiveGameType;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenXRay: () => void;
  onReturnToLobby: () => void;
  xrayEnabled: boolean;
  onToggleMatchHud?: () => void;
  onToggleReasoningHud?: () => void;
  isMatchHudOpen?: boolean;
  isReasoningHudOpen?: boolean;
  botReasoningLogEnabled?: boolean;
}

const HeaderBarComponent: React.FC<HeaderBarProps> = ({
  gameNumber,
  mode,
  activeGameType,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenSettings,
  onOpenXRay,
  onReturnToLobby,
  xrayEnabled = false,
  onToggleMatchHud,
  onToggleReasoningHud,
  isMatchHudOpen = false,
  isReasoningHudOpen = false,
  botReasoningLogEnabled = false
}) => {
  const { t } = useI18n();
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
    QUICK: mode === 'COUNT_CARDS' ? t('modes.countCards') : mode === 'WINNER_TAKES_ALL' ? t('modes.winnerTakesAll') : t('modes.traditional'),
    CAMPAIGN: t('lobby.campaign'),
    ONLINE: t('lobby.joinRoom')
  };

  return (
    <header 
      className="absolute top-0 left-0 right-0 z-40 w-full flex items-center justify-between pointer-events-none bg-transparent border-none shadow-none"
      style={{
        paddingLeft: 'max(14px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(14px, env(safe-area-inset-right, 0px))',
        paddingTop: 'max(8px, env(safe-area-inset-top, 0px))'
      }}
    >
      {/* Cụm Trái: Nút Về Sảnh, Logo & Thông tin Ván đấu */}
      <div className="pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-slate-950/75 border border-white/10 backdrop-blur-md shadow-xl transition-all">
        {/* Nút Về Sảnh */}
        <button
          onClick={onReturnToLobby}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer font-bold text-xs"
          title={t('header.lobby')}
        >
          <Home className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">{t('header.lobby')}</span>
        </button>

        {/* Biểu tượng Sòng bài */}
        <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs shadow-inner">
          ♠
        </div>

        {/* Badge Ván đấu */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('hud.gameNumber', { number: gameNumber })}</span>
        </div>

        {/* Badge Chế độ */}
        <Badge variant="gold" size="sm" className="hidden sm:inline-flex text-[11px] font-semibold py-0.5 px-2">
          {modeBadgeText[activeGameType]}
        </Badge>
      </div>

      {/* Cụm Phải: Các Công Cụ & Tiện Ích */}
      <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-950/75 border border-white/10 backdrop-blur-md shadow-xl">
        {/* Nút Toggle Quân Sư AI */}
        {onToggleMatchHud && (
          <button
            onClick={onToggleMatchHud}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isMatchHudOpen
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
            }`}
            title={t('header.aiAdvisorTooltip')}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        )}

        {/* Nút Toggle Bot Reasoning Log */}
        {botReasoningLogEnabled && onToggleReasoningHud && (
          <button
            onClick={onToggleReasoningHud}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isReasoningHudOpen
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Bot Reasoning"
          >
            <BrainCircuit className="w-4 h-4" />
          </button>
        )}

        {/* Nút Soi Bài X-Ray */}
        {xrayEnabled && (
          <button
            onClick={onOpenXRay}
            className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-amber-400 hover:text-amber-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            title={t('header.xrayTooltip')}
          >
            <Eye className="w-4 h-4" />
          </button>
        )}

        {/* Nút Âm Thanh */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
            soundEnabled
              ? 'bg-white/5 border-white/10 text-amber-400 hover:text-amber-300 hover:bg-white/10'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}
          title={soundEnabled ? t('header.soundOffTooltip') : t('header.soundOnTooltip')}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Nút Hướng Dẫn Luật */}
        <button
          onClick={onOpenRules}
          className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-amber-400 hover:text-amber-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title={t('header.rules')}
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Nút Toàn Màn Hình */}
        <button
          onClick={async () => {
            const fs = await toggleFullScreen();
            setIsFullscreenState(fs);
          }}
          className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title={isFullscreenState ? t('header.exitFullscreenTooltip') : t('header.fullscreenTooltip')}
        >
          {isFullscreenState ? (
            <Minimize className="w-4 h-4 text-amber-400" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>

        {/* Nút Cài Đặt */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title={t('header.settings')}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export const HeaderBar = React.memo(HeaderBarComponent);
