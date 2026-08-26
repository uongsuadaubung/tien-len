import React from 'react';

export interface TabOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  options: TabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  options,
  activeId,
  onChange,
  className = ''
}: TabsProps<T>) {
  return (
    <div className={`flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-container)] ${className}`}>
      {options.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer select-none
              ${isActive 
                ? 'bg-[var(--bg-card)] text-[var(--color-gold)] border border-[var(--color-gold-border)] shadow-md' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/40 border border-transparent'
              }
            `}
          >
            {tab.icon && <span className="flex-shrink-0 flex items-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="flex-shrink-0">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
