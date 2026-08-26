import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl';
  height?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = '4xl',
  height = 'h-[85vh] sm:h-[620px]',
  headerRight,
  footer,
  children,
  className = ''
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 select-none backdrop-blur-sm animate-fade-in">
      <div 
        className={`
          relative w-full ${maxWidthClasses[maxWidth]} ${height} max-h-[90vh] 
          bg-[var(--bg-container)] border border-[var(--border-container)] rounded-2xl shadow-2xl flex flex-col text-[var(--text-primary)] overflow-hidden
          ${className}
        `}
      >
        {/* HEADER MODAL (Tier 1) */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[var(--bg-container)] border-b border-[var(--border-container)] flex-shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--color-gold)] shadow-sm">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-wide">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerRight}
            <Button
              variant="surface"
              size="icon"
              onClick={onClose}
              title="Đóng cửa sổ (ESC)"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </Button>
          </div>
        </div>

        {/* NỘI DUNG BODY CUỘN ĐỘC LẬP (Tier 0 Canvas) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm custom-scrollbar bg-[var(--bg-canvas)]">
          {children}
        </div>

        {/* FOOTER MODAL (Tier 1) */}
        {footer && (
          <div className="flex items-center justify-end px-5 sm:px-6 py-3.5 bg-[var(--bg-container)] border-t border-[var(--border-container)] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
