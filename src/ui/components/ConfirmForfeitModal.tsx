import React from 'react';
import { Skull, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { Modal, Card, Button, Badge } from '../primitives';

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
    <Modal
      isOpen={isConfirmForfeitOpen}
      onClose={() => closeModal('CONFIRM_FORFEIT')}
      title="Cảnh Báo Xử Thua Bỏ Cuộc"
      subtitle="Ván đấu đang diễn ra gay cấn! Nếu rời bàn bây giờ, bạn sẽ bị xử thua."
      icon={<Skull className="w-5 h-5 text-[#f87171]" />}
      maxWidth="md"
      height="auto"
      footer={
        <div className="w-full flex items-center justify-end gap-2">
          <Button
            variant="surface"
            size="md"
            onClick={() => closeModal('CONFIRM_FORFEIT')}
          >
            Tiếp Tục Đánh
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              closeModal('CONFIRM_FORFEIT');
              onConfirmForfeit();
            }}
          >
            Chấp Nhận Xử Thua
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Khung Chi Tiết Phạt */}
        <Card variant="card" className="p-3.5 space-y-3 border-[var(--color-ruby-border)]">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#f87171]" />
              Hình phạt áp dụng:
            </span>
            {!isRanked && (
              <span className="text-[var(--text-muted)] text-[11px]">
                Ví còn: <strong className="text-[var(--color-gold)]">{profile.coins.toLocaleString()} Xu</strong>
              </span>
            )}
          </div>

          <div className="space-y-2">
            {depositAmount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Mất Tiền Cọc Bàn Đấu</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Đền phạt Cóng theo quy định</div>
                </div>
                <Badge variant="danger" size="md">
                  -{depositAmount.toLocaleString()} Xu
                </Badge>
              </div>
            )}

            {eloPenalty > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Phạt Điểm Rank (Elo)</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Xử thua Hạng 4 Bét Bảng</div>
                </div>
                <Badge variant="danger" size="md">
                  -{eloPenalty} Elo
                </Badge>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-gold)] shrink-0" />
            <span>Thống kê sẽ ghi nhận thêm 1 trận thua và ngắt chuỗi thắng.</span>
          </div>
        </Card>
      </div>
    </Modal>
  );
};
