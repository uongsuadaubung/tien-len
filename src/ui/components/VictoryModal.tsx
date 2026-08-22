import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../../engine/types';
import { Trophy, Sparkles, RefreshCw, Flame } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  onNextGame: () => void;
  winners: Player[];
  allPlayers: Player[];
  betAmount: number;
  instantWinType?: string;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onNextGame,
  winners,
  allPlayers,
  betAmount,
  instantWinType
}) => {
  useEffect(() => {
    if (isOpen) {
      // Pháo hoa Tết rực rỡ
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f9b208', '#c01e2e', '#ffdf00', '#2d6a4f', '#ffffff']
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#f9b208', '#c01e2e', '#ffdf00']
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#f9b208', '#c01e2e', '#ffdf00']
        });
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const winner = winners[0] || allPlayers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#200609] border-2 border-yellow-500 rounded-3xl p-6 shadow-2xl text-white text-center">
        {/* Biểu tượng cúp vàng */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-4 border-yellow-300 text-red-950 text-4xl shadow-xl shadow-yellow-500/40 mb-3 animate-bounce">
          🏆
        </div>

        <h2 className="text-2xl font-black text-yellow-300 tracking-wide">
          {instantWinType ? 'TỚI TRẮNG ĐẶC BIỆT!' : 'KẾT THÚC VÁN BÀI!'}
        </h2>

        <p className="text-sm font-semibold text-yellow-100/80 mt-1 mb-6">
          Chúc mừng <span className="text-yellow-300 font-extrabold">{winner.name}</span> đã giành chiến thắng mở bát xuân này!
        </p>

        {/* Bảng Xếp Hạng 4 Người */}
        <div className="space-y-2 mb-6">
          {winners.map((p, idx) => {
            const rankLabel = idx === 0 ? '🥇 VỀ NHẤT' : idx === 1 ? '🥈 VỀ NHÌ' : idx === 2 ? '🥉 VỀ BA' : '💥 VỀ BÉT';
            const isWinner = idx === 0;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-2xl border ${
                  isWinner
                    ? 'bg-gradient-to-r from-amber-950 to-yellow-950/80 border-yellow-400 text-yellow-100 shadow-md ring-1 ring-yellow-400'
                    : 'bg-black/40 border-yellow-500/20 text-yellow-200/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.avatar}</span>
                  <div className="text-left">
                    <div className="font-extrabold text-sm text-yellow-300">{p.name}</div>
                    <span className="text-[11px] font-bold text-amber-400/90">{rankLabel}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-sm text-yellow-300">
                    {p.score.toLocaleString()} 🧧
                  </div>
                  {p.hand.length > 0 && (
                    <div className="text-[10px] font-bold text-red-400">
                      Còn {p.hand.length} lá
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Nút Đánh Ván Tiếp Theo */}
        <button
          onClick={onNextGame}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-red-950 font-black text-base uppercase tracking-wider hover:scale-105 transition-all shadow-xl shadow-yellow-500/40 border border-yellow-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Đánh Ván Tiếp Theo (Người Thắng Đi Đầu)</span>
        </button>
      </div>
    </div>
  );
};
