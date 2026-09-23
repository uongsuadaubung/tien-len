import { useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { MatchPlayer, InstantWinType } from '../../engine/types';
import { clearActiveMatchSession } from '../../engine/storage';
import { MatchLogger } from '../../engine/match-logger';
import { ActiveGameType, useGameStore, CampaignResultMeta } from '../../stores/useGameStore';
import { useUserStore } from '../../stores/useUserStore';
import { useOnlineStore } from '../../stores/useOnlineStore';
import { useI18n, type I18nKeyPath } from '../../locales';
import { EloDeltaResult } from '../../engine/elo';
import { 
  type PerspectiveMatchSettlement, 
  createPerspectiveSettlement 
} from '../../engine/settlement/perspective-settlement';

export type { InstantWinType };

export type PrimaryBtnIconType = 'PLAY' | 'CHECK' | 'SWORDS' | 'ROTATE_CCW' | 'HOME' | 'BANK' | 'SPINNER';
export type SecondaryBtnIconType = 'HOME' | 'MAP';

export type { CampaignResultMeta };

export interface UseVictoryLogicProps {
  isOpen: boolean;
  onNextGame: () => void;
  onReturnToLobby: () => void;
  onOpenCampaignMap?: (() => void) | null;
  campaignResultMeta?: CampaignResultMeta | null;
}

export interface VictoryLogicResult {
  isHumanWinner: boolean;
  isCampaign: boolean;
  isOnline: boolean;
  isTableDismissed: boolean;
  isHumanBankrupt: boolean;
  bankruptBots: MatchPlayer[];
  displayPlayers: MatchPlayer[];
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

  // Authoritative Perspective Settlement
  settlement: PerspectiveMatchSettlement;

  // Bảng kết quả từ Store (giữ tương thích)
  winners: MatchPlayer[];
  allPlayers: MatchPlayer[];
  instantWinType: InstantWinType | null;
  isThreeSpadesWin: boolean;
  betAmount: number;
  activeGameType: ActiveGameType;
  payouts: Record<string, number>;
  loanDeduction: number;
  eloDelta: number;
  lastEloBreakdown: EloDeltaResult['breakdown'] | null;
  allEloDeltas: Record<string, number>;
  myPlayerId: string;
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

  const gameStore = useGameStore();

  const {
    winners,
    players: allPlayers,
    gameSettings,
    instantWinType: rawStoreInstantWinType = null,
    isThreeSpadesWin,
    matchPayouts: payouts,
    loanDeductionAmount: loanDeduction,
    lastEloDelta: eloDelta,
    lastEloBreakdown,
    allEloDeltas,
    activeGameType,
    currentCampaignChapter: campaignChapter,
    myPlayerId: storeMyPlayerId,
    perspectiveSettlement: storeSettlement
  } = gameStore;

  const { profile } = useUserStore();
  const onlineStore = useOnlineStore();

  const playerCoins = profile.coins;
  const betAmount = gameSettings.betAmount;
  const chapterWins = campaignResultMeta?.currentWins ?? (campaignChapter ? (profile.campaignChapterWins[campaignChapter.id] || 0) : 0);

  const roomState = onlineStore.roomState;
  const isOnlineHost = onlineStore.isHost;
  const voteRematch = onlineStore.voteRematch;

  const isOnline = activeGameType === 'ONLINE';
  const isCampaign = activeGameType === 'CAMPAIGN';
  const myPlayerId = storeMyPlayerId;

  // Authoritative Perspective Settlement: Ưu tiên dữ liệu tính sẵn từ Engine
  const settlement: PerspectiveMatchSettlement = useMemo(() => {
    if (storeSettlement && storeSettlement.subjectPlayerId === myPlayerId) {
      return storeSettlement;
    }
    const basePerspectiveParams = {
      subjectPlayerId: myPlayerId,
      allPlayers,
      winners,
      payouts,
      eloDeltas: allEloDeltas ?? {},
      subjectEloDelta: eloDelta,
      subjectEloBreakdown: lastEloBreakdown ?? null,
      loanDeduction,
      isThreeSpadesWin,
      instantWinType: rawStoreInstantWinType,
      betAmount,
      subjectCoins: playerCoins
    };

    if (activeGameType === 'CAMPAIGN' && campaignChapter) {
      return createPerspectiveSettlement({
        ...basePerspectiveParams,
        activeGameType: 'CAMPAIGN',
        campaignChapter,
        campaignResultMeta
      });
    }

    return createPerspectiveSettlement({
      ...basePerspectiveParams,
      activeGameType: activeGameType === 'ONLINE' ? 'ONLINE' : 'QUICK'
    });
  }, [
    storeSettlement,
    myPlayerId,
    allPlayers,
    winners,
    payouts,
    allEloDeltas,
    eloDelta,
    lastEloBreakdown,
    loanDeduction,
    isThreeSpadesWin,
    rawStoreInstantWinType,
    activeGameType,
    betAmount,
    playerCoins,
    campaignChapter,
    campaignResultMeta
  ]);

  const isHumanWinner = settlement.isWinner;
  const humanPayout = settlement.netPayout;

  const totalOnlinePlayers = roomState !== null ? roomState.players.length : allPlayers.length;
  const readyOnlinePlayers = roomState !== null ? roomState.players.filter(p => p.isReady).length : 0;
  const myOnlinePlayer = roomState !== null ? roomState.players.find(p => p.playerId === myPlayerId) : undefined;
  const isMyPlayerReady = myOnlinePlayer?.isReady ?? false;

  useEffect(() => {
    if (isOpen) {
      clearActiveMatchSession();

      if (isHumanWinner || settlement.instantWinType !== null) {
        void confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }
  }, [isOpen, isHumanWinner, settlement.instantWinType]);

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

  // Danh sách hiển thị lấy theo thứ tự Engine đã sort sẵn
  const displayPlayers: MatchPlayer[] = useMemo(() => {
    return settlement.players
      .map(sp => allPlayers.find(p => p.id === sp.id))
      .filter((p): p is MatchPlayer => p !== undefined);
  }, [settlement.players, allPlayers]);

  const bankruptBots = useMemo(() => {
    return allPlayers.filter(p => settlement.bankruptPlayerNames.includes(p.name));
  }, [allPlayers, settlement.bankruptPlayerNames]);

  const isHumanBankrupt = settlement.isSubjectBankrupt;
  const isTableDismissed = settlement.isTableDismissed;

  interface ScenarioUIConfig {
    readonly modalIcon: string;
    readonly modalTitle: string;
    readonly modalSubtitle: string;
    readonly statBox1Title: string;
    readonly statBox1Value: string;
    readonly statBox1Sub: string;
    readonly statBox2Title: string;
    readonly statBox2Value: string;
    readonly statBox2Sub: string;
    readonly primaryBtnText: string;
    readonly primaryBtnIconType: PrimaryBtnIconType;
    readonly primaryBtnDisabled: boolean;
    readonly primaryBtnAction: () => void;
    readonly secondaryBtnText: string;
    readonly secondaryBtnIconType: SecondaryBtnIconType;
    readonly secondaryBtnAction: () => void;
  }

  // Cấu hình giao diện chuẩn hóa dựa trên MatchEndScenario định danh từ Engine
  const scenarioConfig: ScenarioUIConfig = useMemo(() => {
    switch (settlement.scenario) {
      case 'ONLINE': {
        const isReadyCountMet = readyOnlinePlayers === totalOnlinePlayers;
        const onlineBtnIcon: PrimaryBtnIconType = !isMyPlayerReady
          ? 'CHECK'
          : (isReadyCountMet ? 'SPINNER' : 'CHECK');
        return {
          modalIcon: isHumanWinner ? '🏆' : '💥',
          modalTitle: isHumanWinner ? t('victory.onlineMatchVictory') : t('victory.onlineMatchEnded'),
          modalSubtitle: isOnlineHost ? t('victory.onlineHostSub') : t('victory.onlineGuestSub'),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: humanPayout > 0 ? `+${humanPayout.toLocaleString()} 🪙` : `${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: isHumanWinner ? t('victory.rankFirstWon') : t('victory.notWonYet'),
          statBox2Title: t('victory.gameModeLabel'),
          statBox2Value: t('victory.onlineMode'),
          statBox2Sub: t('victory.betAmountLabel', { amount: betAmount.toLocaleString() }),
          primaryBtnText: !isMyPlayerReady
            ? t('victory.onlineReadyBtn')
            : (isReadyCountMet
                ? t('victory.onlineInitializing')
                : t('victory.onlineReadyCount', { ready: readyOnlinePlayers, total: totalOnlinePlayers })),
          primaryBtnIconType: onlineBtnIcon,
          primaryBtnDisabled: isMyPlayerReady,
          primaryBtnAction: () => {
            if (!isMyPlayerReady) voteRematch(true);
          },
          secondaryBtnText: isOnlineHost ? t('victory.onlineDisbandRoom') : t('victory.onlineLeaveRoom'),
          secondaryBtnIconType: 'HOME',
          secondaryBtnAction: onReturnToLobby
        };
      }

      case 'TABLE_DISMISSED_HUMAN_BANKRUPT': {
        return {
          modalIcon: '🚨',
          modalTitle: t('victory.outOfCoinsTitle'),
          modalSubtitle: t('victory.outOfCoinsSub'),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: `${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: t('victory.notWonYet'),
          statBox2Title: t('victory.statusLabel'),
          statBox2Value: t('victory.bankruptStatus'),
          statBox2Sub: t('victory.needMoreCoinsSub'),
          primaryBtnText: t('victory.btnBackLobby'),
          primaryBtnIconType: 'HOME',
          primaryBtnDisabled: false,
          primaryBtnAction: onReturnToLobby,
          secondaryBtnText: t('victory.btnBackLobby'),
          secondaryBtnIconType: 'HOME',
          secondaryBtnAction: onReturnToLobby
        };
      }

      case 'TABLE_DISMISSED_BOT_BANKRUPT': {
        const botNames = settlement.bankruptPlayerNames.join(', ');
        return {
          modalIcon: '🚨',
          modalTitle: t('victory.tableDismissedTitle'),
          modalSubtitle: t('victory.botBankruptSub', { names: botNames }),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: humanPayout > 0 ? `+${humanPayout.toLocaleString()} 🪙` : `${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: isHumanWinner ? t('victory.rankFirstWon') : t('victory.notWonYet'),
          statBox2Title: t('victory.statusLabel'),
          statBox2Value: t('victory.opponentsOutOfCoins'),
          statBox2Sub: t('victory.bankruptCountSub', { count: settlement.bankruptPlayerNames.length }),
          primaryBtnText: t('victory.btnBackLobby'),
          primaryBtnIconType: 'HOME',
          primaryBtnDisabled: false,
          primaryBtnAction: onReturnToLobby,
          secondaryBtnText: t('victory.btnBackLobby'),
          secondaryBtnIconType: 'HOME',
          secondaryBtnAction: onReturnToLobby
        };
      }

      case 'CAMPAIGN_WON_NEXT_UNLOCKED': {
        const nextChapterName = campaignResultMeta?.nextChapter?.name ?? '';
        return {
          modalIcon: '⭐',
          modalTitle: t('victory.chapterCompletedTitle'),
          modalSubtitle: t('victory.chapterUnlockedSub', { name: nextChapterName }),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: `+${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: t('victory.rankFirstWon'),
          statBox2Title: t('victory.campaignChapterLabel'),
          statBox2Value: campaignChapter !== null ? `${campaignChapter.name}: ${campaignChapter.subtitle}` : t('victory.defaultCampaign'),
          statBox2Sub: t('victory.campaignWinsProgress', { wins: chapterWins, required: campaignChapter !== null ? campaignChapter.requiredWins : 1 }),
          primaryBtnText: t('victory.campaignNextBtn'),
          primaryBtnIconType: 'SWORDS',
          primaryBtnDisabled: false,
          primaryBtnAction: onNextGame,
          secondaryBtnText: t('victory.campaignMapBtn'),
          secondaryBtnIconType: 'MAP',
          secondaryBtnAction: onOpenCampaignMap !== null ? onOpenCampaignMap : onReturnToLobby
        };
      }

      case 'CAMPAIGN_WON_ALL_COMPLETED': {
        return {
          modalIcon: '⭐',
          modalTitle: t('victory.campaignAllWonTitle'),
          modalSubtitle: t('victory.campaignAllWonSub'),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: `+${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: t('victory.rankFirstWon'),
          statBox2Title: t('victory.campaignChapterLabel'),
          statBox2Value: campaignChapter !== null ? `${campaignChapter.name}: ${campaignChapter.subtitle}` : t('victory.defaultCampaign'),
          statBox2Sub: t('victory.campaignWinsProgress', { wins: chapterWins, required: campaignChapter !== null ? campaignChapter.requiredWins : 1 }),
          primaryBtnText: t('victory.btnBackLobby'),
          primaryBtnIconType: 'HOME',
          primaryBtnDisabled: false,
          primaryBtnAction: onReturnToLobby,
          secondaryBtnText: t('victory.btnBackLobby'),
          secondaryBtnIconType: 'HOME',
          secondaryBtnAction: onReturnToLobby
        };
      }

      case 'CAMPAIGN_WON_IN_PROGRESS': {
        return {
          modalIcon: '⭐',
          modalTitle: t('victory.onlineMatchVictory'),
          modalSubtitle: t('victory.campaignChapterProgress', { wins: chapterWins, required: campaignChapter !== null ? campaignChapter.requiredWins : 1 }),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: `+${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: t('victory.rankFirstWon'),
          statBox2Title: t('victory.campaignChapterLabel'),
          statBox2Value: campaignChapter !== null ? `${campaignChapter.name}: ${campaignChapter.subtitle}` : t('victory.defaultCampaign'),
          statBox2Sub: t('victory.campaignWinsProgress', { wins: chapterWins, required: campaignChapter !== null ? campaignChapter.requiredWins : 1 }),
          primaryBtnText: t('victory.campaignContinueBtn'),
          primaryBtnIconType: 'PLAY',
          primaryBtnDisabled: false,
          primaryBtnAction: onNextGame,
          secondaryBtnText: t('victory.campaignMapBtn'),
          secondaryBtnIconType: 'MAP',
          secondaryBtnAction: onOpenCampaignMap !== null ? onOpenCampaignMap : onReturnToLobby
        };
      }

      case 'CAMPAIGN_DEFEAT': {
        return {
          modalIcon: '💀',
          modalTitle: t('victory.campaignDefeatTitle'),
          modalSubtitle: t('victory.campaignDefeatSub'),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: `${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: t('victory.notWonYet'),
          statBox2Title: t('victory.campaignChapterLabel'),
          statBox2Value: campaignChapter !== null ? `${campaignChapter.name}: ${campaignChapter.subtitle}` : t('victory.defaultCampaign'),
          statBox2Sub: t('victory.campaignRetrySub'),
          primaryBtnText: t('victory.campaignRetryBtn'),
          primaryBtnIconType: 'ROTATE_CCW',
          primaryBtnDisabled: false,
          primaryBtnAction: onNextGame,
          secondaryBtnText: t('victory.campaignMapBtn'),
          secondaryBtnIconType: 'MAP',
          secondaryBtnAction: onOpenCampaignMap !== null ? onOpenCampaignMap : onReturnToLobby
        };
      }

      case 'STANDARD_VICTORY': {
        return {
          modalIcon: '🏆',
          modalTitle: t('victory.titleVictory'),
          modalSubtitle: t('game.victory'),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: `+${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: t('victory.rankFirstWon'),
          statBox2Title: t('victory.gameModeLabel'),
          statBox2Value: t('victory.traditionalMode'),
          statBox2Sub: t('victory.betAmountLabel', { amount: betAmount.toLocaleString() }),
          primaryBtnText: t('victory.btnRematch'),
          primaryBtnIconType: 'PLAY',
          primaryBtnDisabled: false,
          primaryBtnAction: onNextGame,
          secondaryBtnText: t('victory.btnBackLobby'),
          secondaryBtnIconType: 'HOME',
          secondaryBtnAction: onReturnToLobby
        };
      }

      case 'STANDARD_DEFEAT':
      default: {
        return {
          modalIcon: '🏆',
          modalTitle: t('victory.titleDefeat'),
          modalSubtitle: t('game.defeat'),
          statBox1Title: t('victory.statPayout'),
          statBox1Value: `${humanPayout.toLocaleString()} 🪙`,
          statBox1Sub: t('victory.notWonYet'),
          statBox2Title: t('victory.gameModeLabel'),
          statBox2Value: t('victory.traditionalMode'),
          statBox2Sub: t('victory.betAmountLabel', { amount: betAmount.toLocaleString() }),
          primaryBtnText: t('victory.btnRematch'),
          primaryBtnIconType: 'PLAY',
          primaryBtnDisabled: false,
          primaryBtnAction: onNextGame,
          secondaryBtnText: t('victory.btnBackLobby'),
          secondaryBtnIconType: 'HOME',
          secondaryBtnAction: onReturnToLobby
        };
      }
    }
  }, [
    settlement.scenario,
    isHumanWinner,
    humanPayout,
    isOnlineHost,
    readyOnlinePlayers,
    totalOnlinePlayers,
    isMyPlayerReady,
    betAmount,
    chapterWins,
    campaignChapter,
    campaignResultMeta,
    settlement.bankruptPlayerNames,
    onNextGame,
    onReturnToLobby,
    onOpenCampaignMap,
    voteRematch,
    t
  ]);

  return {
    isHumanWinner,
    isCampaign,
    isOnline,
    isTableDismissed,
    isHumanBankrupt,
    bankruptBots,
    displayPlayers,
    humanPayout,
    modalTitle: scenarioConfig.modalTitle,
    modalSubtitle: scenarioConfig.modalSubtitle,
    modalIcon: scenarioConfig.modalIcon,
    primaryBtnText: scenarioConfig.primaryBtnText,
    primaryBtnIconType: scenarioConfig.primaryBtnIconType,
    primaryBtnDisabled: scenarioConfig.primaryBtnDisabled,
    primaryBtnAction: scenarioConfig.primaryBtnAction,
    secondaryBtnText: scenarioConfig.secondaryBtnText,
    secondaryBtnIconType: scenarioConfig.secondaryBtnIconType,
    secondaryBtnAction: scenarioConfig.secondaryBtnAction,
    statBox1Title: scenarioConfig.statBox1Title,
    statBox1Value: scenarioConfig.statBox1Value,
    statBox1Sub: scenarioConfig.statBox1Sub,
    statBox2Title: scenarioConfig.statBox2Title,
    statBox2Value: scenarioConfig.statBox2Value,
    statBox2Sub: scenarioConfig.statBox2Sub,
    totalOnlinePlayers,
    readyOnlinePlayers,
    isMyPlayerReady,
    isOnlineHost,
    voteRematch,
    handleExportJson,
    settlement,
    winners,
    allPlayers,
    instantWinType: settlement.instantWinType,
    isThreeSpadesWin,
    betAmount,
    activeGameType,
    payouts: settlement.players.reduce((acc, p) => ({ ...acc, [p.id]: p.netPayout }), {}),
    loanDeduction,
    eloDelta: settlement.eloDelta ?? 0,
    lastEloBreakdown: settlement.eloBreakdown,
    allEloDeltas: settlement.players.reduce((acc, p) => p.eloDelta !== null ? { ...acc, [p.id]: p.eloDelta } : acc, {}),
    myPlayerId
  };
}
