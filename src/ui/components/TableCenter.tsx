import React from 'react';
import { PlayedMove } from '../../engine/types';
import { CardView } from './CardView';
import { Sparkles, Flame } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';

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
  cardSize?: 'md' | 'table';
}

export const TableCenter: React.FC<TableCenterProps> = ({
  currentMove,
  isLeadMove,
  chopNotification,
  isDealing = false,
  cardSize = 'md'
}) => {
  const { myPlayerId, players } = useGameStore();

  const getSlideAnimationClass = (playerId?: string) => {
    if (!playerId) return 'card-slide-p0';
    const myIndex = Math.max(0, players.findIndex(p => p.id === myPlayerId));
    const targetIndex = players.findIndex(p => p.id === playerId);
    
    if (targetIndex === -1 || targetIndex === myIndex) {
      return 'card-slide-p0'; // từ dưới lên (ghế chính mình)
    }

    const diff = (targetIndex - myIndex + players.length) % players.length;
    if (players.length === 2) {
      return 'card-slide-p2'; // từ trên xuống
    }
    if (diff === 1) return 'card-slide-p1'; // từ trái sang
    if (diff === 2) return 'card-slide-p2'; // từ trên xuống
    if (diff === 3) return 'card-slide-p3'; // từ phải sang
    return 'card-slide-p0';
  };

  const isMobileSize = cardSize === 'table';

  const cardCount = currentMove?.combination?.cards?.length || 0;
  let spacingClass = isMobileSize ? '-space-x-5 sm:-space-x-6' : '-space-x-6 sm:-space-x-7.5';
  let scaleClass = 'scale-100';
  let rotFactor = 3.5;

  if (cardCount >= 6) {
    spacingClass = isMobileSize ? '-space-x-7 sm:-space-x-8' : '-space-x-8 sm:-space-x-9';
    scaleClass = 'scale-[0.80] sm:scale-[0.85]';
    rotFactor = 1.8;
  } else if (cardCount >= 4) {
    spacingClass = isMobileSize ? '-space-x-6 sm:-space-x-7' : '-space-x-7 sm:-space-x-8';
    scaleClass = 'scale-[0.88] sm:scale-[0.92]';
    rotFactor = 2.4;
  }

  return (
    <div className={`relative z-30 flex flex-col items-center justify-center ${isMobileSize ? 'min-h-[100px]' : 'min-h-[140px]'} w-full select-none overflow-visible`}>
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
        <div className="flex flex-col items-center overflow-visible">
          <div
            key={`${currentMove.playerId}-${currentMove.timestamp}-${currentMove.combination.cards.map(c => c.id).join('-')}`}
            className={`flex items-center justify-center ${spacingClass} ${scaleClass} transition-all duration-200 overflow-visible ${getSlideAnimationClass(currentMove.playerId)}`}
          >
            {currentMove.combination.cards.map((card, idx) => (
              <CardView
                key={card.id}
                card={card}
                disabled
                size="table"
                style={{
                  transform: `rotate(${(idx - (currentMove.combination.cards.length - 1) / 2) * rotFactor}deg)`,
                  zIndex: 30 + idx
                }}
              />
            ))}
          </div>
          <div className={`mt-1.5 bg-[#0e1422] px-2.5 py-0.5 rounded-full border border-amber-400/60 text-amber-300 ${isMobileSize ? 'text-[10px]' : 'text-xs'} font-bold flex items-center gap-1.5 shadow-xl`}>
            <Sparkles className="w-3 h-3 text-amber-300" />
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
        <div className={`flex flex-col items-center justify-center text-center ${isMobileSize ? 'p-2 rounded-lg' : 'p-4 rounded-xl'} bg-[#121724] border border-[#d4af37]/25 shadow-md`}>
          <div className={`text-[#f3e5ab] font-extrabold ${isMobileSize ? 'text-xs' : 'text-sm'} tracking-wider uppercase`}>
            {isLeadMove ? 'Vòng Mới Bắt Đầu' : 'Bàn Đang Trống'}
          </div>
          <span className={`text-slate-400 ${isMobileSize ? 'text-[10px]' : 'text-xs'} mt-0.5`}>
            {isLeadMove ? 'Người cầm Cái hãy đánh bộ bài mở màn' : 'Chờ người chơi ra bài...'}
          </span>
        </div>
      ) : isDealing ? (
        <div id="table-center-anchor" className="w-[68px] h-[98px] flex items-center justify-center pointer-events-none" />
      ) : null}
    </div>
  );
};
