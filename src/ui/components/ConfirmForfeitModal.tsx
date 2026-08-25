import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowLeft, Skull, Coins, Trophy, Wallet } from 'lucide-react';
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';

interface ConfirmForfeitModalProps {
  onConfirmForfeit: () => void;
}

export const ConfirmForfeitModal: React.FC<ConfirmForfeitModalProps> = ({ onConfirmForfeit }) => {
  const { isConfirmForfeitOpen, closeModal, forfeitData } = useModalStore();
  const { profile } = useUserStore();

  if (!isConfirmForfeitOpen) return null;

  const depositAmount = forfeitData?.depositAmount ?? 0;
  const isRanked = forfeitData?.isRanked ?? false;
  const eloPenalty = forfeitData?.eloPenalty ?? 30;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-red-950 via-neutral-950 to-black border-2 border-red-500/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.3)] text-white animate-scale-up">
        {/* Glow Header Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 mb-3 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse">
            <Skull className="w-9 h-9" />
          </div>

          <h2 className="text-xl font-black text-red-400 uppercase tracking-wider flex items-center gap-2">
            Cảnh Báo Xử Thua Bỏ Cuộc
          </h2>
          <p className="text-xs text-neutral-300 mt-1.5 font-medium">
            Ván đấu đang diễn ra gay cấn! Nếu rời bàn ngay bây giờ, bạn sẽ bị coi là bỏ cuộc (Forfeit).
          </p>
        </div>

        {/* Khung Chi Tiết Phạt */}
        <div className="my-5 p-4 rounded-2xl bg-neutral-900/90 border border-red-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-yellow-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Hình phạt áp dụng lập tức:
            </span>
            {!isRanked && (
              <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-yellow-400" />
                Ví còn: <strong className="text-yellow-300">{profile.coins.toLocaleString()} Xu</strong>
              </span>
            )}
          </div>

          {!isRanked ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-red-500/20">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-xs font-bold text-neutral-200">Mất Toàn Bộ Tiền Cọc Bàn</div>
                  <div className="text-[10px] text-neutral-400">Đền phạt Cóng cho toàn sòng</div>
                </div>
              </div>
              <span className="text-sm font-black text-red-400">
                -{depositAmount.toLocaleString()} Xu
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-red-500/20">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-neutral-200">Phạt Điểm Xếp Hạng (Elo)</div>
                  <div className="text-[10px] text-neutral-400">Xử thua Hạng 4 (Bét Bảng)</div>
                </div>
              </div>
              <span className="text-sm font-black text-red-400">
                -{eloPenalty} Elo
              </span>
            </div>
          )}

          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Thống kê sẽ ghi nhận thêm 1 trận thua và ngắt chuỗi thắng.</span>
          </div>
        </div>

        {/* Nút Hành Động */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Tiếp tục chơi */}
          <button
            onClick={() => closeModal('CONFIRM_FORFEIT')}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-red-950 font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-yellow-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tiếp Tục Đánh</span>
          </button>

          {/* Chấp nhận xử thua */}
          <button
            onClick={() => {
              closeModal('CONFIRM_FORFEIT');
              onConfirmForfeit();
            }}
            className="py-3 px-4 rounded-2xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/50 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:text-white"
          >
            <Skull className="w-4 h-4 text-red-400" />
            <span>Xử Thua & Rời Bàn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
