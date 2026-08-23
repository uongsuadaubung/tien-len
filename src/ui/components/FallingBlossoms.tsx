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

  // Khởi tạo trước danh sách vị trí cánh hoa cố định (tránh random lại mỗi frame)
  const petals: Petal[] = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      icon: ICONS[i % ICONS.length],
      left: (i * 6.25 + (i % 3) * 1.5) % 96 + 2,
      duration: 8 + (i % 5) * 2.5,
      delay: (i * 0.7) % 8,
      size: 14 + (i % 4) * 4,
      opacity: 0.7 + (i % 3) * 0.15
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
