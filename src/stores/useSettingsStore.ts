import { create } from 'zustand';
import { GameSpeedMode } from '../engine/game-speed';

/**
 * ============================================================================
 * USER SETTINGS STORE (CẤU HÌNH TÙY CHỌN NGƯỜI DÙNG)
 * Chuyên biệt lưu trữ tùy chọn cá nhân (Âm thanh, Xếp bài, Gợi ý, Tốc độ trận đấu, Hiệu ứng, Debug Log)
 * ============================================================================
 */
interface SettingsState {
  soundEnabled: boolean;
  autoSortEnabled: boolean;
  aiHintEnabled: boolean;
  quickResponseAssistEnabled: boolean;
  xrayEnabled: boolean;
  botReasoningLogEnabled: boolean;
  gameSpeed: GameSpeedMode;

  // Actions
  toggleSound: () => void;
  toggleAutoSort: () => void;
  toggleAiHint: () => void;
  toggleQuickResponseAssist: () => void;
  toggleXRay: () => void;
  toggleBotReasoningLog: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAutoSortEnabled: (enabled: boolean) => void;
  setAiHintEnabled: (enabled: boolean) => void;
  setQuickResponseAssistEnabled: (enabled: boolean) => void;
  setXRayEnabled: (enabled: boolean) => void;
  setBotReasoningLogEnabled: (enabled: boolean) => void;
  setGameSpeed: (speed: GameSpeedMode) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,
  autoSortEnabled: true,
  aiHintEnabled: false,
  quickResponseAssistEnabled: false, // Mặc định TẮT nút Bắt Bài Nhanh
  xrayEnabled: false, // Mặc định TẮT soi bài
  botReasoningLogEnabled: false, // Mặc định TẮT (người chơi có thể bật trong Settings)
  gameSpeed: 'REALISTIC', // Mặc định: Giả lập thời gian suy nghĩ chân thực động

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleAutoSort: () => set((state) => ({ autoSortEnabled: !state.autoSortEnabled })),
  toggleAiHint: () => set((state) => ({ aiHintEnabled: !state.aiHintEnabled })),
  toggleQuickResponseAssist: () => set((state) => ({ quickResponseAssistEnabled: !state.quickResponseAssistEnabled })),
  toggleXRay: () => set((state) => ({ xrayEnabled: !state.xrayEnabled })),
  toggleBotReasoningLog: () => set((state) => ({ botReasoningLogEnabled: !state.botReasoningLogEnabled })),

  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setAutoSortEnabled: (enabled) => set({ autoSortEnabled: enabled }),
  setAiHintEnabled: (enabled) => set({ aiHintEnabled: enabled }),
  setQuickResponseAssistEnabled: (enabled) => set({ quickResponseAssistEnabled: enabled }),
  setXRayEnabled: (enabled) => set({ xrayEnabled: enabled }),
  setBotReasoningLogEnabled: (enabled) => set({ botReasoningLogEnabled: enabled }),
  setGameSpeed: (speed) => set({ gameSpeed: speed })
}));
