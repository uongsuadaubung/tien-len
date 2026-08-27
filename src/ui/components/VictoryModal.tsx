import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../../engine/types';
import { 
  Home, 
  RotateCcw, 
  Map, 
  Swords, 
  Play, 
  Sparkles,
  Download
} from 'lucide-react';
import { getRankTierByElo } from '../../engine/elo';
import { CampaignChapter } from '../../engine/campaign';
import { ActiveGameType } from '../../stores/useGameStore';
import { clearActiveMatchSession } from '../../engine/storage';
import { MatchLogger } from '../../engine/match-logger';
import { Modal, Card, Button } from '../primitives';
import { MiniCardView } from './CardView';

interface VictoryModalProps {
  isOpen: boolean;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onOpenCampaignMap: (() => void) | null;
  onOpenCustomGameModal: (() => void) | null;
  onOpenBankLoanModal: (() => void) | null;
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
  botReasoningLogEnabled: boolean;
  allEloDeltas?: Record<string, number>;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onNextGame,
  onReturnToLobby,
  onOpenCampaignMap,
  onOpenCustomGameModal: _onOpenCustomGameModal,
  onOpenBankLoanModal: _onOpenBankLoanModal,
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
  botReasoningLogEnabled: _botReasoningLogEnabled,
  allEloDeltas
}) => {
  const isHumanWinner = winners.length > 0 && winners[0].id === 'p0';
  const isCampaign = activeGameType === 'CAMPAIGN';

  useEffect(() => {
    if (isOpen) {
      clearActiveMatchSession();

      if (isHumanWinner || instantWinType) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }
  }, [isOpen, isHumanWinner, instantWinType]);

  const handleExportJson = () => {
    const jsonStr = MatchLogger.getInstance().exportToJsonString();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tienlen_match_log_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const matchReport = MatchLogger.getInstance().getLatestReport();
  const winner = winners.length > 0 ? winners[0] : allPlayers[0];
  const humanPayout = payouts ? (payouts['p0'] || 0) : 0;

  // Sắp xếp người chơi theo kết quả
  const displayPlayers: Player[] = [...allPlayers].sort((a, b) => {
    const aIdx = winners.findIndex(w => w.id === a.id);
    const bIdx = winners.findIndex(w => w.id === b.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return (a.hand?.length || 0) - (b.hand?.length || 0);
  });

  // Kiểm tra có đối thủ nào cháy túi (vỡ nợ) không đủ tiền cược tiếp
  const bankruptBots = !isCampaign ? allPlayers.filter(p => p.isBot && (p.score || 0) < betAmount) : [];
  const isHumanBankrupt = !isCampaign && playerCoins < betAmount;
  const isTableDismissed = !isCampaign && (bankruptBots.length > 0 || isHumanBankrupt);

  let modalTitle = isHumanWinner ? 'CHIẾN THẮNG TRẬN ĐẤU!' : 'KẾT THÚC VÁN ĐẤU';
  let modalSubtitle = 'Ván đấu đã kết thúc!';
  let modalIcon = '🏆';
  let primaryBtnText = 'Ván Mới';
  let primaryBtnIcon = <Play className="w-4 h-4 text-black" />;
  let secondaryBtnText = 'Về Sảnh';
  let secondaryBtnIcon = <Home className="w-4 h-4" />;
  let secondaryBtnAction = onReturnToLobby;

  const statBox1Title = 'KẾT QUẢ CÁ NHÂN';
  const statBox1Value = humanPayout > 0 ? `+${humanPayout.toLocaleString()} 🪙` : `${humanPayout.toLocaleString()} 🪙`;
  const statBox1Sub = isHumanWinner ? '🥇 Bạn đã về Nhất!' : '💥 Chưa thể giành chiến thắng';

  let statBox2Title = 'CHẾ ĐỘ CHƠI';
  let statBox2Value = 'Truyền Thống';
  let statBox2Sub = `Mức cược: ${betAmount.toLocaleString()} Xu`;

  if (isCampaign) {
    modalIcon = isHumanWinner ? '⭐' : '💀';
    statBox2Title = 'CHƯƠNG CHIẾN DỊCH';
    statBox2Value = campaignChapter ? `${campaignChapter.name}: ${campaignChapter.subtitle}` : 'Chiến Dịch';
    statBox2Sub = isHumanWinner 
      ? `Đã thắng ${chapterWins}/${campaignChapter?.requiredWins || 1} ván` 
      : 'Thử lại để hoàn thành chương';

    if (isHumanWinner) {
      if (isChapterUnlockedNext && nextChapter) {
        modalTitle = 'HOÀN THÀNH CHƯƠNG!';
        modalSubtitle = `Xuất sắc! Bạn đã mở khóa ${nextChapter.name}!`;
        primaryBtnText = 'Chương Tiếp Theo';
        primaryBtnIcon = <Swords className="w-4 h-4 text-black" />;
        secondaryBtnText = 'Bản Đồ Chiến Dịch';
        secondaryBtnIcon = <Map className="w-4 h-4" />;
        secondaryBtnAction = onOpenCampaignMap || onReturnToLobby;
      } else if (isAllCampaignCompleted) {
        modalTitle = 'VÔ ĐỊCH TOÀN BỘ CHIẾN DỊCH!';
        modalSubtitle = 'Chúc mừng bạn đã chinh phục toàn bộ 5 chương Chiến Dịch Đỉnh Cao!';
        primaryBtnText = 'Về Sảnh';
        primaryBtnIcon = <Home className="w-4 h-4 text-black" />;
      } else {
        modalTitle = 'CHIẾN THẮNG TRẬN ĐẤU!';
        modalSubtitle = `Tiến độ chương: ${chapterWins}/${campaignChapter?.requiredWins || 1} ván thắng`;
        primaryBtnText = 'Đánh Tiếp';
      }
    } else {
      modalTitle = 'THUA TRẬN CHIẾN DỊCH';
      modalSubtitle = 'Đối thủ quá mạnh! Hãy điều chỉnh chiến thuật và thử lại!';
      primaryBtnText = 'Thử Thách Lại';
      primaryBtnIcon = <RotateCcw className="w-4 h-4 text-black" />;
      secondaryBtnText = 'Bản Đồ Chiến Dịch';
      secondaryBtnIcon = <Map className="w-4 h-4" />;
      secondaryBtnAction = onOpenCampaignMap || onReturnToLobby;
    }
  } else if (isTableDismissed) {
    // SỚI BẠC GIẢI TÁN KHI CÓ NGƯỜI CHÁY TÚI
    modalIcon = '🚨';
    if (isHumanBankrupt) {
      modalTitle = 'BẠN ĐÃ CHÁY TÚI!';
      modalSubtitle = 'Số dư của bạn không đủ tiền cược tiếp. Hãy về sảnh để nhận cứu trợ hoặc vay vốn!';
    } else {
      modalTitle = 'SỚI BẠC GIẢI TÁN!';
      modalSubtitle = `Đối thủ ${bankruptBots.map(b => b.name).join(', ')} đã cháy túi! Bàn đấu dừng lại.`;
    }
    const rankTier = getRankTierByElo(playerElo);
    const eloDeltaText = eloDelta > 0 ? `+${eloDelta}` : `${eloDelta}`;
    statBox2Title = 'BẬC RANK & ELO';
    statBox2Value = `${rankTier.badge} ${rankTier.name} (${eloDeltaText})`;
    statBox2Sub = `Tổng điểm: ${playerElo} Elo • Cược ${betAmount.toLocaleString()} Xu`;
  } else {
    // Chế độ Chơi Nhanh & Đấu Hạng Tích Hợp (Còn đủ tiền tiếp tục)
    const rankTier = getRankTierByElo(playerElo);
    const eloDeltaText = eloDelta > 0 ? `+${eloDelta}` : `${eloDelta}`;
    modalIcon = isHumanWinner ? '🏆' : (eloDelta < 0 ? '📉' : '💥');
    modalTitle = isHumanWinner ? 'CHIẾN THẮNG TRẬN ĐẤU!' : 'KẾT THÚC VÁN ĐẤU';
    modalSubtitle = `Bậc Rank: ${rankTier.badge} ${rankTier.name} (${playerElo} Elo)`;

    statBox2Title = 'BẬC RANK & ELO';
    statBox2Value = `${rankTier.badge} ${rankTier.name} (${eloDeltaText})`;
    statBox2Sub = `Tổng điểm: ${playerElo} Elo • Cược ${betAmount.toLocaleString()} Xu`;
  }

  // TỚI TRẮNG (INSTANT WIN)
  if (instantWinType && !isTableDismissed) {
    modalIcon = '⚡';
    if (isHumanWinner) {
      modalTitle = 'TỚI TRẮNG HOÀNG GIA!';
      modalSubtitle = `Chúc mừng bạn đã tới trắng bằng bộ bài đặc biệt: ${instantWinType}! Thưởng khủng cả làng!`;
    } else {
      modalTitle = `${winner.name.toUpperCase()} TỚI TRẮNG!`;
      modalSubtitle = `Đấu thủ ${winner.name} đã tới trắng ngay lượt chia đầu: ${instantWinType}!`;
    }
  }

  // VỀ 3 BÍCH HOÀNG GIA
  if (isThreeSpadesWin && !isTableDismissed) {
    modalIcon = '♠️';
    if (isHumanWinner) {
      modalTitle = 'VỀ 3 BÍCH HOÀNG GIA - THẮNG X2';
      modalSubtitle = 'Tuyệt đỉnh thần bài! Bạn đã kết liễu ván đấu bằng lá đơn 3♠ và nhân đôi toàn bộ tiền thắng!';
    } else {
      modalTitle = `${winner.name.toUpperCase()} VỀ 3 BÍCH`;
      modalSubtitle = `Đấu thủ ${winner.name} đã kết liễu bằng lá đơn 3♠ và nhận gấp đôi toàn bộ tiền thắng cả làng!`;
    }
  }

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
              onClick={onReturnToLobby}
              leftIcon={<Home className="w-4 h-4 text-black" />}
              className="w-full sm:w-auto px-8"
            >
              Về Sảnh
            </Button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-2">
            {/* Nút Về Sảnh */}
            <Button
              variant="surface"
              size="md"
              onClick={onReturnToLobby}
              leftIcon={<Home className="w-4 h-4 text-[var(--color-gold)]" />}
            >
              Về Sảnh
            </Button>

            {/* Nút Phụ */}
            {secondaryBtnText !== 'Về Sảnh' && (
              <Button
                variant="surface"
                size="md"
                onClick={secondaryBtnAction}
                leftIcon={secondaryBtnIcon}
              >
                {secondaryBtnText}
              </Button>
            )}

            {/* Nút Chính */}
            <Button
              variant="gold"
              size="md"
              onClick={onNextGame}
              leftIcon={primaryBtnIcon}
            >
              {primaryBtnText}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-3">
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
              ? '🥇 VỀ NHẤT'
              : winners.length >= allPlayers.length - 1
                ? (idx === 1 ? '🥈 VỀ NHÌ' : idx === 2 ? '🥉 VỀ BA' : '💥 VỀ BÉT')
                : '💥 THUA ĐẾM LÁ';
            const netPay = payouts ? payouts[p.id] : undefined;
            const remainingCards = p.hand ? [...p.hand].sort((a, b) => a.weight - b.weight) : [];
            const hasRottenTwo = remainingCards.some(c => c.rank === 15);
            const isCong = remainingCards.length === 13;

            // Biến động Elo của từng người chơi / bot
            const pEloDelta = (allEloDeltas && (allEloDeltas[p.id] !== undefined || (p.botPersonaId && allEloDeltas[p.botPersonaId] !== undefined)))
              ? (allEloDeltas[p.id] ?? (p.botPersonaId ? allEloDeltas[p.botPersonaId] : undefined))
              : (p.id === 'p0' ? eloDelta : undefined);

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

                  {/* Huy hiệu cảnh báo đặc biệt: Thối Heo / Bị Cóng */}
                  <div className="flex items-center gap-1">
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

        {/* NÚT XUẤT JSON LOG TRẬN ĐẤU */}
        {matchReport && (
          <div className="flex justify-end pt-1">
            <Button
              variant="surface"
              size="sm"
              onClick={handleExportJson}
              leftIcon={<Download className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
              className="text-xs"
            >
              Lưu Phân Tích
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
