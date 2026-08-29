import React from 'react';
import { Player, InstantWinType } from '../../../engine/types';
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
import { getRankTierByElo } from '../../../engine/elo';
import { CampaignChapter } from '../../../engine/campaign';
import { ActiveGameType, useGameStore } from '../../../stores/useGameStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useOnlineStore } from '../../../stores/useOnlineStore';
import { MatchLogger } from '../../../engine/match-logger';
import { Modal, Card, Button } from '../../primitives';
import { MiniCardView } from '../../components/CardView';
import { useVictoryLogic, PrimaryBtnIconType, SecondaryBtnIconType } from '../../hooks/useVictoryLogic';

interface VictoryModalProps {
  isOpen: boolean;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onOpenCampaignMap: (() => void) | null;
  winners: Player[];
  allPlayers: Player[];
  betAmount: number;
  instantWinType: string | null;
  isThreeSpadesWin: boolean;
  payouts: Record<string, number> | null;
  loanDeduction: number;
  eloDelta: number;
  playerElo: number;
  activeGameType: ActiveGameType;
  campaignChapter: CampaignChapter | null;
  chapterWins: number;
  isChapterUnlockedNext: boolean;
  isAllCampaignCompleted: boolean;
  nextChapter: CampaignChapter | null;
  playerCoins: number;
  allEloDeltas: Record<string, number> | null;
}

export const INSTANT_WIN_TITLES: Record<string, string> = {
  DRAGON_STRAIGHT: 'Sảnh Rồng',
  FOUR_TWOS: 'Tứ Quý Heo',
  SAME_COLOR_13: 'Đồng Màu 13 Lá',
  FIVE_PAIRS_SEQUENTIAL: '5 Đôi Thông',
  SIX_PAIRS: '6 Đôi Bất Kỳ',
  FIRST_ROUND_FOUR_THREES: 'Tứ Quý 3 Ván Đầu'
};

function renderPrimaryIcon(type: PrimaryBtnIconType) {
  switch (type) {
    case 'PLAY': return <Play className="w-4 h-4 text-black" />;
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
    case 'HOME': return <Home className="w-4 h-4" />;
    case 'MAP': return <Map className="w-4 h-4" />;
  }
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onNextGame,
  onReturnToLobby,
  onOpenCampaignMap,
  winners,
  allPlayers,
  betAmount,
  instantWinType,
  isThreeSpadesWin,
  payouts,
  loanDeduction,
  eloDelta,
  playerElo,
  activeGameType,
  campaignChapter,
  chapterWins,
  isChapterUnlockedNext,
  isAllCampaignCompleted,
  nextChapter,
  playerCoins,
  allEloDeltas
}) => {
  const { githubToken, autoBackupOnMatchEnd } = useSettingsStore();
  const { myPlayerId } = useGameStore();
  const { roomState } = useOnlineStore();

  const {
    isHumanWinner,
    isCampaign,
    isOnline,
    isTableDismissed,
    isHumanBankrupt,
    bankruptBots,
    displayPlayers,
    humanPayout,
    modalTitle,
    modalSubtitle,
    modalIcon,
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
    handleExportJson
  } = useVictoryLogic({
    isOpen,
    winners,
    allPlayers,
    betAmount,
    instantWinType: instantWinType as InstantWinType | null,
    isThreeSpadesWin,
    payouts,
    loanDeduction,
    eloDelta,
    playerElo,
    activeGameType,
    campaignChapter,
    chapterWins,
    isChapterUnlockedNext,
    isAllCampaignCompleted,
    nextChapter,
    playerCoins,
    allEloDeltas,
    onNextGame,
    onReturnToLobby,
    onOpenCampaignMap
  });

  if (!isOpen) return null;

  const matchReport = MatchLogger.getInstance().getLatestReport();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onReturnToLobby}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<span className="text-xl">{modalIcon}</span>}
      maxWidth="2xl"
      footer={
        isTableDismissed ? (
          <div className="w-full flex items-center justify-center">
            <Button
              variant="gold"
              size="md"
              onClick={primaryBtnAction}
              leftIcon={renderPrimaryIcon(primaryBtnIconType)}
              className="w-full sm:w-auto px-8"
            >
              {primaryBtnText}
            </Button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-2">
            {/* Nút Về Sảnh */}
            <Button
              variant="surface"
              size="md"
              onClick={secondaryBtnAction}
              leftIcon={renderSecondaryIcon(secondaryBtnIconType)}
            >
              {secondaryBtnText}
            </Button>

            {/* Nút Chính */}
            <Button
              variant="gold"
              size="md"
              onClick={primaryBtnAction}
              disabled={primaryBtnDisabled}
              leftIcon={renderPrimaryIcon(primaryBtnIconType)}
            >
              {primaryBtnText}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-3">
        {/* BANNER BỎ PHIẾU VÁN MỚI ONLINE P2P */}
        {isOnline && roomState !== null && (
          <Card variant="active" className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-amber-950/40 border-amber-500/40">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-gold)]" />
                <span className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-wider">
                  Bỏ Phiếu Ván Mới ({readyOnlinePlayers}/{totalOnlinePlayers})
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                {readyOnlinePlayers === totalOnlinePlayers 
                  ? '⚡ Đủ 100% phiếu, ván mới đang khởi tạo...' 
                  : '⏳ Cần toàn bộ người chơi sẵn sàng'
                }
              </span>
            </div>

            {/* Danh sách người chơi và trạng thái Ready */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {roomState.players.map((op) => (
                <div 
                  key={op.playerId}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                    op.isReady 
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                      : 'bg-slate-900/60 border-white/10 text-slate-400'
                  }`}
                >
                  <span className="text-lg">{op.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate text-[var(--text-primary)]">
                      {op.name} {op.playerId === myPlayerId ? '(Bạn)' : ''}
                    </div>
                    <div className="text-[10px] font-semibold flex items-center gap-1">
                      {op.isReady ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Sẵn sàng
                        </span>
                      ) : (
                        <span className="text-amber-400/80">⏳ Đang chờ...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
        {/* BANNER GIẢI TÁN SỚI BẠC KHI CÓ NGƯỜI KHÔNG ĐỦ TIỀN */}
        {isTableDismissed && (
          <Card variant="active" className="p-3 bg-rose-950/40 border-rose-500/40 flex items-center justify-center gap-2 text-center">
            <span className="text-rose-300 font-bold text-xs sm:text-sm">
              {isHumanBankrupt
                ? '💸 Số dư của bạn không đủ mức cược cho ván tiếp theo! Bàn chơi giải tán, vui lòng quay về sảnh.'
                : `🚨 Đối thủ ${bankruptBots.map(b => b.name).join(', ')} không đủ tiền cược cho ván tiếp theo! Bàn chơi giải tán, vui lòng về sảnh để tìm trận mới.`
              }
            </span>
          </Card>
        )}

        {/* BANNER 3 BÍCH HOÀNG GIA */}
        {isThreeSpadesWin && (
          <Card variant="active" className="p-2.5 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              ⚡ Luật Về 3 Bích Kích Hoạt: Thưởng x2 Tiền Cả Làng!
            </span>
            <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
          </Card>
        )}

        {/* THỐNG KÊ */}
        <div className="grid grid-cols-2 gap-2.5">
          <Card variant="card" className="p-3">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">
              {statBox1Title}
            </span>
            <div className={`text-sm sm:text-base font-bold mt-0.5 ${humanPayout > 0 ? 'text-[var(--color-gold)]' : humanPayout === 0 ? 'text-[var(--text-primary)]' : 'text-[#f87171]'}`}>
              {statBox1Value}
            </div>
            {statBox1Sub && (
              <span className="text-[10px] text-[var(--text-muted)] font-medium block mt-0.5">
                {statBox1Sub}
              </span>
            )}
            {loanDeduction > 0 && (
              <span className="text-[10px] text-[var(--color-gold)] block mt-0.5">
                (Đã trừ {loanDeduction.toLocaleString()} Xu trả nợ)
              </span>
            )}
          </Card>

          <Card variant="card" className="p-3">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">
              {statBox2Title}
            </span>
            <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-0.5">
              {statBox2Value}
            </div>
            {statBox2Sub && (
              <span className="text-[10px] text-[var(--text-muted)] font-medium block mt-0.5">
                {statBox2Sub}
              </span>
            )}
          </Card>
        </div>

        {/* Bảng Xếp Hạng & Bài Tàn Cuộc Của Người Chơi */}
        <div className="space-y-2.5 max-h-64 sm:max-h-80 overflow-y-auto pr-1">
          {displayPlayers.map((p, idx) => {
            const isWinner = idx === 0;
            const rankLabel = isWinner
              ? (instantWinType ? `⚡ TỚI TRẮNG (${INSTANT_WIN_TITLES[instantWinType] || instantWinType})` : '🥇 VỀ NHẤT')
              : (instantWinType
                ? '💥 ĐỀN TỚI TRẮNG'
                : (winners.length >= allPlayers.length - 1
                  ? (idx === 1 ? '🥈 VỀ NHÌ' : idx === 2 ? '🥉 VỀ BA' : '💥 VỀ BÉT')
                  : '💥 THUA ĐẾM LÁ'));
            const netPay = payouts ? payouts[p.id] : undefined;
            const remainingCards = p.hand ? [...p.hand].sort((a, b) => a.weight - b.weight) : [];
            const hasRottenTwo = !isWinner && !instantWinType && remainingCards.some(c => c.rank === 15);
            const isCong = !isWinner && !instantWinType && remainingCards.length === 13;

            // Biến động Elo của từng người chơi / bot
            const pEloDelta = (allEloDeltas && (allEloDeltas[p.id] !== undefined || (p.botPersonaId && allEloDeltas[p.botPersonaId] !== undefined)))
              ? (allEloDeltas[p.id] ?? (p.botPersonaId ? allEloDeltas[p.botPersonaId] : undefined))
              : (p.id === myPlayerId ? eloDelta : undefined);

            return (
              <Card
                key={p.id}
                variant={isWinner ? 'active' : 'card'}
                className="p-2.5 sm:p-3 flex flex-col gap-2"
              >
                {/* Hàng 1: Thông tin người chơi & Tiền thưởng / Elo kết quả */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{p.avatar}</span>
                    <div className="text-left">
                      <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">{p.name}</div>
                      <span className="text-[10px] font-semibold text-[var(--color-gold)]">{rankLabel}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end justify-center">
                    {!isCampaign && (
                      <div className="flex items-center gap-2">
                        {pEloDelta !== undefined && (
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            pEloDelta > 0 
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                              : pEloDelta < 0 
                                ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' 
                                : 'text-zinc-400 bg-zinc-500/10'
                          }`}>
                            {pEloDelta > 0 ? `+${pEloDelta}` : pEloDelta} Elo
                          </span>
                        )}
                        {netPay !== undefined && (
                          <div className={`font-bold text-xs sm:text-sm ${netPay > 0 ? 'text-[var(--color-gold)]' : netPay < 0 ? 'text-[#f87171]' : 'text-[var(--text-muted)]'}`}>
                            {netPay > 0 ? `+${netPay.toLocaleString()}` : netPay < 0 ? `${netPay.toLocaleString()}` : '0'} 🪙
                          </div>
                        )}
                      </div>
                    )}
                    {isCampaign && (
                      <div className={`text-xs font-bold ${isWinner ? 'text-[var(--color-gold)]' : 'text-[var(--text-muted)]'}`}>
                        {isWinner ? 'Thắng Trận' : `Còn ${remainingCards.length} lá`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hàng 2: Hiển thị bộ bài tàn cuộc thu nhỏ (Endgame Cards Reveal) */}
                <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-1.5">
                  {remainingCards.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-zinc-400 font-medium mr-0.5">
                        Còn {remainingCards.length} lá:
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {remainingCards.map((c) => (
                          <MiniCardView key={c.id} card={c} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      👑 Đã xả hết sạch bài
                    </span>
                  )}

                  {/* Huy hiệu cảnh báo đặc biệt / Tới Trắng */}
                  <div className="flex items-center gap-1">
                    {isWinner && instantWinType && (
                      <span className="text-[9px] font-bold text-[var(--color-gold)] bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] px-1.5 py-0.5 rounded animate-pulse">
                        ⚡ Tới Trắng ({INSTANT_WIN_TITLES[instantWinType] || instantWinType})
                      </span>
                    )}
                    {!isWinner && instantWinType && (
                      <span className="text-[9px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 rounded">
                        💥 Đền Tới Trắng (26 lá)
                      </span>
                    )}
                    {hasRottenTwo && (
                      <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 rounded animate-pulse">
                        ⚠️ Thối Heo
                      </span>
                    )}
                    {isCong && (
                      <span className="text-[9px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 rounded animate-pulse">
                        🚨 Bị Cóng (13 lá)
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* NÚT XUẤT JSON LOG TRẬN ĐẤU & TRẠNG THÁI SAO LƯU ĐÁM MÂY */}
        <div className="flex items-center justify-between pt-1">
          {githubToken && autoBackupOnMatchEnd ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
              <Cloud className="w-3.5 h-3.5 shrink-0" />
              <span>Tự động sao lưu (Mỗi 5 ván)</span>
            </span>
          ) : (
            <div />
          )}

          {matchReport && (
            <Button
              variant="surface"
              size="sm"
              onClick={handleExportJson}
              leftIcon={<Download className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
              className="text-xs"
            >
              Lưu Phân Tích
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
