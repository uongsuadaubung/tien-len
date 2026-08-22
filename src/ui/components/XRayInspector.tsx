import React from 'react';
import { Card, PlayedMove, Rank, Suit } from '../../engine/types';
import { ALL_RANKS, ALL_SUITS, RANK_NAMES, SUIT_SYMBOLS, createCard, isRedCard } from '../../engine/card';
import { CardTracker } from '../../ai/card-tracker';
import { MoveHint } from '../../ai/hint-engine';
import { Eye, ShieldAlert, Sparkles, X, BrainCircuit, CheckCircle2 } from 'lucide-react';

interface XRayInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  tracker: CardTracker;
  ownHand: Card[];
  currentHint: MoveHint | null;
}

export const XRayInspector: React.FC<XRayInspectorProps> = ({
  isOpen,
  onClose,
  tracker,
  ownHand,
  currentHint
}) => {
  if (!isOpen) return null;

  const twoSafety = tracker.getTwoSafetyReport();
  const opponentBlindspots = tracker.getOpponentBlindspotsSummary();
  const ownHandCardIds = new Set(ownHand.map(c => c.id));
  const dangerousRanks: Rank[] = twoSafety.dangerousFourOfAKindRanks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a0508] border-2 border-yellow-500/80 rounded-3xl p-6 shadow-2xl text-white">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-yellow-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="flex items-center gap-3 border-b border-yellow-500/30 pb-4 mb-5">
          <div className="p-2.5 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 text-yellow-400">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-yellow-300 tracking-wide flex items-center gap-2">
              Bộ Nhớ Soi Bài & Huấn Luyện AI (X-Ray Inspector V2)
            </h2>
            <p className="text-xs text-yellow-100/70">
              Quan sát bộ nhớ đếm bài chuẩn xác 100% của AI, bản đồ điểm mù đối thủ và phân tích độ an toàn khi ra Heo.
            </p>
          </div>
        </div>

        {/* Khung Gợi Ý Nước Đi Realtime */}
        {currentHint && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 to-red-950/80 border border-purple-400/50 shadow-lg">
            <div className="flex items-center gap-2 text-purple-300 font-extrabold text-sm mb-1.5">
              <BrainCircuit className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span>PHÂN TÍCH CHIẾN THUẬT REALTIME:</span>
            </div>
            <p className="text-sm font-medium text-yellow-100 leading-relaxed">
              {currentHint.explanation}
            </p>
          </div>
        )}

        {/* Thước Đo An Toàn Ra Heo (Bayesian Two Safety Meter) */}
        <div className="mb-5 p-4 rounded-2xl bg-black/40 border border-yellow-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-yellow-300" />
              <span>Chỉ Số An Toàn Khi Đánh Heo (Bayesian Two Safety)</span>
            </h3>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
              twoSafety.isSafe
                ? 'bg-emerald-950 text-emerald-400 border-emerald-500'
                : twoSafety.riskScore < 50
                ? 'bg-amber-950 text-yellow-300 border-yellow-500'
                : 'bg-red-950 text-red-400 border-red-500'
            }`}>
              {twoSafety.isSafe ? '100% AN TOÀN' : `RỦI RO: ${twoSafety.riskScore}%`}
            </span>
          </div>
          <p className="text-xs text-yellow-100/70 mb-3">
            {twoSafety.isSafe
              ? 'Tất cả các Rank bài đều đã có lá xuất hiện trên bàn. Không còn bất kỳ nguy cơ Tứ Quý nào!'
              : `Còn ${twoSafety.dangerousFourOfAKindRanks.length} rank có nguy cơ Tứ Quý còn nguyên (${twoSafety.dangerousFourOfAKindRanks.map(r => (RANK_NAMES as Record<number, string>)[r] || String(r)).join(', ')}).`}
          </p>
          <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden border border-neutral-700">
            <div
              className={`h-full transition-all duration-500 ${
                twoSafety.isSafe
                  ? 'bg-emerald-500 w-full'
                  : twoSafety.riskScore < 50
                  ? 'bg-amber-500'
                  : 'bg-red-600'
              }`}
              style={{ width: twoSafety.isSafe ? '100%' : `${100 - twoSafety.riskScore}%` }}
            ></div>
          </div>
        </div>

        {/* Bản Đồ Điểm Mù Đối Thủ (Opponent Blindspots) */}
        {Object.keys(opponentBlindspots).length > 0 && (
          <div className="mb-5 p-4 rounded-2xl bg-black/40 border border-yellow-500/30">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>Bản Đồ Điểm Mù Đối Thủ (Bộ bài từng Bỏ Lượt)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Object.entries(opponentBlindspots).map(([playerId, weaknesses]) => (
                <div key={playerId} className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-700 text-xs">
                  <span className="font-bold text-yellow-300 block mb-1">
                    {playerId === 'p0' ? 'Bạn' : playerId === 'p1' ? 'Bé Năm' : playerId === 'p2' ? 'Chú Bảy' : 'Cô Ba'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {weaknesses.map((w, idx) => (
                      <span key={idx} className="bg-red-950/60 text-red-300 px-1.5 py-0.5 rounded text-[10px] border border-red-500/30">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tình trạng 4 Con Heo (2) */}
        <div className="mb-5 p-4 rounded-2xl bg-black/40 border border-yellow-500/30">
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Radar Theo Dõi 4 Lá Heo (2)</span>
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {ALL_SUITS.map(suit => {
              const card = createCard(15, suit);
              const isPlayed = tracker.isCardPlayed(card);
              const isHeldByMe = ownHandCardIds.has(card.id);
              const isRed = isRedCard(card);

              return (
                <div
                  key={suit}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    isPlayed
                      ? 'bg-neutral-900/60 border-neutral-700/40 opacity-40'
                      : isHeldByMe
                      ? 'bg-amber-950/70 border-amber-400 text-amber-200'
                      : 'bg-red-950/70 border-red-500/80 text-white'
                  }`}
                >
                  <span className={`font-black text-base ${isRed ? 'text-red-400' : 'text-slate-200'}`}>
                    2{SUIT_SYMBOLS[suit]}
                  </span>
                  <span className="text-[11px] font-bold">
                    {isPlayed ? 'Đã Đánh' : isHeldByMe ? 'Trên Tay Bạn' : 'Trong Tay Đối Thủ'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cảnh Báo Nguy Cơ Tứ Quý */}
        <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-yellow-500/30">
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Cảnh Báo Nguy Cơ Tứ Quý Còn Nguyên</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {dangerousRanks.length > 0 ? (
              dangerousRanks.map(rank => (
                <span
                  key={rank}
                  className="px-3 py-1 rounded-lg bg-red-900/80 border border-red-500 text-xs font-black text-yellow-200"
                >
                  Tứ Quý {RANK_NAMES[rank]} (?)
                </span>
              ))
            ) : (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> An toàn! Mọi số đều đã có lá xuất hiện trên bàn hoặc trên tay bạn.
              </span>
            )}
          </div>
        </div>

        {/* Bảng Ma Trận 52 Lá Bài Toàn Cục */}
        <div className="p-4 rounded-2xl bg-black/40 border border-yellow-500/30">
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3">
            Ma Trận Toàn Bộ 52 Lá Bài
          </h3>
          <div className="grid grid-cols-13 gap-1.5 text-center text-xs">
            {ALL_RANKS.map(rank => (
              <div key={rank} className="flex flex-col gap-1">
                <span className="font-extrabold text-yellow-400 text-xs pb-1 border-b border-yellow-500/20">
                  {RANK_NAMES[rank]}
                </span>
                {ALL_SUITS.map(suit => {
                  const card = createCard(rank, suit);
                  const isPlayed = tracker.isCardPlayed(card);
                  const isHeld = ownHandCardIds.has(card.id);
                  const isRed = isRedCard(card);

                  return (
                    <div
                      key={suit}
                      title={`${RANK_NAMES[rank]}${SUIT_SYMBOLS[suit]} - ${isPlayed ? 'Đã đánh' : isHeld ? 'Trên tay' : 'Chưa ra'}`}
                      className={`
                        h-7 flex items-center justify-center rounded font-bold text-xs transition-all
                        ${isPlayed
                          ? 'bg-neutral-800 text-neutral-600 line-through opacity-30'
                          : isHeld
                          ? 'bg-amber-400 text-red-950 ring-1 ring-amber-200'
                          : isRed
                          ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                          : 'bg-slate-900 text-slate-300 border border-slate-700'
                        }
                      `}
                    >
                      {SUIT_SYMBOLS[suit]}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
