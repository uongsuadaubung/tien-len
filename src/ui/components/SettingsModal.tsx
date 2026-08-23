import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  X, 
  Sparkles, 
  Eye, 
  Music, 
  Sliders, 
  RotateCcw,
  CheckCircle,
  HelpCircle
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
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  autoSortEnabled = true,
  onToggleAutoSort,
  blossomEnabled = true,
  onToggleBlossom,
  aiHintEnabled = false,
  onToggleAiHint,
  xrayEnabled = false,
  onToggleXRay
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#180407] border-2 border-yellow-500/80 rounded-3xl p-6 shadow-2xl text-white">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-yellow-300 transition-colors border border-yellow-500/30 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-3 border-b border-yellow-500/30 pb-4 mb-5">
          <div className="p-2.5 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 text-yellow-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-yellow-300">
              Cài Đặt Hệ Thống
            </h2>
            <p className="text-xs text-yellow-100/70">
              Tùy chỉnh âm thanh, hiệu ứng và trải nghiệm thị giác.
            </p>
          </div>
        </div>

        {/* CÁC TÙY CHỌN HỆ THỐNG */}
        <div className="space-y-4">
          {/* 1. Âm thanh game */}
          <div 
            onClick={onToggleSound}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-yellow-500/20 hover:border-yellow-400/50 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${soundEnabled ? 'bg-yellow-500/20 text-yellow-400' : 'bg-neutral-800 text-neutral-500'}`}>
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">Âm Thanh Hiệu Ứng & Tiếng Đánh</div>
                <div className="text-[10px] text-neutral-400">Tiếng chia bài, đập bài, chặt heo và thắng ván</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${soundEnabled ? 'bg-yellow-500' : 'bg-neutral-800'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* 2. Hiệu ứng hoa mai / hoa đào rơi */}
          <div 
            onClick={onToggleBlossom}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-yellow-500/20 hover:border-yellow-400/50 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${blossomEnabled ? 'bg-pink-500/20 text-pink-400' : 'bg-neutral-800 text-neutral-500'}`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Cánh Hoa Rơi (Không Khí Tết)</div>
                <div className="text-[10px] text-neutral-400">Hiệu ứng cánh hoa đào và mai bay nhẹ nhàng</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${blossomEnabled ? 'bg-yellow-500' : 'bg-neutral-800'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${blossomEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* 3. Tự động xếp bài khi nhận */}
          <div 
            onClick={onToggleAutoSort}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-yellow-500/20 hover:border-yellow-400/50 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${autoSortEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Tự Động Gom Bộ & Xếp Bài</div>
                <div className="text-[10px] text-neutral-400">Tự động sắp xếp bài từ 3 đến 2 sau khi chia</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${autoSortEnabled ? 'bg-yellow-500' : 'bg-neutral-800'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${autoSortEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* 4. Trợ lý AI Gợi Ý Nước Đi */}
          <div 
            onClick={onToggleAiHint}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-yellow-500/20 hover:border-yellow-400/50 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${aiHintEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-neutral-800 text-neutral-500'}`}>
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Trợ Lý AI Gợi Ý Nước Đi</div>
                <div className="text-[10px] text-neutral-400">Hiện nút AI Khuyên Đánh khi đến lượt của bạn</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${aiHintEnabled ? 'bg-yellow-500' : 'bg-neutral-800'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${aiHintEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* 5. Chế Độ Soi Bài & Huấn Luyện AI (X-Ray Inspector) */}
          <div 
            onClick={onToggleXRay}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-yellow-500/20 hover:border-yellow-400/50 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${xrayEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-neutral-800 text-neutral-500'}`}>
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Chế Độ Soi Bài & Phân Tích AI</div>
                <div className="text-[10px] text-neutral-400">Hiển thị nút Soi Bài (X-Ray) để quan sát ván đấu</div>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${xrayEnabled ? 'bg-yellow-500' : 'bg-neutral-800'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${xrayEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        {/* THÔNG TIN HỆ THỐNG */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Tiến Lên Miền Nam VIP</span>
          <span>AI Simulation Engine</span>
        </div>
      </div>
    </div>
  );
};
