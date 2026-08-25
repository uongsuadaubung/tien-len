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
  Zap,
  Crown,
  Swords,
  Layers,
  Sparkles,
  AlertCircle,
  Sliders,
  Edit2
} from 'lucide-react';

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
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-y-auto bg-[#120103] text-white p-3 sm:p-5 select-none font-sans">
      {/* Background ánh sáng đỏ & vàng VIP */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(217,119,6,0.18),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(220,38,38,0.15),transparent_50%)] pointer-events-none" />

      {/* HEADER: THÔNG TIN PROFILE, TIỀN VÀNG & RANK ELO */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 bg-[#180205] p-3 sm:p-4 rounded-3xl border border-yellow-500/40 shadow-xl">
        {/* Profile Người Chơi */}
        <div 
          onClick={onOpenNameSetup}
          className={`flex items-center gap-3 ${onOpenNameSetup ? 'cursor-pointer group hover:opacity-90' : ''}`}
          title="Bấm để đổi tên và avatar"
        >
          <div className="relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-600 via-amber-600 to-yellow-500 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center text-2xl sm:text-3xl">
                {profile.avatar}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-yellow-200 tracking-wide group-hover:text-yellow-400 flex items-center gap-1.5">
                <span>{profile.name || 'Chưa Đặt Tên'}</span>
                {onOpenNameSetup && <Edit2 className="w-3.5 h-3.5 text-yellow-500/80 group-hover:text-yellow-300" />}
              </h2>
            </div>

            {/* Elo & Bậc Rank */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">{currentRank.badge}</span>
              <span className="text-xs font-black" style={{ color: currentRank.color }}>
                {currentRank.name}
              </span>
              <span className="text-[11px] text-amber-200/80 font-bold">
                ({profile.elo} Elo)
              </span>
            </div>

            {/* Thanh tiến trình Elo */}
            {nextTier && (
              <div className="w-36 sm:w-48 h-1.5 bg-neutral-800 rounded-full mt-1.5 overflow-hidden border border-neutral-700/50">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-500"
                  style={{ width: `${eloProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* TÚI TIỀN & CÁC NÚT TÍNH NĂNG NHANH */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Số Dư Tiền Vàng */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-950/80 to-yellow-950/80 px-3.5 sm:px-4 py-2 rounded-2xl border border-yellow-400/40 shadow-inner">
            <span className="text-lg">🧧</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-yellow-400/70 font-semibold uppercase">Tài Sản</span>
              <span className="font-black text-sm sm:text-base text-yellow-300">
                {profile.coins.toLocaleString()} <span className="text-xs font-normal">Xu</span>
              </span>
            </div>
          </div>

          {/* Cảnh báo nợ (nếu có) */}
          {profile.loans > 0 && (
            <button
              onClick={onOpenBank}
              className="flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 px-3 py-2 rounded-2xl border border-red-500/50 text-red-200 text-xs font-bold transition-all hover:scale-105"
            >
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>Nợ: {profile.loans.toLocaleString()}</span>
            </button>
          )}

          {/* Nút Vay Nợ / Ngân Hàng */}
          <button
            onClick={onOpenBank}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-yellow-500/30 text-yellow-300 font-bold text-xs transition-all hover:scale-105 cursor-pointer"
            title="Quỹ Cứu Trợ & Vay Vốn Sòng Bạc"
          >
            <Landmark className="w-4 h-4 text-yellow-400" />
            <span className="hidden sm:inline">Ngân Hàng</span>
          </button>

          {/* Nút Nhiệm Vụ & Thành Tựu */}
          <button
            onClick={onOpenQuests}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-950/80 hover:bg-blue-900 border border-blue-400/40 text-blue-200 font-bold text-xs transition-all hover:scale-105 cursor-pointer"
          >
            <Target className="w-4 h-4 text-blue-400" />
            <span>Nhiệm Vụ</span>
            {claimableQuestsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {claimableQuestsCount}
              </span>
            )}
          </button>

          {/* Nút Vòng Quay May Mắn */}
          <button
            onClick={onOpenLuckyWheel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-red-950 font-black text-xs shadow-lg transition-all hover:scale-105 cursor-pointer"
          >
            <Disc className="w-4 h-4 text-red-950 animate-spin-slow" />
            <span>Vòng Quay</span>
          </button>
        </div>
      </header>

      {/* BODY: BỐ CỤC CHẾ ĐỘ CHƠI TINH GỌN & HIỆN ĐẠI */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto py-3 space-y-6">
        {/* ========================================================================= */}
        {/* HÀNG 1: SÒNG BẠC CHƠI NHANH (HERO CARD LỚN - SÁT PHẠT TỰ DO) */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-950/80 border border-red-500/40 shadow-md">
              <Flame className="w-4 h-4 text-amber-400 fill-current" />
              <span className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider">
                Sòng Bạc Sát Phạt Tự Do
              </span>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-red-500/40 via-yellow-500/20 to-transparent" />
            <span className="text-[11px] text-neutral-400 hidden sm:inline font-medium">
              Vào bàn tức thì • Cược linh hoạt • Phạt chặt nhân tới x5
            </span>
          </div>

          {/* HERO CARD: CHƠI NHANH */}
          <div 
            onClick={onOpenQuickSetup}
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-950/90 via-neutral-950 to-black border-2 border-yellow-500/60 hover:border-yellow-300 shadow-[0_0_40px_rgba(234,179,8,0.2)] cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-yellow-500/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-red-950 shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-yellow-300 group-hover:text-yellow-200">
                      Sòng Bạc Chơi Nhanh
                    </h3>
                    <span className="bg-yellow-500 text-red-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                      Phổ Biến Nhất
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-relaxed font-medium">
                    Tùy chỉnh nhanh số người (2-4), cược từ 500 đến 20.000 Xu, phạt chặt nhân từ x1 đến x5, đếm lá sát phạt hoặc nhất ăn tất.
                  </p>
                </div>
              </div>

              {/* Nút tùy chỉnh chuyên sâu nhỏ bên cạnh */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCustomGameModal();
                }}
                className="px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
                title="Tùy chỉnh chuyên sâu từng Bot AI và luật chơi"
              >
                <Sliders className="w-3.5 h-3.5 text-yellow-400" />
                <span>Tùy Chỉnh Nâng Cao</span>
              </button>
            </div>

            <div className="pt-4 mt-4 border-t border-yellow-500/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-neutral-400">
                <span className="bg-black/60 px-3 py-1 rounded-xl border border-yellow-500/30 text-yellow-300">
                  💰 Cược: 500 - 20,000 Xu
                </span>
                <span className="bg-black/60 px-3 py-1 rounded-xl border border-red-500/30 text-red-300">
                  ⚡ Phạt Chặt: x1 - x5
                </span>
                <span className="bg-black/60 px-3 py-1 rounded-xl border border-blue-500/30 text-blue-300">
                  👥 Bàn: 2, 3, 4 Người
                </span>
              </div>

              <span className="text-xs font-black text-yellow-300 bg-yellow-950/80 px-4 py-2 rounded-xl border border-yellow-500/50 group-hover:bg-yellow-400 group-hover:text-red-950 transition-all flex items-center gap-1.5 shadow-lg">
                <span>Cấu Hình & Chơi Ngay</span>
                <span>→</span>
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HÀNG 2: CHINH PHỤC & ĐẤU TRÍ (LEO RANK & CHIẾN DỊCH) */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          {/* HEADER PHÂN TÁCH PHẦN 2 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-950/80 border border-blue-500/40 shadow-md">
              <Trophy className="w-4 h-4 text-blue-400 fill-current" />
              <span className="text-xs sm:text-sm font-black text-blue-200 uppercase tracking-wider">
                Chinh Phục & Đấu Trí
              </span>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/40 via-purple-500/20 to-transparent" />
            <span className="text-[11px] text-neutral-400 hidden sm:inline font-medium">
              Leo hạng Elo • Vượt ải cốt truyện
            </span>
          </div>

          {/* LƯỚI 2 THẺ LỚN HÀNG 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. ĐẤU HẠNG ELO */}
            <div 
              onClick={onOpenRanked}
              className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-blue-950/80 via-neutral-950 to-black border border-blue-500/40 hover:border-blue-400 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-blue-500/25"
            >
              <div className="flex items-start justify-between">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-blue-100 shadow-lg group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6" />
                </div>
                <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                  Leo Rank Elo
                </span>
              </div>

              <div className="my-4">
                <h3 className="text-xl sm:text-2xl font-black text-blue-200 group-hover:text-blue-100">
                  Đấu Hạng Elo
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed font-medium">
                  Đấu trường thuần kỹ năng (không tốn Xu). Ghép 3 Bot cùng trình độ Elo, leo hạng từ Tân Thủ lên Thần Bài để nhận thưởng lớn!
                </p>
              </div>

              <div className="pt-4 border-t border-blue-500/20 flex items-center justify-between">
                <span className="text-xs font-black text-blue-300">Cược: 0 Xu • Tính Điểm Elo</span>
                <span className="text-xs font-black text-blue-200 bg-blue-950/80 px-3 py-1.5 rounded-xl border border-blue-400/40 group-hover:bg-blue-500 group-hover:text-white transition-all flex items-center gap-1">
                  <span>Ghép Trận Rank</span>
                  <span>→</span>
                </span>
              </div>
            </div>

            {/* 2. CHIẾN DỊCH CỐT TRUYỆN */}
            <div 
              onClick={onOpenCampaign}
              className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-950/80 via-neutral-950 to-black border border-purple-500/40 hover:border-purple-400 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-purple-500/25"
            >
              <div className="flex items-start justify-between">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center text-purple-100 shadow-lg group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                  5 Chương Ải
                </span>
              </div>

              <div className="my-4">
                <h3 className="text-xl sm:text-2xl font-black text-purple-200 group-hover:text-purple-100">
                  Chiến Dịch Cốt Truyện
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed font-medium">
                  Hành trình từ Sới Bạc Xóm đến Sòng Bạc Đỉnh Cao. Vượt qua từng ải, đánh bại các Trùm Sòng để mở khóa danh hiệu độc quyền.
                </p>
              </div>

              <div className="pt-4 border-t border-purple-500/20 flex items-center justify-between">
                <span className="text-xs font-black text-purple-300">Nhận Danh Hiệu & Xu Thưởng</span>
                <span className="text-xs font-black text-purple-200 bg-purple-950/80 px-3 py-1.5 rounded-xl border border-purple-400/40 group-hover:bg-purple-500 group-hover:text-white transition-all flex items-center gap-1">
                  <span>Vào Bản Đồ Ải</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER: NÚT CÀI ĐẶT & THÔNG TIN HỆ THỐNG */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-800/80">
        <div className="flex items-center gap-2">
          <span>Tiến Lên Miền Nam VIP • Multi-Rule Strategy Engine</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 hover:text-yellow-400 transition-colors cursor-pointer text-neutral-400"
            title="Cài đặt âm thanh và hiệu ứng"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cài Đặt</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
