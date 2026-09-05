import React from 'react';
import { AlertOctagon, Check } from 'lucide-react';
import type { F5PenaltyData } from '../../../stores/useViewStore';
import { useI18n } from '../../../locales';
import { Modal, Card, Button, Badge } from '../../primitives';

interface F5PenaltyNoticeModalProps {
  data: F5PenaltyData;
  onClose: () => void;
}

export const F5PenaltyNoticeModal: React.FC<F5PenaltyNoticeModalProps> = ({ data, onClose }) => {
  const { t } = useI18n();
  const { depositLost, eloLost } = data;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('f5Penalty.modalTitle')}
      subtitle={t('f5Penalty.modalSubtitle')}
      icon={<AlertOctagon className="w-5 h-5 text-[#f87171]" />}
      maxWidth="md"
      height="auto"
      footer={
        <Button
          variant="gold"
          size="md"
          fullWidth
          onClick={onClose}
          leftIcon={<Check className="w-4 h-4 text-[#0a0c0e]" />}
        >
          {t('f5Penalty.btnUnderstood')}
        </Button>
      }
    >
      <div className="space-y-3">
        <Card variant="card" className="p-3.5 space-y-3 border-[var(--color-ruby-border)]">
          <div className="space-y-2">
            {depositLost > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{t('f5Penalty.depositLostLabel')}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{t('f5Penalty.depositLostDesc')}</div>
                </div>
                <Badge variant="danger" size="md">
                  -{depositLost.toLocaleString()} {t('common.coins')}
                </Badge>
              </div>
            )}

            {eloLost > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)]">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{t('f5Penalty.eloLostLabel')}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{t('f5Penalty.eloLostDesc')}</div>
                </div>
                <Badge variant="danger" size="md">
                  -{eloLost} Elo
                </Badge>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[var(--text-muted)] space-y-1">
            <p>{t('f5Penalty.recordLoss')}</p>
            <p>{t('f5Penalty.resetStreak')}</p>
          </div>
        </Card>
      </div>
    </Modal>
  );
};
