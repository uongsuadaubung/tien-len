import React from 'react';
import { AlertOctagon, Coins, Trophy, Check } from 'lucide-react';
import { useModalStore } from '../../stores/useModalStore';

export const F5PenaltyNoticeModal: React.FC = () => {
  const { isF5PenaltyNoticeOpen, closeModal, f5PenaltyData } = useModalStore();

  if (!isF5PenaltyNoticeOpen) return null;

  const depositLost = f5PenaltyData?.depositLost ?? 0;
  const isRanked = f5PenaltyData?.isRanked ?? false;
  const eloLost = f5PenaltyData?.eloLost ?? 30;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 select-none">
      <div className="relative w-full max-w-md bg-[#121724] border border-red-500/60 rounded-2xl p-6 shadow-2xl text-white">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 mb-3 shadow">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-red-400 uppercase tracking-wider">
            Phát Hiện Thoát Ngang / Tải Lại Trang
          </h2>
          <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed">
            Hệ thống phát hiện ván đấu trước của bạn bị gián đoạn (F5 / Đóng ứng dụng). Bạn đã bị xử thua Bỏ Cuộc (Forfeit).
          </p>
        </div>

        {/* Khung Chi Tiết Phạt */}
        <div className="my-5 p-4 rounded-xl bg-[#0a0d14] border border-red-500/30 space-y-3">
          {!isRanked ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#182030] border border-red-500/20">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#d4af37]" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Tiền Cọc Bàn Bị Tịch Thu</div>
                  <div className="text-[10px] text-slate-400">Đền bù tiền Cóng cho bàn đấu</div>
                </div>
              </div>
              <span className="text-sm font-black text-red-400">
                -{depositLost.toLocaleString()} Xu
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#182030] border border-red-500/20">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#d4af37]" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Điểm Xếp Hạng Bị Trừ</div>
                  <div className="text-[10px] text-slate-400">Xử thua Hạng 4 (Bét Bảng)</div>
                </div>
              </div>
              <span className="text-sm font-black text-red-400">
                -{eloLost} Elo
              </span>
            </div>
          )}

          <div className="text-[11px] text-slate-400">
            • Đã ghi nhận <strong>+1 Trận Thua</strong> vào thống kê hồ sơ cá nhân.
            <br />
            • Chuỗi thắng liên tiếp đã bị thiết lập lại về <strong>0</strong>.
          </div>
        </div>

        <button
          onClick={() => closeModal('F5_PENALTY_NOTICE')}
          className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa8620] hover:from-[#f3e5ab] hover:to-[#d4af37] text-[#0a0d14] font-black text-xs uppercase tracking-wider shadow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#ffe699]"
        >
          <Check className="w-4 h-4" />
          <span>Đã Hiểu & Quay Lại Sảnh</span>
        </button>
      </div>
    </div>
  );
};
