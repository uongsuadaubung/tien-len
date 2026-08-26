import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Eye, 
  CheckCircle,
  BrainCircuit,
  Timer
} from 'lucide-react';
import { Modal, Card, Button } from '../primitives';
import { GameSpeedMode } from '../../engine/game-speed';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoSortEnabled: boolean;
  onToggleAutoSort: () => void;
  blossomEnabled: boolean;
  onToggleBlossom: () => void;
  aiHintEnabled: boolean;
  onToggleAiHint: () => void;
  xrayEnabled: boolean;
  onToggleXRay: () => void;
  botReasoningLogEnabled: boolean;
  onToggleBotReasoningLog: () => void;
  gameSpeed: GameSpeedMode;
  onSetGameSpeed: (speed: GameSpeedMode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  autoSortEnabled,
  onToggleAutoSort,
  blossomEnabled,
  onToggleBlossom,
  aiHintEnabled,
  onToggleAiHint,
  xrayEnabled,
  onToggleXRay,
  botReasoningLogEnabled,
  onToggleBotReasoningLog,
  gameSpeed,
  onSetGameSpeed
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài Đặt Hệ Thống"
      subtitle="Tùy chỉnh âm thanh, tự động xếp bài và các tính năng trợ lý AI"
      icon={<Settings className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="md"
      height="auto"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)]">Tiến Lên Miền Nam</span>
          <Button variant="surface" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-2.5">
        {/* 1. Âm thanh game */}
        <Card 
          variant="card"
          hoverable
          clickable
          onClick={onToggleSound}
          className="flex items-center justify-between p-3.5"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${soundEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Âm Thanh Casino &amp; Đập Bài</div>
              <div className="text-[10px] text-[var(--text-muted)]">Tiếng chia bài, đập bài, chặt heo và chiến thắng</div>
            </div>
          </div>

          <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${soundEnabled ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'}`}>
            <div className={`bg-[#0a0c0e] w-4 h-4 rounded-full shadow transform transition-transform ${soundEnabled ? 'translate-x-5 bg-white' : 'translate-x-0'}`} />
          </div>
        </Card>

        {/* 2. Tốc Độ & Thời Gian Suy Nghĩ Của Bot */}
        <Card variant="card" className="p-3.5 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Tốc Độ &amp; Thời Gian Suy Nghĩ Bot</div>
              <div className="text-[10px] text-[var(--text-muted)]">Tùy chỉnh nhịp độ giả lập hành vi suy nghĩ của Bot AI</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSetGameSpeed('FAST')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                gameSpeed === 'FAST'
                  ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-[var(--color-gold)]/10'
                  : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">⚡ Nhanh</span>
              <span className="text-[9px] text-[var(--text-muted)] mt-0.5">0.4s - 0.6s</span>
            </button>

            <button
              type="button"
              onClick={() => onSetGameSpeed('REALISTIC')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                gameSpeed === 'REALISTIC'
                  ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-[var(--color-gold)]/10'
                  : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">🎯 Chân Thực</span>
              <span className="text-[9px] text-[var(--text-muted)] mt-0.5">0.8s - 3.0s</span>
            </button>

            <button
              type="button"
              onClick={() => onSetGameSpeed('DELIBERATE')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                gameSpeed === 'DELIBERATE'
                  ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-[var(--color-gold)]/10'
                  : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">🧠 Cân Não</span>
              <span className="text-[9px] text-[var(--text-muted)] mt-0.5">2.5s - 3.5s</span>
            </button>
          </div>
        </Card>

        {/* 2. Tự động gom bộ & xếp bài */}
        <Card 
          variant="card"
          hoverable
          clickable
          onClick={onToggleAutoSort}
          className="flex items-center justify-between p-3.5"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${autoSortEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Tự Động Gom Bộ &amp; Xếp Bài</div>
              <div className="text-[10px] text-[var(--text-muted)]">Tự động sắp xếp bài sau khi chia ván mới</div>
            </div>
          </div>

          <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${autoSortEnabled ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'}`}>
            <div className={`bg-[#0a0c0e] w-4 h-4 rounded-full shadow transform transition-transform ${autoSortEnabled ? 'translate-x-5 bg-white' : 'translate-x-0'}`} />
          </div>
        </Card>

        {/* 3. Trợ lý AI Gợi Ý Nước Đi */}
        <Card 
          variant="card"
          hoverable
          clickable
          onClick={onToggleAiHint}
          className="flex items-center justify-between p-3.5"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${aiHintEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Trợ Lý AI Gợi Ý Nước Đi</div>
              <div className="text-[10px] text-[var(--text-muted)]">Hiển thị nút gợi ý khi đến lượt đánh của bạn</div>
            </div>
          </div>

          <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${aiHintEnabled ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'}`}>
            <div className={`bg-[#0a0c0e] w-4 h-4 rounded-full shadow transform transition-transform ${aiHintEnabled ? 'translate-x-5 bg-white' : 'translate-x-0'}`} />
          </div>
        </Card>

        {/* 4. Chế Độ Soi Bài (X-Ray) */}
        <Card 
          variant="card"
          hoverable
          clickable
          onClick={onToggleXRay}
          className="flex items-center justify-between p-3.5"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${xrayEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Chế Độ Soi Bài &amp; Phân Tích AI</div>
              <div className="text-[10px] text-[var(--text-muted)]">Hiển thị nút Soi Bài (X-Ray) để quan sát ván đấu</div>
            </div>
          </div>

          <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${xrayEnabled ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'}`}>
            <div className={`bg-[#0a0c0e] w-4 h-4 rounded-full shadow transform transition-transform ${xrayEnabled ? 'translate-x-5 bg-white' : 'translate-x-0'}`} />
          </div>
        </Card>

        {/* 5. Nhật Ký Suy Luận Bot AI (Debug Mode) */}
        <Card 
          variant="card"
          hoverable
          clickable
          onClick={onToggleBotReasoningLog}
          className="flex items-center justify-between p-3.5"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${botReasoningLogEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Nhật Ký Suy Luận Bot AI (Debug Mode)</div>
              <div className="text-[10px] text-[var(--text-muted)]">Xem chi tiết chuỗi suy nghĩ, lý do ra bài và điểm heuristics của Bot</div>
            </div>
          </div>

          <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${botReasoningLogEnabled ? 'bg-[var(--color-gold)]' : 'bg-[var(--bg-container)] border border-[var(--border-container)]'}`}>
            <div className={`bg-[#0a0c0e] w-4 h-4 rounded-full shadow transform transition-transform ${botReasoningLogEnabled ? 'translate-x-5 bg-white' : 'translate-x-0'}`} />
          </div>
        </Card>
      </div>
    </Modal>
  );
};
