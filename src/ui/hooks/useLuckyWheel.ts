import { useState } from 'react';
import confetti from 'canvas-confetti';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { soundManager } from '../audio/sound-manager';
import { GameEventBus, WheelSpunEvent } from '../../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../../engine/evaluators/progress-evaluators';
import { 
  ECONOMY_CONSTANTS, 
  LUCKY_WHEEL_SLICES, 
  LuckyWheelSliceConfig, 
  determineWinningWheelSliceIndex 
} from '../../engine/constants/economy';

export interface UseLuckyWheelReturn {
  isSpinning: boolean;
  rotation: number;
  prizeWon: LuckyWheelSliceConfig | null;
  canSpin: boolean;
  spinCost: number;
  sliceAngle: number;
  renderSlicePath: (index: number) => string;
  handleSpin: () => void;
}

export function useLuckyWheel(
  profile: PlayerProfile,
  onUpdateProfile: (updated: PlayerProfile) => void
): UseLuckyWheelReturn {
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [prizeWon, setPrizeWon] = useState<LuckyWheelSliceConfig | null>(null);

  const spinCost = ECONOMY_CONSTANTS.LUCKY_WHEEL_SPIN_COST;
  const canSpin = profile.coins >= spinCost;
  const sliceAngle = 360 / LUCKY_WHEEL_SLICES.length; // 45 độ

  const renderSlicePath = (index: number): string => {
    const startAngle = index * sliceAngle - sliceAngle / 2;
    const endAngle = startAngle + sliceAngle;
    const radius = 165;
    const center = 170;

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
    const winningIndex = determineWinningWheelSliceIndex(rand);
    const wonSlice = LUCKY_WHEEL_SLICES[winningIndex];

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
          particleCount: 140,
          spread: 90,
          origin: { y: 0.55 }
        });
      } else if (wonSlice.value > 0) {
        soundManager.playCardSlap();
      }

      const wheelEvent: WheelSpunEvent = {
        type: 'WHEEL_SPUN',
        prizeValue: wonSlice.value
      };

      const updatedCoins = Math.max(0, profile.coins - spinCost + wonSlice.value);

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

  return {
    isSpinning,
    rotation,
    prizeWon,
    canSpin,
    spinCost,
    sliceAngle,
    renderSlicePath,
    handleSpin
  };
}
