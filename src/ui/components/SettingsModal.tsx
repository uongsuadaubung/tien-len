import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Eye, 
  CheckCircle, 
  BrainCircuit, 
  Timer, 
  Crosshair,
  Wand2
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
  aiHintEnabled: boolean;
  onToggleAiHint: () => void;
  quickResponseAssistEnabled: boolean;
  onToggleQuickResponseAssist: () => void;
  xrayEnabled: boolean;
  onToggleXRay: () => void;
  botReasoningLogEnabled: boolean;
  onToggleBotReasoningLog: () => void;
  gameSpeed: GameSpeedMode;
  onSetGameSpeed: (speed: GameSpeedMode) => void;
}

const ToggleSwitch: React.FC<{ checked: boolean }> = ({ checked }) => (
  <div
    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 flex-shrink-0 ${
      checked
        ? 'bg-[var(--color-gold)] shadow-sm shadow-amber-500/30'
        : 'bg-zinc-800 border border-zinc-700'
    }`}
  >
    <div
      className={`w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${
        checked ? 'translate-x-5 bg-[#0a0c0e]' : 'translate-x-0 bg-zinc-400'
      }`}
    />
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  autoSortEnabled,
  onToggleAutoSort,
  aiHintEnabled,
  onToggleAiHint,
  quickResponseAssistEnabled,
  onToggleQuickResponseAssist,
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
      title="Cài Đặt Trò Chơi"
      subtitle="Tùy chỉnh âm thanh, nhịp độ và các công cụ hỗ trợ bàn đấu"
      icon={<Settings className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="xl"
      height="auto"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)] font-medium">Tiến Lên Miền Nam</span>
          <Button variant="surface" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* ========================================================================= */}
        {/* NHÓM 1: ÂM THANH TRÒ CHƠI */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 border-b border-[var(--border-container)]/50 flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-[var(--color-gold)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
              Âm Thanh Trò Chơi
            </span>
          </div>

          <div>
            {/* Âm thanh bàn đấu */}
            <div
              onClick={onToggleSound}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors ${soundEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Âm Thanh Bàn Đấu</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Tiếng chia bài, đập bài, chặt heo và chiến thắng</div>
                </div>
              </div>

              <ToggleSwitch checked={soundEnabled} />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NHÓM 2: NHỊP ĐỘ VÁN ĐẤU */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 border-b border-[var(--border-container)]/50 flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-[var(--color-gold)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
              Nhịp Độ Ván Đấu
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Thời Gian Suy Nghĩ Của Bot</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Tùy chỉnh nhịp độ suy nghĩ và độ trễ ra bài của Bot AI</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onSetGameSpeed('FAST')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all ${
                  gameSpeed === 'FAST'
                    ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-amber-500/10'
                    : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
                }`}
              >
                <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1">⚡ Nhanh</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5">0.4s - 0.6s</span>
              </button>

              <button
                type="button"
                onClick={() => onSetGameSpeed('REALISTIC')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all ${
                  gameSpeed === 'REALISTIC'
                    ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-amber-500/10'
                    : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
                }`}
              >
                <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1">🎯 Chân Thực</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5">0.8s - 3.0s</span>
              </button>

              <button
                type="button"
                onClick={() => onSetGameSpeed('DELIBERATE')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all ${
                  gameSpeed === 'DELIBERATE'
                    ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-amber-500/10'
                    : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
                }`}
              >
                <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1">🧠 Cân Não</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5">2.5s - 3.5s</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NHÓM 3: HỖ TRỢ THAO TÁC & ĐÁNH BÀI */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 border-b border-[var(--border-container)]/50 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-[var(--color-gold)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
              Hỗ Trợ Thao Tác &amp; Đánh Bài
            </span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {/* 1. Tự động gom bộ & xếp bài */}
            <div
              onClick={onToggleAutoSort}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors ${autoSortEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Tự Động Gom Bộ &amp; Xếp Bài</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Tự sắp xếp sảnh, đôi, tứ quý ngay sau khi chia bài</div>
                </div>
              </div>

              <ToggleSwitch checked={autoSortEnabled} />
            </div>

            {/* 2. Hỗ Trợ Bắt Bài Nhanh */}
            <div
              onClick={onToggleQuickResponseAssist}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors ${quickResponseAssistEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <Crosshair className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Hỗ Trợ Bắt Bài Nhanh</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Hiển thị nút chọn nhanh các tổ hợp hợp lệ để chặn đối thủ</div>
                </div>
              </div>

              <ToggleSwitch checked={quickResponseAssistEnabled} />
            </div>

            {/* 3. Trợ lý AI Gợi Ý Nước Đi */}
            <div
              onClick={onToggleAiHint}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors ${aiHintEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Trợ Lý AI Gợi Ý Nước Đi</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Hiển thị nút tư vấn chiến thuật tối ưu khi đến lượt đánh</div>
                </div>
              </div>

              <ToggleSwitch checked={aiHintEnabled} />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NHÓM 4: PHÂN TÍCH & NÂNG CAO */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 border-b border-[var(--border-container)]/50 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-[var(--color-gold)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
              Phân Tích &amp; Nâng Cao
            </span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {/* 1. Chế Độ Soi Bài (X-Ray) */}
            <div
              onClick={onToggleXRay}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors ${xrayEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Chế Độ Soi Bài (X-Ray)</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Phân tích xác suất và quan sát toàn bộ bàn đấu</div>
                </div>
              </div>

              <ToggleSwitch checked={xrayEnabled} />
            </div>

            {/* 2. Nhật Ký Suy Luận Bot AI (Debug Mode) */}
            <div
              onClick={onToggleBotReasoningLog}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors ${botReasoningLogEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Nhật Ký Suy Luận Bot AI</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Xem chi tiết chuỗi suy nghĩ, lý do ra bài và điểm heuristics</div>
                </div>
              </div>

              <ToggleSwitch checked={botReasoningLogEnabled} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
