import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../../engine/types';
import { Trophy, RefreshCw, Home, TrendingUp, AlertCircle, RotateCcw, Map, Swords, Crown, Play, Coins, DollarSign, Sparkles } from 'lucide-react';
import { getRankTierByElo } from '../../engine/elo';
import { CampaignChapter } from '../../engine/campaign';
import { ActiveGameType } from '../../stores/useGameStore';
import { clearActiveMatchSession } from '../../engine/storage';

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
  const isTraditional = activeGameType === 'TRADITIONAL';

  useEffect(() => {
    if (isOpen) {
      // Ngay khi Modal kết thúc hiện lên, lập tức dọn sạch Active Match Session trong LocalStorage
      // để nếu người chơi F5 / đóng tab / tắt trình duyệt sẽ KHÔNG bao giờ bị phạt oan!
      clearActiveMatchSession();

      // Chỉ bắn pháo hoa khi người chơi thắng hoặc tới trắng hoặc không phải chế độ thua
      if (isHumanWinner || instantWinType) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f9b208', '#c01e2e', '#ffdf00', '#2d6a4f', '#ffffff']
        });
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#f9b208', '#c01e2e', '#ffdf00']
          });
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#f9b208', '#c01e2e', '#ffdf00']
          });
        }, 300);
      }
    }
  }, [isOpen, isHumanWinner, instantWinType]);

  // Danh sách hiển thị đầy đủ người chơi (bao gồm cả chế độ Đếm lá / Sòng bạc ngầm 1 người về Nhất là dừng)
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

  // ==========================================================================
  // POST-MATCH MODAL STRATEGY RESOLUTION
  // ==========================================================================
  let modalTitle = 'KẾT THÚC VÁN BÀI!';
  let modalSubtitle = `Chúc mừng ${winner.name} đã giành chiến thắng!`;
  let modalIcon = '🏆';
  let isDefeatModal = !isHumanWinner;
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
      isDefeatModal = true;
      modalIcon = '⚔️';
      modalTitle = 'ẢI CHƯA HOÀN THÀNH!';
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
      isDefeatModal = false;
      if (isChapterUnlockedNext) {
        modalIcon = '👑';
        modalTitle = '🎉 MỞ KHÓA ẢI MỚI!';
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
        modalTitle = '👑 ĐỈNH CAO THẦN BÀI!';
        modalSubtitle = `Tuyệt đỉnh! Bạn đã đánh bại toàn bộ các Siêu Thần Bài và hoàn thành trọn vẹn 5 Chương Chiến Dịch!`;
        statBox1Title = 'Thưởng Hoàn Thành';
        statBox1Value = `+${(campaignChapter?.rewardCoins || 0).toLocaleString()} 🪙`;
        statBox2Title = 'Danh Hiệu';
        statBox2Value = 'Thần Bài Tối Thượng';
        primaryBtnText = 'Chơi Lại Ải 5';
        primaryBtnIcon = <RotateCcw className="w-4 h-4" />;
      } else {
        modalIcon = '🏆';
        modalTitle = 'CHIẾN THẮNG TRẬN ĐẤU!';
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
      isDefeatModal = false;
      modalIcon = '🏆';
      modalTitle = '🥇 CHIẾN THẮNG ĐẤU HẠNG!';
      modalSubtitle = 'Chúc mừng bạn đã xuất sắc về Nhất trên đấu trường Xếp Hạng!';
      primaryBtnText = 'Tìm Trận Mới';
      primaryBtnIcon = <TrendingUp className="w-4 h-4" />;
    } else {
      isDefeatModal = false; // Không dùng tone đỏ ảm đạm cho rank
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
      isDefeatModal = false;
      modalIcon = '💎';
      modalTitle = '🎰 ĐẠI THẮNG SÒNG BẠC NGẦM!';
      modalSubtitle = 'Bạn đã đại thắng tại sới bạc ngầm với tỷ lệ sát phạt nhân đôi!';
      statBox1Title = 'Tiền Thắng Sát Phạt';
      statBox1Value = `+${humanPayout.toLocaleString()} 🪙`;
      statBox1Sub = loanDeduction > 0 ? `Đã trích ${loanDeduction.toLocaleString()} xu trả nợ` : 'Đã cộng vào tài khoản';
      statBox2Title = 'Mức Cược Bàn';
      statBox2Value = `${betAmount.toLocaleString()} 🪙 (x2)`;
      primaryBtnText = 'Tiếp Tục Sát Phạt';
      primaryBtnIcon = <Play className="w-4 h-4 fill-current" />;
    } else {
      isDefeatModal = true;
      modalIcon = '⚠️';
      modalTitle = '💥 THUA BÀN THẾ GIỚI NGẦM!';
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
      isDefeatModal = false;
      modalIcon = '💰';
      modalTitle = '🥇 VỀ NHẤT GOM TIỀN ĐẾM LÁ!';
      modalSubtitle = 'Bạn đã về Nhất và gom trọn tiền phạt đếm lá của tất cả đối thủ!';
      statBox1Title = 'Tổng Tiền Gom Được';
      statBox1Value = `+${humanPayout.toLocaleString()} 🪙`;
      statBox2Title = 'Mức Phạt Đếm Lá';
      statBox2Value = `${betAmount.toLocaleString()} 🪙 / lá`;
      primaryBtnText = 'Ván Tiếp Theo';
      primaryBtnIcon = <RefreshCw className="w-4 h-4" />;
    } else {
      isDefeatModal = true;
      modalIcon = '💥';
      modalTitle = 'THUA ĐẾM LÁ!';
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
      isDefeatModal = false;
      modalIcon = '👑';
      modalTitle = '👑 GOM TRỌN SÒNG BÀI!';
      modalSubtitle = 'Chúc mừng bạn đã về Nhất và ẵm trọn toàn bộ tiền cược của cả bàn!';
      statBox1Title = 'Tiền Thắng Gom Trọn';
      statBox1Value = `+${humanPayout.toLocaleString()} 🪙`;
      statBox2Title = 'Mức Cược Bàn';
      statBox2Value = `${betAmount.toLocaleString()} 🪙`;
      primaryBtnText = 'Đánh Tiếp';
      primaryBtnIcon = <Play className="w-4 h-4 fill-current" />;
    } else {
      isDefeatModal = true;
      modalIcon = '💥';
      modalTitle = 'THUA TRẬN ĂN TẤT CẢ!';
      modalSubtitle = `Đấu thủ ${winner.name} đã về Nhất và gom trọn toàn bộ tiền cược!`;
      statBox1Title = 'Tiền Cược Mất';
      statBox1Value = `${humanPayout.toLocaleString()} 🪙`;
      statBox2Title = 'Mức Cược Bàn';
      statBox2Value = `${betAmount.toLocaleString()} 🪙`;
      primaryBtnText = 'Đánh Tiếp';
      primaryBtnIcon = <RefreshCw className="w-4 h-4" />;
    }
  }
  // 6. TRUYỀN THỐNG / CUSTOM GAME (TRADITIONAL)
  else {
    if (onOpenCustomGameModal) {
      secondaryBtnText = 'Tùy Chỉnh Bàn';
      secondaryBtnIcon = <Swords className="w-4 h-4" />;
      secondaryBtnAction = onOpenCustomGameModal;
    }

    if (instantWinType) {
      modalTitle = 'TỚI TRẮNG ĐẶC BIỆT!';
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

  // 7. XỬ LÝ ĐẶC BIỆT KHI VỀ 3 BÍCH HOÀNG GIA (3♠ LAST CARD WIN)
  if (isThreeSpadesWin) {
    modalIcon = '👑';
    if (isHumanWinner) {
      modalTitle = '👑 VỀ 3 BÍCH HOÀNG GIA - THẮNG X2!';
      modalSubtitle = 'Tuyệt đỉnh thần bài! Bạn đã kết liễu ván đấu bằng lá đơn 3♠ và nhân đôi toàn bộ tiền thắng!';
    } else {
      modalTitle = `👑 ${winner.name.toUpperCase()} VỀ 3 BÍCH!`;
      modalSubtitle = `Đấu thủ ${winner.name} đã kết liễu bằng lá đơn 3♠ và nhận gấp đôi toàn bộ tiền thắng cả làng!`;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className={`relative w-full max-w-lg bg-[#121724] border ${isDefeatModal ? 'border-red-500/50' : 'border-[#d4af37]/40'} rounded-2xl p-5 sm:p-6 shadow-2xl text-white text-center`}>
        {/* Biểu tượng cúp / khiên / vương miện */}
        <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${
          isDefeatModal
            ? 'bg-[#1e2533] border border-red-500/40 text-red-300'
            : 'bg-gradient-to-tr from-[#d4af37] via-[#f3e5ab] to-[#aa8620] border border-white/30 text-[#0a0d14] shadow-[#d4af37]/30'
        } text-3xl sm:text-4xl shadow-lg mb-3 animate-bounce`}>
          {modalIcon}
        </div>

        <h2 className={`text-xl sm:text-2xl font-black ${isDefeatModal ? 'text-red-400' : 'text-[#f3e5ab]'} tracking-wide`}>
          {modalTitle}
        </h2>

        <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1 mb-4">
          {modalSubtitle}
        </p>

        {/* BANNER HIỆU ỨNG VỀ 3 BÍCH HOÀNG GIA */}
        {isThreeSpadesWin && (
          <div className="mb-4 p-2.5 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-400/60 shadow-lg flex items-center justify-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-xs font-black text-yellow-200 uppercase tracking-wider">
              ⚡ Luật Về 3 Bích Kích Hoạt: Thưởng x2 Tiền Cả Làng!
            </span>
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
        )}

        {/* THỐNG KÊ BIẾN ĐỘNG TIỀN & TIẾN ĐỘ / ELO CHUYÊN BIỆT */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
          {/* Ô 1: Tiền cược / Thưởng */}
          <div className="p-3 rounded-2xl bg-black/60 border border-yellow-500/30">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">
              {statBox1Title}
            </span>
            <div className={`text-sm sm:text-base font-black mt-0.5 ${humanPayout > 0 ? 'text-emerald-400' : humanPayout === 0 ? 'text-yellow-300' : 'text-red-400'}`}>
              {statBox1Value}
            </div>
            {statBox1Sub && (
              <span className="text-[10px] text-amber-300/90 font-bold block mt-0.5">
                ({statBox1Sub})
              </span>
            )}
            {loanDeduction > 0 && !isUnderground && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                (Đã trừ {loanDeduction.toLocaleString()} xu trả nợ)
              </span>
            )}
          </div>

          {/* Ô 2: Tiến độ / Elo / Thông tin bàn */}
          <div className={`p-3 rounded-2xl bg-black/60 border ${isCampaign ? 'border-purple-500/40' : isRanked ? 'border-blue-500/40' : 'border-yellow-500/30'}`}>
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">
              {statBox2Title}
            </span>
            <div className="text-xs sm:text-sm font-black text-blue-200 mt-0.5">
              {statBox2Value}
            </div>
            {statBox2Sub && (
              <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
                {statBox2Sub}
              </span>
            )}
          </div>
        </div>

        {/* Bảng Xếp Hạng Người Chơi */}
        <div className="space-y-2 mb-5 max-h-48 overflow-y-auto pr-1">
          {displayPlayers.map((p, idx) => {
            const isWinner = idx === 0;
            const rankLabel = isWinner
              ? '🥇 VỀ NHẤT'
              : winners.length >= allPlayers.length - 1
                ? (idx === 1 ? '🥈 VỀ NHÌ' : idx === 2 ? '🥉 VỀ BA' : '💥 VỀ BÉT')
                : '💥 THUA ĐẾM LÁ';
            const netPay = payouts ? payouts[p.id] : undefined;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border ${
                  isWinner
                    ? 'bg-gradient-to-r from-amber-950 to-yellow-950/80 border-yellow-400 text-yellow-100 shadow-md ring-1 ring-yellow-400'
                    : 'bg-black/40 border-yellow-500/20 text-yellow-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{p.avatar}</span>
                  <div className="text-left">
                    <div className="font-extrabold text-xs sm:text-sm text-yellow-300">{p.name}</div>
                    <span className="text-[10px] font-bold text-amber-400/90">{rankLabel}</span>
                  </div>
                </div>

                <div className="text-right">
                  {!isCampaign && !isRanked && netPay !== undefined && (
                    <div className={`font-black text-xs sm:text-sm ${netPay > 0 ? 'text-emerald-400' : netPay < 0 ? 'text-red-400' : 'text-neutral-400'}`}>
                      {netPay > 0 ? `+${netPay.toLocaleString()}` : netPay < 0 ? `${netPay.toLocaleString()}` : '0'} 🪙
                    </div>
                  )}
                  {isRanked && (
                    <div className="text-[10px] font-bold text-blue-300">
                      Hạng {idx + 1}
                    </div>
                  )}
                  {isCampaign && (
                    <div className={`text-xs font-bold ${isWinner ? 'text-yellow-300' : 'text-neutral-400'}`}>
                      {isWinner ? 'Thắng Ải' : `Còn ${p.hand?.length || 0} lá`}
                    </div>
                  )}
                  {!isCampaign && p.hand && p.hand.length > 0 && (
                    <div className="text-[10px] font-bold text-red-400/80">
                      Còn {p.hand.length} lá
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CÁC NÚT ĐIỀU HƯỚNG CHUYÊN BIỆT */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Nút Luôn Có: Về Sảnh */}
          <button
            onClick={onReturnToLobby}
            className="flex-1 py-3 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-600 hover:border-yellow-400 text-neutral-300 hover:text-yellow-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer shadow-md"
            title="Trở về sảnh chính"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>Về Sảnh</span>
          </button>

          {/* Nút Phụ (Nếu có hành động chuyên biệt như Bản Đồ Ải / Vay Nợ) */}
          {secondaryBtnText !== 'Về Sảnh' && (
            <button
              onClick={secondaryBtnAction}
              className="flex-1 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-yellow-500/40 text-yellow-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
            >
              {secondaryBtnIcon}
              <span>{secondaryBtnText}</span>
            </button>
          )}

          {/* Nút Chính: Đánh Ván Mới / Chơi Tiếp */}
          <button
            onClick={onNextGame}
            className={`flex-[2] py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
              isDefeatModal
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-red-950 shadow-orange-500/40 border border-orange-200'
                : isUnderground
                  ? 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-amber-950 shadow-yellow-500/40 border border-yellow-200'
                  : isRanked
                    ? 'bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 text-blue-950 shadow-cyan-500/40 border border-cyan-200'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-red-950 shadow-yellow-500/40 border border-yellow-200'
            }`}
          >
            {primaryBtnIcon}
            <span>{primaryBtnText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
