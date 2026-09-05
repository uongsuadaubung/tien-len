import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../../../locales';

export interface MobileScreenWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const MobileScreenWrapper: React.FC<MobileScreenWrapperProps> = ({
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
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] w-full h-full select-none animate-in fade-in duration-200 overflow-hidden ${className || ''}`}>
      {/* 1. TOP APP BAR NATIVE (Chỉ có nút Quay Lại ←, tiêu đề và headerRight, TUYỆT ĐỐI KHÔNG CÓ NÚT X) */}
      <header className="sticky top-0 z-20 w-full bg-[var(--bg-container)]/98 backdrop-blur-md border-b border-[var(--border-container)] pt-[max(env(safe-area-inset-top),10px)] pb-2.5 pl-[max(env(safe-area-inset-left),12px)] pr-[max(env(safe-area-inset-right),12px)] flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Nút Quay Lại Native */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] text-xs font-bold text-[var(--color-gold)] active:scale-95 transition-transform shrink-0"
            title={t('common.back')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.back')}</span>
          </button>

          {icon && (
            <div className="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--color-gold)] shrink-0 hidden sm:flex">
              {icon}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] text-[var(--text-muted)] truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Khu vực thông tin bên phải (ví dụ: Túi Xu, Bậc Rank) */}
        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
        </div>
      </header>

      {/* 2. BODY NỘI DUNG CUỘN CẢM ỨNG MƯỢT MÀ */}
      <main className="flex-1 overflow-y-auto pt-3 pb-4 pl-[max(env(safe-area-inset-left),12px)] pr-[max(env(safe-area-inset-right),12px)] space-y-3.5 text-xs custom-scrollbar bg-[var(--bg-canvas)]">
        <div className="max-w-3xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* 3. FOOTER GHIM ĐÁY (NẾU CÓ) */}
      {footer && (
        <footer className="sticky bottom-0 z-20 w-full bg-[var(--bg-container)]/98 backdrop-blur-md border-t border-[var(--border-container)] pt-2.5 pb-[max(env(safe-area-inset-bottom),12px)] pl-[max(env(safe-area-inset-left),16px)] pr-[max(env(safe-area-inset-right),16px)] shadow-lg shrink-0">
          <div className="max-w-3xl mx-auto w-full flex items-center justify-end">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
};
