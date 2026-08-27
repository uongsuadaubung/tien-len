import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Ban, 
  Crown, 
  Swords, 
  Sparkles, 
  X, 
  MessageSquareQuote,
  Bot
} from 'lucide-react';
import { MoveHint, HintType } from '../../ai/hint-engine';

interface AIAssistantMascotProps {
  hint: MoveHint | null;
  isHumanTurn: boolean;
  enabled: boolean;
  onApplyHint?: () => void;
}

export const AIAssistantMascot: React.FC<AIAssistantMascotProps> = ({
  hint,
  isHumanTurn,
  enabled,
  onApplyHint
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Tự động mở bong bóng thoại khi đến lượt người chơi và có gợi ý mới
  useEffect(() => {
    if (isHumanTurn && hint) {
      setIsOpen(true);
    }
  }, [isHumanTurn, hint]);

  if (!enabled || !isHumanTurn || !hint) return null;

  // Lấy cấu hình màu sắc và icon theo loại lời khuyên
  const getThemeConfig = (type?: HintType) => {
    switch (type) {
      case 'DANGER_WARNING':
        return {
          badgeBg: 'bg-rose-500/20 border-rose-500/50 text-rose-400',
          bubbleBorder: 'border-rose-500/50 shadow-rose-500/10',
          titleColor: 'text-rose-400',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
        };
      case 'TACTICAL_PASS':
        return {
          badgeBg: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
          bubbleBorder: 'border-blue-500/40 shadow-blue-500/10',
          titleColor: 'text-blue-400',
          icon: <ShieldAlert className="w-4 h-4 text-blue-400" />
        };
      case 'FORCED_PASS':
        return {
          badgeBg: 'bg-zinc-700/40 border-zinc-600/50 text-zinc-300',
          bubbleBorder: 'border-zinc-700/60 shadow-black/40',
          titleColor: 'text-zinc-300',
          icon: <Ban className="w-4 h-4 text-zinc-400" />
        };
      case 'WIN_OPPORTUNITY':
        return {
          badgeBg: 'bg-amber-500/20 border-amber-400/60 text-amber-300',
          bubbleBorder: 'border-amber-400/60 shadow-amber-500/20',
          titleColor: 'text-amber-300',
          icon: <Crown className="w-4 h-4 text-amber-300 animate-bounce" />
        };
      case 'LEAD_OPENING':
        return {
          badgeBg: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
          bubbleBorder: 'border-emerald-500/40 shadow-emerald-500/10',
          titleColor: 'text-emerald-300',
          icon: <Sparkles className="w-4 h-4 text-emerald-300" />
        };
      case 'BEAT_MOVE':
      default:
        return {
          badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
          bubbleBorder: 'border-amber-500/40 shadow-amber-500/10',
          titleColor: 'text-[var(--color-gold)]',
          icon: <Swords className="w-4 h-4 text-[var(--color-gold)]" />
        };
    }
  };

  const theme = getThemeConfig(hint?.type);

  return (
    <div className="w-[280px] sm:w-[310px] flex items-start gap-2.5 pointer-events-auto select-none">
      {/* 1. CHÚ ROBOT MASCOT QUÂN SƯ */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer flex-shrink-0 transition-transform active:scale-95 group"
        title="Quân Sư Thần Bài (Bấm để xem/ẩn lời khuyên)"
      >
        <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-800 shadow-xl shadow-amber-950/50 group-hover:scale-105 transition-all">
          <div className="w-full h-full rounded-[14px] bg-[#0c1018] flex flex-col items-center justify-center relative overflow-hidden border border-amber-400/30">
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent" />
            <Bot className="w-6 h-6 text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
            <span className="text-[7px] font-black uppercase text-amber-300 tracking-tighter scale-90">
              Quân Sư
            </span>
          </div>
        </div>

        {/* Chấm thông báo có lời khuyên */}
        {isHumanTurn && hint && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-black text-[9px] items-center justify-center font-bold text-black">!</span>
          </span>
        )}
      </div>

      {/* 2. BONG BÓNG THOẠI CỦA ROBOT */}
      {isOpen ? (
        <div 
          className={`flex-1 relative bg-[#0d121d]/95 backdrop-blur-md border rounded-2xl p-2.5 shadow-2xl transition-all animate-in fade-in slide-in-from-left-2 duration-200 ${theme.bubbleBorder}`}
        >
          {/* Đuôi nhọn của bong bóng thoại chĩa thẳng vào miệng chú Robot */}
          <div className="absolute -left-2 top-3.5 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-[#0d121d] border-b-[6px] border-b-transparent" />

          {/* Header Bong bóng */}
          <div className="flex items-center justify-between gap-1.5 border-b border-white/[0.07] pb-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`p-0.5 px-1 rounded border ${theme.badgeBg}`}>
                {theme.icon}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wide truncate ${theme.titleColor}`}>
                {hint.title}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-0.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Thu nhỏ lời khuyên"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lời thoại Robot nói ra */}
          <div className="text-xs text-zinc-200 font-medium leading-relaxed">
            {hint.message}
          </div>

          {/* Footer nhỏ */}
          <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-zinc-500">
            <span className="flex items-center gap-1 text-amber-400/80 font-medium">
              <MessageSquareQuote className="w-3 h-3" />
              Quân Sư AI
            </span>
            {onApplyHint && hint.cards && hint.cards.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyHint();
                }}
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-all shadow hover:scale-105 cursor-pointer"
              >
                Chọn Nhanh ⚡
              </button>
            )}
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsOpen(true)}
          className="flex-1 bg-[#0d121d]/80 hover:bg-[#0d121d] border border-amber-500/30 rounded-xl p-2 cursor-pointer shadow-lg transition-all flex items-center justify-between group self-center"
          title="Bấm để mở lại lời khuyên Quân Sư"
        >
          <span className="text-[11px] font-bold text-amber-300">Lời khuyên Quân Sư</span>
          <span className="text-[10px] text-zinc-400 group-hover:text-amber-300 transition-colors">Xem ▶</span>
        </div>
      )}
    </div>
  );
};
