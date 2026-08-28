import React, { useState, useEffect } from 'react';
import { GameMode, PlayerCount } from '../../engine/types';
import { 
  Users, 
  Coins, 
  Flame, 
  Sparkles, 
  Ban, 
  Zap, 
  Snowflake, 
  Crown, 
  Edit3, 
  ShieldAlert
} from 'lucide-react';
import { Card, Badge } from '../primitives';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileVirtualInput } from '../mobile/components/MobileVirtualInput';

export interface TableConfigState {
  playerCount: PlayerCount;
  mode: GameMode;
  betAmount: number;
  choppingMultiplier?: number;
  congEnabled?: boolean;
  prohibitEndingWithTwo?: boolean;
  allowFourPairsCutAnytime?: boolean;
  threeSpadesEndingBonus?: boolean;
  cascadeChopEnabled?: boolean;
  instantWinEnabled?: boolean;
}

const PLAYER_COUNT_OPTIONS: readonly { count: PlayerCount; label: string; desc: string }[] = [
  { count: 2, label: 'Solo 1v1 (2 Người)', desc: '1 Bạn vs 1 Bot' },
  { count: 3, label: 'Bàn 3 Người', desc: '1 Bạn vs 2 Bot' },
  { count: 4, label: 'Bàn 4 Người (Chuẩn)', desc: '1 Bạn vs 3 Bot' }
];

const GAME_MODE_TABS: readonly { mode: GameMode; label: string }[] = [
  { mode: 'COUNT_CARDS', label: '⚡ Đếm Lá' },
  { mode: 'WINNER_TAKES_ALL', label: '👑 Nhất Ăn Tất' },
  { mode: 'TRADITIONAL', label: '🎖️ Truyền Thống' }
];

export interface TableRulesConfigPanelProps {
  playerCoins: number;
  config: TableConfigState;
  onChange: (updated: Partial<TableConfigState>) => void;
  showInstantWin?: boolean;
  showCongOption?: boolean;
}

const PRESET_BETS = [500, 1000, 2000, 5000];

export const TableRulesConfigPanel: React.FC<TableRulesConfigPanelProps> = ({
  playerCoins,
  config,
  onChange,
  showInstantWin = true,
  showCongOption = false
}) => {
  const [isCustomBet, setIsCustomBet] = useState<boolean>(() => !PRESET_BETS.includes(config.betAmount));
  const [customBetInput, setCustomBetInput] = useState<string>(config.betAmount.toString());
  const [betError, setBetError] = useState<string | null>(null);
  const { isMobile } = useIsMobile();

  useEffect(() => {
    setCustomBetInput(config.betAmount.toString());
    if (!PRESET_BETS.includes(config.betAmount)) {
      setIsCustomBet(true);
    }
  }, [config.betAmount]);

  // Tính toán tiền cọc an toàn
  const currentMultiplier = config.choppingMultiplier || 1;
  const depositRequired = 26 * config.betAmount * currentMultiplier;
  const depositPercent = playerCoins > 0 ? (depositRequired / playerCoins) * 100 : 100;
  const isInsufficientCoins = playerCoins < depositRequired;

  const congPenaltyAmount = config.betAmount * 26 * currentMultiplier;
  const minThoiAmount = config.betAmount * 0.5 * currentMultiplier;
  const maxThoiAmount = config.betAmount * 4 * currentMultiplier;
  const fourPairsRewardAmount = config.betAmount * 4 * currentMultiplier;

  let riskBadgeVariant: 'gold' | 'neutral' | 'danger' = 'neutral';
  let riskBadgeText = '🛡️ Vốn An Toàn';
  let riskAdvice = 'Mức cược an toàn, số dư ví đủ khả năng chống chịu nhiều ván đấu.';

  if (isInsufficientCoins) {
    riskBadgeVariant = 'danger';
    riskBadgeText = '🚨 Thiếu Tiền Cọc';
    riskAdvice = `Số dư ví (${playerCoins.toLocaleString()} Xu) không đủ mức cọc an toàn tối thiểu (${depositRequired.toLocaleString()} Xu)!`;
  } else if (depositPercent > 65) {
    riskBadgeVariant = 'danger';
    riskBadgeText = '🔥 Cược Rất Lớn';
    riskAdvice = 'Cảnh báo: Tiền cọc chiếm hơn 65% tổng tài sản. Một ván thua Cóng có thể khiến bạn mất nhiều vốn!';
  } else if (depositPercent > 40) {
    riskBadgeVariant = 'gold';
    riskBadgeText = '⚠️ Cân Nhắc Vốn';
    riskAdvice = 'Cọc an toàn chiếm gần nửa tài sản ví. Hãy đánh cẩn trọng, tránh giữ Heo quá lâu.';
  } else if (depositPercent > 20) {
    riskBadgeVariant = 'gold';
    riskBadgeText = '⚖️ Hợp Lý';
    riskAdvice = 'Mức cược hợp lý, quản lý vốn tốt. Phù hợp để chơi lâu dài.';
  }

  const handleSelectPresetBet = (amt: number) => {
    setIsCustomBet(false);
    setBetError(null);
    setCustomBetInput(amt.toString());
    onChange({ betAmount: amt });
  };

  const handleToggleCustomBet = () => {
    setIsCustomBet(true);
    setBetError(null);
  };

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

  const handleApplyQuickPercent = (fraction: number) => {
    const maxSafeBet = Math.max(10, Math.floor((playerCoins * fraction) / (26 * currentMultiplier)));
    setBetError(null);
    setCustomBetInput(maxSafeBet.toString());
    onChange({ betAmount: maxSafeBet });
  };

  const activeBotCount = config.playerCount - 1;

  return (
    <div className="space-y-3.5 text-[var(--text-primary)] select-none">
      
      {/* 1. BẢNG ĐÁNH GIÁ RỦI RO TÀI CHÍNH */}
      <Card variant="nested" className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-[var(--color-gold)]" />
            <div className="text-xs truncate">
              <span className="text-[var(--text-muted)]">Cọc an toàn: </span>
              <strong className="text-[var(--text-primary)] font-bold">{depositRequired.toLocaleString()} Xu</strong>
              <span className="text-[var(--text-muted)] text-[11px] ml-1">({depositPercent.toFixed(1)}% ví)</span>
            </div>
          </div>

          <Badge variant={riskBadgeVariant} size="sm">
            {riskBadgeText}
          </Badge>
        </div>

        {/* Mini Progress Bar */}
        <div className="mt-2 pt-1.5 border-t border-[var(--border-container)] flex items-center gap-2.5">
          <div className="w-20 sm:w-28 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden border border-[var(--border-container)] flex-shrink-0">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                depositPercent > 65
                  ? 'bg-red-500'
                  : depositPercent > 40
                  ? 'bg-[var(--color-gold)]'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, depositPercent))}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] truncate flex-1 leading-tight">
            💡 {riskAdvice}
          </p>
        </div>
      </Card>

      {/* 2. SỐ LƯỢNG NGƯỜI CHƠI */}
      <Card variant="surface" className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--color-gold)]" />
            <span>Số Lượng Người Chơi</span>
          </label>
          <span className="text-[11px] text-[var(--text-muted)]">
            (1 Bạn + {activeBotCount} Bot AI)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PLAYER_COUNT_OPTIONS.map(item => {
            const isSelected = config.playerCount === item.count;
            return (
              <button
                key={item.count}
                type="button"
                onClick={() => onChange({ playerCount: item.count })}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] text-[var(--text-primary)] font-bold shadow-sm'
                    : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-[var(--color-gold)]' : 'text-[var(--text-muted)]'}`}>{item.desc}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 3. QUY TẮC KẾT THÚC VÁN & TÍNH TIỀN */}
      <Card variant="surface" className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Crown className="w-4 h-4 text-[var(--color-gold)]" />
            <span>Quy Tắc Tính Điểm &amp; Kết Thúc</span>
          </label>
          <span className="text-[11px] text-[var(--text-muted)]">
            Đối thủ: <strong className="text-[var(--color-gold)]">{activeBotCount} người</strong>
          </span>
        </div>

        {/* 3 Nút Chuyển Tab */}
        <div className="grid grid-cols-3 gap-2">
          {GAME_MODE_TABS.map(tab => {
            const isSelected = config.mode === tab.mode;
            return (
              <button
                key={tab.mode}
                type="button"
                onClick={() => onChange({ mode: tab.mode })}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                  isSelected
                    ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] text-[var(--text-primary)] shadow-sm'
                    : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* KHUNG HUD TRÌNH DIỄN CHI TIẾT QUY TẮC */}
        {(() => {
          const ruleInfoMap: Record<GameMode, {
            title: string;
            badge: string;
            desc: string;
            maxWin: string;
            maxLoss: string;
          }> = {
            COUNT_CARDS: {
              title: '⚡ Đếm Lá Sát Phạt',
              badge: `${(config.betAmount * currentMultiplier).toLocaleString()} Xu/lá`,
              desc: '1 người về Nhất ván đấu dừng ngay lập tức. Đếm số lá bài còn lại trên tay của tất cả người thua để thu tiền phạt.',
              maxWin: `+${(activeBotCount * 13 * config.betAmount * currentMultiplier).toLocaleString()} Xu`,
              maxLoss: `-${congPenaltyAmount.toLocaleString()} Xu (Cóng: 26 lá)`
            },
            WINNER_TAKES_ALL: {
              title: '👑 Nhất Ăn Tất',
              badge: `${activeBotCount}x cược cả bàn`,
              desc: '1 người về Nhất gom trọn toàn bộ tiền cược của cả bàn đấu. Người thua chỉ mất đúng 1 lần tiền cược cố định.',
              maxWin: `+${(activeBotCount * config.betAmount * currentMultiplier).toLocaleString()} Xu`,
              maxLoss: `-${(config.betAmount * currentMultiplier).toLocaleString()} Xu (Cố định)`
            },
            TRADITIONAL: {
              title: '🎖️ Truyền Thống (Nhất Nhì Ba Bét)',
              badge: 'Phân hạng 1-2-3-4',
              desc: 'Các người chơi đánh tiếp tục cho đến người áp chót để phân định thứ hạng Nhất, Nhì, Ba, Bét và chia tiền cược tương ứng.',
              maxWin: `+${((activeBotCount >= 3 ? 2 : activeBotCount >= 2 ? 2 : 1) * config.betAmount * currentMultiplier).toLocaleString()} Xu`,
              maxLoss: `-${((activeBotCount >= 3 ? 2 : activeBotCount >= 2 ? 2 : 1) * config.betAmount * currentMultiplier).toLocaleString()} Xu (Bét)`
            },
            CUSTOM: {
              title: '🛠️ Tùy Chỉnh Nâng Cao',
              badge: 'Tự do cấu hình',
              desc: 'Tự do kết hợp các nhóm quy tắc chặt, cóng, tới trắng và vòng chơi theo sở thích riêng.',
              maxWin: `+${(activeBotCount * 13 * config.betAmount * currentMultiplier).toLocaleString()} Xu`,
              maxLoss: `-${congPenaltyAmount.toLocaleString()} Xu`
            }
          };

          const activeInfo = ruleInfoMap[config.mode] || ruleInfoMap.COUNT_CARDS;

          return (
            <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-container)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{activeInfo.title}</span>
                  <Badge variant="gold" size="sm">{activeInfo.badge}</Badge>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Bàn {config.playerCount} người
                </span>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {activeInfo.desc}
              </p>

              {/* 2 Hộp Thống Kê */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-between">
                  <div className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center gap-1">
                    <span>🏆</span>
                    <span>Thắng Nhất:</span>
                  </div>
                  <div className="text-xs font-bold text-[#4ade80] font-mono">{activeInfo.maxWin}</div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-between">
                  <div className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center gap-1">
                    <span>💀</span>
                    <span>Thua Tối Đa:</span>
                  </div>
                  <div className="text-xs font-bold text-[#f87171] font-mono">{activeInfo.maxLoss}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* 4. MỨC CƯỢC VÁN ĐẤU */}
      <Card variant="surface" className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-[var(--color-gold)]" />
            <span>Mức Cược Ván Đấu (Xu)</span>
          </label>
          <div className="text-xs text-[var(--text-muted)]">
            Số dư ví: <span className="text-[var(--color-gold)] font-bold">{playerCoins.toLocaleString()} Xu</span>
          </div>
        </div>

        {/* Lưới 4 Preset */}
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
                className={`py-2.5 px-2 rounded-xl font-bold text-xs transition-all border text-center ${
                  isPresetDisabled
                    ? 'opacity-30 cursor-not-allowed bg-[var(--bg-input)] border-white/5 text-[var(--text-dim)] line-through'
                    : isSelected
                    ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-sm cursor-pointer'
                    : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-white cursor-pointer'
                }`}
              >
                {amt.toLocaleString()} Xu
              </button>
            );
          })}
        </div>

        {/* Nút Tự Do */}
        <button
          type="button"
          onClick={handleToggleCustomBet}
          className={`w-full py-2 px-3 rounded-xl font-semibold text-xs transition-all border cursor-pointer flex items-center justify-center gap-2 ${
            isCustomBet
              ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-sm'
              : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Tùy Chọn Mức Cược Khác (Nhập Tự Do)</span>
        </button>

        {/* KHUNG NHẬP SỐ TIỀN & CÁC NÚT % KHI CHỌN TÙY CHỌN */}
        {isCustomBet && (
          <div className="pt-1 space-y-2.5 bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-container)]">
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>✍️ Nhập mức cược mong muốn:</span>
              <span className="text-[var(--text-muted)]">
                Đang cược: <strong className="text-[var(--color-gold)]">{config.betAmount.toLocaleString()} Xu</strong>
              </span>
            </div>

            {/* Ô Nhập Số Tiền: Mobile dùng MobileVirtualInput, Desktop dùng input thường */}
            {isMobile ? (
              <MobileVirtualInput
                value={customBetInput}
                onChange={handleCustomBetChange}
                placeholder="Nhập mức cược mong muốn..."
                icon={null}
                label={null}
                error={null}
                maxLength={10}
                showRandomNameButton={false}
                showPasteButton={false}
                onRandomName={null}
                onPaste={null}
                onSubmit={null}
                className={null}
                inputClassName="font-mono font-bold"
                clearable={true}
                renderExtraActions={() => (
                  <span className="text-xs text-[var(--color-gold)] font-bold px-1">
                    Xu
                  </span>
                )}
              />
            ) : (
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={customBetInput}
                  onChange={(e) => handleCustomBetChange(e.target.value)}
                  placeholder="Nhập mức cược mong muốn..."
                  className={`w-full bg-[var(--bg-card)] border rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-[var(--text-primary)] focus:outline-none transition-all pr-12 ${
                    betError 
                      ? 'border-red-500 focus:border-red-400' 
                      : 'border-[var(--border-card)] focus:border-[var(--color-gold)]'
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-gold)] font-bold pointer-events-none">
                  Xu
                </span>
              </div>
            )}

            {/* Lưới 4 Nút % */}
            <div className="grid grid-cols-4 gap-1.5">
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
                  className="w-full py-1.5 px-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)] text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-center whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {betError && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium pt-0.5">
                <span>⚠️</span>
                <span>{betError}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 5. HỆ SỐ PHẠT CHẶT */}
      <Card variant="surface" className="p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[var(--color-gold)]" />
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <span>Hệ Số Phạt Chặt Bàn Đấu</span>
                <Badge variant="gold" size="sm">
                  {currentMultiplier === 1 ? 'Chuẩn (x1)' : `Nhân ${currentMultiplier}x`}
                </Badge>
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                Nhân {currentMultiplier}x tiền phạt Đếm lá, Chặt Heo/Hàng và Cóng
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {[
            { mult: 1, label: 'x1', desc: 'Chuẩn' },
            { mult: 2, label: 'x2', desc: 'Sát Phạt' },
            { mult: 3, label: 'x3', desc: 'Khốc Liệt' },
            { mult: 4, label: 'x4', desc: 'Tử Địa' },
            { mult: 5, label: 'x5', desc: 'Hủy Diệt' }
          ].map(item => {
            const isSelected = currentMultiplier === item.mult;
            return (
              <button
                key={item.mult}
                type="button"
                onClick={() => onChange({ choppingMultiplier: item.mult })}
                className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-sm'
                    : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className="text-[9px] opacity-70 mt-0.5">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 6. CÁC TÙY CHỌN LUẬT PHỤ */}
      <Card variant="surface" className="p-3.5 space-y-2.5">
        <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
          <span>Tùy Chọn Luật Bàn Đấu</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Cấm 2 Cuối Cùng */}
          <div 
            onClick={() => onChange({ prohibitEndingWithTwo: config.prohibitEndingWithTwo !== false ? false : true })}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              config.prohibitEndingWithTwo !== false 
                ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
            }`}
          >
            <div className="flex items-start gap-2 pr-2">
              <Ban className="w-3.5 h-3.5 text-[#f87171] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Cấm Đánh 2 Cuối Cùng
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  Cấm về Heo • Thối phạt từ <strong className="text-[var(--color-gold)]">{minThoiAmount.toLocaleString()}</strong> đến <strong className="text-[var(--color-gold)]">{maxThoiAmount.toLocaleString()} Xu</strong>
                </div>
              </div>
            </div>
            <div className={`w-9 h-4.5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
              config.prohibitEndingWithTwo !== false ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'
            }`}>
              <div className={`bg-[#0a0c0e] w-3.5 h-3.5 rounded-full shadow transform transition-transform ${
                config.prohibitEndingWithTwo !== false ? 'translate-x-4.5 bg-white' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* 4 Đôi Thông Cắt Tự Do */}
          <div 
            onClick={() => onChange({ allowFourPairsCutAnytime: !config.allowFourPairsCutAnytime })}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              config.allowFourPairsCutAnytime 
                ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
            }`}
          >
            <div className="flex items-start gap-2 pr-2">
              <Zap className="w-3.5 h-3.5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  4 Đôi Thông Cắt Tự Do
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  Chặt bất kỳ lúc nào • Thắng ngay <strong className="text-[var(--color-gold)]">+{fourPairsRewardAmount.toLocaleString()} Xu</strong>
                </div>
              </div>
            </div>
            <div className={`w-9 h-4.5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
              config.allowFourPairsCutAnytime ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'
            }`}>
              <div className={`bg-[#0a0c0e] w-3.5 h-3.5 rounded-full shadow transform transition-transform ${
                config.allowFourPairsCutAnytime ? 'translate-x-4.5 bg-white' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* Về 3 Bích Cuối Cùng */}
          <div 
            onClick={() => onChange({ threeSpadesEndingBonus: config.threeSpadesEndingBonus !== false ? false : true })}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              config.threeSpadesEndingBonus !== false 
                ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
            }`}
          >
            <div className="flex items-start gap-2 pr-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Về 3 Bích Cuối Cùng
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  Từ ván 2+, dứt điểm bằng 3♠ nhận <strong className="text-[var(--color-gold)]">gấp đôi (2x)</strong> tiền thắng cả bàn
                </div>
              </div>
            </div>
            <div className={`w-9 h-4.5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
              config.threeSpadesEndingBonus !== false ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'
            }`}>
              <div className={`bg-[#0a0c0e] w-3.5 h-3.5 rounded-full shadow transform transition-transform ${
                config.threeSpadesEndingBonus !== false ? 'translate-x-4.5 bg-white' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* Chặt Chồng Tích Lũy */}
          <div 
            onClick={() => onChange({ cascadeChopEnabled: config.cascadeChopEnabled !== false ? false : true })}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              config.cascadeChopEnabled !== false 
                ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
            }`}
          >
            <div className="flex items-start gap-2 pr-2">
              <Flame className="w-3.5 h-3.5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Chặt Chồng Tích Lũy
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  Cộng dồn phạt đè • Người bị chặt cuối đền toàn bộ chuỗi
                </div>
              </div>
            </div>
            <div className={`w-9 h-4.5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
              config.cascadeChopEnabled !== false ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'
            }`}>
              <div className={`bg-[#0a0c0e] w-3.5 h-3.5 rounded-full shadow transform transition-transform ${
                config.cascadeChopEnabled !== false ? 'translate-x-4.5 bg-white' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* Phạt Cóng */}
          {showCongOption && (
            <div 
              onClick={() => onChange({ congEnabled: !config.congEnabled })}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                config.congEnabled 
                  ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                  : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
              }`}
            >
              <div className="flex items-start gap-2 pr-2">
                <Snowflake className="w-3.5 h-3.5 text-[#60a5fa] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Luật Phạt Cóng (Cháy Bài)
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                    Không ra được lá nào đền <strong className="text-[var(--color-gold)]">{26 * currentMultiplier} lá</strong> ({congPenaltyAmount.toLocaleString()} Xu)
                  </div>
                </div>
              </div>
              <div className={`w-9 h-4.5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
                config.congEnabled ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'
              }`}>
                <div className={`bg-[#0a0c0e] w-3.5 h-3.5 rounded-full shadow transform transition-transform ${
                  config.congEnabled ? 'translate-x-4.5 bg-white' : 'translate-x-0'
                }`} />
              </div>
            </div>
          )}

          {/* Tới Trắng Tức Thì */}
          {showInstantWin && (
            <div 
              onClick={() => onChange({ instantWinEnabled: !config.instantWinEnabled })}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                config.instantWinEnabled 
                  ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                  : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
              }`}
            >
              <div className="flex items-start gap-2 pr-2">
                <Crown className="w-3.5 h-3.5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Tới Trắng Tức Thì
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                    Sảnh rồng, 5 đôi thông, 6 đôi... ăn trắng ván đấu
                  </div>
                </div>
              </div>
              <div className={`w-9 h-4.5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
                config.instantWinEnabled ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'
              }`}>
                <div className={`bg-[#0a0c0e] w-3.5 h-3.5 rounded-full shadow transform transition-transform ${
                  config.instantWinEnabled ? 'translate-x-4.5 bg-white' : 'translate-x-0'
                }`} />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
