import React from 'react';
import { Play, Sliders } from 'lucide-react';
import { TableRulesConfigPanel, TableConfigState } from '../../components/TableRulesConfigPanel';
import { Modal, Button } from '../../primitives';
import { useQuickSetup, QuickSetupConfig } from '../../hooks/useQuickSetup';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n } from '../../../locales';

export type { QuickSetupConfig };

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<TableConfigState>;
  onStartGame: (config: QuickSetupConfig) => void;
}

export const QuickSetupModal: React.FC<QuickSetupModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  onStartGame
}) => {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const playerCoins = profile.coins;
  const {
    config,
    depositRequired,
    isInsufficientCoins,
    actualDeposit,
    handleConfigChange,
    handleStart
  } = useQuickSetup({
    initialConfig,
    onStartGame,
    onClose
  });

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('lobby.tableConfigBtn')}
      subtitle={t('lobby.heroSubtitle')}
      icon={<Sliders className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="2xl"
      height="h-[90vh] sm:h-[680px]"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)] text-center sm:text-left">
            <span>{t('customGame.depositRequired', { amount: actualDeposit })}</span>
            {depositRequired > actualDeposit && (
              <span className="text-[10px] text-zinc-500 ml-1">({depositRequired.toLocaleString()} Xu)</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="surface"
              size="md"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              {t('common.close')}
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={handleStart}
              disabled={isInsufficientCoins}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              className="flex-1 sm:flex-none"
            >
              <span>{isInsufficientCoins ? t('errors.insufficientCoins') : t('lobby.playNowBtn')}</span>
            </Button>
          </div>
        </div>
      }
    >
      <TableRulesConfigPanel
        playerCoins={playerCoins}
        config={config}
        onChange={handleConfigChange}
        showInstantWin={false}
        showCongOption={true}
      />
    </Modal>
  );
};
