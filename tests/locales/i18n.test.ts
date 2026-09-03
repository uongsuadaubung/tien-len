import { describe, it, expect, beforeEach } from 'bun:test';
import { t, useI18nStore, vi, en } from '../../src/locales';

describe('Centralized i18n & Localization Dictionary System', () => {
  beforeEach(() => {
    useI18nStore.getState().setLocale('vi');
  });

  it('1. Đọc đúng chuỗi văn bản Tiếng Việt mặc định từ key path', () => {
    expect(t('common.confirm')).toBe('Xác Nhận');
    expect(t('common.cancel')).toBe('Hủy Bỏ');
    expect(t('game.playCard')).toBe('Đánh Bài');
    expect(t('game.passTurn')).toBe('Bỏ Lượt');
    expect(t('game.quickSelect')).toBe('Bắt Bài');
    expect(t('game.clearSelection')).toBe('Hạ Bài');
    expect(t('sort.naturalLabel')).toBe('Giá Trị (3 -> 2)');
    expect(t('sort.bySuitLabel')).toBe('Đồng Chất (Bích-Chuồn-Rô-Cơ)');
  });

  it('2. Nội suy tham số động (Variable Interpolation)', () => {
    const formatted = t('game.chopAlert', {
      chopper: 'Nam',
      victim: 'Hùng',
      amount: 10000
    });
    expect(formatted).toBe('Nam vừa chặt Hùng phạt 10.000 Xu!');

    const cascade = t('game.cascadeChopAlert', {
      chain: 2,
      chopper: 'Alice',
      victim: 'Bob',
      amount: 40000
    });
    expect(cascade).toBe('CHẶT CHỒNG CẤP 2! Alice chặt đè Bob phạt 40.000 Xu!');

    const waiting = t('game.turnWaiting', { name: 'Bot Tí' });
    expect(waiting).toBe('Đang chờ Bot Tí đi bài...');
  });

  it('3. Chuyển đổi ngôn ngữ sang Tiếng Anh (English Locale Switch)', () => {
    useI18nStore.getState().setLocale('en');

    expect(t('common.confirm')).toBe('Confirm');
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('game.playCard')).toBe('Play');
    expect(t('game.passTurn')).toBe('Pass');
    expect(t('game.quickSelect')).toBe('Quick Match');
    expect(t('sort.naturalLabel')).toBe('Rank (3 -> 2)');
    expect(t('sort.twoPreserveLabel')).toBe('Preserve 2s');
  });

  it('4. Kiểm tra tính toàn vẹn và đồng bộ 100% giữa các từ điển (vi vs en)', () => {
    // Đảm bảo mọi namespace của vi đều có trong en
    const viNamespaces = Object.keys(vi) as (keyof typeof vi)[];
    const enNamespaces = Object.keys(en) as (keyof typeof en)[];
    expect(viNamespaces.sort()).toEqual(enNamespaces.sort());

    for (const ns of viNamespaces) {
      const viKeys = Object.keys(vi[ns]).sort();
      const enKeys = Object.keys(en[ns]).sort();
      expect(viKeys).toEqual(enKeys);
    }
  });

  it('5. Fallback an toàn khi không truyền params hoặc key không tồn tại', () => {
    // Không truyền params
    const template = t('game.turnWaiting');
    expect(template).toBe('Đang chờ {name} đi bài...');

    // Key không hợp lệ ép kiểu
    const invalid = t('invalid.key' as any);
    expect(invalid).toBe('invalid.key');
  });
});
