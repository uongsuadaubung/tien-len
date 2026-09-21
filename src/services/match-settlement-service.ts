import { GameEngine } from '../engine/game';
import { CampaignChapter, CAMPAIGN_CHAPTERS } from '../engine/campaign';
import { resolveStrategyForMatch } from '../engine/strategies/game-mode-strategy';
import { type MatchCompletedEvent, GameEventBus } from '../engine/events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../engine/evaluators/progress-evaluators';
import { Quest, Achievement } from '../engine/quests';
import { PlayerProfile, getActiveMatchSession, clearActiveMatchSession, savePlayerProfile } from '../engine/storage';
import { MatchLogger } from '../engine/match-logger';
import { useGameStore, CampaignResultMeta, createCampaignResultMeta } from '../stores/useGameStore';
import { useUserStore } from '../stores/useUserStore';
import { useViewStore } from '../stores/useViewStore';
import { useEcosystemStore } from '../stores/useEcosystemStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useOnlineStore } from '../stores/useOnlineStore';
import { forceUploadToCloud } from '../engine/sync/sync-service';
import { CustomBotConfigTuple, type MatchPlayer, type InstantWinType } from '../engine/types';
import { assertEconomicBalance } from '../engine/invariants/match-invariants';
import { calculateMatchLoanSettlement, type MatchLoanSettlementResult } from '../engine/constants/economy';
import type { BotConfig } from '../ai/types';
import { getBotConfig } from '../ai/bot-factory';
import { dbUpdatePlayerMatchResult } from '../engine/db/indexed-db';
import type { GameOverMatchState } from '../engine/state-machine/types';
import { createPerspectiveSettlement, type CreatePerspectiveSettlementParams, type PerspectiveSettlement } from '../engine/settlement/perspective-settlement';

export type { CampaignResultMeta };

function triggerQuestToastIfNewlyCompleted(
  oldQuests: Quest[],
  newQuests: Quest[],
  oldAchs: Achievement[],
  newAchs: Achievement[]
) {
  const newlyCompletedQuest = newQuests.find((q, idx) => q.isCompleted && !oldQuests[idx]?.isCompleted);
  const newlyCompletedAch = newAchs.find((a, idx) => a.isCompleted && !oldAchs[idx]?.isCompleted);
  const completedItem = newlyCompletedQuest || newlyCompletedAch;
  if (completedItem) {
    useGameStore.getState().setQuestToast({
      title: completedItem.title,
      rewardCoins: completedItem.rewardCoins,
      icon: completedItem.icon
    });
    setTimeout(() => {
      useGameStore.getState().setQuestToast(null);
    }, 3500);
  }
}

interface BaseSettlementInput {
  readonly humanPlayerId: string;
  readonly payouts: Readonly<Record<string, number>>;
  readonly eloDeltas: Readonly<Record<string, number>>;
  readonly eloDelta: number;
  readonly isVictoryModalRanked: boolean;
  readonly winners: readonly MatchPlayer[];
  readonly allPlayers: readonly MatchPlayer[];
  readonly betAmount: number;
  readonly isThreeSpadesWin: boolean;
  readonly instantWinType: InstantWinType | null;
  readonly loanDeduction?: number;
  readonly heldDeposit: number;
  readonly congsGivenCount: number;
}

export interface CampaignSettlementInput extends BaseSettlementInput {
  readonly activeGameType: 'CAMPAIGN';
  readonly campaignChapter: CampaignChapter;
}

export interface NonCampaignSettlementInput extends BaseSettlementInput {
  readonly activeGameType: 'QUICK' | 'ONLINE';
}

export type AuthoritativeSettlementInput = CampaignSettlementInput | NonCampaignSettlementInput;

export interface AuthoritativeSettlementResult {
  readonly updatedProfile: PlayerProfile;
  readonly matchCompletedEvent: MatchCompletedEvent;
  readonly loanSettlement: MatchLoanSettlementResult;
  readonly campaignResultMeta: CampaignResultMeta | null;
}

/**
 * Hàm thuần kết toán cập nhật hồ sơ người chơi (Pure Domain Function - Functional Core)
 * 100% Deterministic, không phụ thuộc vào Zustand Runtime hay Side-Effects
 */
export function computeAuthoritativeSettlement(
  input: AuthoritativeSettlementInput,
  currentProfile: PlayerProfile
): AuthoritativeSettlementResult {
  const currentCoins = currentProfile.coins;
  const currentElo = currentProfile.elo;

  if (input.payouts[input.humanPlayerId] === undefined) {
    throw new Error(`[computeAuthoritativeSettlement] Invariant violated: Missing payout entry for humanPlayerId "${input.humanPlayerId}"`);
  }
  const humanNetEarned = input.payouts[input.humanPlayerId];
  const heldDeposit = input.heldDeposit;

  // Tính toán kinh tế nợ: Lãi suất theo ván, khấu trừ nợ có sàn bảo hộ vốn 26,000 Xu
  const loanSettlement = calculateMatchLoanSettlement({
    currentCoins,
    heldDeposit,
    humanNetEarned,
    currentLoans: currentProfile.loans,
    activeLoan: currentProfile.activeLoan ?? null
  });

  const nextCoins = Math.max(0, currentCoins + heldDeposit + humanNetEarned - loanSettlement.loanDeduction);
  const nextLoans = loanSettlement.nextLoans;
  const nextActiveLoan = loanSettlement.nextActiveLoan;
  const nextElo = input.isVictoryModalRanked
    ? Math.max(0, currentElo + input.eloDelta)
    : currentElo;

  const winner = input.winners[0];
  if (!winner && input.instantWinType === null) {
    throw new Error('[computeAuthoritativeSettlement] Invariant violated: No winner declared in non-instant match settlement');
  }
  const isPlayerWin = winner ? winner.id === input.humanPlayerId : false;

  const nextWins = isPlayerWin ? currentProfile.stats.wins + 1 : currentProfile.stats.wins;
  const nextCurrentStreak = isPlayerWin ? currentProfile.stats.currentStreak + 1 : 0;
  const nextHighestStreak = Math.max(currentProfile.stats.highestStreak, nextCurrentStreak);
  const nextTotalEarned = humanNetEarned > 0 ? currentProfile.stats.totalEarned + humanNetEarned : currentProfile.stats.totalEarned;

  let updatedUnlockedChapter = currentProfile.campaignUnlockedChapter;
  const updatedChapterWins = { ...currentProfile.campaignChapterWins };
  let unlockedNext = false;
  let allCompleted = false;
  let nextChapObj: CampaignChapter | null = null;
  let currentWinsInChapter = 0;
  let campaignResultMeta: CampaignResultMeta | null = null;

  if (input.activeGameType === 'CAMPAIGN') {
    const chapNumber = input.campaignChapter.id;
    const prevWins = currentProfile.campaignChapterWins[chapNumber] || 0;
    currentWinsInChapter = isPlayerWin ? prevWins + 1 : prevWins;
    updatedChapterWins[chapNumber] = currentWinsInChapter;

    if (currentWinsInChapter >= input.campaignChapter.requiredWins) {
      if (chapNumber >= currentProfile.campaignUnlockedChapter && chapNumber < CAMPAIGN_CHAPTERS.length) {
        updatedUnlockedChapter = chapNumber + 1;
        nextChapObj = CAMPAIGN_CHAPTERS[chapNumber];
        unlockedNext = true;
      } else if (chapNumber >= CAMPAIGN_CHAPTERS.length) {
        allCompleted = true;
      }
    }

    campaignResultMeta = createCampaignResultMeta({
      isUnlockedNext: unlockedNext,
      isAllCompleted: allCompleted,
      nextChapter: nextChapObj,
      currentWins: currentWinsInChapter
    });
  }

  const updatedProfile: PlayerProfile = {
    ...currentProfile,
    coins: nextCoins,
    loans: nextLoans,
    activeLoan: nextActiveLoan,
    elo: nextElo,
    campaignUnlockedChapter: updatedUnlockedChapter,
    campaignChapterWins: updatedChapterWins,
    stats: {
      ...currentProfile.stats,
      gamesPlayed: currentProfile.stats.gamesPlayed + 1,
      wins: nextWins,
      currentStreak: nextCurrentStreak,
      highestStreak: nextHighestStreak,
      totalEarned: nextTotalEarned
    }
  };

  const congsGivenCount = input.congsGivenCount;
  const matchCompletedEvent: MatchCompletedEvent = {
    type: 'MATCH_COMPLETED',
    activeGameType: input.activeGameType,
    winnerPlayerId: winner ? winner.id : input.humanPlayerId,
    isHumanWinner: isPlayerWin,
    winners: [...input.winners],
    allPlayers: [...input.allPlayers],
    payouts: { ...input.payouts },
    humanNetCoins: humanNetEarned,
    totalHumanCoins: nextCoins,
    betAmount: input.betAmount,
    isThreeSpadesWin: input.isThreeSpadesWin,
    playerCount: input.allPlayers.length,
    congsGivenCount,
    cascadeChopCount: 0,
    loanDeduction: loanSettlement.loanDeduction,
    instantWinType: input.instantWinType
  };

  return {
    updatedProfile,
    matchCompletedEvent,
    loanSettlement,
    campaignResultMeta
  };
}

/**
 * Hàm điều phối kết toán hồ sơ người chơi (Imperative Shell)
 * Nhận kết quả thuần từ computeAuthoritativeSettlement và cập nhật Store, EventBus, Quests/Achs
 */
export function applyAuthoritativeSettlementToProfile(
  input: AuthoritativeSettlementInput,
  providedProfile?: PlayerProfile
): {
  updatedProfile: PlayerProfile;
  matchCompletedEvent: MatchCompletedEvent;
  loanSettlement: MatchLoanSettlementResult;
} {
  const userStore = useUserStore.getState();
  const gameStore = useGameStore.getState();
  const currentProfile = providedProfile ?? userStore.profile;

  const result = computeAuthoritativeSettlement(input, currentProfile);

  gameStore.setCampaignResultMeta(result.campaignResultMeta);
  GameEventBus.getInstance().emit(result.matchCompletedEvent);

  const finalQuests = evaluateDailyQuests([result.matchCompletedEvent], result.updatedProfile.dailyQuests, result.updatedProfile);
  const finalAchievements = evaluateAchievements([result.matchCompletedEvent], result.updatedProfile.achievements, result.updatedProfile);

  triggerQuestToastIfNewlyCompleted(currentProfile.dailyQuests, finalQuests, currentProfile.achievements, finalAchievements);

  const finalizedProfile: PlayerProfile = {
    ...result.updatedProfile,
    dailyQuests: finalQuests,
    achievements: finalAchievements
  };

  userStore.setProfile(finalizedProfile);
  savePlayerProfile(finalizedProfile);

  return {
    updatedProfile: finalizedProfile,
    matchCompletedEvent: result.matchCompletedEvent,
    loanSettlement: result.loanSettlement
  };
}
export interface MatchSettlementExecutionResult {
  payouts: Record<string, number>;
  eloDeltas: Record<string, number>;
  loanDeduction: number;
  perspectiveSettlement: PerspectiveSettlement;
  updatedProfile: PlayerProfile;
}

export function settleCompletedMatch(
  engine: GameEngine, 
  driver?: { setSettlementResult?: (payouts: Record<string, number>, eloDeltas: Record<string, number>) => void }
): MatchSettlementExecutionResult {
  const gameStore = useGameStore.getState();
  const userStore = useUserStore.getState();
  const viewStore = useViewStore.getState();

  gameStore.setIsGameOver(true);

  const resolvedInstantWinType = engine.instantWinType;
  gameStore.setInstantWinType(resolvedInstantWinType ?? undefined);

  const humanPlayer = engine.players.find(p => p.id === gameStore.myPlayerId);
  if (!humanPlayer) {
    throw new Error(`[MatchSettlementService] Không tìm thấy player với id="${gameStore.myPlayerId}" trong danh sách bàn đấu khi kết toán!`);
  }
  const humanPlayerId = humanPlayer.id;

  const winner = engine.winners[0];
  if (!winner) {
    throw new Error('[MatchSettlementService] Không thể kết toán khi engine.winners rỗng!');
  }
  const isPlayerWin = winner.id === humanPlayerId;
  // Thu thập dữ liệu toàn bàn đấu: Lượt chặt Heo/Hàng từ MatchLogger
  const turns = MatchLogger.getInstance().getTurns();
  const chopsByPlayer: Record<string, number> = {};
  const gotChoppedByPlayer: Record<string, number> = {};
  for (const t of turns) {
    if (t.action === 'PLAY' && t.isChop) {
      if (t.playerId) {
        chopsByPlayer[t.playerId] = (chopsByPlayer[t.playerId] || 0) + 1;
      }
      if (t.choppedPlayerId) {
        gotChoppedByPlayer[t.choppedPlayerId] = (gotChoppedByPlayer[t.choppedPlayerId] || 0) + 1;
      }
    }
  }

  const currentProfile = userStore.profile;
  const isBankLoanActive = currentProfile.loans > 0;
  const currentElo = currentProfile.elo;
  const activeGameType = gameStore.activeGameType;
  const currentCampaignChapter = gameStore.currentCampaignChapter;
  const effectiveMode = engine.rules.settlementRule;
  const strategy = resolveStrategyForMatch(activeGameType, effectiveMode);

  // Thu thập điểm Elo và Streak cho tất cả người chơi tại bàn
  const onlineRoom = activeGameType === 'ONLINE' ? useOnlineStore.getState().roomState : null;
  const playerElos: Record<string, number> = {
    [humanPlayerId]: currentElo
  };
  for (const p of engine.players) {
    if (p.id !== humanPlayerId) {
      const roomPlayer = onlineRoom?.players.find(op => op.playerId === p.id);
      if (roomPlayer && roomPlayer.elo) {
        playerElos[p.id] = roomPlayer.elo;
      } else if (p.botPersonaId) {
        playerElos[p.id] = getBotConfig(p.botPersonaId).elo ?? 1000;
      } else {
        playerElos[p.id] = 1000;
      }
    }
  }

  const streaksByPlayer: Record<string, number> = {
    [humanPlayerId]: currentProfile.stats.currentStreak
  };

  const settlement = strategy.settleMatch({
    players: engine.players,
    winners: engine.winners,
    betAmount: engine.rules.table.betAmount,
    subjectPlayerId: humanPlayerId,
    playerElos,
    chopsByPlayer,
    gotChoppedByPlayer,
    streaksByPlayer,
    isBankLoanActive,
    campaignReward: currentCampaignChapter?.rewardCoins,
    penaltyMultiplier: engine.rules.chopping.multiplier || 1,
    congMultiplier: engine.rules.cong.multiplier || 1,
    isThreeSpadesWin: engine.isThreeSpadesWin,
    isInstantWin: !!engine.instantWinner
  });

  // Chốt chặn bất biến kinh tế: Tổng tiền thắng + thua = 0
  assertEconomicBalance(settlement.payouts);

  gameStore.setIsThreeSpadesWin(engine.isThreeSpadesWin);
  gameStore.setMatchPayouts(settlement.payouts);
  gameStore.setLastEloDelta(settlement.eloDelta);
  gameStore.setLastEloBreakdown(settlement.eloBreakdown ?? null);
  gameStore.setAllEloDeltas(settlement.allEloDeltas ?? {});

  if (driver?.setSettlementResult) {
    driver.setSettlementResult(settlement.payouts, settlement.allEloDeltas ?? {});
  }

  const session = getActiveMatchSession();
  const heldDeposit = session ? session.depositAmount : 0;
  clearActiveMatchSession();

  const congsGivenCount = isPlayerWin ? engine.players.filter(p => p.id !== humanPlayerId && p.hand.length === 13).length : 0;
  const baseSettlementInput = {
    humanPlayerId,
    payouts: settlement.payouts,
    eloDeltas: settlement.allEloDeltas ?? {},
    eloDelta: settlement.eloDelta,
    isVictoryModalRanked: settlement.isVictoryModalRanked,
    winners: engine.winners,
    allPlayers: engine.players,
    betAmount: engine.rules.table.betAmount,
    isThreeSpadesWin: engine.isThreeSpadesWin,
    instantWinType: resolvedInstantWinType,
    heldDeposit,
    congsGivenCount
  };

  const settlementInput: AuthoritativeSettlementInput = (activeGameType === 'CAMPAIGN' && currentCampaignChapter)
    ? {
        ...baseSettlementInput,
        activeGameType: 'CAMPAIGN',
        campaignChapter: currentCampaignChapter
      }
    : {
        ...baseSettlementInput,
        activeGameType: activeGameType === 'ONLINE' ? 'ONLINE' : 'QUICK'
      };

  const { updatedProfile, loanSettlement } = applyAuthoritativeSettlementToProfile(settlementInput);
  gameStore.setLoanDeductionAmount(loanSettlement.loanDeduction);

  const basePerspectiveParams = {
    subjectPlayerId: humanPlayerId,
    allPlayers: engine.players,
    winners: engine.winners,
    payouts: settlement.payouts,
    eloDeltas: settlement.allEloDeltas ?? {},
    subjectEloDelta: settlement.eloDelta,
    subjectEloBreakdown: settlement.eloBreakdown ?? null,
    loanDeduction: loanSettlement.loanDeduction,
    isThreeSpadesWin: engine.isThreeSpadesWin,
    instantWinType: resolvedInstantWinType,
    betAmount: engine.rules.table.betAmount,
    subjectCoins: updatedProfile.coins
  };

  const perspectiveParams: CreatePerspectiveSettlementParams = (activeGameType === 'CAMPAIGN' && currentCampaignChapter)
    ? {
        ...basePerspectiveParams,
        activeGameType: 'CAMPAIGN',
        campaignChapter: currentCampaignChapter,
        campaignResultMeta: gameStore.campaignResultMeta
      }
    : {
        ...basePerspectiveParams,
        activeGameType: activeGameType === 'ONLINE' ? 'ONLINE' : 'QUICK'
      };

  const perspectiveSettlement = createPerspectiveSettlement(perspectiveParams);
  gameStore.setPerspectiveSettlement(perspectiveSettlement);

  const lastMove = engine.currentRound.moves[engine.currentRound.moves.length - 1] ?? null;
  const existingWinningMove = (gameStore.matchState.status === 'GAME_OVER' ? gameStore.matchState.winningMove : null) ?? gameStore.currentMove;
  const winningMove = lastMove ?? engine.getLeadingMove() ?? existingWinningMove ?? null;
  const gameOverState: GameOverMatchState = {
    status: 'GAME_OVER',
    gameNumber: engine.gameNumber,
    players: engine.players.map(p => ({ ...p })),
    winners: [...engine.winners],
    winningMove,
    leadingMove: winningMove,
    isThreeSpadesWin: engine.isThreeSpadesWin,
    matchPayouts: settlement.payouts,
    eloDeltas: settlement.allEloDeltas ?? {},
    settlement: perspectiveSettlement,
    matchLogReport: null,
    rules: engine.rules
  };
  gameStore.setMatchState(gameOverState);

  const matchReport = MatchLogger.getInstance().finalizeMatch({
    players: engine.players,
    winners: engine.winners,
    payouts: settlement.payouts,
    isThreeSpadesWin: engine.isThreeSpadesWin,
    instantWinType: resolvedInstantWinType,
    loanDeduction: loanSettlement.loanDeduction || 0,
    eloDelta: settlement.eloDelta || 0
  });
  gameStore.setMatchLogReport(matchReport);

  // Cập nhật kết quả trận đấu vào bảng players thống nhất (Dexie IndexedDB v2) cho toàn bộ người chơi tại bàn
  for (const p of engine.players) {
    const deltaCoins = settlement.payouts[p.id] || 0;
    const deltaElo = settlement.allEloDeltas[p.id] ?? (p.id === humanPlayerId ? settlement.eloDelta : 0);
    const isWinner = winner.id === p.id;
    const congsGiven = isWinner
      ? engine.players.filter(pl => pl.id !== p.id && pl.hand.length === 13).length
      : 0;
    dbUpdatePlayerMatchResult(
      p.id,
      {
        deltaCoins,
        deltaElo,
        isWin: isWinner,
        chopsDone: chopsByPlayer[p.id] || 0,
        congsGiven
      },
      {
        name: p.name,
        avatar: p.avatar
      }
    ).catch(() => {});
  }

  // Cập nhật hệ sinh thái 200 Bot nếu không phải Campaign và không phải Online
  if (activeGameType !== 'CAMPAIGN' && activeGameType !== 'ONLINE') {
    const totalPlayers = engine.players.length;
    const humanRank = isPlayerWin ? 1 : (engine.winners.findIndex(w => w.id === humanPlayerId) + 1 || totalPlayers);
    const botResults = engine.players
      .filter(p => p.id !== humanPlayerId)
      .map(p => {
        const rank = engine.winners.findIndex(w => w.id === p.id) + 1 || totalPlayers;
        const deltaCoins = settlement.payouts[p.id] || 0;
        const deltaElo = settlement.allEloDeltas[p.id] ?? 0;

        const chopsDone = matchReport?.turns.filter(t => t.isChop && t.playerId === p.id).length || 0;
        const congsGiven = (engine.winners[0]?.id === p.id)
          ? engine.players.filter(pl => pl.id !== p.id && pl.hand.length === 13).length
          : 0;

        return {
          botId: p.botPersonaId || p.id,
          rank,
          deltaCoins,
          deltaElo,
          chopsDone,
          congsGiven
        };
      });

    const eloDeltasMap: Record<string, number> = {
      [humanPlayerId]: settlement.eloDelta
    };
    botResults.forEach(b => {
      eloDeltasMap[b.botId] = b.deltaElo;
    });
    gameStore.setAllEloDeltas(eloDeltasMap);

    // Đồng bộ ELO biến động trực tiếp vào cấu hình CustomBotConfigs
    if (activeGameType === 'QUICK') {
      const currentConfigs = gameStore.customBotConfigs;
      const updateForIdx = (cfg: Partial<BotConfig> | undefined, idx: number): Partial<BotConfig> => {
        if (!cfg) return {};
        const playerAtIdx = engine.players[idx + 1];
        if (!playerAtIdx) return cfg;
        const res = botResults.find(b => b.botId === playerAtIdx.botPersonaId || b.botId === playerAtIdx.id || b.botId === playerAtIdx.name);
        if (res) {
          const currentElo = cfg.elo ?? 1000;
          return {
            ...cfg,
            elo: Math.max(800, Math.min(2600, currentElo + res.deltaElo))
          };
        }
        return cfg;
      };

      const updated: CustomBotConfigTuple = [
        updateForIdx(currentConfigs[0], 0),
        updateForIdx(currentConfigs[1], 1),
        updateForIdx(currentConfigs[2], 2)
      ];
      gameStore.setCustomBotConfigs(updated);
    }

    useEcosystemStore.getState().settleMatchEcosystem({
      humanRank,
      betAmount: engine.rules.table.betAmount,
      botResults
    });
  } else if (activeGameType === 'ONLINE') {
    gameStore.setAllEloDeltas(settlement.allEloDeltas ?? {});
  } else {
    gameStore.setAllEloDeltas({});
  }

  // Tự động sao lưu lên GitHub Gist nếu đủ điều kiện
  const settings = useSettingsStore.getState();
  const backupInterval = Math.max(1, settings.autoBackupInterval || 5);
  const shouldAutoBackup = updatedProfile.stats.gamesPlayed > 0 && updatedProfile.stats.gamesPlayed % backupInterval === 0;

  if (settings.githubToken && settings.autoBackupOnMatchEnd && shouldAutoBackup) {
    forceUploadToCloud().catch((err: unknown) => {
      console.warn('[AutoBackup] Tự động sao lưu gặp lỗi:', err);
    });
  }

  viewStore.openModal('VICTORY');
  return {
    payouts: settlement.payouts,
    eloDeltas: settlement.allEloDeltas ?? {},
    loanDeduction: loanSettlement.loanDeduction,
    perspectiveSettlement,
    updatedProfile
  };
}
