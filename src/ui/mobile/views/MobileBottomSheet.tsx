import React from 'react';

export interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle: string | null;
  icon: React.ReactNode | null;
  headerRight: React.ReactNode | null;
  footer: React.ReactNode | null;
  children: React.ReactNode;
  className: string | null;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerRight,
  footer,
  children,
  className
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 select-none animate-fade-in safe-area-bottom">
      {/* Vùng bấm mờ bên ngoài để đóng sheet */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div 
        className={`
          relative z-10 w-full max-h-[88vh] bg-[var(--bg-container)] border-t border-[var(--border-container)] 
          rounded-t-3xl shadow-2xl flex flex-col text-[var(--text-primary)] overflow-hidden animate-in slide-in-from-bottom-4 duration-200
          ${className || ''}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle Bar kéo */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header Bottom Sheet */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-container)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--color-gold)] shrink-0 shadow-sm">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {headerRight}
          </div>
        </div>

        {/* Body Sheet */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-3 text-xs custom-scrollbar bg-[var(--bg-canvas)] ${!footer ? 'pb-[max(env(safe-area-inset-bottom),1rem)]' : ''}`}>
          {children}
        </div>

        {/* Footer Sheet */}
        {footer && (
          <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-[var(--bg-container)] border-t border-[var(--border-container)] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
