import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../../../engine/storage';
import { getRankTierByElo, RANK_TIERS } from '../../../engine/elo';
import { ECONOMY_CONSTANTS } from '../../../engine/constants/economy';
import { useModalStore } from '../../../stores/useModalStore';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';
import { 
  Trophy, 
  MapPin, 
  Play, 
  Target, 
  Disc, 
  Landmark, 
  Settings, 
  Sliders, 
  Edit2, 
  BookOpen, 
  ArrowRight, 
  Newspaper, 
  Maximize, 
  Minimize,
  AlertCircle
} from 'lucide-react';
import { Badge, Card, Button } from '../../primitives';
import { isFullScreen, toggleFullScreen, lockToLandscape } from '../../utils/fullscreen';

export interface MobileLobbyScreenProps {
  profile: PlayerProfile;
  onPlayNow: (() => void) | null;
  onOpenQuickSetup: () => void;
  onOpenCustomGameModal: () => void;
  onOpenCampaign: () => void;
  onOpenQuests: () => void;
  onOpenLuckyWheel: () => void;
  onOpenBank: () => void;
  onOpenSettings: () => void;
  onOpenRules: (() => void) | null;
  onOpenNameSetup: () => void;
}

export const MobileLobbyScreen: React.FC<MobileLobbyScreenProps> = ({
  profile,
  onPlayNow,
  onOpenQuickSetup,
  onOpenCustomGameModal,
  onOpenCampaign,
  onOpenQuests,
  onOpenLuckyWheel,
  onOpenBank,
  onOpenSettings,
  onOpenRules,
  onOpenNameSetup
}) => {
  const { openModal } = useModalStore();
  const { newsfeed, initEcosystem } = useEcosystemStore();
  const [isFullscreenState, setIsFullscreenState] = useState(isFullScreen());

  useEffect(() => {
    initEcosystem();
  }, [initEcosystem]);

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

  const currentRank = getRankTierByElo(profile.elo);

  // Tính % tiến trình lên Rank tiếp theo
  const currentTierIndex = RANK_TIERS.findIndex(t => t.id === currentRank.id);
  const nextTier = RANK_TIERS[currentTierIndex + 1];
  let eloProgress = 100;
  if (nextTier) {
    const tierSpan = nextTier.minElo - currentRank.minElo;
    const progressInTier = profile.elo - currentRank.minElo;
    eloProgress = Math.min(100, Math.max(0, Math.round((progressInTier / tierSpan) * 100)));
  }

  // Số lượng nhiệm vụ có thể nhận thưởng
  const claimableQuestsCount =
    profile.dailyQuests.filter(q => q.isCompleted && !q.isClaimed).length +
    profile.achievements.filter(a => a.isCompleted && !a.isClaimed).length;

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between bg-[var(--bg-canvas)] text-[var(--text-primary)] select-none font-sans overflow-hidden pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),0.5rem)] pl-[max(env(safe-area-inset-left),0.5rem)] pr-[max(env(safe-area-inset-right),0.5rem)] gap-1.5">
      
      {/* 1. TOP HEADER (ĐỒNG BỘ 100% DESIGN SYSTEM WEB) */}
      <header className="shrink-0 z-30 w-full max-w-4xl mx-auto bg-[var(--bg-container)] border border-[var(--border-container)] rounded-2xl px-3 py-1.5 shadow-sm">
        <div className="w-full flex items-center justify-between gap-2.5">
          {/* Profile & Avatar */}
          <div 
            onClick={onOpenNameSetup}
            className="flex items-center gap-2 cursor-pointer active:opacity-80 transition-opacity min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0">
              {profile.avatar || '😎'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate max-w-[120px]">
                  {profile.name || 'Chưa Đặt Tên'}
                </span>
                <Edit2 className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[var(--color-gold)] font-bold leading-tight">
                <span>{currentRank.badge}</span>
                <span className="truncate">{currentRank.name}</span>
                <span className="text-[var(--text-muted)] font-mono font-normal">({profile.elo} Elo)</span>
              </div>
            </div>
          </div>

          {/* Thanh Tiến Trình Rank */}
          {nextTier && (
            <div className="hidden sm:flex flex-1 max-w-[180px] items-center gap-1.5 px-2">
              <div className="flex-1 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-container)]">
                <div 
                  className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-500"
                  style={{ width: `${eloProgress}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] shrink-0">
                {eloProgress}%
              </span>
            </div>
          )}

          {/* Túi Tiền & Icon Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Túi Xu */}
            <div 
              onClick={onOpenBank}
              className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-card)] active:border-[var(--border-gold)] px-2.5 py-1 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <span className="text-sm">🪙</span>
              <span className="font-bold text-xs sm:text-sm text-[var(--color-gold)] font-mono">
                {profile.coins.toLocaleString()} <span className="text-[10px] font-normal text-[var(--text-muted)]">Xu</span>
              </span>
            </div>

            {/* Nợ cảnh báo (nếu có) */}
            {profile.loans > 0 && (
              <button
                onClick={onOpenBank}
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center shrink-0 animate-pulse cursor-pointer"
                title="Cảnh báo nợ"
              >
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Nút Luật */}
            {onOpenRules && (
              <button
                onClick={onOpenRules}
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] active:scale-95 transition-transform cursor-pointer"
                title="Luật chơi"
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Nút Fullscreen / Xoay Ngang */}
            <button
              onClick={async () => {
                if (isFullscreenState) {
                  await toggleFullScreen();
                  setIsFullscreenState(false);
                } else {
                  await lockToLandscape();
                  setIsFullscreenState(isFullScreen());
                }
              }}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer"
              title="Khóa Xoay Ngang & Toàn Màn Hình"
            >
              {isFullscreenState ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-gold)]" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Nút Cài Đặt */}
            <button
              onClick={onOpenSettings}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer"
              title="Cài đặt"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. NEWSFEED TICKER (ĐỒNG BỘ 100% DESIGN SYSTEM WEB) */}
      {newsfeed.length > 0 && (
        <div 
          onClick={() => openModal('ECOSYSTEM')}
          className="shrink-0 w-full max-w-4xl mx-auto px-3 py-1 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-amber-950/40 border border-amber-500/20 flex items-center justify-between cursor-pointer active:opacity-80 transition-opacity shadow-sm"
        >
          <div className="flex items-center gap-2 overflow-hidden text-xs">
            <span className="flex items-center gap-1 text-amber-400 font-bold uppercase text-[9px] tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30 shrink-0">
              <Newspaper className="w-3 h-3" /> Bảng Tin
            </span>
            <span className="text-[var(--text-secondary)] text-[11px] truncate">
              {newsfeed[0]?.message}
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold shrink-0 ml-2 flex items-center gap-0.5">
            Bảng Vàng <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* 3. THÂN TRANG: 3 CHẾ ĐỘ CHƠI ĐỒNG BỘ 100% MÀU SẮC & GIAO DIỆN WEB */}
      <main className="flex-1 min-h-0 w-full max-w-4xl mx-auto flex flex-col landscape:grid landscape:grid-cols-3 gap-2 sm:gap-2.5 my-auto justify-center overflow-hidden py-1">
        
        {/* ========================================================================= */}
        {/* PHẦN 1: CHƠI NHANH & ĐẤU HẠNG (HERO CONTAINER TIER 1 CHUẨN WEB) */}
        {/* ========================================================================= */}
        <Card
          variant="container"
          hoverable
          clickable
          onClick={onPlayNow || onOpenQuickSetup}
          className="p-3 sm:p-3.5 rounded-2xl border-2 border-[var(--border-gold)]/60 bg-gradient-to-br from-[#1c150c]/80 via-[var(--bg-container)] to-[#0c121d]/80 shadow-2xl active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between landscape:h-full"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/20 shrink-0">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight">
                  Chơi Nhanh &amp; Đấu Hạng
                </h3>
                <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
                  Cốt Lõi • Ghép theo <strong className="text-[var(--color-gold)]">{currentRank.badge} {currentRank.name} ({profile.elo} Elo)</strong>
                </p>
              </div>
            </div>

            {/* Dải Tags Chuẩn Web */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-[var(--border-container)]">
              <Badge variant="neutral" size="sm">
                💰 Cược: {ECONOMY_CONSTANTS.DEFAULT_QUICK_BET.toLocaleString()} Xu
              </Badge>
              <Badge variant="neutral" size="sm">
                ⚡ Phạt: x1 - x5
              </Badge>
              <Badge variant="neutral" size="sm">
                👥 4 Người
              </Badge>
            </div>
          </div>

          {/* Cặp Nút Hành Động Chuẩn Web */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border-container)]">
            <Button
              variant="surface"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuickSetup();
              }}
              leftIcon={<Sliders className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
              className="w-full text-xs font-bold py-1.5 justify-center"
              title="Cấu hình bàn"
            >
              Cấu Hình Bàn
            </Button>

            <Button
              variant="gold"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (onPlayNow) onPlayNow();
                else onOpenQuickSetup();
              }}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full text-xs font-bold py-1.5 justify-center shadow-lg shadow-amber-500/20"
            >
              Chơi Ngay
            </Button>
          </div>
        </Card>

        {/* CONTAINER CHO PHẦN 2 VÀ 3 (CHUẨN WEB TIER 1 CONTAINER) */}
        <div className="contents landscape:contents">
          {/* ========================================================================= */}
          {/* PHẦN 2: CHIẾN DỊCH CỐT TRUYỆN (CONTAINER TIER 1 CHUẨN WEB) */}
          {/* ========================================================================= */}
          <Card
            variant="container"
            hoverable
            clickable
            onClick={onOpenCampaign}
            className="p-3 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-container)] shadow-sm active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between landscape:h-full"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight">
                    Chiến Dịch Cốt Truyện
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
                    9 Chương • Từ Sới Bạc Xóm đến Sòng Bạc Đỉnh Cao
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-[var(--border-container)]">
                <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Nhận Danh Hiệu &amp; Xu Thưởng
                </span>
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-[var(--border-container)]">
              <Button
                variant="surface"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCampaign();
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                className="w-full text-xs font-bold py-1.5 justify-center"
              >
                Bản Đồ Chiến Dịch
              </Button>
            </div>
          </Card>

          {/* ========================================================================= */}
          {/* PHẦN 3: TÙY CHỈNH NÂNG CAO (CONTAINER TIER 1 CHUẨN WEB) */}
          {/* ========================================================================= */}
          <Card
            variant="container"
            hoverable
            clickable
            onClick={onOpenCustomGameModal}
            className="p-3 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-container)] shadow-sm active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between landscape:h-full"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight">
                    Tùy Chỉnh Nâng Cao
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
                    Sandbox • Tự do chọn đối thủ Bot &amp; 100% luật chơi
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-[var(--border-container)]">
                <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Tùy Biến 100% Luật &amp; Đối Thủ
                </span>
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-[var(--border-container)]">
              <Button
                variant="surface"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCustomGameModal();
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                className="w-full text-xs font-bold py-1.5 justify-center"
              >
                Tùy Chỉnh
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* 4. BOTTOM NAVIGATION ACTION BAR CỐ ĐỊNH DƯỚI ĐÁY (ĐỒNG BỘ DESIGN SYSTEM WEB) */}
      <nav className="shrink-0 z-40 w-full max-w-4xl mx-auto bg-[var(--bg-container)] border border-[var(--border-container)] rounded-2xl px-3 py-1 shadow-md">
        <div className="w-full grid grid-cols-4 gap-1">
          {/* 1. Nhiệm vụ */}
          <button
            onClick={onOpenQuests}
            className="relative flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group cursor-pointer"
          >
            <div className="relative">
              <Target className="w-4 h-4 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
              {claimableQuestsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">
                  {claimableQuestsCount}
                </span>
              )}
            </div>
            <span className="text-[9.5px] font-bold text-[var(--text-secondary)] mt-0.5">
              Nhiệm Vụ
            </span>
          </button>

          {/* 2. Vòng Quay */}
          <button
            onClick={onOpenLuckyWheel}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group cursor-pointer"
          >
            <Disc className="w-4 h-4 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
            <span className="text-[9.5px] font-bold text-[var(--color-gold)] mt-0.5">
              Vòng Quay
            </span>
          </button>

          {/* 3. Ngân Hàng */}
          <button
            onClick={onOpenBank}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group cursor-pointer"
          >
            <Landmark className="w-4 h-4 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
            <span className="text-[9.5px] font-bold text-[var(--text-secondary)] mt-0.5">
              Ngân Hàng
            </span>
          </button>

          {/* 4. Bảng Vàng */}
          <button
            onClick={() => openModal('ECOSYSTEM')}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
            <span className="text-[9.5px] font-bold text-[var(--text-secondary)] mt-0.5">
              Bảng Vàng
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};
