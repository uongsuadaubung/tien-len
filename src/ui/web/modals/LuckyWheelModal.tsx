import React from 'react';
import { Sparkles, Gift, Flame, Frown, Disc } from 'lucide-react';
import { Modal, Card, Badge, Button } from '../../primitives';
import { useLuckyWheel } from '../../hooks/useLuckyWheel';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n } from '../../../locales';
import { 
  ECONOMY_CONSTANTS, 
  LUCKY_WHEEL_SLICES 
} from '../../../engine/constants/economy';

export interface LuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const {
    isSpinning,
    rotation,
    prizeWon,
    canSpin,
    spinCost,
    sliceAngle,
    renderSlicePath,
    handleSpin
  } = useLuckyWheel();

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('wheel.modalTitle')}
      subtitle={t('wheel.modalSubtitle', { amount: ECONOMY_CONSTANTS.LUCKY_WHEEL_JACKPOT })}
      icon={<Disc className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="xl"
      height="h-[94vh] sm:h-[720px]"
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)]">
            {t('wheel.ticketCost', { cost: spinCost })}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="surface" size="md" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button
              variant="gold"
              size="md"
              disabled={isSpinning || !canSpin}
              onClick={handleSpin}
              leftIcon={<Sparkles className="w-4 h-4 text-[#0a0c0e]" />}
            >
              <span>{isSpinning ? t('wheel.spinning') : canSpin ? t('wheel.spinBtn', { cost: spinCost }) : t('wheel.insufficientCoins')}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3.5 py-1">
        
        {/* KHUNG VÒNG QUAY DESKTOP */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[410px] md:h-[410px] my-1 flex items-center justify-center">
          {/* Viền hào quang vàng xung quanh */}
          <div className="absolute inset-0 rounded-full border-4 border-[var(--color-gold-border)] shadow-[0_0_25px_rgba(229,184,105,0.15)] pointer-events-none" />

          {/* KIM CHỈ THƯỞNG Ở ĐỈNH */}
          <div className="absolute -top-4 z-30 flex flex-col items-center pointer-events-none">
            <div className="w-6 h-6 rounded-full bg-[var(--color-gold)] border-2 border-white flex items-center justify-center shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-inner" />
            </div>
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[var(--color-gold)] -mt-1.5 filter drop-shadow-md" />
          </div>

          {/* VÒNG TRÒN SVG XOAY */}
          <div
            className="w-[95%] h-[95%] rounded-full shadow-2xl overflow-hidden relative transition-transform duration-[4600ms] cubic-bezier(0.12, 0.88, 0.2, 1)"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <svg viewBox="0 0 340 340" className="w-full h-full">
              <defs>
                {LUCKY_WHEEL_SLICES.map((s, idx) => (
                  <linearGradient
                    key={`grad-desk-${idx}`}
                    id={`slice-grad-desk-${idx}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={s.gradient[0]} />
                    <stop offset="100%" stopColor={s.gradient[1]} />
                  </linearGradient>
                ))}
              </defs>

              {LUCKY_WHEEL_SLICES.map((slice, idx) => {
                return (
                  <g key={idx}>
                    <path
                      d={renderSlicePath(idx)}
                      fill={`url(#slice-grad-desk-${idx})`}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                    />

                    <g
                      transform={`rotate(${idx * sliceAngle}, 170, 170)`}
                      className="select-none"
                    >
                      <text
                        x="170"
                        y="38"
                        textAnchor="middle"
                        fill={slice.textColor}
                        fontSize="17"
                        fontWeight="900"
                        className="font-sans"
                      >
                        {slice.icon}
                      </text>
                      <text
                        x="170"
                        y="58"
                        textAnchor="middle"
                        fill={slice.textColor}
                        fontSize="10.5"
                        fontWeight="900"
                        letterSpacing="0.3"
                      >
                        {slice.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* NÚT QUAY TÂM */}
          <div
            onClick={!isSpinning && canSpin ? handleSpin : undefined}
            className={`absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-[#ffd700] to-[var(--color-gold)] border-2 sm:border-3 border-white flex flex-col items-center justify-center transition-all shadow-2xl ${
              !isSpinning && canSpin
                ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(229,184,105,0.4)]'
                : 'cursor-not-allowed opacity-85'
            }`}
          >
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-[#0a0c0e] fill-[#0a0c0e]" />
            <span className="text-[10px] sm:text-[11px] font-black text-[#0a0c0e] uppercase tracking-tighter mt-0.5">
              {isSpinning ? '...' : 'QUAY'}
            </span>
          </div>
        </div>

        {/* THÔNG BÁO KẾT QUẢ */}
        {prizeWon && (
          <Card
            variant="card"
            className="w-full p-3 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm animate-fade-in border-[var(--color-gold-border)]"
          >
            {prizeWon.value > spinCost ? (
              <>
                <Gift className="w-5 h-5 text-[var(--color-gold)]" />
                <span className="text-[var(--text-primary)]">
                  {t('wheel.congratsPrefix')}: <strong className="text-[var(--color-gold)]">+{prizeWon.value.toLocaleString()} {t('common.coins')}</strong>!
                </span>
              </>
            ) : prizeWon.value === spinCost ? (
              <span className="text-[#4ade80]">🍀 {t('wheel.refundCoins', { amount: spinCost.toLocaleString() })}</span>
            ) : (
              <>
                <Frown className="w-5 h-5 text-[#f87171]" />
                <span className="text-[var(--text-secondary)]">
                  {prizeWon.value === 0
                    ? `${prizeWon.label}: ${t('wheel.betterLuckNextTime')}`
                    : t('wheel.receivedCoins', { amount: prizeWon.value.toLocaleString() })}
                </span>
              </>
            )}
          </Card>
        )}
      </div>
    </Modal>
  );
};
