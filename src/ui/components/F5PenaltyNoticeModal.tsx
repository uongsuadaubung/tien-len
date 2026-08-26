import React from 'react';
import { AlertOctagon, Check } from 'lucide-react';
import { useModalStore } from '../../stores/useModalStore';
import { Modal, Card, Button, Badge } from '../primitives';

export const F5PenaltyNoticeModal: React.FC = () => {
  const { isF5PenaltyNoticeOpen, closeModal, f5PenaltyData } = useModalStore();

  if (!isF5PenaltyNoticeOpen) return null;

  const depositLost = f5PenaltyData?.depositLost ?? 0;
  const isRanked = f5PenaltyData?.isRanked ?? false;
  const eloLost = f5PenaltyData?.eloLost ?? 30;

  return (
    <Modal
      isOpen={isF5PenaltyNoticeOpen}
      onClose={() => closeModal('F5_PENALTY_NOTICE')}
      title="Phát Hiện Thoát Ngang / Tải Lại Trang"
      subtitle="Hệ thống phát hiện ván đấu trước của bạn bị gián đoạn. Bạn đã bị xử thua Bỏ Cuộc."
      icon={<AlertOctagon className="w-5 h-5 text-[#f87171]" />}
      maxWidth="md"
      height="auto"
      footer={
        <Button
          variant="gold"
          size="md"
          fullWidth
          onClick={() => closeModal('F5_PENALTY_NOTICE')}
          leftIcon={<Check className="w-4 h-4 text-[#0a0c0e]" />}
        >
          Đã Hiểu &amp; Quay Lại Sảnh
        </Button>
      }
    >
      <div className="space-y-3">
        <Card variant="card" className="p-3.5 space-y-3 border-[var(--color-ruby-border)]">
          <div className="space-y-2">
            {depositLost > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Tiền Cọc Bàn Bị Tịch Thu</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Đền bù tiền Cóng cho bàn đấu</div>
                </div>
                <Badge variant="danger" size="md">
                  -{depositLost.toLocaleString()} Xu
                </Badge>
              </div>
            )}

            {eloLost > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Điểm Xếp Hạng Bị Trừ</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Xử thua Hạng 4 Bét Bảng</div>
                </div>
                <Badge variant="danger" size="md">
                  -{eloLost} Elo
                </Badge>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[var(--text-muted)] space-y-1">
            <p>• Đã ghi nhận <strong>+1 Trận Thua</strong> vào hồ sơ cá nhân.</p>
            <p>• Chuỗi thắng liên tiếp đã bị thiết lập lại về <strong>0</strong>.</p>
          </div>
        </Card>
      </div>
    </Modal>
  );
};
