import { isTwo, sortCards } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { isValidMove } from '../engine/validator';
import { partitionHand } from './hand-partitioner';
import { MctsSolver } from './mcts-solver';
import { OpponentProfiler } from './opponent-profiler';
import { resolveCompositeRuleStrategy } from './rule-strategies';
import { BotDecisionTelemetry } from '../engine/match-logger';
import { getBotConfig } from './bot-factory';

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

// Imports nội bộ cho orchestrator
import { 
  DecisionContext, 
  BotDecision, 
  ValidMoveInfo, 
  generateCandidateMoves, 
  BotDecisionHandler 
} from './decision-types';
import { EmergencyRuleHandler } from './handlers/emergency-handler';
import { EndgameSolverHandler } from './handlers/endgame-handler';
import { LeadMoveHeuristicHandler } from './handlers/lead-move-handler';
import { RespondingMoveHeuristicHandler } from './handlers/responding-move-handler';
import { FallbackDecisionHandler } from './handlers/fallback-handler';

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

/**
 * Hàm quyết định nước đi của AI Bot áp dụng Kiến trúc Rule-First & Chain of Responsibility
 */
export function makeBotDecision(context: DecisionContext): BotDecision {
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

  // 1. Tự động định vị và hợp thành Composite Rule Strategy từ GameRules hoặc GameMode
  const compositeRuleStrategy = context.compositeRuleStrategy 
    || resolveCompositeRuleStrategy(context.rules, context.gameMode);
  const activeRules = compositeRuleStrategy.rules;

  const isProhibitEndingWithTwo = context.prohibitEndingWithTwo !== undefined
    ? context.prohibitEndingWithTwo
    : (context.rules ? (activeRules.gameFlow.prohibitEndingWithTwo ?? false) : false);
  const allowFourPairsCutAnytime = activeRules.chopping.allowFourPairsCutAnytime ?? true;

  // 2. Sinh danh sách nước đi hợp lệ
  const candidateMoveCards = generateCandidateMoves(hand);
  const targetCombo = currentRoundLeadingMove?.combination || null;

  const validMoves: ValidMoveInfo[] = [];
  for (const cards of candidateMoveCards) {
    const isFinishing = cards.length === hand.length;
    const valResult = isValidMove({
      cards,
      target: targetCombo,
      isFirstMoveOfGame,
      isLeadMove,
      hasPassedRound: false,
      allowFourPairsCutAnytime,
      isFinishingMove: isFinishing,
      prohibitEndingWithTwo: isProhibitEndingWithTwo
    });
    if (valResult.valid && valResult.combination) {
      validMoves.push({
        cards,
        combination: valResult.combination,
        isChop: valResult.isChop || false
      });
    }
  }

  // 3. Nếu không có nước đi hợp lệ nào: Buộc phải Bỏ lượt (hoặc đánh 1 lá nếu là Lead)
  if (validMoves.length === 0) {
    let emptyDecision: BotDecision;
    if (isLeadMove && hand.length > 0) {
      if (isProhibitEndingWithTwo && hand.every(isTwo)) {
        emptyDecision = {
          type: 'PASS',
          cards: null,
          combination: null,
          reason: 'Chỉ còn Heo trên tay, không thể đánh do luật cấm về bằng Heo (2)',
          strategyUsed: 'PROHIBIT_TWO_PASS',
          evaluationScore: null,
          candidatesEvaluated: null,
          telemetry: null
        };
      } else {
        const nonTwos = hand.filter(c => !isTwo(c));
        const chosenCard = nonTwos.length > 0 ? sortCards(nonTwos)[0] : sortCards(hand)[0];
        const singleCombo = identifyCombination([chosenCard])!;
        emptyDecision = {
          type: 'PLAY',
          cards: [chosenCard],
          combination: singleCombo,
          reason: 'Buộc phải ra bài khi đang cầm cái',
          strategyUsed: 'FORCED_LEAD_PLAY',
          evaluationScore: null,
          candidatesEvaluated: null,
          telemetry: null
        };
      }
    } else {
      emptyDecision = {
        type: 'PASS',
        cards: null,
        combination: null,
        reason: 'Không có nước đi hợp lệ',
        strategyUsed: 'NO_VALID_MOVES_PASS',
        evaluationScore: null,
        candidatesEvaluated: null,
        telemetry: null
      };
    }

    const handTwoCount = hand.filter(isTwo).length;
    const partition = partitionHand(hand, config.handPartitioningOptimality);
    const trashCount = partition.trashCards.length;

    const telemetry: BotDecisionTelemetry = {
      chosenReason: emptyDecision.reason || 'Bỏ lượt',
      strategyUsed: emptyDecision.strategyUsed || 'NO_VALID_MOVES',
      heuristicScore: null,
      evaluatedCandidatesCount: 0,
      topCandidates: [],
      mctsWinRate: null,
      mctsSimulations: config.mctsSimulations || null,
      handStrengthTwoCount: handTwoCount,
      handStrengthTrashCount: trashCount,
      remainingOpponentCards: { ...remainingPlayerCards }
    };

    return {
      ...emptyDecision,
      telemetry
    };
  }

  // 4. Chạy MCTS nếu Bot có cấu hình mctsSimulations > 0 (Tier 4 / Tier 5)
  const mctsMap: Map<string, number> = new Map();
  if (config.mctsSimulations && config.mctsSimulations > 0 && validMoves.length > 0) {
    const evaluations = MctsSolver.evaluateCandidateMoves(
      config.id,
      hand,
      validMoves,
      tracker,
      remainingPlayerCards,
      config.mctsSimulations
    );
    for (const ev of evaluations) {
      const key = ev.moveCards.map(c => c.id).sort().join('_');
      mctsMap.set(key, ev.winRate);
    }
  }

  const opponentProfiles = context.opponentProfiles || OpponentProfiler.getInstance().getAllProfiles();

  const enrichedContext: DecisionContext = {
    ...context,
    rules: activeRules,
    prohibitEndingWithTwo: isProhibitEndingWithTwo,
    compositeRuleStrategy,
    mctsMap,
    opponentProfiles
  };

  // 5. Xử lý qua Rule-First Chain of Responsibility
  const decision = DEFAULT_DECISION_CHAIN.handle(enrichedContext, validMoves) || {
    type: isLeadMove ? 'PLAY' : 'PASS',
    cards: isLeadMove ? validMoves[0].cards : null,
    combination: isLeadMove ? validMoves[0].combination : null,
    reason: isLeadMove ? 'Nước đi mặc định khi cầm cái' : 'Bỏ lượt mặc định',
    strategyUsed: 'SAFE_DEFAULT',
    evaluationScore: null,
    candidatesEvaluated: null,
    telemetry: null
  };

  const handTwoCount = hand.filter(isTwo).length;
  const partition = partitionHand(hand, config.handPartitioningOptimality);
  const trashCount = partition.trashCards.length;

  let mctsBestWinRate: number | null = null;
  if (decision.cards && decision.cards.length > 0 && mctsMap.size > 0) {
    const key = decision.cards.map(c => c.id).sort().join('_');
    if (mctsMap.has(key)) {
      mctsBestWinRate = mctsMap.get(key) || null;
    }
  }

  const telemetry: BotDecisionTelemetry = {
    chosenReason: decision.reason || (decision.type === 'PLAY' ? 'Đánh bài theo chiến thuật' : 'Bỏ lượt'),
    strategyUsed: decision.strategyUsed || (isLeadMove ? 'LEAD_STRATEGY' : 'RESPONSE_STRATEGY'),
    heuristicScore: decision.evaluationScore !== undefined ? decision.evaluationScore : null,
    evaluatedCandidatesCount: validMoves.length,
    topCandidates: decision.candidatesEvaluated || (decision.cards ? [{
      cards: decision.cards,
      combinationType: decision.combination?.type || null,
      score: decision.evaluationScore || 100,
      reasons: [decision.reason || 'Quyết định từ chiến thuật ưu tiên']
    }] : []),
    mctsWinRate: mctsBestWinRate,
    mctsSimulations: config.mctsSimulations || null,
    handStrengthTwoCount: handTwoCount,
    handStrengthTrashCount: trashCount,
    remainingOpponentCards: { ...remainingPlayerCards }
  };

  return {
    ...decision,
    telemetry
  };
}
