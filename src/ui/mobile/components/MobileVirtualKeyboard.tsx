import React, { useState } from 'react';
import { Delete, Shuffle, Clipboard, CornerDownLeft, Space, ChevronDown } from 'lucide-react';
import { soundManager } from '../../audio/sound-manager';

export type KeyboardLayoutMode = 'ALPHA' | 'NUMERIC';

export interface MobileVirtualKeyboardProps {
  value: string;
  onChange: (newValue: string) => void;
  onEnter: (() => void) | null;
  onClose: (() => void) | null;
  onRandomName: (() => void) | null;
  onPaste: (() => void) | null;
  maxLength: number;
  showRandomNameButton: boolean;
  showPasteButton: boolean;
  className: string | null;
}

const RANDOM_NICKNAME_PREFIXES: readonly string[] = [
  'Thần Bài', 'Vua Đếm Lá', 'Sát Thủ', 'Bá Chủ', 'Đại Gia', 
  'Cao Thủ', 'Lãng Tử', 'Tiểu Long', 'Hiệp Sĩ', 'Chúa Tể',
  'Trùm Cuối', 'Thợ Săn'
];

const RANDOM_NICKNAME_SUFFIXES: readonly string[] = [
  'Sài Gòn', 'Bến Tre', 'Chợ Lớn', 'Heo Cơ', 'Heo Bích', 
  'Tứ Quý', 'Bất Bại', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 
  'Miền Tây', 'Vô Song', '3 Bích', 'Casino'
];

export function generateRandomCasinoNickname(): string {
  const prefix = RANDOM_NICKNAME_PREFIXES[Math.floor(Math.random() * RANDOM_NICKNAME_PREFIXES.length)];
  const suffix = RANDOM_NICKNAME_SUFFIXES[Math.floor(Math.random() * RANDOM_NICKNAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

const ALPHA_ROWS_LOWER: readonly (readonly string[])[] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

const ALPHA_ROWS_UPPER: readonly (readonly string[])[] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const NUMERIC_ROW: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export const MobileVirtualKeyboard: React.FC<MobileVirtualKeyboardProps> = ({
  value,
  onChange,
  onEnter,
  onClose,
  onRandomName,
  onPaste,
  maxLength,
  showRandomNameButton,
  showPasteButton,
  className
}) => {
  const [isUppercase, setIsUppercase] = useState<boolean>(true);
  const [layoutMode, setLayoutMode] = useState<KeyboardLayoutMode>('ALPHA');

  const handleKeyPress = (char: string) => {
    if (value.length >= maxLength) return;
    soundManager.playCardDeal();
    onChange(value + char);
  };

  const handleDelete = () => {
    if (value.length === 0) return;
    soundManager.playCardDeal();
    onChange(value.slice(0, -1));
  };

  const handleSpace = () => {
    if (value.length >= maxLength) return;
    if (value.endsWith(' ')) return;
    soundManager.playCardDeal();
    onChange(value + ' ');
  };

  const handleClear = () => {
    soundManager.playCardDeal();
    onChange('');
  };

  const handlePasteClipboard = async () => {
    try {
      if (onPaste) {
        onPaste();
        return;
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          soundManager.playVictory();
          onChange(text.slice(0, maxLength));
        }
      }
    } catch {
      // Ignore if permission denied
    }
  };

  const handleRandomize = () => {
    soundManager.playVictory();
    if (onRandomName) {
      onRandomName();
    } else {
      const randomNick = generateRandomCasinoNickname();
      onChange(randomNick.slice(0, maxLength));
    }
  };

  const currentAlphaRows = isUppercase ? ALPHA_ROWS_UPPER : ALPHA_ROWS_LOWER;

  return (
    <div className={`w-full bg-[var(--bg-container)]/98 border border-[var(--border-container)] rounded-2xl p-2 sm:p-3 shadow-2xl backdrop-blur-md select-none animate-in fade-in slide-in-from-bottom-3 duration-200 ${className || ''}`}>
      
      {/* 1. THANH CÔNG CỤ & NÚT ĐÓNG BÀN PHÍM */}
      <div className="flex items-center justify-between gap-1.5 pb-2 mb-1.5 border-b border-[var(--border-container)] text-xs">
        <div className="flex items-center gap-2">
          {showRandomNameButton && (
            <button
              type="button"
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 text-[var(--color-gold)] text-xs font-bold active:scale-95 transition-transform cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>🎲 Tên Nhanh</span>
            </button>
          )}

          {showPasteButton && (
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold active:scale-95 transition-transform cursor-pointer"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>📋 Dán</span>
            </button>
          )}

          {value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[#f87171] hover:underline px-1.5 py-0.5 cursor-pointer font-semibold"
            >
              Xóa hết
            </button>
          )}
        </div>

        {/* NÚT ĐÓNG / THU GỌN BÀN PHÍM */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] font-mono font-semibold">{value.length}/{maxLength}</span>
          
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
              title="Ẩn bàn phím"
            >
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-gold)]" />
              <span>Đóng</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. DÃY PHÍM SỐ (KÍCH THƯỚC LỚN HƠN, BẤM ÊM TAY) */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1.5">
        {NUMERIC_ROW.map((num) => (
          <button
            type="button"
            key={`num-${num}`}
            onClick={() => handleKeyPress(num)}
            className="flex-1 h-9 sm:h-10 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-sm sm:text-base font-extrabold text-[var(--text-primary)] active:bg-[var(--color-gold)] active:text-black active:scale-95 transition-all flex items-center justify-center shadow-sm cursor-pointer"
          >
            {num}
          </button>
        ))}
      </div>

      {/* 3. CÁC HÀNG PHÍM CHỮ CÁI QWERTY (RỘNG RÃI, DỄ CHẠM TRÚNG) */}
      {layoutMode === 'ALPHA' ? (
        <div className="space-y-1.5">
          {/* Hàng 1: Q - P */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
            {currentAlphaRows[0].map((char) => (
              <button
                type="button"
                key={char}
                onClick={() => handleKeyPress(char)}
                className="flex-1 h-10 sm:h-11 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-sm sm:text-base font-extrabold text-[var(--text-primary)] active:bg-[var(--color-gold)] active:text-black active:scale-95 transition-all flex items-center justify-center shadow-sm cursor-pointer"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Hàng 2: A - L */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3">
            {currentAlphaRows[1].map((char) => (
              <button
                type="button"
                key={char}
                onClick={() => handleKeyPress(char)}
                className="flex-1 h-10 sm:h-11 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-sm sm:text-base font-extrabold text-[var(--text-primary)] active:bg-[var(--color-gold)] active:text-black active:scale-95 transition-all flex items-center justify-center shadow-sm cursor-pointer"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Hàng 3: SHIFT + Z - M + BACKSPACE */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
            {/* Phím SHIFT */}
            <button
              type="button"
              onClick={() => setIsUppercase(!isUppercase)}
              className={`w-11 sm:w-14 h-10 sm:h-11 rounded-lg border text-sm font-extrabold transition-all flex items-center justify-center shadow-sm cursor-pointer shrink-0 ${
                isUppercase
                  ? 'bg-[var(--color-gold)] text-black border-[var(--color-gold)] font-black'
                  : 'bg-[var(--bg-card)] border-[var(--border-card)] text-[var(--text-secondary)]'
              }`}
            >
              ⇧
            </button>

            {currentAlphaRows[2].map((char) => (
              <button
                type="button"
                key={char}
                onClick={() => handleKeyPress(char)}
                className="flex-1 h-10 sm:h-11 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-sm sm:text-base font-extrabold text-[var(--text-primary)] active:bg-[var(--color-gold)] active:text-black active:scale-95 transition-all flex items-center justify-center shadow-sm cursor-pointer"
              >
                {char}
              </button>
            ))}

            {/* Phím XÓA (BACKSPACE) */}
            <button
              type="button"
              onClick={handleDelete}
              className="w-11 sm:w-14 h-10 sm:h-11 rounded-lg bg-[#2a1717] border border-rose-900/40 text-rose-300 active:bg-rose-600 active:text-white active:scale-95 transition-all flex items-center justify-center shadow-sm cursor-pointer shrink-0"
              title="Xóa ký tự"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ KÝ TỰ MỞ RỘNG */
        <div className="grid grid-cols-5 gap-1.5 py-1">
          {['-', '_', '.', '@', '#', '$', '%', '&', '*', '+', '=', '(', ')', '/', ':'].map((sym) => (
            <button
              type="button"
              key={sym}
              onClick={() => handleKeyPress(sym)}
              className="h-10 sm:h-11 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-sm sm:text-base font-bold text-[var(--text-primary)] active:bg-[var(--color-gold)] active:text-black active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              {sym}
            </button>
          ))}
        </div>
      )}

      {/* 4. HÀNG ĐÁY: TAB 123 + DẤU CÁCH + XONG */}
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        <button
          type="button"
          onClick={() => setLayoutMode(layoutMode === 'ALPHA' ? 'NUMERIC' : 'ALPHA')}
          className="w-14 sm:w-16 h-10 sm:h-11 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-xs sm:text-sm font-bold text-[var(--color-gold)] active:scale-95 transition-all flex items-center justify-center shadow-sm cursor-pointer shrink-0"
        >
          {layoutMode === 'ALPHA' ? '?123' : 'ABC'}
        </button>

        {/* Phím DẤU CÁCH */}
        <button
          type="button"
          onClick={handleSpace}
          className="flex-1 h-10 sm:h-11 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-xs sm:text-sm font-bold text-[var(--text-secondary)] active:bg-[var(--color-gold)] active:text-black active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Space className="w-4 h-4" />
          <span>Cách</span>
        </button>

        {/* Phím HOÀN TẤT / XONG */}
        <button
          type="button"
          onClick={() => {
            if (onEnter) onEnter();
            if (onClose) onClose();
          }}
          className="px-3.5 sm:px-5 h-10 sm:h-11 rounded-lg bg-[var(--color-gold)] border border-[var(--color-gold-border)] text-xs sm:text-sm font-black text-[#0a0c0e] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span>Xong</span>
        </button>
      </div>
    </div>
  );
};
