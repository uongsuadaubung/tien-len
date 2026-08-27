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
  resetProfile: () => void;
  hydrateProfile: (profile: PlayerProfile) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: loadPlayerProfile(),

  hydrateProfile: (profile) => set({ profile }),

  setProfile: (profileOrUpdater) => set((state) => {
    const next = typeof profileOrUpdater === 'function' ? profileOrUpdater(state.profile) : profileOrUpdater;
    savePlayerProfile(next);
    return { profile: next };
  }),

  addCoins: (amount) => set((state) => {
    const prevStats = state.profile.stats || {
      gamesPlayed: 0,
      wins: 0,
      chopsDone: 0,
      congsGiven: 0,
      totalEarned: 0,
      highestStreak: 0,
      currentStreak: 0
    };
    const next: PlayerProfile = {
      ...state.profile,
      coins: state.profile.coins + amount,
      stats: {
        ...prevStats,
        totalEarned: (prevStats.totalEarned || 0) + Math.max(0, amount)
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
      loans: (state.profile.loans || 0) + amount
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  repayLoan: (amount) => set((state) => {
    const pay = Math.min(amount, state.profile.loans || 0);
    const next: PlayerProfile = {
      ...state.profile,
      coins: Math.max(0, state.profile.coins - pay),
      loans: Math.max(0, (state.profile.loans || 0) - pay)
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  claimDailyRelief: (amount) => set((state) => {
    const next: PlayerProfile = {
      ...state.profile,
      coins: state.profile.coins + amount,
      dailyReliefClaimedCount: (state.profile.dailyReliefClaimedCount || 0) + 1
    };
    savePlayerProfile(next);
    return { profile: next };
  }),

  resetProfile: () => set(() => {
    const initial = resetPlayerProfile();
    return { profile: initial };
  })
}));
