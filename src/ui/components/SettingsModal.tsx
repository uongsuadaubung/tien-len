import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Eye, 
  CheckCircle,
  BrainCircuit
} from 'lucide-react';
import { Modal, Card, Button } from '../primitives';

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
  onToggleBotReasoningLog
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
          <span className="text-[11px] text-[var(--text-muted)]">Tiến Lên Miền Nam VIP</span>
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
