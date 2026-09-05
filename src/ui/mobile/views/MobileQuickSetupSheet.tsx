import React from 'react';
import { Play, Sliders, Info } from 'lucide-react';
import { TableRulesConfigPanel, TableConfigState } from '../../components/TableRulesConfigPanel';
import { Badge, Button } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { useQuickSetup, QuickSetupConfig } from '../../hooks/useQuickSetup';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n } from '../../../locales';

export interface MobileQuickSetupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<TableConfigState>;
  onStartGame: (config: QuickSetupConfig) => void;
}

export const MobileQuickSetupSheet: React.FC<MobileQuickSetupSheetProps> = ({
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
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t('lobby.tableConfigBtn')}
      subtitle={t('lobby.heroSubtitle')}
      icon={<Sliders className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {playerCoins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-2 text-xs">
          <div className="text-xs text-[var(--text-muted)] min-w-0 flex flex-col">
            {depositRequired > actualDeposit ? (
              <span
                className="text-[10px] text-[var(--text-muted)] truncate inline-flex items-center gap-1 cursor-help"
                title={t('customGame.depositStandardTooltip', { standard: depositRequired })}
              >
                <span className="truncate">{t('customGame.depositHeld', { amount: actualDeposit })}</span>
                <Info className="w-3 h-3 text-[var(--color-gold)] shrink-0 inline-block" />
              </span>
            ) : (
              <span className="text-[10px] text-[var(--text-muted)] truncate">
                {t('customGame.depositRequired', { amount: actualDeposit })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="surface"
              size="md"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={handleStart}
              disabled={isInsufficientCoins}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              <span>{isInsufficientCoins ? t('errors.insufficientCoins') : t('lobby.playNowBtn')}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="pb-4 select-none">
        <TableRulesConfigPanel
          playerCoins={playerCoins}
          config={config}
          onChange={handleConfigChange}
          showInstantWin={false}
          showCongOption={true}
        />
      </div>
    </MobileScreenWrapper>
  );
};
