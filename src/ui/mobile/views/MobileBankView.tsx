import React from 'react';
import { Landmark, ShieldCheck, HeartHandshake, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, Badge, Button } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { useBank } from '../../hooks/useBank';
import { useUserStore } from '../../../stores/useUserStore';

export interface MobileBankViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileBankView: React.FC<MobileBankViewProps> = ({
  isOpen,
  onClose
}) => {
  const { profile } = useUserStore();
  const {
    loanAmountToBorrow,
    setLoanAmountToBorrow,
    successMessage,
    errorMessage,
    canClaimRelief,
    maxReliefPerDay,
    reliefAmount,
    remainingReliefCount,
    reliefThreshold,
    loanPackages,
    handleClaimRelief,
    handleBorrowLoan,
    handleRepayDebt
  } = useBank();

  if (!isOpen) return null;

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Ngân Hàng & Quỹ Cứu Trợ"
      subtitle="Vay vốn quay vòng hoặc nhận cứu trợ khi cạn kiệt Xu"
      icon={<Landmark className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
      footer={null}
      className={null}
    >
      <div className="space-y-4 pb-6 select-none">
        {/* Thông báo Thành công / Thất bại */}
        {successMessage && (
          <Card variant="card" className="p-3 border-emerald-500/50 text-xs font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </Card>
        )}

        {errorMessage && (
          <Card variant="card" className="p-3 border-rose-500/50 text-xs font-bold text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
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
              {remainingReliefCount}/{maxReliefPerDay} Lượt Hôm Nay
            </Badge>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Nhận ngay <strong className="text-[var(--color-gold)] font-bold">{reliefAmount.toLocaleString()} Xu</strong> miễn phí không hoàn lại khi số dư dưới {reliefThreshold.toLocaleString()} Xu.
          </p>
          <Button
            variant={canClaimRelief ? 'emerald' : 'surface'}
            size="md"
            fullWidth
            disabled={!canClaimRelief}
            onClick={handleClaimRelief}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            {canClaimRelief ? `Nhận Cứu Trợ ${reliefAmount.toLocaleString()} Xu` : 'Chưa Đủ Điều Kiện Nhận'}
          </Button>
        </Card>

        {/* 2. Vay Vốn Ngân Hàng Casino */}
        <Card variant="card" className="p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[var(--color-gold)]" />
            <span className="font-bold text-xs text-[var(--text-primary)]">Vay Vốn Ngân Hàng Casino</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {loanPackages.map(pkg => {
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
      </div>
    </MobileScreenWrapper>
  );
};
