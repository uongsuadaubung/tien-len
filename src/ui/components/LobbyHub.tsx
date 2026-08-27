import React, { useEffect } from 'react';
import { PlayerProfile } from '../../engine/storage';
import { getRankTierByElo, RANK_TIERS } from '../../engine/elo';
import { calculateAdaptiveQuickBet } from '../../engine/economy';
import { useModalStore } from '../../stores/useModalStore';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { 
  Trophy, 
  Flame, 
  MapPin, 
  Play, 
  Target, 
  Disc, 
  Landmark, 
  Settings, 
  AlertCircle,
  Sliders,
  Edit2,
  BookOpen,
  ArrowRight,
  Users,
  Newspaper
} from 'lucide-react';
import { Button, Badge, Card, SectionHeader } from '../primitives';

interface LobbyHubProps {
  profile: PlayerProfile;
  onPlayNow?: () => void;
  onOpenQuickSetup: () => void;
  onOpenCustomGameModal: () => void;
  onOpenCampaign: () => void;
  onOpenQuests: () => void;
  onOpenLuckyWheel: () => void;
  onOpenBank: () => void;
  onOpenSettings: () => void;
  onOpenRules?: () => void;
  onOpenNameSetup?: () => void;
}

export const LobbyHub: React.FC<LobbyHubProps> = ({
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

  useEffect(() => {
    initEcosystem();
  }, [initEcosystem]);

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
  const claimableQuestsCount = profile.dailyQuests.filter(q => q.isCompleted && !q.isClaimed).length +
    profile.achievements.filter(a => a.isCompleted && !a.isClaimed).length;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-y-auto bg-[var(--bg-canvas)] text-[var(--text-primary)] p-3 sm:p-5 select-none font-sans">
      
      {/* HEADER (Tier 1 Container) */}
      <Card variant="container" className="relative z-10 w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4">
        {/* Profile Người Chơi */}
        <div 
          onClick={onOpenNameSetup}
          className={`flex items-center gap-3 ${onOpenNameSetup ? 'cursor-pointer group' : ''}`}
          title="Bấm để đổi tên và avatar"
        >
          {/* Avatar (Tier 2 Card) */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-2xl sm:text-3xl shadow-sm group-hover:border-[var(--border-gold)] transition-colors">
            {profile.avatar}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-[var(--text-primary)] tracking-wide group-hover:text-[var(--color-gold)] flex items-center gap-1.5 transition-colors">
                <span>{profile.name || 'Chưa Đặt Tên'}</span>
                {onOpenNameSetup && <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--color-gold)]" />}
              </h2>
            </div>

            {/* Elo & Bậc Rank */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">{currentRank.badge}</span>
              <span className="text-xs font-bold text-[var(--color-gold)]">
                {currentRank.name}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                ({profile.elo} Elo)
              </span>
            </div>

            {/* Thanh tiến trình Elo */}
            {nextTier && (
              <div className="w-36 sm:w-48 h-1.5 bg-[var(--bg-card)] rounded-full mt-1.5 overflow-hidden border border-[var(--border-container)]">
                <div 
                  className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-500"
                  style={{ width: `${eloProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* TÚI TIỀN & CÁC NÚT TÍNH NĂNG NHANH */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Số Dư Tiền Vàng */}
          <div className="flex items-center gap-2.5 bg-[var(--bg-card)] border border-[var(--border-card)] px-3.5 sm:px-4 py-2 rounded-xl shadow-sm">
            <span className="text-lg">🪙</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Tài Sản</span>
              <span className="font-bold text-sm sm:text-base text-[var(--color-gold)]">
                {profile.coins.toLocaleString()} <span className="text-xs font-normal text-[var(--text-muted)]">Xu</span>
              </span>
            </div>
          </div>

          {/* Cảnh báo nợ (nếu có) */}
          {profile.loans > 0 && (
            <Button
              variant="danger"
              size="md"
              onClick={onOpenBank}
              leftIcon={<AlertCircle className="w-4 h-4 text-red-400" />}
            >
              Nợ: {profile.loans.toLocaleString()}
            </Button>
          )}

          {/* Nút Vay Nợ / Ngân Hàng */}
          <Button
            variant="surface"
            size="md"
            onClick={onOpenBank}
            leftIcon={<Landmark className="w-4 h-4 text-[var(--color-gold)]" />}
            title="Quỹ Cứu Trợ & Vay Vốn Sòng Bạc"
          >
            <span className="hidden sm:inline">Ngân Hàng</span>
          </Button>

          {/* Nút Nhiệm Vụ & Thành Tựu */}
          <div className="relative">
            <Button
              variant="surface"
              size="md"
              onClick={onOpenQuests}
              leftIcon={<Target className="w-4 h-4 text-[var(--color-gold)]" />}
            >
              <span>Nhiệm Vụ</span>
            </Button>
            {claimableQuestsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center pointer-events-none shadow">
                {claimableQuestsCount}
              </span>
            )}
          </div>

          {/* Nút Vòng Quay May Mắn (Gold Primary CTA) */}
          <Button
            variant="gold"
            size="md"
            onClick={onOpenLuckyWheel}
            leftIcon={<Disc className="w-4 h-4 text-[#0a0c0e]" />}
          >
            <span>Vòng Quay</span>
          </Button>

          {/* Nút Bảng Vàng Danh Vọng */}
          <Button
            variant="surface"
            size="md"
            onClick={() => openModal('ECOSYSTEM')}
            leftIcon={<Trophy className="w-4 h-4 text-[var(--color-gold)]" />}
            title="Bảng Vàng Danh Vọng & Xếp Hạng Toàn Server"
            className="border-[var(--color-gold-border)]/50 text-[var(--color-gold)] hover:text-white"
          >
            <span>Bảng Vàng</span>
          </Button>

          {/* Nút Luật & Khắc Chế */}
          {onOpenRules && (
            <Button
              variant="surface"
              size="md"
              onClick={onOpenRules}
              leftIcon={<BookOpen className="w-4 h-4 text-[var(--color-gold)]" />}
              title="Hướng dẫn luật chơi & bảng khắc chế các bài"
              className="border-[var(--color-gold-border)] text-[var(--color-gold)] hover:text-[var(--text-primary)]"
            >
              <span className="hidden md:inline">Luật &amp; Khắc Chế</span>
            </Button>
          )}

          {/* Nút Cài Đặt */}
          <Button
            variant="surface"
            size="md"
            onClick={onOpenSettings}
            leftIcon={<Settings className="w-4 h-4 text-[var(--text-secondary)]" />}
            title="Cài đặt âm thanh và hiệu ứng"
          >
            <span className="hidden sm:inline">Cài Đặt</span>
          </Button>
        </div>
      </Card>

      {/* BANNER BẢN TIN SỚI BẠC (LIVE NEWSFEED TICKER) */}
      {newsfeed.length > 0 && (
        <div 
          onClick={() => openModal('ECOSYSTEM')}
          className="relative z-10 w-full max-w-6xl mx-auto mt-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-amber-950/40 border border-amber-500/20 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2 overflow-hidden text-xs">
            <span className="flex items-center gap-1 text-amber-400 font-bold uppercase text-[10px] tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30 flex-shrink-0">
              <Newspaper className="w-3 h-3" /> Bảng Tin
            </span>
            <span className="text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)] transition-colors">
              {newsfeed[0]?.message}
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold flex-shrink-0 ml-2 flex items-center gap-0.5 group-hover:underline">
            Xem Bảng Vàng <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* BODY (Tier 0 Canvas với các Container Tier 1) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto py-3 space-y-6">
        
        {/* ========================================================================= */}
        {/* HÀNG 1: SÒNG BẠC CHƠI NHANH & ĐẤU HẠNG (HERO CONTAINER TIER 1) */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Flame />}
            title="Sòng Bạc Chơi Nhanh & Đấu Hạng"
            subtitle="Ghép đối thủ tự động theo Bậc Rank • Thắng cược Xu & Tăng hạng Elo"
          />

          {/* HERO CARD: TIER 1 CONTAINER */}
          <Card 
            variant="container"
            hoverable
            clickable
            onClick={onPlayNow || onOpenQuickSetup}
            className="group p-6 sm:p-7 flex flex-col justify-between"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                {/* Icon Box */}
                <div className="w-14 h-14 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm group-hover:border-[var(--border-gold)] transition-colors">
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                      Chơi Nhanh &amp; Đấu Hạng
                    </h3>
                    <Badge variant="gold" size="sm">Cốt Lõi</Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    Tự động ghép 3 Bot theo bậc <strong className="text-[var(--color-gold)]">{currentRank.badge} {currentRank.name} ({profile.elo} Elo)</strong>. Ăn thua tiền cược Xu và tích lũy điểm Elo leo hạng!
                  </p>
                </div>
              </div>
            </div>

            {/* Dải Tags & CTA */}
            <div className="pt-4 mt-4 border-t border-[var(--border-container)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold" size="md">
                  {currentRank.badge} {currentRank.name} ({profile.elo} Elo)
                </Badge>
                <Badge variant="neutral" size="md">
                  💰 Cược: {calculateAdaptiveQuickBet(profile.coins).toLocaleString()} Xu / Lá
                </Badge>
                <Badge variant="neutral" size="md">
                  ⚡ Phạt Chặt: x1 - x5
                </Badge>
                <Badge variant="neutral" size="md">
                  👥 Bàn: 2, 3, 4 Người
                </Badge>
              </div>

              {/* Nhóm nút hành động: Cấu Hình Bàn (bên trái) + Chơi Ngay (bên phải) */}
              <div className="flex items-center gap-2.5">
                <Button
                  variant="surface"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuickSetup();
                  }}
                  leftIcon={<Sliders className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                  title="Tùy chỉnh tiền cược và luật phạt"
                >
                  <span>Cấu Hình Bàn</span>
                </Button>

                <Button
                  variant="gold"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPlayNow) onPlayNow();
                    else onOpenQuickSetup();
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Chơi Ngay
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* ========================================================================= */}
        {/* HÀNG 2: CHẾ ĐỘ MỞ RỘNG (2 THẺ LỚN TIER 1) */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Trophy />}
            title="Chế Độ Mở Rộng"
            subtitle="Hành trình cốt truyện • Tùy chỉnh bàn chơi nâng cao"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. CHIẾN DỊCH CỐT TRUYỆN */}
            <Card 
              variant="container"
              hoverable
              clickable
              onClick={onOpenCampaign}
              className="group p-5 sm:p-6 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm group-hover:border-[var(--border-gold)] transition-colors">
                  <MapPin className="w-6 h-6" />
                </div>
                <Badge variant="neutral" size="sm">5 Chương Cốt Truyện</Badge>
              </div>

              <div className="my-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                  Chiến Dịch Cốt Truyện
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                  Hành trình từ Sới Bạc Xóm đến Sòng Bạc Đỉnh Cao. Chinh phục từng chương, đánh bại các Trùm Sòng để mở khóa danh hiệu độc quyền.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-container)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Nhận Danh Hiệu &amp; Xu Thưởng</span>
                <Button
                  variant="surface"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                >
                  Bản Đồ Chiến Dịch
                </Button>
              </div>
            </Card>

            {/* 2. TÙY CHỈNH NÂNG CAO (SANDBOX) */}
            <Card 
              variant="container"
              hoverable
              clickable
              onClick={onOpenCustomGameModal}
              className="group p-5 sm:p-6 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm group-hover:border-[var(--border-gold)] transition-colors">
                  <Sliders className="w-6 h-6" />
                </div>
                <Badge variant="neutral" size="sm">Sandbox</Badge>
              </div>

              <div className="my-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                  Tùy Chỉnh Nâng Cao
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                  Tự do chọn đối thủ từng Bot AI, tinh chỉnh độ khó, thuật toán suy luận, luật đếm lá, cóng, phạt chặt và mức cược.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-container)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Tùy Biến 100% Luật &amp; Bot</span>
                <Button
                  variant="surface"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                >
                  Tùy Chỉnh
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};
