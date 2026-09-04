import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  const isSm = size === 'sm';
  const trackClasses = isSm
    ? 'w-9 h-5 p-0.5'
    : 'w-11 h-6 p-0.5';

  const thumbClasses = isSm
    ? `w-4 h-4 ${checked ? 'translate-x-4' : 'translate-x-0'}`
    : `w-5 h-5 ${checked ? 'translate-x-5' : 'translate-x-0'}`;

  return (
    <div
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        if (onChange && !disabled) {
          e.stopPropagation();
          onChange(!checked);
        }
      }}
      className={`inline-flex items-center rounded-full transition-colors duration-200 flex-shrink-0 cursor-pointer select-none ${trackClasses} ${
        checked
          ? 'bg-[var(--color-gold)] shadow-sm shadow-amber-500/30'
          : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <div
        className={`rounded-full shadow transform transition-transform duration-200 pointer-events-none ${thumbClasses} ${
          checked ? 'bg-[#0a0c0e]' : 'bg-zinc-400'
        }`}
      />
    </div>
  );
};
