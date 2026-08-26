import React, { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { ECONOMY_CONSTANTS } from '../../engine/constants/economy';
import { Landmark, ShieldCheck, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { Modal, Card, Badge, Button } from '../primitives';

interface BankruptcyModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

const LOAN_PACKAGES = ECONOMY_CONSTANTS.LOAN_PACKAGES;

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const [loanAmountToBorrow, setLoanAmountToBorrow] = useState<number>(ECONOMY_CONSTANTS.LOAN_PACKAGES[1].amount);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const MAX_RELIEF_PER_DAY = ECONOMY_CONSTANTS.MAX_DAILY_RELIEF_COUNT;
  const RELIEF_AMOUNT = ECONOMY_CONSTANTS.DAILY_RELIEF_AMOUNT;
  const canClaimRelief = profile.dailyReliefClaimedCount < MAX_RELIEF_PER_DAY && profile.coins < ECONOMY_CONSTANTS.BANKRUPTCY_RELIEF_THRESHOLD;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ngân Hàng & Quỹ Cứu Trợ"
      subtitle="Vay vốn quay vòng hoặc nhận cứu trợ khi cạn kiệt Xu"
      icon={<Landmark className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="lg"
      height="h-[88vh] sm:h-[640px]"
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <Button variant="surface" size="md" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {/* Thông báo Thành công */}
      {successMessage && (
        <Card variant="card" className="p-3 border-emerald-500/50 text-xs font-bold text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </Card>
      )}

      {/* Tình Trạng Tài Chính */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card variant="card" className="p-3">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Số Dư Trong Ví</span>
          <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
            {profile.coins.toLocaleString()} 🪙
          </div>
        </Card>

        <Card variant="card" className="p-3">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Dư Nợ Hiện Tại</span>
          <div className="text-base font-bold text-[#f87171] mt-0.5">
            {profile.loans.toLocaleString()} 🪙
          </div>
        </Card>
      </div>

      {/* 1. Gói Cứu Trợ Miễn Phí */}
      <Card variant="card" className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-xs text-[var(--text-primary)]">Cứu Trợ Khẩn Cấp Miễn Phí</span>
          </div>
          <Badge variant="emerald" size="sm">
            {MAX_RELIEF_PER_DAY - profile.dailyReliefClaimedCount}/{MAX_RELIEF_PER_DAY} Lượt Hôm Nay
          </Badge>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          Nhận ngay <strong className="text-[var(--color-gold)] font-bold">{RELIEF_AMOUNT.toLocaleString()} Xu</strong> miễn phí không hoàn lại khi số dư dưới {ECONOMY_CONSTANTS.BANKRUPTCY_RELIEF_THRESHOLD.toLocaleString()} Xu.
        </p>
        <Button
          variant={canClaimRelief ? 'emerald' : 'surface'}
          size="md"
          fullWidth
          disabled={!canClaimRelief}
          onClick={handleClaimRelief}
          leftIcon={<ShieldCheck className="w-4 h-4" />}
        >
          {canClaimRelief ? `Nhận Cứu Trợ ${RELIEF_AMOUNT.toLocaleString()} Xu` : 'Chưa Đủ Điều Kiện Nhận'}
        </Button>
      </Card>

      {/* 2. Vay Vốn Ngân Hàng VIP */}
      <Card variant="card" className="p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-[var(--color-gold)]" />
          <span className="font-bold text-xs text-[var(--text-primary)]">Vay Vốn Ngân Hàng Casino</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {LOAN_PACKAGES.map(pkg => {
            const isSelected = loanAmountToBorrow === pkg.amount;
            return (
              <button
                key={pkg.amount}
                onClick={() => setLoanAmountToBorrow(pkg.amount)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] shadow-sm'
                    : 'bg-[var(--bg-container)] border-[var(--border-container)] hover:border-white/20 text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <div className="text-xs font-bold text-[var(--text-primary)]">+{pkg.amount.toLocaleString()} Xu</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{pkg.label} • {pkg.desc}</div>
              </button>
            );
          })}
        </div>

        <Button
          variant="gold"
          size="md"
          fullWidth
          onClick={handleBorrowLoan}
        >
          Vay Ngay +{loanAmountToBorrow.toLocaleString()} Xu
        </Button>
      </Card>

      {/* 3. Thanh Toán Trả Nợ */}
      {profile.loans > 0 && (
        <Card variant="card" className="p-3.5 space-y-2 border-[var(--color-ruby-border)]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[#f87171]">Thanh Toán Nợ Gốc</span>
            <span className="text-xs font-bold text-[#f87171]">Nợ: {profile.loans.toLocaleString()} Xu</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="surface"
              size="sm"
              className="flex-1"
              onClick={() => handleRepayDebt(0.5)}
            >
              Trả 50%
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={() => handleRepayDebt(1)}
            >
              Tất Toán 100%
            </Button>
          </div>
        </Card>
      )}
    </Modal>
  );
};
