import React, { useState, useEffect } from 'react';
import { getRankTierByElo, RANK_TIERS } from '../../../engine/elo';
import { getSettlementRuleLabel } from '../../../engine/types';
import { useViewStore } from '../../../stores/useViewStore';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';
import { useGameStore } from '../../../stores/useGameStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useUserStore } from '../../../stores/useUserStore';
import { 
  Trophy, 
  MapPin, 
  Play, 
  Target, 
  Disc, 
  Landmark, 
  Settings, 
  Sliders, 
  Edit2, 
  BookOpen, 
  ArrowRight, 
  Newspaper, 
  Maximize, 
  Minimize,
  AlertCircle,
  Wifi
} from 'lucide-react';
import { Badge, Card, Button } from '../../primitives';
import { isFullScreen, toggleFullScreen, lockToLandscape } from '../../utils/fullscreen';
import { useI18n } from '../../../locales';
import { GameMode, GameSettlementRule } from '../../../engine/types';

export interface MobileLobbyScreenProps {
  onPlayNow: (() => void) | null;
  onOpenQuickSetup: () => void;
  onOpenCustomGameModal: () => void;
  onOpenCampaign: () => void;
  onOpenQuests: () => void;
  onOpenLuckyWheel: () => void;
  onOpenBank: () => void;
  onOpenSettings: () => void;
  onOpenRules: (() => void) | null;
  onOpenNameSetup: () => void;
}

export const MobileLobbyScreen: React.FC<MobileLobbyScreenProps> = ({
  onPlayNow,
  onOpenQuickSetup,
  onOpenCustomGameModal,
  onOpenCampaign,
  onOpenQuests,
  onOpenLuckyWheel,
  onOpenBank,
  onOpenSettings,
  onOpenRules,
  onOpenNameSetup
}) => {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const { openModal } = useViewStore();
  const { newsfeed, initEcosystem } = useEcosystemStore();
  const { quickTableConfig } = useGameStore();
  const { onlineMultiplayerBetaEnabled } = useSettingsStore();
  const [isFullscreenState, setIsFullscreenState] = useState(isFullScreen());

  const getSettlementLabel = (rule?: GameSettlementRule | GameMode) => {
    switch (rule) {
      case 'WINNER_TAKES_ALL': return t('modes.winnerTakesAll');
      case 'TRADITIONAL': return t('modes.traditional');
      case 'COUNT_CARDS':
      default: return t('modes.countCards');
    }
  };

  useEffect(() => {
    initEcosystem();
  }, [initEcosystem]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreenState(isFullScreen());
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const currentRank = getRankTierByElo(profile.elo);

  // Tính % tiến trình lên Rank tiếp theo
  const currentTierIndex = RANK_TIERS.findIndex(t => t.id === currentRank.id);
  const nextTier = RANK_TIERS[currentTierIndex + 1];
  let eloProgress = 100;
  if (nextTier) {
    const tierSpan = nextTier.minElo - currentRank.minElo;
    const progressInTier = profile.elo - currentRank.minElo;
    eloProgress = Math.min(100, Math.max(0, Math.round((progressInTier / tierSpan) * 100)));
  }

  // Số lượng nhiệm vụ có thể nhận thưởng
  const claimableQuestsCount =
    profile.dailyQuests.filter(q => q.isCompleted && !q.isClaimed).length +
    profile.achievements.filter(a => a.isCompleted && !a.isClaimed).length;

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between bg-[var(--bg-canvas)] text-[var(--text-primary)] select-none font-sans overflow-hidden pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),0.5rem)] pl-[max(env(safe-area-inset-left),0.5rem)] pr-[max(env(safe-area-inset-right),0.5rem)] gap-1.5">
      
      {/* 1. TOP HEADER (ĐỒNG BỘ 100% DESIGN SYSTEM WEB) */}
      <header className="shrink-0 z-30 w-full max-w-4xl mx-auto bg-[var(--bg-container)] border border-[var(--border-container)] rounded-2xl px-3 py-1.5 shadow-sm">
        <div className="w-full flex items-center justify-between gap-2.5">
          {/* Profile & Avatar */}
          <div 
            onClick={onOpenNameSetup}
            className="flex items-center gap-2 cursor-pointer active:opacity-80 transition-opacity min-w-0"
            title={t('lobby.profileEditTooltip')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0">
              {profile.avatar || '😎'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate max-w-[120px]">
                  {profile.name || t('lobby.defaultName')}
                </span>
                <Edit2 className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[var(--color-gold)] font-bold leading-tight">
                <span>{currentRank.badge}</span>
                <span className="truncate">{currentRank.name}</span>
                <span className="text-[var(--text-muted)] font-mono font-normal">({profile.elo} Elo)</span>
              </div>
            </div>
          </div>

          {/* Thanh Tiến Trình Rank */}
          {nextTier && (
            <div className="hidden sm:flex flex-1 max-w-[180px] items-center gap-1.5 px-2">
              <div className="flex-1 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-container)]">
                <div 
                  className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-500"
                  style={{ width: `${eloProgress}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] shrink-0">
                {eloProgress}%
              </span>
            </div>
          )}

          {/* Túi Tiền & Icon Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Túi Xu */}
            <div 
              onClick={onOpenBank}
              className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-card)] active:border-[var(--border-gold)] px-2.5 py-1 rounded-xl cursor-pointer shadow-sm transition-all"
              title={t('lobby.bankTooltip')}
            >
              <span className="text-sm">🪙</span>
              <span className="font-bold text-xs sm:text-sm text-[var(--color-gold)] font-mono">
                {profile.coins.toLocaleString()} <span className="text-[10px] font-normal text-[var(--text-muted)]">{t('common.coins')}</span>
              </span>
            </div>

            {/* Nợ cảnh báo (nếu có) */}
            {profile.loans > 0 && (
              <button
                onClick={onOpenBank}
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center shrink-0 animate-pulse cursor-pointer"
                title={t('lobby.debtLabel', { amount: profile.loans.toLocaleString() })}
              >
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Nút Luật */}
            {onOpenRules && (
              <button
                onClick={onOpenRules}
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] active:scale-95 transition-transform cursor-pointer"
                title={t('lobby.rulesTooltip')}
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Nút Fullscreen / Xoay Ngang */}
            <button
              onClick={async () => {
                if (isFullscreenState) {
                  await toggleFullScreen();
                  setIsFullscreenState(false);
                } else {
                  await lockToLandscape();
                  setIsFullscreenState(isFullScreen());
                }
              }}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer"
              title={t('lobby.lockLandscapeTooltip')}
            >
              {isFullscreenState ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-gold)]" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Nút Cài Đặt */}
            <button
              onClick={onOpenSettings}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer"
              title={t('lobby.settingsTooltip')}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. NEWSFEED TICKER (ĐỒNG BỘ 100% DESIGN SYSTEM WEB) */}
      {newsfeed.length > 0 && (
        <div 
          onClick={() => openModal('ECOSYSTEM')}
          className="shrink-0 w-full max-w-4xl mx-auto px-3 py-1 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-amber-950/40 border border-amber-500/20 flex items-center justify-between cursor-pointer active:opacity-80 transition-opacity shadow-sm"
        >
          <div className="flex items-center gap-2 overflow-hidden text-xs">
            <span className="flex items-center gap-1 text-amber-400 font-bold uppercase text-[9px] tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30 shrink-0">
              <Newspaper className="w-3 h-3" /> {t('lobby.newsfeedTag')}
            </span>
            <span className="text-[var(--text-secondary)] text-[11px] truncate">
              {newsfeed[0]?.message}
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold shrink-0 ml-2 flex items-center gap-0.5">
            {t('lobby.viewLeaderboard')} <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* 3. THÂN TRANG: 4 CHẾ ĐỘ CHƠI (HỖ TRỢ CUỘN DỌC Ở MÀN HÌNH DỌC & CUỘN NGANG SNAP Ở MÀN HÌNH NGANG) */}
      <main className="flex-1 min-h-0 w-full max-w-5xl mx-auto overflow-y-auto overflow-x-hidden landscape:overflow-x-auto landscape:overflow-y-hidden landscape:flex landscape:flex-row landscape:snap-x landscape:items-stretch py-1.5 px-0.5 space-y-2.5 landscape:space-y-0 landscape:gap-3 scroll-smooth touch-pan-y landscape:touch-pan-x select-none">
        
        {/* ========================================================================= */}
        {/* PHẦN 1: CHƠI NHANH & ĐẤU HẠNG (HERO CONTAINER TIER 1 CHUẨN WEB) */}
        {/* ========================================================================= */}
        <Card
          variant="container"
          hoverable
          clickable
          onClick={onPlayNow || onOpenQuickSetup}
          className="p-3 sm:p-3.5 rounded-2xl border-2 border-[var(--border-gold)]/60 bg-gradient-to-br from-[#1c150c]/80 via-[var(--bg-container)] to-[#0c121d]/80 shadow-2xl active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between landscape:w-[280px] sm:landscape:w-[300px] landscape:shrink-0 landscape:snap-start landscape:h-full"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/20 shrink-0">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight">
                  {t('lobby.heroCardTitle')}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
                  {t('lobby.mobileHeroDesc', { rank: `${currentRank.badge} ${currentRank.name}`, elo: profile.elo })}
                </p>
              </div>
            </div>

            {/* Dải Tags Chuẩn Web */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-[var(--border-container)]">
              <Badge variant="neutral" size="sm">
                {t('lobby.mobileBetTag', { amount: quickTableConfig.betAmount.toLocaleString() })}
              </Badge>
              <Badge variant="neutral" size="sm">
                {t('lobby.mobileChopTag', { multiplier: quickTableConfig.choppingMultiplier })}
              </Badge>
              <Badge variant="neutral" size="sm">
                {t('lobby.mobilePlayersTag', { count: quickTableConfig.playerCount })}
              </Badge>
              <Badge variant="neutral" size="sm">
                📜 {getSettlementLabel(quickTableConfig.settlementRule)}
              </Badge>
            </div>
          </div>

          {/* Cặp Nút Hành Động Chuẩn Web */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border-container)]">
            <Button
              variant="surface"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuickSetup();
              }}
              leftIcon={<Sliders className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
              className="w-full text-xs font-bold py-1.5 justify-center"
              title={t('lobby.tableConfigBtn')}
            >
              {t('lobby.tableConfigBtn')}
            </Button>

            <Button
              variant="gold"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (onPlayNow) onPlayNow();
                else onOpenQuickSetup();
              }}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full text-xs font-bold py-1.5 justify-center shadow-lg shadow-amber-500/20"
            >
              {t('lobby.playNowBtn')}
            </Button>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* PHẦN 2: CHƠI ONLINE BẠN BÈ (Chỉ hiện khi bật setting Giao lưu bạn hiền) */}
        {/* ========================================================================= */}
        {onlineMultiplayerBetaEnabled && (
          <Card
            variant="container"
            hoverable
            clickable
            onClick={() => openModal('ONLINE_ROOM')}
            className="p-3 sm:p-3.5 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/20 to-slate-900 shadow-sm active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between landscape:w-[280px] sm:landscape:w-[300px] landscape:shrink-0 landscape:snap-start landscape:h-full"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-sm shrink-0">
                  <Wifi className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-200 leading-tight flex items-center gap-1.5">
                    {t('lobby.onlineCardTitle')}
                    <Badge variant="gold" size="sm">Online</Badge>
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
                    {t('lobby.onlinePinDesc')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-[var(--border-container)]">
                <span className="text-[10px] font-semibold text-amber-300/80">
                  {t('lobby.onlinePinLink')}
                </span>
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-[var(--border-container)]">
              <Button
                variant="gold"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('ONLINE_ROOM');
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 text-slate-950" />}
                className="w-full text-xs font-bold py-1.5 justify-center shadow-lg shadow-amber-500/20"
              >
                {t('lobby.joinRoomBtn')}
              </Button>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* PHẦN 3: CHIẾN DỊCH CỐT TRUYỆN (CONTAINER TIER 1 CHUẨN WEB) */}
        {/* ========================================================================= */}
        <Card
          variant="container"
          hoverable
          clickable
          onClick={onOpenCampaign}
          className="p-3 sm:p-3.5 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-container)] shadow-sm active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between landscape:w-[280px] sm:landscape:w-[300px] landscape:shrink-0 landscape:snap-start landscape:h-full"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight">
                  {t('lobby.campaignCardTitle')}
                </h4>
                <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
                  {t('lobby.mobileCampaignSubtitle')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-[var(--border-container)]">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                {t('lobby.campaignRewardsBadge')}
              </span>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-[var(--border-container)]">
            <Button
              variant="surface"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCampaign();
              }}
              rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
              className="w-full text-xs font-bold py-1.5 justify-center"
            >
              {t('lobby.campaignMapBtn')}
            </Button>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* PHẦN 4: TÙY CHỈNH NÂNG CAO (CONTAINER TIER 1 CHUẨN WEB) */}
        {/* ========================================================================= */}
        <Card
          variant="container"
          hoverable
          clickable
          onClick={onOpenCustomGameModal}
          className="p-3 sm:p-3.5 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-container)] shadow-sm active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between landscape:w-[280px] sm:landscape:w-[300px] landscape:shrink-0 landscape:snap-start landscape:h-full"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight">
                  {t('lobby.customGameCardTitle')}
                </h4>
                <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
                  {t('lobby.mobileCustomSubtitle')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-[var(--border-container)]">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                {t('lobby.customGameCustomBadge')}
              </span>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-[var(--border-container)]">
            <Button
              variant="surface"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCustomGameModal();
              }}
              rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
              className="w-full text-xs font-bold py-1.5 justify-center"
            >
              {t('lobby.customGameBtn')}
            </Button>
          </div>
        </Card>
      </main>

      {/* 4. BOTTOM NAVIGATION ACTION BAR CỐ ĐỊNH DƯỚI ĐÁY (ĐỒNG BỘ DESIGN SYSTEM WEB) */}
      <nav className="shrink-0 z-40 w-full max-w-4xl mx-auto bg-[var(--bg-container)] border border-[var(--border-container)] rounded-2xl px-3 py-1 shadow-md">
        <div className="w-full grid grid-cols-4 gap-1">
          {/* 1. Nhiệm vụ */}
          <button
            onClick={onOpenQuests}
            className="relative flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group cursor-pointer"
          >
            <div className="relative">
              <Target className="w-4 h-4 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
              {claimableQuestsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">
                  {claimableQuestsCount}
                </span>
              )}
            </div>
            <span className="text-[9.5px] font-bold text-[var(--text-secondary)] mt-0.5">
              {t('lobby.questsBtn')}
            </span>
          </button>

          {/* 2. Vòng Quay */}
          <button
            onClick={onOpenLuckyWheel}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group cursor-pointer"
          >
            <Disc className="w-4 h-4 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
            <span className="text-[9.5px] font-bold text-[var(--color-gold)] mt-0.5">
              {t('lobby.wheelBtn')}
            </span>
          </button>

          {/* 3. Ngân Hàng */}
          <button
            onClick={onOpenBank}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group cursor-pointer"
          >
            <Landmark className="w-4 h-4 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
            <span className="text-[9.5px] font-bold text-[var(--text-secondary)] mt-0.5">
              {t('lobby.bankBtn')}
            </span>
          </button>

          {/* 4. Bảng Vàng */}
          <button
            onClick={() => openModal('ECOSYSTEM')}
            className="flex flex-col items-center justify-center py-1 rounded-xl active:bg-[var(--bg-card)] transition-colors group cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
            <span className="text-[9.5px] font-bold text-[var(--text-secondary)] mt-0.5">
              {t('lobby.leaderboardBtn')}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};
