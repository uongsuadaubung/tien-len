import React from 'react';

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle: string | null;
  icon: React.ReactNode | null;
  action: React.ReactNode | null;
  className: string | null;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 pb-2 border-b border-[var(--border-container)] ${className || ''}`}>
      <div className="flex items-center gap-2">
        {icon && (
          <div className="p-1 sm:p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--color-gold)] shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};
