import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../../../engine/types';
import { 
  Home, 
  RotateCcw, 
  Map, 
  Swords, 
  Play, 
  Sparkles,
  Download,
  Cloud
} from 'lucide-react';
import { getRankTierByElo } from '../../../engine/elo';
import { CampaignChapter } from '../../../engine/campaign';
import { ActiveGameType } from '../../../stores/useGameStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { clearActiveMatchSession } from '../../../engine/storage';
import { MatchLogger } from '../../../engine/match-logger';
import { Button } from '../../primitives';
import { MiniCardView } from '../../components/CardView';

export interface MobileVictoryViewProps {
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
  allEloDeltas?: Record<string, number>;
}

export const INSTANT_WIN_TITLES: Record<string, string> = {
  DRAGON_STRAIGHT: 'Sảnh Rồng',
  FOUR_TWOS: 'Tứ Quý Heo',
  SAME_COLOR_13: 'Đồng Màu 13 Lá',
  FIVE_PAIRS_SEQUENTIAL: '5 Đôi Thông',
  SIX_PAIRS: '6 Đôi Bất Kỳ',
  FIRST_ROUND_FOUR_THREES: 'Tứ Quý 3 Ván Đầu'
};

export const MobileVictoryView: React.FC<MobileVictoryViewProps> = ({
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
  const isHumanWinner = winners.length > 0 && winners[0].id === 'p0';
  const isCampaign = activeGameType === 'CAMPAIGN';

  useEffect(() => {
    if (isOpen) {
      clearActiveMatchSession();

      if (isHumanWinner || instantWinType) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.55 }
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

  let viewTitle = isHumanWinner ? 'CHIẾN THẮNG TRẬN ĐẤU!' : 'KẾT THÚC VÁN ĐẤU';
  let viewSubtitle = 'Ván đấu đã kết thúc!';
  let viewIcon = '🏆';
  let primaryBtnText = 'Ván Mới';
  let primaryBtnIcon = <Play className="w-4 h-4 text-black fill-current" />;
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
    viewIcon = isHumanWinner ? '⭐' : '💀';
    statBox2Title = 'CHƯƠNG CHIẾN DỊCH';
    statBox2Value = campaignChapter ? `${campaignChapter.name}: ${campaignChapter.subtitle}` : 'Chiến Dịch';
    statBox2Sub = isHumanWinner 
      ? `Đã thắng ${chapterWins}/${campaignChapter?.requiredWins || 1} ván` 
      : 'Thử lại để hoàn thành chương';

    if (isHumanWinner) {
      if (isChapterUnlockedNext && nextChapter) {
        viewTitle = 'HOÀN THÀNH CHƯƠNG!';
        viewSubtitle = `Xuất sắc! Bạn đã mở khóa ${nextChapter.name}!`;
        primaryBtnText = 'Chương Tiếp Theo';
        primaryBtnIcon = <Swords className="w-4 h-4 text-black" />;
        secondaryBtnText = 'Bản Đồ';
        secondaryBtnIcon = <Map className="w-4 h-4" />;
        secondaryBtnAction = onOpenCampaignMap || onReturnToLobby;
      } else if (isAllCampaignCompleted) {
        viewTitle = 'VÔ ĐỊCH TOÀN BỘ CHIẾN DỊCH!';
        viewSubtitle = 'Chúc mừng bạn đã chinh phục toàn bộ 5 chương Chiến Dịch!';
        primaryBtnText = 'Về Sảnh';
        primaryBtnIcon = <Home className="w-4 h-4 text-black" />;
      } else {
        viewTitle = 'CHIẾN THẮNG TRẬN ĐẤU!';
        viewSubtitle = `Tiến độ chương: ${chapterWins}/${campaignChapter?.requiredWins || 1} ván thắng`;
        primaryBtnText = 'Đánh Tiếp';
      }
    } else {
      viewTitle = 'THUA TRẬN CHIẾN DỊCH';
      viewSubtitle = 'Hãy điều chỉnh chiến thuật và thử thách lại!';
      primaryBtnText = 'Thử Thách Lại';
      primaryBtnIcon = <RotateCcw className="w-4 h-4 text-black" />;
      secondaryBtnText = 'Bản Đồ';
      secondaryBtnIcon = <Map className="w-4 h-4" />;
      secondaryBtnAction = onOpenCampaignMap || onReturnToLobby;
    }
  } else if (isTableDismissed) {
    viewIcon = '🚨';
    if (isHumanBankrupt) {
      viewTitle = 'BẠN ĐÃ CHÁY TÚI!';
      viewSubtitle = 'Số dư không đủ tiền cược tiếp. Về sảnh để nhận cứu trợ!';
    } else {
      viewTitle = 'SỚI BẠC GIẢI TÁN!';
      viewSubtitle = `Đối thủ ${bankruptBots.map(b => b.name).join(', ')} đã cháy túi!`;
    }
    const rankTier = getRankTierByElo(playerElo);
    const eloDeltaText = eloDelta > 0 ? `+${eloDelta}` : `${eloDelta}`;
    statBox2Title = 'BẬC RANK & ELO';
    statBox2Value = `${rankTier.badge} ${rankTier.name} (${eloDeltaText})`;
    statBox2Sub = `Tổng điểm: ${playerElo} Elo • Cược ${betAmount.toLocaleString()} Xu`;
  } else {
    const rankTier = getRankTierByElo(playerElo);
    const eloDeltaText = eloDelta > 0 ? `+${eloDelta}` : `${eloDelta}`;
    viewIcon = isHumanWinner ? '🏆' : (eloDelta < 0 ? '📉' : '💥');
    viewTitle = isHumanWinner ? 'CHIẾN THẮNG TRẬN ĐẤU!' : 'KẾT THÚC VÁN ĐẤU';
    viewSubtitle = `Bậc Rank: ${rankTier.badge} ${rankTier.name} (${playerElo} Elo)`;

    statBox2Title = 'BẬC RANK & ELO';
    statBox2Value = `${rankTier.badge} ${rankTier.name} (${eloDeltaText})`;
    statBox2Sub = `Tổng điểm: ${playerElo} Elo • Cược ${betAmount.toLocaleString()} Xu`;
  }

  // TỚI TRẮNG
  if (instantWinType && !isTableDismissed) {
    viewIcon = '⚡';
    const instantWinName = INSTANT_WIN_TITLES[instantWinType] || instantWinType;
    if (isHumanWinner) {
      viewTitle = 'TỚI TRẮNG HOÀNG GIA!';
      viewSubtitle = `Thắng tuyệt đỉnh bằng: ${instantWinName}! Thưởng khủng cả làng!`;
    } else {
      viewTitle = `${winner.name.toUpperCase()} TỚI TRẮNG!`;
      viewSubtitle = `Đấu thủ ${winner.name} đã tới trắng ngay lượt chia đầu: ${instantWinType}!`;
    }
  }

  // VỀ 3 BÍCH HOÀNG GIA
  if (isThreeSpadesWin && !isTableDismissed) {
    viewIcon = '♠️';
    if (isHumanWinner) {
      viewTitle = 'VỀ 3 BÍCH HOÀNG GIA - THẮNG X2';
      viewSubtitle = 'Bạn đã kết liễu bằng lá đơn 3♠ và nhân đôi toàn bộ tiền thắng!';
    } else {
      viewTitle = `${winner.name.toUpperCase()} VỀ 3 BÍCH`;
      viewSubtitle = `Đấu thủ ${winner.name} đã kết liễu bằng 3♠ và nhận x2 tiền thắng!`;
    }
  }

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
            🪙 {betAmount.toLocaleString()} Xu/lá
          </span>
        </div>
      </header>

      {/* 2. BODY NỘI DUNG CUỘN CẢM ỨNG NATIVE */}
      <main className="flex-1 overflow-y-auto pt-2.5 pb-4 px-3 sm:px-4 space-y-2.5 custom-scrollbar bg-[#070b13]">
        <div className="max-w-2xl mx-auto space-y-2.5">
          
          {/* BANNER GIẢI TÁN SỚI BẠC KHI CÓ NGƯỜI KHÔNG ĐỦ TIỀN */}
          {isTableDismissed && (
            <div className="p-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center gap-2 text-center shadow">
              <span className="text-rose-300 font-bold text-xs">
                {isHumanBankrupt
                  ? '💸 Số dư của bạn không đủ mức cược cho ván tiếp theo! Bàn chơi giải tán, vui lòng quay về sảnh.'
                  : `🚨 Đối thủ ${bankruptBots.map(b => b.name).join(', ')} không đủ tiền cược cho ván tiếp theo! Bàn chơi giải tán, vui lòng về sảnh để tìm trận mới.`
                }
              </span>
            </div>
          )}

          {/* BANNER 3 BÍCH HOÀNG GIA */}
          {isThreeSpadesWin && (
            <div className="p-2 rounded-2xl bg-[#1e1708] border border-amber-400/60 flex items-center justify-center gap-2 text-center shadow">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                ⚡ Luật Về 3 Bích Kích Hoạt: Thưởng x2 Tiền Cả Làng!
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
                  (Đã trừ {loanDeduction.toLocaleString()} Xu trả nợ)
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
                : (p.id === 'p0' ? eloDelta : undefined);

              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-2xl border flex flex-col gap-1.5 shadow transition-all ${
                    isWinner
                      ? 'bg-[#1e1708] border-amber-400/70 shadow-amber-500/15'
                      : p.id === 'p0'
                        ? 'bg-[#121826] border-amber-500/40'
                        : 'bg-[#0e1422] border-[#222c3d]'
                  }`}
                >
                  {/* Hàng 1: Avatar, Tên, Thứ Hạng, Biến Động Elo & Tiền Cược */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <span className="text-xl sm:text-2xl">{p.avatar}</span>
                        {p.id === 'p0' && (
                          <span className="absolute -bottom-1 -right-1 text-[7px] bg-amber-500 text-black font-black px-1 rounded-full shadow">
                            BẠN
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
                          {isWinner ? 'Thắng Trận' : `Còn ${remainingCards.length} lá`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hàng 2: Bộ bài tàn cuộc thu nhỏ (MiniCardView) */}
                  <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-1.5">
                    {remainingCards.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] text-zinc-400 font-medium mr-0.5">
                          Còn {remainingCards.length} lá:
                        </span>
                        <div className="flex items-center gap-0.5 flex-wrap">
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

                    {/* Huy hiệu cảnh báo đặc biệt */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isWinner && instantWinType && (
                        <span className="text-[8px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded-lg animate-pulse">
                          ⚡ Tới Trắng
                        </span>
                      )}
                      {!isWinner && instantWinType && (
                        <span className="text-[8px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 rounded-lg">
                          💥 Đền Tới Trắng
                        </span>
                      )}
                      {hasRottenTwo && (
                        <span className="text-[8px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 rounded-lg animate-pulse">
                          ⚠️ Thối Heo
                        </span>
                      )}
                      {isCong && (
                        <span className="text-[8px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 rounded-lg animate-pulse">
                          🚨 Bị Cóng (13 lá)
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
                <span>Tự động sao lưu (Mỗi 5 ván)</span>
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
                <span>Lưu Phân Tích (.json)</span>
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
                onClick={onReturnToLobby}
                leftIcon={<Home className="w-4 h-4 text-black" />}
                className="w-full sm:w-auto px-8 font-black text-xs sm:text-sm"
              >
                Về Sảnh
              </Button>
            </div>
          ) : (
            <>
              {/* Nút Về Sảnh */}
              <Button
                variant="surface"
                size="md"
                onClick={onReturnToLobby}
                leftIcon={<Home className="w-4 h-4 text-amber-400" />}
                className="flex-1 font-bold text-xs sm:text-sm"
              >
                Về Sảnh
              </Button>

              {/* Nút Phụ Chiến Dịch (Nếu có) */}
              {secondaryBtnText !== 'Về Sảnh' && (
                <Button
                  variant="surface"
                  size="md"
                  onClick={secondaryBtnAction}
                  leftIcon={secondaryBtnIcon}
                  className="flex-1 font-bold text-xs sm:text-sm"
                >
                  {secondaryBtnText}
                </Button>
              )}

              {/* Nút Chính (Ván Mới / Đánh Tiếp / Thử Thách Lại) */}
              <Button
                variant="gold"
                size="md"
                onClick={onNextGame}
                leftIcon={primaryBtnIcon}
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
