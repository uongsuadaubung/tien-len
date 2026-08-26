import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { Sparkles, Gift, Flame, Frown, Disc } from 'lucide-react';
import { soundManager } from '../audio/sound-manager';
import { Modal, Card, Badge, Button } from '../primitives';
import { GameEventBus, WheelSpunEvent } from '../../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../../engine/evaluators/progress-evaluators';
import { ECONOMY_CONSTANTS } from '../../engine/constants/economy';

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
  isJackpot: boolean;
  isLoss: boolean;
}

const SLICES: WheelSlice[] = [
  {
    label: '100K JACKPOT',
    value: 100000,
    icon: '👑',
    gradient: ['#991b1b', '#450a0a'],
    textColor: '#ffffff',
    isJackpot: true,
    isLoss: false
  },
  {
    label: 'MẤT TRẮNG',
    value: 0,
    icon: '💨',
    gradient: ['#1e2942', '#151d30'],
    textColor: '#94a3b8',
    isJackpot: false,
    isLoss: true
  },
  {
    label: '30,000',
    value: 30000,
    icon: '💰',
    gradient: ['#103828', '#081c14'],
    textColor: '#e5b869',
    isJackpot: false,
    isLoss: false
  },
  {
    label: '2,000',
    value: 2000,
    icon: '🪙',
    gradient: ['#273554', '#151d30'],
    textColor: '#d4deec',
    isJackpot: false,
    isLoss: true
  },
  {
    label: '50K XU',
    value: 50000,
    icon: '💎',
    gradient: ['#3b1c54', '#1a0c26'],
    textColor: '#ffffff',
    isJackpot: false,
    isLoss: false
  },
  {
    label: 'TRƯỢT TAY',
    value: 0,
    icon: '❌',
    gradient: ['#3d141e', '#1f080e'],
    textColor: '#fca5a5',
    isJackpot: false,
    isLoss: true
  },
  {
    label: '20,000',
    value: 20000,
    icon: '🪙',
    gradient: ['#422c10', '#1c1105'],
    textColor: '#ffffff',
    isJackpot: false,
    isLoss: false
  },
  {
    label: '10,000 (HÒA)',
    value: 10000,
    icon: '🍀',
    gradient: ['#103833', '#071716'],
    textColor: '#4ade80',
    isJackpot: false,
    isLoss: false
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

  const SPIN_COST = ECONOMY_CONSTANTS.LUCKY_WHEEL_SPIN_COST;
  const canSpin = profile.coins >= SPIN_COST;

  const sliceAngle = 360 / SLICES.length; // 45 độ

  const renderSlicePath = (index: number) => {
    const startAngle = index * sliceAngle - sliceAngle / 2;
    const endAngle = startAngle + sliceAngle;
    const radius = 145;
    const center = 150;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const handleSpin = () => {
    if (isSpinning || !canSpin) return;

    soundManager.playCardDeal();
    setIsSpinning(true);
    setPrizeWon(null);

    const rand = Math.random() * 100;
    let winningIndex = 1;

    if (rand < 2) {
      winningIndex = 0; // 2% Jackpot 500K
    } else if (rand < 7) {
      winningIndex = 4; // 5% 250K
    } else if (rand < 15) {
      winningIndex = 2; // 8% 100K
    } else if (rand < 30) {
      winningIndex = 6; // 15% 50K
    } else if (rand < 55) {
      winningIndex = 7; // 25% 20K Hòa
    } else if (rand < 75) {
      winningIndex = 3; // 20% 5K
    } else if (rand < 88) {
      winningIndex = 5; // 13% Trượt Tay
    } else {
      winningIndex = 1; // 12% Mất Trắng
    }

    const wonSlice = SLICES[winningIndex];

    const currentMod = rotation % 360;
    const targetDeg = (360 - (winningIndex * sliceAngle)) % 360;
    const fullTurns = 360 * 7;
    const finalRotation = rotation - currentMod + fullTurns + targetDeg;

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setPrizeWon(wonSlice);

      if (wonSlice.value >= 50000) {
        soundManager.playVictory();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else if (wonSlice.value > 0) {
        soundManager.playCardSlap();
      }

      const wheelEvent: WheelSpunEvent = {
        type: 'WHEEL_SPUN',
        prizeValue: wonSlice.value
      };

      const updatedCoins = Math.max(0, profile.coins - SPIN_COST + wonSlice.value);

      const baseUpdated: PlayerProfile = {
        ...profile,
        coins: updatedCoins
      };

      const finalQuests = evaluateDailyQuests([wheelEvent], profile.dailyQuests, baseUpdated);
      const finalAchievements = evaluateAchievements([wheelEvent], profile.achievements, baseUpdated);

      const finalProfile: PlayerProfile = {
        ...baseUpdated,
        dailyQuests: finalQuests,
        achievements: finalAchievements
      };

      savePlayerProfile(finalProfile);
      onUpdateProfile(finalProfile);
      GameEventBus.getInstance().publish(wheelEvent);
    }, 4600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vòng Quay Thần Bài"
      subtitle={`Thử vận may Casino: Cơ hội nổ hũ lên tới ${ECONOMY_CONSTANTS.LUCKY_WHEEL_JACKPOT.toLocaleString()} Xu`}
      icon={<Disc className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="lg"
      height="h-[92vh] sm:h-[680px]"
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)]">
            Vé quay: <strong className="text-[var(--color-gold)]">{SPIN_COST.toLocaleString()} Xu</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="surface" size="md" onClick={onClose}>
              Đóng
            </Button>
            <Button
              variant="gold"
              size="md"
              disabled={isSpinning || !canSpin}
              onClick={handleSpin}
              leftIcon={<Sparkles className="w-4 h-4 text-[#0a0c0e]" />}
            >
              <span>{isSpinning ? 'Đang quay...' : canSpin ? `Quay (${SPIN_COST.toLocaleString()} Xu)` : 'Thiếu Xu'}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3">
        
        {/* KHUNG VÒNG QUAY */}
        <div className="relative w-68 h-68 sm:w-76 sm:h-76 my-2 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--color-gold-border)] shadow-lg pointer-events-none" />

          {/* KIM CHỈ THƯỞNG Ở ĐỈNH */}
          <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-[var(--color-gold)] border border-white flex items-center justify-center shadow-md">
              <div className="w-2 h-2 rounded-full bg-red-600" />
            </div>
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-[var(--color-gold)] -mt-1" />
          </div>

          {/* VÒNG TRÒN SVG XOAY */}
          <div
            className="w-[94%] h-[94%] rounded-full shadow-2xl overflow-hidden relative transition-transform duration-[4600ms] cubic-bezier(0.12, 0.88, 0.2, 1)"
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

              {SLICES.map((slice, idx) => {
                return (
                  <g key={idx}>
                    <path
                      d={renderSlicePath(idx)}
                      fill={`url(#slice-grad-${idx})`}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="1.5"
                    />

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
                      >
                        {slice.icon}
                      </text>
                      <text
                        x="150"
                        y="74"
                        textAnchor="middle"
                        fill={slice.textColor}
                        fontSize="9"
                        fontWeight="bold"
                        letterSpacing="0.4"
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
            className={`absolute z-20 w-14 h-14 rounded-full bg-[var(--color-gold)] border-2 border-white flex flex-col items-center justify-center transition-all shadow-lg ${
              !isSpinning && canSpin
                ? 'cursor-pointer hover:scale-105 active:scale-95'
                : 'cursor-not-allowed opacity-80'
            }`}
          >
            <Flame className="w-4 h-4 text-[#0a0c0e] fill-[#0a0c0e]" />
            <span className="text-[9px] font-black text-[#0a0c0e] uppercase tracking-tighter">
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
            {prizeWon.value > SPIN_COST ? (
              <>
                <Gift className="w-5 h-5 text-[var(--color-gold)]" />
                <span className="text-[var(--text-primary)]">Chúc mừng trúng lớn: <strong className="text-[var(--color-gold)]">+{prizeWon.value.toLocaleString()} Xu</strong>!</span>
              </>
            ) : prizeWon.value === SPIN_COST ? (
              <span className="text-[#4ade80]">🍀 Hòa vốn: Nhận lại {SPIN_COST.toLocaleString()} Xu!</span>
            ) : (
              <>
                <Frown className="w-5 h-5 text-[#f87171]" />
                <span className="text-[var(--text-secondary)]">{prizeWon.value === 0 ? `${prizeWon.label}: Rất tiếc, chúc bạn may mắn lần sau!` : `Lỗ ${(SPIN_COST - prizeWon.value).toLocaleString()} Xu (Nhận an ủi ${prizeWon.value.toLocaleString()} Xu)`}</span>
              </>
            )}
          </Card>
        )}
      </div>
    </Modal>
  );
};
