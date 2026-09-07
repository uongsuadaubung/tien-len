import { 
  BotDecisionHandler, 
  DecisionContext, 
  ValidMoveInfo, 
  BotDecision, 
  buildBotDecision 
} from '../decision-types';
import { isTwo, sortCards } from '../../engine/card';
import { partitionHand } from '../hand-partitioner';
import { OpponentProfiler } from '../opponent-profiler';
import { 
  evaluateHandStrength, 
  calculateTurnsToClearHand 
} from './heuristic-evaluators';

/**
 * 3. Handler Ra Bài Cầm Cái (Rule-Driven, Hand-Strength & Grandmaster Governed Lead Move Heuristic):
 * Tự động đồng bộ chính sách ra bài với Lực bài, Nhịp độ, Bẫy Nhử Mồi & Bẻ bài:
 * - Chặn đầu đền bài (Dynamic Sacrifice): Bẻ bài đánh lá to nhất tuyệt đối khi người kế bên còn 1 lá.
 * - Khai thác điểm yếu & bắt bài (In-Match Adaptation): Đánh bài vào loại combo đối thủ hay bỏ lượt.
 * - Gài bẫy nhử mồi (Baiting Trap): Đánh Át/Heo đen khi ôm Hàng để câu Heo đối thủ Chặt Chồng.
 * - Thế Bài Thượng Đẳng / Nắm >= 2 Heo: "Bảo Kê Tẩu Rác", dùng rác nhỏ thăm dò, giữ Heo bọc lót cướp cái dứt điểm.
 * - Composite Lead Policy: Tẩu rác (với Positional Awareness đì nhà dưới) hoặc Xả combo.
 * - Tăng tốc dứt điểm (Turns-to-Win): Đẩy nhanh tiến độ khi còn <= 2 nhịp dứt điểm.
 */
export class LeadMoveHeuristicHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (!context.isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    const { hand, config, tracker, remainingPlayerCards, nextPlayerId, mctsMap } = context;
    const partition = partitionHand(hand, config.handPartitioningOptimality);
    const handStrength = evaluateHandStrength(hand, partition);
    const opponentCounts = Object.entries(remainingPlayerCards)
      .filter(([id]) => id !== config.id && id !== '' && remainingPlayerCards[id] > 0)
      .map(([, cnt]) => cnt);
    const minOpponentCards = opponentCounts.length > 0 ? Math.min(...opponentCounts) : 10;
    const isEmergencyAntiLeader = minOpponentCards === 1;
    const totalActive = Object.values(remainingPlayerCards).filter(cnt => cnt > 0).length;
    const hasExplicitSelf = config.id && Object.prototype.hasOwnProperty.call(remainingPlayerCards, config.id);
    const activeOpponentsCount = hasExplicitSelf
      ? Object.entries(remainingPlayerCards).filter(([id, cnt]) => id !== config.id && cnt > 0).length
      : Math.max(1, totalActive - 1);
    const isNearFinishDanger = minOpponentCards <= (activeOpponentsCount <= 2 ? 3 : 2) && config.turnsToWinLookahead >= 0.5;
    const isNextPlayerOneCard = context.isNextPlayerOneCard ?? (remainingPlayerCards[nextPlayerId] === 1);

    const nonTwoTrash = partition.trashCards.filter(c => !isTwo(c));
    const smallTrashes = nonTwoTrash.filter(c => c.rank < 14);
    const isUnprotectedTrashCrisis = smallTrashes.length >= 2 && handStrength.twoCount === 0;

    const regularNonTwoCombos = partition.combinations.filter(
      c =>
        c.type !== 'FOUR_OF_A_KIND' &&
        c.type !== 'THREE_PAIRS_SEQUENTIAL' &&
        c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
        c.type !== 'FIVE_PAIRS_SEQUENTIAL' &&
        !c.cards.some(isTwo) // KHÔNG BAO GIỜ coi Heo/Đôi Heo/Sám Heo là combo thường để xả bừa bãi!
    );

    const compositeStrategy = context.compositeRuleStrategy;
    const leadPolicy = compositeStrategy ? compositeStrategy.getCompositeLeadPolicy() : {
      preferLongestComboFirst: false,
      dumpSmallTrashFirst: true,
      aggressiveFinisherPush: false
    };

    // =========================================================================
    // 0A. CỜ TÀN BẢO HIỂM THỐI HEO KHI CẤM 2 CUỐI (PROHIBIT ENDING WITH TWO)
    // =========================================================================
    if (context.prohibitEndingWithTwo && hand.some(isTwo) && hand.some(c => !isTwo(c)) && hand.length <= 4 && !isNextPlayerOneCard) {
      const twoSingleMoves = validMoves.filter(m => m.combination.type === 'SINGLE' && isTwo(m.cards[0]));
      if (twoSingleMoves.length > 0) {
        const smallestTwoMove = twoSingleMoves.sort((a, b) => a.combination.highestCard.weight - b.combination.highestCard.weight)[0];
        return buildBotDecision('PLAY', {
          cards: smallestTwoMove.cards,
          combination: smallestTwoMove.combination,
          reason: 'Cấm 2 cuối: Bung Heo trước để cướp cái và giữ bài thường về Nhất, chống thối Heo',
          strategyUsed: 'PROHIBIT_ENDING_TWO_LEAD_DUMP'
        });
      }
    }

    // =========================================================================
    // 0. CHẶN ĐẦU ĐỀN BÀI SINH TỬ BẰNG BẺ BÀI (DYNAMIC SACRIFICE / SPLITTING)
    // =========================================================================
    if (isNextPlayerOneCard) {
      if (config.dynamicHandSacrifice >= 0.4) {
        const sortedHand = sortCards(hand);
        const absoluteHighestCard = sortedHand[sortedHand.length - 1];
        const splitMove = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === absoluteHighestCard.id
        );
        if (splitMove) {
          return buildBotDecision('PLAY', {
            cards: splitMove.cards,
            combination: splitMove.combination,
            reason: `Bẻ bài chặn đền bài (Dynamic Sacrifice): Xé bài đánh lá to nhất ${absoluteHighestCard.rank} chặn người 1 lá`,
            strategyUsed: 'DYNAMIC_SACRIFICE'
          });
        }
      }
      if (nonTwoTrash.length > 0) {
        const largestTrash = nonTwoTrash[nonTwoTrash.length - 1];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === largestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: 'Chặn đầu người kế tiếp báo 1 lá bằng rác lớn nhất',
            strategyUsed: 'ANTI_ONE_CARD_INTERCEPT'
          });
        }
      }
    }

    // =========================================================================
    // 1. KHAI THÁC ĐIỂM YẾU & BẮT BÀI ĐỐI THỦ (IN-MATCH ADAPTATION & WEAKNESS EXPLOITATION)
    // =========================================================================
    if (
      (config.memoryDepth >= 0.4 || config.inMatchAdaptationRate >= 0.3) &&
      regularNonTwoCombos.length > 0 &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard &&
      !isUnprotectedTrashCrisis
    ) {
      const targetOpponentId = (remainingPlayerCards[nextPlayerId] > 0)
        ? nextPlayerId
        : Object.entries(remainingPlayerCards)
            .filter(([pid, count]) => pid !== config.id && count > 0)
            .sort((a, b) => a[1] - b[1])[0]?.[0];

      if (targetOpponentId) {
        const passedCombos = tracker.getOpponentWeaknessCombos(targetOpponentId);
        const targetProfile = context.opponentProfiles?.[targetOpponentId] ?? OpponentProfiler.getInstance().getProfile(targetOpponentId);

        for (const combo of regularNonTwoCombos) {
          let matchesWeakness = passedCombos.has(combo.type);
          if (combo.type === 'STRAIGHT' && tracker.hasOpponentPassedOnStraightLength(targetOpponentId, combo.length)) {
            matchesWeakness = true;
          }
          if (config.inMatchAdaptationRate >= 0.3 && targetProfile) {
            const passRate = targetProfile.passRateByType[combo.type] || 0;
            if (passRate >= 0.45) {
              matchesWeakness = true;
            }
          }

          if (matchesWeakness) {
            const move = validMoves.find(
              m => m.combination.type === combo.type &&
                   m.cards.length === combo.cards.length &&
                   m.combination.highestCard.rank === combo.highestCard.rank
            );
            if (move) {
              return buildBotDecision('PLAY', {
                cards: move.cards,
                combination: move.combination,
                reason: `Khai thác điểm yếu & bắt bài (In-Match Adaptation): Đánh ${combo.type} do đối thủ (${targetOpponentId}) có tỉ lệ bỏ lượt cao`,
                strategyUsed: 'IN_MATCH_ADAPTATION'
              });
            }
          }
        }
      }
    }

    // =========================================================================
    // 2. BẢO VỆ RÁC NHỎ & THẾ BÀI ÁP ĐẢO (TRASH SAFETY & DOMINANT HAND)
    // =========================================================================

    // B. THẾ BÀI ÁP ĐẢO (DOMINANT HAND: Nắm >= 2-3 Heo)
    if (
      (handStrength.tier === 'DOMINANT' || (handStrength.tier === 'STRONG' && handStrength.twoCount >= 2)) &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard
    ) {
      // Chỉ coi là rác nhỏ khi rank <= 9 (3..9). Nếu rác là bài to (10, J, Q, K), không tự ý xả bừa bãi!
      const trueSmallTrash = nonTwoTrash.filter(c => c.rank <= 9);
      if (trueSmallTrash.length > 0) {
        const smallestTrash = trueSmallTrash[0];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === smallestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: `Lực bài áp đảo (${handStrength.twoCount} Heo): Tẩu rác nhỏ ${smallestTrash.rank} dưới sự bảo kê của Heo`,
            strategyUsed: 'DOMINANT_TRASH_DISPOSAL'
          });
        }
      }
      if (regularNonTwoCombos.length > 0) {
        const sortedCombos = [...regularNonTwoCombos].sort((a, b) => {
          if (b.cards.length !== a.cards.length) return b.cards.length - a.cards.length;
          return a.highestCard.weight - b.highestCard.weight;
        });
        const bestCombo = sortedCombos[0];
        const move = validMoves.find(
          m =>
            m.combination.type === bestCombo.type &&
            m.cards.length === bestCombo.cards.length &&
            m.combination.highestCard.id === bestCombo.highestCard.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: `Lực bài áp đảo đã sạch rác: Xả bộ dài nhất (${bestCombo.type} ${bestCombo.cards.length} lá) dứt điểm`,
            strategyUsed: 'DOMINANT_COMBO_CLEAR'
          });
        }
      }
    }

    // =========================================================================
    // 3. CHÍNH SÁCH RA BÀI HỢP THÀNH TỪ CÁC RULE ACTIVE (COMPOSITE LEAD POLICY)
    // =========================================================================
    // A. Ưu tiên xả Sảnh dài (4-6 lá) & Bộ thường nhiều lá trước (Luật Đếm Lá, hoặc khi có người sắp về mà ta có bộ để khóa họ)
    if (
      (leadPolicy.preferLongestComboFirst || isEmergencyAntiLeader || isNearFinishDanger) &&
      regularNonTwoCombos.length > 0 &&
      !isNextPlayerOneCard
    ) {
      const sortedCombos = [...regularNonTwoCombos].sort((a, b) => {
        if (b.cards.length !== a.cards.length) {
          return b.cards.length - a.cards.length;
        }
        return a.highestCard.weight - b.highestCard.weight;
      });

      const longestCombo = sortedCombos[0];

      // ĐIỀU KIỆN AN TOÀN KHI XẢ COMBO DÀI (TRÁNH XẢ ĐÔI TO KHI CÒN RÁC NHỎ):
      // 1. Khi có người sắp về bài (isEmergencyAntiLeader || isNearFinishDanger): Đánh bất kỳ bộ nào (đôi/sám/sảnh) để khóa họ.
      // 2. Khi áp dụng preferLongestComboFirst trong Đếm Lá:
      //    - Nếu combo dài >= 3 lá (Sảnh 3-6 lá, Sám 3 lá): Luôn xả trước!
      //    - Nếu combo dài nhất chỉ là ĐÔI (cards.length === 2):
      //      + Sạch rác (nonTwoTrash.length === 0): Được xả đôi để dứt điểm.
      //      + Còn rác lẻ (nonTwoTrash.length > 0):
      //        * Nếu là Đôi To (rank >= 12: Q, K, A) và (nonTwoTrash.length >= 2 || activeOpponentsCount === 1):
      //          TUYỆT ĐỐI KHÔNG XẢ TRƯỚC! Nhường quyền cho khối tẩu rác nhỏ trước để giữ đôi to làm bệ phóng cướp cái ở cờ tàn.
      let canLeadCombo = true;
      if (!isEmergencyAntiLeader && !isNearFinishDanger && leadPolicy.preferLongestComboFirst) {
        if (longestCombo.cards.length < 3) {
          if (nonTwoTrash.length > 0) {
            const isHighPair = longestCombo.highestCard.rank >= 12;
            const isSolo = activeOpponentsCount === 1;
            const hasMultipleTrash = nonTwoTrash.length >= 2;
            if (isHighPair && (hasMultipleTrash || isSolo)) {
              canLeadCombo = false;
            }
          }
        }
      }

      if (context.prohibitEndingWithTwo) {
        const remainingAfterCombo = hand.filter(c => !longestCombo.cards.some(mc => mc.id === c.id));
        if (remainingAfterCombo.length > 0 && remainingAfterCombo.every(isTwo)) {
          canLeadCombo = false;
        }
      }

      if (canLeadCombo) {
        const move = validMoves.find(
          m =>
            m.combination.type === longestCombo.type &&
            m.cards.length === longestCombo.cards.length &&
            m.combination.highestCard.id === longestCombo.highestCard.id
        );
        if (move) {
          const isThreatLock = isEmergencyAntiLeader || isNearFinishDanger;
          const reason = isThreatLock
            ? `Khóa đối thủ sắp về (${minOpponentCards} lá): Đánh bộ (${longestCombo.type} ${longestCombo.cards.length} lá) để chặn đứng đối thủ`
            : `Chiến thuật Rule-Driven: Xả tổ hợp dài nhất (${longestCombo.type} ${longestCombo.cards.length} lá) trước để giảm số lá tồn`;
          const strategyUsed = isThreatLock
            ? 'COMBO_LOCK_ONE_CARD_OPPONENT'
            : 'RULE_DRIVEN_LONGEST_COMBO';

          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason,
            strategyUsed
          });
        }
      }
    }

    // 4. Kiểm tra có Hàng Chặt (Bom) không
    const hasBomb = partition.combinations.some(
      c =>
        c.type === 'FOUR_OF_A_KIND' ||
        c.type === 'THREE_PAIRS_SEQUENTIAL' ||
        c.type === 'FOUR_PAIRS_SEQUENTIAL'
    );

    // Tính số nhịp về bài để xác định có thể Tốc Chiến Tốc Thắng không (chỉ sprint khi không ôm bom rình bẫy)
    const turnsToClear = calculateTurnsToClearHand(hand, partition);
    const isSprintToFinish = turnsToClear <= 2 && config.turnsToWinLookahead >= 0.6 && !hasBomb;

    // =========================================================================
    // 3B. TỐC CHIẾN TỐC THẮNG (SPRINT TO FINISH CHO BOT CAO THỦ - Nhịp về bài <= 2)
    // =========================================================================
    if (isSprintToFinish && !isNextPlayerOneCard) {
      const sprintCombos = [...regularNonTwoCombos]
        .filter(c => {
          if (context.prohibitEndingWithTwo) {
            const remaining = hand.filter(hc => !c.cards.some(mc => mc.id === hc.id));
            if (remaining.length > 0 && remaining.every(isTwo)) return false;
          }
          return true;
        })
        .sort((a, b) => b.cards.length - a.cards.length);
      if (sprintCombos.length > 0) {
        const bestSprintCombo = sprintCombos[0];
        const move = validMoves.find(
          m => m.combination.type === bestSprintCombo.type &&
               m.cards.length === bestSprintCombo.cards.length &&
               m.combination.highestCard.id === bestSprintCombo.highestCard.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: `Tốc chiến tốc thắng (Sprint-to-Finish): Xả ${bestSprintCombo.type} dứt điểm cờ tàn (${turnsToClear} nhịp)`,
            strategyUsed: 'SPRINT_TO_FINISH'
          });
        }
      }
    }

    // =========================================================================
    // 4. GÀI BẪY NHỬ MỒI CHẶT HEO (BAITING & CHOPPING TRAP)
    // =========================================================================
    // 1. Không nhử mồi khi bài đang rơi vào khủng hoảng rác nhỏ không có Heo bảo kê (isUnprotectedTrashCrisis)
    // 2. Không nhử mồi ở Khai cuộc (> 8 lá) nếu còn rác nhỏ chưa dọn (nonTwoTrash.length >= 2)
    // 3. Không nhử mồi khi đang trong giai đoạn Tốc Chiến Tốc Thắng (isSprintToFinish)
    const isHandSafeToBait = !isUnprotectedTrashCrisis && (hand.length <= 8 || nonTwoTrash.length <= 1 || handStrength.twoCount >= 1);
    // 4. Phải còn Heo chưa lộ diện để nhử (trong 1v1 cần ít nhất 2 con Heo ngoài vòng do 50% bài ở nọc úp)
    const twoSafety = tracker.getTwoSafetyReport();
    const minUnseenTwosNeeded = activeOpponentsCount === 1 ? 2 : 1;
    const hasSufficientUnseenTwos = twoSafety.unseenTwosCount >= minUnseenTwosNeeded;

    if (
      hasBomb &&
      config.baitingTendency >= 0.4 &&
      !isSprintToFinish &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard &&
      hand.length >= 6 &&
      isHandSafeToBait &&
      hasSufficientUnseenTwos
    ) {
      const singleMoves = validMoves.filter(m => m.combination.type === 'SINGLE');
      const baitMove = singleMoves.find(m => {
        const card = m.cards[0];
        // Nếu là Át (rank 14): Chỉ nhử khi là Át Cơ (AH) hoặc là lá cao nhất còn lại trong ván theo tracker!
        if (card.rank === 14) {
          return card.suit === 'HEARTS' || tracker.isStrongestRemainingSingle(card);
        }
        // Nếu là Heo: Chỉ nhử Heo đen (2 Bích / 2 Chuồn)
        return isTwo(card) && (card.suit === 'SPADES' || card.suit === 'CLUBS');
      });
      if (baitMove) {
        return buildBotDecision('PLAY', {
          cards: baitMove.cards,
          combination: baitMove.combination,
          reason: `Gài bẫy nhử mồi (Baiting Trap): Đánh ${baitMove.cards[0].code} khi đang ôm Hàng Chặt để câu Heo đối thủ`,
          strategyUsed: 'BAITING_TRAP'
        });
      }
    }

    // B. TẨU RÁC (TRASH DISPOSAL - Luật Truyền Thống / Đấu Hạng Elo)
    if (nonTwoTrash.length > 0) {
      if (!isNextPlayerOneCard && !isEmergencyAntiLeader) {
        // Positional Awareness (Tie-breaker an toàn đì nhà dưới):
        if (config.positionalAwareness >= 0.4 && nonTwoTrash.length >= 2 && activeOpponentsCount > 1) {
          const nextCardsCount = remainingPlayerCards[nextPlayerId] ?? 10;
          const nextProfile = context.opponentProfiles?.[nextPlayerId] ?? OpponentProfiler.getInstance().getProfile(nextPlayerId);
          const isNextVulnerable = nextCardsCount <= 6 || (nextProfile && nextProfile.trashLeadRate >= 0.6);

          if (isNextVulnerable) {
            const mediumTrash = [...nonTwoTrash].reverse().find(c => c.rank >= 8 && c.rank <= 11);
            if (mediumTrash) {
              const move = validMoves.find(
                m => m.combination.type === 'SINGLE' && m.cards[0].id === mediumTrash.id
              );
              if (move) {
                return buildBotDecision('PLAY', {
                  cards: move.cards,
                  combination: move.combination,
                  reason: `Ý thức vị thế ghế ngồi (Positional Awareness): Đánh rác tầm trung ${mediumTrash.rank} để đì nhà dưới (${nextPlayerId})`,
                  strategyUsed: 'POSITIONAL_TRASH_LEAD'
                });
              }
            }
          }
        }

        // Mặc định an toàn: Tống rác nhỏ nhất (3, 4, 5...)
        const smallestTrash = nonTwoTrash[0];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === smallestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: 'Tẩu rác nhỏ nhất để thăm dò và xả bài yếu',
            strategyUsed: 'SMALLEST_TRASH_DISPOSAL'
          });
        }
      } else {
        // Bắt buộc CHẶN ĐẦU khi có người báo 1 lá (isNextPlayerOneCard hoặc isEmergencyAntiLeader):
        // Đánh lá rác TO NHẤT để không dâng quyền về bài trực tiếp cho đối thủ
        const largestTrash = nonTwoTrash[nonTwoTrash.length - 1];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === largestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: isNextPlayerOneCard
              ? 'Chặn đầu người kế tiếp báo 1 lá bằng rác lớn nhất'
              : `Khẩn cấp chặn đối thủ báo 1 lá: Đánh rác to nhất ${largestTrash.rank} để chống về bài`,
            strategyUsed: isNextPlayerOneCard ? 'ANTI_ONE_CARD_LARGEST_TRASH' : 'ANTI_FINISH_LARGEST_TRASH'
          });
        }
      }
    }

    // C. ĐÁNH BỘ NHỎ NHẤT / SẢNH NHỎ TRƯỚC (Không xả Hàng Chặt & Không xả Heo)
    if (regularNonTwoCombos.length > 0) {
      const sortedCombos = [...regularNonTwoCombos].sort((a, b) => {
        return a.highestCard.weight - b.highestCard.weight;
      });

      const smallestCombo = sortedCombos[0];
      const move = validMoves.find(
        m =>
          m.combination.type === smallestCombo.type &&
          m.cards.length === smallestCombo.cards.length &&
          m.combination.highestCard.id === smallestCombo.highestCard.id
      );
      if (move) {
        return buildBotDecision('PLAY', {
          cards: move.cards,
          combination: move.combination,
          reason: `Đánh bộ nhỏ ${smallestCombo.type} ${smallestCombo.cards.length} lá để giữ nhịp`,
          strategyUsed: 'SMALLEST_COMBO_LEAD'
        });
      }
    }

    // =========================================================================
    // 5. QUẢN LÝ NHỊP ĐỘ DỰA TRÊN SỐ NHỊP VỀ BÀI (TURNS-TO-WIN TEMPO ACCELERATION)
    // =========================================================================
    const turnsToWin = calculateTurnsToClearHand(hand, partition);
    if (
      config.turnsToWinLookahead >= 0.5 &&
      turnsToWin <= 2 &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard
    ) {
      if (regularNonTwoCombos.length > 0) {
        const sortedCombos = [...regularNonTwoCombos].sort((a, b) => b.cards.length - a.cards.length);
        const bestSprintCombo = sortedCombos[0];
        const move = validMoves.find(
          m =>
            m.combination.type === bestSprintCombo.type &&
            m.cards.length === bestSprintCombo.cards.length &&
            m.combination.highestCard.id === bestSprintCombo.highestCard.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: `Tăng tốc dứt điểm (Turns-to-Win: ${turnsToWin} nhịp): Xả ${bestSprintCombo.type} để về bài thần tốc`,
            strategyUsed: 'TEMPO_SPRINT'
          });
        }
      }
    }

    // =========================================================================
    // 6. CỜ TÀN HOẶC MCTS: TỐI ƯU NƯỚC ĐI
    // =========================================================================
    if (mctsMap && mctsMap.size > 0) {
      let bestMove = validMoves[0];
      let bestWinRate = -1;
      for (const m of validMoves) {
        const isTwoMove = m.cards.some(isTwo);
        const nonTwoMovesExist = validMoves.some(vm => !vm.cards.some(isTwo));
        if (isTwoMove && nonTwoMovesExist && hand.length > 3) {
          continue;
        }

        const key = m.cards.map(c => c.id).sort().join('_');
        const winRate = mctsMap.get(key) || 0;
        if (winRate > bestWinRate) {
          bestWinRate = winRate;
          bestMove = m;
        }
      }
      return buildBotDecision('PLAY', {
        cards: bestMove.cards,
        combination: bestMove.combination,
        reason: 'MCTS tối ưu nước đi cờ tàn',
        strategyUsed: 'MCTS_LEAD_OPTIMIZATION'
      });
    }

    // =========================================================================
    // 7. NƯỚC ĐI MẶC ĐỊNH AN TOÀN (Tránh đánh Heo/Hàng nếu còn nước đi thường)
    // =========================================================================
    const nonTwoMoves = validMoves.filter(m => !m.cards.some(isTwo));
    const nonChopMoves = (nonTwoMoves.length > 0 ? nonTwoMoves : validMoves).filter(
      m => m.combination.type !== 'THREE_PAIRS_SEQUENTIAL' &&
           m.combination.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
           m.combination.type !== 'FOUR_OF_A_KIND'
    );

    const safeDefault = nonChopMoves.length > 0 ? nonChopMoves[0] : (nonTwoMoves.length > 0 ? nonTwoMoves[0] : validMoves[0]);
    return buildBotDecision('PLAY', {
      cards: safeDefault.cards,
      combination: safeDefault.combination,
      reason: 'Nước đi an toàn mặc định',
      strategyUsed: 'SAFE_DEFAULT_LEAD'
    });
  }
}
