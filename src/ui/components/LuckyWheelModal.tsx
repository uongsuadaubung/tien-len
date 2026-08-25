import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { X, Sparkles, Gift, Flame, AlertCircle, Frown } from 'lucide-react';
import { soundManager } from '../audio/sound-manager';

interface LuckyWheelModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

interface WheelSlice {
  label: string;
  value: number;
  icon: string;
  gradient: [string, string];
  textColor: string;
  isJackpot?: boolean;
  isLoss?: boolean;
}

const SLICES: WheelSlice[] = [
  {
    label: '500K JACKPOT',
    value: 500000,
    icon: '👑',
    gradient: ['#dc2626', '#7f1d1d'],
    textColor: '#fef08a',
    isJackpot: true
  },
  {
    label: 'MẤT TRẮNG',
    value: 0,
    icon: '💨',
    gradient: ['#374151', '#111827'],
    textColor: '#9ca3af',
    isLoss: true
  },
  {
    label: '100,000',
    value: 100000,
    icon: '💰',
    gradient: ['#059669', '#064e3b'],
    textColor: '#fef08a'
  },
  {
    label: '5,000',
    value: 5000,
    icon: '🪙',
    gradient: ['#4b5563', '#1f2937'],
    textColor: '#e2e8f0',
    isLoss: true
  },
  {
    label: '250K XU',
    value: 250000,
    icon: '💎',
    gradient: ['#7c3aed', '#4c1d95'],
    textColor: '#fef08a'
  },
  {
    label: 'TRƯỢT TAY',
    value: 0,
    icon: '❌',
    gradient: ['#881337', '#4c0519'],
    textColor: '#fda4af',
    isLoss: true
  },
  {
    label: '50,000',
    value: 50000,
    icon: '🪙',
    gradient: ['#d97706', '#78350f'],
    textColor: '#ffffff'
  },
  {
    label: '20,000 (HÒA)',
    value: 20000,
    icon: '🍀',
    gradient: ['#0d9488', '#134e4a'],
    textColor: '#ffffff'
  }
];

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [prizeWon, setPrizeWon] = useState<WheelSlice | null>(null);

  if (!isOpen) return null;

  const SPIN_COST = 20000;
  const canSpin = profile.coins >= SPIN_COST;
  const numSlices = SLICES.length;
  const sliceAngle = 360 / numSlices; // 45 deg

  // Tính tọa độ hình nón cho từng slice trong SVG (R = 140, Center = 150, 150)
  // Đỉnh của slice 0 căn chính xác ở góc 12h (90 độ ngược chiều kim đồng hồ từ trục X)
  const renderSlicePath = (index: number) => {
    const startAngle = (index * sliceAngle - 90 - sliceAngle / 2) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90 - sliceAngle / 2) * (Math.PI / 180);
    const r = 140;
    const cx = 150;
    const cy = 150;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };

  const handleSpin = () => {
    if (isSpinning || !canSpin) return;

    setIsSpinning(true);
    setPrizeWon(null);
    soundManager.playShuffle();

    // Thuật toán phân bố xác suất chuẩn Casino Sòng Bạc:
    // 1. Mất trắng (0 xu) slice 1 & slice 5: 35%
    // 2. An ủi 1,000 xu (Lỗ 4k) slice 3: 25%
    // 3. Hoàn vốn 5,000 xu (Hòa) slice 7: 18%
    // 4. Thưởng 10,000 xu (Lời 5k) slice 6: 12%
    // 5. Thưởng 20,000 xu (Lời 15k) slice 2: 6%
    // 6. Thưởng 50,000 xu (Lời 45k) slice 4: 3%
    // 7. JACKPOT 100,000 xu slice 0: 1%
    const rand = Math.random() * 100;
    let targetIndex = 1;

    if (rand < 1.0) {
      targetIndex = 0; // 100K Jackpot (1%)
    } else if (rand < 4.0) {
      targetIndex = 4; // 50K Xu (3%)
    } else if (rand < 10.0) {
      targetIndex = 2; // 20K Xu (6%)
    } else if (rand < 22.0) {
      targetIndex = 6; // 10K Xu (12%)
    } else if (rand < 40.0) {
      targetIndex = 7; // 5K Xu Hòa Vốn (18%)
    } else if (rand < 65.0) {
      targetIndex = 3; // 1K Xu An Ủi (25%)
    } else if (rand < 82.0) {
      targetIndex = 1; // Mất Trắng 0 Xu (17%)
    } else {
      targetIndex = 5; // Trượt Tay 0 Xu (18%)
    }

    const selectedSlice = SLICES[targetIndex];

    // Tính toán góc quay chính xác 100% về vị trí kim chỉ ở đỉnh (12h)
    // Slice `targetIndex` bắt đầu ở góc `targetIndex * 45°` tính từ đỉnh.
    // Khi bánh xe quay theo chiều kim đồng hồ (Clockwise), để slice này rơi trúng kim ở đỉnh,
    // góc xoay đích thỏa mãn: (targetIndex * 45 + R) % 360 = 0 => R % 360 = (360 - targetIndex * 45) % 360.
    const fullTurns = 6 * 360; // 6 vòng quay
    const targetLandingAngle = (360 - (targetIndex * sliceAngle)) % 360;
    const currentMod = rotation % 360;
    let forwardDistance = targetLandingAngle - currentMod;
    if (forwardDistance <= 0) {
      forwardDistance += 360;
    }
    const targetRotation = rotation + fullTurns + forwardDistance;

    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setPrizeWon(selectedSlice);

      if (selectedSlice.value >= 10000) {
        soundManager.playVictory();
        // Hiệu ứng pháo hoa khi thắng lớn
        confetti({
          particleCount: selectedSlice.isJackpot ? 150 : 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f9b208', '#c01e2e', '#ffdf00', '#22c55e', '#ffffff']
        });
      } else if (selectedSlice.value === 0) {
        soundManager.playPass();
      }

      // Cập nhật số dư tài sản
      const updated: PlayerProfile = {
        ...profile,
        coins: Math.max(0, profile.coins - SPIN_COST + selectedSlice.value),
        stats: {
          ...profile.stats,
          totalEarned: selectedSlice.value > 0 ? profile.stats.totalEarned + selectedSlice.value : profile.stats.totalEarned
        }
      };

      savePlayerProfile(updated);
      onUpdateProfile(updated);
    }, 4600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 select-none">
      <div className="relative w-full max-w-lg bg-[#121724] rounded-2xl border border-[#d4af37]/40 shadow-2xl p-5 sm:p-7 text-white flex flex-col items-center justify-between overflow-hidden">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-400 hover:text-white transition-all border border-white/10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề VIP */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2 bg-[#182030] px-4 py-1 rounded-full border border-[#d4af37]/40 mb-1 shadow-inner">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span className="text-xs font-black text-[#f3e5ab] uppercase tracking-widest">
              CASINO HIGH RISK & REWARD
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#f3e5ab] uppercase tracking-wider drop-shadow-md">
            Vòng Quay Thần Bài
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Cân nhắc rủi ro: Có thể Mất Trắng hoặc Nổ Hũ 500,000 Xu</p>
        </div>

        {/* KHUNG VÒNG QUAY 3D CASINO CÓ ĐÈN LED CHỚP NHÁY */}
        <div className="relative w-72 h-72 sm:w-84 sm:h-84 my-3 flex items-center justify-center">
          {/* Vành đèn Neon bao quanh */}
          <div className="absolute inset-0 rounded-full border-4 border-yellow-500/60 shadow-[0_0_30px_rgba(234,179,8,0.4)] pointer-events-none" />

          {/* Các bóng đèn LED viền tròn */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 360) / 16;
              const isEven = i % 2 === 0;
              return (
                <div
                  key={i}
                  className="absolute w-full h-full flex justify-center"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-0.5 shadow-md ${
                      isEven
                        ? 'bg-yellow-300 shadow-yellow-300 animate-pulse'
                        : 'bg-red-500 shadow-red-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* KIM CHỈ THƯỞNG 3D Ở ĐỈNH (POINTER CỐ ĐỊNH TẠI 12 GIỜ) */}
          <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 border border-yellow-100 flex items-center justify-center shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            </div>
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-red-600 -mt-1" />
          </div>

          {/* VÒNG TRÒN SVG XOAY CHUYÊN NGHIỆP */}
          <div
            className="w-[92%] h-[92%] rounded-full shadow-2xl overflow-hidden relative transition-transform duration-[4600ms] cubic-bezier(0.12, 0.88, 0.2, 1)"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full">
              <defs>
                {SLICES.map((s, idx) => (
                  <linearGradient
                    key={`grad-${idx}`}
                    id={`slice-grad-${idx}`}
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

              {/* Vẽ từng miếng bánh và xoay nhãn hướng tâm hoàn hảo */}
              {SLICES.map((slice, idx) => {
                return (
                  <g key={idx}>
                    <path
                      d={renderSlicePath(idx)}
                      fill={`url(#slice-grad-${idx})`}
                      stroke="#fef08a"
                      strokeWidth="1.5"
                    />

                    {/* Nhãn và Icon giải thưởng được xoay chuẩn tâm */}
                    <g
                      transform={`rotate(${idx * sliceAngle}, 150, 150)`}
                      className="select-none"
                    >
                      <text
                        x="150"
                        y="56"
                        textAnchor="middle"
                        fill={slice.textColor}
                        fontSize="14"
                        fontWeight="900"
                        className="font-sans"
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                      >
                        {slice.icon}
                      </text>
                      <text
                        x="150"
                        y="74"
                        textAnchor="middle"
                        fill={slice.textColor}
                        fontSize="9"
                        fontWeight="900"
                        letterSpacing="0.4"
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                      >
                        {slice.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* TRỤC TÂM KIM LOẠI VÀ NÚT QUAY */}
          <div
            onClick={!isSpinning && canSpin ? handleSpin : undefined}
            className={`absolute z-20 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 via-amber-500 to-yellow-700 border-4 border-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.6)] flex flex-col items-center justify-center transition-all ${
              !isSpinning && canSpin
                ? 'cursor-pointer hover:scale-110 active:scale-95'
                : 'cursor-not-allowed opacity-90'
            }`}
          >
            <Flame className="w-5 h-5 text-red-950 fill-red-950 animate-bounce" />
            <span className="text-[10px] font-black text-red-950 uppercase tracking-tighter -mt-0.5">
              {isSpinning ? '...' : 'QUAY'}
            </span>
          </div>
        </div>

        {/* THÔNG BÁO KHI TRÚNG THƯỞNG HOẶC MẤT TRẮNG */}
        {prizeWon ? (
          <div className={`w-full my-2 p-3 rounded-2xl flex items-center justify-center gap-2 font-black text-sm animate-bounce shadow-xl border ${
            prizeWon.value >= 10000
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-red-950 border-yellow-200'
              : prizeWon.value === 5000
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
              : 'bg-red-950/90 text-red-300 border-red-500/50'
          }`}>
            {prizeWon.value > SPIN_COST ? (
              <>
                <Gift className="w-5 h-5" />
                <span>CHÚC MỪNG TRÚNG LỚN: <strong>+{prizeWon.value.toLocaleString()} XU</strong>!</span>
              </>
            ) : prizeWon.value === SPIN_COST ? (
              <>
                <span>🍀 HÒA VỐN: Nhận lại {SPIN_COST.toLocaleString()} Xu!</span>
              </>
            ) : (
              <>
                <Frown className="w-5 h-5 text-red-400" />
                <span>{prizeWon.value === 0 ? `${prizeWon.label}: Rất tiếc, chúc bạn may mắn lần sau!` : `LỖ ${(SPIN_COST - prizeWon.value).toLocaleString()} XU: Nhận an ủi ${prizeWon.value.toLocaleString()} Xu`}</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-neutral-400 my-1">
            <span>Vé quay: </span>
            <strong className="text-yellow-300 font-black">{SPIN_COST.toLocaleString()} Xu</strong>
            <span>•</span>
            <span>Tài sản: <strong className="text-yellow-300">{profile.coins.toLocaleString()} Xu</strong></span>
          </div>
        )}

        {/* NÚT BẮT ĐẦU QUAY SỐ LỚN */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || !canSpin}
          className={`w-full mt-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 ${
            isSpinning
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
              : canSpin
              ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-yellow-100 hover:scale-105 cursor-pointer border border-yellow-300/50 shadow-yellow-500/30'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isSpinning ? 'Đang quay thưởng...' : canSpin ? `Quay Số (${SPIN_COST.toLocaleString()} Xu)` : 'Không Đủ Tiền Quay'}</span>
        </button>
      </div>
    </div>
  );
};
