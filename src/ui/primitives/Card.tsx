import React from 'react';

export type CardVariant = 
  | 'container'  // Tier 1: Khung bao lớn / Shell
  | 'card'       // Tier 2: Thẻ con / Item
  | 'nested'     // Tier 2: Box con lồng trong Card
  | 'surface'    // Tier 1: Surface
  | 'active'     // Tier 2+: Đang chọn
  | 'felt'       // Bàn nỉ
  | 'vip'        // VIP
  | 'wine';      // Sới đỏ

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
  clickable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  container: 'bg-[var(--bg-container)] border border-[var(--border-container)] text-[var(--text-primary)] shadow-lg',
  surface: 'bg-[var(--bg-container)] border border-[var(--border-container)] text-[var(--text-primary)] shadow-lg',
  card: 'bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]',
  nested: 'bg-[var(--bg-input)] border border-[var(--border-container)] text-[var(--text-primary)] shadow-inner',
  active: 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] text-[var(--text-primary)] shadow-[var(--shadow-gold)]',
  felt: 'bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]',
  vip: 'bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]',
  wine: 'bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
};

const hoverStyles: Record<CardVariant, string> = {
  container: 'hover:border-[var(--border-card-hover)]',
  surface: 'hover:border-[var(--border-card-hover)]',
  card: 'hover:border-[var(--border-card-hover)] hover:bg-[var(--bg-card-hover)] hover:-translate-y-0.5',
  nested: 'hover:border-[var(--border-card-hover)] hover:bg-[var(--bg-card)]',
  active: 'hover:border-[var(--color-gold-hover)] hover:-translate-y-0.5',
  felt: 'hover:border-[var(--border-card-hover)] hover:bg-[var(--bg-card-hover)]',
  vip: 'hover:border-[var(--border-card-hover)] hover:bg-[var(--bg-card-hover)]',
  wine: 'hover:border-[var(--border-card-hover)] hover:bg-[var(--bg-card-hover)]'
};

export const Card: React.FC<CardProps> = ({
  variant = 'card',
  hoverable = false,
  clickable = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`
        rounded-2xl transition-all duration-200 ease-out
        ${variantStyles[variant]}
        ${hoverable || clickable ? `${hoverStyles[variant]} ${clickable ? 'cursor-pointer' : ''}` : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
