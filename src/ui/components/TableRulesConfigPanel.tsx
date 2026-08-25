import React, { useState, useEffect } from 'react';
import { GameMode } from '../../engine/types';
import { 
  ShieldAlert, 
  Flame, 
  Snowflake, 
  Ban, 
  Zap, 
  Coins, 
  Users, 
  Crown, 
  SlidersHorizontal,
  Sparkles,
  Edit3
} from 'lucide-react';

export interface TableConfigState {
  playerCount: 2 | 3 | 4;
  mode: GameMode;
  betAmount: number;
  choppingMultiplier: number;
  prohibitEndingWithTwo: boolean;
  allowFourPairsCutAnytime: boolean;
  instantWinEnabled?: boolean;
  congEnabled?: boolean;
  botThinkDelayMs?: number;
}

interface TableRulesConfigPanelProps {
  playerCoins: number;
  config: TableConfigState;
  onChange: (updated: Partial<TableConfigState>) => void;
  showBotThinkDelay?: boolean;
  showInstantWin?: boolean;
  showCongOption?: boolean;
}

const PRESET_BETS = [500, 1000, 2000, 5000, 10000, 20000];

export const TableRulesConfigPanel: React.FC<TableRulesConfigPanelProps> = ({
  playerCoins,
  config,
  onChange,
  showBotThinkDelay = true,
  showInstantWin = true,
  showCongOption = false
}) => {
  const [isCustomBet, setIsCustomBet] = useState<boolean>(() => !PRESET_BETS.includes(config.betAmount));
  const [customBetInput, setCustomBetInput] = useState<string>(config.betAmount.toString());
  const [betError, setBetError] = useState<string | null>(null);

  useEffect(() => {
    setCustomBetInput(config.betAmount.toString());
    if (!PRESET_BETS.includes(config.betAmount)) {
      setIsCustomBet(true);
    }
  }, [config.betAmount]);

  // 1. Tính toán tiền cọc an toàn & % rủi ro tài chính thời gian thực
  const currentMultiplier = config.choppingMultiplier || 1;
  const depositRequired = 26 * config.betAmount * currentMultiplier;
  const depositPercent = playerCoins > 0 ? (depositRequired / playerCoins) * 100 : 100;
  const isInsufficientCoins = playerCoins < depositRequired;

  // Tính toán các mức phạt cụ thể hiển thị theo cược
  const congPenaltyAmount = config.betAmount * 26 * currentMultiplier;
  const minThoiAmount = config.betAmount * 1 * currentMultiplier;
  const maxThoiAmount = config.betAmount * 6 * currentMultiplier;
  const fourPairsRewardAmount = config.betAmount * 6 * currentMultiplier;

  // Xác định phân cấp rủi ro & lời khuyên tài chính
  let riskLevelData = {
    badge: '🛡️ AN TOÀN (VỐN DỒI DÀO)',
    badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-400',
    containerColor: 'bg-emerald-950/50 border-emerald-500/60 text-emerald-100',
    iconColor: 'text-emerald-400',
    advice: 'Mức cược rất an toàn, số dư ví hiện tại đủ khả năng chống chịu 50+ ván đấu có sát phạt cao.'
  };

  if (isInsufficientCoins) {
    riskLevelData = {
      badge: '🚨 NGUY HIỂM (THIẾU CỌC)',
      badgeColor: 'bg-red-900 text-red-100 border-red-400 animate-pulse',
      containerColor: 'bg-red-950/90 border-red-500 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
      iconColor: 'text-red-400 animate-pulse',
      advice: `Số dư ví (${playerCoins.toLocaleString()} Xu) không đủ mức cọc an toàn tối thiểu (${depositRequired.toLocaleString()} Xu) cho bàn đấu này!`
    };
  } else if (depositPercent > 65) {
    riskLevelData = {
      badge: '🔥 TỬ ĐỊA (CƯỢC TẤT TAY)',
      badgeColor: 'bg-red-900 text-red-200 border-red-400',
      containerColor: 'bg-red-950/70 border-red-500/80 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.25)]',
      iconColor: 'text-red-400 animate-pulse',
      advice: 'Cảnh báo tất tay: Tiền cọc chiếm hơn 65% tổng tài sản. Một ván thua Cóng có thể khiến bạn phá sản ngay lập tức!'
    };
  } else if (depositPercent > 40) {
    riskLevelData = {
      badge: '⚠️ RỦI RO CAO (CẢNH BÁO)',
      badgeColor: 'bg-amber-900 text-amber-200 border-amber-400',
      containerColor: 'bg-amber-950/60 border-amber-500/70 text-amber-100',
      iconColor: 'text-amber-400',
      advice: 'Cảnh báo rủi ro: Cọc an toàn chiếm gần nửa tài sản ví. Hãy đánh cẩn trọng, tránh giữ Heo quá lâu kẻo bị chặt chồng.'
    };
  } else if (depositPercent > 20) {
    riskLevelData = {
      badge: '⚖️ VỪA PHẢI (HỢP LÝ)',
      badgeColor: 'bg-yellow-900 text-yellow-200 border-yellow-400',
      containerColor: 'bg-yellow-950/50 border-yellow-500/60 text-yellow-100',
      iconColor: 'text-yellow-400',
      advice: 'Mức cược hợp lý, quản lý vốn tốt. Phù hợp để chơi lâu dài và gia tăng tài sản bền vững.'
    };
  }

  // Chọn Preset cược có sẵn
  const handleSelectPresetBet = (amt: number) => {
    setIsCustomBet(false);
    setBetError(null);
    setCustomBetInput(amt.toString());
    onChange({ betAmount: amt });
  };

  // Chọn mở khung nhập cược tự do
  const handleToggleCustomBet = () => {
    setIsCustomBet(true);
    setBetError(null);
  };

  // Nhập cược tự do
  const handleCustomBetChange = (rawVal: string) => {
    const cleanDigits = rawVal.replace(/\D/g, '');
    setCustomBetInput(cleanDigits);

    if (cleanDigits === '') {
      setBetError('Vui lòng nhập mức cược ván đấu');
      return;
    }

    const parsed = parseInt(cleanDigits, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setBetError('Mức cược phải lớn hơn 0 Xu');
      return;
    }

    const reqDeposit = 26 * parsed * currentMultiplier;
    if (reqDeposit > playerCoins) {
      setBetError(`Mức cược này cần ${reqDeposit.toLocaleString()} Xu tiền cọc an toàn, vượt quá khả năng chi trả của ví (${playerCoins.toLocaleString()} Xu)!`);
    } else {
      setBetError(null);
    }

    onChange({ betAmount: parsed });
  };

  // Nút % số dư (Tính toán mức cược an toàn tối đa theo % ví)
  const handleApplyQuickPercent = (fraction: number) => {
    const maxSafeBet = Math.max(10, Math.floor((playerCoins * fraction) / (26 * currentMultiplier)));
    setBetError(null);
    setCustomBetInput(maxSafeBet.toString());
    onChange({ betAmount: maxSafeBet });
  };

  const activeBotCount = config.playerCount - 1;

  return (
    <div className="space-y-5 animate-fade-in text-white">
      {/* ========================================================================= */}
      {/* 1. BẢNG ĐÁNH GIÁ RỦI RO TÀI CHÍNH & TIỀN CỌC AN TOÀN (CHI TIẾT & SỐNG ĐỘNG) */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl border transition-all shadow-xl ${riskLevelData.containerColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className={`w-5 h-5 ${riskLevelData.iconColor}`} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-yellow-300 flex items-center gap-2">
                <span>Đánh Giá Rủi Ro Tài Chính Bàn Đấu</span>
              </div>
              <div className="text-xs text-neutral-200 mt-0.5">
                Tiền cọc an toàn: <strong className="text-yellow-300 font-extrabold">{depositRequired.toLocaleString()} Xu</strong> 
                <span className="text-neutral-400 font-normal"> ({depositPercent.toFixed(1)}% tài sản ví)</span>
              </div>
            </div>
          </div>

          <span className={`self-start sm:self-center text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-wider shadow-md ${riskLevelData.badgeColor}`}>
            {riskLevelData.badge}
          </span>
        </div>

        {/* Thanh tiến trình rủi ro tài chính trực quan */}
        <div className="pt-2.5 space-y-1.5">
          <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                depositPercent > 65
                  ? 'bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 animate-pulse'
                  : depositPercent > 40
                  ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-red-500'
                  : 'bg-gradient-to-r from-emerald-400 to-teal-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, depositPercent))}%` }}
            />
          </div>
          <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
            💡 {riskLevelData.advice}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SỐ LƯỢNG NGƯỜI CHƠI (2, 3, 4 NGƯỜI) */}
      {/* ========================================================================= */}
      <div className="bg-black/40 p-4 rounded-3xl border border-yellow-500/20 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
          <label className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-yellow-400" />
            <span>Số Lượng Người Chơi Trên Bàn</span>
          </label>
          <span className="text-xs text-neutral-400 font-semibold">
            (1 Bạn + {activeBotCount} Bot AI)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { count: 2, label: 'Solo 1v1 (2 Người)', desc: '1 Bạn vs 1 Bot' },
            { count: 3, label: 'Bàn 3 Người', desc: '1 Bạn vs 2 Bot' },
            { count: 4, label: 'Bàn 4 Người (Chuẩn)', desc: '1 Bạn vs 3 Bot' }
          ].map(item => (
            <button
              key={item.count}
              type="button"
              onClick={() => onChange({ playerCount: item.count as 2 | 3 | 4 })}
              className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                config.playerCount === item.count
                  ? 'bg-gradient-to-b from-yellow-500/25 to-amber-950/40 border-yellow-400 text-yellow-200 shadow-lg font-black ring-1 ring-yellow-400/50 scale-[1.02]'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <div className="text-xs font-black">{item.label}</div>
              <div className="text-[10px] text-neutral-400 mt-1">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. QUY TẮC KẾT THÚC VÁN & TÍNH TIỀN */}
      {/* ========================================================================= */}
      <div className="bg-black/40 p-4 rounded-3xl border border-yellow-500/20 shadow-lg">
        <label className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-yellow-400" />
          <span>Quy Tắc Kết Thúc Ván & Tính Tiền</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { mode: 'COUNT_CARDS', label: '⚡ Đếm Lá Sát Phạt', desc: '1 người về Nhất dừng ngay, đếm lá người thua' },
            { mode: 'WINNER_TAKES_ALL', label: '👑 Nhất Ăn Tất', desc: '1 người về Nhất gom sạch toàn bộ cược cả bàn' },
            { mode: 'TRADITIONAL', label: '🎖️ Truyền Thống', desc: 'Nhất Nhì Ba Bét (Đánh đến người áp chót)' }
          ].map(item => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onChange({ mode: item.mode as GameMode })}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                config.mode === item.mode
                  ? 'bg-gradient-to-b from-yellow-500/25 to-amber-950/40 border-yellow-400 text-yellow-200 shadow-lg ring-1 ring-yellow-400/50 scale-[1.02]'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <div className="text-xs font-black">{item.label}</div>
              <div className="text-[10px] text-neutral-400 mt-1 leading-relaxed">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MỨC CƯỢC VÁN ĐẤU (PRESETS + NÚT MỞ TỰ NHẬP) */}
      {/* ========================================================================= */}
      <div className="bg-black/40 p-4 rounded-3xl border border-yellow-500/20 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-amber-300 uppercase tracking-wider block flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span>Mức Cược Ván Đấu (Xu)</span>
          </label>
          <div className="text-xs text-neutral-400">
            Số dư khả dụng: <span className="text-yellow-300 font-black">{playerCoins.toLocaleString()} Xu</span>
          </div>
        </div>

        {/* Lưới 6 Preset Cược + 1 Nút Tự Chọn Mức Cược */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_BETS.map(amt => {
            const isSelected = !isCustomBet && config.betAmount === amt;
            const requiredDepositForPreset = 26 * amt * currentMultiplier;
            const isPresetDisabled = playerCoins < requiredDepositForPreset;

            return (
              <button
                key={amt}
                type="button"
                disabled={isPresetDisabled}
                onClick={() => handleSelectPresetBet(amt)}
                title={isPresetDisabled ? `Số dư không đủ mức cọc an toàn (${requiredDepositForPreset.toLocaleString()} Xu)` : `Cược ${amt.toLocaleString()} Xu`}
                className={`py-2.5 px-1 rounded-2xl font-black text-xs transition-all border ${
                  isPresetDisabled
                    ? 'opacity-35 cursor-not-allowed bg-neutral-950/80 border-neutral-900 text-neutral-600 line-through'
                    : isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-red-950 border-yellow-300 shadow-lg scale-105 font-black ring-1 ring-yellow-300 cursor-pointer'
                    : 'bg-neutral-900/80 border-neutral-800 text-yellow-300/80 hover:bg-neutral-800 hover:text-white cursor-pointer'
                }`}
              >
                {amt.toLocaleString()} Xu
              </button>
            );
          })}

          {/* Nút Chọn Mức Cược Tùy Chọn */}
          <button
            type="button"
            onClick={handleToggleCustomBet}
            className={`col-span-2 sm:col-span-2 py-2.5 px-3 rounded-2xl font-black text-xs transition-all border cursor-pointer flex items-center justify-center gap-2 ${
              isCustomBet
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-red-950 border-yellow-300 shadow-lg scale-105 font-black ring-1 ring-yellow-300'
                : 'bg-neutral-900/80 border-neutral-800 text-yellow-300/80 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Tùy Chọn Mức Cược Khác</span>
          </button>
        </div>

        {/* CHỈ HIỆN KHUNG NHẬP SỐ TIỀN & CÁC NÚT % KHI CHỌN "TÙY CHỌN MỨC CƯỢC KHÁC" */}
        {isCustomBet && (
          <div className="pt-2 space-y-3 animate-fade-in bg-black/60 p-4 rounded-2xl border border-yellow-500/40">
            <div className="text-[11px] font-bold text-yellow-300 flex items-center justify-between">
              <span>✍️ Nhập mức cược mong muốn:</span>
              <span className="text-neutral-400">
                Đang cược: <strong className="text-yellow-400">{config.betAmount.toLocaleString()} Xu</strong>
              </span>
            </div>

            {/* 1. Ô Nhập Số Tiền Cược Tự Do */}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={customBetInput}
                onChange={(e) => handleCustomBetChange(e.target.value)}
                placeholder="Nhập mức cược mong muốn..."
                className={`w-full bg-neutral-950 border rounded-2xl px-4 py-3 text-sm font-mono font-bold text-yellow-300 focus:outline-none transition-all pr-14 shadow-inner ${
                  betError 
                    ? 'border-red-500 focus:border-red-400 ring-2 ring-red-500/40' 
                    : 'border-yellow-500/50 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-yellow-500 font-black pointer-events-none">
                Xu
              </span>
            </div>

            {/* 2. Lưới 4 Nút % Số Dư Cân Đối & Không Bao Giờ Tràn Dòng */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '10%', fraction: 0.1 },
                { label: '25%', fraction: 0.25 },
                { label: '50%', fraction: 0.5 },
                { label: 'Tối Đa', fraction: 1.0 }
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  disabled={playerCoins <= 0}
                  onClick={() => handleApplyQuickPercent(p.fraction)}
                  className="w-full py-2.5 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-yellow-500/50 text-[11px] font-black text-yellow-200 hover:text-yellow-300 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-center whitespace-nowrap shadow"
                  title={`Cược ${p.label} số dư (${Math.floor(playerCoins * p.fraction).toLocaleString()} Xu)`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {betError && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-bold animate-fade-in pt-1">
                <span>⚠️</span>
                <span>{betError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. HỆ SỐ PHẠT CHẶT HEO / CHẶT HÀNG (VỚI DIỄN GIẢI SÁT PHẠT) */}
      {/* ========================================================================= */}
      <div className="bg-black/40 p-4 rounded-3xl border border-yellow-500/20 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500 animate-pulse" />
            <div>
              <div className="text-xs font-black text-yellow-300 uppercase tracking-wider flex items-center gap-2">
                <span>Hệ Số Sát Phạt Bàn Đấu</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-red-950 text-red-300 border border-red-500/40 font-black">
                  {currentMultiplier === 1 ? 'Chuẩn (x1)' : currentMultiplier === 2 ? 'Sát Phạt (x2)' : currentMultiplier === 3 ? 'Khốc Liệt (x3)' : currentMultiplier === 4 ? 'Tử Địa (x4)' : 'Hủy Diệt (x5)'}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400">
                Nhân {currentMultiplier}x toàn bộ tiền phạt Đếm lá, Chặt Heo/Hàng, Thối bài và Phạt Cóng
              </div>
            </div>
          </div>
          <span className="text-sm font-black text-yellow-400 hidden sm:inline">
            x{currentMultiplier}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 pt-1">
          {[
            { mult: 1, label: 'x1', desc: 'Chuẩn', color: 'border-neutral-700 text-neutral-300' },
            { mult: 2, label: 'x2', desc: 'Sát Phạt', color: 'border-amber-500/50 text-amber-300' },
            { mult: 3, label: 'x3', desc: 'Khốc Liệt', color: 'border-orange-500/60 text-orange-300' },
            { mult: 4, label: 'x4', desc: 'Tử Địa', color: 'border-red-500/70 text-red-300' },
            { mult: 5, label: 'x5', desc: 'Hủy Diệt', color: 'border-purple-500/80 text-purple-300' }
          ].map(item => {
            const isSelected = currentMultiplier === item.mult;
            return (
              <button
                key={item.mult}
                type="button"
                onClick={() => onChange({ choppingMultiplier: item.mult })}
                className={`py-2.5 px-1 rounded-2xl text-center border transition-all cursor-pointer ${
                  isSelected
                    ? item.mult >= 4
                      ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white font-black border-red-400 shadow-xl scale-105 ring-1 ring-red-400'
                      : item.mult >= 2
                      ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white font-black border-amber-300 shadow-lg scale-105'
                      : 'bg-amber-500 text-red-950 font-black border-yellow-300 shadow-md scale-105'
                    : `bg-neutral-900/80 ${item.color} hover:bg-neutral-800 hover:text-white`
                }`}
              >
                <div className="text-sm font-black">{item.label}</div>
                <div className="text-[9px] opacity-80 mt-0.5">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. CÁC TÙY CHỌN LUẬT PHỤ VỚI THÔNG SỐ TIỀN THẬT THỜI GIAN THỰC */}
      {/* ========================================================================= */}
      <div className="bg-black/40 p-4 rounded-3xl border border-yellow-500/20 space-y-3 shadow-lg">
        <label className="text-xs font-black text-amber-300 uppercase tracking-wider block flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>Tùy Chọn Luật Phạt Bàn Đấu (Real-Time Calculations)</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Cấm 2 Cuối Cùng */}
          <div 
            onClick={() => onChange({ prohibitEndingWithTwo: config.prohibitEndingWithTwo !== false ? false : true })}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              config.prohibitEndingWithTwo !== false 
                ? 'bg-amber-950/30 border-yellow-500/60 shadow-sm' 
                : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-start gap-2.5 pr-2">
              <Ban className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Cấm Đánh 2 Cuối Cùng</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                    config.prohibitEndingWithTwo !== false
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {config.prohibitEndingWithTwo !== false ? 'BẬT' : 'TẮT'}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                  Cấm về Heo • Thối phạt từ <strong className="text-yellow-300">{minThoiAmount.toLocaleString()}</strong> đến <strong className="text-yellow-300">{maxThoiAmount.toLocaleString()} Xu</strong>
                </div>
              </div>
            </div>
            <div className={`w-10 h-5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
              config.prohibitEndingWithTwo !== false ? 'bg-yellow-500' : 'bg-neutral-700'
            }`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                config.prohibitEndingWithTwo !== false ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* 4 Đôi Thông Cắt Tự Do */}
          <div 
            onClick={() => onChange({ allowFourPairsCutAnytime: !config.allowFourPairsCutAnytime })}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              config.allowFourPairsCutAnytime 
                ? 'bg-amber-950/30 border-yellow-500/60 shadow-sm' 
                : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-start gap-2.5 pr-2">
              <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">4 Đôi Thông Cắt Tự Do</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                    config.allowFourPairsCutAnytime
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {config.allowFourPairsCutAnytime ? 'BẬT' : 'TẮT'}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                  Chặt bất kỳ lúc nào • Thắng ngay <strong className="text-yellow-300">+{fourPairsRewardAmount.toLocaleString()} Xu</strong>
                </div>
              </div>
            </div>
            <div className={`w-10 h-5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
              config.allowFourPairsCutAnytime ? 'bg-yellow-500' : 'bg-neutral-700'
            }`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                config.allowFourPairsCutAnytime ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* Phạt Cóng (Cháy Bài) */}
          {showCongOption && (
            <div 
              onClick={() => onChange({ congEnabled: !config.congEnabled })}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                config.congEnabled 
                  ? 'bg-amber-950/30 border-yellow-500/60 shadow-sm' 
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start gap-2.5 pr-2">
                <Snowflake className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Luật Phạt Cóng (Cháy Bài)</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      config.congEnabled
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {config.congEnabled ? 'BẬT' : 'TẮT'}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                    Không ra được lá nào đền <strong className="text-yellow-300">{26 * currentMultiplier} lá</strong> ({congPenaltyAmount.toLocaleString()} Xu)
                  </div>
                </div>
              </div>
              <div className={`w-10 h-5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
                config.congEnabled ? 'bg-yellow-500' : 'bg-neutral-700'
              }`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  config.congEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>
          )}

          {/* Tới Trắng Tức Thì (Nếu bật) */}
          {showInstantWin && (
            <div 
              onClick={() => onChange({ instantWinEnabled: !config.instantWinEnabled })}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                config.instantWinEnabled 
                  ? 'bg-amber-950/30 border-yellow-500/60 shadow-sm' 
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start gap-2.5 pr-2">
                <Crown className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Tới Trắng Tức Thì</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      config.instantWinEnabled
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {config.instantWinEnabled ? 'BẬT' : 'TẮT'}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                    Sảnh rồng, 5 đôi thông, 6 đôi... ăn trắng ván đấu
                  </div>
                </div>
              </div>
              <div className={`w-10 h-5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
                config.instantWinEnabled ? 'bg-yellow-500' : 'bg-neutral-700'
              }`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  config.instantWinEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>
          )}
        </div>

        {/* TỐC ĐỘ SUY NGHĨ CỦA BOT */}
        {showBotThinkDelay && config.botThinkDelayMs !== undefined && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
            <div>
              <div className="text-xs font-bold text-white">Độ Trễ Nước Đi Của Bot (Bot Think Delay)</div>
              <div className="text-[10px] text-neutral-400">Thời gian nghỉ để người chơi quan sát nước đánh: <span className="text-yellow-400 font-black">{config.botThinkDelayMs}ms</span></div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-48">
              <input
                type="range"
                min={300}
                max={1800}
                step={50}
                value={config.botThinkDelayMs}
                onChange={(e) => onChange({ botThinkDelayMs: parseInt(e.target.value, 10) })}
                className="w-full accent-yellow-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
