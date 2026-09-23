import React from 'react';
import { Landmark, ShieldCheck, HeartHandshake, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal, Card, Badge, Button } from '../../primitives';
import { useBank } from '../../hooks/useBank';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n } from '../../../locales';

export interface BankruptcyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const {
    loanAmountToBorrow,
    setLoanAmountToBorrow,
    selectedPackage,
    successMessage,
    errorMessage,
    canClaimRelief,
    maxReliefPerDay,
    reliefAmount,
    remainingReliefCount,
    reliefThreshold,
    loanPackages,
    activeLoan,
    isLoanOverdue,
    hasActiveDebt,
    handleClaimRelief,
    handleBorrowLoan,
    handleRepayDebt
  } = useBank();

  if (!isOpen) return null;

  const upfrontFee = Math.round(selectedPackage.amount * ((selectedPackage.upfrontFeePercent || 10) / 100));
  const netReceived = selectedPackage.amount - upfrontFee;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('bankruptcy.title')}
      subtitle={t('bankruptcy.message')}
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
          {t('common.close')}
        </Button>
      }
    >
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

        <Card variant="card" className={`p-3 ${hasActiveDebt ? 'border-rose-500/40' : ''}`}>
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">{t('bank.currentDebt')}</span>
          <div className="text-base font-bold text-[#f87171] mt-0.5">
            {profile.loans.toLocaleString()} 🪙
          </div>
        </Card>
      </div>

      {/* BẢNG HỢP ĐỒNG KHẾ ƯỚC NỢ ĐANG CÓ HIỆU LỰC */}
      {hasActiveDebt && activeLoan && (
        <Card variant="card" className={`p-3.5 space-y-2.5 border-2 ${isLoanOverdue ? 'border-rose-500 bg-rose-950/20' : 'border-amber-500/50 bg-amber-950/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[var(--color-gold)]" />
              <span className="font-bold text-xs text-[var(--text-primary)]">{t('bank.activeLoanTitle')}</span>
            </div>
            <Badge variant={isLoanOverdue ? 'danger' : 'emerald'} size="sm">
              {isLoanOverdue ? t('bank.loanStatusOverdue') : t('bank.loanStatusNormal')}
            </Badge>
          </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div className="text-[10px] text-[var(--text-muted)] font-medium">{t('bank.loanProgressHeader')}</div>
                <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                  {t('bank.loanProgress', { current: activeLoan.matchesPlayed, max: activeLoan.graceMatches })}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div className="text-[10px] text-[var(--text-muted)] font-medium">{t('bank.loanInterestHeader')}</div>
                <div className="text-xs font-bold text-amber-400 mt-0.5">
                  +{activeLoan.interestPerMatchPercent}%
                </div>
              </div>

              <div className="p-2 rounded-lg bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div className="text-[10px] text-[var(--text-muted)] font-medium">{t('bank.loanGarnishHeader')}</div>
                <div className="text-xs font-bold text-rose-400 mt-0.5">
                  {isLoanOverdue ? activeLoan.overdueDeductionPercent : activeLoan.winDeductionPercent}%
                </div>
              </div>
            </div>

          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t('bank.loanFloorProtected')}</span>
          </div>
        </Card>
      )}

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

      {/* 2. Vay Vốn Ngân Hàng */}
      <Card variant="card" className="p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[var(--color-gold)]" />
            <span className="font-bold text-xs text-[var(--text-primary)]">{t('bank.loanTitle')}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">{t('bank.loanSubtitleNote')}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {loanPackages.map(pkg => {
            const isSelected = loanAmountToBorrow === pkg.amount;
            const pkgNet = pkg.amount * (1 - (pkg.upfrontFeePercent || 10) / 100);
            return (
              <button
                key={pkg.amount}
                disabled={hasActiveDebt}
                onClick={() => setLoanAmountToBorrow(pkg.amount)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  hasActiveDebt
                    ? 'opacity-50 cursor-not-allowed bg-[var(--bg-container)] border-[var(--border-container)]'
                    : isSelected
                    ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] shadow-sm cursor-pointer'
                    : 'bg-[var(--bg-container)] border-[var(--border-container)] hover:border-white/20 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer'
                }`}
              >
                <div className="text-xs font-bold text-[var(--text-primary)]">+{pkg.amount.toLocaleString()} Xu</div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">{t('bank.loanReceiveNet', { amount: pkgNet.toLocaleString() })}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('bank.loanPackageSub', { label: pkg.label, matches: pkg.graceMatches, rate: pkg.interestPerMatchPercent })}</div>
              </button>
            );
          })}
        </div>

        <Button
          variant={hasActiveDebt ? 'surface' : 'gold'}
          size="md"
          fullWidth
          disabled={hasActiveDebt}
          onClick={handleBorrowLoan}
        >
          {hasActiveDebt 
            ? t('bank.borrowLockedInDebt') 
            : t('bank.borrowBtnWithNet', { amount: selectedPackage.amount.toLocaleString(), received: netReceived.toLocaleString() })}
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
    </Modal>
  );
};
