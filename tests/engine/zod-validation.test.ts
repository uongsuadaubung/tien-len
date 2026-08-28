import { describe, it, expect } from 'bun:test';
import {
  PlayerProfileSchema,
  SavedSettingsSchema,
  BotEntitySchema,
  EcosystemNewsItemSchema,
  TienLenSaveDataSchema,
  safeParseSaveData,
  GameRulesSchema,
  GameSettingsSchema,
  OpponentBehaviorProfileSchema,
  MctsWorkerRequestSchema,
  MctsWorkerResponseSchema,
  QuickTableConfigSchema
} from '../../src/engine/schemas';
import { DEFAULT_PROFILE } from '../../src/engine/storage';
import { generateInitial200Bots } from '../../src/engine/ecosystem/bot-generator';
import { isGameRules, createDefaultGameRules } from '../../src/engine/types';
import { createDefaultOpponentProfile } from '../../src/ai/opponent-profiler';

describe('Zod Type-Safe Schema Validation Tests', () => {
  describe('1. PlayerProfileSchema', () => {
    it('parse thành công DEFAULT_PROFILE chuẩn', () => {
      const result = PlayerProfileSchema.safeParse(DEFAULT_PROFILE);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coins).toBe(50000);
        expect(result.data.elo).toBe(1000);
        expect(result.data.campaignUnlockedChapter).toBe(1);
      }
    });

    it('tự động gán default values khi parse đối tượng rỗng {}', () => {
      const result = PlayerProfileSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('');
        expect(result.data.avatar).toBe('🤠');
        expect(result.data.coins).toBe(50000);
        expect(result.data.elo).toBe(1000);
        expect(result.data.stats.gamesPlayed).toBe(0);
      }
    });

    it('từ chối chapter vượt quá giới hạn (ví dụ: chapter = 99)', () => {
      const result = PlayerProfileSchema.safeParse({
        ...DEFAULT_PROFILE,
        campaignUnlockedChapter: 99
      });
      expect(result.success).toBe(false);
    });
  });

  describe('2. SavedSettingsSchema', () => {
    it('parse thành công cấu hình cài đặt chuẩn', () => {
      const result = SavedSettingsSchema.safeParse({
        soundEnabled: true,
        gameSpeed: 'FAST',
        githubToken: 'ghp_test123',
        autoBackupInterval: 10
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gameSpeed).toBe('FAST');
        expect(result.data.autoSortEnabled).toBe(true); // default
      }
    });

    it('từ chối gameSpeed không hợp lệ', () => {
      const result = SavedSettingsSchema.safeParse({
        gameSpeed: 'SUPER_SONIC_INVALID'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('3. BotEntitySchema & EcosystemNewsItemSchema', () => {
    it('parse hợp lệ 200 Bot khởi thủy từ hệ sinh thái', () => {
      const bots = generateInitial200Bots();
      expect(bots.length).toBe(200);

      for (const bot of bots) {
        const result = BotEntitySchema.safeParse(bot);
        expect(result.success).toBe(true);
      }
    });

    it('parse thành công EcosystemNewsItem', () => {
      const newsItem = {
        id: 'news_123',
        timestamp: Date.now(),
        type: 'BANKRUPTCY',
        message: 'Đấu thủ Bảy Xe Lôi vừa vỡ nợ!',
        botId: 'bot_1',
        botName: 'Bảy Xe Lôi',
        avatar: '🛺',
        amount: 50000
      };

      const result = EcosystemNewsItemSchema.safeParse(newsItem);
      expect(result.success).toBe(true);
    });
  });

  describe('4. TienLenSaveDataSchema & safeParseSaveData', () => {
    it('parse hợp lệ toàn bộ gói dữ liệu save đầy đủ', () => {
      const fullSave = {
        version: 1,
        updatedAt: Date.now(),
        profile: DEFAULT_PROFILE,
        settings: { soundEnabled: true, gameSpeed: 'REALISTIC' },
        bots: generateInitial200Bots().slice(0, 10),
        newsfeed: []
      };

      const result = safeParseSaveData(fullSave);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.profile.coins).toBe(50000);
      expect(result.data?.bots?.length).toBe(10);
    });

    it('bắt lỗi an toàn khi dữ liệu null hoặc không phải object', () => {
      const result1 = safeParseSaveData(null);
      expect(result1.success).toBe(false);
      expect(result1.error).toBeDefined();

      const result2 = safeParseSaveData('string_tampered_payload');
      expect(result2.success).toBe(false);
    });

    it('bắt lỗi khi thiếu trường profile bắt buộc', () => {
      const result = safeParseSaveData({
        version: 1,
        updatedAt: Date.now(),
        settings: {}
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('profile');
    });
  });

  describe('5. GameRulesSchema, GameSettingsSchema & isGameRules', () => {
    it('parse GameSettings với giá trị mặc định hợp lệ', () => {
      const settings = GameSettingsSchema.parse({});
      expect(settings.mode).toBe('COUNT_CARDS');
      expect(settings.playerCount).toBe(4);
      expect(settings.betAmount).toBe(1000);
      expect(settings.allowFourPairsCutAnytime).toBe(true);
    });

    it('isGameRules trả về true cho createDefaultGameRules()', () => {
      const rules = createDefaultGameRules();
      expect(isGameRules(rules)).toBe(true);
    });

    it('isGameRules từ chối đối tượng không đúng cấu trúc', () => {
      expect(isGameRules(null)).toBe(false);
      expect(isGameRules({})).toBe(false);
      expect(isGameRules({ settlementRule: 'INVALID_RULE' })).toBe(false);
    });
  });

  describe('6. OpponentBehaviorProfileSchema & Profiler', () => {
    it('createDefaultOpponentProfile tạo profile chuẩn xác với default values', () => {
      const profile = createDefaultOpponentProfile('p0');
      expect(profile.playerId).toBe('p0');
      expect(profile.heoGreedRate).toBe(0.5);
      expect(profile.antiLeaderCarefulness).toBe(0.8);
      expect(profile.passRateByType.SINGLE).toBe(0.2);
    });

    it('OpponentBehaviorProfileSchema chặn chỉ số tâm lý ngoài khoảng 0 -> 1', () => {
      const invalid = OpponentBehaviorProfileSchema.safeParse({
        playerId: 'p0',
        heoGreedRate: 2.5 // Vượt quá 1.0
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('7. Web Worker Messages Schemas', () => {
    it('validate MctsWorkerRequestSchema hợp lệ', () => {
      const request = {
        id: 'req_1',
        botId: 'bot_alpha',
        botHand: [],
        candidateMoves: [],
        playedCardIds: ['3S', '4H'],
        remainingPlayerCards: { p1: 10, p2: 12 },
        simulationsCount: 100
      };

      const result = MctsWorkerRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('validate MctsWorkerResponseSchema hợp lệ', () => {
      const response = {
        id: 'req_1',
        evaluations: [{ moveIndex: 0, winRate: 0.75, simulations: 100 }]
      };

      const result = MctsWorkerResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('8. QuickTableConfigSchema & Persistence', () => {
    it('parse đối tượng rỗng sinh ra cấu hình bàn chuẩn mặc định', () => {
      const config = QuickTableConfigSchema.parse({});
      expect(config.playerCount).toBe(4);
      expect(config.betAmount).toBe(1000);
      expect(config.settlementRule).toBe('COUNT_CARDS');
      expect(config.choppingMultiplier).toBe(1);
      expect(config.congEnabled).toBe(true);
    });

    it('validate và chuẩn hóa cấu hình bàn tùy chỉnh hợp lệ', () => {
      const custom = {
        playerCount: 2,
        betAmount: 50000,
        settlementRule: 'WINNER_TAKES_ALL',
        choppingMultiplier: 3,
        congEnabled: true,
        prohibitEndingWithTwo: true,
        allowFourPairsCutAnytime: true,
        threeSpadesEndingBonus: false,
        cascadeChopEnabled: true
      };

      const result = QuickTableConfigSchema.safeParse(custom);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.playerCount).toBe(2);
        expect(result.data.betAmount).toBe(50000);
        expect(result.data.settlementRule).toBe('WINNER_TAKES_ALL');
        expect(result.data.choppingMultiplier).toBe(3);
      }
    });
  });
});
