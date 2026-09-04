import React, { useState, useEffect } from 'react';
import { getRankTierByElo, RANK_TIERS } from '../../../engine/elo';
import { useViewStore } from '../../../stores/useViewStore';
import { useEcosystemStore } from '../../../stores/useEcosystemStore';
import { useGameStore } from '../../../stores/useGameStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useUserStore } from '../../../stores/useUserStore';
import { 
  Trophy, 
  Flame, 
  MapPin, 
  Play, 
  Target, 
  Disc, 
  Landmark, 
  Settings, 
  AlertCircle,
  Sliders,
  Edit2,
  BookOpen,
  ArrowRight,
  Newspaper,
  Maximize,
  Minimize,
  Wifi
} from 'lucide-react';
import { Button, Badge, Card, SectionHeader } from '../../primitives';
import { isFullScreen, toggleFullScreen } from '../../utils/fullscreen';
import { useI18n } from '../../../locales';
import { GameMode, GameSettlementRule } from '../../../engine/types';
export interface WebLobbyScreenProps {
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

export const WebLobbyScreen: React.FC<WebLobbyScreenProps> = ({
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
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-y-auto bg-[var(--bg-canvas)] text-[var(--text-primary)] p-3 sm:p-4 select-none font-sans">
      
      {/* HEADER (Tier 1 Container Gọn Gàng, Không Rớt Dòng) */}
      <Card variant="container" className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between gap-3 p-2 sm:p-2.5 shadow-md shrink-0">
        {/* Profile Người Chơi */}
        <div 
          onClick={onOpenNameSetup}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          title={t('lobby.profileEditTooltip')}
        >
          {/* Avatar (Tier 2 Card) */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-lg sm:text-xl shadow-sm group-hover:border-[var(--border-gold)] transition-colors shrink-0">
            {profile.avatar || '😎'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] tracking-wide group-hover:text-[var(--color-gold)] inline-flex items-center gap-1.5 transition-colors truncate max-w-[140px]">
                <span>{profile.name || t('lobby.defaultName')}</span>
                <Edit2 className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--color-gold)] shrink-0" />
              </h2>
            </div>

            {/* Elo & Bậc Rank */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px]">{currentRank.badge}</span>
              <span className="text-[11px] font-bold text-[var(--color-gold)] truncate">
                {currentRank.name}
              </span>
              <span className="text-[9px] text-[var(--text-muted)] font-mono shrink-0">
                ({profile.elo} Elo)
              </span>
            </div>

            {/* Thanh tiến trình Elo */}
            {nextTier && (
              <div className="w-24 sm:w-32 h-1 bg-[var(--bg-card)] rounded-full mt-0.5 overflow-hidden border border-[var(--border-container)]">
                <div 
                  className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-500"
                  style={{ width: `${eloProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* TÚI TIỀN & CÁC NÚT TÍNH NĂNG NHANH */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Số Dư Tiền Vàng */}
          <div 
            onClick={onOpenBank}
            className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-gold)] px-2.5 py-1 rounded-xl cursor-pointer shadow-sm transition-colors"
            title={t('lobby.bankTooltip')}
          >
            <span className="text-sm">🪙</span>
            <div className="flex flex-col leading-tight">
              <span className="text-[8px] text-[var(--text-muted)] font-semibold uppercase">{t('lobby.assetsLabel')}</span>
              <span className="font-bold text-xs text-[var(--color-gold)] font-mono">
                {profile.coins.toLocaleString()} <span className="text-[9px] font-normal text-[var(--text-muted)]">{t('common.coins')}</span>
              </span>
            </div>
          </div>

          {/* Cảnh báo nợ (nếu có) */}
          {profile.loans > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={onOpenBank}
              leftIcon={<AlertCircle className="w-3.5 h-3.5 text-red-400" />}
            >
              {t('lobby.debtLabel', { amount: profile.loans.toLocaleString() })}
            </Button>
          )}

          {/* Nút Vay Nợ / Ngân Hàng */}
          <Button
            variant="surface"
            size="sm"
            onClick={onOpenBank}
            leftIcon={<Landmark className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
            title={t('bank.title')}
          >
            <span>{t('lobby.bankBtn')}</span>
          </Button>

          {/* Nút Nhiệm Vụ & Thành Tựu */}
          <div className="relative">
            <Button
              variant="surface"
              size="sm"
              onClick={onOpenQuests}
              leftIcon={<Target className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
            >
              <span>{t('lobby.questsBtn')}</span>
            </Button>
            {claimableQuestsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center pointer-events-none shadow">
                {claimableQuestsCount}
              </span>
            )}
          </div>

          {/* Nút Vòng Quay May Mắn (Gold Primary CTA) */}
          <Button
            variant="gold"
            size="sm"
            onClick={onOpenLuckyWheel}
            leftIcon={<Disc className="w-3.5 h-3.5 text-[#0a0c0e]" />}
          >
            <span>{t('lobby.wheelBtn')}</span>
          </Button>

          {/* Nút Bảng Vàng Danh Vọng */}
          <Button
            variant="surface"
            size="sm"
            onClick={() => openModal('ECOSYSTEM')}
            leftIcon={<Trophy className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
            title={t('lobby.leaderboardBtn')}
            className="border-[var(--color-gold-border)]/50 text-[var(--color-gold)] hover:text-white"
          >
            <span>{t('lobby.leaderboardBtn')}</span>
          </Button>

          {/* Nhóm Nút Tiện Ích Gọn Gàng */}
          <div className="flex items-center gap-1 pl-1 border-l border-[var(--border-container)]">
            {/* Nút Luật & Khắc Chế */}
            {onOpenRules && (
              <button
                onClick={onOpenRules}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-gold)] flex items-center justify-center text-[var(--color-gold)] active:scale-95 transition-all cursor-pointer shadow-sm"
                title={t('lobby.rulesTooltip')}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Nút Toàn Màn Hình */}
            <button
              onClick={async () => {
                const fs = await toggleFullScreen();
                setIsFullscreenState(fs);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-gold)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shadow-sm"
              title={isFullscreenState ? t('lobby.fullScreenExit') : t('lobby.fullScreenEnter')}
            >
              {isFullscreenState ? (
                <Minimize className="w-3.5 h-3.5 text-[var(--color-gold)]" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Nút Cài Đặt */}
            <button
              onClick={onOpenSettings}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-gold)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shadow-sm"
              title={t('lobby.settingsTooltip')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* BANNER BẢN TIN SỚI BẠC (LIVE NEWSFEED TICKER) */}
      {newsfeed.length > 0 && (
        <div 
          onClick={() => openModal('ECOSYSTEM')}
          className="relative z-10 w-full max-w-6xl mx-auto mt-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-amber-950/40 border border-amber-500/20 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all shadow-sm group shrink-0"
        >
          <div className="flex items-center gap-2 overflow-hidden text-xs">
            <span className="flex items-center gap-1 text-amber-400 font-bold uppercase text-[9px] tracking-wider bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 flex-shrink-0">
              <Newspaper className="w-2.5 h-2.5" /> {t('lobby.newsfeedTag')}
            </span>
            <span className="text-[var(--text-secondary)] text-[11px] truncate group-hover:text-[var(--text-primary)] transition-colors">
              {newsfeed[0]?.message}
            </span>
          </div>
          <span className="text-[9px] text-amber-400 font-semibold flex-shrink-0 ml-2 flex items-center gap-0.5 group-hover:underline">
            {t('lobby.viewLeaderboard')} <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </div>
      )}

      {/* BODY (Tier 0 Canvas với các Container Tier 1) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto py-2 sm:py-3 space-y-3 sm:space-y-3.5 flex-1 flex flex-col justify-center">
        
        {/* ========================================================================= */}
        {/* HÀNG 1: SÒNG BẠC CHƠI NHANH & ĐẤU HẠNG (HERO CONTAINER TIER 1) */}
        {/* ========================================================================= */}
        <section className="space-y-1.5 sm:space-y-2">
          <SectionHeader
            icon={<Flame className="w-4 h-4" />}
            title={t('lobby.heroTitle')}
            subtitle={t('lobby.heroSubtitle')}
            action={null}
            className={null}
          />

          {/* HERO CARD: TIER 1 CONTAINER */}
          <Card 
            variant="container"
            hoverable
            clickable
            onClick={onPlayNow || onOpenQuickSetup}
            className="group p-4 sm:p-5 flex flex-col justify-between border-2 border-[var(--border-gold)]/60 bg-gradient-to-br from-[#1c150c]/80 via-[var(--bg-container)] to-[#0c121d]/80 shadow-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-3.5">
                {/* Icon Box */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                      {t('lobby.heroCardTitle')}
                    </h3>
                    <Badge variant="gold" size="sm">{t('lobby.coreBadge')}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    {t('lobby.heroCardDesc', {
                      count: quickTableConfig.playerCount - 1,
                      rank: `${currentRank.badge} ${currentRank.name}`,
                      elo: profile.elo
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Dải Tags & CTA */}
            <div className="pt-2.5 mt-2.5 border-t border-[var(--border-container)] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge variant="gold" size="sm">
                  {currentRank.badge} {currentRank.name} ({profile.elo} Elo)
                </Badge>
                <Badge variant="neutral" size="sm">
                  {t('lobby.betPerCard', { amount: quickTableConfig.betAmount.toLocaleString() })}
                </Badge>
                <Badge variant="neutral" size="sm">
                  {t('lobby.chopMultiplier', { multiplier: quickTableConfig.choppingMultiplier })}
                </Badge>
                <Badge variant="neutral" size="sm">
                  {t('lobby.tablePlayers', { count: quickTableConfig.playerCount })}
                </Badge>
                <Badge variant="neutral" size="sm">
                  📜 {getSettlementLabel(quickTableConfig.settlementRule)}
                </Badge>
              </div>

              {/* Nhóm nút hành động: Cấu Hình Bàn (bên trái) + Chơi Ngay (bên phải) */}
              <div className="flex items-center gap-2">
                <Button
                  variant="surface"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuickSetup();
                  }}
                  leftIcon={<Sliders className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                  title={t('lobby.quickSetupConfigTooltip')}
                >
                  <span>{t('lobby.tableConfigBtn')}</span>
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
                  className="shadow-md shadow-amber-500/20"
                >
                  {t('lobby.playNowBtn')}
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* ========================================================================= */}
        {/* HÀNG 2: CHẾ ĐỘ MỞ RỘNG (2 THẺ LỚN TIER 1) */}
        {/* ========================================================================= */}
        <section className="space-y-1.5 sm:space-y-2">
          <SectionHeader
            icon={<Trophy className="w-4 h-4" />}
            title={t('lobby.extendedModes')}
            subtitle={t('lobby.extendedSubtitle')}
            action={null}
            className={null}
          />

          <div className={`grid grid-cols-1 ${onlineMultiplayerBetaEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3 sm:gap-3.5`}>
            
            {/* 1. CHƠI ONLINE P2P BẠN BÈ (Chỉ hiện khi bật setting Giao lưu bạn hiền) */}
            {onlineMultiplayerBetaEnabled && (
              <Card 
                variant="container"
                hoverable
                clickable
                onClick={() => openModal('ONLINE_ROOM')}
                className="group p-3.5 sm:p-4 flex flex-col justify-between border-amber-500/30 hover:border-amber-500/60"
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-sm group-hover:border-amber-400 transition-colors">
                    <Wifi className="w-5 h-5 animate-pulse" />
                  </div>
                  <Badge variant="gold" size="sm">Online</Badge>
                </div>

                <div className="my-2 sm:my-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-amber-200 group-hover:text-yellow-300 transition-colors">
                    {t('lobby.onlineCardTitle')}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed line-clamp-2">
                    {t('lobby.onlineCardDesc')}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[var(--border-container)] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-300/80">{t('lobby.onlinePinBadge')}</span>
                  <Button
                    variant="gold"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3 h-3 text-slate-950" />}
                  >
                    {t('lobby.joinRoomBtn')}
                  </Button>
                </div>
              </Card>
            )}

            {/* 2. CHIẾN DỊCH CỐT TRUYỆN */}
            <Card 
              variant="container"
              hoverable
              clickable
              onClick={onOpenCampaign}
              className="group p-3.5 sm:p-4 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm group-hover:border-[var(--border-gold)] transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <Badge variant="neutral" size="sm">{t('lobby.campaignBadge')}</Badge>
              </div>

              <div className="my-2 sm:my-2.5">
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                  {t('lobby.campaignCardTitle')}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed line-clamp-2">
                  {t('lobby.campaignCardDesc')}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[var(--border-container)] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{t('lobby.campaignRewardsBadge')}</span>
                <Button
                  variant="surface"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3 h-3 text-[var(--color-gold)]" />}
                >
                  {t('lobby.campaignMapBtn')}
                </Button>
              </div>
            </Card>

            {/* 3. TÙY CHỈNH NÂNG CAO (SANDBOX) */}
            <Card 
              variant="container"
              hoverable
              clickable
              onClick={onOpenCustomGameModal}
              className="group p-3.5 sm:p-4 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--color-gold)] shadow-sm group-hover:border-[var(--border-gold)] transition-colors">
                  <Sliders className="w-5 h-5" />
                </div>
                <Badge variant="neutral" size="sm">{t('lobby.customGameBadge')}</Badge>
              </div>

              <div className="my-2 sm:my-2.5">
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                  {t('lobby.customGameCardTitle')}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed line-clamp-2">
                  {t('lobby.customGameCardDesc')}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[var(--border-container)] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{t('lobby.customGameCustomBadge')}</span>
                <Button
                  variant="surface"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3 h-3 text-[var(--color-gold)]" />}
                >
                  {t('lobby.customGameBtn')}
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};
