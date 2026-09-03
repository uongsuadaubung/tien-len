import { useState, useMemo } from 'react';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useViewStore } from '../../stores/useViewStore';
import { useUserStore } from '../../stores/useUserStore';
import { BotActivityStatus, BotEntity, EcosystemNewsItem, getTierFromElo } from '../../engine/ecosystem/ecosystem-types';

export const PAGE_SIZE = 15;

export type EcosystemTab = 'LEADERBOARD' | 'NEWSFEED';

export interface EcosystemTableItem {
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

export const TIER_FILTERS: readonly (number | 'ALL')[] = ['ALL', 9, 8, 7, 6, 5, 4, 3, 2, 1];

export interface UseEcosystemResult {
  activeTab: EcosystemTab;
  setActiveTab: (tab: EcosystemTab) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTierFilter: number | 'ALL';
  setSelectedTierFilter: (tier: number | 'ALL') => void;
  selectedSortField: 'elo' | 'coins' | 'winRate' | 'gamesPlayed';
  setSelectedSortField: (field: 'elo' | 'coins' | 'winRate' | 'gamesPlayed') => void;
  sortOrder: 'asc' | 'desc';
  toggleSortOrder: () => void;
  newsfeed: readonly EcosystemNewsItem[];
  sortedAndFilteredList: readonly EcosystemTableItem[];
  humanGlobalRank: number;
  totalPages: number;
  paginatedList: readonly EcosystemTableItem[];
  handleOpenBotDetail: (bot: BotEntity) => void;
  handleJumpToMyRank: () => void;
  humanAsBotEntity: BotEntity;
}

export function useEcosystem(): UseEcosystemResult {
  const { openModal } = useViewStore();
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
      personalityTags: ['Tay Chơi', 'Chiến Thuật'],
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
    dnaTier: humanPlayerRankEntity.tierNum,
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
    useMinimaxEndgame: false,
    useBayesianInference: false,
    useNashEquilibrium: false,
    useDynamicRepartitioning: false,
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

  // Lọc và Sắp xếp danh sách
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

  return {
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
  };
}
