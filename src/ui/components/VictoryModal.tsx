import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../../engine/types';
import { Trophy, RefreshCw, Home, TrendingUp, AlertCircle, RotateCcw, Map, Swords, Play, Sparkles } from 'lucide-react';
import { getRankTierByElo } from '../../engine/elo';
import { CampaignChapter } from '../../engine/campaign';
import { ActiveGameType } from '../../stores/useGameStore';
import { clearActiveMatchSession } from '../../engine/storage';
import { Modal, Card, Badge, Button } from '../primitives';

interface VictoryModalProps {
  isOpen: boolean;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onOpenCampaignMap?: () => void;
  onOpenCustomGameModal?: () => void;
  onOpenBankLoanModal?: () => void;
  winners: Player[];
  allPlayers: Player[];
  betAmount: number;
  instantWinType?: string;
  isThreeSpadesWin?: boolean;
  payouts?: Record<string, number>;
  loanDeduction?: number;
  eloDelta?: number;
  playerElo?: number;
  activeGameType?: ActiveGameType;
  campaignChapter?: CampaignChapter | null;
  chapterWins?: number;
  isChapterUnlockedNext?: boolean;
  isAllCampaignCompleted?: boolean;
  nextChapter?: CampaignChapter | null;
  playerCoins?: number;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onNextGame,
  onReturnToLobby,
  onOpenCampaignMap,
  onOpenCustomGameModal,
  onOpenBankLoanModal,
  winners,
  allPlayers,
  betAmount,
  instantWinType,
  isThreeSpadesWin = false,
  payouts,
  loanDeduction = 0,
  eloDelta = 0,
  playerElo = 1000,
  activeGameType = 'TRADITIONAL',
  campaignChapter,
  chapterWins = 0,
  isChapterUnlockedNext = false,
  isAllCampaignCompleted = false,
  nextChapter,
  playerCoins = 0
}) => {
  const isHumanWinner = winners.length > 0 && winners[0].id === 'p0';
  const isRanked = activeGameType === 'RANKED';
  const isCampaign = activeGameType === 'CAMPAIGN';
  const isUnderground = activeGameType === 'UNDERGROUND';
  const isCountCards = activeGameType === 'COUNT_CARDS';
  const isWinnerTakesAll = activeGameType === 'WINNER_TAKES_ALL';

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

  const displayPlayers = React.useMemo(() => {
    if (winners.length >= allPlayers.length) {
      return winners;
    }
    const winnerIds = new Set(winners.map(w => w.id));
    const nonWinners = allPlayers.filter(p => !winnerIds.has(p.id));
    nonWinners.sort((a, b) => a.hand.length - b.hand.length);
    return [...winners, ...nonWinners];
  }, [winners, allPlayers]);

  if (!isOpen) return null;

  const winner = winners[0] || allPlayers[0];
  const humanPayout = payouts ? (payouts['p0'] || 0) : 0;
  const currentRank = getRankTierByElo(playerElo);

  let modalTitle = 'KẾT THÚC VÁN BÀI';
  let modalSubtitle = `Chúc mừng ${winner.name} đã giành chiến thắng!`;
  let modalIcon = '🏆';
  let statBox1Title = 'Biến Động Tiền';
  let statBox1Value = `${humanPayout >= 0 ? `+${humanPayout.toLocaleString()}` : humanPayout.toLocaleString()} 🪙`;
  let statBox1Sub = '';
  let statBox2Title = 'Thông Tin Bàn';
  let statBox2Value = `${betAmount.toLocaleString()} 🪙`;
  let statBox2Sub = '';
  let primaryBtnText = 'Đánh Ván Mới';
  let primaryBtnIcon = <RefreshCw className="w-4 h-4" />;
  let secondaryBtnText = 'Về Sảnh';
  let secondaryBtnIcon = <Home className="w-4 h-4" />;
  let secondaryBtnAction = onReturnToLobby;

  // 1. CHIẾN DỊCH (CAMPAIGN)
  if (isCampaign) {
    secondaryBtnText = 'Bản Đồ Ải';
    secondaryBtnIcon = <Map className="w-4 h-4" />;
    secondaryBtnAction = onOpenCampaignMap || onReturnToLobby;

    if (!isHumanWinner) {
      modalIcon = '⚔️';
      modalTitle = 'ẢI CHƯA HOÀN THÀNH';
      modalSubtitle = `Bot ${winner.name} đã về Nhất! Hãy cải thiện chiến thuật và thử lại để vượt qua ải này.`;
      statBox1Title = 'Tiền Thưởng / Cược';
      statBox1Value = '0 🪙 (Miễn Phí)';
      statBox1Sub = 'Không mất cược khi thua ải';
      statBox2Title = 'Tiến Độ Vượt Ải';
      statBox2Value = `${chapterWins}/${campaignChapter?.requiredWins || 1} Ván Thắng`;
      statBox2Sub = 'Cần về Nhất để ghi điểm qua ải';
      primaryBtnText = 'Chơi Lại';
      primaryBtnIcon = <RotateCcw className="w-4 h-4" />;
    } else {
      if (isChapterUnlockedNext) {
        modalIcon = '👑';
        modalTitle = 'MỞ KHÓA ẢI MỚI';
        modalSubtitle = `Xuất sắc! Bạn đã hoàn thành ${campaignChapter?.name || 'ải'} và mở khóa ${nextChapter?.name || 'Ải Tiếp Theo'} (${nextChapter?.venueName || ''})!`;
        statBox1Title = 'Thưởng Mở Khóa Ải';
        statBox1Value = `+${(campaignChapter?.rewardCoins || 0).toLocaleString()} 🪙`;
        statBox1Sub = 'Đã cộng vào tài khoản';
        statBox2Title = 'Ải Kế Tiếp';
        statBox2Value = nextChapter?.name || 'Ải Mới';
        statBox2Sub = nextChapter?.venueName || '';
        primaryBtnText = `Chơi Tiếp (${nextChapter?.name || 'Ải Mới'})`;
        primaryBtnIcon = <Play className="w-4 h-4 fill-current" />;
      } else if (isAllCampaignCompleted) {
        modalIcon = '👑';
        modalTitle = 'ĐỈNH CAO THẦN BÀI';
        modalSubtitle = `Tuyệt đỉnh! Bạn đã đánh bại toàn bộ các Siêu Thần Bài và hoàn thành trọn vẹn 5 Chương Chiến Dịch!`;
        statBox1Title = 'Thưởng Hoàn Thành';
        statBox1Value = `+${(campaignChapter?.rewardCoins || 0).toLocaleString()} 🪙`;
        statBox2Title = 'Danh Hiệu';
        statBox2Value = 'Thần Bài Tối Thượng';
        primaryBtnText = 'Chơi Lại Ải 5';
        primaryBtnIcon = <RotateCcw className="w-4 h-4" />;
      } else {
        modalIcon = '🏆';
        modalTitle = 'CHIẾN THẮNG TRẬN ĐẤU';
        modalSubtitle = `Tiến độ ${campaignChapter?.name || 'ải'}: ${chapterWins}/${campaignChapter?.requiredWins || 1} ván thắng để mở khóa ải kế tiếp!`;
        statBox1Title = 'Tiền Thưởng / Cược';
        statBox1Value = '0 🪙 (Miễn Phí)';
        statBox2Title = 'Tiến Độ Vượt Ải';
        statBox2Value = `${chapterWins}/${campaignChapter?.requiredWins || 1} Ván Thắng`;
        primaryBtnText = 'Chơi Tiếp';
        primaryBtnIcon = <Play className="w-4 h-4 fill-current" />;
      }
    }
  }
  // 2. ĐẤU HẠNG ELO (RANKED)
  else if (isRanked) {
    statBox1Title = 'Thưởng Đấu Hạng';
    statBox1Value = humanPayout > 0 ? `+${humanPayout.toLocaleString()} 🪙` : '0 🪙 (Miễn Phí)';
    statBox1Sub = humanPayout > 0 ? 'Thưởng Vàng Về Nhất' : '0 Xu cược khi đấu rank';
    statBox2Title = 'Xếp Hạng & Điểm Elo';
    statBox2Value = `${currentRank.badge} ${playerElo}`;
    statBox2Sub = eloDelta !== 0 ? (eloDelta > 0 ? `+${eloDelta} điểm Elo` : `${eloDelta} điểm Elo`) : 'Không đổi';

    if (isHumanWinner) {
      modalIcon = '🏆';
      modalTitle = 'CHIẾN THẮNG ĐẤU HẠNG';
      modalSubtitle = 'Chúc mừng bạn đã xuất sắc về Nhất trên đấu trường Xếp Hạng!';
      primaryBtnText = 'Tìm Trận Mới';
      primaryBtnIcon = <TrendingUp className="w-4 h-4" />;
    } else {
      modalIcon = '🛡️';
      modalTitle = 'KẾT QUẢ ĐẤU HẠNG ELO';
      modalSubtitle = `Đấu thủ ${winner.name} đã về Nhất. Hãy tiếp tục thi đấu để cải thiện thứ hạng!`;
      primaryBtnText = 'Đấu Tiếp Để Gỡ Rank';
      primaryBtnIcon = <TrendingUp className="w-4 h-4" />;
    }
  }
  // 3. THẾ GIỚI NGẦM (UNDERGROUND)
  else if (isUnderground) {
    secondaryBtnText = 'Về Sảnh';
    secondaryBtnIcon = <Home className="w-4 h-4" />;
    secondaryBtnAction = onReturnToLobby;

    if (isHumanWinner) {
      modalIcon = '💎';
      modalTitle = 'ĐẠI THẮNG SÒNG BẠC NGẦM';
      modalSubtitle = 'Bạn đã đại thắng tại sới bạc ngầm với tỷ lệ sát phạt nhân đôi!';
      statBox1Title = 'Tiền Thắng Sát Phạt';
      statBox1Value = `+${humanPayout.toLocaleString()} 🪙`;
      statBox1Sub = loanDeduction > 0 ? `Đã trích ${loanDeduction.toLocaleString()} xu trả nợ` : 'Đã cộng vào tài khoản';
      statBox2Title = 'Mức Cược Bàn';
      statBox2Value = `${betAmount.toLocaleString()} 🪙 (x2)`;
      primaryBtnText = 'Tiếp Tục Sát Phạt';
      primaryBtnIcon = <Play className="w-4 h-4 fill-current" />;
    } else {
      modalIcon = '⚠️';
      modalTitle = 'THUA BÀN THẾ GIỚI NGẦM';
      modalSubtitle = `Sới bạc ngầm sát phạt khốc liệt! Bạn đã bị trừ ${Math.abs(humanPayout).toLocaleString()} 🪙.`;
      statBox1Title = 'Tiền Thua Sát Phạt';
      statBox1Value = `${humanPayout.toLocaleString()} 🪙`;
      statBox1Sub = 'Tỷ lệ sát phạt nhân đôi';
      statBox2Title = 'Số Dư Tài Khoản';
      statBox2Value = `${playerCoins.toLocaleString()} 🪙`;
      statBox2Sub = playerCoins < betAmount ? 'Nguy cơ phá sản!' : 'Cẩn trọng vốn cược';

      if (playerCoins < betAmount && onOpenBankLoanModal) {
        secondaryBtnText = 'Vay Ngân Hàng Đen';
        secondaryBtnIcon = <AlertCircle className="w-4 h-4 text-red-400" />;
        secondaryBtnAction = onOpenBankLoanModal;
      }
      primaryBtnText = 'Gỡ Gạc Ván Mới';
      primaryBtnIcon = <RotateCcw className="w-4 h-4" />;
    }
  }
  // 4. ĐẾM LÁ (COUNT_CARDS)
  else if (isCountCards) {
    if (isHumanWinner) {
      modalIcon = '💰';
      modalTitle = 'VỀ NHẤT GOM TIỀN ĐẾM LÁ';
      modalSubtitle = 'Bạn đã về Nhất và gom trọn tiền phạt đếm lá của tất cả đối thủ!';
      statBox1Title = 'Tổng Tiền Gom Được';
      statBox1Value = `+${humanPayout.toLocaleString()} 🪙`;
      statBox2Title = 'Mức Phạt Đếm Lá';
      statBox2Value = `${betAmount.toLocaleString()} 🪙 / lá`;
      primaryBtnText = 'Ván Tiếp Theo';
      primaryBtnIcon = <RefreshCw className="w-4 h-4" />;
    } else {
      modalIcon = '💥';
      modalTitle = 'THUA ĐẾM LÁ';
      modalSubtitle = `Đấu thủ ${winner.name} đã về Nhất kết thúc ván bài!`;
      statBox1Title = 'Tiền Phạt Đếm Lá';
      statBox1Value = `${humanPayout.toLocaleString()} 🪙`;
      statBox1Sub = 'Tính theo số lá tồn + thối heo';
      statBox2Title = 'Mức Phạt Đếm Lá';
      statBox2Value = `${betAmount.toLocaleString()} 🪙 / lá`;
      primaryBtnText = 'Ván Tiếp Theo';
      primaryBtnIcon = <RefreshCw className="w-4 h-4" />;
    }
  }
  // 5. ĂN TẤT CẢ (WINNER_TAKES_ALL)
  else if (isWinnerTakesAll) {
    if (isHumanWinner) {
      modalIcon = '👑';
      modalTitle = 'GOM TRỌN SÒNG BÀI';
      modalSubtitle = 'Chúc mừng bạn đã về Nhất và ẵm trọn toàn bộ tiền cược của cả bàn!';
      statBox1Title = 'Tiền Thắng Gom Trọn';
      statBox1Value = `+${humanPayout.toLocaleString()} 🪙`;
      statBox2Title = 'Mức Cược Bàn';
      statBox2Value = `${betAmount.toLocaleString()} 🪙`;
      primaryBtnText = 'Đánh Tiếp';
      primaryBtnIcon = <Play className="w-4 h-4 fill-current" />;
    } else {
      modalIcon = '💥';
      modalTitle = 'THUA TRẬN ĂN TẤT CẢ';
      modalSubtitle = `Đấu thủ ${winner.name} đã về Nhất và gom trọn toàn bộ tiền cược!`;
      statBox1Title = 'Tiền Cược Mất';
      statBox1Value = `${humanPayout.toLocaleString()} 🪙`;
      statBox2Title = 'Mức Cược Bàn';
      statBox2Value = `${betAmount.toLocaleString()} 🪙`;
      primaryBtnText = 'Đánh Tiếp';
      primaryBtnIcon = <RefreshCw className="w-4 h-4" />;
    }
  }
  // 6. TRUYỀN THỐNG / CUSTOM
  else {
    if (onOpenCustomGameModal) {
      secondaryBtnText = 'Tùy Chỉnh Bàn';
      secondaryBtnIcon = <Swords className="w-4 h-4" />;
      secondaryBtnAction = onOpenCustomGameModal;
    }

    if (instantWinType) {
      modalTitle = 'TỚI TRẮNG ĐẶC BIỆT';
      modalSubtitle = `Đấu thủ ${winner.name} đã Tới Trắng (${instantWinType})!`;
    } else {
      modalTitle = 'KẾT QUẢ VÁN BÀI TRUYỀN THỐNG';
    }
    statBox1Title = 'Biến Động Tiền';
    statBox1Value = `${humanPayout >= 0 ? `+${humanPayout.toLocaleString()}` : humanPayout.toLocaleString()} 🪙`;
    statBox2Title = 'Mức Cược Bàn';
    statBox2Value = `${betAmount.toLocaleString()} 🪙`;
    primaryBtnText = 'Đánh Ván Mới';
    primaryBtnIcon = <RefreshCw className="w-4 h-4" />;
  }

  // 7. VỀ 3 BÍCH HOÀNG GIA
  if (isThreeSpadesWin) {
    modalIcon = '👑';
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
      maxWidth="md"
      height="auto"
      footer={
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
      }
    >
      <div className="space-y-3">
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
            {loanDeduction > 0 && !isUnderground && (
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

        {/* Bảng Xếp Hạng Người Chơi */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {displayPlayers.map((p, idx) => {
            const isWinner = idx === 0;
            const rankLabel = isWinner
              ? '🥇 VỀ NHẤT'
              : winners.length >= allPlayers.length - 1
                ? (idx === 1 ? '🥈 VỀ NHÌ' : idx === 2 ? '🥉 VỀ BA' : '💥 VỀ BÉT')
                : '💥 THUA ĐẾM LÁ';
            const netPay = payouts ? payouts[p.id] : undefined;

            return (
              <Card
                key={p.id}
                variant={isWinner ? 'active' : 'card'}
                className="flex items-center justify-between p-2.5 sm:p-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{p.avatar}</span>
                  <div className="text-left">
                    <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">{p.name}</div>
                    <span className="text-[10px] font-semibold text-[var(--color-gold)]">{rankLabel}</span>
                  </div>
                </div>

                <div className="text-right">
                  {!isCampaign && !isRanked && netPay !== undefined && (
                    <div className={`font-bold text-xs sm:text-sm ${netPay > 0 ? 'text-[var(--color-gold)]' : netPay < 0 ? 'text-[#f87171]' : 'text-[var(--text-muted)]'}`}>
                      {netPay > 0 ? `+${netPay.toLocaleString()}` : netPay < 0 ? `${netPay.toLocaleString()}` : '0'} 🪙
                    </div>
                  )}
                  {isRanked && (
                    <div className="text-[10px] font-bold text-[var(--color-gold)]">
                      Hạng {idx + 1}
                    </div>
                  )}
                  {isCampaign && (
                    <div className={`text-xs font-bold ${isWinner ? 'text-[var(--color-gold)]' : 'text-[var(--text-muted)]'}`}>
                      {isWinner ? 'Thắng Ải' : `Còn ${p.hand?.length || 0} lá`}
                    </div>
                  )}
                  {!isCampaign && p.hand && p.hand.length > 0 && (
                    <div className="text-[10px] font-medium text-[#f87171]">
                      Còn {p.hand.length} lá
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
