import type { TableRenderFrame, UserIntent, AudioCue } from './frame-types';
import type { MatchState } from '../state-machine/types';

/**
 * IGameSession
 * Hợp đồng giao tiếp duy nhất giữa tầng Web UI (Passive Dumb View) và Game Engine.
 * Web UI chỉ có thể:
 * 1. Gửi UserIntent vào Engine.
 * 2. Lấy TableRenderFrame để render JSX.
 * 3. Lắng nghe Frame cập nhật và AudioCue để kích hoạt hiệu ứng.
 */
export interface IGameSession {
  sendIntent(intent: UserIntent): void;
  getLatestFrame(): TableRenderFrame;
  getLatestMatchState(): MatchState;
  subscribeFrame(listener: (frame: TableRenderFrame) => void): () => void;
  subscribeAudioCue(listener: (cue: AudioCue) => void): () => void;
  dealCardStep?(playerIndex: number, currentCardCount: number): void;
  finishDealing?(): void;
  readonly lastWinnerId?: string | null;
  dispose(): void;
}
