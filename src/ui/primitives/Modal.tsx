import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useI18n } from '../../locales';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  subtitle?: string | null;
  icon?: React.ReactNode | null;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | null;
  height?: string | null;
  headerRight?: React.ReactNode | null;
  footer?: React.ReactNode | null;
  children: React.ReactNode;
  className?: string | null;
  preventClose?: boolean;
  showCloseButton?: boolean;
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
  className = '',
  preventClose = false,
  showCloseButton = true
}) => {
  const { t } = useI18n();

  useEffect(() => {
    if (preventClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, preventClose]);

  if (!isOpen) return null;

  const widthClass = maxWidth ? maxWidthClasses[maxWidth] : 'max-w-4xl';
  const heightClass = height || 'h-[85vh] sm:h-[620px]';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (!preventClose && onClose) onClose();
      }}
    >
      <div 
        className={`w-full ${widthClass} ${heightClass} max-h-[90vh] flex flex-col bg-[var(--bg-canvas)] border border-[var(--border-container)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL (Tier 1 Container) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-container)] border-b border-[var(--border-container)] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--color-gold)] flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-wide truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            {!preventClose && showCloseButton && onClose && (
              <Button
                variant="surface"
                size="icon"
                onClick={onClose}
                title={t('common.closeWindow')}
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </Button>
            )}
          </div>
        </div>

        {/* NỘI DUNG BODY CUỘN ĐỘC LẬP (Tier 0 Canvas) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm custom-scrollbar bg-[var(--bg-canvas)]">
          {children}
        </div>

        {/* FOOTER MODAL (Tier 1) */}
        {footer && (
          <div className="flex items-center justify-end px-6 py-3.5 bg-[var(--bg-container)] border-t border-[var(--border-container)] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
