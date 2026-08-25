import React, { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { X, Landmark, AlertTriangle, ShieldCheck, HeartHandshake, DollarSign, Wallet, ArrowRight, CheckCircle2 } from 'lucide-react';

interface BankruptcyModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

const LOAN_PACKAGES = [
  { amount: 100000, label: 'Tiếp Sức', desc: 'Vốn quay vòng nhanh' },
  { amount: 250000, label: 'Vực Dậy', desc: 'Vốn đánh bàn trung cấp' },
  { amount: 500000, label: 'Đại Gia', desc: 'Vốn chiến bàn lớn' },
  { amount: 1000000, label: 'Thần Bài', desc: 'Tất tay phục thù' }
];

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const [loanAmountToBorrow, setLoanAmountToBorrow] = useState<number>(250000);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const MAX_RELIEF_PER_DAY = 3;
  const RELIEF_AMOUNT = 100000;
  const canClaimRelief = profile.dailyReliefClaimedCount < MAX_RELIEF_PER_DAY && profile.coins < 100000;

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleClaimRelief = () => {
    if (!canClaimRelief) return;

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + RELIEF_AMOUNT,
      dailyReliefClaimedCount: profile.dailyReliefClaimedCount + 1
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
    showNotification(`🎉 Nhận thành công gói Cứu Trợ Khẩn Cấp +${RELIEF_AMOUNT.toLocaleString()} Xu!`);
  };

  const handleBorrowLoan = () => {
    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + loanAmountToBorrow,
      loans: profile.loans + loanAmountToBorrow
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
    showNotification(`💸 Đã vay thành công +${loanAmountToBorrow.toLocaleString()} Xu từ Ngân Hàng Ba Son!`);
  };

  const handleRepayDebt = (portion: number = 1) => {
    if (profile.loans <= 0) return;
    if (profile.coins <= 0) {
      alert('Bạn không có đủ Xu trong ví để trả nợ!');
      return;
    }

    const maxCanPay = Math.min(profile.coins, profile.loans);
    const repayAmount = Math.max(1, Math.floor(maxCanPay * portion));

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins - repayAmount,
      loans: profile.loans - repayAmount
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
    showNotification(`✅ Đã thanh toán thành công ${repayAmount.toLocaleString()} Xu nợ!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#1c0a0c] via-[#140608] to-[#0a0002] rounded-3xl border-2 border-yellow-500/60 shadow-[0_0_50px_rgba(234,179,8,0.2)] p-5 sm:p-6 text-white flex flex-col justify-between overflow-hidden max-h-[90vh]">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer border border-yellow-500/20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-yellow-500/20">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center text-red-950 shadow-lg font-black">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-yellow-300 uppercase tracking-wide flex items-center gap-2">
              Ngân Hàng & Tín Dụng Ba Son
            </h2>
            <p className="text-xs text-neutral-400">Hỗ trợ vốn khởi nghiệp & tái thiết tài chính khi cạn ví</p>
          </div>
        </div>

        {/* Thông báo thành công nếu có */}
        {successMessage && (
          <div className="my-2 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* NỘI DUNG CUỘN */}
        <div className="my-3 space-y-3.5 overflow-y-auto pr-1">
          {/* Thống kê Tài Sản & Nợ Hiện Tại */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-black/60 border border-yellow-500/30">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 uppercase font-black">
                <Wallet className="w-3.5 h-3.5 text-yellow-400" />
                <span>Số Dư Ví Hiện Có</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-yellow-300 mt-1">
                {profile.coins.toLocaleString()} <span className="text-xs font-semibold text-yellow-500">Xu</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40">
              <div className="flex items-center gap-1.5 text-[11px] text-red-300 uppercase font-black">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Dư Nợ Sòng Bạc</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-red-400 mt-1">
                {profile.loans.toLocaleString()} <span className="text-xs font-semibold text-red-500">Xu</span>
              </div>
            </div>
          </div>

          {/* KHU VỰC 1: GÓI CỨU TRỢ KHẨN CẤP (MIỄN PHÍ) */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <div className="font-extrabold text-xs sm:text-sm text-emerald-200 flex items-center gap-2">
                  <span>Gói Cứu Trợ Khẩn Cấp</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Miễn Phí
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 mt-0.5">
                  Nhận ngay <strong className="text-emerald-300">+{RELIEF_AMOUNT.toLocaleString()} Xu</strong> (Áp dụng khi ví &lt; 100K Xu • Còn {MAX_RELIEF_PER_DAY - profile.dailyReliefClaimedCount}/{MAX_RELIEF_PER_DAY} lần hôm nay)
                </p>
              </div>
            </div>

            <button
              onClick={handleClaimRelief}
              disabled={!canClaimRelief}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap border ${
                canClaimRelief
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg cursor-pointer border-emerald-300 hover:scale-105'
                  : 'bg-neutral-900 text-neutral-500 border-neutral-800 cursor-not-allowed'
              }`}
            >
              Nhận Cứu Trợ
            </button>
          </div>

          {/* KHU VỰC 2: HẠN MỨC VAY TÍN DỤNG VIP (4 GÓI MỆNH GIÁ MỚI) */}
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-yellow-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <h4 className="font-black text-xs uppercase tracking-wide text-yellow-300">
                  Gói Vay Vốn Tín Dụng Sòng Bạc
                </h4>
              </div>
              <span className="text-[10px] text-neutral-400">Trích 10% tiền thắng trả dần</span>
            </div>

            {/* Lưới 4 gói mệnh giá */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LOAN_PACKAGES.map(pkg => (
                <button
                  key={pkg.amount}
                  onClick={() => setLoanAmountToBorrow(pkg.amount)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    loanAmountToBorrow === pkg.amount
                      ? 'bg-gradient-to-b from-amber-950 to-yellow-950 border-yellow-400 text-yellow-100 shadow-md ring-1 ring-yellow-400 scale-[1.02]'
                      : 'bg-black/50 border-yellow-500/20 text-neutral-400 hover:text-yellow-200 hover:border-yellow-500/40'
                  }`}
                >
                  <div className="text-[10px] font-bold text-amber-300">{pkg.label}</div>
                  <div className="text-xs sm:text-sm font-black text-yellow-300 mt-0.5">
                    +{(pkg.amount / 1000).toFixed(0)}k
                  </div>
                  <div className="text-[9px] text-neutral-400 mt-0.5">{pkg.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* KHU VỰC 3: THANH TOÁN TRẢ NỢ (KHI CÓ NỢ) */}
          {profile.loans > 0 && (
            <div className="p-3.5 rounded-2xl bg-black/60 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-300">Thanh Toán Dư Nợ:</span>
                <span className="text-[11px] text-neutral-400">
                  Nợ còn: <strong className="text-red-400">{profile.loans.toLocaleString()} Xu</strong>
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleRepayDebt(0.5)}
                  className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-[11px] uppercase transition-colors border border-neutral-700 cursor-pointer"
                >
                  Trả 50%
                </button>
                <button
                  onClick={() => handleRepayDebt(1)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-800 to-amber-800 hover:from-red-700 hover:to-amber-700 text-yellow-200 font-black text-[11px] uppercase transition-all border border-yellow-500/30 cursor-pointer"
                >
                  Trả Toàn Bộ ({Math.min(profile.coins, profile.loans).toLocaleString()} Xu)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTION BUTTONS */}
        <div className="pt-3 border-t border-yellow-500/20 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="py-3 px-5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-neutral-700 whitespace-nowrap"
          >
            Đóng Ngân Hàng
          </button>

          <button
            onClick={handleBorrowLoan}
            className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-red-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-yellow-200"
          >
            <span>Xác Nhận Vay Nóng +{loanAmountToBorrow.toLocaleString()} Xu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
