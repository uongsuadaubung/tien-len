import React from 'react';
import { PlayerProfile } from '../../../engine/storage';
import { Sparkles, Gift, Flame, Frown, Disc, Trophy, ArrowLeft } from 'lucide-react';
import { Card } from '../../primitives';
import { useLuckyWheel } from '../../hooks/useLuckyWheel';
import { 
  ECONOMY_CONSTANTS, 
  LUCKY_WHEEL_SLICES 
} from '../../../engine/constants/economy';

export interface MobileLuckyWheelViewProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

export const MobileLuckyWheelView: React.FC<MobileLuckyWheelViewProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const {
    isSpinning,
    rotation,
    prizeWon,
    canSpin,
    spinCost,
    sliceAngle,
    renderSlicePath,
    handleSpin
  } = useLuckyWheel(profile, onUpdateProfile);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[var(--bg-canvas)] text-[var(--text-primary)] w-full h-full h-[100dvh] overflow-hidden select-none animate-in fade-in duration-200">
      
      {/* 1. TOP APP BAR NATIVE (CHỈ CÓ NÚT QUAY LẠI, KHÔNG CÓ NÚT X) */}
      <header className="shrink-0 w-full bg-[var(--bg-container)]/98 backdrop-blur-md border-b border-[var(--border-container)] px-3 py-2.5 flex items-center justify-between shadow-md z-20">
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] text-xs font-bold text-[var(--color-gold)] active:scale-95 transition-transform"
          title="Quay lại"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay Lại</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Disc className="w-4 h-4 text-[var(--color-gold)]" />
          <h2 className="text-xs sm:text-sm font-black uppercase text-[var(--text-primary)] tracking-wide">
            Vòng Quay Thần Bài
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-card)] px-2.5 py-1 rounded-xl">
          <span className="text-xs">🪙</span>
          <span className="font-bold text-xs text-[var(--color-gold)] font-mono">
            {profile.coins > 1000000 
              ? `${(profile.coins / 1000000).toFixed(1)}M` 
              : profile.coins > 1000 
              ? `${(profile.coins / 1000).toFixed(0)}k` 
              : profile.coins}
          </span>
        </div>
      </header>

      {/* 2. BODY NỘI DUNG VÒNG QUAY - TỰ ĐỘNG CÂN BẰNG TOÀN MÀN HÌNH KHÔNG SCROLL */}
      <main className="flex-1 flex flex-col items-center justify-between px-4 py-3 overflow-hidden min-h-0 w-full max-w-sm mx-auto safe-area-bottom">
        
        {/* Banner Nổ Hũ Jackpot Compact */}
        <div className="shrink-0 w-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/40 rounded-2xl px-3 py-2 text-center shadow-md animate-pulse">
          <div className="flex items-center justify-center gap-1.5 text-[var(--color-gold)] font-black text-xs uppercase tracking-wider">
            <Trophy className="w-4 h-4" />
            <span>NỔ HŨ JACKPOT: {ECONOMY_CONSTANTS.LUCKY_WHEEL_JACKPOT.toLocaleString()} XU</span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Chạm tâm vòng quay để quay: <strong className="text-[var(--color-gold)] font-bold">{spinCost.toLocaleString()} Xu / lượt</strong>
          </p>
        </div>

        {/* KHUNG VÒNG QUAY ROULETTE (TÂM QUAY LÀ NÚT BẤM CHÍNH) */}
        <div className="shrink-0 relative w-[clamp(240px,44dvh,320px)] h-[clamp(240px,44dvh,320px)] max-w-[85vw] max-h-[85vw] my-auto flex items-center justify-center">
          {/* Viền hào quang vàng */}
          <div className="absolute inset-0 rounded-full border-4 border-[var(--color-gold-border)] shadow-[0_0_25px_rgba(229,184,105,0.3)] pointer-events-none" />

          {/* KIM CHỈ THƯỞNG Ở ĐỈNH */}
          <div className="absolute -top-4 z-30 flex flex-col items-center pointer-events-none">
            <div className="w-6 h-6 rounded-full bg-[var(--color-gold)] border-2 border-white flex items-center justify-center shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-inner" />
            </div>
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-[var(--color-gold)] -mt-1 filter drop-shadow-md" />
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
                    key={`grad-wheel-compact-${idx}`}
                    id={`slice-grad-wheel-compact-${idx}`}
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
                      fill={`url(#slice-grad-wheel-compact-${idx})`}
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

          {/* NÚT QUAY TÂM - NÚT BẤM CHÍNH SANG TRỌNG RỰC RỠ */}
          <button
            type="button"
            disabled={isSpinning || !canSpin}
            onClick={!isSpinning && canSpin ? handleSpin : undefined}
            className={`absolute z-20 w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-b from-[#ffe066] via-[#ffd700] to-[#e5a823] border-3 border-white flex flex-col items-center justify-center transition-all shadow-2xl ${
              !isSpinning && canSpin
                ? 'cursor-pointer active:scale-90 hover:scale-105 shadow-[0_0_20px_rgba(229,184,105,0.6)] animate-pulse'
                : 'opacity-85 cursor-not-allowed'
            }`}
            title="Chạm để quay thưởng"
          >
            <Flame className="w-5 h-5 text-[#0a0c0e] fill-[#0a0c0e]" />
            <span className="text-[10px] font-black text-[#0a0c0e] uppercase tracking-tighter leading-none mt-0.5">
              {isSpinning ? '...' : 'QUAY'}
            </span>
            <span className="text-[8px] font-bold text-[#0a0c0e]/80 leading-none">
              10k Xu
            </span>
          </button>
        </div>

        {/* THÔNG BÁO KẾT QUẢ COMPACT */}
        <div className="shrink-0 w-full min-h-[44px] flex items-center justify-center pb-2">
          {prizeWon ? (
            <Card
              variant="card"
              className="w-full p-2.5 flex items-center justify-center gap-1.5 font-bold text-xs animate-fade-in border-[var(--color-gold-border)]"
            >
              {prizeWon.value > spinCost ? (
                <>
                  <Gift className="w-4 h-4 text-[var(--color-gold)]" />
                  <span className="text-[var(--text-primary)]">
                    Chúc mừng: <strong className="text-[var(--color-gold)]">+{prizeWon.value.toLocaleString()} Xu</strong>!
                  </span>
                </>
              ) : prizeWon.value === spinCost ? (
                <span className="text-[#4ade80]">🍀 Nhận lại {spinCost.toLocaleString()} Xu!</span>
              ) : (
                <>
                  <Frown className="w-4 h-4 text-[#f87171]" />
                  <span className="text-[var(--text-secondary)]">
                    {prizeWon.value === 0
                      ? `${prizeWon.label}: Rất tiếc, chúc may mắn!`
                      : `Nhận ${prizeWon.value.toLocaleString()} Xu`}
                  </span>
                </>
              )}
            </Card>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] italic text-center">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-gold)]" />
              <span>Chạm nút vàng <strong>QUAY</strong> ở tâm vòng tròn để bắt đầu</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
