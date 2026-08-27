import { create } from 'zustand';
import { BotEntity, EcosystemNewsItem, SimulatedTableResult } from '../engine/ecosystem/ecosystem-types';
import { ecosystemManager, HumanMatchSummary } from '../engine/ecosystem/ecosystem-manager';
import { dbGetNewsfeed } from '../engine/db/indexed-db';

/**
 * ============================================================================
 * ECOSYSTEM ZUSTAND STORE
 * Quản lý trạng thái Bảng Xếp Hạng 200 Bot, Bản Tin Sới Bạc & Thẻ Căn Cước Đối Thủ
 * ============================================================================
 */

export interface SimulationResultPayload {
  tableResults: SimulatedTableResult[];
  highlightNews: EcosystemNewsItem[];
  executionTimeMs: number;
}

interface EcosystemState {
  bots: BotEntity[];
  newsfeed: EcosystemNewsItem[];
  selectedBot: BotEntity | null;
  searchQuery: string;
  selectedTierFilter: number | 'ALL';
  selectedSortField: 'elo' | 'coins' | 'winRate' | 'gamesPlayed';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  activeSimulationPromise: Promise<SimulationResultPayload> | null;

  // Actions
  initEcosystem: () => Promise<void>;
  refreshEcosystem: () => Promise<void>;
  setSelectedBot: (bot: BotEntity | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTierFilter: (tier: number | 'ALL') => void;
  setSelectedSortField: (field: 'elo' | 'coins' | 'winRate' | 'gamesPlayed') => void;
  toggleSortOrder: () => void;
  prepareMatchEcosystem: (playerElo: number, betAmount: number) => Promise<BotEntity[]>;
  settleMatchEcosystem: (humanSummary: HumanMatchSummary) => Promise<void>;
  resetEcosystem: () => Promise<void>;
}

export const useEcosystemStore = create<EcosystemState>((set, get) => ({
  bots: [],
  newsfeed: [],
  selectedBot: null,
  searchQuery: '',
  selectedTierFilter: 'ALL',
  selectedSortField: 'elo',
  sortOrder: 'desc',
  isLoading: false,
  activeSimulationPromise: null,

  initEcosystem: async () => {
    set({ isLoading: true });
    try {
      const bots = await ecosystemManager.initialize();
      const newsfeed = await dbGetNewsfeed(40);
      set({ bots, newsfeed, isLoading: false });
    } catch (e) {
      console.error('Lỗi khi tải EcosystemStore:', e);
      set({ isLoading: false });
    }
  },

  refreshEcosystem: async () => {
    const bots = await ecosystemManager.getAllBots();
    const newsfeed = await dbGetNewsfeed(40);
    set({ bots, newsfeed });
  },

  setSelectedBot: (bot) => set({ selectedBot: bot }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedTierFilter: (selectedTierFilter) => set({ selectedTierFilter }),
  setSelectedSortField: (selectedSortField) => set({ selectedSortField }),
  toggleSortOrder: () => set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),

  prepareMatchEcosystem: async (playerElo, betAmount) => {
    const { tableOpponents, simulationPromise } = await ecosystemManager.prepareMatchRound(playerElo, betAmount);
    set({ activeSimulationPromise: simulationPromise });
    return tableOpponents;
  },

  settleMatchEcosystem: async (humanSummary) => {
    let { activeSimulationPromise } = get();
    if (!activeSimulationPromise) {
      activeSimulationPromise = Promise.resolve({
        tableResults: [],
        highlightNews: [],
        executionTimeMs: 0
      });
    }

    try {
      await ecosystemManager.settleRound(humanSummary, activeSimulationPromise);
      const updatedBots = await ecosystemManager.getAllBots();
      const updatedNewsfeed = await dbGetNewsfeed(40);
      set({
        bots: updatedBots,
        newsfeed: updatedNewsfeed,
        activeSimulationPromise: null
      });
    } catch (e) {
      console.error('Lỗi khi kết toán hệ sinh thái:', e);
      set({ activeSimulationPromise: null });
    }
  },

  resetEcosystem: async () => {
    set({ isLoading: true });
    try {
      const bots = await ecosystemManager.resetEcosystem();
      const newsfeed = await dbGetNewsfeed(40);
      set({ bots, newsfeed, isLoading: false });
    } catch (e) {
      console.error('Lỗi khi reset ecosystem:', e);
      set({ isLoading: false });
    }
  }
}));
