import React, { useState, useMemo } from 'react';
import { Modal } from '../primitives/Modal';
import { Card as UICard } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { BotActivityStatus, BotEntity, EcosystemNewsItem } from '../../engine/ecosystem/ecosystem-types';
import { 
  Trophy, 
  Coins, 
  Flame, 
  Snowflake, 
  Search, 
  SlidersHorizontal, 
  Newspaper, 
  Users, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  Activity,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';

const PAGE_SIZE = 15;

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
    isLoading,
    setSearchQuery,
    setSelectedTierFilter,
    setSelectedSortField,
    toggleSortOrder,
    setSelectedBot,
    resetEcosystem
  } = useEcosystemStore();

  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'NEWSFEED'>('LEADERBOARD');
  const [currentPage, setCurrentPage] = useState(1);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Tạo đối tượng đại diện cho Người Chơi để xếp hạng cùng 200 Bot
  const humanPlayerRankEntity: EcosystemTableItem = useMemo(() => {
    const totalGames = profile.stats.gamesPlayed || 0;
    const wins = profile.stats.wins || 0;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    let tierNum = 2;
    if (profile.elo <= 1050) tierNum = 1;
    else if (profile.elo <= 1350) tierNum = 2;
    else if (profile.elo <= 1650) tierNum = 3;
    else if (profile.elo <= 1950) tierNum = 4;
    else tierNum = 5;

    return {
      id: 'human_player',
      name: profile.name || 'Bạn (Người Chơi)',
      avatar: profile.avatar || '🤠',
      elo: profile.elo,
      coins: profile.coins,
      tierNum,
      tier: `Tier ${tierNum}`,
      rankBadge: tierNum === 5 ? '👑' : tierNum === 4 ? '💎' : tierNum === 3 ? '🥇' : tierNum === 2 ? '🥈' : '🥉',
      currentStreak: profile.stats.currentStreak || 0,
      highestStreak: profile.stats.highestStreak || 0,
      title: 'Đại Hiệp',
      personalityTags: ['Người Thật'],
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

  // Lọc và Sắp xếp danh sách
  const sortedAndFilteredList: EcosystemTableItem[] = useMemo(() => {
    let list: EcosystemTableItem[] = bots.filter(b => b.status === 'ACTIVE').map(b => ({
      ...b,
      rawBot: b,
      winRate: b.stats.gamesPlayed > 0 ? Math.round((b.stats.wins / b.stats.gamesPlayed) * 100) : 0,
      isHuman: false
    }));

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

  const handleResetConfirm = async () => {
    await resetEcosystem();
    setIsResetConfirmOpen(false);
  };

  if (!isEcosystemOpen) return null;

  return (
    <Modal
      isOpen={isEcosystemOpen}
      onClose={() => closeModal('ECOSYSTEM')}
      maxWidth="5xl"
      height="h-[90vh] sm:h-[700px]"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-[var(--text-primary)]">Thế Giới Sới Bạc</span>
              <Badge variant="gold">200 Cao Thủ Sống Động</Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Hệ sinh thái đối thủ thực tế, tự do thăng hạng & biến động tài chính</p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full text-xs">
          <div className="flex items-center gap-2">
            {!isResetConfirmOpen ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-rose-400 hover:text-rose-300 text-xs"
                onClick={() => setIsResetConfirmOpen(true)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Đặt Lại Thế Giới Bot
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-950/60 p-1 rounded-lg border border-rose-800/60">
                <span className="text-[11px] text-rose-300 font-medium">Xác nhận reset 200 Bot?</span>
                <Button variant="danger" size="sm" className="h-6 px-2 text-[11px]" onClick={handleResetConfirm}>
                  Có, Reset
                </Button>
                <Button variant="surface" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setIsResetConfirmOpen(false)}>
                  Hủy
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[var(--text-muted)]">
              Hiển thị {sortedAndFilteredList.length} cao thủ | Trang {currentPage}/{totalPages}
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-card)]">
            <button
              onClick={() => { setActiveTab('LEADERBOARD'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'LEADERBOARD'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> Bảng Xếp Hạng
            </button>
            <button
              onClick={() => setActiveTab('NEWSFEED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'NEWSFEED'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" /> Bản Tin Sới Bạc
              {newsfeed.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black">
                  {newsfeed.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'LEADERBOARD' && (
            <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Tìm tên bot, phong cách..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-card)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: BẢNG XẾP HẠNG (LEADERBOARD) */}
        {activeTab === 'LEADERBOARD' && (
          <div className="flex flex-col flex-1 min-h-0 space-y-2.5">
            {/* BỘ LỌC THEO BẬC TIER & NÚT SẮP XẾP */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-[var(--text-muted)] mr-1">Bậc:</span>
                {(['ALL', 5, 4, 3, 2, 1] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => { setSelectedTierFilter(tier); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                      selectedTierFilter === tier
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-card)]'
                    }`}
                  >
                    {tier === 'ALL' ? 'Tất cả (200)' : tier === 5 ? '👑 Thần Bài' : tier === 4 ? '💎 Cao Thủ' : tier === 3 ? '🥇 Kinh Nghiệm' : tier === 2 ? '🥈 Phong Trào' : '🥉 Tập Sự'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[11px] text-[var(--text-muted)]">Xếp theo:</span>
                <select
                  value={selectedSortField}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const val = e.target.value;
                    if (val === 'elo' || val === 'coins' || val === 'winRate' || val === 'gamesPlayed') {
                      setSelectedSortField(val);
                    }
                  }}
                  className="bg-[var(--bg-surface)] border border-[var(--border-card)] text-xs text-[var(--text-primary)] rounded-md px-2 py-1 focus:outline-none"
                >
                  <option value="elo">Điểm Elo</option>
                  <option value="coins">Tiền Vốn (Xu)</option>
                  <option value="winRate">Tỉ Lệ Thắng (%)</option>
                  <option value="gamesPlayed">Số Trận Đấu</option>
                </select>
                <button
                  onClick={toggleSortOrder}
                  className="p-1 bg-[var(--bg-surface)] border border-[var(--border-card)] rounded-md hover:text-amber-400 text-xs flex items-center gap-0.5"
                  title="Đổi thứ tự tăng/giảm"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">{sortOrder.toUpperCase()}</span>
                </button>
              </div>
            </div>

            {/* BẢNG DANH SÁCH BOT */}
            <div className="flex-1 overflow-y-auto min-h-0 rounded-xl border border-[var(--border-card)] bg-[var(--bg-surface)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[var(--bg-container)] border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] uppercase z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                    <th className="py-2.5 px-3">Cao Thủ</th>
                    <th className="py-2.5 px-3">Bậc Rank</th>
                    <th className="py-2.5 px-3 text-right">Điểm Elo</th>
                    <th className="py-2.5 px-3 text-right">Tiền Vốn (Xu)</th>
                    <th className="py-2.5 px-3 text-center">Tỉ Lệ Thắng</th>
                    <th className="py-2.5 px-3 text-center">Phong Độ</th>
                    <th className="py-2.5 px-3 text-center w-24">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {paginatedList.map((item, index) => {
                    const globalRank = (currentPage - 1) * PAGE_SIZE + index + 1;
                    const isHuman = item.isHuman;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-amber-500/5 ${
                          isHuman 
                            ? 'bg-amber-500/15 font-bold border-l-4 border-l-amber-400' 
                            : index % 2 === 0 ? 'bg-transparent' : 'bg-black/10'
                        }`}
                      >
                        {/* Hạng */}
                        <td className="py-2.5 px-3 text-center font-black">
                          {globalRank === 1 ? (
                            <span className="text-yellow-400 text-sm">🥇 #1</span>
                          ) : globalRank === 2 ? (
                            <span className="text-slate-300 text-sm">🥈 #2</span>
                          ) : globalRank === 3 ? (
                            <span className="text-amber-600 text-sm">🥉 #3</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">#{globalRank}</span>
                          )}
                        </td>

                        {/* Cao thủ */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{item.avatar || '🤖'}</span>
                            <div>
                              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                {item.name}
                                {isHuman && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-black bg-amber-500 text-slate-950 rounded">
                                    BẠN
                                  </span>
                                )}
                              </div>
                              {!isHuman && (
                                <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    item.activityStatus === 'IN_MATCH' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                  }`} />
                                  {item.activityStatus === 'IN_MATCH' ? 'Đang Đấu' : 'Nghỉ Ngơi'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Bậc Rank */}
                        <td className="py-2.5 px-3">
                          <Badge variant={item.tierNum >= 4 ? 'gold' : item.tierNum === 3 ? 'neutral' : 'dark'}>
                            {item.rankBadge} Tier {item.tierNum}
                          </Badge>
                        </td>

                        {/* Elo */}
                        <td className="py-2.5 px-3 text-right font-black text-amber-300">
                          {item.elo}
                        </td>

                        {/* Tiền Vốn */}
                        <td className="py-2.5 px-3 text-right font-bold text-yellow-300">
                          {item.coins.toLocaleString()}
                        </td>

                        {/* Tỉ Lệ Thắng */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-bold text-emerald-400">
                            {item.winRate}%
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block">
                            ({item.stats.wins}/{item.stats.gamesPlayed} ván)
                          </span>
                        </td>

                        {/* Phong Độ */}
                        <td className="py-2.5 px-3 text-center">
                          {item.currentStreak > 0 ? (
                            <span className="text-orange-400 font-bold flex items-center justify-center gap-0.5 text-[11px]">
                              <Flame className="w-3 h-3" /> +{item.currentStreak}
                            </span>
                          ) : item.currentStreak < 0 ? (
                            <span className="text-cyan-400 font-bold flex items-center justify-center gap-0.5 text-[11px]">
                              <Snowflake className="w-3 h-3" /> {item.currentStreak}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[11px]">--</span>
                          )}
                        </td>

                        {/* Thao Tác */}
                        <td className="py-2.5 px-3 text-center">
                          {!isHuman ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] hover:bg-amber-500/20 hover:text-amber-300"
                              onClick={() => {
                                if (item.rawBot) {
                                  handleOpenBotDetail(item.rawBot);
                                }
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Căn Cước
                            </Button>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] italic">Hồ sơ cá nhân</span>
                          )}
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
                <span className="text-[var(--text-muted)]">
                  Đang xem {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, sortedAndFilteredList.length)} trong tổng số {sortedAndFilteredList.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="surface"
                    size="sm"
                    className="h-7 px-2"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Trước
                  </Button>
                  <span className="px-3 font-bold text-[var(--text-primary)]">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="surface"
                    size="sm"
                    className="h-7 px-2"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Sau <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BẢN TIN SỚI BẠC (CASINO NEWSFEED) */}
        {activeTab === 'NEWSFEED' && (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
            {newsfeed.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                Chưa có sự kiện nổi bật nào trong sới bạc. Hãy tham gia thi đấu để kích hoạt các biến cố!
              </div>
            ) : (
              newsfeed.map((news) => (
                <UICard
                  key={news.id}
                  variant="card"
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                    news.type === 'BANKRUPTCY'
                      ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                      : news.type === 'WIN_STREAK'
                      ? 'bg-orange-950/20 border-orange-800/40 text-orange-200'
                      : news.type === 'BIG_WIN'
                      ? 'bg-yellow-950/20 border-yellow-800/40 text-yellow-200'
                      : 'bg-[var(--bg-surface)] border-[var(--border-card)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-black/40 text-lg flex-shrink-0">
                    {news.avatar || (news.type === 'BANKRUPTCY' ? '🚨' : news.type === 'WIN_STREAK' ? '🔥' : news.type === 'BIG_WIN' ? '💰' : '🎉')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-relaxed">{news.message}</p>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                      {new Date(news.timestamp).toLocaleTimeString('vi-VN')} - Sới Bạc Quốc Tế
                    </span>
                  </div>
                </UICard>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
