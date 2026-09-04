import React from 'react';
import { 
  Home, 
  RotateCcw, 
  Map, 
  Swords, 
  Play, 
  Sparkles,
  Download,
  Cloud,
  Check,
  Users,
  Building2
} from 'lucide-react';
import { CampaignChapter } from '../../../engine/campaign';
import { useGameStore } from '../../../stores/useGameStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useOnlineStore } from '../../../stores/useOnlineStore';
import { MatchLogger } from '../../../engine/match-logger';
import { Button } from '../../primitives';
import { MiniCardView } from '../../components/CardView';
import { useVictoryLogic, PrimaryBtnIconType, SecondaryBtnIconType } from '../../hooks/useVictoryLogic';
import { useI18n, type I18nKeyPath } from '../../../locales';
import type { InstantWinType } from '../../../engine/types';

export interface MobileVictoryViewProps {
  isOpen: boolean;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onOpenCampaignMap: (() => void) | null;
  campaignResultMeta?: {
    isUnlockedNext: boolean;
    isAllCompleted: boolean;
    nextChapter: CampaignChapter | null;
    currentWins: number;
  } | null;
}

const INSTANT_WIN_KEY_MAP: Record<InstantWinType, I18nKeyPath> = {
  DRAGON_STRAIGHT: 'victory.instantWinTypes.DRAGON_STRAIGHT',
  FOUR_TWOS: 'victory.instantWinTypes.FOUR_TWOS',
  FIVE_PAIRS_SEQUENTIAL: 'victory.instantWinTypes.FIVE_PAIRS_SEQUENTIAL',
  SIX_PAIRS: 'victory.instantWinTypes.SIX_PAIRS',
  SAME_COLOR_13: 'victory.instantWinTypes.SAME_COLOR_13',
  FIRST_ROUND_FOUR_THREES: 'victory.instantWinTypes.FIRST_ROUND_FOUR_THREES'
};

function isInstantWinType(val: string): val is InstantWinType {
  return Object.prototype.hasOwnProperty.call(INSTANT_WIN_KEY_MAP, val);
}

function renderPrimaryIcon(type: PrimaryBtnIconType) {
  switch (type) {
    case 'PLAY': return <Play className="w-4 h-4 text-black fill-current" />;
    case 'CHECK': return <Check className="w-4 h-4 text-black" />;
    case 'SWORDS': return <Swords className="w-4 h-4 text-black" />;
    case 'ROTATE_CCW': return <RotateCcw className="w-4 h-4 text-black" />;
    case 'HOME': return <Home className="w-4 h-4 text-black" />;
    case 'BANK': return <Building2 className="w-4 h-4 text-black" />;
    case 'SPINNER': return <RotateCcw className="w-4 h-4 text-black animate-spin" />;
  }
}

function renderSecondaryIcon(type: SecondaryBtnIconType) {
  switch (type) {
    case 'HOME': return <Home className="w-4 h-4 text-amber-400" />;
    case 'MAP': return <Map className="w-4 h-4" />;
  }
}

export const MobileVictoryView: React.FC<MobileVictoryViewProps> = ({
  isOpen,
  onNextGame,
  onReturnToLobby,
  onOpenCampaignMap,
  campaignResultMeta
}) => {
  const { t } = useI18n();
  const { githubToken, autoBackupOnMatchEnd } = useSettingsStore();
  const { myPlayerId } = useGameStore();
  const { roomState } = useOnlineStore();

  const getInstantWinTitle = (type: string) => {
    if (isInstantWinType(type)) {
      return t(INSTANT_WIN_KEY_MAP[type]);
    }
    return type;
  };

  const {
    isCampaign,
    isTableDismissed,
    isHumanBankrupt,
    bankruptBots,
    displayPlayers,
    humanPayout,
    modalTitle: viewTitle,
    modalSubtitle: viewSubtitle,
    modalIcon: viewIcon,
    primaryBtnText,
    primaryBtnIconType,
    primaryBtnDisabled,
    primaryBtnAction,
    secondaryBtnText,
    secondaryBtnIconType,
    secondaryBtnAction,
    statBox1Title,
    statBox1Value,
    statBox1Sub,
    statBox2Title,
    statBox2Value,
    statBox2Sub,
    totalOnlinePlayers,
    readyOnlinePlayers,
    handleExportJson,
    winners,
    allPlayers,
    instantWinType,
    isThreeSpadesWin,
    betAmount,
    activeGameType,
    payouts,
    loanDeduction,
    eloDelta,
    allEloDeltas
  } = useVictoryLogic({
    isOpen,
    onNextGame,
    onReturnToLobby,
    onOpenCampaignMap,
    campaignResultMeta
  });

  if (!isOpen) return null;

  const matchReport = MatchLogger.getInstance().getLatestReport();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070b13] text-zinc-100 w-full h-full select-none animate-in fade-in duration-200 overflow-hidden">
      
      {/* 1. TOP APP BAR NATIVE (TUYỆT ĐỐI KHÔNG CÓ NÚT QUAY LẠI) */}
      <header className="sticky top-0 z-20 w-full bg-[#0e1422] border-b border-[#222c3d] pt-[max(env(safe-area-inset-top),8px)] pb-2 px-3 sm:px-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#1e1507] border border-amber-500/50 flex items-center justify-center text-base shrink-0 shadow-inner">
            {viewIcon}
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider truncate">
              {viewTitle}
            </h2>
            <p className="text-[10px] text-zinc-400 truncate">
              {viewSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-[#141b2b] border border-[#2a3449] px-2.5 py-1 rounded-xl text-[10px] font-bold text-amber-400">
            {t('tableConfig.modeCountCardsBadge', { amount: betAmount.toLocaleString() })}
          </span>
        </div>
      </header>

      {/* 2. BODY NỘI DUNG CUỘN CẢM ỨNG NATIVE */}
      <main className="flex-1 overflow-y-auto pt-2.5 pb-4 px-3 sm:px-4 space-y-2.5 custom-scrollbar bg-[#070b13]">
        <div className="max-w-2xl mx-auto space-y-2.5">
          
          {/* BANNER BỎ PHIẾU VÁN MỚI ONLINE P2P */}
          {activeGameType === 'ONLINE' && roomState && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-amber-950/40 border border-amber-500/40 shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {t('victory.onlineVoteBanner', { ready: readyOnlinePlayers, total: totalOnlinePlayers })}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-zinc-400">
                  {readyOnlinePlayers === totalOnlinePlayers 
                    ? t('victory.onlineAllReadyInitializing')
                    : t('victory.onlineWaitingReady')
                  }
                </span>
              </div>

              {/* Danh sách người chơi và trạng thái Ready */}
              <div className="grid grid-cols-2 gap-1.5">
                {roomState.players.map((op) => (
                  <div 
                    key={op.playerId}
                    className={`flex items-center gap-1.5 p-1.5 rounded-xl border transition-all ${
                      op.isReady 
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                        : 'bg-[#0e1422] border-[#222c3d] text-zinc-400'
                    }`}
                  >
                    <span className="text-base shrink-0">{op.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate text-zinc-200">
                        {op.name} {op.playerId === myPlayerId ? `(${t('hud.you')})` : ''}
                      </div>
                      <div className="text-[9px] font-semibold flex items-center gap-0.5">
                        {op.isReady ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> {t('common.ready')}
                          </span>
                        ) : (
                          <span className="text-amber-400/80">⏳ {t('online.waitingPlayer')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* BANNER GIẢI TÁN SỚI BẠC KHI CÓ NGƯỜI KHÔNG ĐỦ TIỀN */}
          {isTableDismissed && (
            <div className="p-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center gap-2 text-center shadow">
              <span className="text-rose-300 font-bold text-xs">
                {isHumanBankrupt
                  ? t('victory.dismissedHumanBankrupt')
                  : t('victory.dismissedBotBankrupt', { names: bankruptBots.map(b => b.name).join(', ') })
                }
              </span>
            </div>
          )}

          {/* BANNER 3 BÍCH HOÀNG GIA */}
          {isThreeSpadesWin && (
            <div className="p-2 rounded-2xl bg-[#1e1708] border border-amber-400/60 flex items-center justify-center gap-2 text-center shadow">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                {t('victory.threeSpadesRuleActive')}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
          )}

          {/* 2 THẺ THỐNG KÊ TÓM TẮT */}
          <div className="grid grid-cols-2 gap-2">
            {/* Card 1: Kết Quả Cá Nhân */}
            <div className="p-2.5 rounded-2xl bg-[#0e1422] border border-[#222c3d] shadow">
              <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">
                {statBox1Title}
              </span>
              <div className={`text-sm sm:text-base font-black mt-0.5 ${humanPayout > 0 ? 'text-amber-400' : humanPayout === 0 ? 'text-zinc-100' : 'text-rose-400'}`}>
                {statBox1Value}
              </div>
              {statBox1Sub && (
                <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                  {statBox1Sub}
                </span>
              )}
              {loanDeduction > 0 && (
                <span className="text-[10px] text-amber-400 block mt-0.5">
                  ({t('victory.loanDeducted', { amount: loanDeduction.toLocaleString() })})
                </span>
              )}
            </div>

            {/* Card 2: Chế Độ / Rank */}
            <div className="p-2.5 rounded-2xl bg-[#0e1422] border border-[#222c3d] shadow">
              <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">
                {statBox2Title}
              </span>
              <div className="text-xs sm:text-sm font-bold text-zinc-100 mt-0.5 truncate">
                {statBox2Value}
              </div>
              {statBox2Sub && (
                <span className="text-[10px] text-zinc-400 font-medium block mt-0.5 truncate">
                  {statBox2Sub}
                </span>
              )}
            </div>
          </div>

          {/* DANH SÁCH BẢNG XẾP HẠNG & BÀI TÀN CUỘC CỦA TỪNG ĐẤU THỦ */}
          <div className="space-y-2">
            {displayPlayers.map((p, idx) => {
              const isWinner = idx === 0;
              const rankLabel = isWinner
                ? (instantWinType ? t('victory.instantWinBadge', { type: getInstantWinTitle(instantWinType) }) : `🥇 ${t('victory.rank1')}`)
                : (instantWinType
                  ? t('victory.instantWinPenalty')
                  : (winners.length >= allPlayers.length - 1
                    ? (idx === 1 ? `🥈 ${t('victory.rank2')}` : idx === 2 ? `🥉 ${t('victory.rank3')}` : `💥 ${t('victory.rank4')}`)
                    : t('victory.lostCountingCards')));
              const netPay = payouts ? payouts[p.id] : undefined;
              const remainingCards = p.hand ? [...p.hand].sort((a, b) => a.weight - b.weight) : [];
              const hasRottenTwo = !isWinner && !instantWinType && remainingCards.some(c => c.rank === 15);
              const isCong = !isWinner && !instantWinType && remainingCards.length === 13;

              // Biến động Elo của từng người chơi / bot
              const pEloDelta = (allEloDeltas && (allEloDeltas[p.id] !== undefined || (p.botPersonaId && allEloDeltas[p.botPersonaId] !== undefined)))
                ? (allEloDeltas[p.id] ?? (p.botPersonaId ? allEloDeltas[p.botPersonaId] : undefined))
                : (p.id === myPlayerId ? eloDelta : undefined);

              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-2xl border flex flex-col gap-1.5 shadow transition-all ${
                    isWinner
                      ? 'bg-[#1e1708] border-amber-400/70 shadow-amber-500/15'
                      : p.id === myPlayerId
                        ? 'bg-[#121826] border-amber-500/40'
                        : 'bg-[#0e1422] border-[#222c3d]'
                  }`}
                >
                  {/* Hàng 1: Avatar, Tên, Thứ Hạng, Biến Động Elo & Tiền Cược */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <span className="text-xl sm:text-2xl">{p.avatar}</span>
                        {p.id === myPlayerId && (
                          <span className="absolute -bottom-1 -right-1 text-[7px] bg-amber-500 text-black font-black px-1 rounded-full shadow">
                            {t('hud.you').replace(/[()]/g, '').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-zinc-100 truncate max-w-[120px] sm:max-w-[180px]">
                          {p.name}
                        </div>
                        <span className={`text-[10px] font-bold ${isWinner ? 'text-amber-300' : 'text-zinc-400'}`}>
                          {rankLabel}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2 shrink-0">
                      {!isCampaign && (
                        <>
                          {pEloDelta !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                              pEloDelta > 0 
                                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30' 
                                : pEloDelta < 0 
                                  ? 'text-rose-400 bg-rose-950/60 border border-rose-500/30' 
                                  : 'text-zinc-400 bg-zinc-800/60'
                            }`}>
                              {pEloDelta > 0 ? `+${pEloDelta}` : pEloDelta} Elo
                            </span>
                          )}
                          {netPay !== undefined && (
                            <div className={`font-black text-xs sm:text-sm ${netPay > 0 ? 'text-amber-400' : netPay < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                              {netPay > 0 ? `+${netPay.toLocaleString()}` : netPay < 0 ? `${netPay.toLocaleString()}` : '0'} 🪙
                            </div>
                          )}
                        </>
                      )}
                      {isCampaign && (
                        <div className={`text-xs font-bold ${isWinner ? 'text-amber-400' : 'text-zinc-400'}`}>
                          {isWinner ? t('victory.matchWon') : t('victory.cardsLeftCount', { count: remainingCards.length })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hàng 2: Bộ bài tàn cuộc thu nhỏ (MiniCardView) */}
                  <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-1.5">
                    {remainingCards.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] text-zinc-400 font-medium mr-0.5">
                          {t('victory.cardsLeftColon', { count: remainingCards.length })}
                        </span>
                        <div className="flex items-center gap-0.5 flex-wrap">
                          {remainingCards.map((c) => (
                            <MiniCardView key={c.id} card={c} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        👑 {t('victory.clearedAllCards')}
                      </span>
                    )}

                    {/* Huy hiệu cảnh báo đặc biệt */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isWinner && instantWinType && (
                        <span className="text-[8px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded-lg animate-pulse">
                          {t('victory.instantWinBadge', { type: getInstantWinTitle(instantWinType) })}
                        </span>
                      )}
                      {!isWinner && instantWinType && (
                        <span className="text-[8px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 rounded-lg">
                          {t('victory.instantWinPenaltyLeaves')}
                        </span>
                      )}
                      {hasRottenTwo && (
                        <span className="text-[8px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 rounded-lg animate-pulse">
                          {t('victory.rottenTwoBadge')}
                        </span>
                      )}
                      {isCong && (
                        <span className="text-[8px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 rounded-lg animate-pulse">
                          {t('victory.congsPenaltyBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SAO LƯU GIST & XUẤT JSON LOG */}
          <div className="flex items-center justify-between pt-1">
            {githubToken && autoBackupOnMatchEnd ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl">
                <Cloud className="w-3 h-3 shrink-0" />
                <span>{t('victory.autoBackupNotice')}</span>
              </span>
            ) : (
              <div />
            )}

            {matchReport && (
              <button
                type="button"
                onClick={handleExportJson}
                className="px-2.5 py-1 rounded-xl bg-[#141b2b] border border-[#2a3449] text-zinc-300 hover:text-amber-300 font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow"
              >
                <Download className="w-3 h-3 text-amber-400" />
                <span>{t('hud.exportAnalysis')} (.json)</span>
              </button>
            )}
          </div>

        </div>
      </main>

      {/* 3. FOOTER GHIM ĐÁY NATIVE (CÁC NÚT ĐIỀU HƯỚNG VÁN ĐẤU) */}
      <footer className="sticky bottom-0 z-20 w-full bg-[#0e1422] border-t border-[#222c3d] pt-2 pb-[max(env(safe-area-inset-bottom),10px)] px-3 sm:px-4 shadow-lg shrink-0">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-2">
          {isTableDismissed ? (
            <div className="w-full flex items-center justify-center">
              <Button
                variant="gold"
                size="md"
                onClick={primaryBtnAction}
                leftIcon={renderPrimaryIcon(primaryBtnIconType)}
                className="w-full sm:w-auto px-8 font-black text-xs sm:text-sm"
              >
                {primaryBtnText}
              </Button>
            </div>
          ) : (
            <>
              {/* Nút Về Sảnh */}
              <Button
                variant="surface"
                size="md"
                onClick={secondaryBtnAction}
                leftIcon={renderSecondaryIcon(secondaryBtnIconType)}
                className="flex-1 font-bold text-xs sm:text-sm"
              >
                {secondaryBtnText}
              </Button>

              {/* Nút Chính (Ván Mới / Đánh Tiếp / Thử Thách Lại / Sẵn Sàng) */}
              <Button
                variant="gold"
                size="md"
                onClick={primaryBtnAction}
                disabled={primaryBtnDisabled}
                leftIcon={renderPrimaryIcon(primaryBtnIconType)}
                className="flex-1 font-black text-xs sm:text-sm"
              >
                {primaryBtnText}
              </Button>
            </>
          )}
        </div>
      </footer>

    </div>
  );
};
