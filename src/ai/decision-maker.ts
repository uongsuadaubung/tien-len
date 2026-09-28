import { isTwo, sortCards } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { isValidMove } from '../engine/validator';
import { ScaledMctsEngine } from './mcts-async-engine';
import { OpponentProfiler } from './opponent-profiler';
import { resolveCompositeRuleStrategy } from './rule-strategies';
import { BotDecisionTelemetry } from '../engine/match-logger';
import { getBotConfig } from './bot-factory';
import { Card, PlayedMove, GameRules } from '../engine/types';

// 1. Re-export toàn bộ Types & Helpers cơ sở
export * from './decision-types';

// 2. Re-export toàn bộ Heuristic Evaluators
export * from './handlers/heuristic-evaluators';

// 3. Re-export toàn bộ 5 Chain Handlers
export * from './handlers/emergency-handler';
export * from './handlers/endgame-handler';
export * from './handlers/lead-move-handler';
export * from './handlers/responding-move-handler';
export * from './handlers/fallback-handler';
import { CardTracker } from './card-tracker';

// Imports nội bộ cho orchestrator
import { 
  DecisionContext, 
  BaseDecisionContext,
  createDecisionContext,
  BotDecision, 
  ValidMoveInfo, 
  generateCandidateMoves, 
  BotDecisionHandler,
  buildBotDecision
} from './decision-types';
import { EmergencyRuleHandler } from './handlers/emergency-handler';
import { EndgameSolverHandler } from './handlers/endgame-handler';
import { LeadMoveHeuristicHandler } from './handlers/lead-move-handler';
import { RespondingMoveHeuristicHandler } from './handlers/responding-move-handler';
import { FallbackDecisionHandler } from './handlers/fallback-handler';
import { DEFAULT_PHASE_STATE_MACHINE } from './thinking-phases';

/**
 * Xây dựng chuỗi Chain of Responsibility hoàn chỉnh cho AI
 */
export function buildBotDecisionChain(): BotDecisionHandler {
  const emergencyRule = new EmergencyRuleHandler();
  const endgame = new EndgameSolverHandler();
  const leadMove = new LeadMoveHeuristicHandler();
  const responseMove = new RespondingMoveHeuristicHandler();
  const fallback = new FallbackDecisionHandler();

  emergencyRule
    .setNext(endgame)
    .setNext(leadMove)
    .setNext(responseMove)
    .setNext(fallback);

  return emergencyRule;
}

const DEFAULT_DECISION_CHAIN = buildBotDecisionChain();

interface DecisionCandidateState {
  readonly context: DecisionContext;
  readonly config: ReturnType<typeof getBotConfig>;
  readonly hand: Card[];
  readonly validMoves: ValidMoveInfo[];
  readonly isLeadMove: boolean;
  readonly remainingPlayerCards: Record<string, number>;
  readonly tracker: CardTracker | null;
  readonly activeRules: GameRules;
  readonly isProhibitEndingWithTwo: boolean;
  readonly compositeRuleStrategy: ReturnType<typeof resolveCompositeRuleStrategy>;
}

type PreparedDecision = 
  | { readonly kind: 'EARLY_EXIT'; readonly decision: BotDecision }
  | { readonly kind: 'READY'; readonly state: DecisionCandidateState };

function prepareDecisionContextAndCandidates(
  rawContext: DecisionContext | (BaseDecisionContext & {
    isLeadMove: boolean;
    currentRoundLeadingMove?: PlayedMove | null;
  })
): PreparedDecision {
  const context = createDecisionContext(rawContext);
  const config = {
    ...getBotConfig('BOT_ELO_1150'),
    ...(context.config || {})
  };

  const { 
    hand, 
    currentRoundLeadingMove, 
    isFirstMoveOfGame, 
    isLeadMove, 
    remainingPlayerCards, 
    tracker 
  } = context;

  // Tự động đồng bộ số lượng người chơi của bàn vào CardTracker (2 người trong Solo 1v1, 3 hoặc 4 người)
  const totalPlayers = Object.keys(remainingPlayerCards).length;
  if (totalPlayers > 0 && tracker) {
    tracker.setPlayerCount(totalPlayers);
  }

  // 1. Tự động định vị và hợp thành Composite Rule Strategy từ GameRules hoặc GameMode
  const compositeRuleStrategy = context.compositeRuleStrategy 
    || resolveCompositeRuleStrategy(context.rules);
  const activeRules = compositeRuleStrategy.rules;

  const isProhibitEndingWithTwo = context.prohibitEndingWithTwo !== undefined
    ? context.prohibitEndingWithTwo
    : activeRules.gameFlow.prohibitEndingWithTwo;
  const allowFourPairsCutAnytime = activeRules.chopping.allowFourPairsCutAnytime;

  // 2. Sinh danh sách nước đi hợp lệ
  const candidateMoveCards = generateCandidateMoves(hand);
  const targetCombo = currentRoundLeadingMove?.combination || null;

  const validMoves: ValidMoveInfo[] = [];
  for (const cards of candidateMoveCards) {
    const isFinishing = cards.length === hand.length;
    const valResult = isValidMove(
      isFirstMoveOfGame && context.firstMoveRequiredCard
        ? {
            cards,
            target: targetCombo,
            isFirstMoveOfGame: true,
            firstMoveRequiredCard: context.firstMoveRequiredCard,
            isLeadMove,
            hasPassedRound: false,
            allowFourPairsCutAnytime,
            isFinishingMove: isFinishing,
            prohibitEndingWithTwo: isProhibitEndingWithTwo
          }
        : {
            cards,
            target: targetCombo,
            isFirstMoveOfGame: false,
            isLeadMove,
            hasPassedRound: false,
            allowFourPairsCutAnytime,
            isFinishingMove: isFinishing,
            prohibitEndingWithTwo: isProhibitEndingWithTwo
          }
    );
    if (valResult.valid) {
      validMoves.push({
        cards,
        combination: valResult.combination,
        isChop: valResult.isChop
      });
    }
  }

  // 3. Nếu không có nước đi hợp lệ nào: Buộc phải Bỏ lượt (hoặc đánh 1 lá nếu là Lead)
  if (validMoves.length === 0) {
    let emptyDecision: BotDecision;
    if (isLeadMove && hand.length > 0) {
      if (isProhibitEndingWithTwo && hand.every(isTwo)) {
        emptyDecision = buildBotDecision('PASS', {
          reason: 'Chỉ còn Heo trên tay, không thể đánh do luật cấm về bằng Heo (2)',
          strategyUsed: 'PROHIBIT_TWO_PASS'
        });
      } else {
        const nonTwos = hand.filter((c: Card) => !isTwo(c));
        const chosenCard = nonTwos.length > 0 ? sortCards(nonTwos)[0] : sortCards(hand)[0];
        const singleCombo = identifyCombination([chosenCard])!;
        emptyDecision = buildBotDecision('PLAY', {
          cards: [chosenCard],
          combination: singleCombo,
          reason: 'Buộc phải ra bài khi đang cầm cái',
          strategyUsed: 'FORCED_LEAD_PLAY'
        });
      }
    } else {
      emptyDecision = buildBotDecision('PASS', {
        reason: 'Không có nước đi hợp lệ',
        strategyUsed: 'NO_VALID_MOVES_PASS'
      });
    }

    const handTwoCount = hand.filter(isTwo).length;
    const trashCount = hand.length - handTwoCount;

    const telemetry: BotDecisionTelemetry = {
      chosenReason: emptyDecision.reason || 'Bỏ lượt',
      reason: emptyDecision.reason || 'Bỏ lượt',
      strategyUsed: emptyDecision.strategyUsed || 'NO_VALID_MOVES',
      heuristicScore: null,
      evaluatedCandidatesCount: 0,
      topCandidates: [],
      mctsWinRate: null,
      mctsSimulations: config.mctsSimulations || null,
      handStrengthTwoCount: handTwoCount,
      handStrengthTrashCount: trashCount,
      remainingOpponentCards: { ...remainingPlayerCards },
      thinkingPhase: 'NO_VALID_MOVES'
    };

    return {
      kind: 'EARLY_EXIT',
      decision: {
        ...emptyDecision,
        telemetry
      }
    };
  }

  return {
    kind: 'READY',
    state: {
      context,
      config,
      hand,
      validMoves,
      isLeadMove,
      remainingPlayerCards,
      tracker,
      activeRules,
      isProhibitEndingWithTwo,
      compositeRuleStrategy
    }
  };
}

function finalizeBotDecisionWithMcts(
  state: DecisionCandidateState,
  mctsMap: Map<string, number>
): BotDecision {
  const {
    context,
    config,
    hand,
    validMoves,
    isLeadMove,
    remainingPlayerCards,
    activeRules,
    isProhibitEndingWithTwo,
    compositeRuleStrategy
  } = state;

  const opponentProfiles = context.opponentProfiles || OpponentProfiler.getInstance().getAllProfiles();

  const enrichedContext: DecisionContext = {
    ...context,
    rules: activeRules,
    prohibitEndingWithTwo: isProhibitEndingWithTwo,
    compositeRuleStrategy,
    mctsMap,
    opponentProfiles
  };

  // 5. Xử lý qua State Pattern: BotThinkingPhaseStateMachine điều phối theo giai đoạn nhận thức
  const phaseDecision = DEFAULT_PHASE_STATE_MACHINE.evaluate(enrichedContext, validMoves);
  const currentThinkingPhase = DEFAULT_PHASE_STATE_MACHINE.currentPhase;

  const fallbackDecision: BotDecision = isLeadMove ? buildBotDecision('PLAY', {
    cards: validMoves[0].cards,
    combination: validMoves[0].combination,
    reason: 'Nước đi mặc định khi cầm cái',
    strategyUsed: 'SAFE_DEFAULT'
  }) : buildBotDecision('PASS', {
    reason: 'Bỏ lượt mặc định',
    strategyUsed: 'SAFE_DEFAULT'
  });

  const decision: BotDecision = phaseDecision || DEFAULT_DECISION_CHAIN.handle(enrichedContext, validMoves) || fallbackDecision;

  const handTwoCount = hand.filter(isTwo).length;
  const trashCount = Math.max(0, hand.length - (decision.cards?.length ?? 0) - handTwoCount);

  let mctsBestWinRate: number | null = null;
  if (decision.cards && decision.cards.length > 0 && mctsMap.size > 0) {
    const key = decision.cards.map(c => c.id).sort().join('_');
    if (mctsMap.has(key)) {
      mctsBestWinRate = mctsMap.get(key) || null;
    }
  }

  const telemetry: BotDecisionTelemetry = {
    chosenReason: decision.reason || (decision.type === 'PLAY' ? 'Đánh bài theo chiến thuật' : 'Bỏ lượt'),
    reason: decision.reason || (decision.type === 'PLAY' ? 'Đánh bài theo chiến thuật' : 'Bỏ lượt'),
    strategyUsed: decision.strategyUsed || (isLeadMove ? 'LEAD_STRATEGY' : 'RESPONSE_STRATEGY'),
    heuristicScore: decision.evaluationScore !== undefined ? decision.evaluationScore : null,
    evaluatedCandidatesCount: validMoves.length,
    topCandidates: decision.candidatesEvaluated ? [...decision.candidatesEvaluated] : (decision.cards ? [{
      cards: [...decision.cards],
      combinationType: decision.combination?.type || null,
      score: decision.evaluationScore ?? 100,
      reasons: [decision.reason || 'Quyết định từ chiến thuật ưu tiên']
    }] : []),
    mctsWinRate: mctsBestWinRate,
    mctsSimulations: config.mctsSimulations ?? null,
    handStrengthTwoCount: handTwoCount,
    handStrengthTrashCount: trashCount,
    remainingOpponentCards: { ...remainingPlayerCards },
    thinkingPhase: currentThinkingPhase
  };

  return {
    ...decision,
    telemetry
  };
}

/**
 * Hàm quyết định nước đi của AI Bot áp dụng Kiến trúc Rule-First & Chain of Responsibility (Phiên bản đồng bộ)
 */
export function makeBotDecision(rawContext: DecisionContext | (BaseDecisionContext & {
  isLeadMove: boolean;
  currentRoundLeadingMove?: PlayedMove | null;
})): BotDecision {
  const prep = prepareDecisionContextAndCandidates(rawContext);
  if (prep.kind === 'EARLY_EXIT') {
    return prep.decision;
  }

  const { state } = prep;
  const mctsMap: Map<string, number> = new Map();
  if (state.config.mctsSimulations && state.config.mctsSimulations > 0 && state.validMoves.length > 0) {
    const tracker = state.tracker ?? new CardTracker(state.hand, 1.0);
    const evaluations = ScaledMctsEngine.evaluateMovesSync(
      state.config.id,
      state.hand,
      state.validMoves,
      tracker,
      state.remainingPlayerCards,
      state.config.mctsSimulations
    );
    for (const ev of evaluations) {
      const key = ev.moveCards.map(c => c.id).sort().join('_');
      mctsMap.set(key, ev.winRate);
    }
  }

  return finalizeBotDecisionWithMcts(state, mctsMap);
}

/**
 * Hàm quyết định nước đi của AI Bot qua Web Worker hoặc bất đồng bộ nhường luồng (Async MCTS Non-Blocking)
 * Giải phóng hoàn toàn 100% CPU Main Thread trong suốt quá trình chạy MCTS Rollouts cho Bot Bậc Cao
 */
export async function makeBotDecisionAsync(rawContext: DecisionContext | (BaseDecisionContext & {
  isLeadMove: boolean;
  currentRoundLeadingMove?: PlayedMove | null;
})): Promise<BotDecision> {
  const prep = prepareDecisionContextAndCandidates(rawContext);
  if (prep.kind === 'EARLY_EXIT') {
    return prep.decision;
  }

  const { state } = prep;
  const mctsMap: Map<string, number> = new Map();
  if (state.config.mctsSimulations && state.config.mctsSimulations > 0 && state.validMoves.length > 0) {
    const tracker = state.tracker ?? new CardTracker(state.hand, 1.0);
    const evaluations = await ScaledMctsEngine.evaluateMovesAsync(
      state.config.id,
      state.hand,
      state.validMoves,
      tracker,
      state.remainingPlayerCards,
      {
        simulationsCount: state.config.mctsSimulations,
        maxCandidates: 10,
        useWorkerIfAvailable: true
      }
    );
    for (const ev of evaluations) {
      const key = ev.moveCards.map(c => c.id).sort().join('_');
      mctsMap.set(key, ev.winRate);
    }
  }

  return finalizeBotDecisionWithMcts(state, mctsMap);
}
