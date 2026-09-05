import React from 'react';
import { Landmark, ShieldCheck, HeartHandshake, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, Badge, Button } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { useBank } from '../../hooks/useBank';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n } from '../../../locales';

export interface MobileBankViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileBankView: React.FC<MobileBankViewProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useI18n();
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
      title={t('bank.title')}
      subtitle={t('bank.subtitle')}
      icon={<Landmark className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
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
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">{t('bank.walletBalance')}</span>
            <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
              {profile.coins.toLocaleString()} 🪙
            </div>
          </Card>

          <Card variant="card" className="p-3">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">{t('bank.currentDebt')}</span>
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
              <span className="font-bold text-xs text-[var(--text-primary)]">{t('bank.emergencyRelief')}</span>
            </div>
            <Badge variant="emerald" size="sm">
              {t('bank.dailyClaimsRemaining', { remaining: remainingReliefCount, max: maxReliefPerDay })}
            </Badge>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            {t('bank.reliefDescription', { amount: reliefAmount, threshold: reliefThreshold })}
          </p>
          <Button
            variant={canClaimRelief ? 'emerald' : 'surface'}
            size="md"
            fullWidth
            disabled={!canClaimRelief}
            onClick={handleClaimRelief}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            {canClaimRelief ? t('bank.claimReliefBtn', { amount: reliefAmount }) : t('bank.notEligibleRelief')}
          </Button>
        </Card>

        {/* 2. Vay Vốn Ngân Hàng Casino */}
        <Card variant="card" className="p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[var(--color-gold)]" />
            <span className="font-bold text-xs text-[var(--text-primary)]">{t('bank.loanTitle')}</span>
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
            {t('bank.borrowNow', { amount: loanAmountToBorrow })}
          </Button>
        </Card>

        {/* 3. Thanh Toán Trả Nợ */}
        {profile.loans > 0 && (
          <Card variant="card" className="p-3.5 space-y-2 border-[var(--color-ruby-border)]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#f87171]">{t('bank.repayTitle')}</span>
              <span className="text-xs font-bold text-[#f87171]">{t('bank.debtLabel', { amount: profile.loans })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="surface"
                size="sm"
                className="flex-1"
                onClick={() => handleRepayDebt(0.5)}
              >
                {t('bank.repay50')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => handleRepayDebt(1)}
              >
                {t('bank.repay100')}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </MobileScreenWrapper>
  );
};
