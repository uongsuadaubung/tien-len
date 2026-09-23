import { describe, expect, it } from 'bun:test';
import { soundManager } from '../../src/ui/audio/sound-manager';

describe('Sound Manager Integration Tests (Kiểm Thử Trình Quản Lý Âm Thanh Web Audio)', () => {
  it('1. Bật/Tắt âm thanh (Enable/Disable toggle)', () => {
    soundManager.enabled = false;
    expect(soundManager.enabled).toBe(false);

    soundManager.enabled = true;
    expect(soundManager.enabled).toBe(true);
  });

  it('2. Tự động đồng bộ với useSettingsStore khi không bị override thủ công (SSOT)', () => {
    const { useSettingsStore } = require('../../src/stores/useSettingsStore');
    soundManager.resetOverride();

    useSettingsStore.getState().setSoundEnabled(false);
    expect(soundManager.enabled).toBe(false);

    useSettingsStore.getState().setSoundEnabled(true);
    expect(soundManager.enabled).toBe(true);
  });

  it('3. Gọi phát các hiệu ứng âm thanh mà không gây crash khi không có AudioContext', () => {
    expect(() => {
      soundManager.playCardSlap();
      soundManager.playChop();
      soundManager.playVictory();
      soundManager.playCardDeal(1);
      soundManager.playPass();
    }).not.toThrow();
  });
});
