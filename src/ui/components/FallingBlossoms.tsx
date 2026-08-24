import React, { useMemo } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface Petal {
  id: number;
  icon: string;
  left: number;
  duration: number;
  delay: number;
  size: number;
  opacity: number;
}

const ICONS = ['🌸', '🌼', '🌸', '🏵️', '🌸', '✨'];

export const FallingBlossoms: React.FC = () => {
  const blossomEnabled = useSettingsStore((state) => state.blossomEnabled);

  // Chỉ 6 cánh hoa nhẹ nhàng, dùng translate3d để GPU compositing cực mượt và nhẹ (<1% GPU)
  const petals: Petal[] = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      icon: ICONS[i % ICONS.length],
      left: (i * 16 + 5) % 92,
      duration: 12 + (i % 3) * 3,
      delay: (i * 1.5) % 8,
      size: 14 + (i % 3) * 3,
      opacity: 0.65
    }));
  }, []);

  if (!blossomEnabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden select-none">
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="floating-blossom"
          style={{
            left: `${petal.left}%`,
            fontSize: `${petal.size}px`,
            opacity: petal.opacity,
            animationDuration: `${petal.duration}s`,
            animationDelay: `${petal.delay}s`
          }}
        >
          {petal.icon}
        </div>
      ))}
    </div>
  );
};
