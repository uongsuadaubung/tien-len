import React from 'react';
import { Skull, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useViewStore } from '../../../stores/useViewStore';
import { useUserStore } from '../../../stores/useUserStore';
import { Modal, Card, Button, Badge } from '../../primitives';
import { useI18n } from '../../../locales';

interface ConfirmForfeitModalProps {
  onConfirmForfeit: () => void;
}

export const ConfirmForfeitModal: React.FC<ConfirmForfeitModalProps> = ({ onConfirmForfeit }) => {
  const { t } = useI18n();
  const { isConfirmForfeitOpen, closeModal, forfeitData } = useViewStore();
  const { profile } = useUserStore();

  if (!isConfirmForfeitOpen) return null;

  const depositAmount = forfeitData?.depositAmount ?? 0;
  const isRanked = forfeitData?.isRanked ?? false;
  const eloPenalty = forfeitData?.eloPenalty ?? 30;

  return (
    <Modal
      isOpen={isConfirmForfeitOpen}
      onClose={() => closeModal('CONFIRM_FORFEIT')}
      title={t('forfeit.title')}
      subtitle={t('forfeit.message')}
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
            {t('forfeit.cancel')}
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              closeModal('CONFIRM_FORFEIT');
              onConfirmForfeit();
            }}
          >
            {t('forfeit.confirm')}
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
              {t('forfeit.penaltyApplied')}
            </span>
            {!isRanked && (
              <span className="text-[var(--text-muted)] text-[11px]">
                {t('forfeit.walletRemaining')} <strong className="text-[var(--color-gold)]">{profile.coins.toLocaleString()} Xu</strong>
              </span>
            )}
          </div>

          <div className="space-y-2">
            {depositAmount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{t('forfeit.depositPenaltyTitle')}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{t('forfeit.depositPenaltyDesc')}</div>
                </div>
                <Badge variant="danger" size="md">
                  -{depositAmount.toLocaleString()} Xu
                </Badge>
              </div>
            )}

            {eloPenalty > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{t('forfeit.eloPenaltyTitle')}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{t('forfeit.eloPenaltyDesc')}</div>
                </div>
                <Badge variant="danger" size="md">
                  -{eloPenalty} Elo
                </Badge>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-gold)] shrink-0" />
            <span>{t('forfeit.statsPenaltyDesc')}</span>
          </div>
        </Card>
      </div>
    </Modal>
  );
};
