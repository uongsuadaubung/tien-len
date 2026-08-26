import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  X, 
  Sparkles, 
  Eye, 
  CheckCircle,
  BookOpen
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoSortEnabled?: boolean;
  onToggleAutoSort?: () => void;
  blossomEnabled?: boolean;
  onToggleBlossom?: () => void;
  aiHintEnabled?: boolean;
  onToggleAiHint?: () => void;
  xrayEnabled?: boolean;
  onToggleXRay?: () => void;
  onOpenRules?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  autoSortEnabled = true,
  onToggleAutoSort,
  aiHintEnabled = false,
  onToggleAiHint,
  xrayEnabled = false,
  onToggleXRay,
  onOpenRules
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className="relative w-full max-w-md bg-[#121724] border border-[#d4af37]/40 rounded-2xl p-6 shadow-2xl text-white">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-400 hover:text-white transition-colors border border-white/10 cursor-pointer shadow"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-5">
          <div className="p-2.5 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37]">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#f3e5ab]">
              Cài Đặt Hệ Thống
            </h2>
            <p className="text-xs text-slate-400">
              Tùy chỉnh âm thanh, tự động xếp bài và trợ lý AI.
            </p>
          </div>
        </div>

        {/* CÁC TÙY CHỌN HỆ THỐNG */}
        <div className="space-y-3">
          {/* 1. Âm thanh game */}
          <div 
            onClick={onToggleSound}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#182030] border border-white/5 hover:border-[#d4af37]/40 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${soundEnabled ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-[#0a0d14] text-slate-500'}`}>
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">Âm Thanh Casino & Đập Bài</div>
                <div className="text-[10px] text-slate-400">Tiếng chia bài, đập bài, chặt heo và chiến thắng</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${soundEnabled ? 'bg-[#d4af37]' : 'bg-[#0a0d14]'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* 2. Tự động xếp bài khi nhận */}
          <div 
            onClick={onToggleAutoSort}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#182030] border border-white/5 hover:border-[#d4af37]/40 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${autoSortEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#0a0d14] text-slate-500'}`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Tự Động Gom Bộ & Xếp Bài</div>
                <div className="text-[10px] text-slate-400">Tự động sắp xếp bài từ 3 đến 2 sau khi chia</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${autoSortEnabled ? 'bg-[#d4af37]' : 'bg-[#0a0d14]'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${autoSortEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* 3. Trợ lý AI Gợi Ý Nước Đi */}
          <div 
            onClick={onToggleAiHint}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#182030] border border-white/5 hover:border-[#d4af37]/40 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${aiHintEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-[#0a0d14] text-slate-500'}`}>
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Trợ Lý AI Gợi Ý Nước Đi</div>
                <div className="text-[10px] text-slate-400">Hiện nút Gợi Ý AI khi đến lượt của bạn</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${aiHintEnabled ? 'bg-[#d4af37]' : 'bg-[#0a0d14]'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${aiHintEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* 4. Chế Độ Soi Bài & Huấn Luyện AI (X-Ray Inspector) */}
          <div 
            onClick={onToggleXRay}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#182030] border border-white/5 hover:border-[#d4af37]/40 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${xrayEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#0a0d14] text-slate-500'}`}>
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Chế Độ Soi Bài & Phân Tích AI</div>
                <div className="text-[10px] text-slate-400">Hiển thị nút Soi Bài (X-Ray) để quan sát ván đấu</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${xrayEnabled ? 'bg-[#d4af37]' : 'bg-[#0a0d14]'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${xrayEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* 5. Nút Mở Luật Chơi & Bảng Khắc Chế */}
          {onOpenRules && (
            <button
              onClick={() => {
                onClose();
                onOpenRules();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 to-[#182030] border border-red-500/30 hover:border-red-500/60 text-[#f3e5ab] hover:text-white cursor-pointer transition-all shadow"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-950/80 text-red-400 border border-red-500/40">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Luật Chơi & Bảng Khắc Chế Bài</span>
                    <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black">HOT</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Tra cứu cách chặt Heo, Tứ Quý, 3-4 Đôi Thông & phạt</div>
                </div>
              </div>
              <span className="text-[#d4af37] text-sm font-black">→</span>
            </button>
          )}
        </div>

        {/* THÔNG TIN HỆ THỐNG */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
          <span>Tiến Lên Miền Nam VIP</span>
          <span>Luxury Casino Edition</span>
        </div>
      </div>
    </div>
  );
};
