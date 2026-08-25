/**
 * ============================================================================
 * RULE-FIRST AI STRATEGY SYSTEM (TIẾN LÊN MIỀN NAM)
 * Kiến trúc Chiến Thuật Theo Nhóm Luật Active (Composable Rule Strategy System)
 * 
 * Thay vì gán AI cứng nhắc theo từng Chế độ chơi (Game Mode), hệ thống này
 * phân tích tập hợp các Rule đang BẬT (active) trong GameRules để tự động
 * tổng hợp và điều phối các quyết định tối ưu:
 * 1. Settlement Strategy: Tính điểm Đếm Lá / Truyền Thống / Nhất Ăn Tất.
 * 2. Cong & Anti-Freeze Strategy: Nhận diện rủi ro Cóng và kích hoạt Thoát Cóng khẩn cấp.
 * 3. Chopping & Trap Strategy: Điều chỉnh độ nhạy chặt Heo/Hàng và om hàng gài bẫy.
 * 4. GameFlow Strategy: Xử lý mở màn 3 Bích, cấm về 2 cờ tàn, chống đền bài báo 1 lá.
 * 5. Table Scale Strategy: Thích ứng phong cách Solo 1v1 vs Bàn tròn 3-4 người.
 * ============================================================================
 */

import { Card, Combination, GameRules, PlayedMove, createDefaultGameRules } from '../engine/types';
import { isTwo, sortCards } from '../engine/card';
import { CardTracker } from './card-tracker';
import { partitionHand } from './hand-partitioner';

export interface ValidMoveInfo {
  cards: Card[];
  combination: Combination;
  isChop: boolean;
}

export interface RuleDecisionContext {
  hand: Card[];
  currentRoundLeadingMove: PlayedMove | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
  tracker: CardTracker;
  remainingPlayerCards: Record<string, number>;
  nextPlayerId: string;
  hasPlayedFirstCard?: boolean;
  isNextPlayerOneCard?: boolean;
  prohibitEndingWithTwo?: boolean;
  rules: GameRules;
  handPartitioningOptimality?: number;
  antiLeaderAggression?: number;
  tempoControl?: number;
  trapTendency?: number;
  riskAppetite?: number;
}

export interface RuleLeadPolicy {
  /** Ưu tiên xả Sảnh dài (4-6 lá) và Bộ nhiều lá trước để xả tối đa số lá bài tồn (Chế độ Đếm Lá) */
  preferLongestComboFirst: boolean;
  /** Tẩu rác nhỏ (3, 4, 5...) trước để thăm dò và giữ bộ to bọc lót (Chế độ Truyền Thống / Elo) */
  dumpSmallTrashFirst: boolean;
  /** Đánh bạo lực tranh Nhất, xả combo mạnh dứt điểm (Chế độ Nhất Ăn Tất / 1v1) */
  aggressiveFinisherPush: boolean;
}

export interface RuleEmergencyAction {
  type: 'PLAY' | 'PASS';
  cards?: Card[];
  combination?: Combination;
  reason: string;
}

export interface RuleStrategyEvaluator {
  readonly ruleName: string;
  
  /** Đánh giá xem có tình huống khẩn cấp theo rule này không */
  evaluateEmergency?(context: RuleDecisionContext, validMoves: ValidMoveInfo[]): RuleEmergencyAction | null;
  
  /** Đóng góp vào chính sách ra bài khi Cầm Cái (Lead Move) */
  contributeLeadPolicy?(currentPolicy: Partial<RuleLeadPolicy>): Partial<RuleLeadPolicy>;
  
  /** Điều chỉnh điểm số khi Đỡ Bài (Responding Move) */
  getRespondingScoreModifier?(
    move: ValidMoveInfo,
    handSize: number,
    targetMove: PlayedMove | null,
    context: RuleDecisionContext
  ): number;

  /** Hệ số điều chỉnh độ rủi ro khi xả Heo (Chopping Risk Multiplier) */
  getChoppingRiskFactor?(): number;

  /** Điểm thưởng om hàng / gài bẫy (Trap Tendency Modifier) */
  getTrapScoreModifier?(): number;
}

// ============================================================================
// 1. SETTLEMENT RULE STRATEGY (QUY TẮC TÍNH TIỀN & KẾT TOÁN)
// ============================================================================

export class TraditionalSettlementStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'Settlement: Traditional Rank-Based';

  contributeLeadPolicy(currentPolicy: Partial<RuleLeadPolicy>): Partial<RuleLeadPolicy> {
    return {
      ...currentPolicy,
      dumpSmallTrashFirst: true,
      preferLongestComboFirst: false
    };
  }

  getRespondingScoreModifier(
    move: ValidMoveInfo,
    handSize: number,
    targetMove: PlayedMove | null
  ): number {
    let modifier = 0;
    const containsTwo = move.cards.some(isTwo);
    const targetIsTwo = targetMove && targetMove.combination.cards.some(isTwo);

    // Truyền thống: Phạt xả Heo đè rác nhỏ ở đầu ván để bảo toàn Heo đến cờ tàn
    if (containsTwo && !targetIsTwo && handSize >= 6) {
      modifier -= 100;
    }
    return modifier;
  }
}

export class CountCardsSettlementStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'Settlement: Card Count';

  contributeLeadPolicy(currentPolicy: Partial<RuleLeadPolicy>): Partial<RuleLeadPolicy> {
    return {
      ...currentPolicy,
      preferLongestComboFirst: true,
      dumpSmallTrashFirst: false
    };
  }

  getRespondingScoreModifier(
    move: ValidMoveInfo,
    handSize: number
  ): number {
    let bonus = 0;
    // Khuyến khích đè bài khi xả được nhiều lá (Sảnh dài >= 4 lá hoặc Sám cô / Đôi)
    if (move.cards.length >= 4) {
      bonus += 120; // Thưởng cực lớn khi xả được 4-6 lá một lúc
    } else if (move.cards.length >= 2) {
      bonus += 50;
    }

    // Khi bài đối thủ đã ít (còn <= 6 lá): Không om Heo/Hàng quá lâu, sẵn sàng xả để tránh thối
    const containsTwo = move.cards.some(isTwo);
    if (containsTwo && handSize <= 6) {
      bonus += 80;
    }
    return bonus;
  }
}

export class WinnerTakesAllSettlementStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'Settlement: Winner Takes All';

  contributeLeadPolicy(currentPolicy: Partial<RuleLeadPolicy>): Partial<RuleLeadPolicy> {
    return {
      ...currentPolicy,
      aggressiveFinisherPush: true,
      preferLongestComboFirst: false,
      dumpSmallTrashFirst: false
    };
  }

  getRespondingScoreModifier(
    move: ValidMoveInfo
  ): number {
    let bonus = 0;
    const containsTwo = move.cards.some(isTwo);
    if (containsTwo) {
      bonus += 110;
    }
    if (move.combination.highestCard.rank >= 13) {
      bonus += 60; // Thưởng khi đánh bài to (K, A)
    }
    return bonus;
  }
}

// ============================================================================
// 2. CONG & ANTI-FREEZE RULE STRATEGY (QUY TẮC CÓNG & THOÁT CHÁY BÀI)
// ============================================================================

export class CongRuleStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'Cong & Anti-Freeze Protection';

  constructor(
    private readonly enabled: boolean,
    private readonly penaltyCards: number = 26,
    private readonly multiplier: number = 1
  ) {}

  evaluateEmergency(context: RuleDecisionContext, validMoves: ValidMoveInfo[]): RuleEmergencyAction | null {
    if (!this.enabled || validMoves.length === 0) return null;

    // Chỉ kích hoạt khi Bot CHƯA RA ĐƯỢC LÁ BÀI NÀO
    if (context.hasPlayedFirstCard === true) return null;

    // Kiểm tra xem có đối thủ nào sắp về Nhất (còn <= 3 lá bài)
    const minOpponentCards = Math.min(
      ...Object.values(context.remainingPlayerCards).filter(c => c > 0)
    );

    // Khi có đối thủ còn <= 3 lá mà mình chưa ra được lá nào: NGUY CƠ BỊ CÓNG CỰC CAO!
    if (minOpponentCards <= 3 && !context.isLeadMove) {
      // Ưu tiên: Đánh nước đi hợp lệ nhỏ nhất bất kỳ (để thoát cóng với chi phí bài thấp nhất)
      const nonTwoMoves = validMoves.filter(m => !m.cards.some(isTwo));
      const candidates = nonTwoMoves.length > 0 ? nonTwoMoves : validMoves;

      const sorted = [...candidates].sort(
        (a, b) => a.combination.highestCard.weight - b.combination.highestCard.weight
      );

      const chosenMove = sorted[0];
      return {
        type: 'PLAY',
        cards: chosenMove.cards,
        combination: chosenMove.combination,
        reason: `Cảnh báo Cóng (Phạt ${this.penaltyCards * this.multiplier} lá): Bằng mọi giá đánh ${chosenMove.combination.type} để Thoát Cóng!`
      };
    }

    return null;
  }

  getRespondingScoreModifier(
    _move: ValidMoveInfo,
    _handSize: number,
    _targetMove: PlayedMove | null,
    context: RuleDecisionContext
  ): number {
    if (!this.enabled || context.hasPlayedFirstCard === true) return 0;

    // Khi chưa ra lá nào, tăng điểm muốn đánh bài để sớm có lá trên bàn
    const minOpponentCards = Math.min(
      ...Object.values(context.remainingPlayerCards).filter(c => c > 0)
    );

    if (minOpponentCards <= 5) {
      return 60 * this.multiplier;
    }
    return 20 * this.multiplier;
  }
}

// ============================================================================
// 3. CHOPPING & TRAP RULE STRATEGY (QUY TẮC CHẶT HEO & GÀI BẪY)
// ============================================================================

export class ChoppingRuleStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'Chopping & Trapping Strategy';

  constructor(
    private readonly allowFourPairsCutAnytime: boolean,
    private readonly multiplier: number = 1
  ) {}

  getChoppingRiskFactor(): number {
    // Hệ số nhân rủi ro chặt: Nếu multiplier = 2 (Thế giới ngầm) hoặc 4 đôi thông chặt tự do -> tăng cảnh giác
    let factor = this.multiplier;
    if (this.allowFourPairsCutAnytime) {
      factor *= 1.25;
    }
    return factor;
  }

  getTrapScoreModifier(): number {
    // Khi tiền phạt chặt cao, tăng ham muốn phục kích / gài bẫy
    return (this.multiplier - 1) * 40;
  }

  getRespondingScoreModifier(
    move: ValidMoveInfo,
    _handSize: number,
    targetMove: PlayedMove | null
  ): number {
    let bonus = 0;
    if (move.isChop) {
      // Thưởng lớn khi chặt thành công, nhân theo hệ số phạt chặt
      bonus += 150 * this.multiplier;
      if (targetMove && targetMove.combination.cards.some(isTwo)) {
        bonus += 50 * this.multiplier;
      }
    }
    return bonus;
  }
}

// ============================================================================
// 4. GAME FLOW & ENDGAME RULE STRATEGY (QUY TẮC VÒNG CHƠI & CỜ TÀN)
// ============================================================================

export class GameFlowRuleStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'GameFlow & Endgame Flow';

  constructor(
    private readonly prohibitEndingWithTwo: boolean,
    private readonly firstGameRequireThreeOfSpades: boolean
  ) {}

  evaluateEmergency(context: RuleDecisionContext, validMoves: ValidMoveInfo[]): RuleEmergencyAction | null {
    const { hand, isLeadMove, remainingPlayerCards, nextPlayerId, isFirstMoveOfGame } = context;

    // ------------------------------------------------------------------------
    // A. LUẬT MỞ MÀN 3 BÍCH (Ván đầu tiên)
    // ------------------------------------------------------------------------
    if (this.firstGameRequireThreeOfSpades && isFirstMoveOfGame && isLeadMove) {
      const threeSpadeMoves = validMoves.filter(m => m.cards.some(c => c.rank === 3 && c.suit === 'SPADES'));
      if (threeSpadeMoves.length > 0) {
        // Tuyệt đối không phá hàng chặt (3 Đôi Thông, 4 Đôi Thông, Tứ Quý) chỉ để đánh 3 Bích
        const safeThreeSpadeMoves = threeSpadeMoves.filter(
          m => m.combination.type !== 'THREE_PAIRS_SEQUENTIAL' &&
               m.combination.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
               m.combination.type !== 'FOUR_OF_A_KIND'
        );

        const candidateList = safeThreeSpadeMoves.length > 0 ? safeThreeSpadeMoves : threeSpadeMoves;
        const sortedThreeMoves = [...candidateList].sort((a, b) => {
          if (a.combination.type === 'SINGLE' && b.combination.type !== 'SINGLE') return -1;
          if (b.combination.type === 'SINGLE' && a.combination.type !== 'SINGLE') return 1;
          return a.cards.length - b.cards.length;
        });

        const chosen = sortedThreeMoves[0];
        return {
          type: 'PLAY',
          cards: chosen.cards,
          combination: chosen.combination,
          reason: 'Mở màn ván bài với 3 Bích an toàn (bảo vệ hàng chặt)'
        };
      }
    }

    // ------------------------------------------------------------------------
    // B. LUẬT CHỐNG ĐỀN BÀI KHI BÁO 1 LÁ (Anti-Leader Intercept Rule)
    // ------------------------------------------------------------------------
    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const isDirectNextPlayerReporting = remainingPlayerCards[nextPlayerId] === 1;

    if (isEmergencyAntiLeader && !isFirstMoveOfGame && isLeadMove) {
      if (isDirectNextPlayerReporting) {
        // 1. Ưu tiên hàng đầu: Đánh Bộ (Đôi, Sảnh, Sám, Tứ Quý) để đối thủ 1 lá KHÔNG THỂ đỡ được
        const comboMove = validMoves.find(
          m => m.combination.type === 'PAIR' || m.combination.type === 'STRAIGHT' || m.combination.type === 'TRIPLE' || m.combination.type === 'FOUR_OF_A_KIND'
        );
        if (comboMove) {
          return {
            type: 'PLAY',
            cards: comboMove.cards,
            combination: comboMove.combination,
            reason: 'Đánh bộ để đối thủ kế tiếp 1 lá không thể bắt được (chống đền bài)'
          };
        }

        // 2. Không có bộ: Buộc đánh lá rác TO NHẤT (Heo, Át, Rác to nhất)
        const singles = validMoves.filter(m => m.combination.type === 'SINGLE');
        if (singles.length > 0) {
          singles.sort((a, b) => b.combination.highestCard.weight - a.combination.highestCard.weight);
          const topSingle = singles[0];
          return {
            type: 'PLAY',
            cards: topSingle.cards,
            combination: topSingle.combination,
            reason: 'Chặn đầu người kế tiếp báo 1 lá bằng lá bài to nhất (chống đền bài)'
          };
        }
      } else {
        // Người báo 1 lá là người khác -> Tẩu rác nhỏ
        const singles = validMoves.filter(m => m.combination.type === 'SINGLE' && !isTwo(m.combination.highestCard));
        if (singles.length > 0) {
          singles.sort((a, b) => a.combination.highestCard.weight - b.combination.highestCard.weight);
          const smallestSingle = singles[0];
          return {
            type: 'PLAY',
            cards: smallestSingle.cards,
            combination: smallestSingle.combination,
            reason: 'Tẩu rác nhỏ thoát bài (người báo 1 lá không phải người kế tiếp)'
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // C. LUẬT CẤM 2 CUỐI & THỐI HEO CỜ TÀN (Prohibit Ending with Two)
    // ------------------------------------------------------------------------
    const isProhibitTwo = context.prohibitEndingWithTwo !== undefined
      ? context.prohibitEndingWithTwo
      : this.prohibitEndingWithTwo;

    if (isProhibitTwo && isLeadMove) {
      const twos = hand.filter(isTwo);
      const nonTwos = hand.filter(c => !isTwo(c));

      if (twos.length > 0 && nonTwos.length > 0) {
        const nonTwoPartition = partitionHand(nonTwos, 1.0);
        const totalNonTwoTurns = nonTwoPartition.combinations.length + nonTwoPartition.trashCards.length;

        // Khi phần bài thường nonTwos chỉ còn đúng 1 lượt dứt điểm:
        // Bắt buộc xả Heo / bộ Heo trước để cướp nhịp và tránh bị thối Heo!
        if (totalNonTwoTurns === 1) {
          const twoComboMove = validMoves.find(m => m.cards.length === twos.length && m.cards.every(isTwo))
            || validMoves.find(m => m.cards.every(isTwo));

          if (twoComboMove) {
            return {
              type: 'PLAY',
              cards: twoComboMove.cards,
              combination: twoComboMove.combination,
              reason: `Cờ tàn (Cấm 2 cuối): Đánh tổ hợp Heo (${twoComboMove.combination.type}) trước để dứt điểm bằng bộ thường còn lại`
            };
          }
        }
      }
    }

    return null;
  }
}

// ============================================================================
// 5. TABLE SCALE RULE STRATEGY (QUY MÔ BÀN ĐẤU)
// ============================================================================

export class TableScaleRuleStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'Table Scale Strategy';

  constructor(private readonly playerCount: number = 4) {}

  contributeLeadPolicy(currentPolicy: Partial<RuleLeadPolicy>): Partial<RuleLeadPolicy> {
    if (this.playerCount === 2) {
      // Trong Solo 1v1: Kiểm soát nhịp độ tuyệt đối, đẩy nhanh tốc độ kết liễu
      return {
        ...currentPolicy,
        aggressiveFinisherPush: true
      };
    }
    return currentPolicy;
  }

  getRespondingScoreModifier(
    _move: ValidMoveInfo,
    _handSize: number,
    _targetMove: PlayedMove | null,
    context: RuleDecisionContext
  ): number {
    if (this.playerCount === 2) {
      // Trong Solo 1v1: Đè bài thành công là 100% cướp được cái -> Tăng điểm mạnh
      return 90 * (context.antiLeaderAggression || 0.8);
    }
    return 0;
  }
}

// ============================================================================
// COMPOSITE RULE STRATEGY MANAGER (BỘ TỔNG HỢP CHIẾN THUẬT THEO LUẬT)
// ============================================================================

export class CompositeRuleStrategy {
  private evaluators: RuleStrategyEvaluator[] = [];

  constructor(public readonly rules: GameRules) {
    this.initializeFromRules(rules);
  }

  private initializeFromRules(rules: GameRules): void {
    this.evaluators = [];

    // 1. Settlement Evaluator
    switch (rules.settlementRule) {
      case 'CARD_COUNT':
        this.evaluators.push(new CountCardsSettlementStrategy());
        break;
      case 'WINNER_TAKES_ALL':
        this.evaluators.push(new WinnerTakesAllSettlementStrategy());
        break;
      case 'TRADITIONAL_RANK_BASED':
      default:
        this.evaluators.push(new TraditionalSettlementStrategy());
        break;
    }

    // 2. Cong Evaluator
    this.evaluators.push(
      new CongRuleStrategy(
        rules.cong.enabled,
        rules.cong.penaltyCards,
        rules.cong.multiplier
      )
    );

    // 3. Chopping Evaluator
    this.evaluators.push(
      new ChoppingRuleStrategy(
        rules.chopping.allowFourPairsCutAnytime,
        rules.chopping.multiplier
      )
    );

    // 4. GameFlow Evaluator
    this.evaluators.push(
      new GameFlowRuleStrategy(
        rules.gameFlow.prohibitEndingWithTwo,
        rules.gameFlow.firstGameRequireThreeOfSpades
      )
    );

    // 5. Table Scale Evaluator
    this.evaluators.push(
      new TableScaleRuleStrategy(rules.table.playerCount)
    );
  }

  /**
   * Đánh giá tất cả các trường hợp khẩn cấp từ các Rule active
   */
  public evaluateEmergencyOverrides(
    context: RuleDecisionContext,
    validMoves: ValidMoveInfo[]
  ): RuleEmergencyAction | null {
    for (const ev of this.evaluators) {
      if (ev.evaluateEmergency) {
        const emergency = ev.evaluateEmergency(context, validMoves);
        if (emergency) return emergency;
      }
    }
    return null;
  }

  /**
   * Hợp nhất chính sách Ra bài (Lead Policy) từ toàn bộ các Rule active
   */
  public getCompositeLeadPolicy(): RuleLeadPolicy {
    let policy: RuleLeadPolicy = {
      preferLongestComboFirst: false,
      dumpSmallTrashFirst: true,
      aggressiveFinisherPush: false
    };

    for (const ev of this.evaluators) {
      if (ev.contributeLeadPolicy) {
        policy = {
          ...policy,
          ...ev.contributeLeadPolicy(policy)
        };
      }
    }
    return policy;
  }

  /**
   * Tính tổng điểm điều chỉnh Đỡ bài (Responding Score Modifier) từ toàn bộ các Rule active
   */
  public getCompositeRespondingScoreModifier(
    move: ValidMoveInfo,
    handSize: number,
    targetMove: PlayedMove | null,
    context: RuleDecisionContext
  ): number {
    let totalScore = 0;
    for (const ev of this.evaluators) {
      if (ev.getRespondingScoreModifier) {
        totalScore += ev.getRespondingScoreModifier(move, handSize, targetMove, context);
      }
    }
    return totalScore;
  }

  /**
   * Lấy hệ số rủi ro Chặt Heo
   */
  public getChoppingRiskFactor(): number {
    let factor = 1.0;
    for (const ev of this.evaluators) {
      if (ev.getChoppingRiskFactor) {
        factor *= ev.getChoppingRiskFactor();
      }
    }
    return factor;
  }

  /**
   * Lấy điểm thưởng om hàng gài bẫy
   */
  public getTrapTendencyBonus(): number {
    let bonus = 0;
    for (const ev of this.evaluators) {
      if (ev.getTrapScoreModifier) {
        bonus += ev.getTrapScoreModifier();
      }
    }
    return bonus;
  }
}

/**
 * Resolver Factory: Chuyển GameRules hoặc Legacy Mode Name thành CompositeRuleStrategy
 */
export function resolveCompositeRuleStrategy(
  rules?: Partial<GameRules> | null,
  legacyModeName?: string
): CompositeRuleStrategy {
  if (rules && rules.settlementRule) {
    const fullRules = createDefaultGameRules(rules);
    return new CompositeRuleStrategy(fullRules);
  }

  // Chuyển đổi từ Legacy GameMode string nếu rules chưa được truyền
  const normalizedMode = (legacyModeName || 'TRADITIONAL').toUpperCase();
  let defaultRules: GameRules;

  switch (normalizedMode) {
    case 'COUNT_CARDS':
      defaultRules = createDefaultGameRules({
        settlementRule: 'CARD_COUNT',
        table: { playerCount: 4, betAmount: 500, botThinkDelayMs: 700, soundEnabled: true }
      });
      break;

    case 'UNDERGROUND':
      defaultRules = createDefaultGameRules({
        settlementRule: 'CARD_COUNT',
        chopping: { allowFourPairsCutAnytime: true, allowThreePairsCutTwo: true, allowFourOfAKindCutPairsOfTwos: true, multiplier: 2 },
        cong: { enabled: true, penaltyCards: 26, multiplier: 2 },
        table: { playerCount: 4, betAmount: 1000, botThinkDelayMs: 700, soundEnabled: true }
      });
      break;

    case 'WINNER_TAKES_ALL':
      defaultRules = createDefaultGameRules({
        settlementRule: 'WINNER_TAKES_ALL',
        table: { playerCount: 4, betAmount: 1000, botThinkDelayMs: 800, soundEnabled: true }
      });
      break;

    case 'SOLO_1V1':
      defaultRules = createDefaultGameRules({
        settlementRule: 'CARD_COUNT',
        table: { playerCount: 2, betAmount: 1000, botThinkDelayMs: 650, soundEnabled: true }
      });
      break;

    case 'CAMPAIGN':
      defaultRules = createDefaultGameRules({
        settlementRule: 'CARD_COUNT',
        table: { playerCount: 4, betAmount: 100, botThinkDelayMs: 850, soundEnabled: true }
      });
      break;

    case 'RANKED':
      defaultRules = createDefaultGameRules({
        settlementRule: 'TRADITIONAL_RANK_BASED',
        table: { playerCount: 4, betAmount: 0, botThinkDelayMs: 850, soundEnabled: true }
      });
      break;

    case 'TRADITIONAL':
    case 'CUSTOM':
    case 'QUICK':
    default:
      defaultRules = createDefaultGameRules({
        settlementRule: 'TRADITIONAL_RANK_BASED',
        table: { playerCount: 4, betAmount: 500, botThinkDelayMs: 850, soundEnabled: true }
      });
      break;
  }

  return new CompositeRuleStrategy(defaultRules);
}
