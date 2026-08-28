import React, { useState } from 'react';
import { AlertTriangle, CloudUpload, CloudDownload, Trophy, Coins, Calendar } from 'lucide-react';
import { Modal, Button, Card, Badge } from '../../primitives';
import { getRankTierByElo } from '../../../engine/elo';
import { forceUploadToCloud, forceDownloadFromCloud } from '../../../engine/sync/sync-service';
import type { TienLenSaveData } from '../../../engine/sync/types';

interface SyncConflictModalProps {
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

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      preventClose={true}
      showCloseButton={false}
      maxWidth="2xl"
      height="h-auto"
      title="Phát Hiện Xung Đột Dữ Liệu Đồng Bộ"
      subtitle="Cả máy này và GitHub Gist đều có dữ liệu mới. Bắt buộc chọn bản bạn muốn giữ lại."
      icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
    >
      <div className="space-y-4">
        {/* Lời giải thích */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
          Tiến trình trên máy này và bản lưu đám mây đều đã thay đổi kể từ lần đồng bộ trước. Hãy xem so sánh dưới đây và chọn bản bạn muốn sử dụng tiếp:
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* So sánh 2 bên */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* CỘT 1: BẢN TRÊN THIẾT BỊ NÀY (LOCAL) */}
          <Card variant="card" className="p-4 flex flex-col justify-between border-amber-500/40 bg-[var(--bg-container)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-card)]">
                <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-gold)]">
                  <span>💻</span>
                  <span>Bản Trên Máy Này</span>
                </div>
                <Badge variant="gold" size="sm">Local</Badge>
              </div>

              {/* Thông tin Profile */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-2xl shrink-0">
                  {localData.profile.avatar || '🤠'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                    {localData.profile.name || 'Chưa Đặt Tên'}
                  </div>
                  <div className="text-[11px] text-[var(--color-gold)] font-semibold mt-0.5 flex items-center gap-1">
                    <span>{localRank.badge}</span>
                    <span>{localRank.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">({localData.profile.elo} Elo)</span>
                  </div>
                </div>
              </div>

              {/* Chỉ số chi tiết */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)]">
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                    <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Tài Sản</span>
                  </div>
                  <div className="font-bold text-[var(--color-gold)] mt-0.5">
                    {localData.profile.coins.toLocaleString()} Xu
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)]">
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                    <Trophy className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Thắng / Tổng</span>
                  </div>
                  <div className="font-bold text-[var(--text-primary)] mt-0.5">
                    {localData.profile.stats.wins} / {localData.profile.stats.gamesPlayed}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 pt-0.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Cập nhật: {formatTime(localData.updatedAt)}</span>
              </div>
            </div>

            {/* Nút hành động Local */}
            <div className="pt-4 mt-auto">
              <Button
                variant="gold"
                size="md"
                fullWidth
                onClick={handleChooseLocal}
                disabled={isProcessing}
                leftIcon={<CloudUpload className="w-4 h-4 shrink-0" />}
              >
                Giữ Bản Trên Máy (Ghi Đè Gist)
              </Button>
            </div>
          </Card>

          {/* CỘT 2: BẢN TRÊN GITHUB GIST (CLOUD) */}
          <Card variant="card" className="p-4 flex flex-col justify-between border-sky-500/40 bg-[var(--bg-container)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-card)]">
                <div className="flex items-center gap-2 font-bold text-sm text-sky-400">
                  <span>☁️</span>
                  <span>Bản Trên GitHub Gist</span>
                </div>
                <Badge variant="sapphire" size="sm">Cloud</Badge>
              </div>

              {/* Thông tin Profile Cloud */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-2xl shrink-0">
                  {cloudData.profile.avatar || '🤠'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                    {cloudData.profile.name || 'Chưa Đặt Tên'}
                  </div>
                  <div className="text-[11px] text-sky-400 font-semibold mt-0.5 flex items-center gap-1">
                    <span>{cloudRank.badge}</span>
                    <span>{cloudRank.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">({cloudData.profile.elo} Elo)</span>
                  </div>
                </div>
              </div>

              {/* Chỉ số chi tiết Cloud */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)]">
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                    <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Tài Sản</span>
                  </div>
                  <div className="font-bold text-[var(--color-gold)] mt-0.5">
                    {cloudData.profile.coins.toLocaleString()} Xu
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)]">
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Thắng / Tổng</span>
                  </div>
                  <div className="font-bold text-[var(--text-primary)] mt-0.5">
                    {cloudData.profile.stats.wins} / {cloudData.profile.stats.gamesPlayed}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 pt-0.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Cập nhật: {formatTime(cloudData.updatedAt)}</span>
              </div>
            </div>

            {/* Nút hành động Cloud */}
            <div className="pt-4 mt-auto">
              <Button
                variant="surface"
                size="md"
                fullWidth
                onClick={handleChooseCloud}
                disabled={isProcessing}
                leftIcon={<CloudDownload className="w-4 h-4 shrink-0 text-sky-400" />}
                className="border-sky-500/40 text-sky-300 hover:bg-sky-500/10"
              >
                Tải Bản Gist Về Máy
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-[11px] text-[var(--text-muted)] text-center pt-1">
          💡 <em>Mọi lần ghi đè đều được bảo lưu vĩnh viễn trong lịch sử Git của Gist. Bạn có thể mở Cài Đặt ➔ Lịch Sử Gist để khôi phục bất cứ lúc nào.</em>
        </div>
      </div>
    </Modal>
  );
};
