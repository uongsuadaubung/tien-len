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
import { isFullScreen, toggleFullScreen } from '../../utils/fullscreen';

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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[var(--bg-canvas)] text-[var(--text-primary)] pb-20 select-none font-sans overflow-x-hidden">
      
      {/* 1. TOP HEADER CỐ ĐỊNH TINH GỌN */}
      <header className="sticky top-0 z-30 w-full bg-[var(--bg-container)]/95 backdrop-blur-md border-b border-[var(--border-container)] px-3 py-2.5 shadow-md">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Avatar & Profile */}
          <div 
            onClick={onOpenNameSetup}
            className="flex items-center gap-2 cursor-pointer active:opacity-80 transition-opacity min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-gold)]/60 flex items-center justify-center text-xl shrink-0 shadow-sm">
              {profile.avatar || '😎'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[100px]">
                  {profile.name || 'Khách'}
                </span>
                <Edit2 className="w-3 h-3 text-[var(--color-gold)] shrink-0" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--color-gold)] font-semibold">
                <span>{currentRank.badge}</span>
                <span className="truncate">{currentRank.name}</span>
                <span className="text-[var(--text-muted)] font-mono">({profile.elo})</span>
              </div>
            </div>
          </div>

          {/* Túi Tiền & Icon Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Túi Xu */}
            <div 
              onClick={onOpenBank}
              className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-card)] active:border-[var(--border-gold)] px-2.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <span className="text-sm">🪙</span>
              <span className="font-bold text-xs text-[var(--color-gold)] font-mono">
                {profile.coins > 1000000 
                  ? `${(profile.coins / 1000000).toFixed(1)}M` 
                  : profile.coins > 1000 
                  ? `${(profile.coins / 1000).toFixed(0)}k` 
                  : profile.coins}
              </span>
            </div>

            {/* Nợ cảnh báo (nếu có) */}
            {profile.loans > 0 && (
              <button
                onClick={onOpenBank}
                className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0 animate-pulse"
                title="Cảnh báo nợ"
              >
                <AlertCircle className="w-4 h-4" />
              </button>
            )}

            {/* Nút Luật */}
            {onOpenRules && (
              <button
                onClick={onOpenRules}
                className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] active:scale-95 transition-transform"
                title="Luật chơi"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            )}

            {/* Nút Fullscreen */}
            <button
              onClick={async () => {
                const fs = await toggleFullScreen();
                setIsFullscreenState(fs);
              }}
              className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-transform"
              title="Toàn màn hình"
            >
              {isFullscreenState ? <Minimize className="w-4 h-4 text-[var(--color-gold)]" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Nút Cài Đặt */}
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-transform"
              title="Cài đặt"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thanh tiến trình Rank */}
        {nextTier && (
          <div className="w-full max-w-lg mx-auto mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-[var(--bg-card)] rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
                style={{ width: `${eloProgress}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-[var(--text-muted)] shrink-0">
              {eloProgress}% tới {nextTier.badge}
            </span>
          </div>
        )}
      </header>

      {/* 2. NEWSFEED TICKER */}
      {newsfeed.length > 0 && (
        <div 
          onClick={() => openModal('ECOSYSTEM')}
          className="w-full max-w-lg mx-auto px-3 py-1.5 mt-2 bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-amber-950/30 border-y border-amber-500/20 flex items-center justify-between cursor-pointer active:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-1.5 overflow-hidden text-xs">
            <span className="flex items-center gap-1 text-amber-400 font-bold uppercase text-[9px] tracking-wider bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
              <Newspaper className="w-2.5 h-2.5" /> Bản Tin
            </span>
            <span className="text-[var(--text-secondary)] text-[11px] truncate">
              {newsfeed[0]?.message}
            </span>
          </div>
          <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
        </div>
      )}

      {/* 3. THÂN TRANG: DANH SÁCH CHẾ ĐỘ CHƠI */}
      <main className="w-full max-w-lg mx-auto px-3 py-3 space-y-3.5 flex-1">
        
        {/* THẺ HERO: CHƠI NHANH & ĐẤU HẠNG */}
        <Card
          variant="container"
          hoverable
          clickable
          onClick={onPlayNow || onOpenQuickSetup}
          className="group relative overflow-hidden p-4 rounded-3xl border-2 border-[var(--border-gold)]/60 bg-gradient-to-br from-[#1c150c] via-[var(--bg-container)] to-[#0c121d] shadow-xl active:scale-[0.99] transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/30 shrink-0">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-black text-white tracking-wide">
                    Chơi Nhanh &amp; Đấu Hạng
                  </h3>
                  <Badge variant="gold" size="sm">Cốt Lõi</Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Ghép 3 đối thủ theo hạng <strong className="text-[var(--color-gold)]">{currentRank.badge} {currentRank.name}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Dải Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-white/10 text-[10px]">
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-[var(--color-gold)] font-bold">
              💰 {ECONOMY_CONSTANTS.DEFAULT_QUICK_BET.toLocaleString()} Xu
            </span>
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-[var(--text-secondary)]">
              ⚡ Phạt x1 - x5
            </span>
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-[var(--text-secondary)]">
              👥 4 Người
            </span>
          </div>

          {/* Cặp Nút Hành Động Lớn */}
          <div className="grid grid-cols-2 gap-2 mt-3.5">
            <Button
              variant="surface"
              size="md"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuickSetup();
              }}
              leftIcon={<Sliders className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
              className="w-full text-xs font-bold py-2.5"
            >
              Cấu Hình Bàn
            </Button>

            <Button
              variant="gold"
              size="md"
              onClick={(e) => {
                e.stopPropagation();
                if (onPlayNow) onPlayNow();
                else onOpenQuickSetup();
              }}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full text-xs font-black py-2.5 shadow-md shadow-amber-500/20"
            >
              Chơi Ngay
            </Button>
          </div>
        </Card>

        {/* THẺ 2: CHIẾN DỊCH CỐT TRUYỆN */}
        <Card
          variant="container"
          hoverable
          clickable
          onClick={onOpenCampaign}
          className="p-4 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-container)] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Chiến Dịch Cốt Truyện
                  </h4>
                  <Badge variant="neutral" size="sm">5 Chương</Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Từ Sới Bạc Xóm đến Sòng Bạc Đỉnh Cao
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Card>

        {/* THẺ 3: TÙY CHỈNH NÂNG CAO (SANDBOX) */}
        <Card
          variant="container"
          hoverable
          clickable
          onClick={onOpenCustomGameModal}
          className="p-4 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-container)] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Tùy Chỉnh Nâng Cao
                  </h4>
                  <Badge variant="neutral" size="sm">Sandbox</Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Tự do chọn đối thủ Bot, tùy biến 100% luật chơi
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </main>

      {/* 4. BOTTOM NAVIGATION ACTION BAR CỐ ĐỊNH DƯỚI ĐÁY */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-container)]/98 backdrop-blur-lg border-t border-[var(--border-container)] px-3 py-2 shadow-2xl safe-area-bottom">
        <div className="w-full max-w-lg mx-auto grid grid-cols-4 gap-1">
          {/* 1. Nhiệm vụ */}
          <button
            onClick={onOpenQuests}
            className="relative flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group"
          >
            <div className="relative">
              <Target className="w-5 h-5 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
              {claimableQuestsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {claimableQuestsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] mt-1">
              Nhiệm Vụ
            </span>
          </button>

          {/* 2. Vòng Quay */}
          <button
            onClick={onOpenLuckyWheel}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group"
          >
            <Disc className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-[var(--color-gold)] mt-1">
              Vòng Quay
            </span>
          </button>

          {/* 3. Ngân Hàng */}
          <button
            onClick={onOpenBank}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group"
          >
            <Landmark className="w-5 h-5 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-[var(--text-secondary)] mt-1">
              Ngân Hàng
            </span>
          </button>

          {/* 4. Bảng Vàng */}
          <button
            onClick={() => openModal('ECOSYSTEM')}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group"
          >
            <Trophy className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-[var(--text-secondary)] mt-1">
              Bảng Vàng
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};
