import React from 'react';

export type BadgeVariant = 
  | 'gold' 
  | 'neutral' 
  | 'dark' 
  | 'danger' 
  | 'emerald' 
  | 'sapphire' 
  | 'wine';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  gold: 'bg-[var(--color-gold-dim)] text-[var(--color-gold)] border border-[var(--color-gold-border)]',
  neutral: 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-card)]',
  dark: 'bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--border-container)]',
  danger: 'bg-[var(--color-ruby-bg)] text-[var(--color-ruby-text)] border border-[var(--color-ruby-border)]',
  emerald: 'bg-[var(--color-emerald-bg)] text-[var(--color-emerald-text)] border border-[var(--color-emerald-border)]',
  sapphire: 'bg-[var(--color-sapphire-bg)] text-[var(--color-sapphire-text)] border border-[var(--color-sapphire-border)]',
  wine: 'bg-[var(--color-ruby-bg)] text-[var(--color-ruby-text)] border border-[var(--color-ruby-border)]'
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] font-semibold rounded-md gap-1',
  md: 'px-2.5 py-1 text-xs font-semibold rounded-lg gap-1.5'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={`
        inline-flex items-center justify-center select-none shadow-sm
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
