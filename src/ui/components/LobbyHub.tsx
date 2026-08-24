import React from 'react';
import { PlayerProfile } from '../../engine/storage';
import { getRankTierByElo, RANK_TIERS } from '../../engine/elo';
import { SHOP_ITEMS } from '../../engine/shop-items';
import { 
  Trophy, 
  Flame, 
  MapPin, 
  Play, 
  ShoppingBag, 
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
  Sliders
} from 'lucide-react';

interface LobbyHubProps {
  profile: PlayerProfile;
  onOpenCustomGameModal: () => void;
  onOpenRanked: () => void;
  onOpenCampaign: () => void;
  onOpenUnderground: () => void;
  onStartSolo1v1: () => void;
  onStartCountCards: () => void;
  onStartWinnerTakesAll: () => void;
  onOpenShop: () => void;
  onOpenQuests: () => void;
  onOpenLuckyWheel: () => void;
  onOpenBank: () => void;
  onOpenSettings: () => void;
}

export const LobbyHub: React.FC<LobbyHubProps> = ({
  profile,
  onOpenCustomGameModal,
  onOpenRanked,
  onOpenCampaign,
  onOpenUnderground,
  onStartSolo1v1,
  onStartCountCards,
  onStartWinnerTakesAll,
  onOpenShop,
  onOpenQuests,
  onOpenLuckyWheel,
  onOpenBank,
  onOpenSettings
}) => {
  const currentRank = getRankTierByElo(profile.elo);
  const activeTitleObj = SHOP_ITEMS.find(i => i.id === profile.activeTitle);
  const activeTitleName = activeTitleObj ? activeTitleObj.name : 'Tân Thủ Cầu May';

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
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-600 via-amber-600 to-yellow-500 p-0.5 shadow-lg">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center text-2xl sm:text-3xl">
                {profile.avatar}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full border border-yellow-200">
              VIP
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-yellow-200 tracking-wide">
                {profile.name}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-400/40">
                {activeTitleName}
              </span>
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
            <span className="text-lg animate-bounce">🧧</span>
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

          {/* Nút Cửa Hàng (Shop) */}
          <button
            onClick={onOpenShop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-purple-900/80 to-pink-900/80 hover:from-purple-800 hover:to-pink-800 border border-purple-400/50 text-pink-100 font-bold text-xs shadow-lg transition-all hover:scale-105 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-pink-300" />
            <span>Cửa Hàng</span>
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

      {/* BODY: TẤT CẢ CHẾ ĐỘ TRÊN CÙNG 1 MÀN HÌNH (CHIA BỞI HEADER SECTION) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto py-3 space-y-6">
        {/* ========================================================================= */}
        {/* PHẦN 1: SÒNG BẠC & ĐẤU CƯỢC NHANH (CASINO & FAST PLAY) */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          {/* HEADER PHÂN TÁCH PHẦN 1 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-950/80 border border-red-500/40 shadow-md">
              <Flame className="w-4 h-4 text-amber-400 fill-current" />
              <span className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider">
                Sòng Bạc & Đấu Cược Nhanh
              </span>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-red-500/40 via-yellow-500/20 to-transparent" />
            <span className="text-[11px] text-neutral-400 hidden sm:inline font-medium">
              Vào bàn tức thì • Thưởng phạt bằng Xu
            </span>
          </div>

          {/* LƯỚI 4 THẺ SÒNG BẠC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. SOLO 1V1 QUYẾT ĐẤU */}
            <div 
              onClick={onStartSolo1v1}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-orange-950/70 via-neutral-950/80 to-black border border-orange-500/40 hover:border-orange-400 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-orange-500/25"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-orange-900/80 border border-orange-400/50 flex items-center justify-center text-orange-200 shadow-md">
                  <Swords className="w-5 h-5" />
                </div>
                <span className="bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  1 vs 1
                </span>
              </div>
              <div className="my-3">
                <h3 className="text-base sm:text-lg font-black text-orange-200 group-hover:text-orange-100">
                  Solo 1v1 Quyết Đấu
                </h3>
                <p className="text-xs text-neutral-300/90 font-medium mt-1.5 leading-relaxed">
                  Bàn 2 người đối đầu trực diện 13 lá/người. Cực nhanh, căng não, không sợ bị kẹp bài!
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-black text-orange-300">Cược: 200 Xu</span>
                <span className="text-xs font-bold text-neutral-400 group-hover:text-orange-200 transition-colors">Vào Bàn →</span>
              </div>
            </div>

            {/* 2. TIẾN LÊN ĐẾM LÁ */}
            <div 
              onClick={onStartCountCards}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-950/70 via-neutral-950/80 to-black border border-amber-500/40 hover:border-yellow-400 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-yellow-500/25"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-amber-900/80 border border-amber-400/50 flex items-center justify-center text-yellow-200 shadow-md">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Phổ Biến
                </span>
              </div>
              <div className="my-3">
                <h3 className="text-base sm:text-lg font-black text-yellow-200 group-hover:text-yellow-100">
                  Tiến Lên Đếm Lá
                </h3>
                <p className="text-xs text-neutral-300/90 font-medium mt-1.5 leading-relaxed">
                  1 người về Nhất kết thúc ván ngay. Đếm số lá bài tồn phạt tiền, thối Heo/Hàng phạt nặng!
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-black text-yellow-300">Cược: 100 Xu</span>
                <span className="text-xs font-bold text-neutral-400 group-hover:text-yellow-200 transition-colors">Vào Bàn →</span>
              </div>
            </div>

            {/* 3. NHẤT ĂN TẤT */}
            <div 
              onClick={onStartWinnerTakesAll}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-yellow-950/70 via-neutral-950/80 to-black border border-yellow-500/40 hover:border-yellow-300 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-yellow-500/30"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-yellow-900/80 border border-yellow-400/50 flex items-center justify-center text-yellow-300 shadow-md">
                  <Crown className="w-5 h-5" />
                </div>
                <span className="bg-yellow-600 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Ăn Trọn
                </span>
              </div>
              <div className="my-3">
                <h3 className="text-base sm:text-lg font-black text-yellow-300 group-hover:text-yellow-200">
                  Nhất Ăn Tất
                </h3>
                <p className="text-xs text-neutral-300/90 font-medium mt-1.5 leading-relaxed">
                  Chỉ người về Nhất được nhận tiền thưởng, gom trọn tiền cược của cả 3 đối thủ trên bàn.
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-black text-yellow-300">Cược: 150 Xu</span>
                <span className="text-xs font-bold text-neutral-400 group-hover:text-yellow-200 transition-colors">Vào Bàn →</span>
              </div>
            </div>

            {/* 4. SÒNG BẠC THẾ GIỚI NGẦM */}
            <div 
              onClick={onOpenUnderground}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-red-950 via-neutral-950 to-black border-2 border-red-500/60 hover:border-yellow-400 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-red-600/35 animate-pulse-slow"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-red-900/90 border border-red-400/60 flex items-center justify-center text-red-200 shadow-lg">
                  <Flame className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Phạt x2
                </span>
              </div>
              <div className="my-3">
                <h3 className="text-base sm:text-lg font-black text-yellow-300 group-hover:text-yellow-200">
                  Thế Giới Ngầm
                </h3>
                <p className="text-xs text-neutral-300/90 font-medium mt-1.5 leading-relaxed">
                  Cược lớn từ 500 đến 50,000 xu. Chặt chém phạt x2, đền Cóng cả làng, trích nợ ngân hàng!
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-black text-red-300">Cược: 500 - 50k</span>
                <span className="text-xs font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors">Vào Sòng →</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PHẦN 2: CHINH PHỤC & ĐẤU TRÍ (CONQUEST & MASTERY) */}
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
              Leo hạng Elo • Vượt ải cốt truyện • Tùy biến tự do
            </span>
          </div>

          {/* LƯỚI 3 THẺ CHINH PHỤC */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* 1. ĐẤU HẠNG ELO */}
            <div 
              onClick={onOpenRanked}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-blue-950/70 via-neutral-950/80 to-black border border-blue-500/40 hover:border-blue-400 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-blue-500/25"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-blue-900/80 border border-blue-400/50 flex items-center justify-center text-blue-200 shadow-md">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Leo Rank
                </span>
              </div>
              <div className="my-3">
                <h3 className="text-base sm:text-lg font-black text-blue-200 group-hover:text-blue-100">
                  Đấu Hạng Elo
                </h3>
                <p className="text-xs text-neutral-300/90 font-medium mt-1.5 leading-relaxed">
                  Đấu trường thuần kỹ năng (không tốn xu). Ghép 3 bot cùng trình độ Elo, leo rank từ Đồng lên Thần Bài nhận thưởng!
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-black text-blue-300">Cược: 0 Xu • Tính Elo</span>
                <span className="text-xs font-bold text-neutral-400 group-hover:text-blue-200 transition-colors">Ghép Trận →</span>
              </div>
            </div>

            {/* 2. CHIẾN DỊCH CỐT TRUYỆN */}
            <div 
              onClick={onOpenCampaign}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-purple-950/70 via-neutral-950/80 to-black border border-purple-500/40 hover:border-purple-400 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-purple-500/25"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-purple-900/80 border border-purple-400/50 flex items-center justify-center text-purple-200 shadow-md">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  5 Chương
                </span>
              </div>
              <div className="my-3">
                <h3 className="text-base sm:text-lg font-black text-purple-200 group-hover:text-purple-100">
                  Chiến Dịch Cốt Truyện
                </h3>
                <p className="text-xs text-neutral-300/90 font-medium mt-1.5 leading-relaxed">
                  Hành trình từ Sới Bạc Xóm đến Sòng Bạc Ngầm. Hạ gục các Trùm Sòng để mở khóa danh hiệu và phần thưởng lớn.
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-black text-purple-300">Mở Khóa Danh Hiệu</span>
                <span className="text-xs font-bold text-neutral-400 group-hover:text-purple-200 transition-colors">Vào Bản Đồ →</span>
              </div>
            </div>

            {/* 3. CHƠI TỰ DO (CUSTOM SANDBOX) */}
            <div 
              onClick={onOpenCustomGameModal}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-emerald-950/70 via-neutral-950/80 to-black border border-emerald-500/40 hover:border-emerald-400 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-emerald-500/25"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-900/80 border border-emerald-400/50 flex items-center justify-center text-emerald-200 shadow-md">
                  <Sliders className="w-5 h-5" />
                </div>
                <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Sandbox
                </span>
              </div>
              <div className="my-3">
                <h3 className="text-base sm:text-lg font-black text-emerald-200 group-hover:text-emerald-100">
                  Chơi Tự Do
                </h3>
                <p className="text-xs text-neutral-300/90 font-medium mt-1.5 leading-relaxed">
                  Toàn quyền chỉnh số người (2-4), kiểu tính tiền, chọn bot từ 19+ nhân cách và tinh chỉnh chỉ số thuật toán AI.
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-black text-emerald-300">Tùy Chỉnh 100%</span>
                <span className="text-xs font-bold text-neutral-400 group-hover:text-emerald-200 transition-colors">Cấu Hình →</span>
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
