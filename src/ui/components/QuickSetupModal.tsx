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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 select-none">
      <div className="relative w-full max-w-2xl bg-[#121724] rounded-2xl border border-[#d4af37]/40 shadow-2xl p-5 sm:p-6 text-white flex flex-col justify-between overflow-hidden max-h-[90vh]">
        {/* TIÊU ĐỀ MODAL & NÚT ĐÓNG */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#aa8620] flex items-center justify-center text-[#0a0d14] shadow flex-shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#f3e5ab] uppercase tracking-wide flex items-center gap-2">
                Cấu Hình Bàn Chơi Nhanh
              </h2>
              <p className="text-xs text-slate-400">Tùy chỉnh tiền cược, luật phạt và vào bàn chơi ngay</p>
            </div>
          </div>

          {/* Nút đóng */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10 flex-shrink-0 shadow"
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
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span>Tiền cọc an toàn: </span>
            <strong className="text-[#f3e5ab] font-bold">{depositRequired.toLocaleString()} Xu</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#182030] hover:bg-[#222c42] border border-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleStart}
              disabled={isInsufficientCoins}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all border ${
                isInsufficientCoins
                  ? 'bg-[#182030] text-slate-500 border-white/5 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-[#d4af37] to-[#aa8620] hover:from-[#e5c158] hover:to-[#be982d] text-[#0a0d14] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#d4af37]'
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
