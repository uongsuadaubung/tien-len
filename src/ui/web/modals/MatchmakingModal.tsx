import React, { useState, useEffect, useRef } from 'react';
import { BotConfig } from '../../../ai/types';
import { getRankTierByElo } from '../../../engine/elo';
import { soundManager } from '../../audio/sound-manager';
import { Modal, Card, Button, Badge } from '../../primitives';
import { Swords, Check, X, Loader2, Sparkles } from 'lucide-react';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n } from '../../../locales';

export interface MatchmakingModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onMatchReady: () => void;
  betAmount: number;
  modeName: string;
  matchedBots: BotConfig[];
  playerCount?: number;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  onCancel,
  onMatchReady,
  betAmount,
  modeName,
  matchedBots,
  playerCount = 4
}) => {
  const { t } = useI18n();
  const { profile: playerProfile } = useUserStore();
  const [stage, setStage] = useState<'SEARCHING' | 'FOUND'>('SEARCHING');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const actualPlayerCount = playerCount || (matchedBots.length + 1);
  const requiredBotCount = Math.max(1, actualPlayerCount - 1);

  const searchingTips = [
    actualPlayerCount === 2 
      ? t('matchmaking.tipSolo')
      : actualPlayerCount === 3
        ? t('matchmaking.tip3P')
        : t('matchmaking.tip4P'),
    t('matchmaking.tipDeposit'),
    t('matchmaking.tipConnecting'),
    t('matchmaking.tipDeck')
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

      // Đổi câu gợi ý mỗi 800ms
      tipIntervalRef.current = setInterval(() => {
        setTipIndex(prev => (prev + 1) % searchingTips.length);
      }, 900);

      // Giả lập thời gian tìm kiếm chân thực (1.8s - 2.4s)
      const simulatedDelay = 1800 + Math.random() * 600;
      const matchFoundTimeout = setTimeout(() => {
        setStage('FOUND');
        soundManager.playMatchFound();

        if (timerRef.current) clearInterval(timerRef.current);
        if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);

        // Sau 1.3s hiển thị đối thủ, tự động vào bàn
        autoStartTimeoutRef.current = setTimeout(() => {
          onMatchReady();
        }, 1300);
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

  const playerTier = getRankTierByElo(playerProfile.elo);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Dựng danh sách người chơi hiển thị theo đúng số lượng (2, 3 hoặc 4 người)
  const allSlots = [
    {
      id: 'p0',
      name: playerProfile.name || t('hud.you').replace(/[()]/g, ''),
      avatar: playerProfile.avatar || '🤠',
      elo: playerProfile.elo,
      isHuman: true
    },
    ...matchedBots.slice(0, requiredBotCount).map((b, idx) => ({
      id: b.id || `bot_${idx}`,
      name: b.name,
      avatar: b.avatar,
      elo: b.elo,
      isHuman: false
    }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={stage === 'SEARCHING' ? onCancel : () => {}}
      title={stage === 'SEARCHING' ? t('matchmaking.modalTitle') : t('matchmaking.matchFound')}
      subtitle={t('matchmaking.subtitle', { mode: modeName, bet: betAmount.toLocaleString(), players: actualPlayerCount })}
      icon={<Swords className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="2xl"
      height="auto"
      footer={
        stage === 'SEARCHING' ? (
          <div className="w-full flex items-center justify-center">
            <Button
              variant="surface"
              size="md"
              onClick={onCancel}
              leftIcon={<X className="w-4 h-4 text-rose-400" />}
              className="hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-300"
            >
              {t('matchmaking.cancelSearch')}
            </Button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center py-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>{t('matchmaking.allReadyEntering', { count: actualPlayerCount })}</span>
            </div>
          </div>
        )
      }
    >
      <div className="py-2 space-y-4">
        {/* ================================================================= */}
        {/* GIAI ĐOẠN 1: ĐANG TÌM TRẬN (RADAR SEARCHING)                      */}
        {/* ================================================================= */}
        {stage === 'SEARCHING' && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-4">
            {/* Vòng Radar Xoay Quét Kim Cương */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              {/* Sóng xung kích tỏa ra */}
              <div className="absolute inset-0 rounded-full bg-[var(--color-gold)]/10 animate-ping" />
              <div className="absolute -inset-2 rounded-full border border-[var(--color-gold)]/30 animate-pulse" />
              <div className="absolute -inset-4 rounded-full border border-[var(--color-gold)]/15" />
              
              {/* Radar quay tròn */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[var(--color-gold)]/60 bg-[var(--bg-card)]/80 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Loader2 className="w-10 h-10 text-[var(--color-gold)] animate-spin" />
              </div>
            </div>

            {/* Đồng Hồ Đếm Thời Gian Tìm */}
            <div className="text-center space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-[var(--color-gold)] tracking-widest font-mono">
                {formatTime(elapsedSeconds)}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-300 min-h-[20px] transition-all">
                {searchingTips[tipIndex]}
              </div>
            </div>

            {/* Thông tin thẻ bài người chơi */}
            <Card variant="card" className="p-3 w-full max-w-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{playerProfile.avatar || '🤠'}</span>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                    {playerProfile.name || t('hud.you').replace(/[()]/g, '')}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {playerTier.badge} {playerTier.name} ({playerProfile.elo} Elo)
                  </div>
                </div>
              </div>
              <Badge variant="gold" size="sm">{t('matchmaking.searching')}</Badge>
            </Card>
          </div>
        )}

        {/* ================================================================= */}
        {/* GIAI ĐOẠN 2: ĐÃ TÌM THẤY TRẬN (VERSUS REVEAL)                      */}
        {/* ================================================================= */}
        {stage === 'FOUND' && (
          <div className="space-y-3 sm:space-y-4 animate-scale-up">
            {/* Banner Thông Báo */}
            <Card variant="active" className="p-2.5 sm:p-3 bg-amber-500/20 border-amber-400/50 flex items-center justify-center gap-2 text-center">
              <Sparkles className="w-4 h-4 text-[var(--color-gold)] animate-spin" />
              <span className="font-extrabold text-xs sm:text-sm text-[var(--color-gold)] tracking-wide uppercase">
                {actualPlayerCount === 2
                  ? t('matchmaking.foundSolo')
                  : t('matchmaking.foundOpponents', { count: requiredBotCount })}
              </span>
              <Sparkles className="w-4 h-4 text-[var(--color-gold)] animate-spin" />
            </Card>

            {/* Danh Sách Đấu Thủ Ghép Bàn Thích Ứng */}
            <div className={`grid ${actualPlayerCount === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-2.5`}>
              {allSlots.map((slot) => {
                const tier = getRankTierByElo(slot.elo);
                return (
                  <Card
                    key={slot.id}
                    variant={slot.isHuman ? 'active' : 'card'}
                    className={`p-3 flex items-center justify-between border ${
                      slot.isHuman ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/10'
                    } transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="text-2xl sm:text-3xl">{slot.avatar}</span>
                        {slot.isHuman && (
                          <span className="absolute -bottom-1 -right-1 text-[9px] bg-amber-500 text-black font-extrabold px-1 rounded-full">
                            {t('hud.you').replace(/[()]/g, '').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                          {slot.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                          <span>{tier.badge}</span>
                          <span>{tier.name}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-[var(--color-gold)] font-bold">{slot.elo} Elo</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px] bg-emerald-500/15 border border-emerald-400/30 px-2 py-1 rounded-lg">
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('common.ready')}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
