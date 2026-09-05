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
import { Card, Badge, ToggleSwitch } from '../primitives';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileVirtualInput } from '../mobile/components/MobileVirtualInput';
import { useI18n } from '../../locales';
import { calculateRequiredDeposit, calculateMaxSafeBet, canAffordDeposit } from '../../engine/constants/economy';

export interface TableConfigState {
  playerCount: PlayerCount;
  mode: GameMode;
  betAmount: number;
  choppingMultiplier: number;
  congEnabled: boolean;
  prohibitEndingWithTwo: boolean;
  allowFourPairsCutAnytime: boolean;
  threeSpadesEndingBonus: boolean;
  cascadeChopEnabled: boolean;
  instantWinEnabled: boolean;
}

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
  const { t } = useI18n();
  const [isCustomBet, setIsCustomBet] = useState<boolean>(() => !PRESET_BETS.includes(config.betAmount));
  const [customBetInput, setCustomBetInput] = useState<string>(config.betAmount.toString());
  const [betError, setBetError] = useState<string | null>(null);
  const { isMobile } = useIsMobile();

  const playerCountOptions: Array<{ count: PlayerCount; label: string; desc: string }> = [
    { count: 2, label: t('tableConfig.playerCount2'), desc: t('tableConfig.playerCount2Desc') },
    { count: 3, label: t('tableConfig.playerCount3'), desc: t('tableConfig.playerCount3Desc') },
    { count: 4, label: t('tableConfig.playerCount4'), desc: t('tableConfig.playerCount4Desc') }
  ];

  const gameModeTabs: Array<{ mode: GameMode; label: string }> = [
    { mode: 'COUNT_CARDS', label: t('modes.countCards') },
    { mode: 'WINNER_TAKES_ALL', label: t('modes.winnerTakesAll') },
    { mode: 'TRADITIONAL', label: t('modes.traditional') }
  ];

  useEffect(() => {
    setCustomBetInput(config.betAmount.toString());
    if (!PRESET_BETS.includes(config.betAmount)) {
      setIsCustomBet(true);
    }
  }, [config.betAmount]);

  // Tính toán tiền cọc an toàn
  const currentMultiplier = config.choppingMultiplier;
  const depositRequired = calculateRequiredDeposit(config.betAmount);
  const depositPercent = playerCoins > 0 ? (depositRequired / playerCoins) * 100 : 100;
  const isInsufficientCoins = !canAffordDeposit(playerCoins, config.betAmount);

  const congPenaltyAmount = config.betAmount * 26;
  const minThoiAmount = config.betAmount * 0.5 * currentMultiplier;
  const maxThoiAmount = config.betAmount * 4 * currentMultiplier;
  const fourPairsRewardAmount = config.betAmount * 4 * currentMultiplier;

  const isProhibitEndingWithTwo = config.prohibitEndingWithTwo;
  const isAllowFourPairsCutAnytime = config.allowFourPairsCutAnytime;
  const isThreeSpadesEndingBonus = config.threeSpadesEndingBonus;
  const isCascadeChopEnabled = config.cascadeChopEnabled;
  const isCongEnabled = config.congEnabled;
  const isInstantWinEnabled = config.instantWinEnabled;

  let riskBadgeVariant: 'gold' | 'neutral' | 'danger' = 'neutral';
  let riskBadgeText = t('tableConfig.depositSafe');
  let riskAdvice = t('tableConfig.depositSafeAdvice');

  if (isInsufficientCoins) {
    riskBadgeVariant = 'danger';
    riskBadgeText = t('tableConfig.depositDanger');
    riskAdvice = t('tableConfig.depositDangerAdvice', { coins: playerCoins.toLocaleString(), deposit: depositRequired.toLocaleString() });
  } else if (depositPercent > 65) {
    riskBadgeVariant = 'danger';
    riskBadgeText = t('tableConfig.depositHighRisk');
    riskAdvice = t('tableConfig.depositHighRiskAdvice');
  } else if (depositPercent > 40) {
    riskBadgeVariant = 'gold';
    riskBadgeText = t('tableConfig.depositWarning');
    riskAdvice = t('tableConfig.depositWarningAdvice');
  } else if (depositPercent > 20) {
    riskBadgeVariant = 'gold';
    riskBadgeText = t('tableConfig.depositReasonable');
    riskAdvice = t('tableConfig.depositReasonableAdvice');
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
      setBetError(t('tableConfig.betInputErrorEmpty'));
      return;
    }

    const parsed = parseInt(cleanDigits, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setBetError(t('tableConfig.betInputErrorPositive'));
      return;
    }

    const reqDeposit = calculateRequiredDeposit(parsed);
    if (!canAffordDeposit(playerCoins, parsed)) {
      setBetError(t('tableConfig.betInputErrorDeposit', { deposit: reqDeposit.toLocaleString(), coins: playerCoins.toLocaleString() }));
    } else {
      setBetError(null);
    }

    onChange({ betAmount: parsed });
  };

  const handleApplyQuickPercent = (fraction: number) => {
    const maxSafeBet = calculateMaxSafeBet(playerCoins, fraction);
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
              <span className="text-[var(--text-muted)]">{t('tableConfig.depositLabel')}</span>
              <strong className="text-[var(--text-primary)] font-bold">{depositRequired.toLocaleString()} Xu</strong>
              <span className="text-[var(--text-muted)] text-[11px] ml-1">{t('tableConfig.depositWalletPercent', { percent: depositPercent.toFixed(1) })}</span>
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
            <span>{t('tableConfig.playerCountLabel')}</span>
          </label>
          <span className="text-[11px] text-[var(--text-muted)]">
            {t('tableConfig.playerCountSummary', { count: activeBotCount })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {playerCountOptions.map(item => {
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
            <span>{t('tableConfig.gameModeLabel')}</span>
          </label>
          <span className="text-[11px] text-[var(--text-muted)]">
            {t('tableConfig.opponentsCount', { count: activeBotCount })}
          </span>
        </div>

        {/* 3 Nút Chuyển Tab */}
        <div className="grid grid-cols-3 gap-2">
          {gameModeTabs.map(tab => {
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
              title: t('tableConfig.modeCountCardsTitle'),
              badge: t('tableConfig.modeCountCardsBadge', { amount: config.betAmount.toLocaleString() }),
              desc: t('tableConfig.modeCountCardsDesc'),
              maxWin: t('tableConfig.modeCountCardsMaxWin', { amount: (activeBotCount * 13 * config.betAmount).toLocaleString() }),
              maxLoss: t('tableConfig.modeCountCardsMaxLoss', { 
                amount: congPenaltyAmount.toLocaleString(),
                cards: '26'
              })
            },
            WINNER_TAKES_ALL: {
              title: t('tableConfig.modeWinnerTakesAllTitle'),
              badge: t('tableConfig.modeWinnerTakesAllBadge', { count: activeBotCount }),
              desc: t('tableConfig.modeWinnerTakesAllDesc'),
              maxWin: t('tableConfig.modeWinnerTakesAllMaxWin', { amount: (activeBotCount * config.betAmount).toLocaleString() }),
              maxLoss: t('tableConfig.modeWinnerTakesAllMaxLoss', { amount: config.betAmount.toLocaleString() })
            },
            TRADITIONAL: {
              title: t('tableConfig.modeTraditionalTitle'),
              badge: t('tableConfig.modeTraditionalBadge'),
              desc: t('tableConfig.modeTraditionalDesc'),
              maxWin: t('tableConfig.modeTraditionalMaxWin', { amount: ((activeBotCount >= 3 ? 2 : activeBotCount >= 2 ? 2 : 1) * config.betAmount).toLocaleString() }),
              maxLoss: t('tableConfig.modeTraditionalMaxLoss', { amount: ((activeBotCount >= 3 ? 2 : activeBotCount >= 2 ? 2 : 1) * config.betAmount).toLocaleString() })
            },
            CUSTOM: {
              title: t('tableConfig.modeCustomTitle'),
              badge: t('tableConfig.modeCustomBadge'),
              desc: t('tableConfig.modeCustomDesc'),
              maxWin: t('tableConfig.modeCountCardsMaxWin', { amount: (activeBotCount * 13 * config.betAmount).toLocaleString() }),
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
                  {t('tableConfig.tablePlayerCount', { count: config.playerCount })}
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
                    <span>{t('tableConfig.statMaxWin')}</span>
                  </div>
                  <div className="text-xs font-bold text-[#4ade80] font-mono">{activeInfo.maxWin}</div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-between">
                  <div className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center gap-1">
                    <span>💀</span>
                    <span>{t('tableConfig.statMaxLoss')}</span>
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
            <span>{t('tableConfig.betStakeLabelXu')}</span>
          </label>
          <div className="text-xs text-[var(--text-muted)]">
            {t('tableConfig.walletBalance')} <span className="text-[var(--color-gold)] font-bold">{playerCoins.toLocaleString()} Xu</span>
          </div>
        </div>

        {/* Lưới 4 Preset */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_BETS.map(amt => {
            const isSelected = !isCustomBet && config.betAmount === amt;
            const requiredDepositForPreset = calculateRequiredDeposit(amt);
            const isPresetDisabled = !canAffordDeposit(playerCoins, amt);

            return (
              <button
                key={amt}
                type="button"
                disabled={isPresetDisabled}
                onClick={() => handleSelectPresetBet(amt)}
                title={isPresetDisabled ? t('tableConfig.presetDepositNotEnough', { amount: requiredDepositForPreset.toLocaleString() }) : t('tableConfig.presetBetTooltip', { amount: amt.toLocaleString() })}
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
          <span>{t('tableConfig.customBet')}</span>
        </button>

        {/* KHUNG NHẬP SỐ TIỀN & CÁC NÚT % KHI CHỌN TÙY CHỌN */}
        {isCustomBet && (
          <div className="pt-1 space-y-2.5 bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-container)]">
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>{t('tableConfig.inputDesiredBet')}</span>
              <span className="text-[var(--text-muted)]">
                {t('tableConfig.currentBetting')} <strong className="text-[var(--color-gold)]">{config.betAmount.toLocaleString()} Xu</strong>
              </span>
            </div>

            {/* Ô Nhập Số Tiền: Mobile dùng MobileVirtualInput, Desktop dùng input thường */}
            {isMobile ? (
              <MobileVirtualInput
                value={customBetInput}
                onChange={handleCustomBetChange}
                placeholder={t('tableConfig.customBetPlaceholder')}
                maxLength={10}
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
                  placeholder={t('tableConfig.customBetPlaceholder')}
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
                { label: t('tableConfig.percentMax'), fraction: 1.0 }
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
                <span>{t('tableConfig.multiplierLabel')}</span>
                <Badge variant="gold" size="sm">
                  {currentMultiplier === 1 ? t('tableConfig.multiplierStandard') : t('tableConfig.multiplierTimes', { count: currentMultiplier, multiplier: currentMultiplier })}
                </Badge>
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {t('tableConfig.multiplierDesc', { count: currentMultiplier, multiplier: currentMultiplier })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {[
            { mult: 1, label: 'x1', desc: t('tableConfig.multDescStandard') },
            { mult: 2, label: 'x2', desc: t('tableConfig.multDescHeavy') },
            { mult: 3, label: 'x3', desc: t('tableConfig.multDescFierce') },
            { mult: 4, label: 'x4', desc: t('tableConfig.multDescDeadly') },
            { mult: 5, label: 'x5', desc: t('tableConfig.multDescDestruction') }
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
          <span>{t('tableConfig.tableRulesOptions')}</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Cấm 2 Cuối Cùng */}
          <div 
            onClick={() => onChange({ prohibitEndingWithTwo: !isProhibitEndingWithTwo })}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              isProhibitEndingWithTwo 
                ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
            }`}
          >
            <div className="flex items-start gap-2 pr-2">
              <Ban className="w-3.5 h-3.5 text-[#f87171] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {t('tableConfig.ruleNoEndTwo')}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {t('tableConfig.ruleNoEndTwoDesc', { min: minThoiAmount.toLocaleString(), max: maxThoiAmount.toLocaleString() })}
                </div>
              </div>
            </div>
            <ToggleSwitch checked={isProhibitEndingWithTwo} size="sm" />
          </div>

          {/* 4 Đôi Thông Cắt Tự Do */}
          <div 
            onClick={() => onChange({ allowFourPairsCutAnytime: !isAllowFourPairsCutAnytime })}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              isAllowFourPairsCutAnytime 
                ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
            }`}
          >
            <div className="flex items-start gap-2 pr-2">
              <Zap className="w-3.5 h-3.5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {t('tableConfig.ruleFourPairsCutAnytime')}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {t('tableConfig.ruleFourPairsCutAnytimeDesc', { reward: fourPairsRewardAmount.toLocaleString(), amount: fourPairsRewardAmount.toLocaleString() })}
                </div>
              </div>
            </div>
            <ToggleSwitch checked={isAllowFourPairsCutAnytime} size="sm" />
          </div>

          {/* Về 3 Bích Cuối Cùng */}
          <div 
            onClick={() => onChange({ threeSpadesEndingBonus: !isThreeSpadesEndingBonus })}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              isThreeSpadesEndingBonus 
                ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
            }`}
          >
            <div className="flex items-start gap-2 pr-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {t('tableConfig.ruleThreeSpadesEndingBonus')}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {t('tableConfig.ruleThreeSpadesEndingBonusDesc')}
                </div>
              </div>
            </div>
            <ToggleSwitch checked={isThreeSpadesEndingBonus} size="sm" />
          </div>

          {/* Chặt Chồng Tích Lũy */}
          <div 
            onClick={() => onChange({ cascadeChopEnabled: !isCascadeChopEnabled })}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              isCascadeChopEnabled 
                ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
            }`}
          >
            <div className="flex items-start gap-2 pr-2">
              <Flame className="w-3.5 h-3.5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {t('tableConfig.ruleCascadeChop')}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {t('tableConfig.ruleCascadeChopDesc')}
                </div>
              </div>
            </div>
            <ToggleSwitch checked={isCascadeChopEnabled} size="sm" />
          </div>

          {/* Phạt Cóng */}
          {showCongOption && (
            <div 
              onClick={() => onChange({ congEnabled: !isCongEnabled })}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                isCongEnabled 
                  ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                  : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
              }`}
            >
              <div className="flex items-start gap-2 pr-2">
                <Snowflake className="w-3.5 h-3.5 text-[#60a5fa] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {t('tableConfig.ruleCong')}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                    {t('tableConfig.ruleCongDesc', { count: 26, cards: 26, amount: congPenaltyAmount.toLocaleString() })}
                  </div>
                </div>
              </div>
              <ToggleSwitch checked={isCongEnabled} size="sm" />
            </div>
          )}

          {/* Tới Trắng Tức Thì */}
          {showInstantWin && (
            <div 
              onClick={() => onChange({ instantWinEnabled: !isInstantWinEnabled })}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                isInstantWinEnabled 
                  ? 'bg-[var(--bg-card)] border-[var(--color-gold-border)] shadow-sm' 
                  : 'bg-[var(--bg-input)] border-[var(--border-container)] opacity-75'
              }`}
            >
              <div className="flex items-start gap-2 pr-2">
                <Crown className="w-3.5 h-3.5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {t('tableConfig.ruleInstantWin')}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                    {t('tableConfig.ruleInstantWinDesc')}
                  </div>
                </div>
              </div>
              <ToggleSwitch checked={isInstantWinEnabled} size="sm" />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
