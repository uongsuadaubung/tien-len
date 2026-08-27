import React, { useState, useMemo } from 'react';
import { Modal, Card, Badge, Button, Tabs, TabOption } from '../primitives';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { BotActivityStatus, BotEntity, getTierFromElo } from '../../engine/ecosystem/ecosystem-types';
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

const PAGE_SIZE = 15;

type EcosystemTab = 'LEADERBOARD' | 'NEWSFEED';

interface EcosystemTableItem {
  id: string;
  name: string | null;
  avatar: string | null;
  elo: number;
  coins: number;
  tierNum: number;
  tier: string;
  rankBadge: string;
  currentStreak: number;
  highestStreak: number;
  title: string;
  personalityTags: string[] | null;
  activityStatus: BotActivityStatus | null;
  stats: {
    gamesPlayed: number;
    wins: number;
    chopsDone: number;
    congsGiven: number;
    totalEarned: number;
  };
  headToHeadVsHuman: {
    games: number;
    botWins: number;
    humanWins: number;
    netCoinsEarnedFromHuman: number;
  } | null;
  winRate: number;
  isHuman: boolean;
  rawBot: BotEntity | null;
}

export const EcosystemModal: React.FC = () => {
  const { isEcosystemOpen, closeModal, openModal } = useModalStore();
  const { profile } = useUserStore();
  const {
    bots,
    newsfeed,
    searchQuery,
    selectedTierFilter,
    selectedSortField,
    sortOrder,
    setSearchQuery,
    setSelectedTierFilter,
    setSelectedSortField,
    toggleSortOrder,
    setSelectedBot
  } = useEcosystemStore();

  const [activeTab, setActiveTab] = useState<EcosystemTab>('LEADERBOARD');
  const [currentPage, setCurrentPage] = useState(1);

  // Tạo đối tượng đại diện cho Người Chơi để xếp hạng
  const humanPlayerRankEntity: EcosystemTableItem = useMemo(() => {
    const totalGames = profile.stats.gamesPlayed || 0;
    const wins = profile.stats.wins || 0;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const tierInfo = getTierFromElo(profile.elo);

    return {
      id: 'human_player',
      name: profile.name || 'Bạn',
      avatar: profile.avatar || '🤠',
      elo: profile.elo,
      coins: profile.coins,
      tierNum: tierInfo.tierNum,
      tier: tierInfo.tier,
      rankBadge: tierInfo.rankBadge,
      currentStreak: profile.stats.currentStreak || 0,
      highestStreak: profile.stats.highestStreak || 0,
      title: 'Đại Hiệp',
      personalityTags: ['Kỳ Thủ', 'Chiến Thuật'],
      activityStatus: 'IN_MATCH',
      headToHeadVsHuman: { games: 0, botWins: 0, humanWins: 0, netCoinsEarnedFromHuman: 0 },
      stats: {
        gamesPlayed: totalGames,
        wins,
        chopsDone: profile.stats.chopsDone || 0,
        congsGiven: profile.stats.congsGiven || 0,
        totalEarned: profile.stats.totalEarned || 0
      },
      winRate,
      isHuman: true,
      rawBot: null
    };
  }, [profile]);

  // Tạo BotEntity đại diện cho người chơi khi xem hồ sơ chính mình
  const humanAsBotEntity: BotEntity = useMemo(() => ({
    id: 'human_player',
    name: profile.name || 'Bạn',
    avatar: profile.avatar || '🤠',
    tier: humanPlayerRankEntity.tier,
    tierNum: humanPlayerRankEntity.tierNum,
    rankBadge: humanPlayerRankEntity.rankBadge,
    elo: profile.elo,
    coins: profile.coins,
    description: 'Đại hiệp giang hồ, bản lĩnh tung hoành khắp các sới bài Tiến Lên Miền Nam.',
    personalityTags: ['Người Chơi Thật', 'Chiến Thuật', 'Quyết Đoán'],
    title: 'Đại Hiệp',
    status: 'ACTIVE',
    activityStatus: 'IN_MATCH',
    createdAt: Date.now(),
    memoryDepth: 1.0,
    riskAppetite: 0.7,
    trapTendency: 0.6,
    baitingTendency: 0.6,
    antiLeaderAggression: 0.8,
    tempoControl: 0.7,
    damageControl: 0.7,
    turnsToWinLookahead: 0.8,
    dynamicHandSacrifice: 0.8,
    bombInferenceRate: 0.8,
    semiCooperativeCooperation: 0.5,
    positionalAwareness: 0.8,
    inMatchAdaptationRate: 0.8,
    mctsSimulations: 50,
    handPartitioningOptimality: 0.9,
    simulationLookahead: 3,
    currentStreak: profile.stats.currentStreak || 0,
    highestStreak: profile.stats.highestStreak || 0,
    stats: {
      gamesPlayed: profile.stats.gamesPlayed || 0,
      wins: profile.stats.wins || 0,
      chopsDone: profile.stats.chopsDone || 0,
      congsGiven: profile.stats.congsGiven || 0,
      totalEarned: profile.stats.totalEarned || 0
    },
    headToHeadVsHuman: {
      games: 0,
      botWins: 0,
      humanWins: 0,
      netCoinsEarnedFromHuman: 0
    }
  }), [profile, humanPlayerRankEntity]);

  // Lọc và Sắp xếp danh sách (Tự động phái sinh Tier từ Elo cho mọi Bot)
  const sortedAndFilteredList: EcosystemTableItem[] = useMemo(() => {
    let list: EcosystemTableItem[] = bots.filter(b => b.status === 'ACTIVE').map(b => {
      const tierInfo = getTierFromElo(b.elo);
      return {
        ...b,
        tierNum: tierInfo.tierNum,
        tier: tierInfo.tier,
        rankBadge: tierInfo.rankBadge,
        rawBot: b,
        winRate: b.stats.gamesPlayed > 0 ? Math.round((b.stats.wins / b.stats.gamesPlayed) * 100) : 0,
        isHuman: false
      };
    });

    // Bổ sung Người Chơi vào danh sách
    list.push(humanPlayerRankEntity);

    // Lọc theo Tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b => (b.name || '').toLowerCase().includes(q) || b.personalityTags?.some(t => t.toLowerCase().includes(q)));
    }

    // Lọc theo Tier
    if (selectedTierFilter !== 'ALL') {
      list = list.filter(b => b.tierNum === selectedTierFilter);
    }

    // Sắp xếp
    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;
      if (selectedSortField === 'elo') {
        valA = a.elo;
        valB = b.elo;
      } else if (selectedSortField === 'coins') {
        valA = a.coins;
        valB = b.coins;
      } else if (selectedSortField === 'winRate') {
        valA = a.winRate;
        valB = b.winRate;
      } else if (selectedSortField === 'gamesPlayed') {
        valA = a.stats?.gamesPlayed || 0;
        valB = b.stats?.gamesPlayed || 0;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [bots, humanPlayerRankEntity, searchQuery, selectedTierFilter, selectedSortField, sortOrder]);

  // Thứ hạng tổng của Người Chơi
  const humanGlobalRank = useMemo(() => {
    const idx = sortedAndFilteredList.findIndex(item => item.isHuman);
    return idx !== -1 ? idx + 1 : 1;
  }, [sortedAndFilteredList]);

  // Phân trang
  const totalPages = Math.ceil(sortedAndFilteredList.length / PAGE_SIZE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAndFilteredList.slice(start, start + PAGE_SIZE);
  }, [sortedAndFilteredList, currentPage]);

  const handleOpenBotDetail = (bot: BotEntity) => {
    setSelectedBot(bot);
    openModal('BOT_PROFILE');
  };

  const handleJumpToMyRank = () => {
    const targetPage = Math.ceil(humanGlobalRank / PAGE_SIZE) || 1;
    setCurrentPage(targetPage);
  };

  const tabOptions: TabOption<EcosystemTab>[] = [
    {
      id: 'LEADERBOARD',
      label: 'Bảng Xếp Hạng',
      icon: <Trophy className="w-4 h-4" />
    },
    {
      id: 'NEWSFEED',
      label: 'Bảng Tin',
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
      title="Bảng Vàng Danh Vọng"
      subtitle="Vinh danh cao thủ, tỷ lệ thắng & biến động tài chính toàn máy chủ"
      icon={<Trophy className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="5xl"
      height="h-[90vh] sm:h-[700px]"
      headerRight={
        <Badge variant="gold" size="md" icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}>
          Mùa Giải 2026 • Trực Tuyến
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
              Hạng Của Bạn: <strong className="ml-1 text-[var(--color-gold)]">#{humanGlobalRank}</strong>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[var(--text-muted)] text-[11px]">
              Hiển thị {sortedAndFilteredList.length} người chơi | Trang {currentPage}/{totalPages}
            </span>
            <Button variant="surface" size="sm" onClick={() => closeModal('ECOSYSTEM')}>
              Đóng
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
                placeholder="Tìm kiếm người chơi, danh hiệu..."
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
                <span className="text-[11px] font-semibold text-[var(--text-muted)] mr-0.5">Bậc Rank:</span>
                {(['ALL', 9, 8, 7, 6, 5, 4, 3, 2, 1] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => { setSelectedTierFilter(tier as any); setCurrentPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all select-none border ${
                      selectedTierFilter === tier
                        ? 'bg-[var(--bg-card-active)] text-[var(--color-gold)] border-[var(--color-gold)] shadow-sm'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-card)] hover:border-[var(--border-card-hover)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {tier === 'ALL' ? 'Tất Cả' 
                      : tier === 9 ? '⚡ T9' 
                      : tier === 8 ? '🌌 T8' 
                      : tier === 7 ? '👑 T7' 
                      : tier === 6 ? '🔮 T6' 
                      : tier === 5 ? '💎 T5' 
                      : tier === 4 ? '🥇 T4' 
                      : tier === 3 ? '🥈 T3' 
                      : tier === 2 ? '🥉 T2' 
                      : '🪵 T1'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">Xếp theo:</span>
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
                    <option value="elo">Điểm Elo</option>
                    <option value="coins">Tiền Vốn (Xu)</option>
                    <option value="winRate">Tỉ Lệ Thắng (%)</option>
                    <option value="gamesPlayed">Số Trận Đấu</option>
                  </select>
                </div>
                <Button
                  variant="surface"
                  size="sm"
                  onClick={toggleSortOrder}
                  title="Đổi thứ tự tăng/giảm"
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
                    <th className="py-2.5 px-3 w-14 text-center whitespace-nowrap">Hạng</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[180px]">Cao Thủ</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px]">Bậc Rank</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[90px]">Điểm Elo</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">Tiền Vốn</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px]">Tỉ Lệ Thắng</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[100px]">Phong Độ</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px]">Hồ Sơ</th>
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
                              {item.avatar || '🤖'}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                {item.name}
                                {isHuman && (
                                  <Badge variant="gold" size="sm">
                                    BẠN
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  item.activityStatus === 'IN_MATCH' ? 'bg-[var(--color-emerald-text)] animate-pulse' : 'bg-slate-400'
                                }`} />
                                <span>{item.activityStatus === 'IN_MATCH' ? 'Đang Trong Bàn' : 'Trực Tuyến'}</span>
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
                            ({item.stats.wins}/{item.stats.gamesPlayed} ván)
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
                            Hồ Sơ
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
                  Đang xem {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, sortedAndFilteredList.length)} trong tổng số {sortedAndFilteredList.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="surface"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Trước
                  </Button>
                  <span className="px-2.5 font-bold text-[var(--text-primary)] text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="surface"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Sau
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
                <span>Chưa có sự kiện nổi bật nào hôm nay. Các trận thắng lớn và sự kiện nổ hũ sẽ được vinh danh tại đây!</span>
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
                        {new Date(news.timestamp).toLocaleTimeString('vi-VN')} - Toàn Server
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

