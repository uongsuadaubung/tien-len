import React from 'react';
import { Card, Badge, Button, Tabs, TabOption } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { useEcosystem, EcosystemTab, TIER_FILTERS, PAGE_SIZE } from '../../hooks/useEcosystem';
import { getTierFilterLabel } from '../../../engine/ecosystem/ecosystem-types';
import { MobileVirtualInput } from '../components/MobileVirtualInput';
import { useI18n } from '../../../locales';
import { 
  Trophy, 
  Flame, 
  Snowflake, 
  Search, 
  Newspaper, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ArrowUpDown, 
  Target 
} from 'lucide-react';

export interface MobileEcosystemViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileEcosystemView: React.FC<MobileEcosystemViewProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useI18n();
  const {
    activeTab,
    setActiveTab,
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    selectedTierFilter,
    setSelectedTierFilter,
    selectedSortField,
    setSelectedSortField,
    sortOrder,
    toggleSortOrder,
    newsfeed,
    sortedAndFilteredList,
    humanGlobalRank,
    totalPages,
    paginatedList,
    handleOpenBotDetail,
    handleJumpToMyRank,
    humanAsBotEntity
  } = useEcosystem();

  if (!isOpen) return null;

  const tabOptions: TabOption<EcosystemTab>[] = [
    {
      id: 'LEADERBOARD',
      label: t('ecosystem.tabLeaderboard'),
      icon: <Trophy className="w-4 h-4" />
    },
    {
      id: 'NEWSFEED',
      label: t('ecosystem.tabNewsfeed'),
      icon: <Newspaper className="w-4 h-4" />,
      badge: newsfeed.length > 0 ? (
        <Badge variant="danger" size="sm">
          {newsfeed.length}
        </Badge>
      ) : undefined
    }
  ];

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t('ecosystem.modalTitle')}
      subtitle={t('ecosystem.modalSubtitle')}
      icon={<Trophy className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={
        <Badge variant="gold" size="sm" icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}>
          {t('ecosystem.seasonLive')}
        </Badge>
      }
      footer={
        <div className="flex items-center justify-between w-full gap-2 text-xs">
          <Button 
            variant="surface" 
            size="sm" 
            className="text-xs hover:border-[var(--color-gold-border)] hover:text-[var(--color-gold)]"
            onClick={handleJumpToMyRank}
            leftIcon={<Target className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
          >
            {t('ecosystem.jumpToMyRank')}: <strong className="ml-1 text-[var(--color-gold)]">#{humanGlobalRank}</strong>
          </Button>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="surface"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                leftIcon={<ChevronLeft className="w-3 h-3" />}
              >
                {t('common.prev')}
              </Button>
              <span className="px-1.5 font-bold text-[var(--text-primary)] text-xs">
                {currentPage}/{totalPages}
              </span>
              <Button
                variant="surface"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                rightIcon={<ChevronRight className="w-3 h-3" />}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </div>
      }
      className={null}
    >
      <div className="flex flex-col space-y-2.5 pb-6 select-none">
        {/* THANH ĐIỀU HƯỚNG TAB & TÌM KIẾM */}
        <div className="space-y-2">
          <Tabs
            options={tabOptions}
            activeId={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setCurrentPage(1);
            }}
            className="w-full"
          />

          {activeTab === 'LEADERBOARD' && (
            <MobileVirtualInput
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              placeholder={t('ecosystem.searchPlaceholder')}
              icon={<Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              label={null}
              error={null}
              maxLength={30}
              showRandomNameButton={false}
              showPasteButton={true}
              onRandomName={null}
              onPaste={null}
              onSubmit={null}
              className={null}
              inputClassName={null}
              clearable={true}
              renderExtraActions={null}
            />
          )}
        </div>

        {/* TAB 1: BẢNG XẾP HẠNG (LEADERBOARD) */}
        {activeTab === 'LEADERBOARD' && (
          <div className="space-y-2.5">
            {/* BỘ LỌC THEO BẬC RANK (CUỘN NGANG) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {TIER_FILTERS.map((tier) => (
                <button
                  key={tier}
                  onClick={() => { setSelectedTierFilter(tier); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    selectedTierFilter === tier
                      ? 'bg-[var(--bg-card-active)] text-[var(--color-gold)] border-[var(--color-gold)] shadow-sm'
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-card)]'
                  }`}
                >
                  {getTierFilterLabel(tier)}
                </button>
              ))}
            </div>

            {/* THANH SẮP XẾP */}
            <div className="flex items-center justify-between gap-2 text-xs px-1">
              <span className="text-[11px] text-[var(--text-muted)] font-semibold">
                {t('ecosystem.showingPlayersShort', { count: sortedAndFilteredList.length })}
              </span>

              <div className="flex items-center gap-1.5">
                <select
                  value={selectedSortField}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const val = e.target.value;
                    if (val === 'elo' || val === 'coins' || val === 'winRate' || val === 'gamesPlayed') {
                      setSelectedSortField(val);
                    }
                  }}
                  className="bg-[var(--bg-input)] border border-[var(--border-card)] text-xs text-[var(--text-primary)] rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--color-gold)] cursor-pointer"
                >
                  <option value="elo">{t('ecosystem.sortEloShort')}</option>
                  <option value="coins">{t('ecosystem.sortCoinsShort')}</option>
                  <option value="winRate">{t('ecosystem.sortWinRateShort')}</option>
                  <option value="gamesPlayed">{t('ecosystem.sortGamesPlayedShort')}</option>
                </select>

                <Button
                  variant="surface"
                  size="sm"
                  onClick={toggleSortOrder}
                  title={t('ecosystem.sortOrderTooltip')}
                  className="h-7 px-2 text-xs"
                  leftIcon={<ArrowUpDown className="w-3 h-3 text-[var(--color-gold)]" />}
                >
                  <span className="text-[10px] font-bold">{sortOrder.toUpperCase()}</span>
                </Button>
              </div>
            </div>

            {/* DANH SÁCH THẺ BẢNG VÀNG NATIVE MOBILE */}
            <div className="space-y-2">
              {paginatedList.map((item, index) => {
                const globalRank = (currentPage - 1) * PAGE_SIZE + index + 1;
                const isHuman = item.isHuman;

                return (
                  <Card
                    key={item.id}
                    variant="card"
                    className={`p-3 rounded-2xl transition-all ${
                      isHuman 
                        ? 'bg-[var(--color-gold-dim)] border-2 border-[var(--color-gold)] shadow-md' 
                        : 'border-[var(--border-card)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Cột 1: Hạng + Avatar + Tên */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 text-center font-black text-xs shrink-0">
                          {globalRank === 1 ? (
                            <span className="text-[var(--color-gold)] text-sm">🥇#1</span>
                          ) : globalRank === 2 ? (
                            <span className="text-slate-300 text-sm">🥈#2</span>
                          ) : globalRank === 3 ? (
                            <span className="text-amber-500 text-sm">🥉#3</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">#{globalRank}</span>
                          )}
                        </div>

                        <div className="w-9 h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--border-container)] flex items-center justify-center text-xl shrink-0">
                          <span className="emoji-avatar">{item.avatar}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)] flex items-center gap-1 truncate">
                            <span className="truncate">{item.name}</span>
                            {isHuman && (
                              <Badge variant="gold" size="sm">
                                {t('common.you')}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mt-0.5">
                            <Badge variant={item.tierNum >= 4 ? 'gold' : item.tierNum === 3 ? 'neutral' : 'dark'} size="sm">
                              {item.rankBadge} Tier {item.tierNum}
                            </Badge>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              item.activityStatus === 'IN_MATCH' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* Cột 2: Elo, Xu & Nút Xem Hồ Sơ */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-black text-[var(--color-gold)] font-mono">
                            {item.elo} <span className="text-[9px] font-normal text-[var(--text-muted)]">Elo</span>
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] font-bold">
                            {item.coins.toLocaleString()} 🪙
                          </div>
                        </div>

                        <Button
                          variant={isHuman ? 'gold' : 'surface'}
                          size="sm"
                          className="py-1 px-2 text-xs"
                          onClick={() => {
                            if (isHuman) {
                              handleOpenBotDetail(humanAsBotEntity);
                            } else if (item.rawBot) {
                              handleOpenBotDetail(item.rawBot);
                            }
                          }}
                          leftIcon={<Eye className={`w-3.5 h-3.5 ${isHuman ? 'text-black' : 'text-[var(--color-gold)]'}`} />}
                        >
                          {t('common.detail')}
                        </Button>
                      </div>
                    </div>

                    {/* Dòng tóm tắt: Tỷ lệ thắng & Phong độ */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-container)] text-[10px] text-[var(--text-muted)]">
                      <div>
                        {t('ecosystem.winRateLabel')} <strong className="text-emerald-400 font-bold">{item.winRate}%</strong> {t('ecosystem.matchCount', { wins: item.stats.wins, total: item.stats.gamesPlayed })}
                      </div>

                      <div>
                        {t('ecosystem.streakLabel')} {item.currentStreak > 0 ? (
                          <span className="text-orange-400 font-bold inline-flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-orange-400" /> +{item.currentStreak}
                          </span>
                        ) : item.currentStreak < 0 ? (
                          <span className="text-sky-400 font-bold inline-flex items-center gap-0.5">
                            <Snowflake className="w-3 h-3 text-sky-400" /> {item.currentStreak}
                          </span>
                        ) : (
                          <span>--</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: BẢNG TIN (NEWSFEED) */}
        {activeTab === 'NEWSFEED' && (
          <div className="space-y-2.5">
            {newsfeed.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)] text-xs flex flex-col items-center justify-center gap-2">
                <Newspaper className="w-8 h-8 text-[var(--text-dim)]" />
                <span>{t('ecosystem.emptyNewsfeed')}</span>
              </div>
            ) : (
              newsfeed.map((news) => {
                const isBankruptcy = news.type === 'BANKRUPTCY';
                const isStreak = news.type === 'WIN_STREAK';
                const isBigWin = news.type === 'BIG_WIN';

                return (
                  <Card
                    key={news.id}
                    variant="card"
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                      isBankruptcy
                        ? 'bg-[var(--color-ruby-bg)] border-[var(--color-ruby-border)] text-[var(--color-ruby-text)]'
                        : isStreak
                        ? 'border-orange-500/30 text-orange-200'
                        : isBigWin
                        ? 'border-[var(--color-gold-border)] bg-[var(--color-gold-dim)]'
                        : 'border-[var(--border-card)]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-container)] flex items-center justify-center text-xl shrink-0 shadow-inner">
                      <span className="emoji-avatar">{news.avatar || (isBankruptcy ? '🚨' : isStreak ? '🔥' : isBigWin ? '💰' : '🎉')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-relaxed text-[var(--text-primary)]">{news.message}</p>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                        {new Date(news.timestamp).toLocaleTimeString()} - {t('ecosystem.serverWide')}
                      </span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </MobileScreenWrapper>
  );
};
