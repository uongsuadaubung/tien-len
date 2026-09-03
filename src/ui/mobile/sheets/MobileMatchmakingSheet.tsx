import React, { useState, useEffect, useRef } from 'react';
import { BotConfig } from '../../../ai/types';
import { getRankTierByElo } from '../../../engine/elo';
import { soundManager } from '../../audio/sound-manager';
import { Swords, Check, X, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { Badge } from '../../primitives';
import { useUserStore } from '../../../stores/useUserStore';

export interface MobileMatchmakingSheetProps {
  isOpen: boolean;
  onCancel: () => void;
  onMatchReady: () => void;
  betAmount: number;
  modeName: string;
  matchedBots: Partial<BotConfig>[];
  playerCount?: number;
}

export const MobileMatchmakingSheet: React.FC<MobileMatchmakingSheetProps> = ({
  isOpen,
  onCancel,
  onMatchReady,
  betAmount,
  modeName,
  matchedBots,
  playerCount = 4
}) => {
  const { profile: playerProfile } = useUserStore();
  const [stage, setStage] = useState<'SEARCHING' | 'FOUND'>('SEARCHING');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const actualPlayerCount = playerCount || (matchedBots.length + 1);
  const requiredBotCount = Math.max(1, actualPlayerCount - 1);
  const playerTier = getRankTierByElo(playerProfile.elo);

  const searchingTips = [
    actualPlayerCount === 2 
      ? `🔍 Quét 1 đối thủ bậc ${playerTier.name} (Solo 1v1)...`
      : actualPlayerCount === 3
        ? `🔍 Quét 2 đối thủ bậc ${playerTier.name} (Bàn 3)...`
        : `🔍 Quét 3 đấu thủ bậc ${playerTier.name} (Bàn 4)...`,
    `⚡ Đang kiểm tra sới bạc ${modeName}...`,
    '📡 Đang kết nối vào phòng đấu bảo mật...',
    '🃏 Đang chuẩn bị bộ bài 52 lá tiêu chuẩn...'
  ];

  useEffect(() => {
    if (isOpen) {
      setStage('SEARCHING');
      setElapsedSeconds(0);
      setTipIndex(0);

      // Đếm giây tìm trận
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      // Đổi câu gợi ý mỗi 850ms
      tipIntervalRef.current = setInterval(() => {
        setTipIndex(prev => (prev + 1) % searchingTips.length);
      }, 850);

      // Giả lập thời gian tìm kiếm chân thực (1.8s - 2.4s)
      const simulatedDelay = 1800 + Math.random() * 600;
      const matchFoundTimeout = setTimeout(() => {
        setStage('FOUND');
        soundManager.playMatchFound();

        if (timerRef.current) clearInterval(timerRef.current);
        if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);

        // Sau 1.2s hiển thị đối thủ, tự động vào bàn
        autoStartTimeoutRef.current = setTimeout(() => {
          onMatchReady();
        }, 1200);
      }, simulatedDelay);

      return () => {
        clearTimeout(matchFoundTimeout);
        if (timerRef.current) clearInterval(timerRef.current);
        if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
        if (autoStartTimeoutRef.current) clearTimeout(autoStartTimeoutRef.current);
      };
    }
  }, [isOpen, onMatchReady, searchingTips.length]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Dựng danh sách người chơi hiển thị theo đúng số lượng (2, 3 hoặc 4 người)
  const allSlots = [
    {
      id: 'p0',
      name: playerProfile.name || 'Bạn',
      avatar: playerProfile.avatar || '🤠',
      elo: playerProfile.elo,
      isHuman: true
    },
    ...matchedBots.slice(0, requiredBotCount).map((b, idx) => ({
      id: `bot_${idx}`,
      name: b.name || `Đối thủ ${idx + 1}`,
      avatar: b.avatar || '🤖',
      elo: b.elo ?? 1000,
      isHuman: false
    }))
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#070b13] text-zinc-100 flex flex-col justify-between p-2 sm:p-3 select-none overflow-hidden h-full w-full max-h-screen">
      
      {/* 1. COMPACT TOP APP BAR (KHÔNG CHIẾM DIỆN TÍCH) */}
      <header className="w-full bg-[#0e1422] border border-[#222c3d] px-3 py-1.5 rounded-2xl flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={stage === 'SEARCHING' ? onCancel : () => {}}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#141b2b] border border-[#2a3449] text-xs font-bold text-amber-400 active:scale-95 transition-transform shrink-0"
            title="Hủy tìm trận"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay Lại</span>
          </button>
          
          <div className="flex items-center gap-1.5 min-w-0">
            <Swords className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
              {stage === 'SEARCHING' ? 'Ghép Trận Đấu Radar' : 'Đã Tìm Thấy Phòng Đấu!'}
            </span>
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              • {modeName} ({actualPlayerCount} Người)
            </span>
          </div>
        </div>

        <Badge variant="gold" size="sm">
          🪙 {betAmount.toLocaleString()} Xu/lá
        </Badge>
      </header>

      {/* 2. BODY ZERO-SCROLL MAIN STAGE (TỐI ƯU CHO MOBILE LANDSCAPE VÀ PORTRAIT) */}
      <main className="flex-1 flex flex-col items-center justify-center w-full min-h-0 my-auto py-1 overflow-hidden">
        
        {/* ================================================================= */}
        {/* GIAI ĐOẠN 1: SEARCHING RADAR SCAN (2 CỘT NGANG ZERO-SCROLL)        */}
        {/* ================================================================= */}
        {stage === 'SEARCHING' && (
          <div className="w-full max-w-2xl grid grid-cols-2 gap-3 sm:gap-6 items-center my-auto">
            
            {/* Cột Trái: Đĩa Radar & Đồng Hồ Đếm Giây */}
            <div className="flex flex-col items-center justify-center gap-1.5 bg-[#0e1422]/80 border border-[#222c3d] p-2.5 rounded-2xl shadow-lg">
              {/* Radar Quét Kim Cương */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
                <div className="absolute -inset-1.5 rounded-full border border-amber-500/30 animate-pulse" />
                <div className="relative w-full h-full rounded-full border-2 border-amber-500/60 bg-[#121826] flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-spin" />
                </div>
              </div>

              {/* Đồng hồ số đếm giây */}
              <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-widest font-mono drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                {formatTime(elapsedSeconds)}
              </div>
              <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">
                Đang Dò Tìm Sới Bạc
              </span>
            </div>

            {/* Cột Phải: Thẻ Người Chơi, Dòng Trạng Thái & Nút Hủy */}
            <div className="flex flex-col justify-between gap-2 h-full">
              {/* Thẻ người chơi */}
              <div className="p-2.5 bg-[#0e1422] border border-[#222c3d] rounded-2xl flex items-center justify-between shadow">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl shrink-0">{playerProfile.avatar || '🤠'}</span>
                  <div className="text-left min-w-0">
                    <div className="font-bold text-xs text-zinc-100 truncate">
                      {playerProfile.name || 'Bạn'}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium truncate">
                      <span>{playerTier.badge} Bậc {playerTier.name}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">{playerProfile.elo} Elo</span>
                    </div>
                  </div>
                </div>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded-lg shrink-0 animate-pulse">
                  Đang Quét
                </span>
              </div>

              {/* Dòng trạng thái Radar động */}
              <div className="bg-[#0e1422] border border-[#222c3d] px-2.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-semibold text-zinc-200 min-h-[30px] flex items-center shadow-inner leading-tight">
                {searchingTips[tipIndex]}
              </div>

              {/* Nút Hủy Tìm Trận */}
              <button
                onClick={onCancel}
                className="w-full py-1.5 px-3 rounded-xl bg-[#1c1418] hover:bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>HỦY TÌM TRẬN</span>
              </button>
            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* GIAI ĐOẠN 2: VERSUS REVEAL (4 CỘT NẰM NGANG ZERO-SCROLL)          */}
        {/* ================================================================= */}
        {stage === 'FOUND' && (
          <div className="w-full max-w-3xl flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200 my-auto">
            {/* Banner Thông Báo */}
            <div className="w-full bg-[#142416] border border-emerald-400/60 py-1 px-3 rounded-xl flex items-center justify-center gap-2 text-center shadow">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span className="font-black text-xs text-emerald-300 uppercase tracking-wide">
                {actualPlayerCount === 2
                  ? '⚔️ Đã tìm thấy đối thủ Solo 1v1 xứng tầm!'
                  : `⚔️ Đã ghép đủ ${actualPlayerCount} đấu thủ cùng bậc Rank!`}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            </div>

            {/* Lưới 4 Đấu Thủ (Nằm ngang 1 hàng 4 cột, vừa vặn 100% không scroll) */}
            <div className={`w-full grid ${actualPlayerCount === 2 ? 'grid-cols-2' : actualPlayerCount === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-1.5 sm:gap-2`}>
              {allSlots.map((slot) => {
                const tier = getRankTierByElo(slot.elo);
                return (
                  <div
                    key={slot.id}
                    className={`p-2 rounded-2xl border flex flex-col justify-between gap-1.5 shadow transition-transform ${
                      slot.isHuman
                        ? 'bg-[#1e1708] border-amber-400/80 shadow-amber-500/20'
                        : 'bg-[#0e1422] border-[#2a3449]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="relative shrink-0">
                        <span className="text-xl sm:text-2xl">{slot.avatar}</span>
                        {slot.isHuman && (
                          <span className="absolute -bottom-1 -right-1 text-[7px] bg-amber-500 text-black font-black px-0.5 rounded-full shadow">
                            BẠN
                          </span>
                        )}
                      </div>

                      <div className="text-left min-w-0 flex-1">
                        <div className={`font-bold text-xs truncate ${slot.isHuman ? 'text-amber-300' : 'text-zinc-100'}`}>
                          {slot.name}
                        </div>
                        <div className="text-[9px] text-zinc-400 font-medium truncate">
                          {tier.badge} {slot.elo}
                        </div>
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-center gap-1 text-emerald-400 font-black text-[9px] bg-emerald-950/70 border border-emerald-500/40 py-0.5 rounded-lg shrink-0">
                      <Check className="w-3 h-3" />
                      <span>SẴN SÀNG</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Thông báo vào bàn */}
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs animate-pulse mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tất cả đã sẵn sàng ({actualPlayerCount}/{actualPlayerCount})! Đang vào bàn...</span>
            </div>
          </div>
        )}

      </main>

      {/* 3. FOOTER TRẠNG THÁI NHẸ NHÀNG */}
      <footer className="w-full text-center text-[10px] text-zinc-500 py-0.5 shrink-0">
        Tiến Lên Miền Nam • Hệ Sinh Thái Đấu Thủ Tự Động
      </footer>

    </div>
  );
};
