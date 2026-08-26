import React, { useEffect, useState, useRef } from 'react';
import { soundManager } from '../audio/sound-manager';
import { FastForward, Sparkles } from 'lucide-react';
import { UI_TIMINGS } from '../constants/ui-timings';

interface DealingDeckAnimationProps {
  isDealing: boolean;
  playerCount?: number;
  onDealComplete: () => void;
  onDealCard: (playerIndex: number, currentCardCount: number) => void;
  onSkip?: () => void;
}

interface FlyingCard {
  id: number;
  dx: number;
  dy: number;
  rot: number;
}

interface FlyingCardStyle extends React.CSSProperties {
  '--dx': string;
  '--dy': string;
  '--rot': string;
}

export const DealingDeckAnimation: React.FC<DealingDeckAnimationProps> = ({
  isDealing,
  playerCount = 4,
  onDealComplete,
  onDealCard,
  onSkip
}) => {
  const actualPlayerCount = Math.min(4, Math.max(2, playerCount));
  const totalDeckCards = actualPlayerCount * 13;
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const [remainingDeckCards, setRemainingDeckCards] = useState<number>(totalDeckCards);
  const [isShuffling, setIsShuffling] = useState<boolean>(true);
  const deckRef = useRef<HTMLDivElement | null>(null);

  const isFinishedRef = useRef<boolean>(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    if (!isDealing) {
      clearAllTimeouts();
      setFlyingCards([]);
      setRemainingDeckCards(totalDeckCards);
      setIsShuffling(false);
      isFinishedRef.current = false;
      return;
    }

    isFinishedRef.current = false;
    setIsShuffling(true);
    setRemainingDeckCards(totalDeckCards);
    setFlyingCards([]);

    // 1. Giai đoạn Xào bài
    soundManager.playShuffle();

    // 2. Giai đoạn Chia bài xoay tròn
    const startDealingTimeout = setTimeout(() => {
      setIsShuffling(false);

      const seatIds = actualPlayerCount === 2 
        ? ['seat-p0', 'seat-p1']
        : actualPlayerCount === 3
        ? ['seat-p0', 'seat-p1', 'seat-p2']
        : ['seat-p0', 'seat-p1', 'seat-p2', 'seat-p3'];

      const totalCards = actualPlayerCount * 13;
      const delayPerCard = UI_TIMINGS.DEAL_CARD_INTERVAL_MS;

      for (let i = 0; i < totalCards; i++) {
        const t = setTimeout(() => {
          if (isFinishedRef.current) return;

          const playerIndex = i % actualPlayerCount;
          const targetSeatId = seatIds[playerIndex];
          const targetCount = Math.floor(i / actualPlayerCount) + 1;

          let dx = 0;
          let dy = 0;
          let rot = 0;

          // Đo đạc tọa độ thực tế giữa tâm cỗ bài và ghế người nhận
          const deckEl = deckRef.current || document.getElementById('dealing-center-deck');
          const targetEl = document.getElementById(targetSeatId);

          if (deckEl && targetEl) {
            const dR = deckEl.getBoundingClientRect();
            const tR = targetEl.getBoundingClientRect();
            const deckCenterX = dR.left + dR.width / 2;
            const deckCenterY = dR.top + dR.height / 2;
            const targetCenterX = tR.left + tR.width / 2;
            const targetCenterY = tR.top + tR.height / 2;

            dx = targetCenterX - deckCenterX;
            dy = targetCenterY - deckCenterY;
            rot = Math.round(Math.atan2(dy, dx) * (180 / Math.PI) + 90);
          } else {
            // Tọa độ dự phòng nếu chưa kịp render DOM
            const fallbackMap = actualPlayerCount === 2
              ? [
                  { dx: 0, dy: 240, rot: 0 },
                  { dx: 0, dy: -220, rot: 180 }
                ]
              : actualPlayerCount === 3
              ? [
                  { dx: 0, dy: 240, rot: 0 },
                  { dx: -280, dy: 0, rot: -90 },
                  { dx: 0, dy: -220, rot: 180 }
                ]
              : [
                  { dx: 0, dy: 240, rot: 0 },
                  { dx: -280, dy: 0, rot: -90 },
                  { dx: 0, dy: -220, rot: 180 },
                  { dx: 280, dy: 0, rot: 90 }
                ];
            dx = fallbackMap[playerIndex].dx;
            dy = fallbackMap[playerIndex].dy;
            rot = fallbackMap[playerIndex].rot;
          }

          // Âm thanh vút bài
          soundManager.playCardDeal(playerIndex * 0.4);

          // Tạo lá bài bay
          const newCard: FlyingCard = {
            id: Date.now() + i,
            dx,
            dy,
            rot
          };

          setFlyingCards(prev => [...prev.slice(-6), newCard]);
          setRemainingDeckCards(totalCards - (i + 1));

          // Khi lá bài bay tới ghế -> cập nhật số bài tăng lên
          const hitTimeout = setTimeout(() => {
            if (isFinishedRef.current) return;
            onDealCard(playerIndex, targetCount);
          }, UI_TIMINGS.DEAL_HIT_DELAY_MS);
          timeoutsRef.current.push(hitTimeout);

          // Khi lá cuối cùng bay tới đích
          if (i === totalCards - 1) {
            const finishTimeout = setTimeout(() => {
              if (isFinishedRef.current) return;
              isFinishedRef.current = true;
              for (let p = 0; p < actualPlayerCount; p++) {
                onDealCard(p, 13);
              }
              onDealComplete();
            }, UI_TIMINGS.DEAL_FINISH_DELAY_MS);
            timeoutsRef.current.push(finishTimeout);
          }
        }, i * delayPerCard);

        timeoutsRef.current.push(t);
      }
    }, 400);

    timeoutsRef.current.push(startDealingTimeout);

    return () => {
      clearAllTimeouts();
    };
  }, [isDealing]);

  const handleSkip = () => {
    isFinishedRef.current = true;
    clearAllTimeouts();
    setFlyingCards([]);
    setRemainingDeckCards(0);
    // Cập nhật đủ 13 lá cho tất cả
    for (let p = 0; p < 4; p++) {
      onDealCard(p, 13);
    }
    if (onSkip) {
      onSkip();
    } else {
      onDealComplete();
    }
  };

  if (!isDealing) return null;

  // Tính số lớp bài hiển thị tương ứng với số bài còn lại
  const stackLayersCount = Math.min(5, Math.ceil(remainingDeckCards / 10));

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 overflow-visible">
      {/* Vòng hào quang hoàng gia xoay nhẹ ở tâm */}
      <div className="absolute w-36 h-36 rounded-full border border-yellow-400/30 animate-spin-slow pointer-events-none" />

      {/* CỖ BÀI TRUNG TÂM NẰM CHÍNH XÁC TẠI TÂM BÀN */}
      <div
        id="dealing-center-deck"
        ref={deckRef}
        className="relative flex items-center justify-center"
      >
        {remainingDeckCards > 0 && (
          <div className={`deck-3d-stack ${isShuffling ? 'deck-shuffle-flourish' : ''}`}>
            {/* Lớp bóng đổ cỗ bài */}
            <div className="absolute inset-0 bg-black/80 rounded-lg blur-md transform translate-y-3 scale-95 pointer-events-none" />

            {/* Các lớp cạnh bài xếp chồng */}
            {Array.from({ length: stackLayersCount }).map((_, idx) => {
              const offset = (stackLayersCount - idx) * 1.5;
              return (
                <div
                  key={idx}
                  className="absolute inset-0 rounded-md shadow-xs pointer-events-none"
                  style={{
                    transform: `translate3d(${(idx % 2 === 0 ? 0.3 : -0.3)}px, ${offset}px, -${offset}px)`,
                    border: '1px solid #ca8a04',
                    background: 'linear-gradient(90deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)'
                  }}
                />
              );
            })}

            {/* Lá trên cùng (Lưng bài Tết đỏ ánh kim) */}
            <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-800 via-red-900 to-amber-950 border-2 border-[#d4af37] shadow-2xl flex items-center justify-center overflow-hidden">
              <span className="text-[10px] font-black text-yellow-300 drop-shadow">
                {isShuffling ? 'XÀO BÀI' : `${remainingDeckCards}`}
              </span>
            </div>
          </div>
        )}

        {/* CÁC LÁ BÀI BAY CHÍNH XÁC TỪ CỖ BÀI VỀ TÂM TỪNG GHẾ */}
        {flyingCards.map(fc => {
          const fcStyle: FlyingCardStyle = {
            '--dx': `${fc.dx}px`,
            '--dy': `${fc.dy}px`,
            '--rot': `${fc.rot}deg`
          };
          return (
            <div
              key={fc.id}
              className="fly-card-to-seat card-back-premium shadow-2xl pointer-events-none"
              style={fcStyle}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[#d4af37] text-xs">♠</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nút Bỏ qua Chia Bài (Skip Deal) */}
      <div className="absolute -bottom-8 pointer-events-auto z-50">
        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#182030] hover:bg-[#222c42] text-[#f3e5ab] border border-[#d4af37]/50 text-xs font-black shadow-xl transition-all duration-150 hover:scale-105 cursor-pointer"
        >
          <FastForward className="w-4 h-4 text-[#d4af37]" />
          <span>Bỏ qua ⏭</span>
        </button>
      </div>

      {/* Trạng thái chia bài */}
      <div className="absolute -top-8 bg-[#121724] px-4 py-1 rounded-full border border-[#d4af37]/40 text-[#f3e5ab] text-xs font-extrabold flex items-center gap-1.5 shadow-md">
        <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
        <span>{isShuffling ? 'Đang xào bài...' : `Đang chia bài ${actualPlayerCount} người...`}</span>
      </div>
    </div>
  );
};
