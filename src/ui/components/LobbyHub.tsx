import React from 'react';
import { PlayerProfile } from '../../engine/storage';
import { getRankTierByElo, RANK_TIERS } from '../../engine/elo';
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
  ArrowRight
} from 'lucide-react';
import { Button, Badge, Card, SectionHeader } from '../primitives';

interface LobbyHubProps {
  profile: PlayerProfile;
  onOpenQuickSetup: () => void;
  onOpenCustomGameModal: () => void;
  onOpenRanked: () => void;
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
  onOpenQuickSetup,
  onOpenCustomGameModal,
  onOpenRanked,
  onOpenCampaign,
  onOpenQuests,
  onOpenLuckyWheel,
  onOpenBank,
  onOpenSettings,
  onOpenRules,
  onOpenNameSetup
}) => {
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
        </div>
      </Card>

      {/* BODY (Tier 0 Canvas với các Container Tier 1) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto py-3 space-y-6">
        
        {/* ========================================================================= */}
        {/* HÀNG 1: SÒNG BẠC CHƠI NHANH (HERO CONTAINER TIER 1) */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Flame />}
            title="Sòng Bạc Sát Phạt Tự Do"
            subtitle="Vào bàn tức thì • Cược linh hoạt • Phạt chặt nhân tới x5"
          />

          {/* HERO CARD: TIER 1 CONTAINER */}
          <Card 
            variant="container"
            hoverable
            clickable
            onClick={onOpenQuickSetup}
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
                      Sòng Bạc Chơi Nhanh
                    </h3>
                    <Badge variant="gold" size="sm">Phổ Biến Nhất</Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    Tùy chỉnh nhanh số người (2-4), cược từ 500 Xu (hoặc tự do tùy chọn), phạt chặt nhân từ x1 đến x5, đếm lá sát phạt hoặc nhất ăn tất.
                  </p>
                </div>
              </div>

              {/* Nút tùy chỉnh chuyên sâu */}
              <Button
                variant="surface"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCustomGameModal();
                }}
                leftIcon={<Sliders className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                title="Tùy chỉnh chuyên sâu từng Bot AI và luật chơi"
              >
                <span>Tùy Chỉnh Nâng Cao</span>
              </Button>
            </div>

            {/* Dải Tags & CTA */}
            <div className="pt-4 mt-4 border-t border-[var(--border-container)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral" size="md">
                  💰 Cược: 500+ Xu
                </Badge>
                <Badge variant="neutral" size="md">
                  ⚡ Phạt Chặt: x1 - x5
                </Badge>
                <Badge variant="neutral" size="md">
                  👥 Bàn: 2, 3, 4 Người
                </Badge>
              </div>

              <Button
                variant="gold"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Vào Bàn Chơi Ngay
              </Button>
            </div>
          </Card>
        </section>

        {/* ========================================================================= */}
        {/* HÀNG 2: CHINH PHỤC & ĐẤU TRÍ (2 THẺ LỚN TIER 1) */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Trophy />}
            title="Chinh Phục & Đấu Trí"
            subtitle="Leo hạng Elo • Vượt ải cốt truyện"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. ĐẤU HẠNG ELO */}
            <Card 
              variant="container"
              hoverable
              clickable
              onClick={onOpenRanked}
              className="group p-5 sm:p-6 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm group-hover:border-[var(--border-gold)] transition-colors">
                  <Trophy className="w-6 h-6" />
                </div>
                <Badge variant="neutral" size="sm">Bàn VIP Elo</Badge>
              </div>

              <div className="my-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                  Đấu Hạng Elo
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                  Đấu trường thuần kỹ năng (không tốn Xu). Ghép 3 Bot cùng trình độ Elo, leo hạng từ Tân Thủ lên Thần Bài để nhận thưởng lớn!
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-container)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Cược: 0 Xu • Tính Điểm Elo</span>
                <Button
                  variant="surface"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                >
                  Ghép Trận Rank
                </Button>
              </div>
            </Card>

            {/* 2. CHIẾN DỊCH CỐT TRUYỆN */}
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
                <Badge variant="neutral" size="sm">5 Chương Ải</Badge>
              </div>

              <div className="my-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                  Chiến Dịch Cốt Truyện
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                  Hành trình từ Sới Bạc Xóm đến Sòng Bạc Đỉnh Cao. Vượt qua từng ải, đánh bại các Trùm Sòng để mở khóa danh hiệu độc quyền.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-container)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Nhận Danh Hiệu &amp; Xu Thưởng</span>
                <Button
                  variant="surface"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                >
                  Vào Bản Đồ Ải
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-container)]">
        <div className="flex items-center gap-2">
          <span>Tiến Lên Miền Nam VIP • Luxury Edition</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            leftIcon={<Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
            title="Cài đặt âm thanh và hiệu ứng"
          >
            <span>Cài Đặt</span>
          </Button>
        </div>
      </footer>
    </div>
  );
};
