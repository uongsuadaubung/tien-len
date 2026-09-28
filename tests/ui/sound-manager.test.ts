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
      soundManager.playShuffle();
      soundManager.playPass();
    }).not.toThrow();
  });

  it('4. Tái sử dụng (Cache) AudioBuffer cho playCardDeal và playShuffle mà không cấp phát lại buffer', () => {
    let bufferAllocations = 0;
    class MockAudioContext {
      public sampleRate = 44100;
      public currentTime = 0;
      public state = 'running';
      public destination = {};
      public createGain() {
        return {
          gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
          connect: () => {}
        };
      }
      public createBuffer(channels: number, length: number, sampleRate: number) {
        bufferAllocations++;
        return {
          sampleRate,
          length,
          getChannelData: () => new Float32Array(length)
        };
      }
      public createBufferSource() {
        return {
          buffer: null,
          connect: () => {},
          start: () => {},
          stop: () => {}
        };
      }
      public createBiquadFilter() {
        return {
          type: '',
          frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          Q: { setValueAtTime: () => {} },
          connect: () => {}
        };
      }
      public createOscillator() {
        return {
          type: '',
          frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          connect: () => {},
          start: () => {},
          stop: () => {}
        };
      }
      public resume() {
        return Promise.resolve();
      }
    }

    soundManager.enabled = true;
    (soundManager as any).ctx = new MockAudioContext() as any;
    (soundManager as any).dealNoiseBuffer = null;
    (soundManager as any).shuffleNoiseBuffer = null;

    // Giả lập chia 52 lá bài
    for (let i = 0; i < 52; i++) {
      soundManager.playCardDeal(i % 4);
    }
    // Chỉ cấp phát 1 buffer duy nhất thay vì 52 buffers
    expect(bufferAllocations).toBe(1);

    // Giả lập xào bài 5 lần
    for (let i = 0; i < 5; i++) {
      soundManager.playShuffle();
    }
    // Chỉ cấp phát thêm đúng 1 buffer cho shuffle (tổng 2)
    expect(bufferAllocations).toBe(2);

    // Reset lại ctx
    (soundManager as any).ctx = null;
    (soundManager as any).dealNoiseBuffer = null;
    (soundManager as any).shuffleNoiseBuffer = null;
  });

  it('5. Tái sử dụng (Cache) AudioBuffer cho playCardSlap và playPass mà không cấp phát lại buffer', () => {
    let bufferAllocations = 0;
    class MockAudioContext {
      public sampleRate = 44100;
      public currentTime = 0;
      public state = 'running';
      public destination = {};
      public createBuffer(channels: number, length: number, sampleRate: number) {
        bufferAllocations++;
        return {
          sampleRate,
          length,
          getChannelData: () => new Float32Array(length)
        };
      }
      public createBufferSource() {
        return {
          buffer: null,
          connect: () => {},
          start: () => {},
          stop: () => {}
        };
      }
      public resume() {
        return Promise.resolve();
      }
    }

    soundManager.enabled = true;
    (soundManager as any).ctx = new MockAudioContext() as any;
    (soundManager as any).cardSlapBuffer = null;
    (soundManager as any).passBuffer = null;

    // Giả lập đánh bài 52 lần liên tiếp trong trận đấu
    for (let i = 0; i < 52; i++) {
      soundManager.playCardSlap();
    }
    // Chỉ cấp phát đúng 1 AudioBuffer thay vì tạo mới AudioNodes mỗi lần đánh
    expect(bufferAllocations).toBe(1);

    // Giả lập bỏ lượt 20 lần
    for (let i = 0; i < 20; i++) {
      soundManager.playPass();
    }
    // Chỉ cấp phát thêm 1 AudioBuffer cho pass (tổng 2)
    expect(bufferAllocations).toBe(2);

    // Reset lại ctx
    (soundManager as any).ctx = null;
    (soundManager as any).cardSlapBuffer = null;
    (soundManager as any).passBuffer = null;
  });
});

