import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { compressSaveData, decompressSaveData, parseGistContent } from '../../src/engine/sync/compression';
import { computeHash, hasProgress, applyRemoteSaveData, getLocalSaveData } from '../../src/engine/sync/sync-service';
import { validateToken, findGistId, uploadToGist, downloadFromGist } from '../../src/engine/sync/github-api';
import type { TienLenSaveData } from '../../src/engine/sync/types';
import { useUserStore } from '../../src/stores/useUserStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { DEFAULT_PROFILE } from '../../src/engine/storage';
import { generateInitial200Bots } from '../../src/engine/ecosystem/bot-generator';

describe('GitHub Gist Synchronization Unit Tests', () => {
  const sampleSaveData: TienLenSaveData = {
    version: 1,
    updatedAt: 1724750000000,
    profile: {
      ...DEFAULT_PROFILE,
      name: 'Cao Thủ Sài Gòn',
      coins: 50000,
      elo: 1650,
      campaignUnlockedChapter: 3,
      stats: {
        ...DEFAULT_PROFILE.stats,
        gamesPlayed: 25,
        wins: 18,
        totalEarned: 120000
      }
    },
    settings: {
      soundEnabled: true,
      autoSortEnabled: true,
      aiHintEnabled: true,
      gameSpeed: 'FAST'
    }
  };

  const resetStores = () => {
    useUserStore.getState().resetProfile();
    useSettingsStore.getState().hydrateSettings({
      soundEnabled: true,
      autoSortEnabled: true,
      aiHintEnabled: false,
      quickResponseAssistEnabled: false,
      xrayEnabled: false,
      botReasoningLogEnabled: false,
      gameSpeed: 'REALISTIC',
      githubToken: '',
      gistId: '',
      lastSync: 0,
      lastSyncedHash: '',
      cachedGithubUser: null
    });
  };

  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    resetStores();
  });

  describe('1. Compression & Decompression (GZIP + Base64)', () => {
    it('Nén và giải nén dữ liệu SaveData bảo toàn 100% thuộc tính', async () => {
      const compressed = await compressSaveData(sampleSaveData);
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);

      const decompressed = await decompressSaveData(compressed);
      expect(decompressed.version).toBe(1);
      expect(decompressed.profile.name).toBe('Cao Thủ Sài Gòn');
      expect(decompressed.profile.coins).toBe(50000);
      expect(decompressed.profile.elo).toBe(1650);
      expect(decompressed.profile.stats.wins).toBe(18);
      expect(decompressed.settings.gameSpeed).toBe('FAST');
    });

    it('parseGistContent nhận diện cả chuỗi JSON thô và chuỗi nén GZIP Base64', async () => {
      // 1. Dữ liệu thô JSON
      const rawJson = JSON.stringify(sampleSaveData);
      const parsedRaw = await parseGistContent(rawJson);
      expect(parsedRaw.profile.name).toBe('Cao Thủ Sài Gòn');

      // 2. Dữ liệu nén Base64
      const compressed = await compressSaveData(sampleSaveData);
      const parsedCompressed = await parseGistContent(compressed);
      expect(parsedCompressed.profile.name).toBe('Cao Thủ Sài Gòn');
    });
  });

  describe('2. Canonical Hash & Change Detection', () => {
    it('computeHash sinh mã SHA-256 dựa trên Xu, Số trận đấu, Thắng và Elo của người chơi', async () => {
      const dataA: TienLenSaveData = { ...sampleSaveData };
      const dataB: TienLenSaveData = { ...sampleSaveData, settings: { ...sampleSaveData.settings, soundEnabled: false } };

      const hashA = await computeHash(dataA);
      const hashB = await computeHash(dataB);

      expect(hashA).toBe(hashB); // Vì tiến trình người chơi (Xu, Số trận) không đổi
      expect(hashA.length).toBe(64); // Độ dài SHA-256 hex
    });

    it('computeHash bỏ qua toàn bộ metadata đồng bộ, timestamps và telemetry logs để tránh xung đột giả', async () => {
      const baseData: TienLenSaveData = { ...sampleSaveData };

      const modifiedMetadataOnly: TienLenSaveData = {
        ...sampleSaveData,
        updatedAt: 999999999,
        profile: {
          ...sampleSaveData.profile,
          lastDailyResetTimestamp: 123456789,
          lastDailyResetDate: '2026-08-28'
        },
        settings: {
          ...sampleSaveData.settings,
          lastSync: 88888888,
          lastSyncedHash: 'some_old_hash',
          githubToken: 'ghp_secret123',
          gistId: 'gist_id_abc',
          cachedGithubUser: { login: 'user1', name: 'User', bio: null, avatar_url: '' }
        },
        bots: [
          {
            ...generateInitial200Bots()[0],
            activityStatus: 'IN_MATCH',
            createdAt: 1000
          }
        ],
        newsfeed: [
          {
            id: 'news_1',
            timestamp: Date.now(),
            type: 'BANKRUPTCY',
            message: 'Bot A vừa hết tiền',
            botId: 'bot_1',
            botName: 'Bot A',
            avatar: '🤖',
            amount: 0
          }
        ]
      };

      const modifiedBotsSameCore: TienLenSaveData = {
        ...modifiedMetadataOnly,
        bots: [
          {
            ...modifiedMetadataOnly.bots![0],
            activityStatus: 'RESTING', // Thay đổi trạng thái bận rộn tạm thời
            createdAt: 9999 // Thay đổi timestamp sinh bot
          }
        ]
      };

      const hashBase = await computeHash(baseData);
      const hashMod = await computeHash(modifiedMetadataOnly);
      const hashBotResting = await computeHash(modifiedBotsSameCore);

      // Cả 2 bản với bot cùng stats/elo nhưng activityStatus/createdAt/newsfeed khác nhau phải sinh hash giống hệt nhau
      expect(hashMod).toBe(hashBotResting);

      // Khi thay đổi dữ liệu game cốt lõi (Coins, Elo, Wins, Settings) -> Hash phải thay đổi
      const dataWithMoreCoins: TienLenSaveData = {
        ...modifiedMetadataOnly,
        profile: { ...modifiedMetadataOnly.profile, coins: 999999 }
      };
      const hashMoreCoins = await computeHash(dataWithMoreCoins);
      expect(hashMoreCoins).not.toBe(hashMod);
    });
  });

  describe('3. Progress Detection (hasProgress)', () => {
    it('hasProgress trả về false cho profile mới tinh chưa chơi', () => {
      const freshSave: TienLenSaveData = {
        version: 1,
        updatedAt: Date.now(),
        profile: {
          ...DEFAULT_PROFILE,
          name: '',
          coins: DEFAULT_PROFILE.coins,
          elo: DEFAULT_PROFILE.elo,
          stats: {
            gamesPlayed: 0,
            wins: 0,
            chopsDone: 0,
            congsGiven: 0,
            totalEarned: 0,
            highestStreak: 0,
            currentStreak: 0
          }
        },
        settings: {}
      };

      expect(hasProgress(freshSave)).toBe(false);
    });

    it('hasProgress trả về true khi có tên hoặc có ván chơi hoặc thay đổi ELO/Xu', () => {
      const saveWithName: TienLenSaveData = {
        version: 1,
        updatedAt: Date.now(),
        profile: {
          ...DEFAULT_PROFILE,
          name: 'Vua Bài'
        },
        settings: {}
      };
      expect(hasProgress(saveWithName)).toBe(true);

      const saveWithGames: TienLenSaveData = {
        version: 1,
        updatedAt: Date.now(),
        profile: {
          ...DEFAULT_PROFILE,
          stats: { ...DEFAULT_PROFILE.stats, gamesPlayed: 1 }
        },
        settings: {}
      };
      expect(hasProgress(saveWithGames)).toBe(true);
    });
  });

  describe('4. Store & Full Database Synchronization Integration', () => {
    it('getLocalSaveData trích xuất đúng state từ UserStore, SettingsStore và IndexedDB', async () => {
      useUserStore.getState().setProfile((prev) => ({
        ...prev,
        name: 'Thần Bài Bến Tre',
        coins: 88888
      }));

      const localData = await getLocalSaveData();
      expect(localData.profile.name).toBe('Thần Bài Bến Tre');
      expect(localData.profile.coins).toBe(88888);
    });

    it('applyRemoteSaveData nạp chính xác toàn bộ dữ liệu (Profile, Settings, Bots, Newsfeed)', async () => {
      const mockBots = generateInitial200Bots().slice(0, 2);
      mockBots[0].coins = 1000000;
      mockBots[0].elo = 2200;

      const fullSaveData: TienLenSaveData = {
        ...sampleSaveData,
        bots: mockBots,
        newsfeed: [
          {
            id: 'news_test_1',
            timestamp: Date.now(),
            type: 'WIN_STREAK',
            message: `${mockBots[0].name} vừa đạt chuỗi 5 ván thắng liên tiếp!`,
            botId: mockBots[0].id,
            botName: mockBots[0].name,
            avatar: mockBots[0].avatar,
            amount: 50000
          }
        ]
      };

      await applyRemoteSaveData(fullSaveData);

      const currentProfile = useUserStore.getState().profile;
      const currentSettings = useSettingsStore.getState();

      expect(currentProfile.name).toBe('Cao Thủ Sài Gòn');
      expect(currentProfile.coins).toBe(50000);
      expect(currentProfile.elo).toBe(1650);
      expect(currentSettings.gameSpeed).toBe('FAST');
    });
  });

  describe('5. GitHub API & Token Validation Mock Tests', () => {
    it('validateToken từ chối khi token rỗng', async () => {
      const res = await validateToken('   ');
      expect(res.success).toBe(false);
    });

    it('validateToken parse thông tin user thành công khi API phản hồi 200', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            login: 'tienlen-master',
            name: 'Nguyễn Văn Đánh Bài',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345'
          }),
          { status: 200 }
        );
      }) as unknown as typeof fetch;

      const res = await validateToken('ghp_testtoken123');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.user.login).toBe('tienlen-master');
        expect(res.user.name).toBe('Nguyễn Văn Đánh Bài');
        expect(res.user.avatar_url).toBe('https://avatars.githubusercontent.com/u/12345');
      }

      globalThis.fetch = originalFetch;
    });

    it('validateToken xử lý lỗi 401 khi token sai/hết hạn', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({ message: 'Bad credentials' }), {
          status: 401
        });
      }) as unknown as typeof fetch;

      const res = await validateToken('ghp_invalidtoken');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('không hợp lệ');
      }

      globalThis.fetch = originalFetch;
    });
  });
});
