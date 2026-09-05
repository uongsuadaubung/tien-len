import { describe, test, expect } from 'bun:test';
import { CardTracker } from '../../src/ai/card-tracker';
import { makeBotDecision, createDecisionContext } from '../../src/ai/decision-maker';
import { BOT_PERSONAS } from '../../src/ai/bot-factory';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import { Card, PlayedMove, createDefaultGameRules } from '../../src/engine/types';

describe('Thử Nghiệm Toàn Bộ Elo: Bot Cầm [Đôi A + 2] Trước Nước [Đôi K] Của Người Chơi Báo 1 Lá', () => {
  // Bộ bài người chơi: cầm [KK, A], đánh ra [KK]
  const cardKC = createCard(13, 'CLUBS');
  const cardKD = createCard(13, 'DIAMONDS');
  const pairKCombo = identifyCombination([cardKC, cardKD])!;
  const leadingMove: PlayedMove = {
    playerId: 'human_p0',
    combination: pairKCombo,
    timestamp: Date.now(),
    isChop: false
  };

  // Bài của Bot: cầm [Đôi A + 1 con 2]
  const botHand: Card[] = [
    createCard(14, 'HEARTS'),
    createCard(14, 'DIAMONDS'),
    createCard(15, 'HEARTS')
  ];

  // Danh sách các bot tiêu biểu đại diện cho 9 bậc Rank
  const testTiers = [
    { tier: 'Tier 1 (Tân Thủ)', bot: BOT_PERSONAS.BOT_ELO_700 },
    { tier: 'Tier 1 (Tân Thủ)', bot: BOT_PERSONAS.BOT_ELO_850 },
    { tier: 'Tier 2 (Tập Sự)', bot: BOT_PERSONAS.BOT_ELO_950 },
    { tier: 'Tier 2 (Tập Sự)', bot: BOT_PERSONAS.BOT_ELO_1000 },
    { tier: 'Tier 3 (Kỳ Thủ)', bot: BOT_PERSONAS.BOT_ELO_1150 },
    { tier: 'Tier 3 (Kỳ Thủ)', bot: BOT_PERSONAS.BOT_ELO_1250 },
    { tier: 'Tier 4 (Chiến Binh)', bot: BOT_PERSONAS.BOT_ELO_1450 },
    { tier: 'Tier 5 (Tinh Anh)', bot: BOT_PERSONAS.BOT_ELO_1750 },
    { tier: 'Tier 6 (Cao Thủ)', bot: BOT_PERSONAS.BOT_ELO_1900 },
    { tier: 'Tier 7 (Đại Cao Thủ)', bot: BOT_PERSONAS.BOT_ELO_2150 },
    { tier: 'Tier 8 (Thần Bài Minimax)', bot: BOT_PERSONAS.BOT_ELO_2750 },
    { tier: 'Tier 9 (Siêu Trí Tuệ Boss)', bot: BOT_PERSONAS.BOT_ELO_3200 }
  ];

  test('1. Chế độ CẤM VỀ 2 (prohibitEndingWithTwo = true)', () => {
    console.log('\n=================== KẾT QUẢ KHI CẤM VỀ 2 (prohibitEndingWithTwo = true) ===================');
    for (const { tier, bot } of testTiers) {
      const tracker = new CardTracker();
      // Người chơi vừa đánh đôi K và còn lại 1 lá
      const context = createDecisionContext({
        hand: [...botHand],
        currentRoundLeadingMove: leadingMove,
        isLeadMove: false,
        isFirstMoveOfGame: false,
        tracker,
        config: bot,
        remainingPlayerCards: { human_p0: 1, bot1: 3, bot2: 8, bot3: 8 },
        nextPlayerId: 'human_p0',
        isNextPlayerOneCard: true,
        prohibitEndingWithTwo: true,
        hasPlayedFirstCard: true,
        gameMode: 'TRADITIONAL',
        mctsMap: null,
        compositeRuleStrategy: null,
        opponentProfiles: null,
        rules: createDefaultGameRules({ gameFlow: { prohibitEndingWithTwo: true } })
      });

      const decision = makeBotDecision(context);
      console.log(`[${tier}] Elo ${bot.elo} (${bot.id}): ${decision.type} - Lý do: ${decision.reason}`);
    }
  });

  test('2. Chế độ KHÔNG CẤM 2 (prohibitEndingWithTwo = false)', () => {
    console.log('\n=================== KẾT QUẢ KHI KHÔNG CẤM 2 (prohibitEndingWithTwo = false) ===================');
    for (const { tier, bot } of testTiers) {
      const tracker = new CardTracker();
      const context = createDecisionContext({
        hand: [...botHand],
        currentRoundLeadingMove: leadingMove,
        isLeadMove: false,
        isFirstMoveOfGame: false,
        tracker,
        config: bot,
        remainingPlayerCards: { human_p0: 1, bot1: 3, bot2: 8, bot3: 8 },
        nextPlayerId: 'human_p0',
        isNextPlayerOneCard: true,
        prohibitEndingWithTwo: false,
        hasPlayedFirstCard: true,
        gameMode: 'TRADITIONAL',
        mctsMap: null,
        compositeRuleStrategy: null,
        opponentProfiles: null,
        rules: createDefaultGameRules({ gameFlow: { prohibitEndingWithTwo: false } })
      });

      const decision = makeBotDecision(context);
      console.log(`[${tier}] Elo ${bot.elo} (${bot.id}): ${decision.type} - Lý do: ${decision.reason}`);
    }
  });

  test('3. Chế độ CẤM VỀ 2 khi đối thủ còn NHIỀU BÀI (human_p0 còn 5 lá, không báo 1 lá)', () => {
    console.log('\n=================== KẾT QUẢ KHI ĐỐI THỦ CÒN 5 LÁ (CẤM VỀ 2) ===================');
    for (const { tier, bot } of testTiers) {
      const tracker = new CardTracker();
      const context = createDecisionContext({
        hand: [...botHand],
        currentRoundLeadingMove: leadingMove,
        isLeadMove: false,
        isFirstMoveOfGame: false,
        tracker,
        config: bot,
        remainingPlayerCards: { human_p0: 5, bot1: 3, bot2: 8, bot3: 8 },
        nextPlayerId: 'human_p0',
        isNextPlayerOneCard: false,
        prohibitEndingWithTwo: true,
        hasPlayedFirstCard: true,
        gameMode: 'TRADITIONAL',
        mctsMap: null,
        compositeRuleStrategy: null,
        opponentProfiles: null,
        rules: createDefaultGameRules({ gameFlow: { prohibitEndingWithTwo: true } })
      });

      const decision = makeBotDecision(context);
      console.log(`[${tier}] Elo ${bot.elo} (${bot.id}): ${decision.type} - Lý do: ${decision.reason}`);
    }
  });
});

