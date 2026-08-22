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
  size?: 'sm' | 'md' | 'lg';
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
    sm: 'w-12 h-18 text-xs',
    md: 'w-[74px] h-[106px] text-sm',
    lg: 'w-24 h-34 text-base'
  }[size];

  const centerIconSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl'
  }[size];

  const rankTextSizes = {
    sm: 'text-xs',
    md: 'text-sm sm:text-base',
    lg: 'text-lg'
  }[size];

  const miniSuitSizes = {
    sm: 'text-[9px]',
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
