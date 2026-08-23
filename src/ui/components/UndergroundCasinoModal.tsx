import React, { useState } from 'react';
import { PlayerProfile } from '../../engine/storage';
import { X, Flame, AlertOctagon, Skull, ShieldAlert, Sparkles } from 'lucide-react';

interface UndergroundCasinoModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onSelectTable: (betAmount: number) => void;
}

const UNDERGROUND_TABLES = [
  {
    id: 'table_500',
    name: 'Bàn Nhập Môn',
    betAmount: 500,
    minRequired: 5000,
    icon: '🎲',
    color: 'from-amber-900/60 to-neutral-900',
    borderColor: 'border-amber-500/40',
    description: 'Thử sức nhập môn sòng bạc ngầm với mức cược vừa phải.'
  },
  {
    id: 'table_2000',
    name: 'Bàn Đại Gia',
    betAmount: 2000,
    minRequired: 20000,
    icon: '💼',
    color: 'from-orange-950/70 to-neutral-900',
    borderColor: 'border-orange-500/50',
    description: 'Các tay chơi nhiều tiền, chặt Heo phạt nhân đôi cực gắt.'
  },
  {
    id: 'table_10000',
    name: 'Bàn Trùm Sòng',
    betAmount: 10000,
    minRequired: 100000,
    icon: '🎩',
    color: 'from-red-950/80 to-black',
    borderColor: 'border-red-500/60',
    description: 'Nơi quy tụ các tay to khét tiếng. Thối 1 con Heo mất ngay 40,000 xu.'
  },
  {
    id: 'table_50000',
    name: 'Bàn Vô Cực (High-Roller)',
    betAmount: 50000,
    minRequired: 500000,
    icon: '👑',
    color: 'from-purple-950/90 via-red-950/80 to-black',
    borderColor: 'border-yellow-400/80',
    description: 'Sân chơi của các Triệu Phú. Một ván thắng hốt trọn triệu xu!'
  }
];

export const UndergroundCasinoModal: React.FC<UndergroundCasinoModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSelectTable
}) => {
  const [selectedBet, setSelectedBet] = useState<number>(2000);

  if (!isOpen) return null;

  const currentTable = UNDERGROUND_TABLES.find(t => t.betAmount === selectedBet) || UNDERGROUND_TABLES[0];
  const isEligible = profile.coins >= currentTable.minRequired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black rounded-3xl border-2 border-red-500/70 shadow-[0_0_50px_rgba(239,68,68,0.25)] p-5 sm:p-7 text-white flex flex-col justify-between overflow-hidden">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-red-900/40">
          <div className="w-12 h-12 rounded-2xl bg-red-950/90 border border-red-500/60 flex items-center justify-center text-red-400 shadow-lg">
            <Flame className="w-7 h-7 text-yellow-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-red-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent uppercase tracking-wider">
                Sòng Bạc Thế Giới Ngầm
              </h2>
              <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                High-Stakes
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">Chọn mức cược lớn • Phạt chặt chém x2 • Đền Cóng cả làng</p>
          </div>
        </div>

        {/* Cảnh báo luật chơi ngầm */}
        <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 mb-5 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-300 leading-relaxed">
            <strong className="text-yellow-300">Luật Thế Giới Ngầm:</strong> Tiền phạt Chặt Heo / Tứ Quý / Thối bài được <strong className="text-red-400">nhân đôi (x2)</strong> so với bàn thường. Bị Cóng đền <strong className="text-red-400">52 mức cược</strong>. Hãy cân nhắc tài sản trước khi vào bàn!
          </div>
        </div>

        {/* Danh Sách 4 Bàn Cược */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {UNDERGROUND_TABLES.map(table => {
            const isSelected = selectedBet === table.betAmount;
            const canAfford = profile.coins >= table.minRequired;

            return (
              <div
                key={table.id}
                onClick={() => setSelectedBet(table.betAmount)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-gradient-to-b ${table.color} ${
                  isSelected
                    ? `${table.borderColor} shadow-lg shadow-red-500/20 scale-[1.02]`
                    : 'border-neutral-800 opacity-75 hover:opacity-100 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{table.icon}</span>
                    <h4 className="font-black text-sm text-yellow-200">
                      {table.name}
                    </h4>
                  </div>
                  <span className="text-xs font-black text-amber-400 bg-black/60 px-2 py-1 rounded-lg border border-amber-500/30">
                    Cược: {table.betAmount.toLocaleString()} Xu
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 leading-tight">
                  {table.description}
                </p>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-medium">Yêu cầu tài sản:</span>
                  <span className={`font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                    {table.minRequired.toLocaleString()} Xu
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer & Nút Vào Bàn */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-4">
          <div className="text-xs">
            <span className="text-neutral-400">Tài sản hiện có: </span>
            <strong className="text-yellow-300 font-black">{profile.coins.toLocaleString()} Xu</strong>
          </div>

          <button
            onClick={() => {
              if (isEligible) {
                onSelectTable(selectedBet);
              }
            }}
            disabled={!isEligible}
            className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl ${
              isEligible
                ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-yellow-100 hover:scale-105 cursor-pointer border border-yellow-300/50 shadow-red-500/30'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
            }`}
          >
            {isEligible ? `Vào Bàn Cược ${selectedBet.toLocaleString()} Xu` : 'Không Đủ Tài Sản'}
          </button>
        </div>
      </div>
    </div>
  );
};
