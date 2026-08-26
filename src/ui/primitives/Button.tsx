import React from 'react';

export type ButtonVariant = 
  | 'gold' 
  | 'surface' 
  | 'active' 
  | 'emerald' 
  | 'sapphire' 
  | 'wine' 
  | 'danger' 
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  gold: 'btn-gold-luxury font-bold shadow-[var(--shadow-gold)]',
  surface: 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-card)] hover:border-[var(--border-card-hover)] font-semibold shadow-sm',
  active: 'bg-[var(--bg-card-active)] hover:bg-[var(--bg-card-hover)] text-[var(--color-gold)] border-2 border-[var(--color-gold)] font-bold shadow-sm',
  emerald: 'bg-[var(--color-emerald-bg)] hover:brightness-110 text-[var(--color-emerald-text)] border border-[var(--color-emerald-border)] font-semibold shadow-sm',
  sapphire: 'bg-[var(--color-sapphire-bg)] hover:brightness-110 text-[var(--color-sapphire-text)] border border-[var(--color-sapphire-border)] font-semibold shadow-sm',
  wine: 'bg-[var(--color-ruby-bg)] hover:brightness-110 text-[var(--color-ruby-text)] border border-[var(--color-ruby-border)] font-semibold shadow-sm',
  danger: 'bg-[var(--color-ruby-bg)] hover:brightness-110 text-[var(--color-ruby-text)] border border-[var(--color-ruby-border)] font-semibold shadow-sm',
  ghost: 'bg-transparent hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-3.5 py-2 text-xs sm:text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-sm sm:text-base rounded-xl gap-2.5',
  icon: 'p-2 rounded-xl text-xs'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'surface',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      disabled={disabled}
      className={`
        inline-flex items-center justify-center transition-all duration-200 select-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-35 cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-98'}
        ${className}
      `}
      {...props}
    >
      {leftIcon && <span className="flex-shrink-0 flex items-center">{leftIcon}</span>}
      {children && <span>{children}</span>}
      {rightIcon && <span className="flex-shrink-0 flex items-center">{rightIcon}</span>}
    </button>
  );
};
