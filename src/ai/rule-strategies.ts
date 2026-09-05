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

import { Card, ChoppingRules, Combination, CongRules, GameFlowRules, GameRules, PlayedMove, TableRules, createDefaultGameRules } from '../engine/types';
import { isTwo } from '../engine/card';
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
  hasPlayedFirstCard: boolean;
  isNextPlayerOneCard: boolean;
  prohibitEndingWithTwo: boolean;
  rules: GameRules;
  handPartitioningOptimality: number;
  antiLeaderAggression: number;
  tempoControl: number;
  trapTendency: number;
  riskAppetite: number;
}

export interface RuleLeadPolicy {
  /** Ưu tiên xả Sảnh dài (4-6 lá) và Bộ nhiều lá trước để xả tối đa số lá bài tồn (Chế độ Đếm Lá) */
  preferLongestComboFirst: boolean;
  /** Tẩu rác nhỏ (3, 4, 5...) trước để thăm dò và giữ bộ to bọc lót (Chế độ Truyền Thống / Elo) */
  dumpSmallTrashFirst: boolean;
  /** Đánh bạo lực tranh Nhất, xả combo mạnh dứt điểm (Chế độ Nhất Ăn Tất / 1v1) */
  aggressiveFinisherPush: boolean;
}

export type RuleEmergencyAction =
  | {
      readonly type: 'PLAY';
      readonly cards: readonly Card[];
      readonly combination: Combination;
      readonly reason: string;
    }
  | {
      readonly type: 'PASS';
      readonly reason: string;
    };

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

  constructor(public readonly config: CongRules) {}

  evaluateEmergency(context: RuleDecisionContext, validMoves: ValidMoveInfo[]): RuleEmergencyAction | null {
    if (!this.config.enabled || validMoves.length === 0) return null;

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
        reason: `Cảnh báo Cóng (Phạt ${this.config.penaltyCards * this.config.multiplier} lá): Bằng mọi giá đánh ${chosenMove.combination.type} để Thoát Cóng!`
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
    if (!this.config.enabled || context.hasPlayedFirstCard === true) return 0;

    // Khi chưa ra lá nào, tăng điểm muốn đánh bài để sớm có lá trên bàn
    const minOpponentCards = Math.min(
      ...Object.values(context.remainingPlayerCards).filter(c => c > 0)
    );

    if (minOpponentCards <= 5) {
      return 60 * this.config.multiplier;
    }
    return 20 * this.config.multiplier;
  }
}

// ============================================================================
// 3. CHOPPING & TRAP RULE STRATEGY (QUY TẮC CHẶT HEO & GÀI BẪY)
// ============================================================================

export class ChoppingRuleStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'Chopping & Trapping Strategy';

  constructor(public readonly config: ChoppingRules) {}

  getChoppingRiskFactor(): number {
    // Hệ số nhân rủi ro chặt: Nếu multiplier >= 2 hoặc 4 đôi thông chặt tự do -> tăng cảnh giác
    let factor = this.config.multiplier;
    if (this.config.allowFourPairsCutAnytime) {
      factor *= 1.25;
    }
    if (this.config.cascadeMultiplier) {
      factor *= 1.2;
    }
    return factor;
  }

  getTrapScoreModifier(): number {
    // Khi tiền phạt chặt cao hoặc có chặt chồng, tăng ham muốn phục kích / gài bẫy
    let bonus = (this.config.multiplier - 1) * 40;
    if (this.config.cascadeMultiplier) bonus += 25;
    return bonus;
  }

  getRespondingScoreModifier(
    move: ValidMoveInfo,
    _handSize: number,
    targetMove: PlayedMove | null,
    context?: RuleDecisionContext
  ): number {
    let bonus = 0;
    if (move.isChop) {
      // Thưởng lớn khi chặt thành công, nhân theo hệ số phạt chặt
      bonus += 150 * this.config.multiplier;
      if (targetMove && targetMove.combination.cards.some(isTwo)) {
        bonus += 50 * this.config.multiplier;
      }

      // Nếu là chặt đè trong chuỗi chặt chồng (Counter-Chop): Thưởng cực lớn vì thu trọn hũ đền
      if (this.config.cascadeMultiplier && targetMove?.isChop) {
        bonus += 200 * this.config.multiplier;
      }

      // Cảnh giác chặt Heo khi có nguy cơ bị đối thủ khác đè chuỗi
      if (this.config.cascadeMultiplier && targetMove && targetMove.combination.cards.some(isTwo) && context?.tracker) {
        const twoSafety = context.tracker.getTwoSafetyReport();
        if (twoSafety.riskScore > 60) {
          bonus -= (twoSafety.riskScore - 50) * (1 - (context.riskAppetite || 0.5)) * 0.8;
        }
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

  constructor(public readonly config: GameFlowRules) {}

  evaluateEmergency(context: RuleDecisionContext, validMoves: ValidMoveInfo[]): RuleEmergencyAction | null {
    const { hand, isLeadMove, remainingPlayerCards, nextPlayerId, isFirstMoveOfGame } = context;

    // ------------------------------------------------------------------------
    // A. LUẬT MỞ MÀN 3 BÍCH (Ván đầu tiên)
    // ------------------------------------------------------------------------
    if (this.config.firstGameRequireThreeOfSpades && isFirstMoveOfGame && isLeadMove) {
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
          const sortedDesc = [...singles].sort((a, b) => b.combination.highestCard.weight - a.combination.highestCard.weight);
          const topSingle = sortedDesc[0];
          return {
            type: 'PLAY',
            cards: topSingle.cards,
            combination: topSingle.combination,
            reason: 'Chặn đầu người kế tiếp báo 1 lá bằng lá bài to nhất (chống đền bài)'
          };
        }
      } else {
        // Người báo 1 lá là người khác:
        // 1. Nếu bot có BỘ (Đôi, Sám, Sảnh): ƯU TIÊN ĐÁNH BỘ!
        // Người 1 lá hoàn toàn không thể bắt được bộ, đánh bộ sẽ khóa chặt họ và giữ lượt/về bài an toàn.
        // Trả về null để LeadMoveHandler tự do chọn bộ tối ưu theo chiến thuật & chính sách chế độ chơi.
        const comboMoves = validMoves.filter(m => m.combination.type !== 'SINGLE');
        if (comboMoves.length > 0) {
          return null;
        }

        // 2. Nếu bot chỉ toàn rác lẻ: Tẩu rác nhỏ thoát bài
        const singles = validMoves.filter(m => m.combination.type === 'SINGLE' && !isTwo(m.combination.highestCard));
        if (singles.length > 0) {
          const sortedAsc = [...singles].sort((a, b) => a.combination.highestCard.weight - b.combination.highestCard.weight);
          const smallestSingle = sortedAsc[0];
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
      : this.config.prohibitEndingWithTwo;

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

  getLeadScoreModifier(
    move: ValidMoveInfo,
    handSize: number,
    context: RuleDecisionContext
  ): number {
    const isThreeBonusEnabled = context.rules?.gameFlow?.threeSpadesEndingBonus ?? this.config.threeSpadesEndingBonus;
    if (!isThreeBonusEnabled || context.isFirstMoveOfGame) return 0;

    const isSingleThreeSpades =
      move.combination.type === 'SINGLE' &&
      move.cards[0]?.rank === 3 &&
      move.cards[0]?.suit === 'SPADES';

    if (isSingleThreeSpades) {
      if (handSize === 1) {
        // Nước đi về đích bằng 3 Bích thắng x2: Thưởng điểm tuyệt đối!
        return 500;
      }

      // Khi còn nhiều bài, nếu bài có khả năng kiểm soát vòng đấu cao (có Heo Cơ, bộ mạnh)
      // Bot cao thủ sẽ chủ động giữ 3 Bích lại làm lá kết liễu
      const hasDominantTwo = context.hand.some(c => c.rank === 15 && c.suit === 'HEARTS');
      const partition = partitionHand(context.hand, 1.0);
      const totalTurns = partition.combinations.length + partition.trashCards.length;

      if (hasDominantTwo && totalTurns <= 3) {
        return -120; // Giữ lại 3 Bích để dứt điểm
      }
    }

    return 0;
  }

  getRespondingScoreModifier(
    _move: ValidMoveInfo,
    _handSize: number,
    _targetMove: PlayedMove | null,
    context: RuleDecisionContext
  ): number {
    // Nếu có đối thủ còn 1 lá bài và 3 Bích chưa từng xuất hiện trên bàn,
    // Bot tăng cường tính cảnh giác không cho đối thủ về bài dễ dàng
    const isOpponentOneCard = Object.values(context.remainingPlayerCards).some(c => c === 1);
    if (isOpponentOneCard && !context.isFirstMoveOfGame) {
      return 40 * (context.antiLeaderAggression || 0.8);
    }
    return 0;
  }
}

// ============================================================================
// 5. TABLE SCALE RULE STRATEGY (QUY MÔ BÀN ĐẤU)
// ============================================================================

export class TableScaleRuleStrategy implements RuleStrategyEvaluator {
  readonly ruleName = 'Table Scale Strategy';

  constructor(public readonly config: TableRules) {}

  contributeLeadPolicy(currentPolicy: Partial<RuleLeadPolicy>): Partial<RuleLeadPolicy> {
    if (this.config.playerCount === 2) {
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
    if (this.config.playerCount === 2) {
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
      case 'COUNT_CARDS':
        this.evaluators.push(new CountCardsSettlementStrategy());
        break;
      case 'WINNER_TAKES_ALL':
        this.evaluators.push(new WinnerTakesAllSettlementStrategy());
        break;
      case 'TRADITIONAL':
      default:
        this.evaluators.push(new TraditionalSettlementStrategy());
        break;
    }

    // 2. Cong Evaluator
    this.evaluators.push(new CongRuleStrategy(rules.cong));

    // 3. Chopping Evaluator
    this.evaluators.push(new ChoppingRuleStrategy(rules.chopping));

    // 4. GameFlow Evaluator
    this.evaluators.push(new GameFlowRuleStrategy(rules.gameFlow));

    // 5. Table Scale Evaluator
    this.evaluators.push(new TableScaleRuleStrategy(rules.table));
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
        settlementRule: 'COUNT_CARDS',
        table: { playerCount: 4, betAmount: 500, soundEnabled: true }
      });
      break;

    case 'WINNER_TAKES_ALL':
      defaultRules = createDefaultGameRules({
        settlementRule: 'WINNER_TAKES_ALL',
        table: { playerCount: 4, betAmount: 1000, soundEnabled: true }
      });
      break;

    case 'SOLO_1V1':
      defaultRules = createDefaultGameRules({
        settlementRule: 'COUNT_CARDS',
        table: { playerCount: 2, betAmount: 1000, soundEnabled: true }
      });
      break;

    case 'CAMPAIGN':
      defaultRules = createDefaultGameRules({
        settlementRule: 'COUNT_CARDS',
        table: { playerCount: 4, betAmount: 100, soundEnabled: true }
      });
      break;

    case 'TRADITIONAL':
    case 'CUSTOM':
    case 'QUICK':
    default:
      defaultRules = createDefaultGameRules({
        settlementRule: 'TRADITIONAL',
        table: { playerCount: 4, betAmount: 500, soundEnabled: true }
      });
      break;
  }

  return new CompositeRuleStrategy(defaultRules);
}

// ============================================================================
// BUILDERS FOR RULE STRATEGIES (BUILDER PATTERN)
// ============================================================================

export class ChoppingRuleStrategyBuilder {
  private _allowFourPairsCutAnytime: boolean = true;
  private _multiplier: number = 1;
  private _cascadeMultiplier: boolean = true;

  public allowFourPairsCutAnytime(allow: boolean): this {
    this._allowFourPairsCutAnytime = allow;
    return this;
  }

  public multiplier(multiplier: number): this {
    this._multiplier = multiplier;
    return this;
  }

  public cascadeMultiplier(cascade: boolean): this {
    this._cascadeMultiplier = cascade;
    return this;
  }

  public build(): ChoppingRuleStrategy {
    return new ChoppingRuleStrategy({
      allowFourPairsCutAnytime: this._allowFourPairsCutAnytime,
      allowThreePairsCutTwo: true,
      allowFourOfAKindCutPairsOfTwos: true,
      multiplier: this._multiplier,
      cascadeMultiplier: this._cascadeMultiplier
    });
  }
}

export class CongRuleStrategyBuilder {
  private _enabled: boolean = true;
  private _penaltyCards: number = 26;
  private _multiplier: number = 1;

  public enabled(enabled: boolean): this {
    this._enabled = enabled;
    return this;
  }

  public penaltyCards(cards: number): this {
    this._penaltyCards = cards;
    return this;
  }

  public multiplier(multiplier: number): this {
    this._multiplier = multiplier;
    return this;
  }

  public build(): CongRuleStrategy {
    return new CongRuleStrategy({
      enabled: this._enabled,
      penaltyCards: this._penaltyCards,
      multiplier: this._multiplier
    });
  }
}

export class GameFlowRuleStrategyBuilder {
  private _prohibitEndingWithTwo: boolean = true;
  private _firstGameRequireThreeOfSpades: boolean = true;
  private _threeSpadesEndingBonus: boolean = true;
  private _winnerLeadsNextGame: boolean = true;

  public prohibitEndingWithTwo(prohibit: boolean): this {
    this._prohibitEndingWithTwo = prohibit;
    return this;
  }

  public firstGameRequireThreeOfSpades(require: boolean): this {
    this._firstGameRequireThreeOfSpades = require;
    return this;
  }

  public threeSpadesEndingBonus(bonus: boolean): this {
    this._threeSpadesEndingBonus = bonus;
    return this;
  }

  public winnerLeadsNextGame(winnerLeads: boolean): this {
    this._winnerLeadsNextGame = winnerLeads;
    return this;
  }

  public build(): GameFlowRuleStrategy {
    return new GameFlowRuleStrategy({
      prohibitEndingWithTwo: this._prohibitEndingWithTwo,
      firstGameRequireThreeOfSpades: this._firstGameRequireThreeOfSpades,
      threeSpadesEndingBonus: this._threeSpadesEndingBonus,
      winnerLeadsNextGame: this._winnerLeadsNextGame
    });
  }
}

export class TableScaleRuleStrategyBuilder {
  private _playerCount: 2 | 3 | 4 = 4;
  private _betAmount: number = 500;
  private _soundEnabled: boolean = true;

  public playerCount(count: 2 | 3 | 4): this {
    this._playerCount = count;
    return this;
  }

  public betAmount(amount: number): this {
    this._betAmount = amount;
    return this;
  }

  public soundEnabled(enabled: boolean): this {
    this._soundEnabled = enabled;
    return this;
  }

  public build(): TableScaleRuleStrategy {
    return new TableScaleRuleStrategy({
      playerCount: this._playerCount,
      betAmount: this._betAmount,
      soundEnabled: this._soundEnabled
    });
  }
}

export class CompositeRuleStrategyBuilder {
  private _rules: GameRules;

  constructor(baseRules?: GameRules) {
    this._rules = baseRules || createDefaultGameRules();
  }

  public setRules(rules: GameRules): this {
    this._rules = rules;
    return this;
  }

  public build(): CompositeRuleStrategy {
    return new CompositeRuleStrategy(this._rules);
  }
}
