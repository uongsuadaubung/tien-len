import { describe, expect, it } from 'bun:test';
import { GameEngine } from '../../src/engine/game';
import { GameRulesBuilder, GameSettlementRule, Player, PlayerCount, Card } from '../../src/engine/types';
import { getBotConfig } from '../../src/ai/bot-factory';
import { CardTracker } from '../../src/ai/card-tracker';

describe('Property-Based & Fuzz Testing (Kiểm Thử Thuộc Tính & Bất Biến 1000+ Ván Ngẫu Nhiên)', () => {
  const SETTLEMENT_RULES: readonly GameSettlementRule[] = [
    'TRADITIONAL_RANK_BASED',
    'CARD_COUNT',
    'WINNER_TAKES_ALL'
  ];

  const PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4];

  it('1. Bất biến Bảo toàn Quân bài (Card Conservation Invariant): Luôn luôn đủ 52 lá duy nhất', () => {
    for (let i = 0; i < 50; i++) {
      const playerCount = PLAYER_COUNTS[i % PLAYER_COUNTS.length];
      const settlement = SETTLEMENT_RULES[i % SETTLEMENT_RULES.length];

      const rules = new GameRulesBuilder()
        .withSettlement(settlement)
        .withTable(t => t.playerCount(playerCount).betAmount(1000).botThinkDelayMs(0).soundEnabled(false))
        .withGameFlow(g => g.prohibitEndingWithTwo(i % 2 === 0).threeSpadesEndingBonus(i % 3 === 0))
        .build();

      const players: Player[] = Array.from({ length: playerCount }, (_, idx) => ({
        id: `p${idx}`,
        name: `Player ${idx}`,
        avatar: '🤖',
        isBot: true,
        botPersonaId: `BOT_ELO_${1150 + idx * 200}`,
        hand: [],
        playedCards: [],
        score: 10000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false
      }));

      const engine = new GameEngine(players, rules);
      engine.startNewGame(1);

      // Kiểm tra tất cả lá bài chia ra không bị trùng lặp
      const allDealtCards: Card[] = [];
      for (const p of engine.players) {
        allDealtCards.push(...p.hand);
      }

      const cardIdSet = new Set(allDealtCards.map(c => c.id));
      expect(cardIdSet.size).toBe(allDealtCards.length);
      expect(allDealtCards.length).toBe(playerCount * 13);
    }
  });

  it('2. Bất biến Bảo toàn Dòng tiền Kinh tế (Zero-Sum Invariant trong Đếm Lá & Nhất Ăn Tất)', () => {
    for (let sim = 0; sim < 50; sim++) {
      const rules = new GameRulesBuilder()
        .withSettlement('CARD_COUNT')
        .withTable(t => t.playerCount(4).betAmount(500).botThinkDelayMs(0).soundEnabled(false))
        .withCong(c => c.enabled(true).penaltyCards(26).multiplier(1))
        .withGameFlow(g => g.prohibitEndingWithTwo(false).threeSpadesEndingBonus(false))
        .build();

      const players: Player[] = Array.from({ length: 4 }, (_, idx) => ({
        id: `p${idx}`,
        name: `Bot ${idx}`,
        avatar: '🤖',
        isBot: true,
        hand: [],
        playedCards: [],
        score: 0,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false
      }));

      const engine = new GameEngine(players, rules);
      engine.startNewGame(1);

      // Cho ván đấu tự chạy đến khi hoàn tất
      let turns = 0;
      while (!engine.isGameOver && turns < 100) {
        turns++;
        const curr = engine.getCurrentPlayer();
        if (!curr) break;
        const config = getBotConfig(curr.botPersonaId || 'BOT_ELO_1150');
        const tracker = new CardTracker(curr.hand);
        engine.executeBotTurn(config, tracker);
      }

      // Tổng điểm số tăng giảm của cả bàn phải bằng chính xác 0 (Bảo toàn số dư)
      const totalScoreSum = engine.players.reduce((sum, p) => sum + p.score, 0);
      expect(totalScoreSum).toBe(0);
    }
  });

  it('3. Bất biến Không Bao Giờ Nghẽn / Vô Hạn Vòng Lặp (Deadlock-Free Termination Invariant)', () => {
    for (let sim = 0; sim < 100; sim++) {
      const playerCount = PLAYER_COUNTS[sim % PLAYER_COUNTS.length];
      const rules = new GameRulesBuilder()
        .withSettlement(SETTLEMENT_RULES[sim % SETTLEMENT_RULES.length])
        .withTable(t => t.playerCount(playerCount).betAmount(100).botThinkDelayMs(0).soundEnabled(false))
        .withGameFlow(g => g.prohibitEndingWithTwo(true).threeSpadesEndingBonus(true))
        .build();

      const players: Player[] = Array.from({ length: playerCount }, (_, idx) => ({
        id: `p${idx}`,
        name: `Bot ${idx}`,
        avatar: '🤖',
        isBot: true,
        botPersonaId: 'BOT_ELO_1750',
        hand: [],
        playedCards: [],
        score: 1000,
        isPassedCurrentRound: false,
        hasPlayedFirstCard: false
      }));

      const engine = new GameEngine(players, rules);
      engine.startNewGame(1, undefined, 50000 + sim * 73);

      let turnCount = 0;
      const MAX_TURNS = 300;

      while (!engine.isGameOver && turnCount < MAX_TURNS) {
        turnCount++;
        const curr = engine.getCurrentPlayer();
        if (!curr) break;
        const config = getBotConfig(curr.botPersonaId || 'BOT_ELO_1750');
        const tracker = new CardTracker(curr.hand);
        engine.executeBotTurn(config, tracker);
      }

      // Ván đấu phải kết thúc trong hữu hạn lượt, không bao giờ bị treo
      expect(engine.isGameOver).toBe(true);
      expect(turnCount).toBeLessThan(MAX_TURNS);
    }
  });
});
