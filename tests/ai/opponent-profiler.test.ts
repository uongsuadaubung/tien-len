import { describe, expect, it, beforeEach } from 'bun:test';
import { OpponentProfiler, createDefaultOpponentProfile } from '../../src/ai/opponent-profiler';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';

describe('Opponent Dynamic Profiler (Hồ Sơ Đọc Vị Đối Thủ Dài Hạn)', () => {
  let profiler: OpponentProfiler;

  beforeEach(() => {
    profiler = OpponentProfiler.getInstance();
    profiler.reset();
  });

  it('1. Khởi tạo mặc định Profile cho người chơi mới', () => {
    const profile = profiler.getProfile('player_human');
    expect(profile.playerId).toBe('player_human');
    expect(profile.gamesObserved).toBe(0);
    expect(profile.heoGreedRate).toBe(0.5);
    expect(profile.trashLeadRate).toBe(0.5);
    expect(profile.antiLeaderCarefulness).toBe(0.8);
  });

  it('2. Phân tích và phát hiện đối thủ có xu hướng Ham Giữ Heo (Heo Greed)', () => {
    const twoHearts = createCard(15, 'HEARTS');
    const threeSpades = createCard(3, 'SPADES');
    const twoCombo = identifyCombination([twoHearts])!;
    const trashCombo = identifyCombination([threeSpades])!;

    // Người chơi đánh rác khi bài còn 10 lá
    profiler.recordCardPlay('player_1', [threeSpades], trashCombo, 10, true);

    // Người chơi giữ Heo Cơ đến khi bài còn 2 lá mới đánh
    profiler.recordCardPlay('player_1', [twoHearts], twoCombo, 2, false);

    // Kết thúc ván đấu
    const updated = profiler.finalizeMatchForPlayer('player_1', []);
    expect(updated.gamesObserved).toBe(1);
    // Tỉ lệ Heo Greed phải tăng lên do giữ 2 đến cờ tàn
    expect(updated.heoGreedRate).toBeGreaterThan(0.5);
  });

  it('3. Phân tích xu hướng Xả Rác Nhỏ khi Cầm Cái (Trash Lead)', () => {
    const card3S = createCard(3, 'SPADES');
    const combo3S = identifyCombination([card3S])!;

    // Người chơi Cầm Cái đánh lá rác 3S
    profiler.recordCardPlay('player_2', [card3S], combo3S, 13, true);

    const updated = profiler.finalizeMatchForPlayer('player_2', []);
    expect(updated.trashLeadRate).toBeGreaterThan(0.5);
  });

  it('4. Phân tích mức độ Chặt Heo Hung Hãn (Chop Aggression)', () => {
    profiler.recordChop('player_chopper');
    const updated = profiler.finalizeMatchForPlayer('player_chopper', []);
    expect(updated.chopAggressionScore).toBeGreaterThan(0.5);
  });

  it('5. Lưu trữ và Khôi phục Profiles (Import / Export JSON)', () => {
    const card4S = createCard(4, 'SPADES');
    const combo4S = identifyCombination([card4S])!;
    profiler.recordCardPlay('player_saved', [card4S], combo4S, 5, true);
    profiler.finalizeMatchForPlayer('player_saved', []);

    const exported = profiler.exportProfiles();
    expect(exported).toContain('player_saved');

    profiler.reset();
    expect(profiler.getAllProfiles()['player_saved']).toBeUndefined();

    profiler.importProfiles(exported);
    const restored = profiler.getProfile('player_saved');
    expect(restored.gamesObserved).toBe(1);
  });

  it('6. Lưu trữ dài hạn thói quen Người chơi (p0) và bảo toàn qua các lần reset bàn', () => {
    profiler.clearAll();

    const twoHearts = createCard(15, 'HEARTS');
    const twoCombo = identifyCombination([twoHearts])!;
    
    // Người chơi p0 giữ 2 đến cờ tàn (2 lá)
    profiler.recordCardPlay('p0', [twoHearts], twoCombo, 2, false);
    const p0Updated = profiler.finalizeMatchForPlayer('p0', []);
    expect(p0Updated.gamesObserved).toBe(1);
    expect(p0Updated.heoGreedRate).toBeGreaterThan(0.5);

    // Thêm bot p1
    profiler.recordChop('p1');
    profiler.finalizeMatchForPlayer('p1', []);
    expect(profiler.getProfile('p1').gamesObserved).toBe(1);

    // Khi kết thúc bàn/về sảnh, reset() xóa bot p1 nhưng BẢO TOÀN thói quen p0
    profiler.reset('p0');
    expect(profiler.getAllProfiles()['p1']).toBeUndefined();
    expect(profiler.getProfile('p0').gamesObserved).toBe(1);
    expect(profiler.getProfile('p0').heoGreedRate).toBe(p0Updated.heoGreedRate);
  });
});
