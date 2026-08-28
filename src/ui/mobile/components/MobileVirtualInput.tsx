import React, { useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { MobileVirtualKeyboard } from './MobileVirtualKeyboard';

export interface MobileVirtualInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode | null;
  label: string | null;
  error: string | null;
  maxLength: number;
  showRandomNameButton: boolean;
  showPasteButton: boolean;
  onRandomName: (() => void) | null;
  onPaste: (() => void) | null;
  onSubmit: (() => void) | null;
  className: string | null;
  inputClassName: string | null;
  clearable: boolean;
  renderExtraActions: (() => React.ReactNode) | null;
}

export const MobileVirtualInput: React.FC<MobileVirtualInputProps> = ({
  value,
  onChange,
  placeholder,
  icon,
  label,
  error,
  maxLength,
  showRandomNameButton,
  showPasteButton,
  onRandomName,
  onPaste,
  onSubmit,
  className,
  inputClassName,
  clearable,
  renderExtraActions
}) => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={`space-y-1.5 w-full select-none ${className || ''}`}>
      {/* 1. Nhãn Tiêu Đề (Nếu có) */}
      {label && (
        <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* 2. Hộp Nhập Liệu Tùy Biến (Không bật Bàn phím OS) */}
      <div
        onClick={() => setIsKeyboardOpen(true)}
        className={`relative flex items-center justify-between w-full px-3.5 py-2.5 bg-[var(--bg-input)] border rounded-xl text-sm sm:text-base font-bold text-[var(--text-primary)] shadow-inner cursor-pointer transition-colors ${
          isKeyboardOpen
            ? 'border-[var(--color-gold)] ring-2 ring-[var(--color-gold)]/30'
            : 'border-[var(--border-container)] hover:border-[var(--color-gold-border)]'
        } ${inputClassName || ''}`}
      >
        <div className="flex items-center min-w-0 flex-1 mr-2">
          {icon && <div className="shrink-0 mr-2.5">{icon}</div>}
          
          <div className="font-mono tracking-wide truncate">
            {value ? (
              <span>
                {value}
                {isKeyboardOpen && (
                  <span className="inline-block w-1.5 h-4 bg-[var(--color-gold)] ml-0.5 animate-pulse align-middle" />
                )}
              </span>
            ) : (
              <span className="text-[var(--text-dim)] italic font-sans font-normal text-xs sm:text-sm">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        {/* Cụm Action Phụ: Nút Tùy Chỉnh + Nút Xóa + Nút Bật/Tắt Bàn Phím */}
        <div className="flex items-center gap-1.5 shrink-0">
          {renderExtraActions && renderExtraActions()}

          {clearable && value.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white active:scale-95 transition-transform cursor-pointer"
              title="Xóa nội dung"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsKeyboardOpen(!isKeyboardOpen);
            }}
            className={`p-1.5 sm:p-2 rounded-lg border text-xs font-bold active:scale-95 transition-all cursor-pointer ${
              isKeyboardOpen
                ? 'bg-[var(--color-gold)] text-black border-[var(--color-gold)]'
                : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)]'
            }`}
            title={isKeyboardOpen ? 'Ẩn bàn phím' : 'Mở bàn phím ảo'}
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thông Báo Lỗi (Nếu có) */}
      {error && (
        <p className="text-xs text-red-400 font-bold flex items-center gap-1 pt-0.5">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}

      {/* 3. BÀN PHÍM ẢO NATIVE XUẤT HIỆN DƯỚI INPUT */}
      {isKeyboardOpen && (
        <MobileVirtualKeyboard
          value={value}
          onChange={onChange}
          onEnter={() => {
            setIsKeyboardOpen(false);
            if (onSubmit) onSubmit();
          }}
          onClose={() => setIsKeyboardOpen(false)}
          onRandomName={onRandomName}
          onPaste={onPaste}
          maxLength={maxLength}
          showRandomNameButton={showRandomNameButton}
          showPasteButton={showPasteButton}
          className={null}
        />
      )}
    </div>
  );
};
