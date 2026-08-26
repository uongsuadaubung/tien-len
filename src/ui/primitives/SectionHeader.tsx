import React from 'react';

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 pb-2.5 border-b border-[var(--border-container)] ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--color-gold)]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
};
