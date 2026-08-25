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
    showNotification(`💸 Đã vay thành công +${loanAmountToBorrow.toLocaleString()} Xu từ Ngân Hàng VIP!`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 select-none">
      <div className="relative w-full max-w-lg bg-[#121724] rounded-2xl border border-[#d4af37]/40 shadow-2xl p-5 sm:p-6 text-white flex flex-col justify-between overflow-hidden max-h-[90vh]">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#aa8620] flex items-center justify-center text-[#0a0d14] shadow font-black">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#f3e5ab] uppercase tracking-wide">
              Ngân Hàng & Quỹ Cứu Trợ
            </h2>
            <p className="text-xs text-slate-400">Vay vốn quay vòng hoặc nhận cứu trợ khi cạn kiệt Xu</p>
          </div>
        </div>

        {/* Thông báo Thành công nếu có */}
        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1">
          {/* Tình Trạng Tài Chính Hiện Tại */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#0a0d14] border border-white/5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Số Dư Trong Ví</span>
              <div className="text-base font-black text-[#f3e5ab] mt-0.5">
                {profile.coins.toLocaleString()} 🪙
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Tổng Dư Nợ Hiện Tại</span>
              <div className="text-base font-black text-red-400 mt-0.5">
                {profile.loans.toLocaleString()} 🪙
              </div>
            </div>
          </div>

          {/* 1. Gói Cứu Trợ Miễn Phí Mỗi Ngày */}
          <div className="p-3.5 rounded-xl bg-[#182030] border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-xs text-emerald-300">Cứu Trợ Khẩn Cấp Miễn Phí</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
                {MAX_RELIEF_PER_DAY - profile.dailyReliefClaimedCount}/{MAX_RELIEF_PER_DAY} lượt hôm nay
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Nhận ngay <strong className="text-[#f3e5ab] font-bold">100.000 Xu</strong> miễn phí không hoàn lại khi số dư dưới 100k Xu.
            </p>
            <button
              onClick={handleClaimRelief}
              disabled={!canClaimRelief}
              className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                canClaimRelief
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                  : 'bg-[#0a0d14] text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{canClaimRelief ? 'Nhận Cứu Trợ 100,000 Xu' : 'Chưa Đủ Điều Kiện Nhận'}</span>
            </button>
          </div>

          {/* 2. Vay Vốn Ngân Hàng VIP */}
          <div className="p-3.5 rounded-xl bg-[#182030] border border-[#d4af37]/30 space-y-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#d4af37]" />
              <span className="font-bold text-xs text-[#f3e5ab]">Vay Vốn Ngân Hàng Casino</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {LOAN_PACKAGES.map(pkg => (
                <button
                  key={pkg.amount}
                  onClick={() => setLoanAmountToBorrow(pkg.amount)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    loanAmountToBorrow === pkg.amount
                      ? 'bg-[#d4af37]/20 border-[#d4af37] text-white'
                      : 'bg-[#0a0d14] border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-black text-[#f3e5ab]">+{pkg.amount.toLocaleString()} Xu</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{pkg.label} • {pkg.desc}</div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBorrowLoan}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa8620] hover:from-[#f3e5ab] hover:to-[#d4af37] text-[#0a0d14] font-black text-xs uppercase tracking-wider shadow cursor-pointer transition-all"
            >
              Vay Ngay +{loanAmountToBorrow.toLocaleString()} Xu
            </button>
          </div>

          {/* 3. Thanh Toán Trả Nợ */}
          {profile.loans > 0 && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-red-300">Thanh Toán Nợ Gốc</span>
                <span className="text-xs font-black text-red-400">Nợ: {profile.loans.toLocaleString()} Xu</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRepayDebt(0.5)}
                  className="flex-1 py-1.5 rounded-lg bg-[#182030] hover:bg-[#222c42] border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Trả 50%
                </button>
                <button
                  onClick={() => handleRepayDebt(1)}
                  className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow cursor-pointer"
                >
                  Tất Toán 100%
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-300 text-xs font-bold border border-white/10 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
