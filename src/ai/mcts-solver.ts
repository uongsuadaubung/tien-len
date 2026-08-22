import { Card, Combination } from '../engine/types';
import { ALL_RANKS, ALL_SUITS, createCard, sortCards } from '../engine/card';
import { identifyCombination } from '../engine/combinations';
import { CardTracker } from './card-tracker';
import { isValidMove } from '../engine/validator';
import { generateCandidateMoves } from './decision-maker';
import { MctsEvaluation } from './types';

/**
 * Information Set Monte Carlo Rollout Engine (ISMCTS)
 * Ước lượng tỷ lệ thắng của các nước đi ứng viên bằng mô phỏng ngẫu nhiên
 */
export class MctsSolver {
  /**
   * Chạy mô phỏng Monte Carlo đa thế bài cho danh sách nước đi ứng viên
   */
  public static evaluateCandidateMoves(
    botId: string,
    botHand: Card[],
    candidateMoves: { cards: Card[]; combination: Combination; isChop: boolean }[],
    tracker: CardTracker,
    remainingPlayerCards: Record<string, number>,
    simulationsCount: number = 30
  ): MctsEvaluation[] {
    if (candidateMoves.length === 0 || simulationsCount <= 0) {
      return [];
    }

    // 1. Thu thập tất cả các lá bài chưa xuất hiện trong tầm nhìn của Bot
    const ownHandIds = new Set(botHand.map(c => c.id));
    const unseenPool: Card[] = [];

    for (const rank of ALL_RANKS) {
      for (const suit of ALL_SUITS) {
        const card = createCard(rank, suit);
        if (!tracker.isCardPlayed(card) && !ownHandIds.has(card.id)) {
          unseenPool.push(card);
        }
      }
    }

    // Danh sách đối thủ còn bài
    const opponentIds = Object.keys(remainingPlayerCards).filter(id => id !== botId);

    // Tối ưu hóa: Ưu tiên các tổ hợp nhiều lá trước (Sảnh, Đôi, Sám) và các lá bài nhỏ
    const sortedCandidates = [...candidateMoves].sort((a, b) => {
      if (b.cards.length !== a.cards.length) {
        return b.cards.length - a.cards.length;
      }
      return a.combination.highestCard.weight - b.combination.highestCard.weight;
    });

    const targetCandidates = sortedCandidates.length > 10 ? sortedCandidates.slice(0, 10) : sortedCandidates;
    const winCounts = new Array(targetCandidates.length).fill(0);
    const sims = Math.min(simulationsCount, 30); // Giới hạn 30 sims/lượt để giữ FPS 60 mượt mà

    // 2. Chạy N vòng giả lập (Rollouts)
    for (let sim = 0; sim < sims; sim++) {
      // Xáo trộn ngẫu nhiên các lá bài chưa thấy (Determinization)
      const shuffled = [...unseenPool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }

      // Chia bài giả định cho các đối thủ
      const simulatedHands: Record<string, Card[]> = {};
      let cardOffset = 0;

      for (const oppId of opponentIds) {
        const needed = remainingPlayerCards[oppId] || 0;
        simulatedHands[oppId] = sortCards(shuffled.slice(cardOffset, cardOffset + needed));
        cardOffset += needed;
      }

      // Thử nghiệm từng nước đi ứng viên trong thế bài giả định này
      for (let moveIdx = 0; moveIdx < targetCandidates.length; moveIdx++) {
        const candidate = targetCandidates[moveIdx];
        const botSimHand = botHand.filter(c => !candidate.cards.some(mc => mc.id === c.id));

        const simHandsCopy: Record<string, Card[]> = {
          [botId]: [...botSimHand]
        };
        for (const oppId of opponentIds) {
          simHandsCopy[oppId] = [...simulatedHands[oppId]];
        }

        // Chạy ván đấu giả lập nhanh
        const isBotWin = this.simulateFastGame(
          botId,
          simHandsCopy,
          candidate.combination,
          opponentIds
        );

        if (isBotWin) {
          winCounts[moveIdx] += 1;
        }
      }
    }

    return targetCandidates.map((m, idx) => ({
      moveCards: m.cards,
      combination: m.combination,
      winRate: winCounts[idx] / sims,
      simulationsCount: sims
    }));
  }

  /**
   * Mô phỏng nhanh diễn biến ván đấu tới khi có người về Nhất
   */
  private static simulateFastGame(
    botId: string,
    hands: Record<string, Card[]>,
    initialLeadCombo: Combination,
    opponentIds: string[]
  ): boolean {
    if (hands[botId].length === 0) return true;

    const allPlayers = [botId, ...opponentIds];
    let currentCombo: Combination | null = initialLeadCombo;
    let turnIdx = 1; // Lượt tiếp theo đến đối thủ đầu tiên
    let consecutivePasses = 0;
    const maxSteps = 25; // Cắt ngắn số bước để tăng tốc độ x5

    for (let step = 0; step < maxSteps; step++) {
      const activePlayerId = allPlayers[turnIdx % allPlayers.length];
      const playerHand = hands[activePlayerId];

      if (playerHand.length === 0) {
        return activePlayerId === botId;
      }

      // Nếu tất cả người khác đã bỏ lượt -> Người nắm vòng mở vòng mới
      if (consecutivePasses >= allPlayers.length - 1) {
        currentCombo = null;
        consecutivePasses = 0;
      }

      // Tìm nhanh nước đi nhỏ nhất đè được
      let chosenCards: Card[] | null = null;
      let newCombo: Combination | null = null;

      if (!currentCombo) {
        // Mở vòng: Đánh lá nhỏ nhất
        chosenCards = [playerHand[0]];
        newCombo = identifyCombination(chosenCards);
      } else {
        // Đè bài cùng kiểu
        if (currentCombo.type === 'SINGLE') {
          for (let i = 0; i < playerHand.length; i++) {
            if (playerHand[i].weight > currentCombo.highestCard.weight) {
              chosenCards = [playerHand[i]];
              newCombo = identifyCombination(chosenCards);
              break;
            }
          }
        } else if (currentCombo.type === 'PAIR') {
          for (let i = 0; i < playerHand.length - 1; i++) {
            if (playerHand[i].rank === playerHand[i + 1].rank) {
              if (playerHand[i + 1].weight > currentCombo.highestCard.weight) {
                chosenCards = [playerHand[i], playerHand[i + 1]];
                newCombo = identifyCombination(chosenCards);
                break;
              }
            }
          }
        }
      }

      if (chosenCards && newCombo) {
        // Đánh bài
        const chosenCardIds = new Set(chosenCards.map(c => c.id));
        hands[activePlayerId] = playerHand.filter(c => !chosenCardIds.has(c.id));
        currentCombo = newCombo;
        consecutivePasses = 0;

        if (hands[activePlayerId].length === 0) {
          return activePlayerId === botId;
        }
      } else {
        // Bỏ lượt
        consecutivePasses++;
      }

      turnIdx++;
    }

    // Ai ít bài nhất thắng
    let minCards = hands[botId].length;
    let bestPlayer = botId;
    for (const oppId of opponentIds) {
      if (hands[oppId].length < minCards) {
        minCards = hands[oppId].length;
        bestPlayer = oppId;
      }
    }

    return bestPlayer === botId;
  }
}
