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
 * - Gài bẫy nhử mồi (Baiting Trap): Đánh Át/Heo đen khi ôm Hàng để câu Heo đối thủ Chặt Chồng.
 * - Tăng tốc dứt điểm (Turns-to-Win): Đẩy nhanh tiến độ khi còn <= 2 nhịp dứt điểm.
 * - Thế Bài Thượng Đẳng / Nắm >= 2 Heo: "Bảo Kê Tẩu Rác", dùng rác nhỏ thăm dò, giữ Heo bọc lót cướp cái dứt điểm.
 * - PreferLongestComboFirst (Đếm Lá / Sát phạt tốc độ): Xả sảnh dài & bộ thường (3..A) nhiều lá trước (KHÔNG xả Heo).
 * - DumpSmallTrashFirst (Truyền Thống / Elo): Tẩu rác nhỏ 3, 4, 5... trước để xả bài yếu và thăm dò.
 */
export class LeadMoveHeuristicHandler extends BotDecisionHandler {
  public handle(context: DecisionContext, validMoves: ValidMoveInfo[]): BotDecision | null {
    if (!context.isLeadMove) {
      return this.passToNext(context, validMoves);
    }

    const { hand, config, tracker, remainingPlayerCards, nextPlayerId, mctsMap } = context;
    const partition = partitionHand(hand, config.handPartitioningOptimality);
    const handStrength = evaluateHandStrength(hand, partition);
    const isEmergencyAntiLeader = Object.values(remainingPlayerCards).some(c => c === 1);
    const isNextPlayerOneCard = context.isNextPlayerOneCard ?? (remainingPlayerCards[nextPlayerId] === 1);

    const nonTwoTrash = partition.trashCards.filter(c => !isTwo(c));
    const regularNonTwoCombos = partition.combinations.filter(
      c =>
        c.type !== 'FOUR_OF_A_KIND' &&
        c.type !== 'THREE_PAIRS_SEQUENTIAL' &&
        c.type !== 'FOUR_PAIRS_SEQUENTIAL' &&
        c.type !== 'FIVE_PAIRS_SEQUENTIAL' &&
        !c.cards.some(isTwo) // KHÔNG BAO GIỜ coi Heo/Đôi Heo/Sám Heo là combo thường để xả bừa bãi!
    );

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
    if ((config.memoryDepth >= 0.4 || config.inMatchAdaptationRate >= 0.3) && regularNonTwoCombos.length > 0 && !isEmergencyAntiLeader && !isNextPlayerOneCard) {
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
    // 2. GÀI BẪY NHỬ MỒI CHẶT HEO (BAITING & CHOPPING TRAP)
    // =========================================================================
    const hasBomb = partition.combinations.some(
      c =>
        c.type === 'FOUR_OF_A_KIND' ||
        c.type === 'THREE_PAIRS_SEQUENTIAL' ||
        c.type === 'FOUR_PAIRS_SEQUENTIAL'
    );
    if (
      hasBomb &&
      config.baitingTendency >= 0.4 &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard &&
      hand.length >= 6
    ) {
      const singleMoves = validMoves.filter(m => m.combination.type === 'SINGLE');
      const baitMove = singleMoves.find(
        m => m.cards[0].rank === 14 || (isTwo(m.cards[0]) && (m.cards[0].suit === 'SPADES' || m.cards[0].suit === 'CLUBS'))
      );
      if (baitMove) {
        return buildBotDecision('PLAY', {
          cards: baitMove.cards,
          combination: baitMove.combination,
          reason: `Gài bẫy nhử mồi (Baiting Trap): Đánh ${baitMove.cards[0].rank} khi đang ôm Hàng Chặt để câu Heo đối thủ`,
          strategyUsed: 'BAITING_TRAP'
        });
      }
    }

    // =========================================================================
    // 3. QUẢN LÝ NHỊP ĐỘ DỰA TRÊN SỐ NHỊP VỀ BÀI (TURNS-TO-WIN TEMPO ACCELERATION)
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
    // 4. CHIẾN THUẬT DỰA TRÊN LỰC BÀI (HAND STRENGTH GOVERNED LEAD POLICY)
    // =========================================================================

    // THẾ BÀI THƯỢNG ĐẲNG / ÁP ĐẢO (DOMINANT HAND: Nắm >= 2-3 Heo hoặc Hàng):
    // Chiến thuật: "Bảo Kê Tẩu Rác". Có Heo giữ cái thì tẩu rác nhỏ trước để rảnh tay dứt điểm về Nhất!
    if (
      (handStrength.tier === 'DOMINANT' || (handStrength.tier === 'STRONG' && handStrength.twoCount >= 2)) &&
      !isEmergencyAntiLeader &&
      !isNextPlayerOneCard
    ) {
      if (nonTwoTrash.length > 0) {
        const smallestTrash = nonTwoTrash[0];
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
      // Nếu đã sạch rác (nonTwoTrash = 0): Xả sảnh/bộ dài nhất để dứt điểm!
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
    // 5. CHÍNH SÁCH RA BÀI HỢP THÀNH TỪ CÁC RULE ACTIVE (COMPOSITE LEAD POLICY)
    // =========================================================================
    const compositeStrategy = context.compositeRuleStrategy;
    const leadPolicy = compositeStrategy ? compositeStrategy.getCompositeLeadPolicy() : {
      preferLongestComboFirst: false,
      dumpSmallTrashFirst: true,
      aggressiveFinisherPush: false
    };

    // A. Ưu tiên xả Sảnh dài (4-6 lá) & Bộ thường nhiều lá trước (Luật Đếm Lá - Không xả Heo)
    if (leadPolicy.preferLongestComboFirst && regularNonTwoCombos.length > 0 && !isEmergencyAntiLeader && !isNextPlayerOneCard) {
      const sortedCombos = [...regularNonTwoCombos].sort((a, b) => {
        if (b.cards.length !== a.cards.length) {
          return b.cards.length - a.cards.length;
        }
        return a.highestCard.weight - b.highestCard.weight;
      });

      const longestCombo = sortedCombos[0];
      const move = validMoves.find(
        m =>
          m.combination.type === longestCombo.type &&
          m.cards.length === longestCombo.cards.length &&
          m.combination.highestCard.id === longestCombo.highestCard.id
      );
      if (move) {
        return buildBotDecision('PLAY', {
          cards: move.cards,
          combination: move.combination,
          reason: `Chiến thuật Rule-Driven: Xả tổ hợp dài nhất (${longestCombo.type} ${longestCombo.cards.length} lá) trước để giảm số lá tồn`,
          strategyUsed: 'RULE_DRIVEN_LONGEST_COMBO'
        });
      }
    }

    // B. TẨU RÁC (TRASH DISPOSAL - Luật Truyền Thống / Đấu Hạng Elo)
    if (nonTwoTrash.length > 0) {
      if (!isNextPlayerOneCard) {
        // Positional Awareness (Tie-breaker an toàn đì nhà dưới):
        // Nếu Bot có positionalAwareness >= 0.4 và có >= 2 lá rác độc lập:
        // Bot chọn lá rác tầm trung (8, 9, 10, J) trong danh sách nonTwoTrash để đì nhà dưới
        // nếu nhà dưới có ít bài (<= 6 lá) hoặc có thói quen tẩu rác nhỏ (trashLeadRate >= 0.6)!
        if (config.positionalAwareness >= 0.4 && nonTwoTrash.length >= 2) {
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
        // Người kế tiếp báo 1 lá -> CHẶN ĐẦU: Đánh lá rác TO NHẤT
        const largestTrash = nonTwoTrash[nonTwoTrash.length - 1];
        const move = validMoves.find(
          m => m.combination.type === 'SINGLE' && m.cards[0].id === largestTrash.id
        );
        if (move) {
          return buildBotDecision('PLAY', {
            cards: move.cards,
            combination: move.combination,
            reason: 'Chặn đầu người kế tiếp báo 1 lá bằng rác lớn nhất',
            strategyUsed: 'ANTI_ONE_CARD_LARGEST_TRASH'
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
