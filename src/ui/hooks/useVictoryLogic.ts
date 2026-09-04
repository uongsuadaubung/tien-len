import { useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Player, InstantWinType } from '../../engine/types';
import { CampaignChapter } from '../../engine/campaign';
import { clearActiveMatchSession } from '../../engine/storage';
import { MatchLogger } from '../../engine/match-logger';
import { ActiveGameType, useGameStore } from '../../stores/useGameStore';
import { useUserStore } from '../../stores/useUserStore';
import { useOnlineStore } from '../../stores/useOnlineStore';
import { useViewStore } from '../../stores/useViewStore';
import { useI18n } from '../../locales';

export type PrimaryBtnIconType = 'PLAY' | 'CHECK' | 'SWORDS' | 'ROTATE_CCW' | 'HOME' | 'BANK' | 'SPINNER';
export type SecondaryBtnIconType = 'HOME' | 'MAP';

export interface UseVictoryLogicProps {
  isOpen: boolean;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onOpenCampaignMap?: (() => void) | null;
  campaignResultMeta?: {
    isUnlockedNext: boolean;
    isAllCompleted: boolean;
    nextChapter: CampaignChapter | null;
    currentWins: number;
  } | null;
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

  // Dữ liệu bảng kết quả từ Store (Single Source of Truth)
  winners: Player[];
  allPlayers: Player[];
  instantWinType: InstantWinType | null;
  isThreeSpadesWin: boolean;
  betAmount: number;
  activeGameType: ActiveGameType;
  payouts: Record<string, number>;
  loanDeduction: number;
  eloDelta: number;
  allEloDeltas: Record<string, number>;
}

export function useVictoryLogic(props: UseVictoryLogicProps): VictoryLogicResult {
  const { t } = useI18n();
  const {
    isOpen,
    onNextGame,
    onReturnToLobby,
    onOpenCampaignMap = null,
    campaignResultMeta = null
  } = props;

  const {
    winners,
    players: allPlayers,
    gameSettings,
    instantWinType = null,
    isThreeSpadesWin,
    matchPayouts: payouts,
    loanDeductionAmount: loanDeduction,
    lastEloDelta: eloDelta,
    allEloDeltas,
    activeGameType,
    currentCampaignChapter: campaignChapter,
    myPlayerId
  } = useGameStore();

  const { profile } = useUserStore();
  const onlineStore = useOnlineStore();
  const { openModal } = useViewStore();

  const playerCoins = profile.coins;
  const betAmount = gameSettings.betAmount;

  const chapterWins = campaignResultMeta?.currentWins ?? (campaignChapter ? (profile.campaignChapterWins[campaignChapter.id] || 0) : 0);
  const isChapterUnlockedNext = campaignResultMeta?.isUnlockedNext ?? false;
  const isAllCampaignCompleted = campaignResultMeta?.isAllCompleted ?? false;
  const nextChapter = campaignResultMeta?.nextChapter ?? null;

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

  let modalTitle = isHumanWinner ? t('victory.titleVictory') : t('victory.titleDefeat');
  let modalSubtitle = isHumanWinner ? t('game.victory') : t('game.defeat');
  let modalIcon = '🏆';
  let primaryBtnText = t('victory.btnRematch');
  let primaryBtnIconType: PrimaryBtnIconType = 'PLAY';
  let primaryBtnDisabled = false;
  let primaryBtnAction = onNextGame;
  let secondaryBtnText = t('victory.btnBackLobby');
  let secondaryBtnIconType: SecondaryBtnIconType = 'HOME';
  let secondaryBtnAction = onReturnToLobby;

  const statBox1Title = t('victory.statPayout');
  const statBox1Value = humanPayout > 0 ? `+${humanPayout.toLocaleString()} 🪙` : `${humanPayout.toLocaleString()} 🪙`;
  const statBox1Sub = isHumanWinner ? t('victory.rankFirstWon') : t('victory.notWonYet');

  let statBox2Title = t('victory.gameModeLabel');
  let statBox2Value = t('victory.traditionalMode');
  let statBox2Sub = t('victory.betAmountLabel', { amount: betAmount.toLocaleString() });

  if (isOnline) {
    modalIcon = isHumanWinner ? '🏆' : '💥';
    modalTitle = isHumanWinner ? t('victory.onlineMatchVictory') : t('victory.onlineMatchEnded');
    modalSubtitle = isOnlineHost ? t('victory.onlineHostSub') : t('victory.onlineGuestSub');

    statBox2Title = t('victory.gameModeLabel');
    statBox2Value = t('victory.onlineMode');
    statBox2Sub = t('victory.betAmountLabel', { amount: betAmount.toLocaleString() });

    if (!isMyPlayerReady) {
      primaryBtnText = t('victory.onlineReadyBtn');
      primaryBtnIconType = 'CHECK';
      primaryBtnDisabled = false;
      primaryBtnAction = () => voteRematch(true);
    } else {
      primaryBtnText = readyOnlinePlayers === totalOnlinePlayers 
        ? t('victory.onlineInitializing') 
        : t('victory.onlineReadyCount', { ready: readyOnlinePlayers, total: totalOnlinePlayers });
      primaryBtnIconType = readyOnlinePlayers === totalOnlinePlayers ? 'SPINNER' : 'CHECK';
      primaryBtnDisabled = true;
      primaryBtnAction = () => {};
    }

    secondaryBtnText = isOnlineHost ? t('victory.onlineDisbandRoom') : t('victory.onlineLeaveRoom');
    secondaryBtnIconType = 'HOME';
    secondaryBtnAction = onReturnToLobby;
  } else if (isTableDismissed) {
    modalIcon = '🚨';
    if (isHumanBankrupt) {
      modalTitle = t('victory.outOfCoinsTitle');
      modalSubtitle = t('victory.outOfCoinsSub');
      statBox2Title = t('victory.statusLabel');
      statBox2Value = t('victory.bankruptStatus');
      statBox2Sub = t('victory.needMoreCoinsSub');
      primaryBtnText = t('victory.openBankBtn');
      primaryBtnIconType = 'BANK';
      primaryBtnAction = () => openModal('BANK');
    } else {
      modalTitle = t('victory.tableDismissedTitle');
      const botNames = bankruptBots.map(b => b.name).join(', ');
      modalSubtitle = t('victory.botBankruptSub', { names: botNames });
      statBox2Title = t('victory.statusLabel');
      statBox2Value = t('victory.opponentsOutOfCoins');
      statBox2Sub = t('victory.bankruptCountSub', { count: bankruptBots.length });
      primaryBtnText = t('victory.findNewTableBtn');
      primaryBtnIconType = 'ROTATE_CCW';
      primaryBtnAction = onNextGame;
    }
  } else if (isCampaign) {
    modalIcon = isHumanWinner ? '⭐' : '💀';
    statBox2Title = t('victory.campaignChapterLabel');
    statBox2Value = campaignChapter !== null ? `${campaignChapter.name}: ${campaignChapter.subtitle}` : t('victory.defaultCampaign');
    statBox2Sub = isHumanWinner 
      ? t('victory.campaignWinsProgress', { wins: chapterWins, required: campaignChapter !== null ? campaignChapter.requiredWins : 1 })
      : t('victory.campaignRetrySub');

    if (isHumanWinner) {
      if (isChapterUnlockedNext && nextChapter !== null) {
        modalTitle = t('victory.chapterCompletedTitle');
        modalSubtitle = t('victory.chapterUnlockedSub', { name: nextChapter.name });
        primaryBtnText = t('victory.campaignNextBtn');
        primaryBtnIconType = 'SWORDS';
        primaryBtnAction = onNextGame;
        secondaryBtnText = t('victory.campaignMapBtn');
        secondaryBtnIconType = 'MAP';
        secondaryBtnAction = onOpenCampaignMap !== null ? onOpenCampaignMap : onReturnToLobby;
      } else if (isAllCampaignCompleted) {
        modalTitle = t('victory.campaignAllWonTitle');
        modalSubtitle = t('victory.campaignAllWonSub');
        primaryBtnText = t('victory.btnBackLobby');
        primaryBtnIconType = 'HOME';
        primaryBtnAction = onReturnToLobby;
      } else {
        modalTitle = t('victory.onlineMatchVictory');
        modalSubtitle = t('victory.campaignChapterProgress', { wins: chapterWins, required: campaignChapter !== null ? campaignChapter.requiredWins : 1 });
        primaryBtnText = t('victory.campaignContinueBtn');
        primaryBtnIconType = 'PLAY';
        primaryBtnAction = onNextGame;
      }
    } else {
      modalTitle = t('victory.campaignDefeatTitle');
      modalSubtitle = t('victory.campaignDefeatSub');
      primaryBtnText = t('victory.campaignRetryBtn');
      primaryBtnIconType = 'ROTATE_CCW';
      primaryBtnAction = onNextGame;
      secondaryBtnText = t('victory.campaignMapBtn');
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
  };
}
