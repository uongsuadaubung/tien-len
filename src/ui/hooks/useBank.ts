import { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { ECONOMY_CONSTANTS } from '../../engine/constants/economy';
import { soundManager } from '../audio/sound-manager';
import confetti from 'canvas-confetti';

export interface UseBankParams {
  profile: PlayerProfile;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

export interface UseBankResult {
  loanAmountToBorrow: number;
  setLoanAmountToBorrow: (amount: number) => void;
  successMessage: string | null;
  errorMessage: string | null;
  canClaimRelief: boolean;
  maxReliefPerDay: number;
  reliefAmount: number;
  remainingReliefCount: number;
  reliefThreshold: number;
  loanPackages: readonly {
    amount: number;
    label: string;
    desc: string;
  }[];
  handleClaimRelief: () => void;
  handleBorrowLoan: () => void;
  handleRepayDebt: (portion: number) => void;
  clearMessages: () => void;
}

export function useBank({ profile, onUpdateProfile }: UseBankParams): UseBankResult {
  const [loanAmountToBorrow, setLoanAmountToBorrow] = useState<number>(
    ECONOMY_CONSTANTS.LOAN_PACKAGES[1].amount
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const MAX_RELIEF_PER_DAY = ECONOMY_CONSTANTS.MAX_DAILY_RELIEF_COUNT;
  const RELIEF_AMOUNT = ECONOMY_CONSTANTS.DAILY_RELIEF_AMOUNT;
  const RELIEF_THRESHOLD = ECONOMY_CONSTANTS.BANKRUPTCY_RELIEF_THRESHOLD;
  const canClaimRelief =
    profile.dailyReliefClaimedCount < MAX_RELIEF_PER_DAY &&
    profile.coins < RELIEF_THRESHOLD;
  const remainingReliefCount = Math.max(0, MAX_RELIEF_PER_DAY - profile.dailyReliefClaimedCount);

  const showNotification = (msg: string, isError: boolean = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage(null);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const clearMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
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

    soundManager.playVictory();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

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

    soundManager.playVictory();
    showNotification(`💸 Đã vay thành công +${loanAmountToBorrow.toLocaleString()} Xu từ Ngân Hàng!`);
  };

  const handleRepayDebt = (portion: number = 1) => {
    if (profile.loans <= 0) return;
    if (profile.coins <= 0) {
      showNotification('Bạn không có đủ Xu trong ví để trả nợ!', true);
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

    soundManager.playCardDeal();
    showNotification(`✅ Đã thanh toán thành công ${repayAmount.toLocaleString()} Xu nợ!`);
  };

  return {
    loanAmountToBorrow,
    setLoanAmountToBorrow,
    successMessage,
    errorMessage,
    canClaimRelief,
    maxReliefPerDay: MAX_RELIEF_PER_DAY,
    reliefAmount: RELIEF_AMOUNT,
    remainingReliefCount,
    reliefThreshold: RELIEF_THRESHOLD,
    loanPackages: ECONOMY_CONSTANTS.LOAN_PACKAGES,
    handleClaimRelief,
    handleBorrowLoan,
    handleRepayDebt,
    clearMessages
  };
}
