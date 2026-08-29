import { useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Player, InstantWinType } from '../../engine/types';
import { CampaignChapter } from '../../engine/campaign';
import { clearActiveMatchSession } from '../../engine/storage';
import { MatchLogger } from '../../engine/match-logger';
import { ActiveGameType, useGameStore } from '../../stores/useGameStore';
import { useOnlineStore } from '../../stores/useOnlineStore';
import { useModalStore } from '../../stores/useModalStore';

export type PrimaryBtnIconType = 'PLAY' | 'CHECK' | 'SWORDS' | 'ROTATE_CCW' | 'HOME' | 'BANK' | 'SPINNER';
export type SecondaryBtnIconType = 'HOME' | 'MAP';

export interface UseVictoryLogicProps {
  isOpen: boolean;
  winners: Player[];
  allPlayers: Player[];
  betAmount: number;
  instantWinType: InstantWinType | null;
  isThreeSpadesWin: boolean;
  payouts: Record<string, number> | null;
  loanDeduction: number | null;
  eloDelta: number | null;
  playerElo: number;
  activeGameType: ActiveGameType;
  campaignChapter: CampaignChapter | null;
  chapterWins: number;
  isChapterUnlockedNext: boolean;
  isAllCampaignCompleted: boolean;
  nextChapter: CampaignChapter | null;
  playerCoins: number;
  allEloDeltas: Record<string, number> | null;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onOpenCampaignMap: (() => void) | null;
}

export interface VictoryLogicResult {
  isHumanWinner: boolean;
  isCampaign: boolean;
  isOnline: boolean;
  isTableDismissed: boolean;
  isHumanBankrupt: boolean;
  bankruptBots: Player[];
  displayPlayers: Player[];
  humanPayout: number;
  modalTitle: string;
  modalSubtitle: string;
  modalIcon: string;
  primaryBtnText: string;
  primaryBtnIconType: PrimaryBtnIconType;
  primaryBtnDisabled: boolean;
  primaryBtnAction: () => void;
  secondaryBtnText: string;
  secondaryBtnIconType: SecondaryBtnIconType;
  secondaryBtnAction: () => void;
  statBox1Title: string;
  statBox1Value: string;
  statBox1Sub: string;
  statBox2Title: string;
  statBox2Value: string;
  statBox2Sub: string;
  totalOnlinePlayers: number;
  readyOnlinePlayers: number;
  isMyPlayerReady: boolean;
  isOnlineHost: boolean;
  voteRematch: (isReady: boolean) => void;
  handleExportJson: () => void;
}

export function useVictoryLogic(props: UseVictoryLogicProps): VictoryLogicResult {
  const {
    isOpen,
    winners,
    allPlayers,
    betAmount,
    instantWinType,
    payouts,
    activeGameType,
    campaignChapter,
    chapterWins,
    isChapterUnlockedNext,
    isAllCampaignCompleted,
    nextChapter,
    playerCoins,
    onNextGame,
    onReturnToLobby,
    onOpenCampaignMap
  } = props;

  const { myPlayerId } = useGameStore();
  const onlineStore = useOnlineStore();
  const { openModal } = useModalStore();

  const roomState = onlineStore.roomState;
  const isOnlineHost = onlineStore.isHost;
  const voteRematch = onlineStore.voteRematch;

  const isOnline = activeGameType === 'ONLINE';
  const isCampaign = activeGameType === 'CAMPAIGN';
  const isHumanWinner = winners.length > 0 && winners[0].id === myPlayerId;

  const totalOnlinePlayers = roomState !== null ? roomState.players.length : allPlayers.length;
  const readyOnlinePlayers = roomState !== null ? roomState.players.filter(p => p.isReady).length : 0;
  const myOnlinePlayer = roomState !== null ? roomState.players.find(p => p.playerId === myPlayerId) || null : null;
  const isMyPlayerReady = myOnlinePlayer !== null ? myOnlinePlayer.isReady : false;

  useEffect(() => {
    if (isOpen) {
      clearActiveMatchSession();

      if (isHumanWinner || instantWinType !== null) {
        void confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }
  }, [isOpen, isHumanWinner, instantWinType]);

  const handleExportJson = useCallback(() => {
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
  }, []);

  const humanPayout = payouts !== null ? (payouts[myPlayerId] || 0) : 0;

  // Sắp xếp người chơi theo kết quả
  const displayPlayers: Player[] = useMemo(() => {
    return [...allPlayers].sort((a, b) => {
      const aIdx = winners.findIndex(w => w.id === a.id);
      const bIdx = winners.findIndex(w => w.id === b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      const aHandLen = a.hand !== null && a.hand !== undefined ? a.hand.length : 0;
      const bHandLen = b.hand !== null && b.hand !== undefined ? b.hand.length : 0;
      return aHandLen - bHandLen;
    });
  }, [allPlayers, winners]);

  // Kiểm tra có đối thủ nào cháy túi (vỡ nợ) không đủ tiền cược tiếp
  const bankruptBots = !isCampaign ? allPlayers.filter(p => p.isBot && (p.score || 0) < betAmount) : [];
  const isHumanBankrupt = !isCampaign && playerCoins < betAmount;
  const isTableDismissed = !isCampaign && !isOnline && (bankruptBots.length > 0 || isHumanBankrupt);

  let modalTitle = isHumanWinner ? 'CHIẾN THẮNG TRẬN ĐẤU!' : 'KẾT THÚC VÁN ĐẤU';
  let modalSubtitle = 'Ván đấu đã kết thúc!';
  let modalIcon = '🏆';
  let primaryBtnText = 'Ván Mới';
  let primaryBtnIconType: PrimaryBtnIconType = 'PLAY';
  let primaryBtnDisabled = false;
  let primaryBtnAction = onNextGame;
  let secondaryBtnText = 'Về Sảnh';
  let secondaryBtnIconType: SecondaryBtnIconType = 'HOME';
  let secondaryBtnAction = onReturnToLobby;

  const statBox1Title = 'KẾT QUẢ CÁ NHÂN';
  const statBox1Value = humanPayout > 0 ? `+${humanPayout.toLocaleString()} 🪙` : `${humanPayout.toLocaleString()} 🪙`;
  const statBox1Sub = isHumanWinner ? '🥇 Bạn đã về Nhất!' : '💥 Chưa thể giành chiến thắng';

  let statBox2Title = 'CHẾ ĐỘ CHƠI';
  let statBox2Value = 'Truyền Thống';
  let statBox2Sub = `Mức cược: ${betAmount.toLocaleString()} Xu`;

  if (isOnline) {
    modalIcon = isHumanWinner ? '🏆' : '💥';
    modalTitle = isHumanWinner ? 'CHIẾN THẮNG TRẬN ĐẤU!' : 'KẾT THÚC VÁN ĐẤU';
    modalSubtitle = isOnlineHost ? 'Chế độ Chơi Online (Chủ Bàn)' : 'Chế độ Chơi Online (Khách Tham Gia)';

    statBox2Title = 'CHẾ ĐỘ CHƠI';
    statBox2Value = 'Chơi Online';
    statBox2Sub = `Mức cược: ${betAmount.toLocaleString()} Xu`;

    if (!isMyPlayerReady) {
      primaryBtnText = 'Sẵn Sàng Ván Mới';
      primaryBtnIconType = 'CHECK';
      primaryBtnDisabled = false;
      primaryBtnAction = () => voteRematch(true);
    } else {
      primaryBtnText = readyOnlinePlayers === totalOnlinePlayers 
        ? 'Đang Khởi Tạo...' 
        : `Đã Sẵn Sàng (${readyOnlinePlayers}/${totalOnlinePlayers})`;
      primaryBtnIconType = readyOnlinePlayers === totalOnlinePlayers ? 'SPINNER' : 'CHECK';
      primaryBtnDisabled = true;
      primaryBtnAction = () => {};
    }

    secondaryBtnText = isOnlineHost ? 'Giải Tán Phòng' : 'Rời Phòng';
    secondaryBtnIconType = 'HOME';
    secondaryBtnAction = onReturnToLobby;
  } else if (isTableDismissed) {
    modalIcon = '🚨';
    if (isHumanBankrupt) {
      modalTitle = 'BẠN ĐÃ HẾT XU!';
      modalSubtitle = 'Số dư không đủ mức cược tối thiểu để tiếp tục!';
      statBox2Title = 'TRẠNG THÁI';
      statBox2Value = 'Cháy Túi';
      statBox2Sub = 'Cần thêm Xu để tiếp tục chơi';
      primaryBtnText = 'Mở Ngân Hàng';
      primaryBtnIconType = 'BANK';
      primaryBtnAction = () => openModal('BANK');
    } else {
      modalTitle = 'GIẢI TÁN BÀN CHƠI!';
      const botNames = bankruptBots.map(b => b.name).join(', ');
      modalSubtitle = `Người chơi [${botNames}] đã hết tiền cược! Bàn đấu sẽ tự động giải tán.`;
      statBox2Title = 'TRẠNG THÁI';
      statBox2Value = 'Đối Thủ Hết Tiền';
      statBox2Sub = `${bankruptBots.length} đối thủ không đủ tiền`;
      primaryBtnText = 'Ghép Bàn Mới';
      primaryBtnIconType = 'ROTATE_CCW';
      primaryBtnAction = onNextGame;
    }
  } else if (isCampaign) {
    modalIcon = isHumanWinner ? '⭐' : '💀';
    statBox2Title = 'CHƯƠNG CHIẾN DỊCH';
    statBox2Value = campaignChapter !== null ? `${campaignChapter.name}: ${campaignChapter.subtitle}` : 'Chiến Dịch';
    statBox2Sub = isHumanWinner 
      ? `Đã thắng ${chapterWins}/${campaignChapter !== null ? campaignChapter.requiredWins : 1} ván` 
      : 'Thử lại để hoàn thành chương';

    if (isHumanWinner) {
      if (isChapterUnlockedNext && nextChapter !== null) {
        modalTitle = 'HOÀN THÀNH CHƯƠNG!';
        modalSubtitle = `Xuất sắc! Bạn đã mở khóa ${nextChapter.name}!`;
        primaryBtnText = 'Chương Tiếp Theo';
        primaryBtnIconType = 'SWORDS';
        primaryBtnAction = onNextGame;
        secondaryBtnText = 'Bản Đồ Chiến Dịch';
        secondaryBtnIconType = 'MAP';
        secondaryBtnAction = onOpenCampaignMap !== null ? onOpenCampaignMap : onReturnToLobby;
      } else if (isAllCampaignCompleted) {
        modalTitle = 'VÔ ĐỊCH TOÀN BỘ CHIẾN DỊCH!';
        modalSubtitle = 'Chúc mừng bạn đã chinh phục toàn bộ 5 chương Chiến Dịch Đỉnh Cao!';
        primaryBtnText = 'Về Sảnh';
        primaryBtnIconType = 'HOME';
        primaryBtnAction = onReturnToLobby;
      } else {
        modalTitle = 'CHIẾN THẮNG TRẬN ĐẤU!';
        modalSubtitle = `Tiến độ chương: ${chapterWins}/${campaignChapter !== null ? campaignChapter.requiredWins : 1} ván thắng`;
        primaryBtnText = 'Đánh Tiếp';
        primaryBtnIconType = 'PLAY';
        primaryBtnAction = onNextGame;
      }
    } else {
      modalTitle = 'THUA TRẬN CHIẾN DỊCH';
      modalSubtitle = 'Đối thủ quá mạnh! Hãy điều chỉnh chiến thuật và thử lại!';
      primaryBtnText = 'Thử Thách Lại';
      primaryBtnIconType = 'ROTATE_CCW';
      primaryBtnAction = onNextGame;
      secondaryBtnText = 'Bản Đồ Chiến Dịch';
      secondaryBtnIconType = 'MAP';
      secondaryBtnAction = onOpenCampaignMap !== null ? onOpenCampaignMap : onReturnToLobby;
    }
  }

  return {
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
    isMyPlayerReady,
    isOnlineHost,
    voteRematch,
    handleExportJson
  };
}
