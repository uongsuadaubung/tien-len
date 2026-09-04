import React from 'react';
import { Modal, Card, Badge, Button, Tabs, TabOption } from '../../primitives';
import { useViewStore } from '../../../stores/useViewStore';
import { useEcosystem, EcosystemTab, TIER_FILTERS, PAGE_SIZE } from '../../hooks/useEcosystem';
import { getTierFilterLabel } from '../../../engine/ecosystem/ecosystem-types';
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

export const EcosystemModal: React.FC = () => {
  const { t } = useI18n();
  const { isEcosystemOpen, closeModal } = useViewStore();
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

  if (!isEcosystemOpen) return null;

  return (
    <Modal
      isOpen={isEcosystemOpen}
      onClose={() => closeModal('ECOSYSTEM')}
      title={t('ecosystem.modalTitle')}
      subtitle={t('ecosystem.modalSubtitle')}
      icon={<Trophy className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="5xl"
      height="h-[90vh] sm:h-[700px]"
      headerRight={
        <Badge variant="gold" size="md" icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}>
          {t('ecosystem.seasonLive')}
        </Badge>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Button 
              variant="surface" 
              size="sm" 
              className="text-xs hover:border-[var(--color-gold-border)] hover:text-[var(--color-gold)]"
              onClick={handleJumpToMyRank}
              leftIcon={<Target className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
            >
              {t('ecosystem.jumpToMyRank')}: <strong className="ml-1 text-[var(--color-gold)]">#{humanGlobalRank}</strong>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[var(--text-muted)] text-[11px]">
              {t('ecosystem.showingPlayers', { count: sortedAndFilteredList.length, page: currentPage, total: totalPages })}
            </span>
            <Button variant="surface" size="sm" onClick={() => closeModal('ECOSYSTEM')}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full space-y-3">
        {/* THANH ĐIỀU HƯỚNG TAB & TÌM KIẾM */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-container)]">
          <Tabs
            options={tabOptions}
            activeId={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setCurrentPage(1);
            }}
            className="flex-1 sm:max-w-md"
          />

          {activeTab === 'LEADERBOARD' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder={t('ecosystem.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-container)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-gold)] transition-colors placeholder:text-[var(--text-dim)]"
              />
            </div>
          )}
        </div>

        {/* TAB 1: BẢNG XẾP HẠNG (LEADERBOARD) */}
        {activeTab === 'LEADERBOARD' && (
          <div className="flex flex-col flex-1 min-h-0 space-y-2.5">
            {/* BỘ LỌC THEO BẬC TIER & NÚT SẮP XẾP */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] mr-0.5">{t('ecosystem.tierFilterLabel')}</span>
                {TIER_FILTERS.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => { setSelectedTierFilter(tier); setCurrentPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all select-none border ${
                      selectedTierFilter === tier
                        ? 'bg-[var(--bg-card-active)] text-[var(--color-gold)] border-[var(--color-gold)] shadow-sm'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-card)] hover:border-[var(--border-card-hover)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {getTierFilterLabel(tier)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">{t('ecosystem.sortByLabel')}</span>
                <div className="relative">
                  <select
                    value={selectedSortField}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const val = e.target.value;
                      if (val === 'elo' || val === 'coins' || val === 'winRate' || val === 'gamesPlayed') {
                        setSelectedSortField(val);
                      }
                    }}
                    className="bg-[var(--bg-input)] border border-[var(--border-card)] text-xs text-[var(--text-primary)] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[var(--color-gold)] cursor-pointer"
                  >
                    <option value="elo">{t('ecosystem.sortElo')}</option>
                    <option value="coins">{t('ecosystem.sortCoins')}</option>
                    <option value="winRate">{t('ecosystem.sortWinRate')}</option>
                    <option value="gamesPlayed">{t('ecosystem.sortGamesPlayed')}</option>
                  </select>
                </div>
                <Button
                  variant="surface"
                  size="sm"
                  onClick={toggleSortOrder}
                  title={t('ecosystem.sortOrderTooltip')}
                  className="h-7 px-2 text-xs"
                  leftIcon={<ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                >
                  <span className="text-[10px] font-bold">{sortOrder.toUpperCase()}</span>
                </Button>
              </div>
            </div>

            {/* BẢNG DANH SÁCH BOT */}
            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[var(--bg-container)] border-b border-[var(--border-container)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-14 text-center whitespace-nowrap">{t('ecosystem.colRank')}</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[180px]">{t('ecosystem.colPlayer')}</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px]">Tier</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[90px]">{t('ecosystem.colElo')}</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">{t('ecosystem.colCoins')}</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px]">{t('ecosystem.colWinRate')}</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[100px]">{t('ecosystem.colStreak')}</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px]">{t('common.detail')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-container)]">
                  {paginatedList.map((item, index) => {
                    const globalRank = (currentPage - 1) * PAGE_SIZE + index + 1;
                    const isHuman = item.isHuman;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-[var(--bg-card-hover)] ${
                          isHuman 
                            ? 'bg-[var(--color-gold-dim)] font-bold border-l-4 border-l-[var(--color-gold)]' 
                            : index % 2 === 0 ? 'bg-transparent' : 'bg-black/15'
                        }`}
                      >
                        {/* Hạng */}
                        <td className="py-2.5 px-3 text-center font-black whitespace-nowrap">
                          {globalRank === 1 ? (
                            <span className="text-[var(--color-gold)] text-sm">🥇 #1</span>
                          ) : globalRank === 2 ? (
                            <span className="text-slate-300 text-sm">🥈 #2</span>
                          ) : globalRank === 3 ? (
                            <span className="text-amber-500 text-sm">🥉 #3</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">#{globalRank}</span>
                          )}
                        </td>

                        {/* Cao thủ */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-input)] border border-[var(--border-container)] flex items-center justify-center text-lg flex-shrink-0">
                              {item.avatar}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                {item.name}
                                {isHuman && (
                                  <Badge variant="gold" size="sm">
                                    {t('common.you')}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  item.activityStatus === 'IN_MATCH' ? 'bg-[var(--color-emerald-text)] animate-pulse' : 'bg-slate-400'
                                }`} />
                                <span>{item.activityStatus === 'IN_MATCH' ? t('ecosystem.statusInMatch') : t('ecosystem.statusOnline')}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Bậc Rank */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <Badge variant={item.tierNum >= 4 ? 'gold' : item.tierNum === 3 ? 'neutral' : 'dark'}>
                            {item.rankBadge} Tier {item.tierNum}
                          </Badge>
                        </td>

                        {/* Elo */}
                        <td className="py-2.5 px-3 text-right font-black text-[var(--color-gold)] whitespace-nowrap">
                          {item.elo}
                        </td>

                        {/* Tiền Vốn */}
                        <td className="py-2.5 px-3 text-right font-bold text-[var(--text-primary)] whitespace-nowrap">
                          {item.coins.toLocaleString()} <span className="text-[10px] text-[var(--text-muted)] font-normal">Xu</span>
                        </td>

                        {/* Tỉ Lệ Thắng */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="font-bold text-[var(--color-emerald-text)]">
                            {item.winRate}%
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block">
                            {t('ecosystem.matchCount', { wins: item.stats.wins, total: item.stats.gamesPlayed })}
                          </span>
                        </td>

                        {/* Phong Độ */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {item.currentStreak > 0 ? (
                            <span className="text-orange-400 font-bold flex items-center justify-center gap-0.5 text-[11px]">
                              <Flame className="w-3 h-3 text-orange-400" /> +{item.currentStreak}
                            </span>
                          ) : item.currentStreak < 0 ? (
                            <span className="text-[var(--color-sapphire-text)] font-bold flex items-center justify-center gap-0.5 text-[11px]">
                              <Snowflake className="w-3 h-3 text-[var(--color-sapphire-text)]" /> {item.currentStreak}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[11px]">--</span>
                          )}
                        </td>

                        {/* Thao Tác (Hồ Sơ) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <Button
                            variant={isHuman ? 'gold' : 'surface'}
                            size="sm"
                            className={`py-1 px-2.5 text-xs ${!isHuman ? 'hover:border-[var(--color-gold-border)] hover:text-[var(--color-gold)]' : ''}`}
                            onClick={() => {
                              if (isHuman) {
                                handleOpenBotDetail(humanAsBotEntity);
                              } else if (item.rawBot) {
                                handleOpenBotDetail(item.rawBot);
                              }
                            }}
                            leftIcon={<Eye className={`w-3.5 h-3.5 ${isHuman ? 'text-black' : 'text-[var(--color-gold)]'}`} />}
                          >
                            {t('ecosystem.btnProfile')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* THANH PHÂN TRANG */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[var(--text-muted)] text-[11px]">
                  {t('ecosystem.viewingRange', { from: ((currentPage - 1) * PAGE_SIZE) + 1, to: Math.min(currentPage * PAGE_SIZE, sortedAndFilteredList.length), total: sortedAndFilteredList.length })}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="surface"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    {t('common.prev')}
                  </Button>
                  <span className="px-2.5 font-bold text-[var(--text-primary)] text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="surface"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BẢNG TIN */}
        {activeTab === 'NEWSFEED' && (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 pr-1">
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
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-container)] flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                      {news.avatar || (isBankruptcy ? '🚨' : isStreak ? '🔥' : isBigWin ? '💰' : '🎉')}
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
    </Modal>
  );
};

