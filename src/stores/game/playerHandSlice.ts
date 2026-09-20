import type { PlayerHandSlice, GameSliceCreator, HandSortMode } from './types';

export const createPlayerHandSlice: GameSliceCreator<PlayerHandSlice> = (set) => ({
  selectedCardIds: new Set<string>(),
  currentHint: null,
  handSortMode: 'NATURAL',
  smartVariantIndex: 0,

  setSelectedCardIds: (idsOrUpdater) => set((state) => ({
    selectedCardIds: typeof idsOrUpdater === 'function' ? idsOrUpdater(state.selectedCardIds) : idsOrUpdater
  })),
  toggleCardSelect: (cardId) => set((state) => {
    const next = new Set(state.selectedCardIds);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }
    return { selectedCardIds: next };
  }),
  clearCardSelection: () => set({ selectedCardIds: new Set<string>() }),
  setCurrentHint: (hint) => set({ currentHint: hint }),
  setHandSortMode: (mode) => set({ handSortMode: mode }),
  toggleHandSortMode: () => set((state) => {
    const modes: HandSortMode[] = ['NATURAL', 'SMART_GROUP', 'BY_SUIT', 'TWO_PRESERVE'];
    const currentIdx = modes.indexOf(state.handSortMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    return { handSortMode: modes[nextIdx] };
  }),
  setSmartVariantIndex: (index) => set({ smartVariantIndex: index })
});
