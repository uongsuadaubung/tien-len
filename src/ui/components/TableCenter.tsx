import React from 'react';
import { PlayedMove } from '../../engine/types';
import { CardView } from './CardView';
import { Sparkles, Flame } from 'lucide-react';

interface TableCenterProps {
  currentMove: PlayedMove | null;
  isLeadMove: boolean;
  chopNotification: {
    visible: boolean;
    chopperName: string;
    targetName: string;
    amount: number;
    isCascade?: boolean;
    chainCount?: number;
  } | null;
  isDealing?: boolean;
}

export const TableCenter: React.FC<TableCenterProps> = ({
  currentMove,
  isLeadMove,
  chopNotification,
  isDealing = false
}) => {
  const getSlideAnimationClass = (playerId?: string) => {
    switch (playerId) {
      case 'p1':
        return 'card-slide-p1';
      case 'p2':
        return 'card-slide-p2';
      case 'p3':
        return 'card-slide-p3';
      case 'p0':
      default:
        return 'card-slide-p0';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[160px] w-full select-none">
      {/* Thông báo Chặt Heo / Chặt Hàng nổ bùng */}
      {chopNotification?.visible && (
        <div className={`absolute -top-12 z-50 px-6 py-2 rounded-full flex items-center gap-2 text-white font-black text-lg shadow-2xl ${
          chopNotification.isCascade 
            ? 'bg-gradient-to-r from-red-600 via-amber-600 to-[#d4af37] border border-[#f3e5ab] shadow-[#d4af37]/50' 
            : 'chop-badge'
        }`}>
          <Flame className="w-6 h-6 text-[#f3e5ab] fill-[#d4af37]" />
          <span>{chopNotification.isCascade ? `🔥 CHẶT ĐÈ LIÊN HOÀN (x${chopNotification.chainCount || 2})!` : 'CHẶT ĐẸP!'}</span>
          <span className="text-[#f3e5ab] text-sm font-bold">
            ({chopNotification.chopperName} +{chopNotification.amount.toLocaleString()} 🪙 từ {chopNotification.targetName})
          </span>
        </div>
      )}

      {/* Hiển thị tổ hợp bài trên bàn với hiệu ứng trượt bài */}
      {!isDealing && currentMove && currentMove.combination.cards.length > 0 ? (
        <div className="flex flex-col items-center">
          <div
            key={`${currentMove.playerId}-${currentMove.timestamp}-${currentMove.combination.cards.map(c => c.id).join('-')}`}
            className={`flex items-center justify-center -space-x-8 hover:space-x-1 transition-all duration-200 ${getSlideAnimationClass(currentMove.playerId)}`}
          >
            {currentMove.combination.cards.map((card, idx) => (
              <CardView
                key={card.id}
                card={card}
                disabled
                size="md"
                style={{
                  transform: `rotate(${(idx - (currentMove.combination.cards.length - 1) / 2) * 4}deg)`,
                  zIndex: 10 + idx
                }}
              />
            ))}
          </div>
          <div className="mt-2 bg-[#121724]/95 px-3 py-1 rounded-full border border-[#d4af37]/35 text-[#f3e5ab] text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>
              {currentMove.combination.type === 'SINGLE' && 'Lá Rác'}
              {currentMove.combination.type === 'PAIR' && 'Đôi'}
              {currentMove.combination.type === 'TRIPLE' && 'Sám Cô'}
              {currentMove.combination.type === 'STRAIGHT' && `Sảnh ${currentMove.combination.length} Lá`}
              {currentMove.combination.type === 'THREE_PAIRS_SEQUENTIAL' && '🔥 3 Đôi Thông'}
              {currentMove.combination.type === 'FOUR_OF_A_KIND' && '⚡ Tứ Quý'}
              {currentMove.combination.type === 'FOUR_PAIRS_SEQUENTIAL' && '💥 4 Đôi Thông'}
            </span>
          </div>
        </div>
      ) : !isDealing ? (
        <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-[#121724]/90 border border-[#d4af37]/25 shadow-md">
          <div className="text-[#f3e5ab] font-extrabold text-sm tracking-wider uppercase">
            {isLeadMove ? 'Vòng Mới Bắt Đầu' : 'Bàn Đang Trống'}
          </div>
          <span className="text-slate-400 text-xs mt-1">
            {isLeadMove ? 'Người cầm Cái hãy đánh bộ bài mở màn' : 'Chờ người chơi ra bài...'}
          </span>
        </div>
      ) : isDealing ? (
        <div id="table-center-anchor" className="w-[68px] h-[98px] flex items-center justify-center pointer-events-none" />
      ) : null}
    </div>
  );
};
