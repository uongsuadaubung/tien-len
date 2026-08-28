import React from 'react';
import { Card } from '../../engine/types';
import { RANK_NAMES, SUIT_SYMBOLS, isRedCard } from '../../engine/card';

interface CardViewProps {
  card: Card;
  isSelected?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'mobile' | 'table';
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isSelected = false,
  isPlayable = true,
  onClick,
  disabled = false,
  style,
  className = '',
  size = 'md'
}) => {
  const isRed = isRedCard(card);
  const rankStr = RANK_NAMES[card.rank];
  const suitSym = SUIT_SYMBOLS[card.suit];

  const sizeClasses = {
    xs: 'w-6 h-9 sm:w-7 sm:h-10 text-[8px] rounded-[4px] p-0.5',
    sm: 'w-12 h-18 text-xs rounded-lg',
    table: 'w-[50px] h-[72px] sm:w-[54px] sm:h-[78px] text-xs rounded-xl',
    mobile: 'w-[56px] h-[84px] sm:w-[62px] sm:h-[92px] text-sm rounded-xl',
    md: 'w-[74px] h-[106px] text-sm rounded-xl',
    lg: 'w-24 h-34 text-base rounded-2xl'
  }[size];

  const centerIconSizes = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-xl',
    table: 'text-lg sm:text-xl',
    mobile: 'text-xl sm:text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl'
  }[size];

  const rankTextSizes = {
    xs: 'text-[8px] sm:text-[9px] font-black leading-none',
    sm: 'text-xs font-black',
    table: 'text-xs sm:text-sm font-black leading-tight',
    mobile: 'text-sm sm:text-base font-black leading-tight',
    md: 'text-sm sm:text-base font-black',
    lg: 'text-lg font-black'
  }[size];

  const miniSuitSizes = {
    xs: 'text-[6px] sm:text-[7px] leading-none',
    sm: 'text-[8px] sm:text-[9px]',
    table: 'text-[8px] sm:text-[9px]',
    mobile: 'text-[9px] sm:text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  }[size];

  const colorClass = isRed ? 'text-red-600' : 'text-slate-900';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={style}
      className={`
        playing-card ${sizeClasses} select-none relative overflow-hidden
        ${isSelected ? 'selected' : ''}
        ${!disabled && isPlayable ? 'cursor-pointer' : 'cursor-default'}
        ${disabled ? 'opacity-85' : ''}
        ${className}
      `}
    >
      {/* 1. GÓC TRÊN BÊN TRÁI (HƯỚNG XUÔI) */}
      <div className={`card-corner-tl ${colorClass}`}>
        <span className={rankTextSizes}>{rankStr}</span>
        <span className={`${miniSuitSizes} mt-0.5 opacity-90`}>{suitSym}</span>
      </div>

      {/* 2. CHÍNH GIỮA LÁ BÀI: BIỂU TƯỢNG CHẤT TO RÕ SẮC NÉT */}
      <div className="card-center-suit">
        <span
          className={`${centerIconSizes} font-black ${colorClass} filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]`}
        >
          {suitSym}
        </span>
      </div>

      {/* 3. GÓC DƯỚI BÊN PHẢI (LẬT NGƯỢC 180 ĐỘ) */}
      <div
        className={`card-corner-br ${colorClass}`}
        style={{ transform: 'rotate(180deg)' }}
      >
        <span className={rankTextSizes}>{rankStr}</span>
        <span className={`${miniSuitSizes} mt-0.5 opacity-90`}>{suitSym}</span>
      </div>
    </div>
  );
};

/**
 * Thẻ bài thu nhỏ (Miniature Playing Card) dùng cho màn hình kết thúc trận và xem bài tàn cuộc
 */
export const MiniCardView: React.FC<{ card: Card; className?: string }> = ({ card, className = '' }) => {
  const isRed = isRedCard(card);
  const rankStr = RANK_NAMES[card.rank];
  const suitSym = SUIT_SYMBOLS[card.suit];
  const isTwo = card.rank === 15;
  const colorClass = isRed ? 'text-red-600' : 'text-slate-900';

  return (
    <div
      className={`
        w-6 h-9 sm:w-7 sm:h-10 bg-white rounded-[4px] shadow-sm select-none relative overflow-hidden flex flex-col justify-between p-0.5 border flex-shrink-0
        ${isTwo ? 'border-amber-400 ring-1 ring-amber-400/80 shadow-amber-500/20' : 'border-zinc-300'}
        ${className}
      `}
      title={`${rankStr} ${suitSym}`}
    >
      {/* Góc trên */}
      <div className={`flex items-center gap-0.5 leading-none ${colorClass}`}>
        <span className="text-[9px] font-black">{rankStr}</span>
        <span className="text-[7px]">{suitSym}</span>
      </div>

      {/* Biểu tượng chất chính giữa */}
      <div className={`self-center text-xs font-black leading-none ${colorClass} opacity-90`}>
        {suitSym}
      </div>

      {/* Góc dưới đảo ngược */}
      <div className={`flex items-center gap-0.5 leading-none self-end rotate-180 ${colorClass}`}>
        <span className="text-[9px] font-black">{rankStr}</span>
        <span className="text-[7px]">{suitSym}</span>
      </div>
    </div>
  );
};
