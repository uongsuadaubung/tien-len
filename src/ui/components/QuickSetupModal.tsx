import React, { useState } from 'react';
import { GameSettlementRule } from '../../engine/types';
import { X, Play, Sliders } from 'lucide-react';
import { TableRulesConfigPanel, TableConfigState } from './TableRulesConfigPanel';

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
    betAmount: Math.min(1000, Math.max(100, Math.floor(playerCoins / 26))),
    choppingMultiplier: 1,
    congEnabled: true,
    prohibitEndingWithTwo: true,
    allowFourPairsCutAnytime: true,
    threeSpadesEndingBonus: true,
    cascadeChopEnabled: true,
    instantWinEnabled: true,
    botThinkDelayMs: 800
  });

  if (!isOpen) return null;

  const currentMultiplier = config.choppingMultiplier || 1;
  const depositRequired = 26 * config.betAmount * currentMultiplier;
  const isInsufficientCoins = playerCoins < depositRequired;

  const handleConfigChange = (updated: Partial<TableConfigState>) => {
    setConfig(prev => ({ ...prev, ...updated }));
  };

  const handleStart = () => {
    if (isInsufficientCoins && playerCoins > 0) {
      alert(`Số dư hiện tại (${playerCoins.toLocaleString()} Xu) không đủ để đặt cọc an toàn cho bàn đấu (Cần tối thiểu ${depositRequired.toLocaleString()} Xu)!`);
      return;
    }

    // Map GameMode to GameSettlementRule
    let settlementRule: GameSettlementRule = 'CARD_COUNT';
    if (config.mode === 'WINNER_TAKES_ALL') settlementRule = 'WINNER_TAKES_ALL';
    else if (config.mode === 'TRADITIONAL') settlementRule = 'TRADITIONAL_RANK_BASED';

    onStartGame({
      playerCount: config.playerCount,
      betAmount: Math.max(10, config.betAmount),
      settlementRule,
      choppingMultiplier: config.choppingMultiplier,
      congEnabled: config.congEnabled ?? true,
      prohibitEndingWithTwo: config.prohibitEndingWithTwo,
      allowFourPairsCutAnytime: config.allowFourPairsCutAnytime,
      threeSpadesEndingBonus: config.threeSpadesEndingBonus ?? true,
      cascadeChopEnabled: config.cascadeChopEnabled ?? true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#1c0307] via-[#140103] to-[#0a0001] rounded-3xl border-2 border-yellow-500/50 shadow-2xl p-5 sm:p-6 text-white flex flex-col justify-between overflow-hidden max-h-[90vh]">
        {/* TIÊU ĐỀ MODAL & NÚT ĐÓNG */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center text-red-950 shadow-lg flex-shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-yellow-300 uppercase tracking-wide flex items-center gap-2">
                Cấu Hình Bàn Chơi Nhanh
              </h2>
              <p className="text-xs text-neutral-400">Tùy chỉnh tiền cược, luật phạt và vào bàn chơi ngay</p>
            </div>
          </div>

          {/* Nút đóng */}
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer border border-yellow-500/20 flex-shrink-0 shadow"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM THIẾT LẬP BÀN ĐẤU DÙNG CHUNG */}
        <div className="flex-1 overflow-y-auto py-3 my-1 pr-1 space-y-4">
          <TableRulesConfigPanel
            playerCoins={playerCoins}
            config={config}
            onChange={handleConfigChange}
            showBotThinkDelay={false}
            showInstantWin={false}
            showCongOption={true}
          />
        </div>

        {/* NÚT BẮT ĐẦU VÁN ĐẤU */}
        <div className="pt-3 border-t border-yellow-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-400 text-center sm:text-left">
            <span>Tiền cọc an toàn: </span>
            <strong className="text-yellow-300 font-bold">{depositRequired.toLocaleString()} Xu</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleStart}
              disabled={isInsufficientCoins}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all border ${
                isInsufficientCoins
                  ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-red-950 hover:scale-105 active:scale-95 transition-all cursor-pointer border-yellow-200'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isInsufficientCoins ? 'Không Đủ Tiền Cọc' : 'Vào Bàn Chơi Ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
