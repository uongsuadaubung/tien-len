import React, { useState } from 'react';
import { GameSettlementRule } from '../../../engine/types';
import { ECONOMY_CONSTANTS, calculateRequiredDeposit } from '../../../engine/constants/economy';
import { Play, Sliders } from 'lucide-react';
import { TableRulesConfigPanel, TableConfigState } from '../../components/TableRulesConfigPanel';
import { Modal, Button } from '../../primitives';

export interface QuickSetupConfig {
  playerCount: 2 | 3 | 4;
  betAmount: number;
  settlementRule: GameSettlementRule;
  choppingMultiplier: number;
  congEnabled: boolean;
  prohibitEndingWithTwo: boolean;
  allowFourPairsCutAnytime: boolean;
  threeSpadesEndingBonus: boolean;
  cascadeChopEnabled: boolean;
}

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerCoins: number;
  onStartGame: (config: QuickSetupConfig) => void;
}

export const QuickSetupModal: React.FC<QuickSetupModalProps> = ({
  isOpen,
  onClose,
  playerCoins,
  onStartGame
}) => {
  const [config, setConfig] = useState<TableConfigState>({
    playerCount: 4,
    mode: 'COUNT_CARDS',
    betAmount: ECONOMY_CONSTANTS.DEFAULT_QUICK_BET,
    choppingMultiplier: 1,
    congEnabled: true,
    prohibitEndingWithTwo: true,
    allowFourPairsCutAnytime: true,
    threeSpadesEndingBonus: true,
    cascadeChopEnabled: true,
    instantWinEnabled: true
  });

  const currentMultiplier = config.choppingMultiplier || 1;
  const depositRequired = calculateRequiredDeposit(config.betAmount, currentMultiplier);
  const isInsufficientCoins = playerCoins < config.betAmount;
  const actualDeposit = Math.min(playerCoins, depositRequired);

  const handleConfigChange = (updated: Partial<TableConfigState>) => {
    setConfig(prev => ({ ...prev, ...updated }));
  };

  const handleStart = () => {
    if (isInsufficientCoins) {
      alert(`Số dư hiện tại (${playerCoins.toLocaleString()} Xu) không đủ mức cược tối thiểu của bàn (${config.betAmount.toLocaleString()} Xu)!`);
      return;
    }

    let settlementRule: GameSettlementRule = 'CARD_COUNT';
    if (config.mode === 'WINNER_TAKES_ALL') settlementRule = 'WINNER_TAKES_ALL';
    else if (config.mode === 'TRADITIONAL') settlementRule = 'TRADITIONAL_RANK_BASED';

    onStartGame({
      playerCount: config.playerCount,
      betAmount: Math.max(10, config.betAmount),
      settlementRule,
      choppingMultiplier: config.choppingMultiplier ?? 1,
      congEnabled: config.congEnabled ?? true,
      prohibitEndingWithTwo: config.prohibitEndingWithTwo ?? true,
      allowFourPairsCutAnytime: config.allowFourPairsCutAnytime ?? true,
      threeSpadesEndingBonus: config.threeSpadesEndingBonus ?? true,
      cascadeChopEnabled: config.cascadeChopEnabled ?? true
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu Hình Bàn Chơi Nhanh"
      subtitle="Tùy chỉnh tiền cược, luật phạt và vào bàn chơi ngay"
      icon={<Sliders className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="2xl"
      height="h-[90vh] sm:h-[680px]"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)] text-center sm:text-left">
            <span>Tiền cọc an toàn: </span>
            <strong className="text-[var(--color-gold)] font-bold">{actualDeposit.toLocaleString()} Xu</strong>
            {depositRequired > actualDeposit && (
              <span className="text-[10px] text-zinc-500 ml-1">(Tối đa {depositRequired.toLocaleString()} Xu)</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="surface"
              size="md"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Đóng
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={handleStart}
              disabled={isInsufficientCoins}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              className="flex-1 sm:flex-none"
            >
              <span>{isInsufficientCoins ? 'Không Đủ Tiền Cược' : 'Vào Bàn Chơi Ngay'}</span>
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
