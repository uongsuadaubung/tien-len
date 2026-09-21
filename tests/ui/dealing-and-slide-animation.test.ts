import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AuthoritativeMatchHost } from '../../src/engine/server/match-host';
import { createDefaultGameRules } from '../../src/engine/types';
import { loadPlayerProfile } from '../../src/engine/storage';
import { createPlayer, createBotPlayer } from '../../src/engine/player-factory';

describe('Dealing & Card Play Animation Integration Tests', () => {
  describe('1. AuthoritativeMatchHost dealCardStep Mapping', () => {
    it('Cập nhật chính xác dealtCounts theo player id cho 4 người chơi', () => {
      const profile = loadPlayerProfile();
      const human = createPlayer(profile);
      const bots = [
        createBotPlayer('p1', 'BOT_ELO_850'),
        createBotPlayer('p2', 'BOT_ELO_1150'),
        createBotPlayer('p3', 'BOT_ELO_1450')
      ];
      const host = new AuthoritativeMatchHost({
        rules: createDefaultGameRules({
          instantWin: {
            enabled: false,
            payoutMultiplier: 26
          }
        }),
        players: [human, ...bots],
        hostPlayerId: profile.id,
        enableDealingAnimation: true
      });

      host.startMatch(1);

      expect(host.isDealing).toBe(true);

      // Mô phỏng chia từng bước cho 4 người chơi
      host.dealCardStep(0, 1);
      host.dealCardStep(1, 1);
      host.dealCardStep(2, 1);
      host.dealCardStep(3, 1);

      expect(host.dealtCounts[profile.id]).toBe(1);
      expect(host.dealtCounts['p1']).toBe(1);
      expect(host.dealtCounts['p2']).toBe(1);
      expect(host.dealtCounts['p3']).toBe(1);

      // Chia đến lá cuối cùng
      host.dealCardStep(0, 13);
      host.dealCardStep(1, 13);
      host.dealCardStep(2, 13);
      host.dealCardStep(3, 13);

      expect(host.dealtCounts[profile.id]).toBe(13);
      expect(host.dealtCounts['p1']).toBe(13);
      expect(host.dealtCounts['p2']).toBe(13);
      expect(host.dealtCounts['p3']).toBe(13);

      host.dispose();
    });

    it('Cập nhật chính xác dealtCounts trong trận 1v1 (2 người chơi)', () => {
      const profile = loadPlayerProfile();
      const human = createPlayer(profile);
      const bot = createBotPlayer('p1', 'BOT_ELO_850');
      const host = new AuthoritativeMatchHost({
        rules: createDefaultGameRules(),
        players: [human, bot],
        hostPlayerId: profile.id,
        enableDealingAnimation: true
      });

      host.startMatch(1);

      expect(host.engine?.players.length).toBe(2);

      host.dealCardStep(0, 5);
      host.dealCardStep(1, 5);

      expect(host.dealtCounts[profile.id]).toBe(5);
      expect(host.dealtCounts['p1']).toBe(5);

      host.dispose();
    });
  });

  describe('2. Kiểm tra định nghĩa CSS Slide Animations trong dealing.css', () => {
    it('dealing.css chứa đầy đủ 4 class định hướng trượt bài .card-slide-bottom, .card-slide-left, .card-slide-top, .card-slide-right', () => {
      const cssPath = resolve(__dirname, '../../src/styles/dealing.css');
      const cssContent = readFileSync(cssPath, 'utf-8');

      expect(cssContent).toContain('.card-slide-bottom');
      expect(cssContent).toContain('.card-slide-left');
      expect(cssContent).toContain('.card-slide-top');
      expect(cssContent).toContain('.card-slide-right');

      expect(cssContent).toContain('keyframes slideInFromBottom');
      expect(cssContent).toContain('keyframes slideInFromTop');
      expect(cssContent).toContain('keyframes slideInFromLeft');
      expect(cssContent).toContain('keyframes slideInFromRight');
    });
  });

  describe('3. Logic định tuyến hoạt ảnh trượt bài theo ghế', () => {
    // Tái hiện hàm logic từ TableCenter để kiểm thử độc lập
    function computeSlideAnimation(
      playerId: string | undefined,
      myPlayerId: string,
      players: { id: string }[]
    ): string {
      if (!playerId) return 'card-slide-bottom';
      const numPlayers = players.length || 4;
      const myIndex = Math.max(0, players.findIndex(p => p.id === myPlayerId));
      const targetIndex = players.findIndex(p => p.id === playerId);

      if (targetIndex === -1 || targetIndex === myIndex) {
        return 'card-slide-bottom';
      }

      if (numPlayers === 2) {
        return 'card-slide-top';
      }

      if (numPlayers === 3) {
        const diff = (targetIndex - myIndex + 3) % 3;
        if (diff === 1) return 'card-slide-left';
        if (diff === 2) return 'card-slide-top';
        return 'card-slide-bottom';
      }

      const diff = (targetIndex - myIndex + 4) % 4;
      if (diff === 1) return 'card-slide-left';
      if (diff === 2) return 'card-slide-top';
      if (diff === 3) return 'card-slide-right';
      return 'card-slide-bottom';
    }

    it('Trong bàn 4 người: phân định đúng 4 hướng Bottom, Left, Top, Right', () => {
      const players = [{ id: 'p0' }, { id: 'p1' }, { id: 'p2' }, { id: 'p3' }];
      const myId = 'p0';

      expect(computeSlideAnimation('p0', myId, players)).toBe('card-slide-bottom');
      expect(computeSlideAnimation('p1', myId, players)).toBe('card-slide-left');
      expect(computeSlideAnimation('p2', myId, players)).toBe('card-slide-top');
      expect(computeSlideAnimation('p3', myId, players)).toBe('card-slide-right');
    });

    it('Trong bàn 1v1 (2 người): đối thủ luôn trượt từ Trên xuống (Top)', () => {
      const players = [{ id: 'p0' }, { id: 'p1' }];
      const myId = 'p0';

      expect(computeSlideAnimation('p0', myId, players)).toBe('card-slide-bottom');
      expect(computeSlideAnimation('p1', myId, players)).toBe('card-slide-top');
    });

    it('Trong bàn 3 người: phân định đúng Bottom, Left, Top', () => {
      const players = [{ id: 'p0' }, { id: 'p1' }, { id: 'p2' }];
      const myId = 'p0';

      expect(computeSlideAnimation('p0', myId, players)).toBe('card-slide-bottom');
      expect(computeSlideAnimation('p1', myId, players)).toBe('card-slide-left');
      expect(computeSlideAnimation('p2', myId, players)).toBe('card-slide-top');
    });
  });
});
