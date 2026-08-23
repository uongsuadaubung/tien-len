import React, { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { X, Landmark, AlertTriangle, ShieldCheck, HeartHandshake, DollarSign } from 'lucide-react';

interface BankruptcyModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const [loanAmountToBorrow, setLoanAmountToBorrow] = useState<number>(20000);

  if (!isOpen) return null;

  const MAX_RELIEF_PER_DAY = 3;
  const canClaimRelief = profile.dailyReliefClaimedCount < MAX_RELIEF_PER_DAY && profile.coins < 2000;

  const handleClaimRelief = () => {
    if (!canClaimRelief) return;

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + 5000,
      dailyReliefClaimedCount: profile.dailyReliefClaimedCount + 1
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
    alert('Đã nhận thành công gói Cứu Trợ Hộ Nghèo +5,000 Xu!');
  };

  const handleBorrowLoan = () => {
    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + loanAmountToBorrow,
      loans: profile.loans + loanAmountToBorrow
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
    alert(`Đã vay nóng thành công +${loanAmountToBorrow.toLocaleString()} Xu từ Chủ Sòng Ba Son!`);
  };

  const handleRepayDebt = () => {
    if (profile.loans <= 0) return;
    if (profile.coins <= 0) {
      alert('Bạn không có đủ tiền để trả nợ!');
      return;
    }

    const repay = Math.min(profile.coins, profile.loans);
    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins - repay,
      loans: profile.loans - repay
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
    alert(`Đã hoàn trả thành công ${repay.toLocaleString()} Xu nợ!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-neutral-900 via-neutral-950 to-black rounded-3xl border-2 border-red-500/60 shadow-2xl p-5 sm:p-6 text-white flex flex-col justify-between overflow-hidden">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-red-300 uppercase tracking-wide">
              Ngân Hàng & Cứu Trợ Sòng Bạc
            </h2>
            <p className="text-xs text-neutral-400">Hỗ trợ vốn khởi nghiệp khi chẳng may cháy túi</p>
          </div>
        </div>

        {/* Thống kê Tài Sản & Nợ */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 uppercase font-semibold">Tài Sản Hiện Có</span>
            <div className="text-base sm:text-lg font-black text-yellow-300 mt-0.5">
              {profile.coins.toLocaleString()} <span className="text-xs font-normal">Xu</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30">
            <span className="text-[11px] text-red-300 uppercase font-semibold">Khoản Nợ Sòng Bạc</span>
            <div className="text-base sm:text-lg font-black text-red-400 mt-0.5">
              {profile.loans.toLocaleString()} <span className="text-xs font-normal">Xu</span>
            </div>
          </div>
        </div>

        {/* KHU VỰC 1: GÓI CỨU TRỢ HỘ NGHÈO (MIỄN PHÍ) */}
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HeartHandshake className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-emerald-200">Gói Cứu Trợ Hộ Nghèo</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Nhận miễn phí <strong className="text-emerald-300">+5,000 Xu</strong> (Còn {MAX_RELIEF_PER_DAY - profile.dailyReliefClaimedCount}/{MAX_RELIEF_PER_DAY} lần hôm nay)
              </p>
            </div>
          </div>

          <button
            onClick={handleClaimRelief}
            disabled={!canClaimRelief}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              canClaimRelief
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 shadow-lg cursor-pointer'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            Nhận Cứu Trợ
          </button>
        </div>

        {/* KHU VỰC 2: VAY NỢ CHỦ SÒNG BA SON */}
        <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-sm text-amber-200">Vay Nợ Chủ Sòng Ba Son</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed mb-3">
            Vay vốn tiếp tục vào sòng. Sòng bạc sẽ tự động trích <strong className="text-yellow-300">10% tiền thắng</strong> mỗi ván sau để thu hồi nợ dần.
          </p>

          <div className="flex items-center gap-2 mb-3">
            {[20000, 50000, 100000].map(amt => (
              <button
                key={amt}
                onClick={() => setLoanAmountToBorrow(amt)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  loanAmountToBorrow === amt
                    ? 'bg-red-700 text-white border border-red-400'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                +{amt.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            onClick={handleBorrowLoan}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
          >
            Vay Nóng {loanAmountToBorrow.toLocaleString()} Xu
          </button>
        </div>

        {/* Trả nợ (nếu có nợ) */}
        {profile.loans > 0 && (
          <button
            onClick={handleRepayDebt}
            className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-yellow-300 font-bold text-xs transition-colors border border-yellow-500/20"
          >
            Thanh Toán Trả Nợ Ngay
          </button>
        )}
      </div>
    </div>
  );
};
