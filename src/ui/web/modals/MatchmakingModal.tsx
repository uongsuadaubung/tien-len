import React from 'react';
import { Modal, Card, Button, Badge } from '../../primitives';
import { Swords, Check, X, Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '../../../locales';
import { useMatchmakingLogic, type UseMatchmakingLogicOptions } from '../../hooks/useMatchmakingLogic';

export type MatchmakingModalProps = UseMatchmakingLogicOptions;

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  match,
  onCancel,
  onMatchReady
}) => {
  const { t } = useI18n();
  const {
    stage,
    formattedTime,
    currentTip,
    playerTier,
    playerProfile,
    allSlots,
    handleCancel,
    betAmount,
    modeName,
    playerCount
  } = useMatchmakingLogic({ match, onCancel, onMatchReady });

  return (
    <Modal
      isOpen={true}
      onClose={handleCancel}
      title={stage === 'SEARCHING' ? t('matchmaking.modalTitle') : t('matchmaking.matchFound')}
      subtitle={t('matchmaking.subtitle', { mode: modeName, bet: betAmount.toLocaleString(), players: playerCount })}
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
              <span>{t('matchmaking.allReadyEntering', { count: playerCount })}</span>
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
                {formattedTime}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-300 min-h-[20px] transition-all">
                {currentTip}
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
                {playerCount === 2
                  ? t('matchmaking.foundSolo')
                  : t('matchmaking.foundOpponents', { count: Math.max(1, playerCount - 1) })}
              </span>
              <Sparkles className="w-4 h-4 text-[var(--color-gold)] animate-spin" />
            </Card>

            {/* Danh Sách Đấu Thủ Ghép Bàn Thích Ứng */}
            <div className={`grid ${playerCount === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-2.5`}>
              {allSlots.map((slot) => {
                const tier = slot.tier;
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
