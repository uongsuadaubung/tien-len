import { create } from 'zustand';
import { PlayerProfile, loadPlayerProfile, savePlayerProfile, resetPlayerProfile } from '../engine/storage';

interface UserState {
  profile: PlayerProfile;

  // Actions
  setProfile: (profileOrUpdater: PlayerProfile | ((prev: PlayerProfile) => PlayerProfile)) => void;
  addCoins: (amount: number) => void;
  deductCoins: (amount: number) => void;
  updateElo: (delta: number) => void;
  takeLoan: (amount: number) => void;
  repayLoan: (amount: number) => void;
  claimDailyRelief: (amount: number) => void;
  equipItem: (category: 'title' | 'felt' | 'frame' | 'cardBack', id: string) => void;
  unlockItem: (itemId: string) => void;
  resetProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: loadPlayerProfile(),

  setProfile: (profileOrUpdater) => set((state) => {
    const next = typeof profileOrUpdater === 'function' ? profileOrUpdater(state.profile) : profileOrUpdater;
    savePlayerProfile(next);
    return { profile: next };
  }),

  addCoins: (amount) => set((state) => {
    const next: PlayerProfile = {
      ...state.profile,
      coins: state.profile.coins + amount,
      stats: {
        ...state.profile.stats,
        totalEarned: state.profile.stats.totalEarned + Math.max(0, amount)
      }
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  deductCoins: (amount) => set((state) => {
    const next: PlayerProfile = {
      ...state.profile,
      coins: Math.max(0, state.profile.coins - amount)
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  updateElo: (delta) => set((state) => {
    const next: PlayerProfile = {
      ...state.profile,
      elo: Math.max(0, state.profile.elo + delta)
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  takeLoan: (amount) => set((state) => {
    const next: PlayerProfile = {
      ...state.profile,
      coins: state.profile.coins + amount,
      loans: state.profile.loans + amount
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  repayLoan: (amount) => set((state) => {
    const pay = Math.min(amount, state.profile.loans);
    const next: PlayerProfile = {
      ...state.profile,
      coins: Math.max(0, state.profile.coins - pay),
      loans: Math.max(0, state.profile.loans - pay)
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  claimDailyRelief: (amount) => set((state) => {
    const next: PlayerProfile = {
      ...state.profile,
      coins: state.profile.coins + amount,
      dailyReliefClaimedCount: state.profile.dailyReliefClaimedCount + 1
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  equipItem: (category, id) => set((state) => {
    const updated = { ...state.profile };
    if (category === 'title') updated.activeTitle = id;
    if (category === 'felt') updated.activeTableFelt = id;
    if (category === 'frame') updated.activeAvatarFrame = id;
    if (category === 'cardBack') updated.activeCardBack = id;
    savePlayerProfile(updated);
    return { profile: updated };
  }),

  unlockItem: (itemId) => set((state) => {
    if (state.profile.unlockedItems.includes(itemId)) return state;
    const next: PlayerProfile = {
      ...state.profile,
      unlockedItems: [...state.profile.unlockedItems, itemId]
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  resetProfile: () => {
    const initial = resetPlayerProfile();
    return { profile: initial };
  }
}));
