import type { MatchPlayer, Card, InstantWinType, PlayedMove, GameRules } from '../types';
import type { EloDeltaResult } from '../elo';
import type { CampaignChapter } from '../campaign';
import type { I18nKeyPath } from '../../locales';
import type { CampaignResultMeta } from '../../stores/useGameStore';
import type { MatchLogReport } from '../match-logger';
import type { GameOverMatchState } from '../state-machine/types';

export interface SettledPlayerCardView {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
  readonly isLocal: boolean;
  readonly rank: number;
  readonly rankLabelKey: I18nKeyPath;
  readonly rankLabelParams: Readonly<Record<string, string | number>>;
  readonly isWinner: boolean;
  readonly isCong: boolean;
  readonly hasRottenTwo: boolean;
  readonly netPayout: number;
  readonly eloDelta: number | null;
  readonly remainingCards: readonly Card[];
}

export type MatchEndScenario =
  | 'ONLINE'
  | 'CAMPAIGN_WON_NEXT_UNLOCKED'
  | 'CAMPAIGN_WON_ALL_COMPLETED'
  | 'CAMPAIGN_WON_IN_PROGRESS'
  | 'CAMPAIGN_DEFEAT'
  | 'TABLE_DISMISSED_HUMAN_BANKRUPT'
  | 'TABLE_DISMISSED_BOT_BANKRUPT'
  | 'STANDARD_VICTORY'
  | 'STANDARD_DEFEAT';

export interface BasePerspectiveSettlement {
  readonly subjectPlayerId: string;
  readonly isWinner: boolean;
  readonly rank: number;
  readonly netPayout: number;
  readonly eloDelta: number | null;
  readonly eloBreakdown: EloDeltaResult['breakdown'] | null;
  readonly loanDeduction: number;
  readonly isThreeSpadesWin: boolean;
  readonly instantWinType: InstantWinType | null;
  readonly instantWinKey: I18nKeyPath | null;
  readonly isTableDismissed: boolean;
  readonly isSubjectBankrupt: boolean;
  readonly bankruptPlayerNames: readonly string[];
  readonly players: readonly SettledPlayerCardView[];
}

export interface CampaignPerspectiveSettlement extends BasePerspectiveSettlement {
  readonly activeGameType: 'CAMPAIGN';
  readonly scenario:
    | 'CAMPAIGN_WON_NEXT_UNLOCKED'
    | 'CAMPAIGN_WON_ALL_COMPLETED'
    | 'CAMPAIGN_WON_IN_PROGRESS'
    | 'CAMPAIGN_DEFEAT';
  readonly campaignChapter: CampaignChapter;
  readonly campaignResultMeta: CampaignResultMeta | null;
}

export interface StandardPerspectiveSettlement extends BasePerspectiveSettlement {
  readonly activeGameType: 'QUICK' | 'ONLINE';
  readonly scenario:
    | 'ONLINE'
    | 'TABLE_DISMISSED_HUMAN_BANKRUPT'
    | 'TABLE_DISMISSED_BOT_BANKRUPT'
    | 'STANDARD_VICTORY'
    | 'STANDARD_DEFEAT';
  readonly campaignChapter: null;
  readonly campaignResultMeta: null;
}

export type PerspectiveMatchSettlement = CampaignPerspectiveSettlement | StandardPerspectiveSettlement;
export type PerspectiveSettlement = PerspectiveMatchSettlement;

interface BasePerspectiveParams {
  readonly subjectPlayerId: string;
  readonly allPlayers: readonly MatchPlayer[];
  readonly winners: readonly MatchPlayer[];
  readonly payouts: Readonly<Record<string, number>>;
  readonly eloDeltas: Readonly<Record<string, number>>;
  readonly subjectEloDelta: number;
  readonly subjectEloBreakdown: EloDeltaResult['breakdown'] | null;
  readonly loanDeduction: number;
  readonly isThreeSpadesWin: boolean;
  readonly instantWinType: InstantWinType | null;
  readonly betAmount: number;
  readonly subjectCoins: number;
}

export interface CampaignPerspectiveParams extends BasePerspectiveParams {
  readonly activeGameType: 'CAMPAIGN';
  readonly campaignChapter: CampaignChapter;
  readonly campaignResultMeta: CampaignResultMeta | null;
}

export interface NonCampaignPerspectiveParams extends BasePerspectiveParams {
  readonly activeGameType: 'QUICK' | 'ONLINE';
}

export type CreatePerspectiveSettlementParams = CampaignPerspectiveParams | NonCampaignPerspectiveParams;

export const INSTANT_WIN_KEY_LOOKUP: Record<InstantWinType, I18nKeyPath> = {
  DRAGON_STRAIGHT: 'victory.instantWinTypes.DRAGON_STRAIGHT',
  FOUR_TWOS: 'victory.instantWinTypes.FOUR_TWOS',
  FIVE_PAIRS_SEQUENTIAL: 'victory.instantWinTypes.FIVE_PAIRS_SEQUENTIAL',
  SIX_PAIRS: 'victory.instantWinTypes.SIX_PAIRS',
  SAME_COLOR_13: 'victory.instantWinTypes.SAME_COLOR_13',
  FIRST_ROUND_FOUR_THREES: 'victory.instantWinTypes.FIRST_ROUND_FOUR_THREES'
};

/**
 * Pure Domain Factory: Tính toán góc nhìn kết toán hoàn chỉnh cho một người chơi.
 * Toàn bộ logic thứ hạng, Cóng, Thối Heo, phân bổ tiền và kịch bản kết thúc
 * được tính toán tại đây để Frontend chỉ việc render 1:1.
 */
export function createPerspectiveSettlement(
  params: CreatePerspectiveSettlementParams
): PerspectiveMatchSettlement {
  const {
    subjectPlayerId,
    allPlayers,
    winners,
    payouts,
    eloDeltas,
    subjectEloDelta,
    subjectEloBreakdown,
    loanDeduction,
    isThreeSpadesWin,
    instantWinType,
    activeGameType,
    betAmount,
    subjectCoins
  } = params;

  if (allPlayers.length === 0) {
    throw new Error('[createPerspectiveSettlement] Invariant violated: allPlayers cannot be empty');
  }

  const subject = allPlayers.find(p => p.id === subjectPlayerId);
  if (!subject) {
    throw new Error(`[createPerspectiveSettlement] Invariant violated: subjectPlayerId "${subjectPlayerId}" does not exist in allPlayers`);
  }
  const effectiveSubjectId = subject.id;

  // 1. Sắp xếp người chơi từ Hạng 1 đến Hạng N
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    const aIdx = winners.findIndex(w => w.id === a.id);
    const bIdx = winners.findIndex(w => w.id === b.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.hand.length - b.hand.length;
  });

  const instantWinKey: I18nKeyPath | null = instantWinType !== null ? INSTANT_WIN_KEY_LOOKUP[instantWinType] : null;

  // 2. Chuyển đổi từng người chơi thành SettledPlayerCardView hoàn chỉnh
  const playerCardViews: SettledPlayerCardView[] = sortedPlayers.map((player, idx) => {
    const isLocal = player.id === effectiveSubjectId;
    const isWinner = idx === 0;
    const remainingCards = [...(player.hand || [])]
      .filter((c): c is Card => c != null && typeof c.weight === 'number')
      .sort((a, b) => a.weight - b.weight);
    const isCong = !isWinner && instantWinType === null && remainingCards.length === 13;
    const hasRottenTwo = !isWinner && instantWinType === null && remainingCards.some(c => c.rank === 15);
    if (payouts[player.id] === undefined) {
      throw new Error(`[createPerspectiveSettlement] Invariant violated: Missing payout entry for player "${player.id}"`);
    }
    const netPayout = payouts[player.id];

    let eloDelta: number | null = null;
    if (activeGameType !== 'CAMPAIGN') {
      const explicitDelta = eloDeltas[player.id];
      if (explicitDelta !== undefined) {
        eloDelta = explicitDelta;
      } else if (player.botPersonaId && eloDeltas[player.botPersonaId] !== undefined) {
        eloDelta = eloDeltas[player.botPersonaId];
      } else if (isLocal) {
        eloDelta = subjectEloDelta;
      }
    }

    let rankLabelKey: I18nKeyPath;
    let rankLabelParams: Record<string, string | number> = {};

    if (isWinner) {
      if (instantWinType !== null && instantWinKey !== null) {
        rankLabelKey = 'victory.instantWinBadge';
        rankLabelParams = { typeKey: instantWinKey };
      } else {
        rankLabelKey = 'victory.rank1';
      }
    } else if (instantWinType !== null) {
      rankLabelKey = 'victory.instantWinPenalty';
    } else if (winners.length >= allPlayers.length - 1) {
      if (idx === 1) rankLabelKey = 'victory.rank2';
      else if (idx === 2) rankLabelKey = 'victory.rank3';
      else rankLabelKey = 'victory.rank4';
    } else {
      rankLabelKey = 'victory.lostCountingCards';
    }

    const resolvedName = (player.name && !player.name.startsWith('usr_'))
      ? player.name
      : (isLocal ? 'Người Chơi' : player.name);
    const resolvedAvatar = isLocal && (player.avatar === '👤' || !player.avatar)
      ? '🤠'
      : (player.avatar || (player.isBot ? '🤖' : '🤠'));

    return {
      id: player.id,
      name: resolvedName,
      avatar: resolvedAvatar,
      isLocal,
      rank: idx + 1,
      rankLabelKey,
      rankLabelParams,
      isWinner,
      isCong,
      hasRottenTwo,
      netPayout,
      eloDelta,
      remainingCards
    };
  });

  const subjectCardView = playerCardViews.find(p => p.id === effectiveSubjectId);
  if (!subjectCardView) {
    throw new Error(`[createPerspectiveSettlement] Invariant violated: subjectCardView not found for player "${effectiveSubjectId}"`);
  }
  const isSubjectWinner = subjectCardView.isWinner;
  const subjectRank = subjectCardView.rank;
  const subjectNetPayout = subjectCardView.netPayout;
  const subjectResolvedElo = subjectCardView.eloDelta;

  // 3. Xác định trạng thái cháy túi (Bankrupt)
  const isSubjectBankrupt = activeGameType !== 'CAMPAIGN' && subjectCoins < betAmount;
  const bankruptBots = activeGameType !== 'CAMPAIGN'
    ? allPlayers.filter(p => p.isBot && p.score < betAmount)
    : [];
  const bankruptPlayerNames = bankruptBots.map(b => b.name);
  const isTableDismissed = activeGameType !== 'CAMPAIGN' && activeGameType !== 'ONLINE' && (bankruptBots.length > 0 || isSubjectBankrupt);

  const baseSettlement: BasePerspectiveSettlement = {
    subjectPlayerId: effectiveSubjectId,
    isWinner: isSubjectWinner,
    rank: subjectRank,
    netPayout: subjectNetPayout,
    eloDelta: subjectResolvedElo,
    eloBreakdown: subjectEloBreakdown,
    loanDeduction,
    isThreeSpadesWin,
    instantWinType,
    instantWinKey,
    isTableDismissed,
    isSubjectBankrupt,
    bankruptPlayerNames,
    players: playerCardViews
  };

  // 4. Phân loại kịch bản kết thúc rõ ràng theo Discriminated Union
  if (params.activeGameType === 'CAMPAIGN') {
    let scenario: 'CAMPAIGN_WON_NEXT_UNLOCKED' | 'CAMPAIGN_WON_ALL_COMPLETED' | 'CAMPAIGN_WON_IN_PROGRESS' | 'CAMPAIGN_DEFEAT';
    if (isSubjectWinner) {
      if (params.campaignResultMeta?.status === 'NEXT_UNLOCKED') {
        scenario = 'CAMPAIGN_WON_NEXT_UNLOCKED';
      } else if (params.campaignResultMeta?.status === 'ALL_COMPLETED') {
        scenario = 'CAMPAIGN_WON_ALL_COMPLETED';
      } else {
        scenario = 'CAMPAIGN_WON_IN_PROGRESS';
      }
    } else {
      scenario = 'CAMPAIGN_DEFEAT';
    }

    return {
      ...baseSettlement,
      activeGameType: 'CAMPAIGN',
      scenario,
      campaignChapter: params.campaignChapter,
      campaignResultMeta: params.campaignResultMeta
    };
  }

  let scenario: 'ONLINE' | 'TABLE_DISMISSED_HUMAN_BANKRUPT' | 'TABLE_DISMISSED_BOT_BANKRUPT' | 'STANDARD_VICTORY' | 'STANDARD_DEFEAT';
  if (params.activeGameType === 'ONLINE') {
    scenario = 'ONLINE';
  } else if (isTableDismissed) {
    scenario = isSubjectBankrupt ? 'TABLE_DISMISSED_HUMAN_BANKRUPT' : 'TABLE_DISMISSED_BOT_BANKRUPT';
  } else {
    scenario = isSubjectWinner ? 'STANDARD_VICTORY' : 'STANDARD_DEFEAT';
  }

  return {
    ...baseSettlement,
    activeGameType: params.activeGameType,
    scenario,
    campaignChapter: null,
    campaignResultMeta: null
  };
}

export interface ProvisionalOnlineGameOverStateParams {
  readonly gameNumber: number;
  readonly players: readonly MatchPlayer[];
  readonly winners: readonly MatchPlayer[];
  readonly winningMove: PlayedMove | null;
  readonly isThreeSpadesWin: boolean;
  readonly instantWinType: InstantWinType | null;
  readonly matchPayouts: Readonly<Record<string, number>>;
  readonly allEloDeltas: Readonly<Record<string, number>>;
  readonly subjectPlayerId: string;
  readonly subjectCoins: number;
  readonly betAmount: number;
  readonly rules: GameRules;
  readonly matchLogReport: MatchLogReport | null;
  readonly existingSettlement: PerspectiveSettlement | null;
}

/**
 * Factory tại State Boundary chuẩn hóa việc tạo GameOverMatchState tạm thời
 * cho kịch bản Online (Host & Guest) trong khoảng delay 2s trước khi kết toán chính thức.
 * Tự động đảm bảo tính bất biến Non-Nullable cho payouts và eloDeltas.
 */
export function createProvisionalOnlineGameOverState(
  params: ProvisionalOnlineGameOverStateParams
): GameOverMatchState {
  const payouts: Record<string, number> = { ...params.matchPayouts };
  const eloDeltas: Record<string, number> = { ...params.allEloDeltas };
  for (const player of params.players) {
    if (payouts[player.id] === undefined) {
      payouts[player.id] = 0;
    }
    if (eloDeltas[player.id] === undefined) {
      eloDeltas[player.id] = 0;
    }
  }

  const settlement = params.existingSettlement ?? createPerspectiveSettlement({
    subjectPlayerId: params.subjectPlayerId,
    allPlayers: params.players,
    winners: params.winners,
    payouts,
    eloDeltas,
    subjectEloDelta: eloDeltas[params.subjectPlayerId] ?? 0,
    subjectEloBreakdown: null,
    loanDeduction: 0,
    isThreeSpadesWin: params.isThreeSpadesWin,
    instantWinType: params.instantWinType,
    activeGameType: 'ONLINE',
    betAmount: params.betAmount,
    subjectCoins: params.subjectCoins
  });

  return {
    status: 'GAME_OVER',
    gameNumber: params.gameNumber,
    players: params.players.map(p => ({ ...p })),
    winners: [...params.winners],
    winningMove: params.winningMove,
    isThreeSpadesWin: params.isThreeSpadesWin,
    matchPayouts: payouts,
    eloDeltas,
    settlement,
    matchLogReport: params.matchLogReport,
    rules: params.rules
  };
}

