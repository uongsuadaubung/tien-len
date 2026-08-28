import React, { useState } from 'react';
import { AlertTriangle, CloudUpload, CloudDownload, Trophy, Coins, Calendar } from 'lucide-react';
import { Button, Badge } from '../../primitives';
import { getRankTierByElo } from '../../../engine/elo';
import { forceUploadToCloud, forceDownloadFromCloud } from '../../../engine/sync/sync-service';
import type { TienLenSaveData } from '../../../engine/sync/types';

export interface MobileSyncConflictViewProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: {
    localData: TienLenSaveData;
    cloudData: TienLenSaveData;
  } | null;
  onResolved?: () => void;
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return 'Không rõ';
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} • ${day}/${month}/${year}`;
}

export const MobileSyncConflictView: React.FC<MobileSyncConflictViewProps> = ({
  isOpen,
  onClose,
  conflictData,
  onResolved
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !conflictData) return null;

  const { localData, cloudData } = conflictData;
  const localRank = getRankTierByElo(localData.profile.elo);
  const cloudRank = getRankTierByElo(cloudData.profile.elo);

  const handleChooseLocal = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await forceUploadToCloud();
      onClose();
      if (onResolved) onResolved();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi ghi đè dữ liệu lên đám mây.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChooseCloud = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await forceDownloadFromCloud();
      onClose();
      if (onResolved) onResolved();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi áp dụng dữ liệu từ đám mây.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070b13] text-zinc-100 w-full h-full select-none animate-in fade-in duration-200 overflow-hidden">
      
      {/* 1. TOP APP BAR NATIVE (TUYỆT ĐỐI KHÔNG CÓ NÚT QUAY LẠI / ĐÓNG - BẮT BUỘC CHỌN) */}
      <header className="sticky top-0 z-20 w-full bg-[#0e1422] border-b border-[#222c3d] pt-[max(env(safe-area-inset-top),8px)] pb-2.5 px-3 sm:px-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#281e08] border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider truncate">
              Xung Đột Dữ Liệu Đồng Bộ
            </h2>
            <p className="text-[10px] text-zinc-400 truncate">
              Bắt buộc chọn 1 bản để tiếp tục (không thể bỏ qua)
            </p>
          </div>
        </div>

        <span className="bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 animate-pulse">
          Cần Chọn
        </span>
      </header>

      {/* 2. BODY NỘI DUNG SO SÁNH 2 BẢN LƯU */}
      <main className="flex-1 overflow-y-auto pt-2.5 pb-4 px-3 sm:px-4 space-y-3 custom-scrollbar bg-[#070b13]">
        <div className="max-w-2xl mx-auto space-y-3">
          
          {/* Lời giải thích cảnh báo */}
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed shadow">
            Tiến trình trên máy này và bản lưu đám mây đều đã thay đổi kể từ lần đồng bộ trước. Vui lòng xem so sánh dưới đây và chọn bản bạn muốn giữ lại:
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* LƯỚI SO SÁNH 2 BÊN (LOCAL VS CLOUD) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* CỘT 1: BẢN TRÊN MÁY NÀY (LOCAL) */}
            <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-[#0e1422] flex flex-col justify-between gap-3 shadow-lg">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#222c3d]">
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-amber-400 uppercase tracking-wide">
                    <span>💻</span>
                    <span>Bản Trên Máy Này</span>
                  </div>
                  <Badge variant="gold" size="sm">Local</Badge>
                </div>

                {/* Profile Local */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#141b2b] border border-[#2a3449] flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    {localData.profile.avatar || '🤠'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-zinc-100 truncate">
                      {localData.profile.name || 'Chưa Đặt Tên'}
                    </div>
                    <div className="text-[11px] text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                      <span>{localRank.badge}</span>
                      <span>{localRank.name}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">({localData.profile.elo} Elo)</span>
                    </div>
                  </div>
                </div>

                {/* Chỉ số Local */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                  <div className="p-2 rounded-xl bg-[#141b2b] border border-[#2a3449]">
                    <div className="text-[9px] text-zinc-400 flex items-center gap-1 font-bold uppercase">
                      <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Tài Sản</span>
                    </div>
                    <div className="font-black text-amber-400 mt-0.5 text-xs sm:text-sm">
                      {localData.profile.coins.toLocaleString()} Xu
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#141b2b] border border-[#2a3449]">
                    <div className="text-[9px] text-zinc-400 flex items-center gap-1 font-bold uppercase">
                      <Trophy className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Thắng / Tổng</span>
                    </div>
                    <div className="font-black text-zinc-100 mt-0.5 text-xs sm:text-sm">
                      {localData.profile.stats.wins} / {localData.profile.stats.gamesPlayed}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 pt-0.5">
                  <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Cập nhật: {formatTime(localData.updatedAt)}</span>
                </div>
              </div>

              {/* Nút hành động Local */}
              <div className="pt-2 border-t border-[#222c3d] mt-auto">
                <Button
                  variant="gold"
                  size="md"
                  fullWidth
                  onClick={handleChooseLocal}
                  disabled={isProcessing}
                  leftIcon={<CloudUpload className="w-4 h-4 shrink-0" />}
                  className="font-black text-xs py-2 shadow-lg"
                >
                  Giữ Bản Trên Máy (Ghi Đè Gist)
                </Button>
              </div>
            </div>

            {/* CỘT 2: BẢN TRÊN GITHUB GIST (CLOUD) */}
            <div className="p-3.5 rounded-2xl border border-sky-500/40 bg-[#0e1422] flex flex-col justify-between gap-3 shadow-lg">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#222c3d]">
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-sky-400 uppercase tracking-wide">
                    <span>☁️</span>
                    <span>Bản Trên GitHub Gist</span>
                  </div>
                  <Badge variant="sapphire" size="sm">Cloud</Badge>
                </div>

                {/* Profile Cloud */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#141b2b] border border-[#2a3449] flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    {cloudData.profile.avatar || '🤠'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-zinc-100 truncate">
                      {cloudData.profile.name || 'Chưa Đặt Tên'}
                    </div>
                    <div className="text-[11px] text-sky-400 font-semibold mt-0.5 flex items-center gap-1">
                      <span>{cloudRank.badge}</span>
                      <span>{cloudRank.name}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">({cloudData.profile.elo} Elo)</span>
                    </div>
                  </div>
                </div>

                {/* Chỉ số Cloud */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                  <div className="p-2 rounded-xl bg-[#141b2b] border border-[#2a3449]">
                    <div className="text-[9px] text-zinc-400 flex items-center gap-1 font-bold uppercase">
                      <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Tài Sản</span>
                    </div>
                    <div className="font-black text-amber-400 mt-0.5 text-xs sm:text-sm">
                      {cloudData.profile.coins.toLocaleString()} Xu
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#141b2b] border border-[#2a3449]">
                    <div className="text-[9px] text-zinc-400 flex items-center gap-1 font-bold uppercase">
                      <Trophy className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Thắng / Tổng</span>
                    </div>
                    <div className="font-black text-zinc-100 mt-0.5 text-xs sm:text-sm">
                      {cloudData.profile.stats.wins} / {cloudData.profile.stats.gamesPlayed}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 pt-0.5">
                  <Calendar className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="truncate">Cập nhật: {formatTime(cloudData.updatedAt)}</span>
                </div>
              </div>

              {/* Nút hành động Cloud */}
              <div className="pt-2 border-t border-[#222c3d] mt-auto">
                <Button
                  variant="surface"
                  size="md"
                  fullWidth
                  onClick={handleChooseCloud}
                  disabled={isProcessing}
                  leftIcon={<CloudDownload className="w-4 h-4 shrink-0 text-sky-400" />}
                  className="font-bold text-xs py-2 border-sky-500/40 text-sky-300 hover:bg-sky-500/10 shadow-lg"
                >
                  Tải Bản Gist Về Máy (Ghi Đè Local)
                </Button>
              </div>
            </div>

          </div>

          <div className="text-[10px] text-zinc-400 text-center pt-1 leading-relaxed">
            💡 <em>Mọi lần ghi đè đều được bảo lưu vĩnh viễn trong lịch sử Git của Gist. Bạn có thể mở Cài Đặt ➔ Lịch Sử Gist để khôi phục bất cứ lúc nào.</em>
          </div>

        </div>
      </main>

    </div>
  );
};
